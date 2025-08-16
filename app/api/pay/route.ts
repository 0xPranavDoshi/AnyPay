import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { MongoClient } from "mongodb";
import { CrossChainPayment, PaymentStatus, TokenType } from "@/lib/interface";

// Contract addresses from deployment
const CONTRACT_ADDRESSES = {
  "11155111": "0xf3d63a2De78d34A875c7578c979d4cfa11c5E32b", // Ethereum Sepolia
  "421614": "0x1F8BeBCaEbf0d2e59e800e8c41888c41fCD3d0cf",   // Arbitrum Sepolia  
  "84532": "0x8398302f3E48eE7BcA257c9a13f9661d5F2C1c60"     // Base Sepolia
};

// Chain selectors for CCIP
const CHAIN_SELECTORS = {
  "11155111": "16015286601757825753", // Ethereum Sepolia
  "421614": "3478487238524512106",    // Arbitrum Sepolia
  "84532": "10344971235874465080"     // Base Sepolia
};

// Token addresses
const TOKEN_ADDRESSES = {
  "11155111": {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Fixed USDC address for Ethereum Sepolia
    CCIP_BNM: "0x84F1bb3a3D82c9A6CF52c87a4F8dD5Ee5d23b4Fb",
    CCIP_LNM: "0x466D489b6d36E7E3b824ef491C225F5830E81cC1"
  },
  "421614": {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", 
    CCIP_BNM: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D",
    CCIP_LNM: "0x139E99f0ab4084E14e6bb7DacA289a91a2d92927"
  },
  "84532": {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    CCIP_BNM: "0x88A2d74F47a237a62e7A51cdDa67270CE381555e",
    CCIP_LNM: "0xF1623862e4c9f9Fba1Ac0181C4fF53B4f958F065"
  }
};

// RPC URLs - matching testing folder configuration
const RPC_URLS = {
  "11155111": "https://ethereum-sepolia-rpc.publicnode.com",
  "421614": "https://sepolia-rollup.arbitrum.io/rpc", 
  "84532": "https://sepolia.base.org"
};

// Contract ABI for payRecipient function
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "recipient", "type": "address"},
      {"internalType": "uint64", "name": "destinationChainSelector", "type": "uint64"},
      {"internalType": "address", "name": "tokenIn", "type": "address"},
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "enum CrossChainPaymentSplitterPTT.TokenType", "name": "fromToken", "type": "uint8"},
      {"internalType": "string", "name": "paymentId", "type": "string"}
    ],
    "name": "payRecipient",
    "outputs": [{"internalType": "bytes32", "name": "messageId", "type": "bytes32"}],
    "stateMutability": "payable",
    "type": "function"
  }
];

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function saveCrossChainPayment(payment: CrossChainPayment): Promise<void> {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
    throw new Error("MongoDB configuration missing");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const collection = db.collection("crosschain_payments");

  await collection.insertOne(payment);
  await client.close();
}

async function updatePaymentStatus(paymentId: string, status: PaymentStatus, messageId?: string, txHash?: string): Promise<void> {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
    throw new Error("MongoDB configuration missing");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const collection = db.collection("crosschain_payments");

  const updateData: any = { status, updatedAt: new Date() };
  if (messageId) updateData.messageId = messageId;
  if (txHash) updateData.txHash = txHash;

  await collection.updateOne({ paymentId }, { $set: updateData });
  await client.close();
}

export async function POST(req: NextRequest) {
  try {
    const { recipientAddress, amount, sourceChain, destinationChain, tokenType, userAddress, existingPaymentId } = await req.json();

    // Validate required fields
    if (!recipientAddress || !amount || !sourceChain || !destinationChain || tokenType === undefined || !userAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user from cookie (server-side)
    const cookieHeader = req.headers.get('cookie');
    let userCookie: string | null = null;
    
    if (cookieHeader) {
      const cookies = cookieHeader.split('; ').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=');
        acc[name] = decodeURIComponent(value);
        return acc;
      }, {} as Record<string, string>);
      
      userCookie = cookies['user'];
    }
    
    if (!userCookie) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userData = JSON.parse(userCookie);
    
    // Validate chain IDs and token addresses
    if (!CONTRACT_ADDRESSES[sourceChain] || !CHAIN_SELECTORS[destinationChain] || !TOKEN_ADDRESSES[sourceChain]) {
      return NextResponse.json(
        { error: "Invalid chain selection" },
        { status: 400 }
      );
    }

    // Use existing payment ID if provided, otherwise create new one
    const paymentId = existingPaymentId || `payment-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    console.log("Payment ID:", paymentId, existingPaymentId ? "(existing)" : "(new)");

    // Get contract address  
    const contractAddress = CONTRACT_ADDRESSES[sourceChain];

    // Get token address based on token type
    let tokenAddress = "";
    if (tokenType === TokenType.USDC) {
      tokenAddress = TOKEN_ADDRESSES[sourceChain].USDC;
    } else if (tokenType === TokenType.CCIP_BNM) {
      tokenAddress = TOKEN_ADDRESSES[sourceChain].CCIP_BNM;
    } else if (tokenType === TokenType.CCIP_LNM) {
      tokenAddress = TOKEN_ADDRESSES[sourceChain].CCIP_LNM;
    } else {
      return NextResponse.json(
        { error: "Invalid token type" },
        { status: 400 }
      );
    }

    // Convert amount to correct decimals based on token type
    let amountWei;
    if (tokenType === TokenType.USDC) {
      // USDC has 6 decimals
      amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    } else {
      // CCIP-BnM and CCIP-LnM have 18 decimals
      amountWei = ethers.utils.parseEther(amount.toString());
    }

    // Store payment details for cross-chain transaction
    // If existingPaymentId is provided, this will update that payment's crossChainPayments array
    // Otherwise this creates a new payment flow
    console.log("Prepared cross-chain payment:", {
      paymentId,
      existingPayment: !!existingPaymentId,
      fromUser: userData.username,
      toUser: recipientAddress,
      amount: parseFloat(amount),
      sourceChain,
      destinationChain,
      tokenType
    });

    // Return transaction parameters for MetaMask to sign
    return NextResponse.json({
      success: true,
      message: "Transaction parameters ready",
      paymentId,
      transactionParams: {
        contractAddress,
        tokenAddress,
        amountWei: amountWei.toString(),
        recipientAddress,
        destinationChainSelector: CHAIN_SELECTORS[destinationChain],
        tokenType,
        gasLimit: "250000"
      },
      status: PaymentStatus.PENDING
    });

  } catch (error) {
    console.error("Payment error:", error);
    
    // Try to update payment status to failed if we have the payment ID
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Payment failed", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve payment status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");
    const userAddress = searchParams.get("userAddress");

    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
      throw new Error("MongoDB configuration missing");
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("crosschain_payments");

    let query: any = {};
    if (paymentId) {
      query.paymentId = paymentId;
    } else if (userAddress) {
      query.$or = [
        { "fromUser.walletAddress": userAddress },
        { "toUser.walletAddress": userAddress }
      ];
    } else {
      await client.close();
      return NextResponse.json(
        { error: "Either paymentId or userAddress is required" },
        { status: 400 }
      );
    }

    const payments = await collection.find(query).toArray();
    await client.close();

    return NextResponse.json({ payments });

  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}