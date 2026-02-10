import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/tokens - List tokens with rankings
// Returns top 30 best voted tokens
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    // Limit search to 100 chars to prevent ReDoS attacks
    const rawSearch = searchParams.get("search");
    const search = rawSearch ? rawSearch.slice(0, 100) : null;

    // Get total count of approved and visible tokens only
    const total = await prisma.token.count({
      where: { isApproved: true, isHidden: false },
    });

    // Get user for vote mapping
    const user = await getCurrentUser();

    // If searching, return search results
    if (search) {
      const searchWhere = {
        isApproved: true,
        isHidden: false,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { symbol: { contains: search, mode: "insensitive" as const } },
          { tokenAddress: { contains: search, mode: "insensitive" as const } },
        ],
      };

      const searchResults = await prisma.token.findMany({
        where: searchWhere,
        orderBy: { totalVotes: "desc" },
        take: 50,
        select: {
          id: true,
          tokenAddress: true,
          symbol: true,
          name: true,
          icon: true,
          totalVotes: true,
          createdAt: true,
        },
      });

      const userVotesMap = await getUserVotesMap(user, searchResults.map(t => t.id));

      return NextResponse.json({
        tokens: searchResults.map((t, index) => ({
          ...t,
          rank: index + 1,
          userVote: userVotesMap[t.id] || null,
          createdAt: t.createdAt.toISOString(),
        })),
        total,
        isSearch: true,
      });
    }

    // Get top 30 best voted (only approved and visible)
    const topTokens = await prisma.token.findMany({
      where: { isApproved: true, isHidden: false },
      orderBy: { totalVotes: "desc" },
      take: 30,
      select: {
        id: true,
        tokenAddress: true,
        symbol: true,
        name: true,
        icon: true,
        totalVotes: true,
        createdAt: true,
      },
    });

    // Get worst 10 tokens (lowest votes, including negative)
    const worstTokens = await prisma.token.findMany({
      where: { isApproved: true, isHidden: false },
      orderBy: { totalVotes: "asc" },
      take: 10,
      select: {
        id: true,
        tokenAddress: true,
        symbol: true,
        name: true,
        icon: true,
        totalVotes: true,
        createdAt: true,
      },
    });

    // Get user votes for all tokens
    const allTokenIds = [...topTokens.map(t => t.id), ...worstTokens.map(t => t.id)];
    const userVotesMap = await getUserVotesMap(user, allTokenIds);

    return NextResponse.json({
      top: topTokens.map((t, index) => ({
        ...t,
        rank: index + 1,
        userVote: userVotesMap[t.id] || null,
        createdAt: t.createdAt.toISOString(),
      })),
      worst: worstTokens.map((t, index) => ({
        ...t,
        rank: total - index,
        userVote: userVotesMap[t.id] || null,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    console.error("Get tokens error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

// Helper to get user votes map
async function getUserVotesMap(
  user: { walletAddress: string } | null,
  tokenIds: string[]
): Promise<Record<string, { voteWeight: number; nftTokenId?: string }>> {
  if (!user || tokenIds.length === 0) return {};

  const userVotes = await prisma.tokenVote.findMany({
    where: {
      walletAddress: user.walletAddress,
      tokenId: { in: tokenIds },
    },
    select: {
      tokenId: true,
      voteWeight: true,
      nftTokenId: true,
    },
  });

  return userVotes.reduce((acc, v) => {
    acc[v.tokenId] = {
      voteWeight: v.voteWeight,
      nftTokenId: v.nftTokenId || undefined,
    };
    return acc;
  }, {} as Record<string, { voteWeight: number; nftTokenId?: string }>);
}
