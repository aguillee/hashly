import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// PATCH /api/admin/host-requests/[id] - Approve or reject host request
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
    const { status, rejectedReason } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    // Get the host request
    const hostRequest = await prisma.hostRequest.findUnique({
      where: { id },
    });

    if (!hostRequest) {
      return NextResponse.json(
        { error: "Host request not found" },
        { status: 404 }
      );
    }

    if (hostRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been reviewed" },
        { status: 400 }
      );
    }

    // If approving, check no other approved host for this event
    if (status === "APPROVED") {
      const existingApproved = await prisma.hostRequest.findFirst({
        where: {
          eventId: hostRequest.eventId,
          status: "APPROVED",
        },
      });

      if (existingApproved) {
        return NextResponse.json(
          { error: "This event already has an approved host" },
          { status: 400 }
        );
      }
    }

    // Update the request
    const updated = await prisma.hostRequest.update({
      where: { id },
      data: {
        status,
        rejectedReason: status === "REJECTED" ? rejectedReason?.slice(0, 500) : null,
        reviewedAt: new Date(),
        reviewedBy: user.walletAddress,
      },
    });

    // If approved, create AttendanceBadge draft
    if (status === "APPROVED") {
      const event = await prisma.event.findUnique({
        where: { id: hostRequest.eventId },
        select: { title: true },
      });

      await prisma.attendanceBadge.create({
        data: {
          eventId: hostRequest.eventId,
          hostWallet: hostRequest.walletAddress,
          name: `${event?.title || "Event"} Attendance Badge`,
          status: "DRAFT",
        },
      });
    }

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    console.error("Failed to update host request:", error);
    return NextResponse.json(
      { error: "Failed to update host request" },
      { status: 500 }
    );
  }
}
