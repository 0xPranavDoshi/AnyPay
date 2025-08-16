import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { Payment } from "@/lib/interface";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL!;
const dbName = process.env.MONGODB_DB_NAME || 'users';

async function getPaymentsForUser(userAddress: string): Promise<Payment[]> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("payments");

  // Find payments where user is either a sender or recipient (support both formats)
  const payments = await collection.find({
    $or: [
      { "recipients.user.walletAddress": { $regex: new RegExp(userAddress, "i") } },
      { "senders.user.walletAddress": { $regex: new RegExp(userAddress, "i") } },
      { "payer.walletAddress": { $regex: new RegExp(userAddress, "i") } },
      { "owers.user.walletAddress": { $regex: new RegExp(userAddress, "i") } }
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
        // Check if payment has been completed (has successful cross-chain transactions)
        const hasCompletedTransaction = payment.crossChainPayments && 
          payment.crossChainPayments.some((ccip: any) => 
            ccip.status === "COMPLETED" && ccip.txHash
          );

        // Handle new payment format (payer/owers)
        if ('payer' in payment && 'owers' in payment) {
          const owersArray = Array.isArray(payment.owers) ? payment.owers : [];
          
          // Check if user owes money (user is in owers array)
          const userOwes = owersArray.find(ower => 
            ower.user.walletAddress.toLowerCase() === userAddress.toLowerCase()
          );
          
          if (userOwes) {
            // If payment is completed, add to paidPayments, otherwise to youOwe
            if (hasCompletedTransaction && payment.crossChainPayments) {
              const completedTx = payment.crossChainPayments.find((ccip: any) => 
                ccip.status === "COMPLETED" && ccip.txHash
              );
              
              if (completedTx) {
                dashboardData.paidPayments.push({
                  paymentId: payment._id,
                  recipientUser: payment.payer,
                  amount: userOwes.amount,
                  description: payment.description || "Payment",
                  txHash: completedTx.txHash,
                  messageId: completedTx.messageId,
                  sourceChain: completedTx.sourceChain,
                  destinationChain: completedTx.destinationChain,
                  tokenType: completedTx.tokenType || 0,
                  paidAt: completedTx.timestamp || payment.updatedAt || new Date()
                });
              }
            } else {
              dashboardData.youOwe.push({
                paymentId: payment._id,
                user: payment.payer,
                amount: userOwes.amount,
                description: payment.description || "Payment",
                crossChainPayments: payment.crossChainPayments || []
              });
            }
          }
          
          // Check if user is owed money (user is the payer)
          if (payment.payer && payment.payer.walletAddress.toLowerCase() === userAddress.toLowerCase()) {
            owersArray.forEach(ower => {
              dashboardData.owedToYou.push({
                paymentId: payment._id,
                user: ower.user,
                amount: ower.amount,
                description: payment.description || "Payment",
                crossChainPayments: payment.crossChainPayments || []
              });
            });
          }
        }

        // Handle old payment format (recipients/senders) - backward compatibility
        if ('recipients' in payment && 'senders' in payment) {
          const recipientsArray = Array.isArray(payment.recipients) ? payment.recipients : [];
          const sendersArray = Array.isArray(payment.senders) ? payment.senders : [];

          // Check if user owes money (user is in senders array)
          const userSends = sendersArray.find(sender => 
            sender.user.walletAddress.toLowerCase() === userAddress.toLowerCase()
          );
          
          if (userSends) {
            recipientsArray.forEach(recipient => {
              dashboardData.youOwe.push({
                paymentId: payment._id,
                user: recipient.user,
                amount: recipient.amount,
                description: payment.description || "Payment",
                crossChainPayments: payment.crossChainPayments || []
              });
            });
          }
          
          // Check if user is owed money (user is in recipients array)
          const userReceives = recipientsArray.find(recipient => 
            recipient.user.walletAddress.toLowerCase() === userAddress.toLowerCase()
          );
          
          if (userReceives) {
            sendersArray.forEach(sender => {
              dashboardData.youOwe.push({
                paymentId: payment._id,
                user: sender.user,
                amount: sender.amount,
                description: payment.description || "Payment",
                crossChainPayments: payment.crossChainPayments || []
              });
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
