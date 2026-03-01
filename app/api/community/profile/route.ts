import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  createCommunityProfileSchema,
  updateCommunityProfileSchema,
  validateRequest,
} from "@/lib/validations";

export const dynamic = "force-dynamic";

// GET /api/community/profile - Get current user's community profile
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.communityProfile.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to fetch community profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// POST /api/community/profile - Create community profile (join the globe)
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if profile already exists
    const existing = await prisma.communityProfile.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have a community profile. Use PUT to update." },
        { status: 409 }
      );
    }

    const body = await request.json();
    // Sanitize X handle before validation
    if (body.twitterHandle && typeof body.twitterHandle === "string") {
      body.twitterHandle = body.twitterHandle
        .replace(/^@/, "")
        .replace(/https?:\/\/(www\.)?(twitter\.com|x\.com)\/?/gi, "")
        .replace(/\s/g, "")
        .replace(/^\//, "");
    }
    const validation = validateRequest(createCommunityProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const profile = await prisma.communityProfile.create({
      data: {
        userId: user.id,
        displayName: validation.data.displayName,
        countryCode: validation.data.countryCode,
        type: validation.data.type,
        twitterHandle: validation.data.twitterHandle,
        bio: validation.data.bio || null,
        avatarUrl: body.avatarUrl || null,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Failed to create community profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}

// PUT /api/community/profile - Update community profile
export async function PUT(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.communityProfile.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "No community profile found. Use POST to create one." },
        { status: 404 }
      );
    }

    const body = await request.json();
    // Sanitize X handle before validation
    if (body.twitterHandle && typeof body.twitterHandle === "string") {
      body.twitterHandle = body.twitterHandle
        .replace(/^@/, "")
        .replace(/https?:\/\/(www\.)?(twitter\.com|x\.com)\/?/gi, "")
        .replace(/\s/g, "")
        .replace(/^\//, "");
    }
    const validation = validateRequest(updateCommunityProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const profile = await prisma.communityProfile.update({
      where: { userId: user.id },
      data: {
        ...(validation.data.displayName !== undefined && { displayName: validation.data.displayName }),
        ...(validation.data.countryCode !== undefined && { countryCode: validation.data.countryCode }),
        ...(validation.data.type !== undefined && { type: validation.data.type }),
        ...(validation.data.twitterHandle !== undefined && { twitterHandle: validation.data.twitterHandle }),
        ...(validation.data.bio !== undefined && { bio: validation.data.bio || null }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl || null }),
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to update community profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/community/profile - Remove from globe (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.communityProfile.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "No community profile found" },
        { status: 404 }
      );
    }

    await prisma.communityProfile.delete({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete community profile:", error);
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}
