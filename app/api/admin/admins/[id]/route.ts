import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// DELETE /api/admin/admins/[id] - Remove admin privileges
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

    // Validate ID format (CUID)
    if (!id || !/^c[a-z0-9]{24}$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid admin ID format" },
        { status: 400 }
      );
    }

    // Prevent removing yourself
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    // Use transaction to prevent race condition (TOCTOU vulnerability)
    // Check count and update atomically
    try {
      await prisma.$transaction(async (tx) => {
        // Check how many admins exist within transaction
        const adminCount = await tx.user.count({
          where: { isAdmin: true },
        });

        if (adminCount <= 1) {
          throw new Error("Cannot remove the last admin");
        }

        // Remove admin privileges (don't delete the user)
        await tx.user.update({
          where: { id },
          data: { isAdmin: false },
        });
      });

      return NextResponse.json({ success: true });
    } catch (txError) {
      const errorMessage = txError instanceof Error ? txError.message : "Transaction failed";
      if (errorMessage === "Cannot remove the last admin") {
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }
      throw txError;
    }
  } catch (error) {
    console.error("Failed to remove admin:", error);
    return NextResponse.json(
      { error: "Failed to remove admin" },
      { status: 500 }
    );
  }
}
