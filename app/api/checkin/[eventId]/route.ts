import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCheckinCode } from "@/lib/checkin";
import { submitCheckinToHCS } from "@/lib/hcs-votes";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const checkinSchema = z.object({
  code: z.string().length(12),
});

// POST /api/checkin/[eventId] — Register check-in (requires authenticated session)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const rateLimitResponse = await checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { eventId } = await params;

    // Verify authenticated session — wallet ownership proven via WalletConnect signature
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please connect your wallet first" },
        { status: 401 }
      );
    }
    const walletAddress = user.walletAddress;

    const body = await request.json();
    const validation = checkinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // Validate the time-based code
    if (!validateCheckinCode(eventId, code)) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please scan the QR again." },
        { status: 403 }
      );
    }

    // Check event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, event_type: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if already checked in
    const existing = await prisma.eventCheckin.findUnique({
      where: {
        eventId_walletAddress: {
          eventId,
          walletAddress,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already checked in", checkedInAt: existing.createdAt },
        { status: 409 }
      );
    }

    // Submit to HCS (fire and forget pattern, but we wait for sequence number)
    let hcsMessageId: string | null = null;
    try {
      const hcsResult = await submitCheckinToHCS(
        walletAddress,
        eventId,
        event.title,
        event.event_type
      );
      if (hcsResult) {
        hcsMessageId = hcsResult.sequenceNumber.toString();
      }
    } catch (err) {
      console.error("HCS check-in submission failed:", err);
    }

    // Create check-in record
    const checkin = await prisma.eventCheckin.create({
      data: {
        eventId,
        walletAddress,
        hcsMessageId,
      },
    });

    return NextResponse.json({
      success: true,
      checkedInAt: checkin.createdAt,
      hcsMessageId,
      eventTitle: event.title,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
