// Script to add a test payment for testing cross-chain functionality
// Usage: node scripts/add-test-payment.js

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// Payment data based on your users
const testPayment = {
  payer: {
    username: "user2", 
    walletAddress: "0xef77667ffa4790a1bd2049760c116250ea65a923"
  },
  totalAmount: 16.5, // ~0.005 ETH in USD (assuming ETH = $3300)
  owers: [
    {
      user: {
        username: "mug",
        walletAddress: "0xca4008120ace79b0bf570758b65c20da02a41978"
      },
      amount: 16.5
    }
  ],
  description: "Test payment for cross-chain functionality",
  createdAt: new Date(),
  updatedAt: new Date()
};

async function addTestPayment() {
  let client;
  
  try {
    console.log('🌱 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB_NAME);
    
    // Check if users exist first
    const profilesCollection = db.collection('profiles');
    const mug = await profilesCollection.findOne({ username: "mug" });
    const user2 = await profilesCollection.findOne({ username: "user2" });
    
    if (!mug || !user2) {
      console.log('⚠️  Users not found in database');
      console.log(`mug found: ${!!mug}`);
      console.log(`user2 found: ${!!user2}`);
      return;
    }
    
    console.log('✅ Found both users:');
    console.log(`   • mug: ${mug.walletAddress}`);
    console.log(`   • user2: ${user2.walletAddress}`);
    
    // Add payment to the payments collection
    const paymentsCollection = db.collection('payments');
    
    // Clear any existing test payments first
    await paymentsCollection.deleteMany({ 
      description: "Test payment for cross-chain functionality" 
    });
    
    console.log('📝 Adding test payment...');
    const result = await paymentsCollection.insertOne(testPayment);
    
    console.log(`✅ Successfully added test payment with ID: ${result.insertedId}`);
    console.log('💰 Payment details:');
    console.log(`   • ${testPayment.owers[0].user.username} owes $${testPayment.owers[0].amount} to ${testPayment.payer.username}`);
    console.log(`   • Payer wallet: ${testPayment.payer.walletAddress}`);
    console.log(`   • Ower wallet: ${testPayment.owers[0].user.walletAddress}`);
    
    // Show total payments in collection
    const totalPayments = await paymentsCollection.countDocuments();
    console.log(`\n📊 Database now contains ${totalPayments} total payments`);
    
    console.log('\n🚀 Ready to test! User "mug" should now see they owe $16.50 to "user2" in the dashboard.');
    
  } catch (error) {
    console.error('❌ Error adding payment:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Check environment variables
if (!MONGODB_URI || !MONGODB_DB_NAME) {
  console.log('⚠️  Missing environment variables');
  console.log('📝 Make sure .env.local contains:');
  console.log('   MONGODB_URI=your_mongodb_connection_string');
  console.log('   MONGODB_DB_NAME=your_database_name');
  process.exit(1);
}

// Run the script
addTestPayment().then(() => {
  console.log('🏁 Payment addition completed!');
  process.exit(0);
});