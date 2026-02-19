import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

// JWT_SECRET is read lazily to avoid build-time errors (env vars may not be available during `next build`)
function getJWTSecret() {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return new TextEncoder().encode(value || "development-secret-key-change-in-production");
}

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
    .sign(getJWTSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
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

const MIRROR_NODE_URL = "https://mainnet.mirrornode.hedera.com";

// Maximum age of a signed message (5 minutes) to prevent replay attacks
const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;

/**
 * Apply the Hedera Signed Message prefix (EIP-191 style).
 * WalletConnect wallets prefix messages before signing:
 *   '\x19Hedera Signed Message:\n' + message.length + message
 * We must apply the same prefix when verifying on the backend.
 */
function prefixMessageToSign(message: string): Uint8Array {
  const prefixed = "\x19Hedera Signed Message:\n" + message.length + message;
  return new TextEncoder().encode(prefixed);
}

/**
 * Verify wallet authentication for Hedera wallets.
 *
 * 1. Validates format of all fields
 * 2. Checks timestamp freshness (anti-replay)
 * 3. Fetches the account's public key from Hedera Mirror Node
 * 4. Verifies the Ed25519/ECDSA signature with the Hedera message prefix
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  if (!walletAddress || !message || !signature) {
    console.error("[auth] Missing fields");
    return false;
  }

  if (!/^0\.0\.\d+$/.test(walletAddress)) {
    console.error("[auth] Invalid wallet format:", walletAddress);
    return false;
  }

  if (!message.includes("Hashly") || !message.includes("Timestamp:")) {
    console.error("[auth] Message format invalid");
    return false;
  }

  // Extract and validate timestamp (anti-replay)
  const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
  if (!timestampMatch) {
    return false;
  }
  const messageTimestamp = parseInt(timestampMatch[1]);
  const now = Date.now();
  if (Math.abs(now - messageTimestamp) > MAX_MESSAGE_AGE_MS) {
    console.error("[auth] Message timestamp too old");
    return false;
  }

  // Reject session-based signatures — not cryptographically secure
  if (signature.startsWith("session-")) {
    console.error("[auth] Session-based signatures are no longer accepted");
    return false;
  }

  // Cryptographic verification: fetch public key from Mirror Node
  try {
    const response = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${walletAddress}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      console.error("[auth] Mirror Node lookup failed:", response.status);
      return false;
    }

    const accountData = await response.json();
    const publicKeyHex = accountData?.key?.key;
    const keyType = accountData?.key?._type;

    if (!publicKeyHex) {
      console.error("[auth] No public key found for account");
      return false;
    }

    if (keyType !== "ED25519" && keyType !== "ECDSA_SECP256K1") {
      console.error("[auth] Unsupported key type:", keyType);
      return false;
    }

    // Parse hex signature to bytes
    const hexPairs = signature.match(/.{1,2}/g);
    if (!hexPairs) {
      console.error("[auth] Invalid signature hex format");
      return false;
    }
    const signatureBytes = Uint8Array.from(
      hexPairs.map((byte: string) => parseInt(byte, 16))
    );

    // Apply the Hedera Signed Message prefix (same as WalletConnect wallets)
    const prefixedMessageBytes = prefixMessageToSign(message);

    const { PublicKey } = await import("@hashgraph/sdk");
    const pubKey = keyType === "ED25519"
      ? PublicKey.fromStringED25519(publicKeyHex)
      : PublicKey.fromStringECDSA(publicKeyHex);

    const verified = pubKey.verify(prefixedMessageBytes, signatureBytes);
    if (verified) {
      console.log("[auth] Signature verified for:", walletAddress);
      return true;
    }

    console.error("[auth] Signature verification failed for:", walletAddress);
    return false;
  } catch (error) {
    console.error("[auth] Verification error:", error);
    return false;
  }
}
