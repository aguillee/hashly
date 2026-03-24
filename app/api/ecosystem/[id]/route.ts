import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateRequest, updateEcosystemProjectSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// GET — single project by id or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;
    const user = await getCurrentUser();

    // Try by slug first, then by id
    const project = await prisma.ecosystemProject.findFirst({
      where: { OR: [{ slug: id }, { id }] },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        countryCode: true,
        logoUrl: true,
        description: true,
        websiteUrl: true,
        twitterUrl: true,
        discordUrl: true,
        telegramUrl: true,
        linkedinUrl: true,
        contactEmail: true,
        isApproved: true,
        submittedById: true,
        createdAt: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Non-approved projects only visible to owner or admin
    if (!project.isApproved && (!user || (user.id !== project.submittedById && !user.isAdmin))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Hide contactEmail from non-owners/non-admins
    const isOwnerOrAdmin = user && (user.id === project.submittedById || user.isAdmin);
    return NextResponse.json({
      project: {
        ...project,
        contactEmail: isOwnerOrAdmin ? project.contactEmail : undefined,
        isOwner: user?.id === project.submittedById,
      },
    });
  } catch (error) {
    console.error("Failed to fetch ecosystem project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — owner update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await prisma.ecosystemProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.submittedById !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(updateEcosystemProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;
    const clean = (val?: string) => (val && val.trim() ? val.trim() : null);

    const updated = await prisma.ecosystemProject.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.category && { category: data.category }),
        ...(data.countryCode && { countryCode: data.countryCode }),
        ...(data.logoUrl && { logoUrl: data.logoUrl }),
        ...(data.description && { description: data.description.trim() }),
        ...(data.websiteUrl && { websiteUrl: data.websiteUrl }),
        ...(data.twitterUrl !== undefined && { twitterUrl: clean(data.twitterUrl) }),
        ...(data.discordUrl !== undefined && { discordUrl: clean(data.discordUrl) }),
        ...(data.telegramUrl !== undefined && { telegramUrl: clean(data.telegramUrl) }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: clean(data.linkedinUrl) }),
        ...(data.contactEmail !== undefined && { contactEmail: clean(data.contactEmail) }),
      },
    });

    return NextResponse.json({ success: true, project: { id: updated.id, slug: updated.slug } });
  } catch (error) {
    console.error("Failed to update ecosystem project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
