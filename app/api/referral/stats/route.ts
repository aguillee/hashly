import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getReferralStats } from "@/lib/referral-points";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const stats = await getReferralStats(user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Referral stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral stats" },
      { status: 500 }
    );
  }
}
