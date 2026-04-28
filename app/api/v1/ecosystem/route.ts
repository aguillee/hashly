import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";
import { Prisma, EcosystemCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/v1/ecosystem — approved ecosystem projects.
export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  const authFail = requireApiKey(request);
  if (authFail) return authFail;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const country = searchParams.get("country");
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0") || 0);

    const where: Prisma.EcosystemProjectWhereInput = {
      isApproved: true,
      isVisible: true,
    };

    if (category) {
      const upper = category.toUpperCase();
      // Validate category against the Prisma enum without throwing.
      const validCategories = Object.values(EcosystemCategory) as string[];
      if (validCategories.includes(upper)) {
        where.categories = { has: upper as EcosystemCategory };
      }
    }

    if (country) {
      where.countryCode = country.toUpperCase();
    }

    const [projects, total] = await Promise.all([
      prisma.ecosystemProject.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          slug: true,
          categories: true,
          countryCode: true,
          logoUrl: true,
          description: true,
          websiteUrl: true,
          twitterUrl: true,
          discordUrl: true,
          telegramUrl: true,
          createdAt: true,
        },
      }),
      prisma.ecosystemProject.count({ where }),
    ]);

    return NextResponse.json({
      projects: projects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      hasMore: offset + projects.length < total,
    });
  } catch (error) {
    console.error("[v1/ecosystem] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ecosystem projects", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
