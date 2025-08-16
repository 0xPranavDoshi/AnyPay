"use client";

import { useEffect, useState } from "react";

const X402Gateway = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Automatically complete payment when page loads
    const completePayment = async () => {
      try {
        // Simulate payment processing time
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Call the payment completion function
        await handlePaymentComplete();
      } catch (error) {
        console.error("Payment completion error:", error);
      }
    };

    completePayment();
  }, []);

  const handlePaymentComplete = async () => {
    // TODO: This would typically call your payment completion API
    // For now, just redirect back to dashboard
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-10 w-16 h-16 border border-[var(--color-primary)]/20 rounded-lg rotate-45 animate-pulse"></div>
        <div className="absolute top-32 right-20 w-8 h-8 bg-[var(--color-primary)]/10 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-40 left-1/3 w-12 h-12 border border-[var(--color-primary)]/15 rounded-full animate-pulse delay-2000"></div>
        <div className="absolute top-24 right-1/4 w-10 h-10 border border-[var(--color-primary)]/25 rounded-lg rotate-12 animate-pulse delay-1500"></div>

        {/* Gradient orbs */}
        <div className="absolute bottom-40 right-10 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-xl animate-pulse delay-1500"></div>
        <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/15 to-transparent rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute bottom-32 right-1/3 w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-full blur-xl animate-pulse delay-2500"></div>
      </div>

      {/* Main loading content */}
      <div className="text-center relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-2 animate-pulse">
            X402 Gateway
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg">
            Processing payment...
          </p>
        </div>

        {/* Loading spinner */}
        <div className="mb-8">
          <div className="relative w-24 h-24 mx-auto">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-[var(--color-primary)]/20 rounded-full"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-[var(--color-primary)] rounded-full animate-spin"></div>
            {/* Inner pulse */}
            <div className="absolute inset-2 bg-[var(--color-primary)]/10 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="w-3 h-3 bg-[var(--color-primary)] rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-[var(--color-primary)] rounded-full animate-bounce delay-100"></div>
          <div className="w-3 h-3 bg-[var(--color-primary)] rounded-full animate-bounce delay-200"></div>
        </div>

        {/* Status text */}
        <div className="text-[var(--color-text-muted)] text-sm">
          <p className="mb-2">Completing transaction...</p>
          <p className="text-xs opacity-75">
            Please wait while we process your payment
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-[var(--color-bg-secondary)] rounded-full mt-6 mx-auto overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default X402Gateway;
