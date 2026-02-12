import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// SaucerSwap API
const SAUCERSWAP_API = "https://api.saucerswap.finance/tokens";
const MIRROR_NODE_API = "https://mainnet.mirrornode.hedera.com/api/v1/tokens";

interface SaucerSwapToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string | null;
  website?: string | null;
  priceUsd?: number;
  dueDiligenceComplete?: boolean;
}

// Fetch total supply from Mirror Node and calculate market cap
async function getMarketCap(tokenId: string, priceUsd: number, decimals: number): Promise<number | null> {
  try {
    const response = await fetch(`${MIRROR_NODE_API}/${tokenId}`);
    if (!response.ok) return null;

    const data = await response.json();
    const totalSupply = parseInt(data.total_supply) || 0;

    // Convert from smallest unit to actual supply
    const actualSupply = totalSupply / Math.pow(10, decimals);
    const marketCap = actualSupply * priceUsd;

    return marketCap > 0 ? marketCap : null;
  } catch {
    return null;
  }
}

// POST /api/admin/tokens/sync - Sync tokens from SaucerSwap (admin only)
export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "admin");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Fetch all tokens from SaucerSwap
    const response = await fetch(SAUCERSWAP_API, {
      headers: {
        "x-api-key": process.env.SAUCERSWAP_API_KEY || "",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch from SaucerSwap" }, { status: 500 });
    }

    const saucerTokens: SaucerSwapToken[] = await response.json();

    // Filter only tokens with dueDiligenceComplete = true (verified tokens)
    const verifiedTokens = saucerTokens.filter(t => t.dueDiligenceComplete === true);

    let created = 0;
    let updated = 0;

    for (const token of verifiedTokens) {
      // Calculate market cap if we have price
      let marketCap: number | null = null;
      if (token.priceUsd && token.priceUsd > 0) {
        marketCap = await getMarketCap(token.id, token.priceUsd, token.decimals);
      }

      const existing = await prisma.token.findUnique({
        where: { tokenAddress: token.id },
      });

      if (existing) {
        // Update existing token with new info from SaucerSwap (icon, price, etc)
        await prisma.token.update({
          where: { tokenAddress: token.id },
          data: {
            symbol: token.symbol,
            name: token.name,
            icon: token.icon || existing.icon,
            website: token.website || existing.website,
            decimals: token.decimals,
            priceUsd: token.priceUsd || null,
            marketCap: marketCap,
          },
        });
        updated++;
      } else {
        // Create new token
        await prisma.token.create({
          data: {
            tokenAddress: token.id,
            symbol: token.symbol,
            name: token.name,
            icon: token.icon || null,
            website: token.website || null,
            decimals: token.decimals,
            priceUsd: token.priceUsd || null,
            marketCap: marketCap,
            isApproved: true, // Auto-approve verified SaucerSwap tokens
            isHidden: false,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${verifiedTokens.length} verified tokens from SaucerSwap (${created} new, ${updated} updated)`,
      stats: {
        created,
        updated,
        total: verifiedTokens.length,
      },
    });
  } catch (error) {
    console.error("Sync tokens error:", error);
    return NextResponse.json({ error: "Failed to sync tokens" }, { status: 500 });
  }
}
