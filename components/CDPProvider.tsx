"use client";

import { type Config } from "@coinbase/cdp-hooks";
import {
  CDPReactProvider,
  type AppConfig,
} from "@coinbase/cdp-react/components/CDPReactProvider";

interface CDPProviderProps {
  children: React.ReactNode;
}

const CDP_CONFIG: Config = {
  projectId: process.env.NEXT_PUBLIC_COINBASE_PROJECT_ID ?? "",
};

const APP_CONFIG: AppConfig = {
  name: "AnyPay",
  logoUrl: "/anypay-logo.svg",
  authMethods: ["email", "sms"],
};

/**
 * CDP Provider component that wraps the application in the CDP context
 */
export default function CDPProvider({ children }: CDPProviderProps) {
  return (
    <CDPReactProvider config={CDP_CONFIG} app={APP_CONFIG}>
      {children}
    </CDPReactProvider>
  );
}
