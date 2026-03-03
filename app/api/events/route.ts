import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EventStatus, Prisma } from "@prisma/client";
import { hasElSantuario } from "@/lib/hedera";

export const dynamic = "force-dynamic";
import { checkRateLimit } from "@/lib/rate-limit";
import { createEventSchema, meetupFieldsSchema, validateRequest } from "@/lib/validations";

// Throttle event status updates: run at most once every 5 minutes
let lastStatusUpdate = 0;
const STATUS_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

async function maybeUpdateEventStatuses() {
  const now = Date.now();
  if (now - lastStatusUpdate < STATUS_UPDATE_INTERVAL_MS) return;
  lastStatusUpdate = now;

  const currentDate = new Date();

  await Promise.all([
    // Update UPCOMING → LIVE (mintDate has passed)
    prisma.event.updateMany({
      where: {
        status: "UPCOMING",
        isForeverMint: false,
        mintDate: { not: null, lte: currentDate },
      },
      data: { status: "LIVE" },
    }),
    // Delete events whose endDate has passed
    prisma.event.deleteMany({
      where: {
        isForeverMint: false,
        endDate: { not: null, lt: currentDate },
      },
    }),
    // Delete LIVE mint events older than 7 days
    prisma.event.deleteMany({
      where: {
        status: "LIVE",
        isForeverMint: false,
        endDate: null,
        NOT: { event_type: { in: ["ECOSYSTEM_MEETUP", "HACKATHON"] } },
        mintDate: {
          not: null,
          lt: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);
}

// GET /api/events - List events
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Throttled status updates (at most once every 5 min)
    await maybeUpdateEventStatuses();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoriesParam = searchParams.get("categories"); // comma-separated
    const sortBy = searchParams.get("sortBy") || "date";
    // Limit search to 100 chars to prevent ReDoS attacks, trim and check for empty
    const rawSearch = searchParams.get("search");
    const search = rawSearch && rawSearch.trim().length > 0 ? rawSearch.slice(0, 100).trim() : null;
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "20") || 20, 100));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0") || 0);
    const source = searchParams.get("source"); // SENTX or KABILA
    const foreverMints = searchParams.get("foreverMints"); // "only", "exclude", or "include"
    const eventType = searchParams.get("eventType"); // "MINT_EVENT", "ECOSYSTEM_MEETUP"

    // Build where clause
    const where: Prisma.EventWhereInput = {
      isApproved: true,
    };

    // Event type filter
    if (eventType === "MINT_EVENT" || eventType === "ECOSYSTEM_MEETUP" || eventType === "HACKATHON") {
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
      const validStatuses = ["UPCOMING", "LIVE"];
      const upper = status.toUpperCase();
      if (!validStatuses.includes(upper)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      where.status = upper as EventStatus;
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
          endDate: true,
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
          prizes: true,
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
        endDate: e.endDate?.toISOString() || null,
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
    const reqEventType = body.eventType === "ECOSYSTEM_MEETUP" ? "ECOSYSTEM_MEETUP"
      : body.eventType === "HACKATHON" ? "HACKATHON"
      : "MINT_EVENT";

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

    // Add endDate if provided
    if (body.endDate) {
      eventData.endDate = new Date(body.endDate);
    }

    // Add meetup/hackathon-specific fields (validated with Zod)
    if (reqEventType === "ECOSYSTEM_MEETUP" || reqEventType === "HACKATHON") {
      const meetupValidation = meetupFieldsSchema.safeParse(body);
      if (!meetupValidation.success) {
        return NextResponse.json(
          { error: meetupValidation.error.issues.map(e => e.message).join(", ") },
          { status: 400 }
        );
      }
      const meetupData = meetupValidation.data;
      eventData.host = meetupData.host || null;
      eventData.language = meetupData.language || null;
      eventData.location_type = meetupData.locationType || "ONLINE";
      eventData.location = meetupData.location || null;
      eventData.custom_links = meetupData.customLinks || null;

      // Hackathon-specific: prizes
      if (reqEventType === "HACKATHON" && body.prizes) {
        eventData.prizes = String(body.prizes).slice(0, 500);
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
