import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — admin: list all ecosystem projects (including unapproved)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "pending" | "approved" | null

    const where: any = {};
    if (status === "pending") where.isApproved = false;
    if (status === "approved") where.isApproved = true;

    const projects = await prisma.ecosystemProject.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: {
          select: { walletAddress: true, alias: true },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Admin: failed to fetch ecosystem projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
