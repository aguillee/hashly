import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/admin/community/[id] - Update a community profile (admin only)
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
    const profile = await prisma.communityProfile.findUnique({ where: { id } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();

    const updatedProfile = await prisma.communityProfile.update({
      where: { id },
      data: {
        ...(body.isApproved !== undefined && { isApproved: body.isApproved }),
        ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
        ...(body.bio !== undefined && { bio: body.bio || null }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.twitterHandle !== undefined && { twitterHandle: body.twitterHandle || null }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl || null }),
      },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Admin: failed to update community profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/community/[id] - Delete a community profile (admin only)
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
    const profile = await prisma.communityProfile.findUnique({ where: { id } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.communityProfile.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin: failed to delete community profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
