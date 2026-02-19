import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/host-requests - Get user's host requests
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await prisma.hostRequest.findMany({
      where: { walletAddress: user.walletAddress },
      orderBy: { createdAt: "desc" },
    });

    // Get event details for each request
    const eventIds = requests.map((r) => r.eventId);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        mintDate: true,
        event_type: true,
      },
    });

    const eventsMap = new Map(events.map((e) => [e.id, e]));

    const requestsWithEvents = requests.map((r) => ({
      ...r,
      event: eventsMap.get(r.eventId),
    }));

    return NextResponse.json({ requests: requestsWithEvents });
  } catch (error) {
    console.error("Failed to fetch host requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch host requests" },
      { status: 500 }
    );
  }
}

// POST /api/host-requests - Request to be host of an event
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, message } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check event exists and is a meetup
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        event_type: true,
        isApproved: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.event_type !== "ECOSYSTEM_MEETUP") {
      return NextResponse.json(
        { error: "Host requests are only available for Ecosystem Meetups" },
        { status: 400 }
      );
    }

    // Check if already requested
    const existing = await prisma.hostRequest.findUnique({
      where: {
        walletAddress_eventId: {
          walletAddress: user.walletAddress,
          eventId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already requested to host this event" },
        { status: 400 }
      );
    }

    // Check if event already has an approved host
    const approvedHost = await prisma.hostRequest.findFirst({
      where: {
        eventId,
        status: "APPROVED",
      },
    });

    if (approvedHost) {
      return NextResponse.json(
        { error: "This event already has an approved host" },
        { status: 400 }
      );
    }

    // Create host request
    const hostRequest = await prisma.hostRequest.create({
      data: {
        walletAddress: user.walletAddress,
        eventId,
        message: message?.slice(0, 500), // Limit message length
      },
    });

    return NextResponse.json({
      success: true,
      request: hostRequest,
    });
  } catch (error) {
    console.error("Failed to create host request:", error);
    return NextResponse.json(
      { error: "Failed to create host request" },
      { status: 500 }
    );
  }
}
