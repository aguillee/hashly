import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/tokens/submit - Submit a new token
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, "auth");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId || typeof tokenId !== "string") {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 }
      );
    }

    // Clean up the token ID
    const cleanTokenId = tokenId.trim();

    // Check if token already exists
    const existingToken = await prisma.token.findUnique({
      where: { tokenAddress: cleanTokenId },
    });

    if (existingToken) {
      return NextResponse.json(
        { error: "Token already exists", token: existingToken },
        { status: 409 }
      );
    }

    // Fetch token info from Eta Finance API
    const etaResponse = await fetch("https://api.eta.finance/v1/tokens");
    if (!etaResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch token info from Eta Finance" },
        { status: 500 }
      );
    }

    const etaData = await etaResponse.json();
    const tokenInfo = etaData.find(
      (t: { id: string }) => t.id === cleanTokenId
    );

    if (!tokenInfo) {
      return NextResponse.json(
        { error: "Token not found in Eta Finance registry" },
        { status: 404 }
      );
    }

    // Check if user has El Santuario NFT for auto-approval
    const elSantuarioTokenId = "0.0.9954622";
    let hasElSantuario = false;

    try {
      const mirrorResponse = await fetch(
        `https://mainnet.mirrornode.hedera.com/api/v1/accounts/${user.walletAddress}/nfts?token.id=${elSantuarioTokenId}&limit=1`
      );
      if (mirrorResponse.ok) {
        const nftData = await mirrorResponse.json();
        hasElSantuario = nftData.nfts && nftData.nfts.length > 0;
      }
    } catch (error) {
      console.error("Error checking El Santuario NFT:", error);
    }

    // Create the token
    const token = await prisma.token.create({
      data: {
        tokenAddress: cleanTokenId,
        symbol: tokenInfo.symbol || "UNKNOWN",
        name: tokenInfo.name || tokenInfo.symbol || "Unknown Token",
        icon: tokenInfo.icon || null,
        decimals: tokenInfo.decimals || 8,
        isApproved: hasElSantuario || user.isAdmin,
        isHidden: false,
      },
    });

    return NextResponse.json({
      success: true,
      token,
      autoApproved: hasElSantuario || user.isAdmin,
      message: hasElSantuario || user.isAdmin
        ? "Token added successfully"
        : "Token submitted for admin approval",
    });
  } catch (error) {
    console.error("Submit token error:", error);
    return NextResponse.json(
      { error: "Failed to submit token" },
      { status: 500 }
    );
  }
}
