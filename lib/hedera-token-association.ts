const MIRROR_NODE = "https://mainnet.mirrornode.hedera.com";

/**
 * Check if a single wallet has a token associated via Mirror Node.
 * Uses the balances endpoint - if the account appears, the token is associated.
 */
export async function checkTokenAssociation(
  tokenId: string,
  walletAddress: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${MIRROR_NODE}/api/v1/tokens/${tokenId}/balances?account.id=${walletAddress}`,
      { cache: "no-store" }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return (data.balances?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Batch check token association for multiple wallets.
 * Returns a Map<walletAddress, isAssociated>.
 * Runs checks in parallel with concurrency limit to avoid Mirror Node rate limiting.
 */
export async function checkTokenAssociationBatch(
  tokenId: string,
  wallets: string[],
  concurrency = 5
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  for (let i = 0; i < wallets.length; i += concurrency) {
    const batch = wallets.slice(i, i + concurrency);
    const checks = await Promise.all(
      batch.map(async (wallet) => {
        const associated = await checkTokenAssociation(tokenId, wallet);
        return { wallet, associated };
      })
    );
    for (const { wallet, associated } of checks) {
      results.set(wallet, associated);
    }
  }

  return results;
}
