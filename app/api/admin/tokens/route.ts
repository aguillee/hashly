import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Eta Finance API for token info
const ETA_TOKENS_API = "https://api.eta.finance/v1/tokens";

interface EtaToken {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  icon?: string;
}

/**
 * POST /api/admin/tokens - Add a token manually by tokenId
 * Fetches data from Eta Finance API
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId || typeof tokenId !== "string") {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    const tokenAddress = tokenId.trim();

    // Validate token ID format (0.0.xxxxx)
    if (!/^0\.0\.\d+$/.test(tokenAddress)) {
      return NextResponse.json(
        { error: "Invalid token ID format" },
        { status: 400 }
      );
    }

    // Check if token already exists
    const existing = await prisma.token.findUnique({
      where: { tokenAddress },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Token already exists", token: existing },
        { status: 409 }
      );
    }

    // Try to fetch token info from Eta Finance API first
    let tokenInfo: { symbol: string; name: string; icon: string | null; decimals: number } | null = null;

    try {
      const response = await fetch(ETA_TOKENS_API);
      if (response.ok) {
        const tokens: EtaToken[] = await response.json();
        const found = tokens.find(t => t.address === tokenAddress);
        if (found) {
          tokenInfo = {
            symbol: found.symbol,
            name: found.name,
            icon: found.icon || null,
            decimals: found.decimals,
          };
        }
      }
    } catch (error) {
      console.error("Eta Finance API error:", error);
    }

    // Fallback: Fetch from Hedera Mirror Node if not found in Eta Finance
    if (!tokenInfo) {
      try {
        const mirrorResponse = await fetch(
          `https://mainnet.mirrornode.hedera.com/api/v1/tokens/${tokenAddress}`
        );

        if (!mirrorResponse.ok) {
          return NextResponse.json(
            { error: "Token not found. Please verify the Token ID is correct." },
            { status: 404 }
          );
        }

        const mirrorData = await mirrorResponse.json();

        tokenInfo = {
          symbol: mirrorData.symbol || "UNKNOWN",
          name: mirrorData.name || mirrorData.symbol || "Unknown Token",
          icon: null, // Mirror Node doesn't have icons
          decimals: parseInt(mirrorData.decimals) || 8,
        };
      } catch (error) {
        console.error("Mirror Node API error:", error);
        return NextResponse.json(
          { error: "Failed to fetch token info from Hedera Mirror Node" },
          { status: 500 }
        );
      }
    }

    // Create token
    const token = await prisma.token.create({
      data: {
        tokenAddress,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        icon: tokenInfo.icon,
        decimals: tokenInfo.decimals,
        isApproved: true, // Auto-approve when admin adds
      },
    });

    return NextResponse.json({
      success: true,
      token,
      message: `Token "${token.symbol}" added successfully`,
    });
  } catch (error) {
    console.error("Add token error:", error);
    return NextResponse.json(
      { error: "Failed to add token" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/tokens - Get all tokens with admin info
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100));
    // Limit search to 100 chars to prevent ReDoS attacks, trim and check for empty
    const rawSearch = searchParams.get("search");
    const search = rawSearch && rawSearch.trim().length > 0 ? rawSearch.slice(0, 100).trim() : null;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { symbol: { contains: search, mode: "insensitive" as const } },
            { tokenAddress: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Get tokens with pagination
    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          tokenAddress: true,
          symbol: true,
          name: true,
          icon: true,
          totalVotes: true,
          isApproved: true,
          isHidden: true,
          createdAt: true,
        },
      }),
      prisma.token.count({ where }),
    ]);

    return NextResponse.json({
      tokens,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin tokens error:", error);
    return NextResponse.json(
      { error: "Failed to get tokens" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tokens - Delete a specific token
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const tokenAddress = searchParams.get("tokenId");

    if (!id && !tokenAddress) {
      return NextResponse.json(
        { error: "id or tokenId is required" },
        { status: 400 }
      );
    }

    // Find token
    const token = await prisma.token.findFirst({
      where: id ? { id } : { tokenAddress: tokenAddress! },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Delete votes first
    await prisma.tokenVote.deleteMany({
      where: { tokenId: token.id },
    });

    // Delete token
    await prisma.token.delete({
      where: { id: token.id },
    });

    return NextResponse.json({
      success: true,
      message: `Token "${token.symbol}" deleted`,
    });
  } catch (error) {
    console.error("Delete token error:", error);
    return NextResponse.json(
      { error: "Failed to delete token" },
      { status: 500 }
    );
  }
}
