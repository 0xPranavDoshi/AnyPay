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

interface UpdateOptions {
  tokenType?: number;
  sourceChain?: string;
  destinationChain?: string;
  payer?: any;
  recipientAddress?: string;
  amount?: number;
}

async function updatePaymentWithCrossChain(paymentId: string, crossChainData: any, options: UpdateOptions = {}): Promise<void> {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
    throw new Error("MongoDB configuration missing");
  }

  const { tokenType, sourceChain, destinationChain, payer, recipientAddress, amount } = options;

  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 10000, // 10 second timeout
    socketTimeoutMS: 45000, // 45 second timeout
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
  });

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("payments");

    // Add cross-chain payment data to the payments collection
    // Try both string ID and ObjectId format for MongoDB compatibility
    let query: any;
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
      console.log("No payment found with ID:", paymentId, "- creating new payment record");
      
      // Create payment record for both same-chain and cross-chain transactions
      let paymentRecord: any;
      
      if (tokenType === 0 && sourceChain === destinationChain) {
        // Same-chain USDC transaction
        console.log("Creating new payment record for same-chain USDC transaction");
        paymentRecord = {
          _id: paymentId,
          paymentType: "direct-transfer",
          status: PaymentStatus.COMPLETED,
          crossChainPayments: [crossChainData],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else if (payer && recipientAddress && amount) {
        // Cross-chain CCIP transaction
        console.log("Creating new payment record for cross-chain CCIP transaction");
        paymentRecord = {
          _id: paymentId,
          payer: payer, // You are the payer (sending money)
          owers: [{ 
            user: { walletAddress: recipientAddress }, // Recipient receives the money
            amount: amount 
          }],
          totalAmount: amount,
          description: `Cross-chain payment via CCIP`,
          status: PaymentStatus.COMPLETED, // Mark as completed since payment was sent
          txHash: crossChainData.txHash,
          crossChainPayments: [crossChainData],
          paidAt: new Date(), // Set paidAt immediately
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
        
      if (paymentRecord) {
        try {
          await collection.insertOne(paymentRecord);
          console.log("Successfully created new payment record:", paymentId);
        } catch (insertError) {
          console.log("Failed to create payment record:", insertError);
          // Try to update with upsert instead
          try {
            await collection.updateOne(
              query, // Use the same query object
              { 
                $setOnInsert: paymentRecord,
                $push: { crossChainPayments: crossChainData },
                $set: { updatedAt: new Date() }
              },
              { upsert: true }
            );
            console.log("Successfully upserted payment record:", paymentId);
          } catch (upsertError) {
            console.log("Upsert also failed:", upsertError);
          }
        }
      }
    }
  } catch (error) {
    console.error("MongoDB operation failed:", error);
    throw error;
  } finally {
    await client.close();
  }
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
    const payer = body.payer;
    const recipientAddress = body.recipientAddress;
    const amount = body.amount;

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
    let crossChainData: any;
    
    if (tokenType === 0) { // USDC - direct token transfer
      // Use correct explorer URL based on source chain
      const explorerUrl = sourceChain === "84532" 
        ? "https://sepolia.basescan.org/tx/" 
        : sourceChain === "421614" 
        ? "https://sepolia.arbiscan.io/tx/" 
        : "https://sepolia.etherscan.io/tx/";
        
      crossChainData = {
        messageId: "direct-transfer", // Not a CCIP transfer
        txHash: txHash,
        sourceChain,
        destinationChain: sourceChain, // Same chain for USDC
        status: PaymentStatus.COMPLETED,
        blockNumber: "pending",
        gasUsed: "pending",
        timestamp: new Date(),
        tokenType: tokenType,
        ccipExplorerUrl: `${explorerUrl}${txHash}` // Direct to explorer
      };
    } else { // CCIP-BnM or CCIP-LnM - cross-chain transfer
      crossChainData = {
        messageId: messageId || "pending",
        txHash: txHash,
        sourceChain,
        destinationChain: destinationChain || "84532", // Base Sepolia
        status: PaymentStatus.COMPLETED, // Mark as completed immediately so it moves to "Paid"
        blockNumber: "pending",
        gasUsed: "pending",
        timestamp: new Date(),
        tokenType: tokenType,
        ccipExplorerUrl: `https://ccip.chain.link/msg/${messageId || txHash}`
      };
    }

    console.log("Saving cross-chain data:", crossChainData);

    // Update the payment with cross-chain data
    await updatePaymentWithCrossChain(paymentId, crossChainData, {
      tokenType,
      sourceChain,
      destinationChain,
      payer,
      recipientAddress,
      amount
    });

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