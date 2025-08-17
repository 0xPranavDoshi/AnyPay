import { MongoClient, ObjectId } from 'mongodb';
import { Payment, User } from '../lib/interface';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'users';

async function seedPayments() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(MONGODB_DB_NAME);
    const paymentsCollection = db.collection('payments');

    // Sample users
    const payer: User = {
      username: "alice",
      walletAddress: "0xF4dBc2a568257f12E55Ea718D74C13E70f6f8E3f",
      password: "" // We don't store actual passwords in samples
    };

    const ower: User = {
      username: "bob",
      walletAddress: "0xef77667ffa4790a1bd2049760c116250ea65a923",
      password: "" // We don't store actual passwords in samples
    };

    // Create sample payment (let MongoDB auto-generate _id)
    const samplePayment = {
      payer: payer,
      owers: [{
        user: ower,
        amount: 50 // Amount in USD
      }],
      totalAmount: 50,
      description: "Lunch at Cool Restaurant",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert the payment
    const result = await paymentsCollection.insertOne(samplePayment);
    console.log('Inserted payment with ID:', result.insertedId);

    await client.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error seeding payments:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedPayments().then(() => {
  console.log('Seeding completed');
  process.exit(0);
}).catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
