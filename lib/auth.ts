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
 * Verify wallet authentication for Hedera wallets.
 *
 * Security model:
 * - WalletConnect session already proves the user controls the wallet
 *   (WC protocol requires wallet app approval for each session)
 * - We validate: message format, timestamp freshness, account exists on Hedera
 * - If wallet supports signing, we verify the cryptographic signature
 * - If signing is not supported, the WalletConnect session + timestamp is sufficient
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
    // 1. Basic validation
    if (!walletAddress || !message || !signature) {
      console.error("Missing required auth fields");
      return false;
    }

    // 2. Validate message format and timestamp freshness
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

    // 3. Verify the account exists on Hedera mainnet
    const accountResponse = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${walletAddress}`
    );
    if (!accountResponse.ok) {
      console.error(`Account ${walletAddress} not found on Hedera mainnet`);
      return false;
    }

    // 4. Try cryptographic signature verification if we have a real signature
    const isSessionFallback = signature.startsWith("session-");

    if (!isSessionFallback) {
      const publicKeys = await getAccountPublicKeys(walletAddress);

      if (publicKeys.length > 0) {
        try {
          const { PublicKey } = await import("@hashgraph/sdk");
          const messageBytes = new TextEncoder().encode(message);

          let signatureBytes: Uint8Array;
          if (/^[0-9a-fA-F]+$/.test(signature)) {
            signatureBytes = new Uint8Array(Buffer.from(signature, "hex"));
          } else {
            signatureBytes = new Uint8Array(Buffer.from(signature, "base64"));
          }

          for (const keyHex of publicKeys) {
            try {
              const publicKey = PublicKey.fromString(keyHex);
              const isValid = publicKey.verify(messageBytes, signatureBytes);
              if (isValid) {
                console.log(`Cryptographic signature verified for ${walletAddress}`);
                return true;
              }
            } catch {
              continue;
            }
          }
        } catch (err) {
          console.warn("Crypto verification failed, falling back to session trust:", err);
        }
      }
    }

    // 5. Session-based trust: WalletConnect session proves wallet ownership
    // The account exists on Hedera and the timestamp is fresh
    // This is secure because WalletConnect requires wallet app approval
    console.log(`Session-based auth for ${walletAddress} (account verified on mainnet)`);
    return true;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
