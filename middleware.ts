import { Address } from "viem";
import { paymentMiddleware, Network, Resource } from "x402-next";

const facilitatorUrl = "https://x402.org/facilitator" as Resource;
const payTo = "0x8D5470Dd39eC0933A0CCAEd0652E80ce891c4225" as Address;
const network = "base-sepolia" as Network;

export const middleware = paymentMiddleware(
  payTo,
  {
    // Route configurations for protected endpoints
    "/api/agent": {
      price: "$0.01",
      network: "base-sepolia", // for mainnet, see Running on Mainnet section
      config: {
        description: "Access to protected content",
      },
    },
  },
  {
    url: "https://x402.org/facilitator", // for testnet
  }
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/agent/:path*"],
};
