import { useEffect, useState } from "react";
import { Payment } from "@/lib/interface";

export function usePayments(walletAddress: string) {
  const [youOwe, setYouOwe] = useState<Payment[]>([]);
  const [owedToYou, setOwedToYou] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    fetch(`/api/payments?walletAddress=${walletAddress}`)
      .then((res) => res.json())
      .then((data) => {
        setYouOwe(data.asSender || []);
        setOwedToYou(data.asRecipient || []);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return { youOwe, owedToYou, loading, error };
}
