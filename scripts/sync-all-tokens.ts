import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ETA_TOKENS_API = "https://api.eta.finance/v1/tokens";

interface EtaToken {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  icon?: string;
  providers?: string[];
}

async function main() {
  console.log("Fetching all tokens from Eta Finance API...");

  const response = await fetch(ETA_TOKENS_API);
  if (!response.ok) {
    throw new Error("Failed to fetch tokens");
  }

  const allTokens: EtaToken[] = await response.json();
  console.log(`Fetched ${allTokens.length} tokens from API`);

  // Filter tokens with valid address
  const validTokens = allTokens.filter(
    (t) => t.address && t.address.length > 0 && t.symbol && t.name
  );
  console.log(`${validTokens.length} tokens have valid addresses`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Process tokens
  for (let i = 0; i < validTokens.length; i++) {
    const token = validTokens[i];

    try {
      // Clean symbol and name
      const cleanSymbol = token.symbol.trim().slice(0, 30);
      const cleanName = token.name.trim().slice(0, 100);

      // Skip tokens with empty or weird symbols
      if (!cleanSymbol || cleanSymbol.length === 0) {
        skipped++;
        continue;
      }

      const existing = await prisma.token.findUnique({
        where: { tokenAddress: token.address },
      });

      if (existing) {
        await prisma.token.update({
          where: { tokenAddress: token.address },
          data: {
            symbol: cleanSymbol,
            name: cleanName,
            icon: token.icon || existing.icon,
            decimals: token.decimals,
          },
        });
        updated++;
      } else {
        await prisma.token.create({
          data: {
            tokenAddress: token.address,
            symbol: cleanSymbol,
            name: cleanName,
            icon: token.icon || null,
            decimals: token.decimals,
            isApproved: true,
            isHidden: false,
            totalVotes: 0,
          },
        });
        created++;
      }

      // Progress log every 100 tokens
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${validTokens.length}`);
      }
    } catch (error) {
      // console.error(`Error with ${token.symbol}:`, error);
      errors++;
    }
  }

  const totalInDb = await prisma.token.count();

  console.log("\n=== SYNC COMPLETE ===");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in DB: ${totalInDb}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
