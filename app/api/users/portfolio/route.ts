import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";

const MIRROR_NODE = "https://mainnet.mirrornode.hedera.com";
const SAUCERSWAP_API = "https://api.saucerswap.finance";
const SAUCERSWAP_KEY = process.env.SAUCERSWAP_API_KEY || "";

export const dynamic = "force-dynamic";

// Cache SaucerSwap prices for 5 min
let priceCache: {
  data: Record<string, { priceUsd: number; icon: string }>;
  hbarPrice: number;
  ts: number;
} | null = null;

async function getTokenPrices(): Promise<{
  prices: Record<string, { priceUsd: number; icon: string }>;
  hbarPrice: number;
}> {
  if (priceCache && Date.now() - priceCache.ts < 5 * 60 * 1000) {
    return { prices: priceCache.data, hbarPrice: priceCache.hbarPrice };
  }

  let hbarPrice = 0;
  const map: Record<string, { priceUsd: number; icon: string }> = {};

  try {
    const headers: Record<string, string> = {};
    if (SAUCERSWAP_KEY) headers["x-api-key"] = SAUCERSWAP_KEY;

    const res = await fetch(`${SAUCERSWAP_API}/tokens`, {
      cache: "no-store",
      headers,
    });

    if (res.ok) {
      const tokens = await res.json();
      if (Array.isArray(tokens)) {
        for (const t of tokens) {
          if (!t.id) continue;
          const price = typeof t.priceUsd === "number" ? t.priceUsd : parseFloat(t.priceUsd) || 0;
          map[t.id] = { priceUsd: price, icon: t.icon || "" };

          // HBAR price from WHBAR tokens
          if ((t.symbol === "HBAR" || t.symbol === "WHBAR") && price > 0 && hbarPrice === 0) {
            hbarPrice = price;
          }
        }
      }
    }
  } catch (e) {
    console.error("SaucerSwap price fetch error:", e);
  }

  // Fallback HBAR price from Mirror Node
  if (hbarPrice === 0) {
    try {
      const res = await fetch(`${MIRROR_NODE}/api/v1/network/exchangerate`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const rate = data.current_rate;
        if (rate?.hbar_equivalent > 0) {
          hbarPrice = rate.cent_equivalent / rate.hbar_equivalent / 100;
        }
      }
    } catch {}
  }

  priceCache = { data: map, hbarPrice, ts: Date.now() };
  return { prices: map, hbarPrice };
}

