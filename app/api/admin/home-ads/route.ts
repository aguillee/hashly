import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHomeAdSchema } from "@/lib/validations";

// GET /api/admin/home-ads - List all ads for admin
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const ads = await prisma.homeAd.findMany({
      orderBy: { order: "asc" },
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

    return NextResponse.json({ ads });
  } catch (error) {
    console.error("Failed to fetch home ads:", error);
    return NextResponse.json({ error: "Failed to fetch home ads" }, { status: 500 });
  }
}

// POST /api/admin/home-ads - Create new ad
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createHomeAdSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Auto-assign order to end
    const maxOrder = await prisma.homeAd.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const ad = await prisma.homeAd.create({
      data: {
        type: data.type,
        eventId: data.eventId || null,
        imageUrl: data.imageUrl || null,
        linkUrl: data.linkUrl || null,
        title: data.title || null,
        duration: data.duration,
        order: nextOrder,
        isActive: data.isActive,
      },
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

    return NextResponse.json({ ad }, { status: 201 });
  } catch (error) {
    console.error("Failed to create home ad:", error);
    return NextResponse.json({ error: "Failed to create home ad" }, { status: 500 });
  }
}
