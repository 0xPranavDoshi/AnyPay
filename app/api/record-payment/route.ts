import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { PaymentStatus } from "@/lib/interface";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL!;
const dbName = process.env.MONGODB_DB_NAME || 'users';

// Helper function to lookup user by wallet address
async function lookupUserByWallet(walletAddress: string) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('users'); // Users are in 'users' db, profiles collection
    const profilesCollection = db.collection('profiles');
    
    const user = await profilesCollection.findOne(
      { walletAddress: { $regex: new RegExp(walletAddress, "i") } },
      { projection: { username: 1, walletAddress: 1, _id: 0 } }
    );
    
    return user;
  } finally {
    await client.close();
  }
}

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

      // Look up the recipient user to get their real username
      const recipientUser = await lookupUserByWallet(recipientAddress);
      
      const paymentRecord = {
        _id: paymentId,
        payer: payer,
        owers: [{
          user: { 
            walletAddress: recipientAddress, 
            username: recipientUser?.username || recipientAddress.slice(0,6) + "..." 
          },
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

      // First try to find and update existing payment by paymentId
      const existingPaymentById = await collection.findOne({ _id: paymentId });
      
      if (existingPaymentById) {
        console.log("Found existing payment by ID to update:", existingPaymentById._id);
        
        // Update the existing payment to mark as completed
        await collection.updateOne(
          { _id: paymentId },
          { 
            $set: { 
              status: PaymentStatus.COMPLETED,
              txHash: txHash,
              paidAt: new Date(),
              updatedAt: new Date(),
              description: "Direct USDC Transfer"
            },
            $push: { crossChainPayments: crossChainData } as any
          }
        );
        
        console.log("Updated existing payment by ID to completed:", paymentId);
        
        return NextResponse.json({
          success: true,
          paymentId: paymentId,
          txHash,
          status: PaymentStatus.COMPLETED,
          updated: true
        });
      }

      // Priority: Find and update the ORIGINAL pending payment where this user owes money
      const originalPaymentQuery = {
        $and: [
          { "owers.user.walletAddress": { $regex: new RegExp(payer.walletAddress, "i") } },
          { status: PaymentStatus.PENDING },
          { totalAmount: amount }  // Match the amount being paid
        ]
      };
      
      const originalPayment = await collection.findOne(originalPaymentQuery);
      
      if (originalPayment) {
        console.log("Found ORIGINAL pending payment to update:", originalPayment._id);
        
        // Update the original payment to mark as completed
        await collection.updateOne(
          { _id: originalPayment._id },
          { 
            $set: { 
              status: PaymentStatus.COMPLETED,
              txHash: txHash,
              paidAt: new Date(),
              updatedAt: new Date(),
              description: "Direct USDC Transfer"
            },
            $push: { crossChainPayments: crossChainData } as any
          }
        );
        
        console.log("Updated ORIGINAL pending payment:", originalPayment._id);
        
        return NextResponse.json({
          success: true,
          paymentId: originalPayment._id,
          txHash,
          status: PaymentStatus.COMPLETED,
          updated: true
        });
      }

      // Fallback: try to find any pending payment where user owes money
      const existingPaymentQuery = {
        $and: [
          { "owers.user.walletAddress": { $regex: new RegExp(payer.walletAddress, "i") } },
          { status: { $ne: PaymentStatus.COMPLETED } }
        ]
      };
      
      const existingPayment = await collection.findOne(existingPaymentQuery);
      
      if (existingPayment) {
        console.log("Found existing pending payment to update:", existingPayment._id);
        
        // Update the existing payment to mark as completed
        await collection.updateOne(
          { _id: existingPayment._id },
          { 
            $set: { 
              status: PaymentStatus.COMPLETED,
              txHash: txHash,
              paidAt: new Date(),
              updatedAt: new Date(),
              description: "Direct USDC Transfer"
            },
            $push: { crossChainPayments: crossChainData } as any
          }
        );
        
        console.log("Updated existing pending payment:", existingPayment._id);
        
        return NextResponse.json({
          success: true,
          paymentId: existingPayment._id,
          txHash,
          status: PaymentStatus.COMPLETED,
          updated: true
        });
      }
      
      // Only create new record if no existing payment found at all
      await collection.insertOne(paymentRecord);
      console.log("Created new payment record for same-chain transfer:", paymentId);

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