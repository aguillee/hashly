import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateRequest, createEcosystemProjectSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET — public list of approved ecosystem projects
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: any = { isApproved: true, isVisible: true };
    if (category && category !== "ALL") {
      where.categories = { has: category };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortBy = searchParams.get("sortBy");

    // Default order: highest community votes first. Falling back to name on
    // ties keeps the listing stable when many projects sit at 0 votes.
    let orderBy: any;
    if (sortBy === "newest") orderBy = { createdAt: "desc" };
    else if (sortBy === "name") orderBy = { name: "asc" };
    else orderBy = [{ totalVotes: "desc" }, { name: "asc" }];

    const projects = await prisma.ecosystemProject.findMany({
      where,
      orderBy,
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
        linkedinUrl: true,
        totalVotes: true,
        createdAt: true,
      },
    });

    // Get user votes if authenticated
    let userVotes: Record<string, string> = {};
    try {
      const user = await getCurrentUser();
      if (user) {
        const votes = await prisma.ecosystemProjectVote.findMany({
          where: { walletAddress: user.walletAddress },
          select: { projectId: true, voteType: true },
        });
        for (const v of votes) {
          userVotes[v.projectId] = v.voteType;
        }
      }
    } catch {}

    return NextResponse.json({ projects, userVotes });
  } catch (error) {
    console.error("Failed to fetch ecosystem projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — submit a new ecosystem project (requires auth)
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateRequest(createEcosystemProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Generate unique slug
    let slug = slugify(data.name);
    if (!slug) slug = "project";
    let existing = await prisma.ecosystemProject.findUnique({ where: { slug } });
    let suffix = 2;
    while (existing) {
      slug = `${slugify(data.name)}-${suffix}`;
      existing = await prisma.ecosystemProject.findUnique({ where: { slug } });
      suffix++;
    }

    // Clean optional URLs (empty string → null)
    const clean = (val?: string) => (val && val.trim() ? val.trim() : null);

    const project = await prisma.ecosystemProject.create({
      data: {
        name: data.name.trim(),
        slug,
        categories: data.categories,
        countryCode: data.countryCode,
        logoUrl: data.logoUrl,
        description: data.description.trim(),
        websiteUrl: data.websiteUrl,
        twitterUrl: clean(data.twitterUrl),
        discordUrl: clean(data.discordUrl),
        telegramUrl: clean(data.telegramUrl),
        linkedinUrl: clean(data.linkedinUrl),
        contactEmail: clean(data.contactEmail),
        submittedById: user.id,
      },
    });

    return NextResponse.json({ success: true, project: { id: project.id, slug: project.slug } }, { status: 201 });
  } catch (error) {
    console.error("Failed to create ecosystem project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
