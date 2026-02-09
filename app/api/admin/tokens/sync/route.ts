import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for long sync

// Eta Finance API for all tokens
const ETA_TOKENS_API = "https://api.eta.finance/v1/tokens";

interface EtaToken {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  icon?: string;
  providers?: string[];
}

/**
 * POST /api/admin/tokens/sync - Sync all tokens from Eta Finance API
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

    console.log("[Token Sync] Starting sync from Eta Finance API...");

    // Fetch all tokens from Eta Finance
    const response = await fetch(ETA_TOKENS_API);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tokens from Eta Finance API" },
        { status: 500 }
      );
    }

    const allTokens: EtaToken[] = await response.json();
    console.log(`[Token Sync] Fetched ${allTokens.length} tokens from API`);

    // Filter tokens with valid address (exclude HBAR which has empty address)
    const validTokens = allTokens.filter(
      (t) => t.address && t.address.length > 0 && t.symbol && t.name
    );
    console.log(`[Token Sync] ${validTokens.length} tokens have valid addresses`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches to avoid timeout
    const BATCH_SIZE = 100;
    for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
      const batch = validTokens.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (token) => {
        try {
          // Clean symbol and name (remove weird characters)
          const cleanSymbol = token.symbol.trim().slice(0, 20);
          const cleanName = token.name.trim().slice(0, 100);

          // Skip tokens with empty or weird symbols
          if (!cleanSymbol || cleanSymbol.length === 0) {
            skipped++;
            return;
          }

          const existing = await prisma.token.findUnique({
            where: { tokenAddress: token.address },
          });

          if (existing) {
            // Update existing token
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
            // Create new token
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
        } catch (error) {
          console.error(`[Token Sync] Error with ${token.symbol}:`, error);
          errors++;
        }
      });

      await Promise.all(promises);
      console.log(`[Token Sync] Processed batch ${i / BATCH_SIZE + 1}/${Math.ceil(validTokens.length / BATCH_SIZE)}`);
    }

    const totalInDb = await prisma.token.count();

    console.log(`[Token Sync] Complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${created + updated} tokens`,
      stats: {
        totalFromApi: allTokens.length,
        validTokens: validTokens.length,
        created,
        updated,
        skipped,
        errors,
        totalInDb,
      },
    });
  } catch (error) {
    console.error("[Token Sync] Failed:", error);
    return NextResponse.json(
      { error: "Failed to sync tokens" },
      { status: 500 }
    );
  }
}
