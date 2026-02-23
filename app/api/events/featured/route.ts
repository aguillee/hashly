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

    // Get featured meetups & hackathons
    const [
      topMeetupResults,
      upcomingMeetups,
      topHackathonResults,
      upcomingHackathons,
      biggestPrizeHackathon,
    ] = await Promise.all([
      // Most voted meetup
      prisma.event.findFirst({
        where: {
          isApproved: true,
          event_type: "ECOSYSTEM_MEETUP",
          status: { in: ["UPCOMING", "LIVE"] },
        },
        orderBy: { votesUp: "desc" },
      }),
      // Upcoming meetups (closest date)
      prisma.event.findMany({
        where: {
          isApproved: true,
          event_type: "ECOSYSTEM_MEETUP",
          status: "UPCOMING",
          mintDate: { gt: now },
        },
        orderBy: { mintDate: "asc" },
        take: 3,
      }),
      // Most voted hackathon
      prisma.event.findFirst({
        where: {
          isApproved: true,
          event_type: "HACKATHON",
          status: { in: ["UPCOMING", "LIVE"] },
        },
        orderBy: { votesUp: "desc" },
      }),
      // Upcoming hackathons (closest date)
      prisma.event.findMany({
        where: {
          isApproved: true,
          event_type: "HACKATHON",
          status: "UPCOMING",
          mintDate: { gt: now },
        },
        orderBy: { mintDate: "asc" },
        take: 3,
      }),
      // Biggest prize hackathon (has prizes field, non-empty)
      prisma.event.findFirst({
        where: {
          isApproved: true,
          event_type: "HACKATHON",
          status: { in: ["UPCOMING", "LIVE"] },
          prizes: { not: null },
        },
        orderBy: { votesUp: "desc" },
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
      const score = Math.abs(event.votesUp) - Math.abs(event.votesDown);
      if (score > highestScore) {
        highestScore = score;
        mostVoted = event;
      }
    }

    // Find most voted LIVE event
    let mostVotedLive = null;
    let highestLiveScore = -Infinity;

    for (const event of events.filter(e => e.status === "LIVE")) {
      const score = Math.abs(event.votesUp) - Math.abs(event.votesDown);
      if (score > highestLiveScore) {
        highestLiveScore = score;
        mostVotedLive = event;
      }
    }

    // Find next up (closest mint date in the future)
    // Only consider events with a mint date (not TBA) and exclude forever mints
    const upcomingEvents = events
      .filter((e) => e.mintDate && new Date(e.mintDate) > now)
      .sort((a, b) => new Date(a.mintDate!).getTime() - new Date(b.mintDate!).getTime());

    // Collect IDs already used (mostVoted, mostVotedLive) for deduplication
    const usedEventIds = new Set<string>();
    if (mostVoted) usedEventIds.add(mostVoted.id);
    if (mostVotedLive) usedEventIds.add(mostVotedLive.id);

    // Make sure nextUp is different from mostVoted and mostVotedLive
    let nextUp = upcomingEvents.find(e => !usedEventIds.has(e.id)) || null;

    // Build meetup featured data:
    // topMeetup = highest starred, nextMeetup = closest upcoming (different from topMeetup)
    const topMeetup = topMeetupResults;
    const nextMeetup = upcomingMeetups.find(m => !topMeetup || m.id !== topMeetup.id) || null;

    // Build hackathon featured data:
    // topHackathon = most voted, nextHackathon = closest upcoming (deduplicated), bigPrize = biggest prize (deduplicated)
    const topHackathon = topHackathonResults;
    const usedHackathonIds = new Set<string>();
    if (topHackathon) usedHackathonIds.add(topHackathon.id);

    const nextHackathon = upcomingHackathons.find(h => !usedHackathonIds.has(h.id)) || null;
    if (nextHackathon) usedHackathonIds.add(nextHackathon.id);

    // Biggest prize: must not duplicate the other two columns
    const bigPrizeHackathon = biggestPrizeHackathon && !usedHackathonIds.has(biggestPrizeHackathon.id)
      ? biggestPrizeHackathon
      : null;

    return NextResponse.json({
      mostVoted: mostVoted
        ? {
            ...mostVoted,
            score: Math.abs(mostVoted.votesUp) - Math.abs(mostVoted.votesDown),
          }
        : null,
      nextUp: nextUp
        ? {
            ...nextUp,
            score: Math.abs(nextUp.votesUp) - Math.abs(nextUp.votesDown),
          }
        : null,
      mostVotedLive: mostVotedLive
        ? {
            ...mostVotedLive,
            score: Math.abs(mostVotedLive.votesUp) - Math.abs(mostVotedLive.votesDown),
          }
        : null,
      topForeverMint: topForeverMint
        ? {
            ...topForeverMint,
            score: Math.abs(topForeverMint.votesUp) - Math.abs(topForeverMint.votesDown),
          }
        : null,
      // Ecosystem Meetups (3 columns: most voted, next upcoming, deduplicated)
      topMeetup: topMeetup
        ? { ...topMeetup, score: topMeetup.votesUp }
        : null,
      nextMeetup: nextMeetup
        ? { ...nextMeetup, score: nextMeetup.votesUp }
        : null,
      // Hackathons (3 columns: most voted, next upcoming, biggest prize, deduplicated)
      topHackathon: topHackathon
        ? { ...topHackathon, score: topHackathon.votesUp }
        : null,
      nextHackathon: nextHackathon
        ? { ...nextHackathon, score: nextHackathon.votesUp }
        : null,
      bigPrizeHackathon: bigPrizeHackathon
        ? { ...bigPrizeHackathon, score: bigPrizeHackathon.votesUp }
        : null,
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
