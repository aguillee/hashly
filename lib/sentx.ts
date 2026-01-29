// SentX API Integration
// Documentation: https://api.sentx.io/api-docs/

const SENTX_API_URL = "https://api.sentx.io";
const SENTX_API_KEY = process.env.SENTX_API_KEY || "";

export interface SentXMintEvent {
  mintCode: string;
  mintEventName: string;
  tokenAddress: string;
  image: string;
  availableCount: number;
  mintedCount: number;
  totalCount: number;
  mintPrice: number;
  isSoldOut: boolean;
  isForeverMint: number;
  url: string;
  startDate: string | null;
  endDate: string | null;
  startDateFormatted: string;
  endDateFormatted: string;
  startDateUnix: number | null;
  endDateUnix: number | null;
  description: string;
  collectionName: string;
  creatorName: string;
  nftPoolAddress: string;
}

export interface SentXCollection {
  token: string;
  name: string;
  description: string;
  image: string;
  imagetype: string | null;
  volume: number;
  avgSale: number;
  maxSale: number;
  sales: number;
  volumetotal: number;
  volume24h: number | null;
  volume7d: number | null;
  volume1m: number | null;
  highestOffer: number;
  floor: number;
  floor24h: number | null;
  floor7d: number | null;
  floor1m: number | null;
  offers: number;
  owners: number;
  spenders: number;
  supply: number;
  slug: string;
  stars: number;
}

interface MintEventsResponse {
  success: boolean;
  isCached: boolean;
  mintEvents: SentXMintEvent[];
}

interface TopCollectionsResponse {
  collections: SentXCollection[];
}

/**
 * Fetch active mint events from SentX launchpad
 * Note: This endpoint is public and doesn't require API key
 */
export async function fetchMintEvents(options?: {
  hideSoldOut?: boolean;
  tokenAddress?: string;
}): Promise<SentXMintEvent[]> {
  const params = new URLSearchParams();

  // Add API key if available (required despite "public" in URL)
  if (SENTX_API_KEY) {
    params.append("apikey", SENTX_API_KEY);
  }

  if (options?.hideSoldOut) {
    params.append("hideSoldOut", "1");
  }
  if (options?.tokenAddress) {
    params.append("tokenAddress", options.tokenAddress);
  }

  try {
    const queryString = params.toString();
    const url = queryString
      ? `${SENTX_API_URL}/v1/public/launchpad/mintevents?${queryString}`
      : `${SENTX_API_URL}/v1/public/launchpad/mintevents`;

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`SentX API error: ${response.status}`);
    }

    const data: MintEventsResponse = await response.json();
    return data.mintEvents || [];
  } catch (error) {
    console.error("Error fetching SentX mint events:", error);
    return [];
  }
}

/**
 * Fetch top NFT collections from SentX marketplace
 * Note: This endpoint is public and doesn't require API key
 */
export async function fetchTopCollections(): Promise<SentXCollection[]> {
  try {
    // Public endpoint - no API key required
    const response = await fetch(
      `${SENTX_API_URL}/v1/public/market/topcollections`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`SentX API error: ${response.status}`);
    }

    const data: TopCollectionsResponse = await response.json();
    return data.collections || [];
  } catch (error) {
    console.error("Error fetching SentX collections:", error);
    return [];
  }
}

/**
 * Get collection stats for a specific token
 * Note: This endpoint is public and doesn't require API key
 */
