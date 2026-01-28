import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/admin/admins/[id] - Remove admin privileges
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent removing yourself
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    // Check how many admins exist
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 400 }
      );
    }

    // Remove admin privileges (don't delete the user)
    await prisma.user.update({
      where: { id },
      data: { isAdmin: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove admin:", error);
    return NextResponse.json(
      { error: "Failed to remove admin" },
      { status: 500 }
    );
  }
}
