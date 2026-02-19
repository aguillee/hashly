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

const MIRROR_NODE = "https://mainnet.mirrornode.hedera.com";

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

  return {
    createNFTToken,
    mintNFTs,
    airdropNFTs,
    isExecuting,
    isReady: !!dAppConnector && !!walletAddress,
  };
}
