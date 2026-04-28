import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateRequest, adminUpdateEcosystemProjectSchema } from "@/lib/validations";
import { POINTS } from "@/lib/points";
import { awardReferralCommission } from "@/lib/referral-points";

export const dynamic = "force-dynamic";

// PATCH — admin: update project (approve/reject/edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await prisma.ecosystemProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateRequest(adminUpdateEcosystemProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Approval transition: false → true → create CommunityProfile + award points to submitter.
    // Idempotent by virtue of the `!project.isApproved` guard — re-approving an already-approved
    // project is a no-op for both the profile creation and the points award.
    if (data.isApproved === true && !project.isApproved) {
      const twitterHandle = project.twitterUrl
        ? project.twitterUrl.replace(/https?:\/\/(x\.com|twitter\.com)\//i, "").replace(/\/$/, "").replace("@", "")
        : null;

      const pointsAwarded = POINTS.ECOSYSTEM_PROJECT_APPROVED;

      const [profile] = await prisma.$transaction([
        prisma.communityProfile.create({
          data: {
            userId: project.submittedById,
            type: "PROJECT",
            displayName: project.name,
            countryCode: project.countryCode,
            bio: project.description.substring(0, 280),
            twitterHandle,
            avatarUrl: project.logoUrl,
            isVisible: true,
            isApproved: true,
          },
        }),
        prisma.user.update({
          where: { id: project.submittedById },
          data: { points: { increment: pointsAwarded } },
        }),
        prisma.pointHistory.create({
          data: {
            userId: project.submittedById,
            points: pointsAwarded,
            actionType: "ECOSYSTEM_PROJECT_APPROVED",
            description: `Ecosystem project approved: ${project.name}`,
          },
        }),
      ]);

      await prisma.ecosystemProject.update({
        where: { id },
        data: {
          isApproved: true,
          communityProfileId: profile.id,
          ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
        },
      });

      // Referral commission lives outside the main transaction (same pattern as event approval).
      try {
        await awardReferralCommission(project.submittedById, pointsAwarded, "ECOSYSTEM_PROJECT_APPROVED");
      } catch (err) {
        console.error("[admin/ecosystem] referral commission failed (non-fatal):", err);
      }

      return NextResponse.json({ success: true, approved: true, pointsAwarded });
    }

    // Rejection: true → false → remove CommunityProfile
    if (data.isApproved === false && project.isApproved && project.communityProfileId) {
      await prisma.$transaction([
        prisma.communityProfile.delete({ where: { id: project.communityProfileId } }),
        prisma.ecosystemProject.update({
          where: { id },
          data: { isApproved: false, communityProfileId: null },
        }),
      ]);
      return NextResponse.json({ success: true, rejected: true });
    }

    // Regular update (no approval change or same state)
    const clean = (val?: string) => (val && val.trim() ? val.trim() : null);
    await prisma.ecosystemProject.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.categories && { categories: data.categories }),
        ...(data.countryCode && { countryCode: data.countryCode }),
        ...(data.logoUrl && { logoUrl: data.logoUrl }),
        ...(data.description && { description: data.description.trim() }),
        ...(data.websiteUrl && { websiteUrl: data.websiteUrl }),
        ...(data.twitterUrl !== undefined && { twitterUrl: clean(data.twitterUrl) }),
        ...(data.discordUrl !== undefined && { discordUrl: clean(data.discordUrl) }),
        ...(data.telegramUrl !== undefined && { telegramUrl: clean(data.telegramUrl) }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: clean(data.linkedinUrl) }),
        ...(data.contactEmail !== undefined && { contactEmail: clean(data.contactEmail) }),
        ...(data.isApproved !== undefined && { isApproved: data.isApproved }),
        ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin: failed to update ecosystem project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — admin: remove project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await prisma.ecosystemProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete CommunityProfile if linked, then the project
    if (project.communityProfileId) {
      await prisma.$transaction([
        prisma.communityProfile.delete({ where: { id: project.communityProfileId } }),
        prisma.ecosystemProject.delete({ where: { id } }),
      ]);
    } else {
      await prisma.ecosystemProject.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin: failed to delete ecosystem project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
