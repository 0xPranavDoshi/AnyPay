// Seed script to populate MongoDB with sample data
// Usage: node scripts/seed-db.js

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'anypay';

// Check if MongoDB URI is properly configured
if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017') {
  console.log('⚠️  No MONGODB_URI found in .env.local');
  console.log('📝 To use this script:');
  console.log('   1. Copy env.example to .env.local: cp env.example .env.local');
  console.log('   2. Update MONGODB_URI in .env.local with your MongoDB connection string');
  console.log('   3. Or run a local MongoDB server on port 27017');
  console.log('');
  console.log('🔧 For local MongoDB:');
  console.log('   - Install MongoDB: brew install mongodb-community');
  console.log('   - Start MongoDB: brew services start mongodb-community');
  console.log('');
  console.log('☁️  For MongoDB Atlas:');
  console.log('   - Get connection string from https://cloud.mongodb.com');
  console.log('   - Add it to .env.local as MONGODB_URI=mongodb+srv://...');
  console.log('');
}

const sampleSessions = [
  {
    sessionId: 'sample-session-001',
    userId: 'user-alice',
    history: [
      {
        role: 'user',
        parts: [{ text: 'Hello! Can you help me analyze this receipt?' }],
        timestamp: new Date('2024-01-15T10:00:00Z')
      },
      {
        role: 'model',
        parts: [{ text: 'Of course! I\'d be happy to help you analyze your receipt. Please share the image and I\'ll break down the items, costs, and help with splitting if needed.' }],
        timestamp: new Date('2024-01-15T10:00:05Z')
      },
      {
        role: 'user',
        parts: [{ text: 'Here\'s my restaurant receipt from dinner last night.' }],
        timestamp: new Date('2024-01-15T10:01:00Z')
      },
      {
        role: 'model',
        parts: [{ text: 'I can see this is a restaurant receipt. I notice items like appetizers, main courses, and drinks. The total appears to be $87.50 including tax and tip. Would you like me to help split this among multiple people?' }],
        timestamp: new Date('2024-01-15T10:01:10Z')
      }
    ],
    images: [
      'https://ipfs.io/ipfs/QmSampleHashForReceiptImage123',
      'https://ipfs.io/ipfs/QmAnotherSampleImageHash456'
    ],
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:01:10Z')
  },
  {
    sessionId: 'sample-session-002',
    userId: 'user-bob',
    history: [
      {
        role: 'user',
        parts: [{ text: 'I need help splitting a grocery bill between roommates' }],
        timestamp: new Date('2024-01-16T15:30:00Z')
      },
      {
        role: 'model',
        parts: [{ text: 'I\'ll help you split the grocery bill fairly! Please upload the receipt image and let me know how many roommates need to split it.' }],
        timestamp: new Date('2024-01-16T15:30:03Z')
      }
    ],
    images: [
      'https://ipfs.io/ipfs/QmGroceryReceiptSample789'
    ],
    createdAt: new Date('2024-01-16T15:30:00Z'),
    updatedAt: new Date('2024-01-16T15:30:03Z')
  },
  {
    sessionId: 'sample-session-003',
    userId: 'user-charlie',
    history: [
      {
        role: 'user',
        parts: [{ text: 'What can you help me with?' }],
        timestamp: new Date('2024-01-17T09:15:00Z')
      },
      {
        role: 'model',
        parts: [{ text: 'I\'m here to help you analyze receipts and split bills! I can:\n\n• Read and analyze receipt images\n• Extract itemized costs\n• Calculate fair splits between multiple people\n• Handle tips and taxes\n• Suggest payment amounts for each person\n\nJust upload a receipt image and tell me what you need!' }],
        timestamp: new Date('2024-01-17T09:15:05Z')
      }
    ],
    images: [],
    createdAt: new Date('2024-01-17T09:15:00Z'),
    updatedAt: new Date('2024-01-17T09:15:05Z')
  }
];

async function seedDatabase() {
  let client;
  
  try {
    console.log('🌱 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB_NAME);
    const collection = db.collection('sessions');
    
    // Clear existing sample data
    console.log('🧹 Clearing existing sample data...');
    await collection.deleteMany({ 
      sessionId: { $in: sampleSessions.map(s => s.sessionId) } 
    });
    
    // Insert sample sessions
    console.log('📝 Inserting sample sessions...');
    const result = await collection.insertMany(sampleSessions);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} sample sessions:`);
    sampleSessions.forEach(session => {
      console.log(`   • ${session.sessionId} (${session.userId}) - ${session.history.length} messages`);
    });
    
    // Show collection stats
    const totalSessions = await collection.countDocuments();
    console.log(`\n📊 Database now contains ${totalSessions} total sessions`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seeding
seedDatabase().then(() => {
  console.log('🏁 Database seeding completed!');
  process.exit(0);
});
