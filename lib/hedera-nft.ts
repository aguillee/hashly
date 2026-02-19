/**
 * Hedera NFT utilities - Read-only operations using Mirror Node API
 *
 * NOTE: All transaction operations (create token, mint, airdrop) are now handled
 * client-side via WalletConnect in hooks/useHederaTransactions.ts
 *
 * The private key NEVER leaves the user's wallet - all transactions are signed
 * directly by the connected wallet using DAppConnector's signer.
 */

/**
 * Check if a wallet holds any NFT from a specific token
 * Uses Hedera Mirror Node API (read-only, no private key needed)
 */
export async function checkNFTOwnership(
  tokenId: string,
  walletAddress: string
): Promise<{ owns: boolean; serials: number[] }> {
  try {
    const response = await fetch(
      `https://mainnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}/nfts?account.id=${walletAddress}&limit=100`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return { owns: false, serials: [] };
    }

    const data = await response.json();
    const serials = data.nfts?.map((nft: { serial_number: number }) => nft.serial_number) || [];

    return {
      owns: serials.length > 0,
      serials,
    };
  } catch (error) {
    console.error("Failed to check NFT ownership:", error);
    return { owns: false, serials: [] };
  }
}

/**
 * Get all holders of an NFT collection
 * Uses Hedera Mirror Node API (read-only, no private key needed)
 */
export async function getNFTHolders(
  tokenId: string
): Promise<Map<string, number[]>> {
  const holders = new Map<string, number[]>();

  try {
    let nextLink: string | null = `https://mainnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}/nfts?limit=100`;

    while (nextLink) {
      const res: Response = await fetch(nextLink, { cache: "no-store" });

      if (!res.ok) {
        break;
      }

      const data = await res.json();

      for (const nft of data.nfts || []) {
        const accountId = nft.account_id;
        const serial = nft.serial_number;

        if (!holders.has(accountId)) {
          holders.set(accountId, []);
        }
        holders.get(accountId)!.push(serial);
      }

      nextLink = data.links?.next
        ? `https://mainnet.mirrornode.hedera.com${data.links.next}`
        : null;
    }
  } catch (error) {
    console.error("Failed to get NFT holders:", error);
  }

  return holders;
}

/**
 * Get token info from Mirror Node
 */
export async function getTokenInfo(tokenId: string): Promise<{
  name: string;
  symbol: string;
  totalSupply: string;
  treasuryAccountId: string;
} | null> {
  try {
    const response = await fetch(
      `https://mainnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      name: data.name,
      symbol: data.symbol,
      totalSupply: data.total_supply,
      treasuryAccountId: data.treasury_account_id,
    };
  } catch (error) {
    console.error("Failed to get token info:", error);
    return null;
  }
}
