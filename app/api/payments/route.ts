import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { Payment, PaymentStatus, CrossChainPayment } from "@/lib/interface";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL!;
const dbName = process.env.MONGODB_DB_NAME || 'users';

async function getPaymentsForUser(userAddress: string): Promise<Payment[]> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection<any>("payments");

  // Find payments where user is either the payer or in the owers array
  const payments = await collection
    .find({
      $or: [
        { "payer.walletAddress": { $regex: new RegExp(userAddress, "i") } },
        { "owers.user.walletAddress": { $regex: new RegExp(userAddress, "i") } },
      ],
    })
    .sort({ createdAt: -1 })
    .toArray();

  await client.close();
  return payments as unknown as Payment[];
}

async function updatePaymentWithCrossChain(
  paymentId: string,
  crossChainData: CrossChainPayment
): Promise<void> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("payments");

  // Convert string ID to ObjectId if needed
  const query: any = ObjectId.isValid(paymentId)
    ? { _id: new ObjectId(paymentId) }
    : { _id: paymentId };

  await collection.updateOne(
    query,
    {
      $push: { crossChainPayments: crossChainData } as any,
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
        paidPayments: [] as any[],
      };

      userPayments.forEach((payment) => {
        const payer = payment.payer;
        const owers = payment.owers || [];
        if (!payer) return;

        const normalizedAddr = userAddress.toLowerCase();
        const userIsPayer =
          payer.walletAddress?.toLowerCase() === normalizedAddr;
        const userOwerEntry = owers.find(
          (o) => o.user.walletAddress?.toLowerCase() === normalizedAddr
        );

        // You Owe: current user is in owers list and payment not completed
        if (userOwerEntry && payment.status !== PaymentStatus.COMPLETED) {
          dashboardData.youOwe.push({
            paymentId: String(payment._id),
            user: payer,
            amount: userOwerEntry.amount,
            description: payment.description || "Payment",
            status: payment.status,
            crossChainPayments: payment.crossChainPayments || [],
          });
        }

        // Paid Payments: Show completed payments for the person who actually paid
        if (payment.status === PaymentStatus.COMPLETED) {
          // Case 1: Current user was the ower who paid back the debt
          if (userOwerEntry) {
            const firstCCIP = payment.crossChainPayments?.[0];
            dashboardData.paidPayments.push({
              paymentId: String(payment._id),
              from: { username: userOwerEntry.user.username, walletAddress: userOwerEntry.user.walletAddress }, // Current user (who paid)
              to: payer, // Original payer who is now receiving
              amount: userOwerEntry.amount,
              description: payment.description || "Payment",
              txHash: payment.txHash,
              paidAt: payment.paidAt || payment.updatedAt || new Date(),
              crossChainPayments: payment.crossChainPayments || [],
              tokenType: firstCCIP?.tokenType || 0,
              sourceChain: firstCCIP?.sourceChain,
              destinationChain: firstCCIP?.destinationChain,
              messageId: firstCCIP?.messageId,
            });
          }
          // Case 2: Current user was the original payer and someone paid them back  
          else if (userIsPayer) {
            const firstOwer = owers[0]?.user;
            const firstAmount = owers[0]?.amount ?? payment.totalAmount;
            const firstCCIP = payment.crossChainPayments?.[0];
            dashboardData.paidPayments.push({
              paymentId: String(payment._id),
              from: firstOwer, // Person who paid back
              to: payer, // Current user (original payer)
              amount: firstAmount,
              description: payment.description || "Payment",
              txHash: payment.txHash,
              paidAt: payment.paidAt || payment.updatedAt || new Date(),
              crossChainPayments: payment.crossChainPayments || [],
              tokenType: firstCCIP?.tokenType || 0,
              sourceChain: firstCCIP?.sourceChain,
              destinationChain: firstCCIP?.destinationChain,
              messageId: firstCCIP?.messageId,
            });
          }
        }

        // Owed To You: current user is the payer and others owe them (not completed)
        if (userIsPayer && payment.status !== PaymentStatus.COMPLETED) {
          owers.forEach((o) => {
            dashboardData.owedToYou.push({
              paymentId: String(payment._id),
              user: o.user,
              amount: o.amount,
              description: payment.description || "Payment",
              status: payment.status,
              crossChainPayments: payment.crossChainPayments || [],
            });
          });
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
    const { paymentId, crossChainData } = (await req.json()) as {
      paymentId: string;
      crossChainData: CrossChainPayment;
    };

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
