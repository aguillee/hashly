import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/v1/tokens/top — top tokens by community votes.
export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  const authFail = requireApiKey(request);
  if (authFail) return authFail;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "30") || 30, 100));

    const tokens = await prisma.token.findMany({
      where: { isApproved: true, isHidden: false },
      orderBy: { totalVotes: "desc" },
      take: limit,
      select: {
        id: true,
        tokenAddress: true,
        symbol: true,
        name: true,
        icon: true,
        totalVotes: true,
        priceUsd: true,
        marketCap: true,
      },
    });

    return NextResponse.json({
      tokens: tokens.map((t, i) => ({
        ...t,
        rank: i + 1,
      })),
    });
  } catch (error) {
    console.error("[v1/tokens/top] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
