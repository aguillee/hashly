"use client";

import * as React from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useWalletStore } from "@/store";
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  TokenId,
  AccountId,
  Hbar,
  PublicKey,
  NftId,
} from "@hashgraph/sdk";
import {
  inscribeWithSigner,
  type InscriptionInput,
} from "@hashgraphonline/standards-sdk";
import { buildHIP412Metadata } from "@/lib/hashinals";

const MIRROR_NODE = process.env.NEXT_PUBLIC_HEDERA_NETWORK?.trim() === "testnet"
  ? "https://testnet.mirrornode.hedera.com"
  : "https://mainnet.mirrornode.hedera.com";

export interface CreateTokenParams {
  name: string;
  symbol: string;
  memo?: string;
}

export interface CreateTokenResult {
  tokenId: string;
  transactionId: string;
}

export interface MintNFTParams {
  tokenId: string;
  metadata: string[];
}

export interface MintNFTResult {
  serialNumbers: number[];
  transactionId: string;
}

export interface AirdropNFTParams {
  tokenId: string;
  recipients: Array<{
    wallet: string;
    serialNumber: number;
  }>;
}

export interface AirdropNFTResult {
  successful: Array<{
    wallet: string;
    serialNumber: number;
    transactionId: string;
  }>;
  failed: Array<{
    wallet: string;
    serialNumber: number;
    error: string;
  }>;
}

async function getPublicKeyFromMirrorNode(accountId: string): Promise<PublicKey> {
  const res = await fetch(`${MIRROR_NODE}/api/v1/accounts/${accountId}`);
  if (!res.ok) throw new Error("Failed to fetch account info from Mirror Node");
  const data = await res.json();
  if (!data.key?.key) throw new Error("No public key found for account");
  return PublicKey.fromString(data.key.key);
}

// Poll mirror node for transaction result with retries
async function pollMirrorNode(
  txId: string,
  maxAttempts = 10,
  delayMs = 3000
): Promise<any> {
  // Format: 0.0.123@1234567890.123 -> 0.0.123-1234567890-123
  const formatted = txId.replace("@", "-").replace(/\.(?=\d+$)/, "-");

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    try {
      const res = await fetch(`${MIRROR_NODE}/api/v1/transactions/${formatted}`);
      if (res.ok) {
        const data = await res.json();
        if (data.transactions?.length > 0) return data.transactions[0];
      }
    } catch {
      // Retry
    }
  }
  return null;
}

