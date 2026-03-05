import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const trackSchema = z.object({
  articleId: z.string().min(1).max(500),
  type: z.enum(["view", "click"]),
});

// POST /api/news/track - Track view or click on a news article
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = trackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { articleId, type } = validation.data;

    await prisma.newsTracking.upsert({
      where: { id: articleId },
      create: {
        id: articleId,
        views: type === "view" ? 1 : 0,
        clicks: type === "click" ? 1 : 0,
      },
      update: {
        [type === "view" ? "views" : "clicks"]: { increment: 1 },
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Silently fail - tracking should never break the UX
    return NextResponse.json({ ok: true });
  }
}
