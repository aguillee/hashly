import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/events/rejected - List rejected events (admin only)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const events = await prisma.event.findMany({
      where: { rejectedAt: { not: null } },
      orderBy: { rejectedAt: "desc" },
      include: {
        createdBy: {
          select: {
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Get rejected events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rejected events" },
      { status: 500 }
    );
  }
}
