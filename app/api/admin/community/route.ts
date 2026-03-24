import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/community - List all community profiles (admin only)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Build where clause based on status filter
    const where: Record<string, unknown> = {};
    if (status === "pending") {
      where.isApproved = false;
      where.type = { not: "PROJECT" as const };
    } else if (status === "approved") {
      where.isApproved = true;
    }

    const profiles = await prisma.communityProfile.findMany({
      where,
      include: {
        user: {
          select: {
            walletAddress: true,
            alias: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ profiles, total: profiles.length });
  } catch (error) {
    console.error("Admin: failed to fetch community profiles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
