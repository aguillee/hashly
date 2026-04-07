import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getWalletNFTs,
  DRAGON_TOKEN_ID,
  SANTUARIO_TOKEN_ID,
  DRAGON_VOTE_WEIGHT,
  SANTUARIO_VOTE_WEIGHT,
} from "@/lib/hedera";
import { checkRateLimit } from "@/lib/rate-limit";
import { collectionVoteSchema, validateRequest } from "@/lib/validations";
import { submitAssetVoteToHCS } from "@/lib/hcs-votes";
import { reserveVoteSlot } from "@/lib/vote-limit";
import { awardReferralCommission } from "@/lib/referral-points";

// Points awarded for project votes (0 — points come from mission completion only)
const POINTS_PER_PROJECT_VOTE = 0;

// POST /api/ecosystem/[id]/vote - Vote on an ecosystem project
// Same mechanics as collection/token votes: permanent, changeable, NFT-weighted
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await checkRateLimit(request, "vote");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId || !/^c[a-z0-9]{24}$/.test(projectId)) {
      return NextResponse.json({ error: "Invalid project ID format" }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateRequest(collectionVoteSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { voteType, useNftVotes } = validation.data;

    // Check if project exists and is approved
    const project = await prisma.ecosystemProject.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.isApproved) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Reserve a vote slot (always — even for vote changes)
    const voteSlot = await reserveVoteSlot(user.walletAddress);
    if (!voteSlot.reserved) {
      return NextResponse.json(
        {
          error: "Daily vote limit reached",
          remaining: 0,
          resetsAt: new Date(Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate() + 1,
            0, 0, 0, 0
          )).toISOString(),
        },
        { status: 429 }
      );
    }

    // Check for existing vote
    const existingVote = await prisma.ecosystemProjectVote.findUnique({
      where: {
        walletAddress_projectId: {
          walletAddress: user.walletAddress,
          projectId,
        },
      },
    });

    // Calculate vote weight from NFT ownership
    const walletNFTs = await getWalletNFTs(user.walletAddress);
    let voteWeight = 1;
    let nftTokenId: string | null = null;
    let nftSerials: string | null = null;

    if (useNftVotes) {
      const dragonVotes = walletNFTs.totalDragons * DRAGON_VOTE_WEIGHT;
      const santuarioVotes = walletNFTs.hasSantuario ? SANTUARIO_VOTE_WEIGHT : 0;
      const totalNftWeight = dragonVotes + santuarioVotes;

      if (totalNftWeight > 0) {
        voteWeight = 1 + totalNftWeight;

        if (walletNFTs.totalDragons > 0 && walletNFTs.hasSantuario) {
          nftTokenId = `${DRAGON_TOKEN_ID},${SANTUARIO_TOKEN_ID}`;
          nftSerials = [
            ...walletNFTs.dragons.map((d: any) => `D:${d.serialNumber}`),
            ...walletNFTs.santuario.map((s: any) => `S:${s.serialNumber}`),
          ].join(",");
        } else if (walletNFTs.totalDragons > 0) {
          nftTokenId = DRAGON_TOKEN_ID;
          nftSerials = walletNFTs.dragons.map((d: any) => d.serialNumber).join(",");
        } else if (walletNFTs.hasSantuario) {
          nftTokenId = SANTUARIO_TOKEN_ID;
          nftSerials = walletNFTs.santuario.map((s: any) => s.serialNumber).join(",");
        }
      }
    }

    let voteChange = 0;
    const newWeight = voteType === "UP" ? voteWeight : -voteWeight;

    const dbUser = await prisma.user.findUnique({
      where: { walletAddress: user.walletAddress },
    });

    if (existingVote) {
      const oldWeight = existingVote.voteWeight;
      voteChange = newWeight - oldWeight;

      await prisma.ecosystemProjectVote.update({
        where: { id: existingVote.id },
        data: {
          voteType,
          voteWeight: newWeight,
          nftTokenId,
          nftSerials,
          updatedAt: new Date(),
        },
      });

      // Log vote change for history (0 points, just tracking)
      if (dbUser) {
        await prisma.pointHistory.create({
          data: {
            userId: dbUser.id,
            points: 0,
            actionType: "ECOSYSTEM_VOTE",
            description: `${voteType === "UP" ? "Upvoted" : "Downvoted"} project: ${project.name}`,
          },
        });
      }
    } else {
      voteChange = newWeight;

      await prisma.ecosystemProjectVote.create({
        data: {
          walletAddress: user.walletAddress,
          projectId,
          voteType,
          voteWeight: newWeight,
          nftTokenId,
          nftSerials,
        },
      });

      // Award points for first vote + log for history
      if (dbUser) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: dbUser.id },
            data: { points: { increment: POINTS_PER_PROJECT_VOTE } },
          }),
          prisma.pointHistory.create({
            data: {
              userId: dbUser.id,
              points: POINTS_PER_PROJECT_VOTE,
              actionType: "COLLECTION_VOTE",
              description: `${voteType === "UP" ? "Upvoted" : "Downvoted"} project: ${project.name}`,
            },
          }),
        ]);

        awardReferralCommission(dbUser.id, POINTS_PER_PROJECT_VOTE, "ECOSYSTEM_VOTE");
      }
    }

    // Update project total votes
    if (voteChange !== 0) {
      await prisma.ecosystemProject.update({
        where: { id: projectId },
        data: { totalVotes: { increment: voteChange } },
      });
    }

    const updatedProject = await prisma.ecosystemProject.findUnique({
      where: { id: projectId },
      select: { totalVotes: true, slug: true },
    });

    // Submit to HCS (same topic as tokens/collections)
    try {
      await submitAssetVoteToHCS(
        user.walletAddress,
        `ecosystem:${project.slug}`,
        "nft",
        voteType.toLowerCase() as "up" | "down",
        walletNFTs.hasSantuario ? 1 : 0,
        walletNFTs.totalDragons
      );
    } catch (err) {
      console.error("HCS submit failed:", err);
    }

    revalidatePath("/api/ecosystem");

    return NextResponse.json({
      success: true,
      totalVotes: updatedProject?.totalVotes ?? 0,
      yourVoteWeight: newWeight,
      nftBonus: useNftVotes ? voteWeight - 1 : 0,
    });
  } catch (error) {
    console.error("Ecosystem project vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
