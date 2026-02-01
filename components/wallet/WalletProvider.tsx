"use client";

import * as React from "react";
import { useWalletStore } from "@/store";
import {
  DAppConnector,
  HederaSessionEvent,
  HederaJsonRpcMethod,
  HederaChainId,
} from "@hashgraph/hedera-wallet-connect";
import { LedgerId } from "@hashgraph/sdk";

interface WalletContextType {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  dAppConnector: DAppConnector | null;
}

const WalletContext = React.createContext<WalletContextType>({
  connect: async () => {},
  disconnect: () => {},
  isConnecting: false,
  dAppConnector: null,
});

export function useWallet() {
  return React.useContext(WalletContext);
}

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
// Force mainnet - ignore environment variable
const network = "mainnet";
const MAX_RETRIES = 3;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [dAppConnector, setDAppConnector] =
    React.useState<DAppConnector | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const { setConnected, setDisconnected, setUser, walletAddress } =
    useWalletStore();

  // Initialize DAppConnector on mount
  React.useEffect(() => {
    if (!isInitialized) {
      initConnector();
    }
  }, [isInitialized]);

  // Try to reconnect on mount if we have a stored wallet address
  React.useEffect(() => {
    if (walletAddress && dAppConnector && isInitialized) {
      verifySession();
    }
  }, [walletAddress, dAppConnector, isInitialized]);

  async function initConnector(retryCount = 0) {
    if (!projectId) {
      console.error("WalletConnect Project ID not configured");
      return;
    }

    try {
      const ledgerId =
        network === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;
      const chainId =
        network === "mainnet" ? HederaChainId.Mainnet : HederaChainId.Testnet;

      const metadata = {
        name: "Hashly",
        description: "Discover and vote on upcoming NFT mints on Hedera",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://hash-ly.com",
        icons: [
          typeof window !== "undefined"
            ? `${window.location.origin}/logo-navbar.png`
            : "https://hash-ly.com/logo-navbar.png",
        ],
      };

      const connector = new DAppConnector(
        metadata,
        ledgerId,
        projectId,
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
        [chainId]
      );

      // Initialize with logger
      await connector.init({ logger: "error" });
      setDAppConnector(connector);
      setIsInitialized(true);
      console.log("WalletConnect initialized successfully");

      // Check for existing sessions
      const existingSessions = connector.walletConnectClient?.session.getAll();
      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        const accountId = getAccountIdFromSession(session);
        if (accountId) {
          await authenticateWithBackend(accountId);
        }
      }
    } catch (error: any) {
      console.error(`Failed to initialize DAppConnector (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);

      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms...`);
        setTimeout(() => {
          initConnector(retryCount + 1);
        }, delay);
      } else {
        console.error("Max retries reached. WalletConnect initialization failed.");
      }
    }
  }

  function getAccountIdFromSession(session: any): string | null {
    try {
      const chainId =
        network === "mainnet" ? HederaChainId.Mainnet : HederaChainId.Testnet;
      const accounts = session.namespaces?.hedera?.accounts || [];
      for (const account of accounts) {
        if (account.includes(chainId)) {
          // Format: hedera:mainnet:0.0.123456
          const parts = account.split(":");
          return parts[2] || null;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async function verifySession() {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setConnected(data.user.walletAddress, data.user.walletAddress);
      } else {
        setDisconnected();
      }
    } catch {
      setDisconnected();
    }
  }

  async function authenticateWithBackend(accountId: string) {
    try {
      const message = `Sign in to Hashly\nTimestamp: ${Date.now()}`;

      // Sign the message cryptographically with the connected wallet
      if (!dAppConnector) {
        throw new Error("Wallet connector not available");
      }

      const signers = dAppConnector.signers;
      const signer = signers.find(
        (s) => s.getAccountId().toString() === accountId
      );
      if (!signer) {
        throw new Error("No signer found for account");
      }

      const messageBytes = new TextEncoder().encode(message);
      const signResult = await signer.sign([messageBytes]);
      if (!signResult || signResult.length === 0 || !signResult[0].signature) {
        throw new Error("Wallet did not return a signature");
      }

      const sigArray = new Uint8Array(signResult[0].signature);
      const signature = Array.from(sigArray)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: accountId,
          message,
          signature,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Authentication failed");
      }

      const data = await response.json();
      setUser(data.user);
      setConnected(accountId, accountId);

      // Do daily checkin
      await fetch("/api/users/checkin", { method: "POST" });
    } catch (error) {
      console.error("Backend authentication failed:", error);
      throw error;
    }
  }

  async function connect() {
    let currentConnector = dAppConnector;

    if (!currentConnector) {
      // Try to reinitialize
      await initConnector();
      // Wait a bit for initialization
      await new Promise((resolve) => setTimeout(resolve, 1000));
      currentConnector = dAppConnector;
      if (!currentConnector) {
        throw new Error(
          "Wallet connector not initialized. Please refresh the page."
        );
      }
    }

    setIsConnecting(true);

    try {
      // Open WalletConnect modal
      const session = await currentConnector.openModal();

      if (!session) {
        throw new Error("No session established");
      }

      // Get account ID from session
      const accountId = getAccountIdFromSession(session);

      if (!accountId) {
        throw new Error("Could not get account ID from wallet");
      }

      // Authenticate with backend
      await authenticateWithBackend(accountId);
    } catch (error: any) {
      console.error("Failed to connect:", error);

      const message = error?.message || "";

      // If subscription failed, try to reinitialize and retry once
      if (message.includes("Subscribing") && message.includes("failed")) {
        console.log("Subscription failed, reinitializing connector...");
        setIsInitialized(false);
        setDAppConnector(null);

        // Wait and reinitialize
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await initConnector();
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (dAppConnector) {
          try {
            const retrySession = await dAppConnector.openModal();
            if (retrySession) {
              const accountId = getAccountIdFromSession(retrySession);
              if (accountId) {
                await authenticateWithBackend(accountId);
                return; // Success on retry
              }
            }
          } catch (retryError) {
            console.error("Retry also failed:", retryError);
          }
        }
      }

      throw error;
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnect() {
    try {
      // Disconnect from WalletConnect
      if (dAppConnector) {
        await dAppConnector.disconnectAll();
      }

      // Logout from backend
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Disconnect error:", error);
    }
    setDisconnected();
  }

  return (
    <WalletContext.Provider
      value={{ connect, disconnect, isConnecting, dAppConnector }}
    >
      {children}
    </WalletContext.Provider>
  );
}
