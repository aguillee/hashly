import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/forever-mints - List all forever mints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [foreverMints, total] = await Promise.all([
      prisma.event.findMany({
        where: {
          isForeverMint: true,
          isApproved: true,
        },
        orderBy: [
          { votesUp: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: offset,
        include: {
          phases: {
            orderBy: { order: "asc" },
          },
          createdBy: {
            select: { walletAddress: true },
          },
        },
      }),
      prisma.event.count({
        where: {
          isForeverMint: true,
          isApproved: true,
        },
      }),
    ]);

    return NextResponse.json({
      items: foreverMints,
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
