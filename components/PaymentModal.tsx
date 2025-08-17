"use client";

import { useState } from "react";
import { TokenType } from "@/lib/interface";

declare global {
  interface Window {
    ethereum?: any;
  }
}

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
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM],
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  "421614": {
    name: "Arbitrum Sepolia", 
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM],
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  "84532": {
    name: "Base Sepolia",
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM],
    rpcUrl: "https://sepolia.base.org",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  }
};

const TOKEN_NAMES = {
  [TokenType.USDC]: "USDC",
  [TokenType.CCIP_BNM]: "CCIP-BnM",
  [TokenType.CCIP_LNM]: "CCIP-LnM"
};

type ModalScreen = 'payment' | 'insufficient-balance';

export default function PaymentModal({ isOpen, onClose, recipientUser, amount, onConfirm }: PaymentModalProps) {
  const [sourceChain, setSourceChain] = useState<string>("");
  const [tokenType, setTokenType] = useState<TokenType | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<string>("");
  const [currentChainId, setCurrentChainId] = useState<string>("");
  const [currentScreen, setCurrentScreen] = useState<ModalScreen>('payment');
  const [balanceInfo, setBalanceInfo] = useState<any>(null);
  const [onrampUrl, setOnrampUrl] = useState<string>("");
  
  // Dynamic destination based on token type
  const getDestinationChain = (sourceChain: string, tokenType: TokenType | "") => {
    // For USDC, keep same chain for direct transfer
    if (tokenType === TokenType.USDC) {
      return sourceChain;
    }
    
    // For CCIP tokens, always deliver USDC to Base Sepolia (main settlement chain)
    return "84532"; // Base Sepolia - where recipients expect to receive USDC
  };
  
  const destinationChain = getDestinationChain(sourceChain, tokenType);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentScreen('payment');
    setBalanceInfo(null);
    setOnrampUrl("");
    onClose();
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is required for payments");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      setCurrentAccount(accounts[0]);
      setCurrentChainId(chainId);
      setWalletConnected(true);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet");
    }
  };

  const switchToChain = async (targetChainId: string) => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${parseInt(targetChainId).toString(16)}` }],
      });
      setCurrentChainId(`0x${parseInt(targetChainId).toString(16)}`);
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        const chainConfig = CHAINS[targetChainId as keyof typeof CHAINS];
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: `0x${parseInt(targetChainId).toString(16)}`,
            chainName: chainConfig.name,
            rpcUrls: [chainConfig.rpcUrl],
            nativeCurrency: chainConfig.nativeCurrency,
          }],
        });
        setCurrentChainId(`0x${parseInt(targetChainId).toString(16)}`);
      } else {
        console.error("Error switching chain:", error);
        alert("Failed to switch chain");
      }
    }
  };

  const handleConfirm = async () => {
    if (!sourceChain || tokenType === "") {
      alert("Please select source chain and token type");
      return;
    }

    if (!walletConnected) {
      await connectWallet();
      return;
    }

    // Check if on correct chain
    const expectedChainId = `0x${parseInt(sourceChain).toString(16)}`;
    if (currentChainId !== expectedChainId) {
      await switchToChain(sourceChain);
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Check token balance
      const balanceCheckResponse = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: currentAccount,
          chainId: sourceChain,
          tokenType: tokenType as TokenType,
          requiredAmount: amount
        })
      });

      const balanceResult = await balanceCheckResponse.json();
      
      // Debug: Log the balance result
      console.log('Balance check result:', balanceResult);
      
      // Check if the API returned an error
      if (balanceResult.error) {
        console.error('Balance check API error:', balanceResult.error);
        alert('Failed to check token balance: ' + balanceResult.error);
        setIsProcessing(false);
        return;
      }

      const priceDiff = balanceResult.requiredBalance - balanceResult.currentBalance;

      if (priceDiff > 0) {
        // Calculate the difference between required and current balance, rounded up to nearest cent
        const presetAmount = Math.ceil(priceDiff * 100) / 100; // Round up to nearest cent
        
        // Get onramp URL for insufficient balance screen
        const onrampResponse = await fetch('/api/onramp-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: currentAccount,
            blockchains: [sourceChain === "11155111" ? "ethereum" : sourceChain === "421614" ? "arbitrum" : "base"],
            assets: ['USDC'], // Default to USDC for onramp
            presetFiatAmount: presetAmount,
            redirectUrl: window.location.href
          })
        });

        const onrampResult = await onrampResponse.json();
        
        // Debug: Log what we're setting as balance info
        console.log('Setting balance info:', balanceResult);
        console.log('Expected fields:', {
          hasBalance: balanceResult.hasBalance,
          currentBalance: balanceResult.currentBalance,
          requiredBalance: balanceResult.requiredBalance,
          tokenSymbol: balanceResult.tokenSymbol
        });
        
        // Store balance info and onramp URL, then show insufficient balance screen
        setBalanceInfo(balanceResult);
        setOnrampUrl(onrampResult.url || "");
        setCurrentScreen('insufficient-balance');
        setIsProcessing(false);
        return;
      }

      // Step 2: Proceed with payment if balance is sufficient
      onConfirm({
        sourceChain,
        destinationChain,
        tokenType: tokenType as TokenType
      });

    } catch (error) {
      console.error('Error during payment confirmation:', error);
      alert('Error checking wallet balance. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleBuyTokens = () => {
    if (onrampUrl) {
      window.open(onrampUrl, '_blank');
    }
  };

  const handleRetryBalance = async () => {
    setIsProcessing(true);
    try {
      // Re-check balance
      const balanceCheckResponse = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: currentAccount,
          chainId: sourceChain,
          tokenType: tokenType as TokenType,
          requiredAmount: amount
        })
      });

      const balanceResult = await balanceCheckResponse.json();
      
      if (balanceResult.hasBalance) {
        // Balance is now sufficient, proceed with payment
        setCurrentScreen('payment');
        setIsProcessing(false);
        onConfirm({
          sourceChain,
          destinationChain,
          tokenType: tokenType as TokenType
        });
      } else {
        // Still insufficient, update balance info
        setBalanceInfo(balanceResult);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error rechecking balance:', error);
      setIsProcessing(false);
    }
  };

  const handleBackToPayment = () => {
    setCurrentScreen('payment');
    setBalanceInfo(null);
    setOnrampUrl("");
  };

  const availableTokens = sourceChain ? CHAINS[sourceChain as keyof typeof CHAINS].tokens : [];

  const renderPaymentScreen = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          Cross-Chain Payment
        </h2>
        <button
          onClick={handleClose}
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

          {walletConnected && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="text-sm text-green-400 font-medium">MetaMask Connected</div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
                {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
              </div>
            </div>
          )}

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
              {tokenType === TokenType.USDC && sourceChain === destinationChain ? (
                <>
                  <div className="text-sm text-[var(--color-text-primary)]">
                    • Recipient receives USDC on {CHAINS[sourceChain as keyof typeof CHAINS].name}
                  </div>
                  <div className="text-sm text-[var(--color-text-primary)]">
                    • Direct ERC20 transfer (faster & cheaper)
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-[var(--color-text-primary)]">
                    • Recipient receives USDC on {CHAINS[destinationChain as keyof typeof CHAINS]?.name || "Base Sepolia"}
                  </div>
                  <div className="text-sm text-[var(--color-text-primary)]">
                    • Cross-chain conversion via Chainlink CCIP
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    {TOKEN_NAMES[tokenType as TokenType]} on {CHAINS[sourceChain as keyof typeof CHAINS]?.name} → USDC on {CHAINS[destinationChain as keyof typeof CHAINS]?.name}
                  </div>
                </>
              )}
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
            disabled={(!sourceChain || tokenType === "") && walletConnected || isProcessing}
            className="flex-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white py-3 rounded-lg font-semibold hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isProcessing ? "Processing..." : 
             !walletConnected ? "Connect MetaMask" :
             currentChainId !== `0x${parseInt(sourceChain || "0").toString(16)}` && sourceChain ? 
               `Switch to ${CHAINS[sourceChain as keyof typeof CHAINS]?.name}` :
             "Confirm Payment"}
          </button>
        </div>
      </>
    );

  const renderInsufficientBalanceScreen = () => {
    // Debug: Log balance info when rendering
    console.log('Rendering insufficient balance screen with balanceInfo:', balanceInfo);
    
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Insufficient Balance
          </h2>
        <button
          onClick={handleClose}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6 mb-6">
        {/* Balance Status */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Not Enough {balanceInfo?.tokenSymbol}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            You need more tokens to complete this payment
          </p>
        </div>

        {/* Balance Details */}
        <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-[var(--color-text-muted)]">Required:</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {balanceInfo?.requiredBalance || 'N/A'} {balanceInfo?.tokenSymbol || 'Token'}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-[var(--color-text-muted)]">Current:</span>
            <span className="font-semibold text-red-400">
              {balanceInfo?.currentBalance || '0'} {balanceInfo?.tokenSymbol || 'Token'}
            </span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-muted)]">Need:</span>
              <span className="font-bold text-[var(--color-primary)]">
                {(parseFloat(balanceInfo?.requiredBalance || "0") - parseFloat(balanceInfo?.currentBalance || "0")).toFixed(6)} {balanceInfo?.tokenSymbol || 'Token'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-sm text-[var(--color-text-muted)] mb-2">Payment Details:</div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[var(--color-text-primary)]">To:</span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{recipientUser.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--color-text-primary)]">Amount:</span>
            <span className="text-lg font-bold text-[var(--color-primary)]">${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Buy Tokens Button */}
        {onrampUrl && (
          <button
            onClick={handleBuyTokens}
            className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white py-3 rounded-lg font-semibold hover:scale-105 transition-all duration-200"
          >
            Buy {balanceInfo?.tokenSymbol} with Coinbase
          </button>
        )}

        {/* Check Balance Again Button */}
        <button
          onClick={handleRetryBalance}
          disabled={isProcessing}
          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] py-3 rounded-lg font-semibold hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
        >
          {isProcessing ? "Checking..." : "Check Balance Again"}
        </button>

        {/* Back Button */}
        <button
          onClick={handleBackToPayment}
          className="w-full text-[var(--color-text-muted)] py-2 text-sm hover:text-[var(--color-text-primary)] transition-colors"
        >
          ← Back to Payment
        </button>
      </div>
    </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 max-w-md w-full mx-4">
        {currentScreen === 'payment' ? renderPaymentScreen() : renderInsufficientBalanceScreen()}
      </div>
    </div>
  );
}