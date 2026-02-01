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
    const eventType = searchParams.get("eventType"); // "MINT_EVENT", "ECOSYSTEM_MEETUP"

    // Build where clause
    const where: Prisma.EventWhereInput = {
      isApproved: true,
    };

    // Event type filter
    if (eventType === "MINT_EVENT" || eventType === "ECOSYSTEM_MEETUP") {
      where.event_type = eventType;
    }

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
          event_type: true,
          host: true,
          language: true,
          location: true,
          location_type: true,
          custom_links: true,
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

    const data = validation.data;

    // Check if user has El Santuario NFT for auto-approval
    const hasSantuarioNFT = await hasElSantuario(user.walletAddress);
    const shouldAutoApprove = user.isAdmin || hasSantuarioNFT;

    // Determine event type from body (not from Zod - we handle it separately)
    const reqEventType = body.eventType === "ECOSYSTEM_MEETUP" ? "ECOSYSTEM_MEETUP" : "MINT_EVENT";

    // Build event data
    const eventData: any = {
      title: data.title,
      description: data.description,
      mintDate: new Date(data.mintDate),
      mintPrice: data.mintPrice,
      supply: typeof data.supply === "number" ? data.supply : (data.supply ? parseInt(data.supply) : null),
      imageUrl: data.imageUrl,
      websiteUrl: data.websiteUrl,
      twitterUrl: data.twitterUrl,
      discordUrl: data.discordUrl,
      isApproved: shouldAutoApprove,
      createdById: user.id,
      event_type: reqEventType,
    };

    // Add meetup-specific fields
    if (reqEventType === "ECOSYSTEM_MEETUP") {
      eventData.host = body.host || null;
      eventData.language = body.language || null;
      eventData.location_type = body.locationType === "IN_PERSON" ? "IN_PERSON" : "ONLINE";
      eventData.location = body.location || null;
      eventData.custom_links = body.customLinks || null;
      if (body.endDate) {
        // We don't have an endDate column directly, but we do now from db pull
        // Actually the schema has no endDate on Event... but the DB does have it
        // Let's not set it for now since the pulled schema doesn't show it
      }
    }

    // Add phases for mint events
    if (reqEventType === "MINT_EVENT" && data.phases && data.phases.length > 0) {
      eventData.phases = {
        create: data.phases.map((phase: any) => ({
          name: phase.name,
          startDate: new Date(phase.startDate),
          endDate: phase.endDate ? new Date(phase.endDate) : null,
          price: phase.price,
          supply: phase.supply ?? null,
          maxPerWallet: phase.maxPerWallet ?? null,
          isWhitelist: phase.isWhitelist,
          order: phase.order,
        })),
      };
    }

    const event = await prisma.event.create({
      data: eventData,
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
