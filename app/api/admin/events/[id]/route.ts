import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminEventUpdateSchema = z.object({
  isApproved: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  mintDate: z.string().optional().nullable(),
  mintPrice: z.string().max(100).optional(),
  supply: z.number().int().positive().optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  websiteUrl: z.string().url().max(500).optional().nullable(),
  twitterUrl: z.string().url().max(500).optional().nullable(),
  discordUrl: z.string().url().max(500).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: z.enum(["UPCOMING", "LIVE"]).optional(),
  isForeverMint: z.boolean().optional(),
  event_type: z.enum(["MINT_EVENT", "ECOSYSTEM_MEETUP", "HACKATHON"]).optional(),
  host: z.string().max(200).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  location_type: z.enum(["ONLINE", "IN_PERSON"]).optional().nullable(),
  prizes: z.string().max(500).optional().nullable(),
  custom_links: z.any().optional().nullable(),
});

// GET /api/admin/events/[id] - Get single event for editing
export async function GET(
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

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: { select: { walletAddress: true } },
        phases: { orderBy: { order: "asc" } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Failed to fetch event:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

// PATCH /api/admin/events/[id] - Update event fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const validation = adminEventUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Build update data, only including provided fields
    const updateData: Record<string, any> = {};
    const data = validation.data;

    if (data.isApproved !== undefined) updateData.isApproved = data.isApproved;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.mintDate !== undefined) updateData.mintDate = data.mintDate ? new Date(data.mintDate) : null;
    if (data.mintPrice !== undefined) updateData.mintPrice = data.mintPrice;
    if (data.supply !== undefined) updateData.supply = data.supply;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
    if (data.twitterUrl !== undefined) updateData.twitterUrl = data.twitterUrl;
    if (data.discordUrl !== undefined) updateData.discordUrl = data.discordUrl;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isForeverMint !== undefined) updateData.isForeverMint = data.isForeverMint;
    if (data.event_type !== undefined) updateData.event_type = data.event_type;
    if (data.host !== undefined) updateData.host = data.host;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.location_type !== undefined) updateData.location_type = data.location_type;
    if (data.prizes !== undefined) updateData.prizes = data.prizes;
    if (data.custom_links !== undefined) updateData.custom_links = data.custom_links;

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Delete related records first
    await prisma.$transaction([
      prisma.nftVote.deleteMany({ where: { eventId: id } }),
      prisma.vote.deleteMany({ where: { eventId: id } }),
      prisma.share.deleteMany({ where: { eventId: id } }),
      prisma.mintPhase.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
