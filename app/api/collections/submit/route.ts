import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchTokenFromMirrorNode } from "@/lib/sentx";
import { hasElSantuario } from "@/lib/hedera";

/**
 * POST /api/collections/submit - Submit a collection for approval
 * Anyone can submit, but El Santuario holders get auto-approval
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please connect your wallet to submit a collection" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 }
      );
    }

    // Validate tokenId format (0.0.xxxxx)
    if (!/^0\.0\.\d+$/.test(tokenId)) {
      return NextResponse.json(
        { error: "Invalid Token ID format. Expected: 0.0.xxxxx" },
        { status: 400 }
      );
    }

    // Check if collection already exists
    const existing = await prisma.collection.findUnique({
      where: { tokenAddress: tokenId },
    });

    if (existing) {
      if (existing.isApproved) {
        return NextResponse.json(
          { error: "This collection is already in the list" },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: "This collection is already pending approval" },
          { status: 409 }
        );
      }
    }

    // Fetch token info from Hedera Mirror Node
    const hederaInfo = await fetchTokenFromMirrorNode(tokenId);

    if (!hederaInfo) {
      return NextResponse.json(
        { error: "Token not found on Hedera network" },
        { status: 404 }
      );
    }

    // Check if it's an NFT
    if (hederaInfo.type !== "NON_FUNGIBLE_UNIQUE") {
      return NextResponse.json(
        { error: "This token is not an NFT collection" },
        { status: 400 }
      );
    }

    // Check if user has El Santuario for auto-approval
    const userHasSantuario = await hasElSantuario(user.walletAddress);
    const autoApproved = userHasSantuario || user.isAdmin;

    // Create collection
    const collection = await prisma.collection.create({
      data: {
        tokenAddress: tokenId,
        name: hederaInfo.name || tokenId,
        description: null,
        image: null,
        slug: tokenId,
        floor: 0,
        volume: 0,
        owners: 0,
        supply: parseInt(hederaInfo.total_supply) || 0,
        source: "SENTX",
        isApproved: autoApproved,
        submittedBy: user.walletAddress,
      },
    });

    return NextResponse.json({
      success: true,
      autoApproved,
      collection: {
        id: collection.id,
        name: collection.name,
        tokenAddress: collection.tokenAddress,
        isApproved: collection.isApproved,
      },
      message: autoApproved
        ? `Collection "${collection.name}" has been added!`
        : `Collection "${collection.name}" submitted for admin approval`,
    });
  } catch (error) {
    console.error("Submit collection error:", error);
    return NextResponse.json(
      { error: "Failed to submit collection" },
      { status: 500 }
    );
  }
}
