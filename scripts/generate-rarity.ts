/**
 * One-time script to generate rarity data for Santuario Hedera.
 * Run: npx tsx scripts/generate-rarity.ts
 */

const MIRROR = "https://mainnet.mirrornode.hedera.com";
const TOKEN_ID = "0.0.7235629";

const IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://dweb.link/ipfs/",
];

const ARWEAVE_GATEWAYS = [
  "https://arweave.developerdao.com/",
  "https://gateway.irys.xyz/",
  "https://arweave.net/",
];

interface NftRaw {
  serial: number;
  metadataUri: string;
}

interface NftMetadata {
  serial: number;
  name: string;
  image: string | null;
  attributes: { trait_type: string; value: string }[];
}

function decodeMetadataUri(base64: string): string | null {
  if (!base64) return null;
  const decoded = Buffer.from(base64, "base64").toString("utf-8").trim();
  if (decoded.startsWith("ipfs://")) return decoded;
  if (decoded.startsWith("ar://")) return decoded;
  if (decoded.startsWith("http")) return decoded;
  if (decoded.match(/^(Qm[a-zA-Z0-9]{44}|bafy[a-zA-Z0-9]+)/)) return `ipfs://${decoded}`;
  return null;
}

async function fetchWithGateways(uri: string): Promise<Record<string, unknown> | null> {
  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    for (const gw of IPFS_GATEWAYS) {
      try {
        const res = await fetch(`${gw}${cid}`, { signal: AbortSignal.timeout(20000) });
        if (res.ok) {
          const text = await res.text();
          return JSON.parse(text);
        }
      } catch { /* try next */ }
    }
  } else if (uri.startsWith("ar://")) {
    const txId = uri.replace("ar://", "");
    for (const gw of ARWEAVE_GATEWAYS) {
      try {
        const res = await fetch(`${gw}${txId}`, { signal: AbortSignal.timeout(20000) });
        if (res.ok) {
          const text = await res.text();
          return JSON.parse(text);
        }
      } catch { /* try next */ }
    }
  } else if (uri.startsWith("http")) {
    try {
      const res = await fetch(uri, { signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.json();
    } catch { /* */ }
  }
  return null;
}

/** Normalize trait_type to Title Case so "FONDO" and "Fondo" merge */
function normalizeTraitType(t: string): string {
  return t
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

/** Normalize trait values so "Halloween2024" and "Halloween 2024" merge */
function normalizeTraitValue(v: string): string {
  // Add space between a letter and a digit: "Halloween2024" → "Halloween 2024"
  return v.replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2").trim();
}

function resolveImageUrl(image: string): string {
  // Encode special chars in filenames (e.g. "Dragón#414.png" → "Dragón%23414.png")
  const encodeFilename = (url: string) => {
    const lastSlash = url.lastIndexOf("/");
    if (lastSlash === -1) return url;
    const base = url.slice(0, lastSlash + 1);
    const file = url.slice(lastSlash + 1);
    return base + encodeURIComponent(decodeURIComponent(file));
  };

  if (image.startsWith("ipfs://")) {
    const path = image.replace("ipfs://", "");
    return encodeFilename(`https://nftstorage.link/ipfs/${path}`);
  }
  if (image.startsWith("ar://")) return `https://arweave.net/${image.replace("ar://", "")}`;
  return encodeFilename(image);
}

async function main() {
  console.log("Fetching NFTs from Mirror Node...");

  const serials: NftRaw[] = [];
  let next: string | null = `${MIRROR}/api/v1/tokens/${TOKEN_ID}/nfts?limit=100&order=asc`;

  while (next) {
    const res = await fetch(next);
    const data = await res.json();
    for (const nft of data.nfts || []) {
      if (nft.deleted || nft.account_id === "0.0.0" || !nft.account_id) continue;
      const uri = decodeMetadataUri(nft.metadata || "");
      if (uri) serials.push({ serial: nft.serial_number, metadataUri: uri });
    }
    next = data.links?.next ? `${MIRROR}${data.links.next}` : null;
  }

  console.log(`Found ${serials.length} active NFTs. Resolving metadata...`);

  const results: NftMetadata[] = [];
  const BATCH = 10;
  let resolved = 0;
  let failed = 0;

  for (let i = 0; i < serials.length; i += BATCH) {
    const batch = serials.slice(i, i + BATCH);
    // Small delay between batches to avoid rate limits
    if (i > 0) await new Promise((r) => setTimeout(r, 500));
    const settled = await Promise.allSettled(
      batch.map(async ({ serial, metadataUri }) => {
        const meta = await fetchWithGateways(metadataUri);
        if (!meta) {
          failed++;
          return { serial, name: `#${serial}`, image: null, attributes: [] };
        }
        const image = meta.image ? resolveImageUrl(meta.image as string) : null;
        return {
          serial,
          name: (meta.name as string) || `#${serial}`,
          image,
          attributes: (meta.attributes as { trait_type: string; value: string }[]) || [],
        };
      })
    );
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    resolved += batch.length;
    process.stdout.write(`\r  ${resolved}/${serials.length} resolved (${failed} failed)`);
  }

  console.log(`\nResolved ${results.length} NFTs. Failed metadata: ${failed}`);

  // Calculate rarity
  const total = results.length;
  const traitCounts: Record<string, Record<string, number>> = {};
  const allTraitTypes = new Set<string>();

  // Normalize trait_type ("FONDO"/"Fondo" → "Fondo") and values ("Halloween2024" → "Halloween 2024")
  for (const nft of results) {
    for (const attr of nft.attributes) {
      attr.trait_type = normalizeTraitType(attr.trait_type);
      attr.value = normalizeTraitValue(String(attr.value));
      allTraitTypes.add(attr.trait_type);
      if (!traitCounts[attr.trait_type]) traitCounts[attr.trait_type] = {};
      traitCounts[attr.trait_type][attr.value] = (traitCounts[attr.trait_type][attr.value] || 0) + 1;
    }
  }

  // Custom weights: Piel = 15%, rest split equally (85% / 8 = 10.625%)
  const TRAIT_WEIGHTS: Record<string, number> = { Piel: 15 };
  const defaultWeight = (100 - Object.values(TRAIT_WEIGHTS).reduce((s, w) => s + w, 0)) / (allTraitTypes.size - Object.keys(TRAIT_WEIGHTS).length);
  const weights: Record<string, number> = {};
  for (const t of allTraitTypes) weights[t] = TRAIT_WEIGHTS[t] ?? defaultWeight;
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);

  const scored = results.map((nft) => {
    let score = 0;
    const traits: { trait_type: string; value: string; rarity: number; count: number }[] = [];

    for (const traitType of allTraitTypes) {
      const attr = nft.attributes.find((a) => a.trait_type === traitType);
      if (!attr) continue;
      const count = traitCounts[traitType][String(attr.value)] || 0;
      const rarity = Math.round((1 - count / total) * 1000) / 10;
      score += rarity * (weights[traitType] / totalWeight);
      traits.push({ trait_type: traitType, value: String(attr.value), rarity, count });
    }

    return {
      serial: nft.serial,
      name: nft.name,
      image: nft.image,
      score: Math.round(score * 10) / 10,
      traits,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  // 1-of-1 specials: serials 1, 652, 653, 654 are always rank 1
  const RANK1_SERIALS = new Set([1, 652, 653, 654]);
  const rank1 = scored.filter((s) => RANK1_SERIALS.has(s.serial));
  const rest = scored.filter((s) => !RANK1_SERIALS.has(s.serial));
  const ranked = [
    ...rank1.map((item) => ({ ...item, rank: 1 })),
    ...rest.map((item, i) => ({ ...item, rank: i + rank1.length + 1 })),
  ];

  // Trait stats
  const traitStats: Record<string, { weight: number; values: { value: string; count: number; pct: number }[] }> = {};
  for (const [traitType, values] of Object.entries(traitCounts)) {
    traitStats[traitType] = {
      weight: Math.round((weights[traitType] / totalWeight) * 10000) / 100,
      values: Object.entries(values)
        .map(([value, count]) => ({ value, count, pct: Math.round((count / total) * 1000) / 10 }))
        .sort((a, b) => a.count - b.count),
    };
  }

  const output = { ranked, traitStats, totalSupply: total };
  const path = `public/data/rarity-${TOKEN_ID}.json`;

  const { writeFileSync } = await import("fs");
  writeFileSync(path, JSON.stringify(output));
  console.log(`Saved to ${path} (${Math.round(JSON.stringify(output).length / 1024)}KB)`);

  const withImage = ranked.filter((n) => n.image).length;
  const withTraits = ranked.filter((n) => n.traits.length > 0).length;
  console.log(`With image: ${withImage}/${total}, With traits: ${withTraits}/${total}`);
}

main().catch(console.error);