export function useHederaTransactions() {
  const { dAppConnector } = useWallet();
  const { walletAddress } = useWalletStore();
  const [isExecuting, setIsExecuting] = React.useState(false);

  const getSigner = React.useCallback(() => {
    if (!dAppConnector || !walletAddress) {
      throw new Error("Wallet not connected");
    }

    // Check if there's an active session
    const sessions = dAppConnector.walletConnectClient?.session?.getAll();
    if (!sessions || sessions.length === 0) {
      throw new Error(
        "Wallet session expired. Please disconnect and reconnect your wallet."
      );
    }

    const signer = dAppConnector.signers.find(
      (s) => s.getAccountId().toString() === walletAddress
    );
    if (!signer) {
      throw new Error(
        "No signer found. Please disconnect and reconnect your wallet."
      );
    }

    // Verify the signer's topic exists in active sessions
    const signerTopic = (signer as any).topic;
    if (signerTopic) {
      const sessionExists = sessions.some((s: any) => s.topic === signerTopic);
      if (!sessionExists) {
        throw new Error(
          "Wallet session expired. Please disconnect and reconnect your wallet."
        );
      }
    }

    return signer;
  }, [dAppConnector, walletAddress]);

  const createNFTToken = React.useCallback(
    async (params: CreateTokenParams): Promise<CreateTokenResult> => {
      setIsExecuting(true);
      try {
        const signer = getSigner();
        const accountId = AccountId.fromString(walletAddress!);
        const publicKey = await getPublicKeyFromMirrorNode(walletAddress!);

        const tx = new TokenCreateTransaction()
          .setTokenName(params.name)
          .setTokenSymbol(params.symbol.toUpperCase().slice(0, 10))
          .setTokenType(TokenType.NonFungibleUnique)
          .setSupplyType(TokenSupplyType.Infinite)
          .setInitialSupply(0)
          .setDecimals(0)
          .setTreasuryAccountId(accountId)
          .setSupplyKey(publicKey)
          .setAdminKey(publicKey)
          .setFreezeDefault(false)
          .setMaxTransactionFee(new Hbar(30));

        if (params.memo) {
          tx.setTokenMemo(params.memo);
        }

        // signer.call() handles freeze, sign, and execute via WalletConnect
        const response = await (signer as any).call(tx);
        const transactionId = response.transactionId?.toString() || "";

        // Poll mirror node for token ID
        const txData = await pollMirrorNode(transactionId);
        const tokenId = txData?.entity_id;

        if (!tokenId) {
          throw new Error("Token creation failed - could not get token ID from network");
        }

        return { tokenId, transactionId };
      } finally {
        setIsExecuting(false);
      }
    },
    [getSigner, walletAddress]
  );

  const mintNFTs = React.useCallback(
    async (params: MintNFTParams): Promise<MintNFTResult> => {
      setIsExecuting(true);
      try {
        const signer = getSigner();
        const token = TokenId.fromString(params.tokenId);

        const metadataBytes = params.metadata.map(
          (m) => new Uint8Array(Buffer.from(m, "utf-8"))
        );

        const allSerials: number[] = [];
        let lastTxId = "";

        // Mint in batches of 10 (Hedera limit per transaction)
        for (let i = 0; i < metadataBytes.length; i += 10) {
          const batch = metadataBytes.slice(i, i + 10);

          const tx = new TokenMintTransaction()
            .setTokenId(token)
            .setMetadata(batch)
            .setMaxTransactionFee(new Hbar(20));

          const response = await (signer as any).call(tx);
          lastTxId = response.transactionId?.toString() || "";

          // Get serials from mirror node
          const txData = await pollMirrorNode(lastTxId);
          if (txData?.nft_transfers) {
            allSerials.push(
              ...txData.nft_transfers.map((t: any) => t.serial_number)
            );
          }

          // Small delay between batches
          if (i + 10 < metadataBytes.length) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        return { serialNumbers: allSerials, transactionId: lastTxId };
      } finally {
        setIsExecuting(false);
      }
    },
    [getSigner, walletAddress]
  );

  const airdropNFTs = React.useCallback(
    async (params: AirdropNFTParams): Promise<AirdropNFTResult> => {
      setIsExecuting(true);
      try {
        const signer = getSigner();
        const senderId = AccountId.fromString(walletAddress!);
        const token = TokenId.fromString(params.tokenId);

        const successful: AirdropNFTResult["successful"] = [];
        const failed: AirdropNFTResult["failed"] = [];

        // Batch NFT transfers: up to 10 per TransferTransaction
        // Only pre-checked associated wallets should be passed here,
        // so batch failures due to unassociated wallets are avoided.
        // Note: Using TransferTransaction because HashPack does not support
        // TokenAirdropTransaction via WalletConnect ("Unsupported Transaction Type")
        const BATCH_SIZE = 10;
        for (let i = 0; i < params.recipients.length; i += BATCH_SIZE) {
          const batch = params.recipients.slice(i, i + BATCH_SIZE);

          try {
            const tx = new TransferTransaction()
              .setMaxTransactionFee(new Hbar(10));

            for (const recipient of batch) {
              const receiverId = AccountId.fromString(recipient.wallet);
              tx.addNftTransfer(
                new NftId(token, recipient.serialNumber),
                senderId,
                receiverId
              );
            }

            const response = await (signer as any).call(tx);
            const transactionId = response.transactionId?.toString() || "";

            // Verify actual on-chain result via Mirror Node
            const txData = await pollMirrorNode(transactionId);
            const txResult = txData?.result;

            if (txResult === "SUCCESS") {
              for (const recipient of batch) {
                successful.push({
                  wallet: recipient.wallet,
                  serialNumber: recipient.serialNumber,
                  transactionId,
                });
              }
            } else {
              // Entire batch failed on-chain
              const onChainError = txResult || "Transaction failed on-chain";
              for (const recipient of batch) {
                failed.push({
                  wallet: recipient.wallet,
                  serialNumber: recipient.serialNumber,
                  error: onChainError,
                });
              }
            }
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Airdrop failed";
            for (const recipient of batch) {
              failed.push({
                wallet: recipient.wallet,
                serialNumber: recipient.serialNumber,
                error: errMsg,
              });
            }
          }

          // Delay between batches
          if (i + BATCH_SIZE < params.recipients.length) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        return { successful, failed };
      } finally {
        setIsExecuting(false);
      }
    },
    [getSigner, walletAddress]
  );

  // === Hashinals (HCS-1) Inscription via Standards SDK ===

  const KILOSCRIBE_API_KEY = process.env.NEXT_PUBLIC_KILOSCRIBE_API_KEY!;
  const KILOSCRIBE_BASE_URL =
    process.env.NEXT_PUBLIC_KILOSCRIBE_BASE_URL || "https://v2-api.tier.bot/api";
  const HEDERA_NETWORK =
    ((process.env.NEXT_PUBLIC_HEDERA_NETWORK?.trim() || "mainnet") as "mainnet" | "testnet");

  /**
   * Recovery: if SDK hangs after signing, query Kiloscribe API for the most recent
   * inscription by this wallet to retrieve the jobId.
   */
  async function recoverJobFromKiloscribe(
    walletAddress: string,
    fileName: string
  ): Promise<{ _id: string; tx_id: string; status: string } | null> {
    try {
      // Search by holder (wallet) — Kiloscribe stores the holderId
      const res = await fetch(
        `${KILOSCRIBE_BASE_URL}/inscriptions/retrieve-inscription?holderId=${encodeURIComponent(walletAddress)}&network=${HEDERA_NETWORK}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        // Could be a single object or array — handle both
        const items = Array.isArray(data) ? data : data?.inscriptions || [data];
        // Find the most recent pending inscription matching our file
        const match = items.find(
          (item: any) =>
            item &&
            item.status === "pending" &&
            (item.name?.includes(fileName) || true) // fallback: any recent pending
        );
        if (match && (match.tx_id || match._id)) return match;
      }

      // Fallback: check by wallet account on mirror node for most recent Kiloscribe tx
      // and then query Kiloscribe with that tx_id
      const mirrorRes = await fetch(
        `https://mainnet.mirrornode.hedera.com/api/v1/transactions?account.id=${walletAddress}&limit=5&order=desc`,
        { cache: "no-store" }
      );
      if (mirrorRes.ok) {
        const mirrorData = await mirrorRes.json();
        for (const tx of mirrorData.transactions || []) {
          const txId = tx.transaction_id;
          if (!txId) continue;
          const kiloRes = await fetch(
            `${KILOSCRIBE_BASE_URL}/inscriptions/retrieve-inscription?id=${encodeURIComponent(txId)}`,
            { cache: "no-store" }
          );
          if (kiloRes.ok) {
            const kiloData = await kiloRes.json();
            if (kiloData && kiloData.tx_id && kiloData.status) {
              return kiloData;
            }
          }
        }
      }
    } catch (err) {
      console.error("[Hashinals] Recovery failed:", err);
    }
    return null;
  }

  /**
   * Inscribe a file on-chain using HCS-1 via Kiloscribe SDK (non-blocking).
   * Returns immediately after user signs — caller polls for completion.
   */
  const inscribeFileOnChain = React.useCallback(
    async (
      fileBuffer: Uint8Array | ArrayBuffer,
      mimeType: string,
      fileName: string,
      onProgress?: (step: string) => void
    ): Promise<{ transactionId: string; jobId: string }> => {
      setIsExecuting(true);
      try {
        const signer = getSigner();

        if (!KILOSCRIBE_API_KEY) {
          throw new Error("Kiloscribe API key not configured (NEXT_PUBLIC_KILOSCRIBE_API_KEY)");
        }

        onProgress?.("Preparing inscription...");

        const buf = fileBuffer instanceof Uint8Array
          ? fileBuffer.buffer.slice(
              fileBuffer.byteOffset,
              fileBuffer.byteOffset + fileBuffer.byteLength
            ) as ArrayBuffer
          : fileBuffer;

        const input: InscriptionInput = {
          type: "buffer",
          buffer: buf,
          fileName,
          mimeType,
        };

        onProgress?.("Sign the transaction in your wallet...");

        // Race the SDK call against a timeout — the SDK sometimes hangs after signing
        const SDK_TIMEOUT_MS = 90_000; // 90 seconds after user signs

        const sdkPromise = inscribeWithSigner(input, signer as any, {
          mode: "file",
          network: HEDERA_NETWORK,
          apiKey: KILOSCRIBE_API_KEY,
          baseURL: KILOSCRIBE_BASE_URL,
          connectionMode: "http" as any,
          waitForConfirmation: false,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SDK_TIMEOUT")), SDK_TIMEOUT_MS)
        );

        let transactionId = "";
        let jobId = "";

        try {
          const response = await Promise.race([sdkPromise, timeoutPromise]);
          const result = (response as any).result as any;
          transactionId = result?.transactionId || result?.jobId || "";
          jobId = result?.jobId || transactionId;
        } catch (sdkErr: any) {
          if (sdkErr?.message === "SDK_TIMEOUT") {
            // SDK hung after signing — try to recover the jobId from Kiloscribe API
            onProgress?.("Recovering inscription from Kiloscribe...");
            console.warn("[Hashinals] SDK timed out, attempting to recover job from Kiloscribe API...");

            // Poll Kiloscribe for recent inscriptions by this wallet
            const walletAddress = signer.getAccountId?.()?.toString() || "";
            const recovered = await recoverJobFromKiloscribe(walletAddress, fileName);

            if (recovered) {
              transactionId = recovered.tx_id || recovered._id || "";
              jobId = recovered.tx_id || recovered._id || "";
              console.log("[Hashinals] Recovered job:", jobId);
            } else {
              throw new Error(
                "Inscription was signed but the SDK didn't return a job ID. " +
                "Check your recent Hedera transactions — the inscription may still be processing on Kiloscribe."
              );
            }
          } else {
            throw sdkErr;
          }
        }

        if (!jobId) {
          throw new Error("Inscription failed — no job ID returned");
        }

        return { transactionId, jobId };
      } catch (err) {
        console.error("[Hashinals] Inscription error:", err);
        throw err;
      } finally {
        setIsExecuting(false);
      }
    },
    [getSigner, KILOSCRIBE_API_KEY, KILOSCRIBE_BASE_URL, HEDERA_NETWORK]
  );

  return {
    createNFTToken,
    mintNFTs,
    airdropNFTs,
    inscribeFileOnChain,
    isExecuting,
    isReady: !!dAppConnector && !!walletAddress,
  };
}
