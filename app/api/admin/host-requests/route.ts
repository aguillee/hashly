import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/admin/host-requests - Get all host requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    const requests = await prisma.hostRequest.findMany({
      where: status !== "ALL" ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Get event details
    const eventIds = Array.from(new Set(requests.map((r) => r.eventId)));
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        mintDate: true,
        event_type: true,
        host: true,
      },
    });
    const eventsMap = new Map(events.map((e) => [e.id, e]));

    // Get user aliases
    const wallets = Array.from(new Set(requests.map((r) => r.walletAddress)));
    const users = await prisma.user.findMany({
      where: { walletAddress: { in: wallets } },
      select: { walletAddress: true, alias: true },
    });
    const usersMap = new Map(users.map((u) => [u.walletAddress, u]));

    const requestsWithDetails = requests.map((r) => ({
      ...r,
      event: eventsMap.get(r.eventId),
      user: usersMap.get(r.walletAddress),
    }));

    return NextResponse.json({ requests: requestsWithDetails });
  } catch (error) {
    console.error("Failed to fetch host requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch host requests" },
      { status: 500 }
    );
  }
}
