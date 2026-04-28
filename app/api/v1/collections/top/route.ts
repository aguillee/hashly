import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/v1/collections/top — top NFT collections by community votes.
export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  const authFail = requireApiKey(request);
  if (authFail) return authFail;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "30") || 30, 100));

    const collections = await prisma.collection.findMany({
      where: { isApproved: true, isHidden: false },
      orderBy: { totalVotes: "desc" },
      take: limit,
      select: {
        id: true,
        tokenAddress: true,
        name: true,
        image: true,
        owners: true,
        supply: true,
        totalVotes: true,
      },
    });

    return NextResponse.json({
      collections: collections.map((c, i) => ({
        ...c,
        rank: i + 1,
      })),
    });
  } catch (error) {
    console.error("[v1/collections/top] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
