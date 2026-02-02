import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { updateHomeAdSchema } from "@/lib/validations";

// PATCH /api/admin/home-ads/[id] - Update ad
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const validation = updateHomeAdSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Record<string, any> = {};

    if (data.type !== undefined) updateData.type = data.type;
    if (data.eventId !== undefined) updateData.eventId = data.eventId;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const ad = await prisma.homeAd.update({
      where: { id },
      data: updateData,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            mintDate: true,
            status: true,
            votesUp: true,
          },
        },
      },
    });

    return NextResponse.json({ ad });
  } catch (error) {
    console.error("Failed to update home ad:", error);
    return NextResponse.json({ error: "Failed to update home ad" }, { status: 500 });
  }
}

// DELETE /api/admin/home-ads/[id] - Delete ad
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.homeAd.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete home ad:", error);
    return NextResponse.json({ error: "Failed to delete home ad" }, { status: 500 });
  }
}
