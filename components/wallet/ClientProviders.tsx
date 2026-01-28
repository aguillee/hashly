"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const WalletProvider = dynamic(
  () => import("./WalletProvider").then((mod) => mod.WalletProvider),
  { ssr: false }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <WalletProvider>{children}</WalletProvider>;
}
