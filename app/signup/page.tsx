"use client";

import Image from "next/image";
import { useState } from "react";
import { setCookie } from "@/utils/cookie";

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function SignUp() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCreatingEmbeddedWallet, setIsCreatingEmbeddedWallet] =
    useState(false);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError("");

      // Check if MetaMask is installed
      if (typeof window.ethereum !== "undefined") {
        // Request account access
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const account = accounts[0];

        if (account) {
          setWalletAddress(account);
          console.log("Wallet connected:", account);
        }
      } else {
        // MetaMask not installed, prompt user to install
        setError("Please install MetaMask to connect your wallet!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const createEmbeddedWallet = async () => {
    try {
      setIsCreatingEmbeddedWallet(true);
      setError("");

      // Simulate embedded wallet creation
      // In a real implementation, this would call your backend API
      const mockWalletAddress =
        "0x" +
        Array.from({ length: 40 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("");

      setWalletAddress(mockWalletAddress);
      setSuccess("Embedded wallet created successfully!");
      console.log("Embedded wallet created:", mockWalletAddress);
    } catch (error) {
      console.error("Error creating embedded wallet:", error);
      setError("Failed to create embedded wallet. Please try again.");
    } finally {
      setIsCreatingEmbeddedWallet(false);
    }
  };

  const handleSignUp = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          walletAddress: walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // Signup successful - store user in cookie and redirect
      setCookie("user", JSON.stringify(data.user));
      setSuccess("Account created successfully! Redirecting to dashboard...");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (error) {
      console.error("Signup error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Signup failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-['Poppins',Inter,'SF_Pro_Display',system-ui,sans-serif]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(15,15,35,0.9)] backdrop-blur-[20px] border-b border-[var(--color-border)] px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="animate-bounce-in flex items-center gap-3">
            <Image
              src="/anypay-logo.svg"
              alt="AnyPay Logo"
              width={60}
              height={60}
              className="h-10 w-10 hover:scale-105 transition-transform duration-300"
            />
            <span className="text-2xl font-bold text-[var(--color-primary)] tracking-tight">
              AnyPay
            </span>
          </div>
          <a
            href="/"
            className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-primary)]/30 text-[var(--color-primary)] px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-200 hover:shadow-sm hover:shadow-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 cursor-pointer"
          >
            Back to Home
          </a>
        </div>
      </nav>

      {/* Sign Up Section */}
      <section className="h-screen flex items-center justify-center px-8 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          {/* Floating geometric shapes */}
          <div className="absolute top-20 left-10 w-16 h-16 border border-[var(--color-primary)]/20 rounded-lg rotate-45 animate-pulse"></div>
          <div className="absolute top-32 right-20 w-8 h-8 bg-[var(--color-primary)]/10 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-40 left-1/3 w-12 h-12 border border-[var(--color-primary)]/15 rounded-full animate-pulse delay-2000"></div>
          <div className="absolute top-24 right-1/4 w-10 h-10 border border-[var(--color-primary)]/25 rounded-lg rotate-12 animate-pulse delay-1500"></div>
          <div className="absolute top-48 left-1/5 w-6 h-6 bg-[var(--color-primary)]/15 rounded-full animate-pulse delay-3000"></div>

          {/* Gradient orbs */}
          <div className="absolute bottom-40 right-10 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-xl animate-pulse delay-1500"></div>
          <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/15 to-transparent rounded-full blur-xl animate-pulse delay-500"></div>
          <div className="absolute bottom-32 right-1/3 w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-full blur-xl animate-pulse delay-2500"></div>
          <div className="absolute bottom-48 left-1/2 w-12 h-12 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>

          {/* Network connection lines */}
          <div className="absolute top-1/4 left-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
          <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent"></div>
          <div className="absolute top-2/3 right-1/4 w-px h-20 bg-gradient-to-b from-transparent via-[var(--color-primary)]/15 to-transparent"></div>

          {/* Floating dots with different sizes */}
          <div className="absolute top-16 left-1/2 w-2 h-2 bg-[var(--color-primary)]/30 rounded-full animate-pulse delay-500"></div>
          <div className="absolute top-28 right-16 w-1.5 h-1.5 bg-[var(--color-primary)]/25 rounded-full animate-pulse delay-2000"></div>
          <div className="absolute top-36 left-16 w-1 h-1 bg-[var(--color-primary)]/20 rounded-full animate-pulse delay-3500"></div>
          <div className="absolute top-52 right-1/2 w-2.5 h-2.5 bg-[var(--color-primary)]/35 rounded-full animate-pulse delay-1000"></div>

          {/* Diagonal lines */}
          <div className="absolute top-20 left-1/3 w-20 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent transform rotate-45 origin-left"></div>
          <div className="absolute top-32 right-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent transform -rotate-45 origin-right"></div>
        </div>

        <div className="w-[40%] mt-16 mx-auto text-center relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="animate-fade-in-up text-[clamp(2rem,5vw,3rem)] font-extrabold mb-4 leading-tight tracking-tight">
              <span className="text-[var(--color-text-primary)] relative">
                Welcome to AnyPay
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
              </span>
            </h1>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="animate-fade-in-up mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="animate-fade-in-up mb-4 p-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Sign Up Form */}
          <div className="animate-fade-in-up stagger-2 bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-4 mb-4">
            {/* Username Field */}
            <div className="mb-3 text-left">
              <label
                htmlFor="username"
                className="block text-[var(--color-text-primary)] font-semibold mb-1 text-left"
              >
                Choose Your Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl px-4 py-2.5 text-lg transition-all duration-300 focus:border-[var(--color-primary)] focus:shadow-lg focus:shadow-[var(--color-primary)]/20 focus:outline-none focus:scale-[1.02]"
              />
            </div>

            {/* Password Field */}
            <div className="mb-3 text-left">
              <label
                htmlFor="password"
                className="block text-[var(--color-text-primary)] font-semibold mb-1 text-left"
              >
                Create Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl px-4 py-2.5 text-lg transition-all duration-300 focus:border-[var(--color-primary)] focus:shadow-lg focus:shadow-[var(--color-primary)]/20 focus:outline-none focus:scale-[1.02]"
              />
            </div>

            {/* Wallet Connection */}
            <div className="mb-4">
              <h3 className="text-[var(--color-text-primary)] font-semibold mb-2 text-left">
                Connect Your Wallet
              </h3>
              {walletAddress ? (
                <div className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl px-4 py-2.5 text-sm font-medium text-center">
                  Connected: {walletAddress.slice(0, 6)}...
                  {walletAddress.slice(-4)}
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="group relative cursor-pointer overflow-hidden w-full bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-primary)]/30 text-[var(--color-primary)] px-8 py-2.5 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-sm hover:shadow-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                      </svg>
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </span>
                  </button>

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

                  <button
                    onClick={createEmbeddedWallet}
                    disabled={isCreatingEmbeddedWallet}
                    className="group relative cursor-pointer overflow-hidden w-full bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-8 py-2.5 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <Image
                        src="/partners/coinbase.png"
                        alt="Coinbase"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                      {isCreatingEmbeddedWallet
                        ? "Creating..."
                        : "Create Coinbase Embedded Wallet"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </div>
              )}
              <p className="text-[var(--color-text-muted)] text-sm mt-1.5 text-left">
                Connect any Web3 wallet or create a new embedded wallet.
              </p>
            </div>

            {/* Sign Up Button */}
            <div className="mb-3">
              <button
                onClick={handleSignUp}
                disabled={
                  isSubmitting ||
                  !username.trim() ||
                  !walletAddress ||
                  !password.trim()
                }
                className="group cursor-pointer relative overflow-hidden w-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--color-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10">
                  {isSubmitting ? "Creating Account..." : "Sign Up"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="animate-fade-in-up stagger-3">
            <p className="text-[var(--color-text-secondary)] text-base">
              Already have an account?{" "}
              <span className="text-[var(--color-primary)] cursor-pointer hover:underline font-semibold">
                <a href="/login">Sign in here</a>
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
