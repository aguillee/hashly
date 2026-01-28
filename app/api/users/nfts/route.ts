import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWalletNFTs, DRAGON_TOKEN_ID, SANTUARIO_TOKEN_ID } from "@/lib/hedera";
import { prisma } from "@/lib/db";

// GET /api/users/nfts - Get NFTs for the current user
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get NFTs from Hedera Mirror Node
    const walletNFTs = await getWalletNFTs(user.walletAddress);

    // Get used NFT serials for all events (to show which have been used)
    const usedNftVotes = await prisma.nftVote.findMany({
      where: {
        walletAddress: user.walletAddress,
      },
      select: {
        tokenId: true,
        serialNumber: true,
        eventId: true,
        voteType: true,
        createdAt: true,
      },
    });

    // Group used serials by event
    const usedByEvent: Record<string, { dragons: number[]; santuario: number[] }> = {};
    for (const vote of usedNftVotes) {
      if (!usedByEvent[vote.eventId]) {
        usedByEvent[vote.eventId] = { dragons: [], santuario: [] };
      }
      if (vote.tokenId === DRAGON_TOKEN_ID) {
        usedByEvent[vote.eventId].dragons.push(vote.serialNumber);
      } else if (vote.tokenId === SANTUARIO_TOKEN_ID) {
        usedByEvent[vote.eventId].santuario.push(vote.serialNumber);
      }
    }

    return NextResponse.json({
      nfts: {
        dragons: walletNFTs.dragons.map(d => ({
          serialNumber: d.serialNumber,
          tokenId: d.tokenId,
        })),
        santuario: walletNFTs.santuario.map(s => ({
          serialNumber: s.serialNumber,
          tokenId: s.tokenId,
        })),
      },
      stats: {
        totalDragons: walletNFTs.totalDragons,
        hasSantuario: walletNFTs.hasSantuario,
        potentialVotes: walletNFTs.potentialVotes,
      },
      benefits: {
        canAutoApproveEvents: walletNFTs.hasSantuario,
        extraVotesPerProject: walletNFTs.potentialVotes.total,
      },
      usedVotes: usedByEvent,
    });
  } catch (error) {
    console.error("Error fetching user NFTs:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}
