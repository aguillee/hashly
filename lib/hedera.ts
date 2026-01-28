// Hedera Mirror Node API utilities for NFT verification

// NFT Collection IDs
export const DRAGON_TOKEN_ID = "0.0.7235629"; // Santuario Hedera (Dragons)
export const SANTUARIO_TOKEN_ID = "0.0.9954622"; // El Santuario

// Vote weights
export const DRAGON_VOTE_WEIGHT = 1; // +1 vote per dragon NFT
export const SANTUARIO_VOTE_WEIGHT = 20; // +20 votes for El Santuario holder

// Mirror Node URL
const MIRROR_NODE_URL = "https://mainnet.mirrornode.hedera.com";

export interface NFTInfo {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  metadata?: string;
}

export interface WalletNFTs {
  dragons: NFTInfo[];
  santuario: NFTInfo[];
  totalDragons: number;
  hasSantuario: boolean;
  potentialVotes: {
    dragonVotes: number;
    santuarioVotes: number;
    total: number;
  };
}

/**
 * Get all NFTs of a specific token that a wallet holds
 */
export async function getNFTsForWallet(
  walletAddress: string,
  tokenId: string
): Promise<NFTInfo[]> {
  try {
    const nfts: NFTInfo[] = [];
    let nextLink: string | null = `/api/v1/accounts/${walletAddress}/nfts?token.id=${tokenId}&limit=100`;

    while (nextLink) {
      const response: Response = await fetch(`${MIRROR_NODE_URL}${nextLink}`);

      if (!response.ok) {
        if (response.status === 404) {
          return []; // Account not found or no NFTs
        }
        throw new Error(`Mirror Node API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.nfts && Array.isArray(data.nfts)) {
        for (const nft of data.nfts) {
          nfts.push({
            tokenId: nft.token_id,
            serialNumber: nft.serial_number,
            accountId: nft.account_id,
            metadata: nft.metadata,
          });
        }
      }

      // Handle pagination
      nextLink = data.links?.next || null;
    }

    return nfts;
  } catch (error) {
    console.error(`Error fetching NFTs for wallet ${walletAddress}:`, error);
    return [];
  }
}

/**
 * Verify if a wallet currently owns a specific NFT serial
 */
export async function verifyNFTOwnership(
  walletAddress: string,
  tokenId: string,
  serialNumber: number
): Promise<boolean> {
  try {
    const response = await fetch(
      `${MIRROR_NODE_URL}/api/v1/tokens/${tokenId}/nfts/${serialNumber}`
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.account_id === walletAddress;
  } catch (error) {
    console.error(`Error verifying NFT ownership:`, error);
    return false;
  }
}

/**
 * Get all relevant NFTs for a wallet (Dragons and El Santuario)
 */
export async function getWalletNFTs(walletAddress: string): Promise<WalletNFTs> {
  const [dragons, santuario] = await Promise.all([
    getNFTsForWallet(walletAddress, DRAGON_TOKEN_ID),
    getNFTsForWallet(walletAddress, SANTUARIO_TOKEN_ID),
  ]);

  const hasSantuario = santuario.length > 0;
  const totalDragons = dragons.length;

  return {
    dragons,
    santuario,
    totalDragons,
    hasSantuario,
    potentialVotes: {
      dragonVotes: totalDragons * DRAGON_VOTE_WEIGHT,
      santuarioVotes: hasSantuario ? SANTUARIO_VOTE_WEIGHT : 0,
      total: (totalDragons * DRAGON_VOTE_WEIGHT) + (hasSantuario ? SANTUARIO_VOTE_WEIGHT : 0),
    },
  };
}

/**
 * Check if a wallet holds El Santuario NFT (for auto-approval)
 */
export async function hasElSantuario(walletAddress: string): Promise<boolean> {
  const nfts = await getNFTsForWallet(walletAddress, SANTUARIO_TOKEN_ID);
  return nfts.length > 0;
}

/**
 * Get the serial numbers of dragons that a wallet owns
 */
export async function getDragonSerials(walletAddress: string): Promise<number[]> {
  const nfts = await getNFTsForWallet(walletAddress, DRAGON_TOKEN_ID);
  return nfts.map(nft => nft.serialNumber);
}

/**
 * Get the serial numbers of El Santuario NFTs that a wallet owns
 */
export async function getSantuarioSerials(walletAddress: string): Promise<number[]> {
  const nfts = await getNFTsForWallet(walletAddress, SANTUARIO_TOKEN_ID);
  return nfts.map(nft => nft.serialNumber);
}
