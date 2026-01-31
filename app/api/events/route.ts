import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EventStatus, Prisma } from "@prisma/client";
import { hasElSantuario } from "@/lib/hedera";

export const dynamic = "force-dynamic";
import { checkRateLimit } from "@/lib/rate-limit";
import { createEventSchema, validateRequest } from "@/lib/validations";

// GET /api/events - List events
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const now = new Date();

    // === Auto-update event statuses based on time ===
    // Update UPCOMING events that should now be LIVE (mintDate has passed)
    // Only for events WITH a mint date (not TBA), and not Forever Mints
    await prisma.event.updateMany({
      where: {
        status: "UPCOMING",
        isForeverMint: false,
        mintDate: {
          not: null,
          lte: now,
        },
      },
      data: { status: "LIVE" },
    });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoriesParam = searchParams.get("categories"); // comma-separated
    const sortBy = searchParams.get("sortBy") || "date";
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const source = searchParams.get("source"); // SENTX or KABILA
    const foreverMints = searchParams.get("foreverMints"); // "only", "exclude", or "include"

    // Build where clause
    const where: Prisma.EventWhereInput = {
      isApproved: true,
    };

    // Handle forever mints filter
    if (foreverMints === "only") {
      where.isForeverMint = true;
    } else if (foreverMints === "exclude") {
      where.isForeverMint = false;
    }
    // "include" or not specified means show all

    // Source filter
    if (source && (source === "SENTX" || source === "KABILA")) {
      where.source = source;
    }

    if (status && status !== "all") {
      where.status = status.toUpperCase() as EventStatus;
    }

    // Support multiple categories
    if (categoriesParam) {
      const categoriesList = categoriesParam.split(",").filter(Boolean);
      if (categoriesList.length > 0) {
        where.category = { in: categoriesList };
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    let orderBy: Prisma.EventOrderByWithRelationInput = { mintDate: "asc" };

    if (sortBy === "votes") {
      orderBy = { votesUp: "desc" };
    } else if (sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    }

    // Fetch events
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          description: true,
          mintDate: true,
          mintPrice: true,
          supply: true,
          imageUrl: true,
          category: true,
          status: true,
          votesUp: true,
          votesDown: true,
          createdAt: true,
          isForeverMint: true,
          source: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    // Get user votes if authenticated
    const user = await getCurrentUser();
    let userVotesData: Record<string, { voteType: "UP" | "DOWN"; canVote: boolean; voteLockedUntil: string | null }> = {};

    if (user) {
      const votes = await prisma.vote.findMany({
        where: {
          userId: user.id,
          eventId: { in: events.map((e) => e.id) },
        },
        select: {
          eventId: true,
          voteType: true,
          createdAt: true,
        },
      });

      userVotesData = votes.reduce((acc, v) => {
        const hoursSinceVote = (Date.now() - v.createdAt.getTime()) / (1000 * 60 * 60);
        const canVote = hoursSinceVote >= 24;
        const voteLockedUntil = canVote
          ? null
          : new Date(v.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();

        acc[v.eventId] = {
          voteType: v.voteType,
          canVote,
          voteLockedUntil,
        };
        return acc;
      }, {} as Record<string, { voteType: "UP" | "DOWN"; canVote: boolean; voteLockedUntil: string | null }>);
    }

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        mintDate: e.mintDate?.toISOString() || null, // Can be null for TBA events
        createdAt: e.createdAt.toISOString(),
        userVote: userVotesData[e.id]?.voteType || null,
        canVote: userVotesData[e.id]?.canVote ?? true,
        voteLockedUntil: userVotesData[e.id]?.voteLockedUntil || null,
      })),
      total,
      hasMore: offset + events.length < total,
    });
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST /api/events - Create event (user submission)
export async function POST(request: NextRequest) {
  // Rate limiting - stricter for write operations
  const rateLimitResponse = await checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(createEventSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      mintDate,
      mintPrice,
      supply,
      imageUrl,
      websiteUrl,
      twitterUrl,
      discordUrl,
      phases,
    } = validation.data;

    // Check if user has El Santuario NFT for auto-approval
    const hasSantuarioNFT = await hasElSantuario(user.walletAddress);
    const shouldAutoApprove = user.isAdmin || hasSantuarioNFT;

    // Create event with phases (pending approval unless admin or has El Santuario)
    const event = await prisma.event.create({
      data: {
        title,
        description,
        mintDate: new Date(mintDate),
        mintPrice,
        supply: typeof supply === "number" ? supply : (supply ? parseInt(supply) : null),
        imageUrl,
        websiteUrl,
        twitterUrl,
        discordUrl,
        isApproved: shouldAutoApprove, // Auto-approve if admin or has El Santuario NFT
        createdById: user.id,
        // Create phases if provided
        ...(phases && phases.length > 0 && {
          phases: {
            create: phases.map((phase) => ({
              name: phase.name,
              startDate: new Date(phase.startDate),
              endDate: phase.endDate ? new Date(phase.endDate) : null,
              price: phase.price,
              supply: phase.supply ?? null,
              maxPerWallet: phase.maxPerWallet ?? null,
              isWhitelist: phase.isWhitelist,
              order: phase.order,
            })),
          },
        }),
      },
      include: {
        phases: true,
      },
    });

    return NextResponse.json({
      event,
      message: shouldAutoApprove
        ? "Event created and published"
        : "Event submitted for review",
      autoApproved: shouldAutoApprove,
      approvedByNFT: hasSantuarioNFT && !user.isAdmin,
    });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
