import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { walletAddress: true },
        },
        phases: {
          orderBy: { order: "asc" },
        },
        votes: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has voted and calculate cooldown
    let userVote: "UP" | "DOWN" | null = null;
    let voteLockedUntil: string | null = null;
    let canVote = true;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const existingVote = event.votes.find(
          (v) => v.userId === payload.userId
        );
        if (existingVote) {
          userVote = existingVote.voteType;

          // Forever Mints: no cooldown, can always change vote (like collections)
          if (event.isForeverMint) {
            canVote = true;
            voteLockedUntil = null;
          } else {
            // Regular events: Check 24h cooldown
            const hoursSinceVote =
              (Date.now() - existingVote.createdAt.getTime()) / (1000 * 60 * 60);

            if (hoursSinceVote < 24) {
              canVote = false;
              const unlockTime = new Date(existingVote.createdAt.getTime() + 24 * 60 * 60 * 1000);
              voteLockedUntil = unlockTime.toISOString();
            }
          }
        }
      }
    }

    // Remove votes array from response (we only needed it to check user's vote)
    const { votes, ...eventData } = event;

    return NextResponse.json({
      ...eventData,
      userVote,
      canVote,
      voteLockedUntil,
    });
  } catch (error) {
    console.error("Failed to get event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
