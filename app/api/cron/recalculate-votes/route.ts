import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getWalletNFTs,
  DRAGON_TOKEN_ID,
  SANTUARIO_TOKEN_ID,
  DRAGON_VOTE_WEIGHT,
  SANTUARIO_VOTE_WEIGHT,
} from "@/lib/hedera";

export const maxDuration = 300; // 5 min timeout for Vercel Pro

// GET /api/cron/recalculate-votes — Called by Vercel Cron every 6h
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      collections: { walletsChecked: 0, votesUpdated: 0, errors: 0 },
      foreverMints: { walletsChecked: 0, votesRemoved: 0, errors: 0 },
    };

    // ============================================
    // 1. COLLECTION VOTES — Recalculate voteWeight
    // ============================================
    const collectionVotesWithNFTs = await prisma.collectionVote.findMany({
      where: { nftTokenId: { not: null } },
    });

    // Group by wallet to minimize Mirror Node API calls
    const collectionVotesByWallet = new Map<string, typeof collectionVotesWithNFTs>();
    for (const vote of collectionVotesWithNFTs) {
      const existing = collectionVotesByWallet.get(vote.walletAddress) || [];
      existing.push(vote);
      collectionVotesByWallet.set(vote.walletAddress, existing);
    }

    // Cache wallet NFTs to avoid duplicate Mirror Node calls
    const walletNFTCache = new Map<string, Awaited<ReturnType<typeof getWalletNFTs>>>();

    for (const [walletAddress, votes] of Array.from(collectionVotesByWallet.entries())) {
      try {
        const walletNFTs = await getWalletNFTs(walletAddress);
        walletNFTCache.set(walletAddress, walletNFTs);

        const dragonVotes = walletNFTs.totalDragons * DRAGON_VOTE_WEIGHT;
        const santuarioVotes = walletNFTs.hasSantuario ? SANTUARIO_VOTE_WEIGHT : 0;
        const currentNftPower = dragonVotes + santuarioVotes;
        const currentTotalPower = 1 + currentNftPower; // Base vote + NFT bonus

        for (const vote of votes) {
          const voteDirection = vote.voteWeight > 0 ? 1 : -1;
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

            results.collections.votesUpdated++;
          }
        }

        results.collections.walletsChecked++;
      } catch (error) {
        console.error(`[Cron] Error processing collection votes for ${walletAddress}:`, error);
        results.collections.errors++;
      }

      // Rate limit: 100ms between wallets
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // ============================================
    // 2. FOREVER MINT NFT VOTES — Remove stale votes
    // ============================================
    const foreverMintNftVotes = await prisma.nftVote.findMany({
      where: {
        event: { isForeverMint: true },
      },
      include: {
        event: { select: { id: true, isForeverMint: true } },
      },
    });

    // Group by wallet
    const nftVotesByWallet = new Map<string, typeof foreverMintNftVotes>();
    for (const vote of foreverMintNftVotes) {
      const existing = nftVotesByWallet.get(vote.walletAddress) || [];
      existing.push(vote);
      nftVotesByWallet.set(vote.walletAddress, existing);
    }

    for (const [walletAddress, votes] of Array.from(nftVotesByWallet.entries())) {
      try {
        // Use cache if already fetched for collection votes
        let walletNFTs = walletNFTCache.get(walletAddress);
        if (!walletNFTs) {
          walletNFTs = await getWalletNFTs(walletAddress);
          walletNFTCache.set(walletAddress, walletNFTs);
        }

        // Build set of owned serial numbers per token
        const ownedDragonSerials = new Set(walletNFTs.dragons.map((n) => n.serialNumber));
        const ownedSantuarioSerials = new Set(walletNFTs.santuario.map((n) => n.serialNumber));

        for (const vote of votes) {
          const isOwned =
            (vote.tokenId === DRAGON_TOKEN_ID && ownedDragonSerials.has(vote.serialNumber)) ||
            (vote.tokenId === SANTUARIO_TOKEN_ID && ownedSantuarioSerials.has(vote.serialNumber));

          if (!isOwned) {
            // Wallet no longer owns this NFT — remove vote and adjust event counters
            const weight = vote.voteWeight;
            const isUpVote = vote.voteType === "UP";

            // Fetch current values to prevent going below 0
            const currentEvt = await prisma.event.findUnique({
              where: { id: vote.eventId },
              select: { votesUp: true, votesDown: true },
            });
            const absWeight = Math.abs(weight);
            const safeUp = isUpVote ? Math.min(absWeight, Math.max(0, currentEvt?.votesUp ?? 0)) : 0;
            const safeDown = !isUpVote ? Math.min(absWeight, Math.max(0, currentEvt?.votesDown ?? 0)) : 0;

            await prisma.$transaction([
              prisma.nftVote.delete({ where: { id: vote.id } }),
              prisma.event.update({
                where: { id: vote.eventId },
                data: {
                  votesUp: isUpVote ? { decrement: safeUp } : undefined,
                  votesDown: !isUpVote ? { decrement: safeDown } : undefined,
                },
              }),
            ]);

            results.foreverMints.votesRemoved++;
          }
        }

        results.foreverMints.walletsChecked++;
      } catch (error) {
        console.error(`[Cron] Error processing forever mint votes for ${walletAddress}:`, error);
        results.foreverMints.errors++;
      }

      // Rate limit: 100ms between wallets
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("[Cron] Recalculate votes completed:", results);

    return NextResponse.json({
      success: true,
      ...results,
      message: `Collections: ${results.collections.votesUpdated} votes updated across ${results.collections.walletsChecked} wallets. Forever Mints: ${results.foreverMints.votesRemoved} stale votes removed across ${results.foreverMints.walletsChecked} wallets.`,
    });
  } catch (error) {
    console.error("[Cron] Recalculate votes failed:", error);
    return NextResponse.json(
      { error: "Failed to recalculate votes" },
      { status: 500 }
    );
  }
}
