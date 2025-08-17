import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { PaymentStatus } from "@/lib/interface";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL!;
const dbName = process.env.MONGODB_DB_NAME || 'users';

export async function POST(req: NextRequest) {
  try {
    const { paymentId, txHash, sourceChain, recipientAddress, amount, tokenType, payer } = await req.json();

    if (!paymentId || !txHash || !sourceChain || !recipientAddress || !amount || !payer) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection("payments");

      // Get explorer URL
      const explorerUrl = sourceChain === "84532" 
        ? "https://sepolia.basescan.org/tx/" 
        : sourceChain === "421614" 
        ? "https://sepolia.arbiscan.io/tx/" 
        : "https://sepolia.etherscan.io/tx/";

      // Create a completed payment record for same-chain USDC transfer
      const crossChainData = {
        messageId: "direct-transfer",
        txHash: txHash,
        sourceChain,
        destinationChain: sourceChain, // Same chain
        status: PaymentStatus.COMPLETED,
        blockNumber: "confirmed",
        gasUsed: "pending",
        timestamp: new Date(),
        tokenType: tokenType,
        ccipExplorerUrl: `${explorerUrl}${txHash}`
      };

      const paymentRecord = {
        _id: paymentId,
        payer: payer,
        owers: [{
          user: { walletAddress: recipientAddress },
          amount: amount
        }],
        totalAmount: amount,
        description: "Direct USDC Transfer",
        status: PaymentStatus.COMPLETED, // Mark as completed so it shows in Paid section
        txHash: txHash, // Include transaction hash
        crossChainPayments: [crossChainData],
        paidAt: new Date(), // Set paidAt timestamp
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Try to insert the payment record
      await collection.insertOne(paymentRecord);
      console.log("Created payment record for same-chain transfer:", paymentId);

      return NextResponse.json({
        success: true,
        paymentId,
        txHash,
        status: PaymentStatus.COMPLETED
      });

    } catch (error) {
      console.error("MongoDB operation failed:", error);
      throw error;
    } finally {
      await client.close();
    }

  } catch (error) {
    console.error("Payment recording error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Payment recording failed", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}