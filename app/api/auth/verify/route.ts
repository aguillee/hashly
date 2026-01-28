import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createToken, getOrCreateUser, verifyWalletSignature } from "@/lib/auth";
import { handleDailyCheckin } from "@/lib/points";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, message, signature } = await request.json();

    if (!walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the signature
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Handle daily checkin
    const checkin = await handleDailyCheckin(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        points: checkin.newTotal, // Use newTotal which has the latest points
        loginStreak: checkin.streak,
        isAdmin: user.isAdmin,
      },
      checkin: checkin.success ? checkin : null,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
