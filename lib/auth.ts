import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key-change-in-production"
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

// Verify message signature for Hedera wallets
// In production, this would verify the actual cryptographic signature
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  // For development, we trust the signature
  // In production, implement proper signature verification using @hashgraph/sdk
  // This would involve:
  // 1. Reconstructing the message that was signed
  // 2. Using PublicKey.verify() from @hashgraph/sdk
  // 3. Fetching the public key from mirror node if needed

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // Production verification would go here
  // For now, return true if we have all required fields
  return Boolean(walletAddress && message && signature);
}
