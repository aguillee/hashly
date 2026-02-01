import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/events/featured - Get featured events (most voted + next up + top forever mint)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const now = new Date();

    // Get all approved upcoming/live MINT events (excluding forever mints for main featured)
    const events = await prisma.event.findMany({
      where: {
        isApproved: true,
        status: { in: ["UPCOMING", "LIVE"] },
        isForeverMint: false,
        event_type: "MINT_EVENT",
      },
      include: {
        createdBy: {
          select: { walletAddress: true },
        },
        phases: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Get featured meetups: top starred (not ended) + 2 closest upcoming (not live)
    const [topMeetupResults, upcomingMeetups] = await Promise.all([
      prisma.event.findFirst({
        where: {
          isApproved: true,
          event_type: "ECOSYSTEM_MEETUP",
          status: { in: ["UPCOMING", "LIVE"] },
        },
        orderBy: { votesUp: "desc" },
      }),
      prisma.event.findMany({
        where: {
          isApproved: true,
          event_type: "ECOSYSTEM_MEETUP",
          status: "UPCOMING",
          mintDate: { gt: now },
        },
        orderBy: { mintDate: "asc" },
        take: 3, // We take 3 so we can exclude the top one and still have 2
      }),
    ]);

    // Get top forever mint separately - order by score (votesUp - votesDown)
    const topForeverMintResults = await prisma.$queryRaw<Array<{
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
      SELECT * FROM events
      WHERE is_forever_mint = true AND is_approved = true
      ORDER BY (votes_up - votes_down) DESC, created_at DESC
      LIMIT 1
    `;

    // Map snake_case to camelCase
    const topForeverMint = topForeverMintResults[0] ? {
      id: topForeverMintResults[0].id,
      title: topForeverMintResults[0].title,
      description: topForeverMintResults[0].description,
      mintDate: topForeverMintResults[0].mint_date,
      mintPrice: topForeverMintResults[0].mint_price,
      supply: topForeverMintResults[0].supply,
      imageUrl: topForeverMintResults[0].image_url,
      websiteUrl: topForeverMintResults[0].website_url,
      twitterUrl: topForeverMintResults[0].twitter_url,
      discordUrl: topForeverMintResults[0].discord_url,
      category: topForeverMintResults[0].category,
      status: topForeverMintResults[0].status,
      isApproved: topForeverMintResults[0].is_approved,
      votesUp: topForeverMintResults[0].votes_up,
      votesDown: topForeverMintResults[0].votes_down,
      createdAt: topForeverMintResults[0].created_at,
      updatedAt: topForeverMintResults[0].updated_at,
      source: topForeverMintResults[0].source,
      externalId: topForeverMintResults[0].external_id,
      isForeverMint: topForeverMintResults[0].is_forever_mint,
    } : null;

    // Calculate score and find most voted (UPCOMING only, excluding forever mints and LIVE events)
    let mostVoted = null;
    let highestScore = -Infinity;

    for (const event of events.filter(e => e.status === "UPCOMING")) {
      const score = event.votesUp - event.votesDown;
      if (score > highestScore) {
        highestScore = score;
        mostVoted = event;
      }
    }

    // Find next up (closest mint date in the future)
    // Only consider events with a mint date (not TBA) and exclude forever mints
    const upcomingEvents = events
      .filter((e) => e.mintDate && new Date(e.mintDate) > now)
      .sort((a, b) => new Date(a.mintDate!).getTime() - new Date(b.mintDate!).getTime());

    // Make sure nextUp is different from mostVoted if possible
    let nextUp = upcomingEvents[0] || null;
    if (nextUp && mostVoted && nextUp.id === mostVoted.id && upcomingEvents.length > 1) {
      nextUp = upcomingEvents[1];
    }

    // Build meetup featured data:
    // topMeetup = highest starred (not ended), nextMeetups = 2 closest upcoming (different from topMeetup)
    const topMeetup = topMeetupResults;
    const nextMeetups = upcomingMeetups
      .filter(m => !topMeetup || m.id !== topMeetup.id)
      .slice(0, 2);

    return NextResponse.json({
      mostVoted: mostVoted
        ? {
            ...mostVoted,
            score: mostVoted.votesUp - mostVoted.votesDown,
          }
        : null,
      nextUp: nextUp
        ? {
            ...nextUp,
            score: nextUp.votesUp - nextUp.votesDown,
          }
        : null,
      topForeverMint: topForeverMint
        ? {
            ...topForeverMint,
            score: topForeverMint.votesUp - topForeverMint.votesDown,
          }
        : null,
      // Ecosystem Meetups
      topMeetup: topMeetup
        ? { ...topMeetup, score: topMeetup.votesUp }
        : null,
      nextMeetups: nextMeetups.map(m => ({
        ...m,
        score: m.votesUp,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch featured events:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured events" },
      { status: 500 }
    );
  }
}
// Deploy trigger 1769637078
// Deploy trigger 1769637225
