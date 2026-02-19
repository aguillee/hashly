import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkTokenAssociationBatch } from "@/lib/hedera-token-association";

// POST /api/badges/[id]/check-associations - Check which wallets have the token associated
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

    const badge = await prisma.attendanceBadge.findUnique({
      where: { id },
    });

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    if (badge.hostWallet !== user.walletAddress) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (badge.status !== "MINTED") {
      return NextResponse.json(
        { error: "Badge must be in MINTED status" },
        { status: 400 }
      );
    }

    if (!badge.tokenId) {
      return NextResponse.json(
        { error: "Badge has no token ID" },
        { status: 400 }
      );
    }

    // Get only PENDING and FAILED claims (skip already SENT/CLAIMED)
    const claims = await prisma.badgeClaim.findMany({
      where: {
        badgeId: id,
        status: { in: ["PENDING", "FAILED"] },
      },
      select: {
        walletAddress: true,
      },
    });

    // Get unique wallets
    const uniqueWallets: string[] = [];
    const seen = new Set<string>();
    for (const c of claims) {
      if (!seen.has(c.walletAddress)) {
        seen.add(c.walletAddress);
        uniqueWallets.push(c.walletAddress);
      }
    }

    if (uniqueWallets.length === 0) {
      return NextResponse.json({
        associations: [],
        associatedCount: 0,
        notAssociatedCount: 0,
      });
    }

    // Check associations on Mirror Node
    const associationMap = await checkTokenAssociationBatch(
      badge.tokenId,
      uniqueWallets
    );

    const associations = uniqueWallets.map((wallet) => ({
      wallet,
      associated: associationMap.get(wallet) ?? false,
    }));

    const associatedCount = associations.filter((a) => a.associated).length;
    const notAssociatedCount = associations.filter((a) => !a.associated).length;

    return NextResponse.json({
      associations,
      associatedCount,
      notAssociatedCount,
    });
  } catch (error) {
    console.error("Failed to check associations:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check associations",
      },
      { status: 500 }
    );
  }
}
