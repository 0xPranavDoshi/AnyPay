"use client";

import { useState, useEffect } from "react";
import {
  useIsInitialized,
  useIsSignedIn,
  useEvmAddress,
} from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import Image from "next/image";

interface EmbeddedWalletFlowProps {
  onWalletCreated: (address: string) => void;
}

export default function EmbeddedWalletFlow({
  onWalletCreated,
}: EmbeddedWalletFlowProps) {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const [isLoading, setIsLoading] = useState(false);

  // Use useEffect to handle wallet creation callback
  useEffect(() => {
    if (isInitialized && isSignedIn && evmAddress) {
      onWalletCreated(evmAddress);
    }
  }, [isInitialized, isSignedIn, evmAddress, onWalletCreated]);

  if (!isInitialized) {
    return (
      <div className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-primary)]"></div>
          <span className="text-[var(--color-text-secondary)]">
            Initializing...
          </span>
        </div>
      </div>
    );
  }

  if (isSignedIn && evmAddress) {
    return (
      <div className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl px-4 py-2.5 text-sm font-medium text-center">
        Connected: {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]">
            or
          </span>
        </div>
      </div>

      <div className="w-full">
        <AuthButton className="w-full">
          <span className="relative z-10 flex items-center justify-center gap-3">
            <Image
              src="/partners/coinbase.png"
              alt="Coinbase"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            Create Coinbase Embedded Wallet
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </AuthButton>
      </div>
    </div>
  );
}
