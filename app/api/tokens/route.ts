import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const revalidate = 120; // Cache for 2 minutes

// SaucerSwap API
const SAUCERSWAP_API = "https://api.saucerswap.finance/tokens";

interface SaucerSwapToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string | null;
  website?: string | null;
  priceUsd?: number;
  dueDiligenceComplete?: boolean;
}

// GET /api/tokens - List tokens with rankings
// Returns top 30 best voted tokens
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    // Limit search to 100 chars to prevent ReDoS attacks, trim and check for empty
    const rawSearch = searchParams.get("search");
    const search = rawSearch && rawSearch.trim().length > 0 ? rawSearch.slice(0, 100).trim() : null;

    // Parallelize count + user auth (both independent)
    const [total, user] = await Promise.all([
      prisma.token.count({
        where: { isApproved: true, isHidden: false },
      }),
      getCurrentUser(),
    ]);

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
        priceUsd: true,
        marketCap: true,
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
        priceUsd: true,
        marketCap: true,
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

// POST /api/tokens - Sync tokens from SaucerSwap (admin only)
export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "admin");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sync = searchParams.get("sync") === "true";

    if (!sync) {
      return NextResponse.json({ error: "Use ?sync=true to sync tokens" }, { status: 400 });
    }

    // Fetch all tokens from SaucerSwap
    const response = await fetch(SAUCERSWAP_API, {
      headers: {
        "x-api-key": process.env.SAUCERSWAP_API_KEY || "",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch from SaucerSwap" }, { status: 500 });
    }

    const saucerTokens: SaucerSwapToken[] = await response.json();

    // Filter only tokens with dueDiligenceComplete = true (verified tokens)
    const verifiedTokens = saucerTokens.filter(t => t.dueDiligenceComplete === true);

    let created = 0;
    let updated = 0;

    for (const token of verifiedTokens) {
      const existing = await prisma.token.findUnique({
        where: { tokenAddress: token.id },
      });

      if (existing) {
        // Update existing token with new info from SaucerSwap
        await prisma.token.update({
          where: { tokenAddress: token.id },
          data: {
            symbol: token.symbol,
            name: token.name,
            icon: token.icon || existing.icon,
            website: token.website || existing.website,
            decimals: token.decimals,
            priceUsd: token.priceUsd || null,
          },
        });
        updated++;
      } else {
        // Create new token
        await prisma.token.create({
          data: {
            tokenAddress: token.id,
            symbol: token.symbol,
            name: token.name,
            icon: token.icon || null,
            website: token.website || null,
            decimals: token.decimals,
            priceUsd: token.priceUsd || null,
            isApproved: true, // Auto-approve verified SaucerSwap tokens
            isHidden: false,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${verifiedTokens.length} verified tokens from SaucerSwap`,
      created,
      updated,
      total: verifiedTokens.length,
    });
  } catch (error) {
    console.error("Sync tokens error:", error);
    return NextResponse.json({ error: "Failed to sync tokens" }, { status: 500 });
  }
}
