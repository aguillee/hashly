import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const updateClaimsSchema = z.object({
  successful: z.array(
    z.object({
      wallet: z.string().regex(/^0\.0\.\d+$/, "Invalid wallet format"),
      serialNumber: z.number().int().positive(),
      transactionId: z.string().min(1),
    })
  ),
  failed: z.array(
    z.object({
      wallet: z.string().regex(/^0\.0\.\d+$/, "Invalid wallet format"),
      serialNumber: z.number().int().positive(),
      error: z.string(),
    })
  ),
});

// POST /api/badges/[id]/update-claims - Update claim statuses after airdrop
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validation = updateClaimsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const { successful, failed } = validation.data;

    const badge = await prisma.attendanceBadge.findUnique({
      where: { id },
    });

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    if (badge.hostWallet !== user.walletAddress) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (badge.status !== "MINTED" && badge.status !== "DISTRIBUTED") {
      return NextResponse.json(
        { error: "Badge must be in MINTED or DISTRIBUTED status" },
        { status: 400 }
      );
    }

    // Update successful claims
    for (const success of successful) {
      await prisma.badgeClaim.updateMany({
        where: {
          badgeId: id,
          walletAddress: success.wallet,
          serialNumber: success.serialNumber,
        },
        data: {
          status: "SENT",
          txId: success.transactionId,
        },
      });
    }

    // Update failed claims
    for (const fail of failed) {
      await prisma.badgeClaim.updateMany({
        where: {
          badgeId: id,
          walletAddress: fail.wallet,
          serialNumber: fail.serialNumber,
        },
        data: {
          status: "FAILED",
          errorReason: fail.error || null,
        },
      });
    }

    // Increment attempt counter
    await prisma.attendanceBadge.update({
      where: { id },
      data: {
        airdropAttempts: { increment: 1 },
      },
    });

    // Reload badge with updated attempt count
    const updatedBadge = await prisma.attendanceBadge.findUnique({
      where: { id },
    });

    if (!updatedBadge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    // Check completion status
    const [totalClaims, sentClaims, failedClaims] = await Promise.all([
      prisma.badgeClaim.count({ where: { badgeId: id } }),
      prisma.badgeClaim.count({
        where: { badgeId: id, status: { in: ["SENT", "CLAIMED"] } },
      }),
      prisma.badgeClaim.count({
        where: { badgeId: id, status: "FAILED" },
      }),
    ]);

    let newStatus = updatedBadge.status;

    if (sentClaims === totalClaims) {
      // All sent successfully
      newStatus = "DISTRIBUTED";
    } else if (updatedBadge.airdropAttempts >= 3 && failedClaims > 0) {
      // 3 attempts exhausted with remaining failures
      newStatus = "EXPIRED";
    }

    let finalBadge = updatedBadge;
    if (newStatus !== updatedBadge.status) {
      finalBadge = await prisma.attendanceBadge.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({
      success: true,
      sent: successful.length,
      failed: failed.length,
      totalClaims,
      sentClaims,
      failedClaims,
      attemptsUsed: finalBadge.airdropAttempts,
      badge: finalBadge,
    });
  } catch (error) {
    console.error("Failed to update claims:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update claims",
      },
      { status: 500 }
    );
  }
}
