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
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Test provider connection
    try {
      await provider.getNetwork();
      console.log("Provider connected successfully");
    } catch (networkError) {
      console.error("Provider connection failed:", networkError);
      throw new Error(`Failed to connect to ${sourceChain} network`);
    }
    
    // Wait for transaction confirmation with timeout
    console.log(`Waiting for transaction: ${txHash}`);
    const receipt = await provider.waitForTransaction(txHash, 1, 30000); // 30 second timeout
    
    if (!receipt) {
      throw new Error("Transaction not found or failed");
    }

    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

    // Extract messageId from transaction logs (CCIP message ID)
    let messageId = "";
    for (const log of receipt.logs) {
      try {
        // Look for CCIP message ID in logs (bytes32 value)
        if (log.topics.length > 1 && log.topics[1] && log.topics[1].length === 66) {
          messageId = log.topics[1];
          break;
        }
      } catch (error) {
        // Continue if log parsing fails
      }
    }

    // Create cross-chain payment data to save to payments collection
    const crossChainData = {
      messageId: messageId || "pending",
      txHash: receipt.transactionHash,
      sourceChain,
      destinationChain: "84532", // Base Sepolia
      status: PaymentStatus.COMPLETED,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date(),
      ccipExplorerUrl: `https://ccip.chain.link/msg/${messageId || receipt.transactionHash}`
    };

    console.log("Saving cross-chain data:", crossChainData);

    // Update the payment with cross-chain data
    await updatePaymentWithCrossChain(paymentId, crossChainData);

    return NextResponse.json({
      success: true,
      paymentId,
      txHash: receipt.transactionHash,
      messageId,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
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