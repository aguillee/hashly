const DREAMBAY_API_URL = "https://dreambay.io/api/launchpad/public";

export interface DreamBayLaunchpad {
  slug: string;
  name: string;
  symbol: string;
  tokenId: string;
  description: string;
  totalSupply: number;
  mintedCount: number;
  royaltyPercent: number;
  status: string; // "minting" | "ended"
  verified: boolean;
  bannerUrl: string | null;
  gallery: string[];
  stages: {
    name: string;
    price: string;
    maxPerWallet: number;
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
