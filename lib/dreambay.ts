const DREAMBAY_API_URL = "https://dreambay.io/api/launchpad/public";
const DREAMCAST_API_URL = "https://dreambay.io/api/dreamcast/pools";

export interface DreamBayLaunchpad {
  slug: string;
  name: string;
  symbol: string;
  tokenId: string;
  description: string;
  totalSupply: number;
  mintedCount: number;
  royaltyPercent: number;
  status: string; // "active" | "minting" | "ended"
  verified: boolean;
  startDate: string | null;
  endDate: string | null;
  bannerUrl: string | null;
  gallery: string[];
  stages: {
    name: string;
    price: string;
    startDate: string | null;
    endDate: string | null;
    maxPerWallet: number;
    supplyLimit: number | null;
    status: string; // "LIVE" | "ENDED"
    isWhitelistOnly: boolean;
  }[];
  socials: {
    twitter: string | null;
    discord: string | null;
    website: string | null;
  };
  mintUrl: string;
}

export async function fetchDreamBayLaunchpads(): Promise<DreamBayLaunchpad[]> {
  const response = await fetch(DREAMBAY_API_URL, {
    headers: { "Accept": "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`DreamBay API error: ${response.status}`);
  }

  const data = await response.json();
  return data.collections || [];
}

// ─── DreamCast ───

export interface DreamCastPool {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_account: string;
  avatar: string | null;
  banner: string | null;
  status: string; // "active" | "inactive"
  badge: string | null; // "official" | null
  mint_price: string; // tinybar
  buyback_enabled: boolean;
  stats: {
    totalCatches: number;
    totalVolume: string; // tinybar
  };
  pool_slots_count: number;
  pool_slots_tiers: Record<string, number>;
  pool_slots_previews: { image: string | null; tier: string; name?: string }[];
  created_at: string;
  updated_at: string;
}

export async function fetchDreamCastPools(): Promise<DreamCastPool[]> {
  const response = await fetch(`${DREAMCAST_API_URL}?light=1`, {
    headers: { "Accept": "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`DreamCast API error: ${response.status}`);
  }

  const data = await response.json();
  const pools: DreamCastPool[] = data.pools || [];
  // Filter out test pools
  return pools.filter((p) => !p.name.startsWith("__TEST") && p.status === "active");
}

export function getDreamCastMintPrice(mintPriceTinybar: string): string {
  const hbar = parseInt(mintPriceTinybar) / 100_000_000;
  if (hbar <= 0) return "Free";
  return `${hbar} HBAR`;
}

export function getDreamCastMintUrl(slug: string): string {
  return `https://dreambay.io/on-chain/dreamcast/${slug}`;
}

// ─── Launchpad ───

/**
 * Get the cheapest live mint price from stages
 */
export function getDreamBayMintPrice(stages: DreamBayLaunchpad["stages"]): string {
  const liveStages = stages.filter((s) => s.status === "LIVE");
  if (liveStages.length === 0) {
    // Fallback to any stage
    if (stages.length === 0) return "TBA";
    const price = parseFloat(stages[0].price);
    return price > 0 ? `${stages[0].price} HBAR` : "Free";
  }

  const cheapest = liveStages.reduce((min, s) =>
    parseFloat(s.price) < parseFloat(min.price) ? s : min
  );
  const price = parseFloat(cheapest.price);
  return price > 0 ? `${cheapest.price} HBAR` : "Free";
}
