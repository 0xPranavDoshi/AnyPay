import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { Payment, PaymentStatus } from "@/lib/interface";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL!;
const dbName = process.env.MONGODB_DB_NAME || 'users';

async function getPaymentsForUser(userAddress: string): Promise<Payment[]> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("payments");


  // Only find payments where user is either a payer or ower (new structure only)
  const payments = await collection.find({
    $or: [
      { "payer.walletAddress": { $regex: new RegExp(userAddress, "i") } },
      { "ower.walletAddress": { $regex: new RegExp(userAddress, "i") } }
    ]
  }).sort({ createdAt: -1 }).toArray();

  await client.close();
  return payments as unknown as Payment[];
}

async function updatePaymentWithCrossChain(paymentId: string, crossChainData: any): Promise<void> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("payments");

  // Convert string ID to ObjectId if needed
  let query: any;
  try {
    const { ObjectId } = require('mongodb');
    query = typeof paymentId === 'string' && paymentId.length === 24
      ? { _id: new ObjectId(paymentId) }
      : { _id: paymentId };
  } catch (error) {
    query = { _id: paymentId };
  }

  await collection.updateOne(
    query,
    {
      $push: { crossChainPayments: crossChainData },
      $set: { updatedAt: new Date() }
    }
  );

  await client.close();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const userAddress = searchParams.get('userAddress');

  // Support both username and wallet address queries
  if (!username && !userAddress) {
    return NextResponse.json({ error: 'Missing username or userAddress' }, { status: 400 });
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const payments = db.collection('payments');

    if (userAddress) {
      // New wallet-based query for dashboard
      await client.close();

      const userPayments = await getPaymentsForUser(userAddress);

      // Transform payments to dashboard format
      const dashboardData = {
        youOwe: [] as any[],
        owedToYou: [] as any[],
        paidPayments: [] as any[]
      };

      userPayments.forEach(payment => {
        // Only use new structure: individual payment records
        if (!payment.payer || !payment.ower || !payment.payer.walletAddress || !payment.ower.walletAddress) {
          // Skip payments that do not have the new structure
          return;
        }
        const userIsOwer = payment.ower.walletAddress.toLowerCase() === userAddress.toLowerCase();
        const userIsPayer = payment.payer.walletAddress.toLowerCase() === userAddress.toLowerCase();

        if (userIsOwer) {
          // User owes money to someone
          if (payment.status !== PaymentStatus.COMPLETED) {
            // Payment is unpaid or pending
            dashboardData.youOwe.push({
              paymentId: payment._id,
              user: payment.payer, // Show payer info for 'You Owe'
              amount: payment.amount,
              description: payment.description || "Payment",
              status: payment.status,
              crossChainPayments: payment.crossChainPayments || []
            });
          }
        }

        if (userIsPayer && payment.status === PaymentStatus.COMPLETED) {
          // User paid someone else
          dashboardData.paidPayments.push({
            paymentId: payment._id,
            from: payment.payer, // payer is the sender
            to: payment.ower,    // ower is the recipient
            amount: payment.amount,
            description: payment.description || "Payment",
            txHash: payment.txHash,
            paidAt: payment.paidAt || payment.updatedAt || new Date()
          });
        }

        if (userIsPayer) {
          // Someone owes money to user
          if (payment.status !== PaymentStatus.COMPLETED) {
            dashboardData.owedToYou.push({
              paymentId: payment._id,
              user: payment.ower, // Show ower info for 'Owed To You'
              amount: payment.amount,
              description: payment.description || "Payment",
              status: payment.status,
              crossChainPayments: payment.crossChainPayments || []
            });
          }
        }
      });

      return NextResponse.json(dashboardData);
    } else {
      // Original username-based query (backward compatibility)
      const recipientQuery = { 'recipient.username': username };
      const asRecipient = await payments.find(recipientQuery).toArray();

      const senderQuery = { 'senders.user.username': username };
      const asSender = await payments.find(senderQuery).toArray();

      await client.close();
      return NextResponse.json({ asRecipient, asSender });
    }
  } catch (e) {
    console.error("Error fetching payments:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { paymentId, crossChainData } = await req.json();

    if (!paymentId || !crossChainData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await updatePaymentWithCrossChain(paymentId, crossChainData);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
