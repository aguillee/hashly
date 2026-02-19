import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

// GET /api/cron/expire-badges — Called by Vercel Cron daily at 01:00 UTC
// Expires badges that have passed their airdrop deadline
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find MINTED badges whose deadline has passed
    const expiredBadges = await prisma.attendanceBadge.findMany({
      where: {
        status: "MINTED",
        airdropDeadline: {
          lt: now,
        },
      },
      select: {
        id: true,
        name: true,
        airdropDeadline: true,
      },
    });

    if (expiredBadges.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No badges to expire",
        expired: 0,
      });
    }

    let expiredCount = 0;
    let claimsMarkedFailed = 0;

    for (const badge of expiredBadges) {
      // Mark badge as EXPIRED
      await prisma.attendanceBadge.update({
        where: { id: badge.id },
        data: { status: "EXPIRED" },
      });

      // Mark remaining PENDING/FAILED claims as FAILED with reason
      const result = await prisma.badgeClaim.updateMany({
        where: {
          badgeId: badge.id,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: {
          status: "FAILED",
          errorReason: "Badge expired — airdrop deadline passed",
        },
      });

      expiredCount++;
      claimsMarkedFailed += result.count;
    }

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      claimsMarkedFailed,
      badges: expiredBadges.map((b) => ({
        id: b.id,
        name: b.name,
        deadline: b.airdropDeadline,
      })),
    });
  } catch (error) {
    console.error("Failed to expire badges:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to expire badges",
      },
      { status: 500 }
    );
  }
}
