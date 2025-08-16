import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL!;
const client = new MongoClient(uri);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 });
  }
  try {
    await client.connect();
    const db = client.db('users');
    const payments = db.collection('payments');
    console.log('Using database:', db.databaseName);

  // Find payments where user is recipient
  const recipientQuery = { 'recipient.username': username };
  const asRecipient = await payments.find(recipientQuery).toArray();
  console.log('Recipient query:', recipientQuery);
  console.log('asRecipient:', asRecipient);

  // Find payments where user is a sender
  const senderQuery = { 'senders.user.username': username };
  const asSender = await payments.find(senderQuery).toArray();
  console.log('Sender query:', senderQuery);
  console.log('asSender:', asSender);
  return NextResponse.json({ asRecipient, asSender });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  } finally {
    await client.close();
  }
}
