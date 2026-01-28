// Kabila API Integration
// Documentation: https://labs.kabila.app/api/marketplace/manager/documentation

const KABILA_BASE_URL = "https://labs.kabila.app/api/marketplace/manager";

export interface KabilaAccess {
  id: number;
  launchpadId: number;
  mintDate: string;
  isPublic: boolean;
  mintPhaseIndex: number;
  discounts?: {
    id: number;
    idAccess: number;
    accounts: string[];
    tokens: string[];
    mints: number;
    priceReduced: number;
    discountPercentage: number;
    numberNftRequired: number;
  }[];
}

export interface KabilaLaunchpad {
  id: number;
  tokenId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  verified: number;
  state: "FINISHED" | "LIVE" | "UPCOMING" | string;
  numNftForSale: number;
  createdAt: string;
  type: string;
  accountId: string;
  bannerUrl: string;
  logoUrl: string;
  displayOnMarket: boolean;
  hasFixedPrice: boolean;
  numSold: number;
  accesses: KabilaAccess[];
}

/**
 * Fetch launchpads from Kabila API
 */
export async function fetchKabilaLaunchpads(): Promise<KabilaLaunchpad[]> {
  const fields = [
    "id",
    "tokenId",
    "name",
    "description",
    "price",
    "currency",
    "state",
    "numNftForSale",
    "bannerUrl",
    "logoUrl",
    "numSold",
    "accesses",
    "createdAt",
  ].join(",");

  try {
    const response = await fetch(`${KABILA_BASE_URL}/launchpads?fields=${fields}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Kabila API error: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching Kabila launchpads:", error);
    return [];
  }
}

/**
 * Map Kabila state to our EventStatus
 */
export function mapKabilaState(state: string): "UPCOMING" | "LIVE" | "ENDED" {
  if (state === "FINISHED") return "ENDED";
  if (state === "LIVE") return "LIVE";
  return "UPCOMING";
}

/**
 * Get Kabila launchpad URL
 */
export function getKabilaLaunchpadUrl(launchpadId: number | string): string {
  return `https://kabila.app/launchpad/${launchpadId}`;
}

/**
 * Resolve Kabila image URL (handle IPFS if needed)
 */
export function resolveKabilaImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Handle IPFS URLs
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }

  // Handle relative URLs
  if (url.startsWith("/")) {
    return `https://kabila.app${url}`;
  }

  return url;
}

/**
 * Get the first mint date from accesses
 * Returns null if no valid date (TBA)
 */
export function getKabilaMintDate(accesses: KabilaAccess[] | undefined): Date | null {
  if (!accesses || accesses.length === 0) {
    return null; // TBA - no accesses defined
  }

  // Sort by mintPhaseIndex and get the first one
  const sorted = [...accesses].sort((a, b) => a.mintPhaseIndex - b.mintPhaseIndex);
  const firstAccess = sorted[0];

  if (firstAccess.mintDate) {
    const date = new Date(firstAccess.mintDate);
    // Check if valid date
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null; // TBA - no valid date
}

/**
 * Format Kabila price with currency
 */
export function formatKabilaPrice(price: number, currency: string): string {
  if (price === 0) return "Free";
  return `${price} ${currency || "HBAR"}`;
}

// ============ COLLECTIONS ============

export interface KabilaCollection {
  _id: string;
  tokenId: string;
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
}

/**
 * Fetch all NFT collections from Kabila API
 */
export async function fetchKabilaCollections(): Promise<KabilaCollection[]> {
  try {
    const response = await fetch(`${KABILA_BASE_URL}/nft-collections`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Kabila collections API error: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching Kabila collections:", error);
    return [];
  }
}

/**
 * Get SentX marketplace URL for a collection
 */
export function getSentxMarketUrl(tokenId: string): string {
  return `https://sentx.io/nft-marketplace/${tokenId}`;
}
