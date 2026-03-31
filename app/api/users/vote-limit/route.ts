import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVoteLimitInfo } from "@/lib/vote-limit";
import { prisma } from "@/lib/db";

// Get start of current UTC day
function getUTCDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const limitInfo = await getVoteLimitInfo(user.walletAddress);

    // Only fetch history if user has used votes today
    if (limitInfo.used === 0) {
      return NextResponse.json({
        ...limitInfo,
        history: [],
      });
    }

    const todayStart = getUTCDayStart();

    // Get today's vote actions from PointHistory (includes every vote change)
    const voteActions = await prisma.pointHistory.findMany({
      where: {
        userId: user.id,
        actionType: { in: ["VOTE", "COLLECTION_VOTE", "TOKEN_VOTE"] },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        actionType: true,
        description: true,
        createdAt: true,
      },
    });

    // Parse history from PointHistory descriptions
    const history = voteActions.map((v) => {
      const desc = v.description || "";
      const isUp = desc.startsWith("Upvoted") || desc.startsWith("Voted on");
      const isDown = desc.startsWith("Downvoted");

      let type: "event" | "collection" | "token" = "event";
      let name = desc;

      if (v.actionType === "COLLECTION_VOTE") {
        type = "collection";
        name = desc.replace(/^(Upvoted|Downvoted|Voted on) (collection|project): /, "");
      } else if (v.actionType === "TOKEN_VOTE") {
        type = "token";
        name = desc.replace(/^(Upvoted|Downvoted|Voted on) token: /, "");
      } else {
        type = "event";
        name = desc.replace(/^(Upvoted|Downvoted|Voted on) event: /, "");
      }

      return {
        type,
        id: "",
        name,
        imageUrl: null,
        voteType: isDown ? "DOWN" : "UP",
        timestamp: v.createdAt.toISOString(),
      };
    }).slice(0, 5);

    return NextResponse.json({
      ...limitInfo,
      history,
    });
  } catch (error) {
    console.error("Get vote limit error:", error);
    return NextResponse.json(
      { error: "Failed to get vote limit" },
      { status: 500 }
    );
  }
}
