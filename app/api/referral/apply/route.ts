import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { applyReferralCode } from "@/lib/referral-points";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const code = body?.code;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    const result = await applyReferralCode(user.id, code);

    if (!result.success) {
      const statusCode = result.error?.includes("not found") ? 404 : 400;
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      referrerAlias: result.referrerAlias,
      pointsEarned: result.pointsEarned,
    });
  } catch (error) {
    console.error("Apply referral error:", error);
    return NextResponse.json(
      { error: "Failed to apply referral code" },
      { status: 500 }
    );
  }
}
