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

const MIRROR_NODE = process.env.NEXT_PUBLIC_HEDERA_NETWORK === "testnet"
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
    (process.env.NEXT_PUBLIC_HEDERA_NETWORK as "mainnet" | "testnet") || "mainnet";

  /**
   * Get an estimated cost quote for inscribing a file on-chain.
   * Does NOT inscribe — just returns the cost estimate.
   */
  const getInscriptionQuote = React.useCallback(
    async (
      fileBuffer: Uint8Array | ArrayBuffer,
      mimeType: string,
      fileName: string
    ): Promise<{ totalCostHbar: string }> => {
      const signer = getSigner();

      if (!KILOSCRIBE_API_KEY) {
        throw new Error("Kiloscribe API key not configured");
      }

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

      const response = await inscribeWithSigner(input, signer as any, {
        mode: "file",
        network: HEDERA_NETWORK,
        apiKey: KILOSCRIBE_API_KEY,
        baseURL: KILOSCRIBE_BASE_URL,
        connectionMode: "http" as any,
        quoteOnly: true,
      });

      return {
        totalCostHbar: (response as any).result?.totalCostHbar || "0",
      };
    },
    [getSigner, KILOSCRIBE_API_KEY, KILOSCRIBE_BASE_URL, HEDERA_NETWORK]
  );

  /**
   * Inscribe a file on-chain using HCS-1 via Kiloscribe SDK.
   * User signs via WalletConnect — key never leaves wallet.
   */
  const inscribeFileOnChain = React.useCallback(
    async (
      fileBuffer: Uint8Array | ArrayBuffer,
      mimeType: string,
      fileName: string,
      onProgress?: (step: string) => void
    ): Promise<{ topicId: string; transactionId: string }> => {
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

        onProgress?.("Uploading to Kiloscribe & signing transaction...");

        const response = await inscribeWithSigner(input, signer as any, {
          mode: "file",
          network: HEDERA_NETWORK,
          apiKey: KILOSCRIBE_API_KEY,
          baseURL: KILOSCRIBE_BASE_URL,
          connectionMode: "http" as any,
          waitForConfirmation: true,
          waitMaxAttempts: 120,
          waitIntervalMs: 3000,
        });

        if (!response.confirmed || !response.inscription) {
          throw new Error("Inscription failed — not confirmed");
        }

        const topicId = response.inscription.topic_id;
        const transactionId = response.inscription.transactionId || "";

        if (!topicId) {
          throw new Error("Inscription failed — no topic ID returned");
        }

        return { topicId, transactionId };
      } catch (err) {
        // Log full error for debugging
        console.error("[Hashinals] Inscription error:", err);
        throw err;
      } finally {
        setIsExecuting(false);
      }
    },
    [getSigner, KILOSCRIBE_API_KEY, KILOSCRIBE_BASE_URL, HEDERA_NETWORK]
  );

  /**
   * Inscribe badge image + metadata on-chain.
   * 1. Inscribes image as HCS-1 file
   * 2. Builds HIP-412 metadata JSON with hcs://1/{imageTopicId}
   * 3. Inscribes metadata JSON as HCS-1 file
   */
  const uploadBadgeMetadataOnChain = React.useCallback(
    async (params: {
      imageBuffer: Uint8Array;
      imageContentType: string;
      name: string;
      description: string;
      existingImageTopicId?: string; // Skip image inscription if already inscribed
      eventTitle?: string;
      eventDate?: string;
      eventLocation?: string;
      onProgress?: (step: string) => void;
    }): Promise<{
      imageTopicId: string;
      metadataTopicId: string;
      metadataUri: string;
    }> => {
      setIsExecuting(true);
      try {
        let imageTopicId: string;

        if (params.existingImageTopicId) {
          // Image already inscribed — skip to metadata
          imageTopicId = params.existingImageTopicId;
          params.onProgress?.("Image already on-chain, inscribing metadata...");
        } else {
          // Step 1: Inscribe image
          params.onProgress?.("Inscribing image on Hedera...");
          const imageResult = await inscribeFileOnChain(
            params.imageBuffer,
            params.imageContentType,
            `badge-image.${params.imageContentType.split("/")[1] || "png"}`,
            params.onProgress
          );
          imageTopicId = imageResult.topicId;
        }

        // Step 2: Build HIP-412 metadata
        const metadata = buildHIP412Metadata({
          name: params.name,
          description: params.description,
          imageTopicId,
          imageContentType: params.imageContentType,
          attributes: [
            ...(params.eventTitle
              ? [{ trait_type: "Event", value: params.eventTitle }]
              : []),
            ...(params.eventDate
              ? [{ trait_type: "Date", value: params.eventDate }]
              : []),
            ...(params.eventLocation
              ? [{ trait_type: "Location", value: params.eventLocation }]
              : []),
          ],
        });

        // Step 3: Inscribe metadata JSON
        params.onProgress?.("Inscribing metadata on Hedera...");
        const metadataBuffer = new TextEncoder().encode(
          JSON.stringify(metadata)
        );
        const metadataResult = await inscribeFileOnChain(
          metadataBuffer,
          "application/json",
          "metadata.json",
          params.onProgress
        );

        return {
          imageTopicId,
          metadataTopicId: metadataResult.topicId,
          metadataUri: `hcs://1/${metadataResult.topicId}`,
        };
      } finally {
        setIsExecuting(false);
      }
    },
    [inscribeFileOnChain]
  );

  return {
    createNFTToken,
    mintNFTs,
    airdropNFTs,
    inscribeFileOnChain,
    uploadBadgeMetadataOnChain,
    getInscriptionQuote,
    isExecuting,
    isReady: !!dAppConnector && !!walletAddress,
  };
}
