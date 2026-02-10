import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT /api/users/alias - Update user alias
export async function PUT(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alias } = await request.json();

    // Validate alias
    if (alias !== null && alias !== undefined) {
      const trimmed = String(alias).trim();

      if (trimmed.length > 20) {
        return NextResponse.json(
          { error: "Alias must be 20 characters or less" },
          { status: 400 }
        );
      }

      if (trimmed.length > 0 && trimmed.length < 2) {
        return NextResponse.json(
          { error: "Alias must be at least 2 characters" },
          { status: 400 }
        );
      }

      if (trimmed.length > 0 && !/^[a-zA-Z0-9_.\- ]+$/.test(trimmed)) {
        return NextResponse.json(
          { error: "Alias can only contain letters, numbers, spaces, dots, hyphens and underscores" },
          { status: 400 }
        );
      }

      // Check if alias is already taken by another user
      if (trimmed.length > 0) {
        const existing = await prisma.user.findFirst({
          where: {
            alias: trimmed,
            NOT: { id: user.id },
          },
        });

        if (existing) {
          return NextResponse.json(
            { error: "This alias is already taken" },
            { status: 409 }
          );
        }
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { alias: trimmed.length > 0 ? trimmed : null },
      });

      return NextResponse.json({
        alias: updated.alias,
      });
    }

    return NextResponse.json({ error: "Alias is required" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update alias:", error);
    return NextResponse.json(
      { error: "Failed to update alias" },
      { status: 500 }
    );
  }
}
