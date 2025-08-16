"use client";

import { useState } from "react";
import { TokenType } from "@/lib/interface";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUser: {
    username: string;
    walletAddress: string;
  };
  amount: number;
  onConfirm: (paymentData: {
    sourceChain: string;
    destinationChain: string;
    tokenType: TokenType;
  }) => void;
}

const CHAINS = {
  "11155111": {
    name: "Ethereum Sepolia",
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM]
  },
  "421614": {
    name: "Arbitrum Sepolia", 
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM]
  },
  "84532": {
    name: "Base Sepolia",
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM]
  }
};

const TOKEN_NAMES = {
  [TokenType.USDC]: "USDC",
  [TokenType.CCIP_BNM]: "CCIP-BnM",
  [TokenType.CCIP_LNM]: "CCIP-LnM"
};

export default function PaymentModal({ isOpen, onClose, recipientUser, amount, onConfirm }: PaymentModalProps) {
  const [sourceChain, setSourceChain] = useState<string>("");
  const [tokenType, setTokenType] = useState<TokenType | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fixed destination to Base Sepolia for fastest USDC delivery
  const destinationChain = "84532";

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!sourceChain || tokenType === "") {
      alert("Please select source chain and token type");
      return;
    }

    setIsProcessing(true);
    onConfirm({
      sourceChain,
      destinationChain,
      tokenType: tokenType as TokenType
    });
  };

  const availableTokens = sourceChain ? CHAINS[sourceChain as keyof typeof CHAINS].tokens : [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Cross-Chain Payment
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-sm text-[var(--color-text-muted)] mb-1">Paying to:</div>
            <div className="font-semibold text-[var(--color-text-primary)]">{recipientUser.username}</div>
            <div className="text-sm text-[var(--color-text-muted)] font-mono">{recipientUser.walletAddress}</div>
            <div className="text-2xl font-bold text-[var(--color-primary)] mt-2">${amount.toFixed(2)}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Source Chain (Where you have tokens)
            </label>
            <select
              value={sourceChain}
              onChange={(e) => {
                setSourceChain(e.target.value);
                setTokenType(""); // Reset token selection
              }}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            >
              <option value="">Select source chain</option>
              {Object.entries(CHAINS).map(([chainId, chain]) => (
                <option key={chainId} value={chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Token Type
            </label>
            <select
              value={tokenType}
              onChange={(e) => setTokenType(e.target.value === "" ? "" : parseInt(e.target.value) as TokenType)}
              disabled={!sourceChain}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
            >
              <option value="">Select token</option>
              {availableTokens.map((token) => (
                <option key={token} value={token}>
                  {TOKEN_NAMES[token]}
                </option>
              ))}
            </select>
          </div>

          {sourceChain && tokenType !== "" && (
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3">
              <div className="text-sm text-[var(--color-text-muted)] mb-1">Transaction Details:</div>
              <div className="text-sm text-[var(--color-text-primary)]">
                • Send {TOKEN_NAMES[tokenType as TokenType]} from {CHAINS[sourceChain as keyof typeof CHAINS].name}
              </div>
              <div className="text-sm text-[var(--color-text-primary)]">
                • Recipient receives USDC on Base Sepolia
              </div>
              <div className="text-sm text-[var(--color-text-primary)]">
                • Cross-chain conversion via Chainlink CCIP
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] py-3 rounded-lg font-semibold hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!sourceChain || tokenType === "" || isProcessing}
            className="flex-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white py-3 rounded-lg font-semibold hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isProcessing ? "Processing..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}