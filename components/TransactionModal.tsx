"use client";

interface TransactionModalProps {
  isOpen: boolean;
  status: string;
  step: number;
  totalSteps: number;
  txHash?: string;
}

const STEP_NAMES = [
  "Initializing",
  "Connecting Wallet",
  "Token Approval",
  "Cross-Chain Transaction",
  "Completed",
];

export default function TransactionModal({
  isOpen,
  status,
  step,
  totalSteps,
  txHash,
}: TransactionModalProps) {
  if (!isOpen) return null;

  const progress = (step / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="w-16 h-16 border-4 border-[var(--color-border)] rounded-full"></div>
            <div
              className="absolute top-0 left-0 w-16 h-16 border-4 border-[var(--color-primary)] rounded-full border-t-transparent animate-spin"
              style={{ animationDuration: "1s" }}
            ></div>
          </div>

          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            Processing Transaction
          </h2>

          <p className="text-[var(--color-text-secondary)] mb-4">{status}</p>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-2 mb-4">
            <div
              className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Steps */}
          <div className="space-y-2 mb-4">
            {STEP_NAMES.slice(1).map((stepName, index) => {
              const stepNumber = index + 1;
              const isCompleted = step > stepNumber;
              const isCurrent = step === stepNumber;

              return (
                <div key={stepNumber} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : isCurrent
                        ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-2 border-[var(--color-primary)]"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? "✓" : stepNumber}
                  </div>
                  <span
                    className={`text-sm ${
                      isCompleted || isCurrent
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {stepName}
                  </span>
                </div>
              );
            })}
          </div>

          {txHash && (
            <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-3 mt-4">
              <div className="text-sm text-[var(--color-text-muted)] mb-1">
                Transaction Hash:
              </div>
              <div className="text-xs font-mono text-[var(--color-text-primary)] break-all">
                {txHash}
              </div>
            </div>
          )}

          {/* {step === totalSteps && (
            <div className="mt-4">
              <div className="text-green-400 text-4xl mb-2">✅</div>
              <div className="text-[var(--color-text-primary)] font-semibold">
                Payment Successful!
              </div>
              <div className="text-sm text-[var(--color-text-muted)] mt-1">
                USDC will be delivered to recipient on Base Sepolia
              </div>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}
