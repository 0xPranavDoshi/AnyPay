import { NextRequest, NextResponse } from "next/server";
import { checkTokenBalance, getTokenSymbol } from "@/utils/tokenBalance";
import { TokenType } from "@/lib/interface";

export async function POST(req: NextRequest) {
  try {
    const { userAddress, chainId, tokenType, requiredAmount } = await req.json();

    // Validate inputs
    if (!userAddress || !chainId || tokenType === undefined || !requiredAmount) {
      return NextResponse.json(
        { error: "Missing required parameters: userAddress, chainId, tokenType, requiredAmount" },
        { status: 400 }
      );
    }

    // Check token balance
    const balanceResult = await checkTokenBalance(
      userAddress,
      chainId,
      tokenType as TokenType,
      requiredAmount
    );

    // Add token symbol for display
    const tokenSymbol = getTokenSymbol(tokenType as TokenType);

    return NextResponse.json({
      hasBalance: balanceResult.hasBalance,
      currentBalance: balanceResult.currentBalance,
      requiredBalance: balanceResult.requiredBalance,
      tokenAddress: balanceResult.tokenAddress,
      tokenSymbol,
      chainId
    });

  } catch (error) {
    console.error("Error checking token balance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check token balance" },
      { status: 500 }
    );
  }
}
