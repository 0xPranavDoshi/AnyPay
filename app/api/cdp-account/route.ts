export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { CdpClient } from "@coinbase/cdp-sdk";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { toAccount } from "viem/accounts";

export async function POST(request: NextRequest) {
  try {
    const { name, payload } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      );
    }

    // Create CDP client server-side where Node.js is available
    const cdp = new CdpClient({
      apiKeyId: process.env.NEXT_PUBLIC_CDP_API_KEY_ID,
      apiKeySecret: process.env.NEXT_PUBLIC_CDP_API_KEY_SECRET,
      walletSecret: process.env.NEXT_PUBLIC_CDP_WALLET_SECRET,
    });

    const owner = await cdp.evm.getOrCreateAccount({
      name: name,
    });

    const cdpAccount = await cdp.evm.getOrCreateAccount({
      name: "AnyPayServerWallet",
    });

    const account: any = toAccount(cdpAccount);

    const fetchWithPayment = wrapFetchWithPayment(fetch, account);

    console.log("payload", payload);

    const response = await fetchWithPayment("http://localhost:3000/api/agent", {
      //url should be something like https://api.example.com/paid-endpoint
      method: "POST",
      body: JSON.stringify(payload),
    });

    // console.log("response", response);

    if (!response.ok) {
      return NextResponse.json(
        { error: "X402 Payment Failed" },
        { status: 500 }
      );
    }

    const paymentResponse = decodeXPaymentResponse(
      response.headers.get("x-payment-response")!
    );
    console.log("paymentResponse", paymentResponse);

    console.log("response", response);

    return response;
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