export async function fetchCollectionStats(tokenAddress: string): Promise<SentXCollection | null> {
  try {
    // Public endpoint - no API key required
    const response = await fetch(
      `${SENTX_API_URL}/v1/public/market/stats/token?token=${tokenAddress}`,
      {
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.collection || null;
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return null;
  }
}

/**
 * Fetch ALL supported token IDs from SentX
 * Note: This endpoint is public and doesn't require API key
 */
export async function fetchSupportedTokenList(): Promise<string[]> {
  try {
    // Public endpoint - no API key required
    const response = await fetch(
      `${SENTX_API_URL}/v1/public/token/supportedlist`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`SentX API error: ${response.status}`);
    }

    const data = await response.json();
    return data.supportedTokenList || [];
  } catch (error) {
    console.error("Error fetching supported token list:", error);
    return [];
  }
}

/**
 * Fetch token info from Hedera Mirror Node
 */
export async function fetchTokenFromMirrorNode(tokenId: string): Promise<{
  token_id: string;
  name: string;
  symbol: string;
  total_supply: string;
  type: string;
} | null> {
  try {
    const response = await fetch(
      `https://mainnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`,
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      token_id: data.token_id,
      name: data.name || "Unknown",
      symbol: data.symbol || "",
      total_supply: data.total_supply || "0",
      type: data.type || "NON_FUNGIBLE_UNIQUE",
    };
  } catch (error) {
    console.error(`Error fetching token ${tokenId} from Mirror Node:`, error);
    return null;
  }
}

/**
 * Fetch collections in batches for sync
 * Combines top collections (full data) with remaining tokens (basic data from Mirror Node)
 *
 * @param existingTokens - Token IDs already in the database (to skip)
 * @param batchLimit - How many new tokens to process per call
 */
export async function fetchCollectionsBatch(
  existingTokens: string[] = [],
  batchLimit: number = 100
): Promise<{ collections: SentXCollection[]; hasMore: boolean; totalRemaining: number }> {
  // Get supported tokens and top collections in parallel
  const [supportedTokens, topCollections] = await Promise.all([
    fetchSupportedTokenList(),
    fetchTopCollections(),
  ]);

  // Create lookup sets
  const existingSet = new Set(existingTokens);
  const topCollectionsMap = new Map<string, SentXCollection>();
  for (const c of topCollections) {
    topCollectionsMap.set(c.token, c);
  }

  // Collections to return
  const collections: SentXCollection[] = [];

  // Add top collections (they have full data: image, owners, floor, etc.)
  for (const c of topCollections) {
    if (!existingSet.has(c.token)) {
      collections.push(c);
    }
  }

  // Get remaining tokens not in top collections and not already in DB
  const remainingTokens = supportedTokens.filter(
    t => !topCollectionsMap.has(t) && !existingSet.has(t)
  );

  // Process a batch of remaining tokens in parallel
  const tokensToProcess = remainingTokens.slice(0, batchLimit);
  const PARALLEL_SIZE = 20;

  for (let i = 0; i < tokensToProcess.length; i += PARALLEL_SIZE) {
    const batch = tokensToProcess.slice(i, i + PARALLEL_SIZE);

    const results = await Promise.all(
      batch.map(tokenId => fetchTokenFromMirrorNode(tokenId))
    );

    for (let j = 0; j < results.length; j++) {
      const data = results[j];
      if (data && data.type === "NON_FUNGIBLE_UNIQUE") {
        collections.push({
          token: batch[j],
          name: data.name,
          description: "",
          image: "",
          imagetype: null,
          volume: 0,
          avgSale: 0,
          maxSale: 0,
          sales: 0,
          volumetotal: 0,
          volume24h: null,
          volume7d: null,
          volume1m: null,
          highestOffer: 0,
          floor: 0,
          floor24h: null,
          floor7d: null,
          floor1m: null,
          offers: 0,
          owners: 0,
          spenders: 0,
          supply: parseInt(data.total_supply) || 0,
          slug: "",
          stars: 0,
        });
      }
    }

    // Small delay between parallel batches
    if (i + PARALLEL_SIZE < tokensToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return {
    collections,
    hasMore: remainingTokens.length > batchLimit,
    totalRemaining: Math.max(0, remainingTokens.length - batchLimit),
  };
}

/**
 * Convert IPFS/HCS/Arweave URL to gateway URL for images
 */
export function resolveImageUrl(url: string): string {
  if (!url) return "/placeholder-nft.png";

  // Handle HCS (Hedera Consensus Service) URLs - convert to hashinals gateway
  // Format: hcs://1/0.0.10122664 -> use placeholder or hashinals API
  if (url.startsWith("hcs://")) {
    // HCS URLs need special handling - for now return placeholder
    // In the future, could integrate with hashinals.com or similar service
    return "/placeholder-nft.png";
  }

  // Handle IPFS URLs
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }

  // Handle Arweave URLs
  if (url.startsWith("ar://")) {
    return url.replace("ar://", "https://arweave.net/");
  }

  // Handle CID-only URLs (like QmbrAoVNJK49...)
  if (url.match(/^Qm[a-zA-Z0-9]{44}$/)) {
    return `https://ipfs.io/ipfs/${url}`;
  }

  // Handle bafy CIDs (IPFS v1 CIDs)
  if (url.match(/^bafy[a-zA-Z0-9]+$/)) {
    return `https://ipfs.io/ipfs/${url}`;
  }

  return url;
}
