import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { updateEventSchema, meetupFieldsSchema, validateRequest } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { walletAddress: true },
        },
        phases: {
          orderBy: { order: "asc" },
        },
        votes: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has voted and calculate cooldown
    let userVote: "UP" | "DOWN" | null = null;
    let voteLockedUntil: string | null = null;
    let canVote = true;
    let canEdit = false;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    let authPayload: { userId: string; isAdmin?: boolean } | null = null;

    if (token) {
      authPayload = await verifyToken(token);
    }

    // IDOR protection: unapproved events only visible to creator/admin
    if (!event.isApproved) {
      const hasAccess = authPayload && (
        event.createdById === authPayload.userId || !!authPayload.isAdmin
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
    }

    if (authPayload) {
      canEdit = event.createdById === authPayload.userId || !!authPayload.isAdmin;

      const existingVote = event.votes.find(
        (v) => v.userId === authPayload!.userId
      );
      if (existingVote) {
        userVote = existingVote.voteType;

        // Forever Mints: no cooldown, can always change vote (like collections)
        if (event.isForeverMint) {
          canVote = true;
          voteLockedUntil = null;
        } else {
          // Regular events: Check 24h cooldown
          const hoursSinceVote =
            (Date.now() - existingVote.createdAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceVote < 24) {
            canVote = false;
            const unlockTime = new Date(existingVote.createdAt.getTime() + 24 * 60 * 60 * 1000);
            voteLockedUntil = unlockTime.toISOString();
          }
        }
      }
    }

    // Remove internal fields from response
    const { votes, createdById, isApproved, ...eventData } = event;

    // Get adjacent events for prev/next navigation
    let prevEvent = null;
    let nextEvent = null;

    if (event.mintDate) {
      [prevEvent, nextEvent] = await Promise.all([
        prisma.event.findFirst({
          where: {
            isApproved: true,
            mintDate: { lt: event.mintDate },
          },
          orderBy: { mintDate: "desc" },
          select: { id: true, title: true, mintDate: true },
        }),
        prisma.event.findFirst({
          where: {
            isApproved: true,
            mintDate: { gt: event.mintDate },
          },
          orderBy: { mintDate: "asc" },
          select: { id: true, title: true, mintDate: true },
        }),
      ]);
    }

    return NextResponse.json({
      ...eventData,
      userVote,
      canVote,
      voteLockedUntil,
      ...(canEdit ? { canEdit: true } : {}),
      prevEvent,
      nextEvent,
    });
  } catch (error) {
    console.error("Failed to get event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.createdById !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Not authorized to edit this event" }, { status: 403 });
    }

    const body = await request.json();

    // Validate core fields with Zod (all optional via .partial())
    const validation = validateRequest(updateEventSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;
    const updateData: Record<string, any> = {};

    // Core fields
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.mintDate !== undefined) updateData.mintDate = new Date(data.mintDate);
    if (data.mintPrice !== undefined) updateData.mintPrice = data.mintPrice;
    if (data.supply !== undefined) updateData.supply = typeof data.supply === "number" ? data.supply : null;
    if (data.category !== undefined) updateData.category = data.category || null;

    // Trim URLs to prevent whitespace issues
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl?.trim() || null;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl?.trim() || null;
    if (data.twitterUrl !== undefined) updateData.twitterUrl = data.twitterUrl?.trim() || null;
    if (data.discordUrl !== undefined) updateData.discordUrl = data.discordUrl?.trim() || null;

    // End date
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    // Meetup/hackathon-specific fields
    if (event.event_type === "ECOSYSTEM_MEETUP" || event.event_type === "HACKATHON") {
      const meetupValidation = meetupFieldsSchema.partial().safeParse(body);
      if (meetupValidation.success) {
        const m = meetupValidation.data;
        if (m.host !== undefined) updateData.host = m.host || null;
        if (m.language !== undefined) updateData.language = m.language || null;
        if (m.locationType !== undefined) updateData.location_type = m.locationType || "ONLINE";
        if (m.location !== undefined) updateData.location = m.location || null;
        if (m.customLinks !== undefined) updateData.custom_links = m.customLinks || null;
      }
      if (body.prizes !== undefined) {
        updateData.prizes = String(body.prizes).slice(0, 500);
      }
    }

    // Transaction: update event + replace phases if provided
    await prisma.$transaction(async (tx) => {
      if (data.phases && event.event_type === "MINT_EVENT") {
        await tx.mintPhase.deleteMany({ where: { eventId: id } });
        for (const phase of data.phases) {
          await tx.mintPhase.create({
            data: {
              eventId: id,
              name: phase.name,
              startDate: new Date(phase.startDate),
              endDate: phase.endDate ? new Date(phase.endDate) : null,
              price: phase.price,
              supply: phase.supply ?? null,
              maxPerWallet: phase.maxPerWallet ?? null,
              isWhitelist: phase.isWhitelist,
              order: phase.order,
            },
          });
        }
      }

      await tx.event.update({
        where: { id },
        data: updateData,
      });
    });

    const updatedEvent = await prisma.event.findUnique({
      where: { id },
      include: { phases: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ event: updatedEvent, message: "Event updated successfully" });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}
