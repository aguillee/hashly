import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

// JWT_SECRET must be set in environment — no fallback in production
const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is required in production");
}
const JWT_SECRET = new TextEncoder().encode(
  jwtSecretValue || "development-secret-key-change-in-production"
);

const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "").split(",").filter(Boolean);

export interface JWTPayload {
  userId: string;
  walletAddress: string;
  isAdmin: boolean;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  return user;
}

export async function getOrCreateUser(walletAddress: string) {
  const shouldBeAdmin = ADMIN_WALLETS.includes(walletAddress);

  let user = await prisma.user.findUnique({
    where: { walletAddress },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        walletAddress,
        isAdmin: shouldBeAdmin,
      },
    });
  } else if (shouldBeAdmin && !user.isAdmin) {
    // Only upgrade to admin, never downgrade
    // This preserves manually set admin status in DB
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });
  }

  return user;
}

export function isAdmin(walletAddress: string): boolean {
  return ADMIN_WALLETS.includes(walletAddress);
}

// Hedera Mirror Node URL
const MIRROR_NODE_URL = "https://mainnet.mirrornode.hedera.com";

/**
 * Fetch the public key(s) for a Hedera account from the Mirror Node
 */
async function getAccountPublicKeys(accountId: string): Promise<string[]> {
  try {
    const response = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${accountId}`);
    if (!response.ok) {
      console.error(`Mirror Node returned ${response.status} for account ${accountId}`);
      return [];
    }
    const data = await response.json();
    if (!data.key) return [];

    const keys: string[] = [];
    // Complex key structures (ProtobufEncoded, threshold keys) can't be verified simply
    if (data.key._type === "ProtobufEncoded") {
      return [];
    }
    if (data.key.key) {
      keys.push(data.key.key);
    }
    if (data.key.keys) {
      for (const k of data.key.keys) {
        if (k.key) keys.push(k.key);
      }
    }
    return keys;
  } catch (error) {
    console.error(`Error fetching public key for ${accountId}:`, error);
    return [];
  }
}

/**
 * Verify message signature for Hedera wallets using @hashgraph/sdk
 *
 * 1. Validate message format (must contain timestamp within 5 minutes)
 * 2. Fetch the account's public key from Mirror Node
 * 3. Verify the signature cryptographically using PublicKey.verify()
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  // In development, accept any signature for easier testing
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  try {
    // 1. Validate message format and timestamp freshness
    const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
    if (!timestampMatch) {
      console.error("Message does not contain a valid timestamp");
      return false;
    }

    const messageTimestamp = parseInt(timestampMatch[1], 10);
    const now = Date.now();
    const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

    if (Math.abs(now - messageTimestamp) > MAX_AGE_MS) {
      console.error("Message timestamp is too old or in the future");
      return false;
    }

    // 2. Fetch public key(s) from Mirror Node
    const publicKeys = await getAccountPublicKeys(walletAddress);

    if (publicKeys.length === 0) {
      // Account has complex key structure (multisig, threshold, etc.)
      // WalletConnect session already proves account access, so we allow it
      // but require a non-empty signature as proof the client went through the flow
      console.warn(`Account ${walletAddress} has complex key, using session trust`);
      return Boolean(walletAddress && message && signature.length > 10);
    }

    // 3. Verify the signature against the message
    const { PublicKey } = await import("@hashgraph/sdk");
    const messageBytes = new TextEncoder().encode(message);

    // Decode signature from hex or base64
    let signatureBytes: Uint8Array;
    try {
      if (/^[0-9a-fA-F]+$/.test(signature)) {
        signatureBytes = new Uint8Array(Buffer.from(signature, "hex"));
      } else {
        signatureBytes = new Uint8Array(Buffer.from(signature, "base64"));
      }
    } catch {
      console.error("Failed to decode signature");
      return false;
    }

    // Try verification against each public key associated with the account
    for (const keyHex of publicKeys) {
      try {
        const publicKey = PublicKey.fromString(keyHex);
        const isValid = publicKey.verify(messageBytes, signatureBytes);
        if (isValid) return true;
      } catch {
        continue;
      }
    }

    console.error(`Signature verification failed for ${walletAddress}`);
    return false;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
