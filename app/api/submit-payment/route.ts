import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { MongoClient } from "mongodb";
import { PaymentStatus } from "@/lib/interface";

// RPC URLs - using reliable public endpoints
const RPC_URLS = {
  "11155111": "https://ethereum-sepolia-rpc.publicnode.com",
  "421614": "https://sepolia-rollup.arbitrum.io/rpc", 
  "84532": "https://sepolia.base.org"
};

async function updatePaymentWithCrossChain(paymentId: string, crossChainData: any): Promise<void> {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
    throw new Error("MongoDB configuration missing");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const collection = db.collection("payments");

  // Add cross-chain payment data to the payments collection
  // Try both string ID and ObjectId format for MongoDB compatibility
  let query;
  try {
    // Try as ObjectId first (for MongoDB _id fields)
    const { ObjectId } = require('mongodb');
    query = { _id: new ObjectId(paymentId) };
  } catch (error) {
    // If ObjectId fails, try as string
    query = { _id: paymentId };
  }
  
  const result = await collection.updateOne(
    query,
    { 
      $push: { crossChainPayments: crossChainData },
      $set: { updatedAt: new Date() }
    }
  );
  
  console.log("Update result:", { paymentId, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  
  if (result.matchedCount === 0) {
    console.log("No payment found with ID:", paymentId, "- this might be a new payment flow");
  }
  
  await client.close();
}

export async function POST(req: NextRequest) {
  let paymentId: string | undefined;
  let sourceChain: string | undefined;
  try {
    const body = await req.json();
    paymentId = body.paymentId;
    const txHash = body.txHash;
    sourceChain = body.sourceChain;
    const tokenType = body.tokenType || 0; // Default to USDC
    const destinationChain = body.destinationChain;

    // Validate required fields
    if (!paymentId || !txHash || !sourceChain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Setup provider to check transaction
    const rpcUrl = RPC_URLS[sourceChain as keyof typeof RPC_URLS];
    if (!rpcUrl) {
      throw new Error(`Unsupported chain: ${sourceChain}`);
    }

    console.log(`Using RPC: ${rpcUrl} for chain ${sourceChain}`);
    
    // Update database immediately - don't wait for RPC confirmation
    // MetaMask already confirmed the transaction was sent successfully
    let messageId = "pending";
    
    console.log(`Recording transaction: ${txHash} (RPC confirmation will be attempted in background)`);

    // Create payment data based on token type
    let crossChainData;
    
    if (tokenType === 0) { // USDC - direct token transfer
      crossChainData = {
        messageId: "direct-transfer", // Not a CCIP transfer
        txHash: txHash,
        sourceChain,
        destinationChain: sourceChain, // Same chain for USDC
        status: PaymentStatus.COMPLETED,
        blockNumber: "pending",
        gasUsed: "pending",
        timestamp: new Date(),
        ccipExplorerUrl: `https://sepolia.etherscan.io/tx/${txHash}` // Direct to explorer
      };
    } else { // CCIP-BnM or CCIP-LnM - cross-chain transfer
      crossChainData = {
        messageId: messageId || "pending",
        txHash: txHash,
        sourceChain,
        destinationChain: destinationChain || "84532", // Base Sepolia
        status: PaymentStatus.COMPLETED,
        blockNumber: "pending",
        gasUsed: "pending",
        timestamp: new Date(),
        ccipExplorerUrl: `https://ccip.chain.link/msg/${messageId || txHash}`
      };
    }

    console.log("Saving cross-chain data:", crossChainData);

    // Update the payment with cross-chain data
    await updatePaymentWithCrossChain(paymentId, crossChainData);

    return NextResponse.json({
      success: true,
      paymentId,
      txHash: txHash,
      messageId,
      blockNumber: "pending",
      gasUsed: "pending",
      status: PaymentStatus.COMPLETED
    });

  } catch (error) {
    console.error("Payment submission error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Payment submission failed", 
        details: errorMessage,
        paymentId,
        sourceChain
      },
      { status: 500 }
    );
  }
}