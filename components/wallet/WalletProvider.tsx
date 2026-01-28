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
const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || "mainnet";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [dAppConnector, setDAppConnector] = React.useState<DAppConnector | null>(null);
  const { setConnected, setDisconnected, setUser, walletAddress } = useWalletStore();

  // Initialize DAppConnector on mount
  React.useEffect(() => {
    initConnector();
  }, []);

  // Try to reconnect on mount if we have a stored wallet address
  React.useEffect(() => {
    if (walletAddress && dAppConnector) {
      verifySession();
    }
  }, [walletAddress, dAppConnector]);

  async function initConnector() {
    try {
      const ledgerId = network === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;

      const connector = new DAppConnector(
        {
          name: "Hashly",
          description: "Discover and vote on upcoming NFT mints on Hedera",
          url: typeof window !== "undefined" ? window.location.origin : "https://hash-ly.com",
          icons: [typeof window !== "undefined" ? `${window.location.origin}/logo-navbar.png` : "https://hash-ly.com/logo-navbar.png"],
        },
        ledgerId,
        projectId,
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged]
      );

      await connector.init();
      setDAppConnector(connector);

      // Check for existing sessions
      const existingSessions = connector.walletConnectClient?.session.getAll();
      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        const accountId = getAccountIdFromSession(session);
        if (accountId) {
          await authenticateWithBackend(accountId);
        }
      }
    } catch (error) {
      console.error("Failed to initialize DAppConnector:", error);
    }
  }

  function getAccountIdFromSession(session: any): string | null {
    try {
      const chainId = network === "mainnet" ? HederaChainId.Mainnet : HederaChainId.Testnet;
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

      // For now, use a simple auth without signature verification
      // In production, you'd want to sign and verify
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: accountId,
          message,
          signature: "wallet-connect-session",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Authentication failed");
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
    if (!dAppConnector) {
      throw new Error("Wallet connector not initialized. Please refresh the page.");
    }

    setIsConnecting(true);

    try {
      // Open WalletConnect modal
      const session = await dAppConnector.openModal();

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
    } catch (error) {
      console.error("Failed to connect:", error);
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
    <WalletContext.Provider value={{ connect, disconnect, isConnecting, dAppConnector }}>
      {children}
    </WalletContext.Provider>
  );
}
