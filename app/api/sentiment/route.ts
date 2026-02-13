import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getTodayUTC,
  calculateScore,
  calculateGlobalScore,
  calculateSmoothedScore,
  getTimeUntilMidnightUTC,
} from "@/lib/hcs";

/**
 * GET /api/sentiment
 * Returns current sentiment data and user's votes for today
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const days = parseInt(searchParams.get("days") || "7");

    const today = getTodayUTC();

    // Get last N days of data for historical view
    const endDate = today;
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days + 1);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Fetch daily aggregates
    const dailyData = await prisma.sentimentDaily.findMany({
      where: {
        date: {
          gte: startDateStr,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    });

    // Get today's data or calculate from votes
    let todayData = dailyData.find((d) => d.date === today);

    if (!todayData) {
      // Calculate from today's votes
      const todayVotes = await prisma.sentimentVote.groupBy({
        by: ["category", "vote"],
        where: { date: today },
        _count: true,
      });

      const counts = {
        nftBullish: 0,
        nftBearish: 0,
        networkBullish: 0,
        networkBearish: 0,
        hbarBullish: 0,
        hbarBearish: 0,
      };

      todayVotes.forEach((v) => {
        const key = `${v.category.toLowerCase()}${v.vote === "BULLISH" ? "Bullish" : "Bearish"}` as keyof typeof counts;
        counts[key] = v._count;
      });

      const totalVoters = await prisma.sentimentVote.groupBy({
        by: ["walletAddress"],
        where: { date: today },
      });

      const nftScore = calculateScore(counts.nftBullish, counts.nftBearish);
      const networkScore = calculateScore(counts.networkBullish, counts.networkBearish);
      const hbarScore = calculateScore(counts.hbarBullish, counts.hbarBearish);

      todayData = {
        id: "temp",
        date: today,
        ...counts,
        nftScore,
        networkScore,
        hbarScore,
        globalScore: calculateGlobalScore(nftScore, networkScore, hbarScore),
        totalVoters: totalVoters.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Calculate smoothed score using last 3 days
    const yesterday = dailyData.find((d) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - 1);
      return d.date === date.toISOString().split("T")[0];
    });

    const dayBefore = dailyData.find((d) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - 2);
      return d.date === date.toISOString().split("T")[0];
    });

    const smoothedGlobalScore = calculateSmoothedScore(
      todayData?.globalScore ?? null,
      yesterday?.globalScore ?? null,
      dayBefore?.globalScore ?? null
    );

    // Get user's votes for today if wallet provided
    let userVotes: Record<string, string> = {};
    if (walletAddress) {
      const votes = await prisma.sentimentVote.findMany({
        where: {
          walletAddress,
          date: today,
        },
        select: {
          category: true,
          vote: true,
        },
      });

      votes.forEach((v) => {
        userVotes[v.category.toLowerCase()] = v.vote.toLowerCase();
      });
    }

    return NextResponse.json({
      today: {
        date: today,
        scores: {
          nft: todayData?.nftScore ?? null,
          network: todayData?.networkScore ?? null,
          hbar: todayData?.hbarScore ?? null,
          global: todayData?.globalScore ?? null,
          smoothedGlobal: smoothedGlobalScore,
        },
        votes: {
          nft: {
            bullish: todayData?.nftBullish ?? 0,
            bearish: todayData?.nftBearish ?? 0,
          },
          network: {
            bullish: todayData?.networkBullish ?? 0,
            bearish: todayData?.networkBearish ?? 0,
          },
          hbar: {
            bullish: todayData?.hbarBullish ?? 0,
            bearish: todayData?.hbarBearish ?? 0,
          },
        },
        totalVoters: todayData?.totalVoters ?? 0,
      },
      userVotes,
      timeUntilReset: getTimeUntilMidnightUTC(),
      history: dailyData.map((d) => ({
        date: d.date,
        globalScore: d.globalScore,
        nftScore: d.nftScore,
        networkScore: d.networkScore,
        hbarScore: d.hbarScore,
        totalVoters: d.totalVoters,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch sentiment:", error);
    return NextResponse.json(
      { error: "Failed to fetch sentiment data" },
      { status: 500 }
    );
  }
}
