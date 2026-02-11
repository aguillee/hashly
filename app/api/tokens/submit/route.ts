import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { tokenIdSchema, validateRequest } from "@/lib/validations";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Helper function to extract image from token metadata
async function getImageFromMetadata(metadata: string): Promise<string | null> {
  if (!metadata) return null;

  try {
    // Decode base64 metadata
    const decoded = Buffer.from(metadata, 'base64').toString('utf-8');

    // Check if it's an IPFS URL
    if (decoded.startsWith('ipfs://')) {
      const ipfsHash = decoded.replace('ipfs://', '');
      const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

      // Try to fetch the metadata JSON from IPFS
      const ipfsResponse = await fetch(ipfsGatewayUrl, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (ipfsResponse.ok) {
        const contentType = ipfsResponse.headers.get('content-type');

        // If it's an image directly, return the URL
        if (contentType?.startsWith('image/')) {
          return ipfsGatewayUrl;
        }

        // If it's JSON, try to extract image field
        if (contentType?.includes('json')) {
          const jsonData = await ipfsResponse.json();
          // Common image fields in token metadata
          const imageUrl = jsonData.image || jsonData.icon || jsonData.logo || jsonData.picture;
          if (imageUrl) {
            // Convert IPFS URL to gateway URL if needed
            if (imageUrl.startsWith('ipfs://')) {
              return `https://ipfs.io/ipfs/${imageUrl.replace('ipfs://', '')}`;
            }
            return imageUrl;
          }
        }
      }
    }

    // Check if decoded metadata is a direct HTTP URL
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return decoded;
    }

    // Try to parse as JSON directly (some tokens store JSON in metadata)
    try {
      const jsonData = JSON.parse(decoded);
      const imageUrl = jsonData.image || jsonData.icon || jsonData.logo || jsonData.picture;
      if (imageUrl) {
        if (imageUrl.startsWith('ipfs://')) {
          return `https://ipfs.io/ipfs/${imageUrl.replace('ipfs://', '')}`;
        }
        return imageUrl;
      }
    } catch {
      // Not JSON, continue
    }

    return null;
  } catch (error) {
    console.error('Error extracting image from metadata:', error);
    return null;
  }
}

const submitTokenSchema = z.object({
  tokenId: tokenIdSchema,
});

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

    // Validate input with Zod schema
    const validation = validateRequest(submitTokenSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const cleanTokenId = validation.data.tokenId;

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

    // Try to fetch token info from Eta Finance API first
    let tokenInfo: { symbol: string; name: string; icon: string | null; decimals: number } | null = null;

    try {
      const etaResponse = await fetch("https://api.eta.finance/v1/tokens");
      if (etaResponse.ok) {
        const etaData = await etaResponse.json();
        const found = etaData.find((t: { id: string }) => t.id === cleanTokenId);
        if (found) {
          tokenInfo = {
            symbol: found.symbol,
            name: found.name || found.symbol,
            icon: found.icon || null,
            decimals: found.decimals || 8,
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
          `https://mainnet.mirrornode.hedera.com/api/v1/tokens/${cleanTokenId}`
        );

        if (!mirrorResponse.ok) {
          return NextResponse.json(
            { error: "Token not found. Please verify the Token ID is correct." },
            { status: 404 }
          );
        }

        const mirrorData = await mirrorResponse.json();

        // Try to get image from metadata
        let icon: string | null = null;
        if (mirrorData.metadata) {
          icon = await getImageFromMetadata(mirrorData.metadata);
        }

        tokenInfo = {
          symbol: mirrorData.symbol || "UNKNOWN",
          name: mirrorData.name || mirrorData.symbol || "Unknown Token",
          icon: icon,
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
