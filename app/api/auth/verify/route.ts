import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createToken, getOrCreateUser, verifyWalletSignature } from "@/lib/auth";
import { handleDailyCheckin } from "@/lib/points";
import { checkRateLimit } from "@/lib/rate-limit";
import { walletAddressSchema } from "@/lib/validations";
import { z } from "zod";

const verifySchema = z.object({
  walletAddress: walletAddressSchema,
  message: z.string().min(1).max(500),
  signature: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  // Rate limiting - strict for auth to prevent brute force
  const rateLimitResponse = await checkRateLimit(request, "auth");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate input
    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input format" },
        { status: 400 }
      );
    }

    const { walletAddress, message, signature } = validation.data;

    // Verify the signature cryptographically
    const isValid = await verifyWalletSignature(walletAddress, message, signature);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Get or create user
    const user = await getOrCreateUser(walletAddress);

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Handle daily checkin
    const checkin = await handleDailyCheckin(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        alias: user.alias,
        points: checkin.newTotal, // Use newTotal which has the latest points
        loginStreak: checkin.streak,
        isAdmin: user.isAdmin,
      },
      checkin: checkin.success ? checkin : null,
    });
  } catch (error: unknown) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
