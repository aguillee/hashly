import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { handleDailyCheckin } from "@/lib/points";
import { detectBadgesForWallet } from "@/lib/badge-points";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "auth");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await handleDailyCheckin(user.id);

    // Detect badge NFTs in wallet (non-blocking, runs in background)
    detectBadgesForWallet(user.walletAddress).catch((err) =>
      console.error("Badge detection error:", err)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
