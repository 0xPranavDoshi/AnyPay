"use client";
import { useState } from "react";

export default function OnrampTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replace with a test wallet address you control
  const testAddress = "0x000000000000000000000000000000000000dead";

  const handleOnramp = async () => {
    setLoading(true);
    setError(null);
    const reqBody = {
      address: testAddress,
      blockchains: ["base"],
      assets: ["USDC"],
      redirectUrl: window.location.origin + "/dashboard"
    };
    console.log("[OnrampTest] Sending request to /api/onramp-url", reqBody);
    try {
      const res = await fetch("/api/onramp-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      console.log("[OnrampTest] Response status:", res.status);
      const data = await res.json();
      console.log("[OnrampTest] Response data:", data);
      if (!res.ok) throw new Error(data.error || "Unknown error");
      window.open(data.url, "_blank");
    } catch (e: any) {
      console.error("[OnrampTest] Error:", e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 12 }}>
      <h2>Coinbase Onramp Test</h2>
      <p>This page lets you test the Coinbase Onramp flow without completing a real transaction.</p>
      <button onClick={handleOnramp} disabled={loading} style={{ padding: "12px 32px", fontSize: 18, borderRadius: 8, background: "#1652f0", color: "#fff", border: 0, cursor: "pointer", marginTop: 16 }}>
        {loading ? "Loading..." : "Trigger Onramp"}
      </button>
      {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
    </div>
  );
}
