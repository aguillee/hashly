import { NextRequest, NextResponse } from "next/server";

const MIRROR = "https://mainnet.mirrornode.hedera.com";

interface NftMetadata {
  serial: number;
  attributes: { trait_type: string; value: string }[];
  name?: string;
  image?: string;
}

/**
 * Fetch all NFT serials + metadata for a collection.
 * Paginates through Mirror Node, then resolves each metadata CID.
 */
async function fetchAllNfts(tokenId: string): Promise<NftMetadata[]> {
  const serials: { serial: number; metadataRaw: string }[] = [];
  let next: string | null = `${MIRROR}/api/v1/tokens/${tokenId}/nfts?limit=100&order=asc`;

  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`Mirror Node error: ${res.status}`);
    const data = await res.json();
    for (const nft of data.nfts || []) {
      // Skip burned/deleted NFTs
      if (nft.deleted || nft.account_id === "0.0.0" || !nft.account_id) continue;
      const metaB64 = nft.metadata || "";
      serials.push({ serial: nft.serial_number, metadataRaw: metaB64 });
    }
    next = data.links?.next ? `${MIRROR}${data.links.next}` : null;
  }

  // Resolve metadata in batches of 50
  const results: NftMetadata[] = [];
  const BATCH = 50;

  for (let i = 0; i < serials.length; i += BATCH) {
    const batch = serials.slice(i, i + BATCH);
    const resolved = await Promise.allSettled(
      batch.map(async ({ serial, metadataRaw }) => {
        const uri = decodeMetadataUri(metadataRaw);
        if (!uri) return { serial, attributes: [] };
        const meta = await fetchMetadataJson(uri);
        let image = (meta?.image as string) || null;
        // Resolve protocol URIs to https
        if (image) {
          if (image.startsWith("ipfs://")) image = `https://cloudflare-ipfs.com/ipfs/${image.replace("ipfs://", "")}`;
          else if (image.startsWith("ar://")) image = `https://arweave.developerdao.com/${image.replace("ar://", "")}`;
        }
        return {
          serial,
          attributes: (meta?.attributes as Array<{trait_type: string; value: string}>) || [],
          name: (meta?.name as string) || `#${serial}`,
          image,
        };
      })
    );
    for (const r of resolved) {
      if (r.status === "fulfilled") results.push(r.value as NftMetadata);
    }
  }

  const noImage = results.filter((r) => !r.image).length;
  const noTraits = results.filter((r) => r.attributes.length === 0).length;
  console.log(`[rarity] Resolved ${results.length} NFTs. No image: ${noImage}, No traits: ${noTraits}`);

  return results;
}

