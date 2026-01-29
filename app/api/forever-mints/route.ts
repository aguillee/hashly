import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/forever-mints - List all forever mints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Use raw query to order by score (votesUp - votesDown)
    const foreverMints = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      description: string;
      mint_date: Date | null;
      mint_price: string;
      supply: number | null;
      image_url: string | null;
      website_url: string | null;
      twitter_url: string | null;
      discord_url: string | null;
      category: string | null;
      status: string;
      is_approved: boolean;
      votes_up: number;
      votes_down: number;
      created_at: Date;
      updated_at: Date;
      source: string;
      external_id: string | null;
      is_forever_mint: boolean;
      created_by_id: string;
    }>>`
      SELECT e.*
      FROM events e
      WHERE e.is_forever_mint = true AND e.is_approved = true
      ORDER BY (e.votes_up - e.votes_down) DESC, e.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await prisma.event.count({
      where: {
        isForeverMint: true,
        isApproved: true,
      },
    });

    // Map snake_case to camelCase for frontend compatibility
    const mappedMints = foreverMints.map((mint) => ({
      id: mint.id,
      title: mint.title,
      description: mint.description,
      mintDate: mint.mint_date,
      mintPrice: mint.mint_price,
      supply: mint.supply,
      imageUrl: mint.image_url,
      websiteUrl: mint.website_url,
      twitterUrl: mint.twitter_url,
      discordUrl: mint.discord_url,
      category: mint.category,
      status: mint.status,
      isApproved: mint.is_approved,
      votesUp: mint.votes_up,
      votesDown: mint.votes_down,
      createdAt: mint.created_at,
      updatedAt: mint.updated_at,
      source: mint.source,
      externalId: mint.external_id,
      isForeverMint: mint.is_forever_mint,
      createdById: mint.created_by_id,
    }));

    return NextResponse.json({
      items: mappedMints,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Failed to fetch forever mints:", error);
    return NextResponse.json(
      { error: "Failed to fetch forever mints" },
      { status: 500 }
    );
  }
}
