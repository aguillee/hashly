import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { addAdminSchema, validateRequest } from "@/lib/validations";

// GET /api/admin/admins - Get all admin users
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(request, "admin");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        walletAddress: true,
        createdAt: true,
        points: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Failed to fetch admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}

// POST /api/admin/admins - Add new admin
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(request, "admin");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(addAdminSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { walletAddress } = validation.data;

    // Check if user exists
    let targetUser = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (targetUser) {
      // Check if already admin
      if (targetUser.isAdmin) {
        return NextResponse.json(
          { error: "This wallet is already an admin" },
          { status: 400 }
        );
      }
      // Update existing user to admin
      targetUser = await prisma.user.update({
        where: { walletAddress },
        data: { isAdmin: true },
      });
    } else {
      // Create new admin user
      targetUser = await prisma.user.create({
        data: {
          walletAddress,
          isAdmin: true,
        },
      });
    }

    console.log("Admin added successfully:", targetUser.walletAddress);

    return NextResponse.json({
      admin: {
        id: targetUser.id,
        walletAddress: targetUser.walletAddress,
        createdAt: targetUser.createdAt,
        points: targetUser.points,
      },
    });
  } catch (error) {
    console.error("Failed to add admin:", error);
    return NextResponse.json(
      { error: "Failed to add admin" },
      { status: 500 }
    );
  }
}
