import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
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
  } catch (error) {
    console.error(`Failed to get market cap for ${tokenId}:`, error);
    return null;
  }
}

async function main() {
  console.log("Fetching tokens from SaucerSwap...");

  const response = await fetch(SAUCERSWAP_API, {
    headers: {
      "x-api-key": process.env.SAUCERSWAP_API_KEY || "",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch from SaucerSwap");
  }

  const saucerTokens: SaucerSwapToken[] = await response.json();

  console.log(`Found ${saucerTokens.length} tokens`);

  let created = 0;
  let updated = 0;

  for (const token of saucerTokens) {
    // Calculate market cap if we have price
    let marketCap: number | null = null;
    if (token.priceUsd && token.priceUsd > 0) {
      marketCap = await getMarketCap(token.id, token.priceUsd, token.decimals);
    }

    const existing = await prisma.token.findUnique({
      where: { tokenAddress: token.id },
    });

    if (existing) {
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
      const mcStr = marketCap ? `$${(marketCap / 1000000).toFixed(2)}M` : "N/A";
      console.log(`Updated: ${token.symbol} (MC: ${mcStr})`);
    } else {
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
          isApproved: true,
          isHidden: false,
        },
      });
      created++;
      const mcStr = marketCap ? `$${(marketCap / 1000000).toFixed(2)}M` : "N/A";
      console.log(`Created: ${token.symbol} (MC: ${mcStr})`);
    }
  }

  console.log(`\nSync complete! Created: ${created}, Updated: ${updated}, Total: ${saucerTokens.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