async function getNftImage(tokenId: string, serial: number): Promise<string | null> {
  try {
    const res = await fetch(`${MIRROR_NODE}/api/v1/tokens/${tokenId}/nfts/${serial}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.metadata) return null;

    const decoded = Buffer.from(data.metadata, "base64").toString();
    if (!decoded) return null;

    let metadataUrl = decoded;
    if (metadataUrl.startsWith("ipfs://")) {
      metadataUrl = metadataUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
    } else if (metadataUrl.startsWith("hcs://")) {
      return null;
    } else if (!metadataUrl.startsWith("http")) {
      metadataUrl = `https://ipfs.io/ipfs/${metadataUrl}`;
    }

    const metaRes = await fetch(metadataUrl, { signal: AbortSignal.timeout(5000) });
    if (!metaRes.ok) return null;
    const metadata = await metaRes.json();

    let imageUrl = metadata.image || metadata.thumbnail || null;
    if (imageUrl?.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return imageUrl;
  } catch {
    return null;
  }
}

async function fetchAllPages(initialUrl: string, key: string): Promise<any[]> {
  const results: any[] = [];
  let nextLink: string | null = initialUrl;
  while (nextLink) {
    const res: Response = await fetch(nextLink, { cache: "no-store" });
    if (!res.ok) break;
    const data: any = await res.json();
    results.push(...(data[key] || []));
    nextLink = data.links?.next ? `${MIRROR_NODE}${data.links.next}` : null;
  }
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const walletAddress = user.walletAddress;

    // Fetch everything in parallel
    const [accountRes, allTokens, allNfts, { prices, hbarPrice }] = await Promise.all([
      fetch(`${MIRROR_NODE}/api/v1/accounts/${walletAddress}`, { cache: "no-store" }),
      fetchAllPages(`${MIRROR_NODE}/api/v1/accounts/${walletAddress}/tokens?limit=100`, "tokens"),
      fetchAllPages(`${MIRROR_NODE}/api/v1/accounts/${walletAddress}/nfts?limit=100`, "nfts"),
      getTokenPrices(),
    ]);

    // HBAR balance
    let hbarBalance = 0;
    if (accountRes.ok) {
      const accountData = await accountRes.json();
      hbarBalance = (accountData.balance?.balance || 0) / 1e8;
    }
    const hbarValueUsd = hbarBalance * hbarPrice;

    // Parse fungible tokens
    const fungibleTokens: Array<{
      tokenId: string;
      name: string;
      symbol: string;
      balance: number;
      decimals: number;
      priceUsd: number;
      valueUsd: number;
      icon: string;
    }> = [];

    const tokensWithBalance = allTokens.filter((t: any) => t.balance > 0);

    // Fetch token info in batches
    const batchSize = 15;
    for (let i = 0; i < tokensWithBalance.length; i += batchSize) {
      const batch = tokensWithBalance.slice(i, i + batchSize);
      const infoResponses = await Promise.all(
        batch.map((t: any) =>
          fetch(`${MIRROR_NODE}/api/v1/tokens/${t.token_id}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
        )
      );

      for (let j = 0; j < batch.length; j++) {
        const info = infoResponses[j];
        if (info && info.type === "FUNGIBLE_COMMON") {
          const decimals = parseInt(info.decimals) || 0;
          const balance = batch[j].balance / Math.pow(10, decimals);
          const priceData = prices[batch[j].token_id];
          const priceUsd = priceData?.priceUsd || 0;
          const icon = priceData?.icon || "";

          fungibleTokens.push({
            tokenId: batch[j].token_id,
            name: info.name || "Unknown",
            symbol: info.symbol || "???",
            balance,
            decimals,
            priceUsd,
            valueUsd: balance * priceUsd,
            icon,
          });
        }
      }
    }

    // Sort by USD value descending
    fungibleTokens.sort((a, b) => b.valueUsd - a.valueUsd);

    const tokensValueUsd = fungibleTokens.reduce((sum, t) => sum + t.valueUsd, 0);

    // Parse NFT collections
    const nftCollections: Record<string, {
      tokenId: string;
      name: string;
      count: number;
      serials: number[];
      imageUrl: string | null;
    }> = {};

    for (const nft of allNfts) {
      const tid = nft.token_id;
      if (!nftCollections[tid]) {
        nftCollections[tid] = { tokenId: tid, name: "", count: 0, serials: [], imageUrl: null };
      }
      nftCollections[tid].count++;
      if (nftCollections[tid].serials.length < 20) {
        nftCollections[tid].serials.push(nft.serial_number);
      }
    }

    // Sort by count, fetch names + images for top collections
    const collectionIds = Object.keys(nftCollections).sort(
      (a, b) => nftCollections[b].count - nftCollections[a].count
    );

    const imageLimit = 15;
    const [nameResponses, imageResponses] = await Promise.all([
      Promise.all(
        collectionIds.map((tid) =>
          fetch(`${MIRROR_NODE}/api/v1/tokens/${tid}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
        )
      ),
      Promise.all(
        collectionIds.map((tid, idx) => {
          if (idx >= imageLimit) return Promise.resolve(null);
          const firstSerial = nftCollections[tid].serials[0];
          return firstSerial ? getNftImage(tid, firstSerial) : Promise.resolve(null);
        })
      ),
    ]);

    for (let i = 0; i < collectionIds.length; i++) {
      const cid = collectionIds[i];
      if (nameResponses[i]) {
        nftCollections[cid].name = nameResponses[i].name || "Unknown Collection";
      }
      nftCollections[cid].imageUrl = imageResponses[i];
    }

    const nftList = Object.values(nftCollections).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      hbar: { balance: hbarBalance, priceUsd: hbarPrice, valueUsd: hbarValueUsd },
      tokens: fungibleTokens,
      nfts: nftList,
      totalValueUsd: hbarValueUsd + tokensValueUsd,
      summary: {
        totalTokens: fungibleTokens.length,
        totalNftCollections: nftList.length,
        totalNfts: nftList.reduce((sum, c) => sum + c.count, 0),
      },
    });
  } catch (error) {
    console.error("Portfolio error:", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
