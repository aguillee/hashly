import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getWalletNFTs,
  DRAGON_VOTE_WEIGHT,
  SANTUARIO_VOTE_WEIGHT,
} from "@/lib/hedera";

// POST /api/admin/recalculate-votes - Recalculate all votes based on current NFT ownership
// This should be run periodically to ensure votes reflect current NFT ownership
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all collection votes that used NFTs
    const votesWithNFTs = await prisma.collectionVote.findMany({
      where: {
        nftTokenId: { not: null },
      },
      include: {
        collection: {
          select: { id: true, name: true },
        },
      },
    });

    let updated = 0;
    let removed = 0;
    const errors: string[] = [];

    // Group votes by wallet to minimize API calls
    const votesByWallet = new Map<string, typeof votesWithNFTs>();
    for (const vote of votesWithNFTs) {
      const existing = votesByWallet.get(vote.walletAddress) || [];
      existing.push(vote);
      votesByWallet.set(vote.walletAddress, existing);
    }

    // Process each wallet
    for (const [walletAddress, votes] of Array.from(votesByWallet.entries())) {
      try {
        // Get current NFT ownership for this wallet
        const walletNFTs = await getWalletNFTs(walletAddress);

        // Calculate current voting power
        const dragonVotes = walletNFTs.totalDragons * DRAGON_VOTE_WEIGHT;
        const santuarioVotes = walletNFTs.hasSantuario ? SANTUARIO_VOTE_WEIGHT : 0;
        const currentNftPower = dragonVotes + santuarioVotes;
        const currentTotalPower = 1 + currentNftPower; // Base vote + NFT votes

        // Update each vote for this wallet
        for (const vote of votes) {
          const oldWeight = Math.abs(vote.voteWeight);
          const voteDirection = vote.voteWeight > 0 ? 1 : -1;

          // If user no longer has NFTs, reduce to base vote
          const newWeight = currentTotalPower * voteDirection;

          if (newWeight !== vote.voteWeight) {
            const weightDifference = newWeight - vote.voteWeight;

            await prisma.$transaction([
              prisma.collectionVote.update({
                where: { id: vote.id },
                data: {
                  voteWeight: newWeight,
                  nftTokenId: currentNftPower > 0 ? vote.nftTokenId : null,
                  nftSerials: currentNftPower > 0 ? vote.nftSerials : null,
                  updatedAt: new Date(),
                },
              }),
              prisma.collection.update({
                where: { id: vote.collectionId },
                data: {
                  totalVotes: { increment: weightDifference },
                },
              }),
            ]);

            updated++;
          }
        }
      } catch (error) {
        console.error(`Error processing wallet ${walletAddress}:`, error);
        errors.push(walletAddress);
      }

      // Add small delay to avoid rate limiting on mirror node
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      processed: votesWithNFTs.length,
      walletsChecked: votesByWallet.size,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Recalculated ${updated} votes across ${votesByWallet.size} wallets`,
    });
  } catch (error) {
    console.error("Recalculate votes error:", error);
    return NextResponse.json(
      { error: "Failed to recalculate votes" },
      { status: 500 }
    );
  }
}

// GET /api/admin/recalculate-votes - Preview changes without applying
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get stats about NFT-based votes
    const totalVotes = await prisma.collectionVote.count();
    const nftVotes = await prisma.collectionVote.count({
      where: { nftTokenId: { not: null } },
    });
    const uniqueWallets = await prisma.collectionVote.groupBy({
      by: ["walletAddress"],
      where: { nftTokenId: { not: null } },
    });

    return NextResponse.json({
      totalVotes,
      nftBasedVotes: nftVotes,
      uniqueWalletsWithNFTVotes: uniqueWallets.length,
      message: "Run POST to recalculate all NFT-based votes",
    });
  } catch (error) {
    console.error("Get recalculate stats error:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
