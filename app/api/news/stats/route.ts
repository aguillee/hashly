import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/news/stats - Get news tracking stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const tracking = await prisma.newsTracking.findMany();

    const stats: Record<string, { views: number; clicks: number }> = {};
    let totalViews = 0;
    let totalClicks = 0;

    for (const t of tracking) {
      stats[t.id] = { views: t.views, clicks: t.clicks };
      totalViews += t.views;
      totalClicks += t.clicks;
    }

    return NextResponse.json({ stats, totals: { views: totalViews, clicks: totalClicks } });
  } catch (error) {
    console.error("Failed to get news stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