function decodeMetadataUri(base64: string): string | null {
  if (!base64) return null;
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf-8").trim();
    // Could be ipfs://, https://, ar://, or hcs://
    if (decoded.startsWith("ipfs://")) {
      return `https://cloudflare-ipfs.com/ipfs/${decoded.replace("ipfs://", "")}`;
    }
    if (decoded.startsWith("ar://")) {
      return `https://arweave.developerdao.com/${decoded.replace("ar://", "")}`;
    }
    if (decoded.startsWith("hcs://")) {
      // HCS metadata — resolve via Kabila/hashinals
      const parts = decoded.replace("hcs://", "").split("/");
      const topicId = parts[0];
      return `https://kiloscribe.com/api/inscription-cdn/${topicId}?network=mainnet`;
    }
    if (decoded.startsWith("http")) return decoded;
    // Try as raw IPFS CID (starts with Qm or bafy)
    if (decoded.match(/^(Qm[a-zA-Z0-9]{44}|bafy[a-zA-Z0-9]+)/)) {
      return `https://cloudflare-ipfs.com/ipfs/${decoded}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchMetadataJson(uri: string): Promise<Record<string, unknown> | null> {
  // Try primary URI
  try {
    const res = await fetch(uri, { signal: AbortSignal.timeout(15000) });
    if (res.ok) return await res.json();
  } catch { /* fallthrough */ }

  // Fallback: try alternative IPFS gateway
  if (uri.includes("ipfs.io/ipfs/")) {
    try {
      const cid = uri.split("ipfs.io/ipfs/")[1];
      const fallback = `https://cloudflare-ipfs.com/ipfs/${cid}`;
      const res = await fetch(fallback, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
    } catch { /* fallthrough */ }
  }

  // Fallback: try arweave.net for irys gateway
  if (uri.includes("arweave.developerdao.com/")) {
    try {
      const txId = uri.split("arweave.developerdao.com/")[1];
      const fallback = `https://arweave.net/${txId}`;
      const res = await fetch(fallback, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
    } catch { /* fallthrough */ }
  }

  return null;
}

/**
 * Calculate rarity for each NFT.
 *
 * For each trait_type, we count how many NFTs have each value.
 * Rarity score for a trait = (1 - count/total) * 100
 * Lower count = higher rarity %.
 *
 * Trait weights: all equal by default, but can be overridden via query params.
 */
function calculateRarity(
  nfts: NftMetadata[],
  traitWeights: Record<string, number>
) {
  const total = nfts.length;
  if (total === 0) return { ranked: [], traitStats: {} };

  // 1. Count occurrences of each trait_type:value
  const traitCounts: Record<string, Record<string, number>> = {};
  // Also track which NFTs are missing a trait_type
  const allTraitTypes = new Set<string>();

  for (const nft of nfts) {
    for (const attr of nft.attributes) {
      allTraitTypes.add(attr.trait_type);
      if (!traitCounts[attr.trait_type]) traitCounts[attr.trait_type] = {};
      const key = String(attr.value);
      traitCounts[attr.trait_type][key] = (traitCounts[attr.trait_type][key] || 0) + 1;
    }
  }

  // 2. Build weights (default = 1 for all)
  const weights: Record<string, number> = {};
  for (const traitType of allTraitTypes) {
    weights[traitType] = traitWeights[traitType] ?? 1;
  }
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0) || 1;

  // 3. Score each NFT
  const scored = nfts.map((nft) => {
    let score = 0;
    const traitDetails: { trait_type: string; value: string; rarity: number; count: number }[] = [];

    for (const traitType of allTraitTypes) {
      const attr = nft.attributes.find((a) => a.trait_type === traitType);
      const value = attr ? String(attr.value) : "__none__";
      const count = attr ? (traitCounts[traitType][value] || 0) : 0;

      // Rarity = how rare is this value? (1 - frequency) * 100
      const frequency = count / total;
      const rarity = (1 - frequency) * 100;
      const weightedRarity = rarity * (weights[traitType] / totalWeight);

      score += weightedRarity;
      if (attr) {
        traitDetails.push({ trait_type: traitType, value, rarity: Math.round(rarity * 10) / 10, count });
      }
    }

    return {
      serial: nft.serial,
      name: nft.name || `#${nft.serial}`,
      image: nft.image || null,
      score: Math.round(score * 10) / 10,
      traits: traitDetails,
    };
  });

  // 4. Rank by score desc
  scored.sort((a, b) => b.score - a.score);
  const ranked = scored.map((item, i) => ({ ...item, rank: i + 1 }));

  // 5. Build trait stats for the UI
  const traitStats: Record<string, { values: { value: string; count: number; pct: number }[]; weight: number }> = {};
  for (const [traitType, values] of Object.entries(traitCounts)) {
    traitStats[traitType] = {
      weight: weights[traitType],
      values: Object.entries(values)
        .map(([value, count]) => ({ value, count, pct: Math.round((count / total) * 1000) / 10 }))
        .sort((a, b) => a.count - b.count),
    };
  }

  return { ranked, traitStats, totalSupply: total };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("tokenId");

  if (!tokenId || !/^\d+\.\d+\.\d+$/.test(tokenId)) {
    return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 });
  }

  // Parse optional trait weights: ?weight_Background=2&weight_Eyes=3
  const traitWeights: Record<string, number> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("weight_")) {
      const traitType = key.replace("weight_", "");
      const w = parseFloat(value);
      if (!isNaN(w) && w > 0) traitWeights[traitType] = w;
    }
  }

  try {
    const nfts = await fetchAllNfts(tokenId);
    if (nfts.length === 0) {
      return NextResponse.json({ error: "No NFTs found or failed to resolve metadata" }, { status: 404 });
    }

    const result = calculateRarity(nfts, traitWeights);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Rarity calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate rarity", details: String(error) },
      { status: 500 }
    );
  }
}
