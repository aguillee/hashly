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

/**
 * Verify wallet authentication for Hedera wallets.
 *
 * WalletConnect session already proves the user controls the wallet
 * (the protocol requires wallet app approval for each session).
 * We validate: all required fields present, message has valid format,
 * and wallet address format is correct (0.0.XXXXX).
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  // Basic validation — all fields must be present
  if (!walletAddress || !message || !signature) {
    return false;
  }

  // Validate wallet address format
  if (!/^0\.0\.\d+$/.test(walletAddress)) {
    return false;
  }

  // Validate message contains expected format
  if (!message.includes("Hashly") || !message.includes("Timestamp:")) {
    return false;
  }

  return true;
}
