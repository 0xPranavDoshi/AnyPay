
import { MongoClient, Db, Collection } from 'mongodb';

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  timestamp: Date;
}

interface SessionData {
  _id?: string;
  sessionId: string;
  userId: string;
  history: ChatMessage[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

let client: MongoClient | null = null;
let db: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  if (!process.env.MONGODB_DB_NAME) {
    throw new Error('MONGODB_DB_NAME environment variable is required');
  }

  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
  }

  if (!db) {
    db = client.db(process.env.MONGODB_DB_NAME);
  }

  return db;
}

async function getSessionsCollection(): Promise<Collection<SessionData>> {
  const database = await connectToDatabase();
  return database.collection<SessionData>('sessions');
}

export async function getSession(sessionId: string, userId: string): Promise<SessionData> {
  try {
    const collection = await getSessionsCollection();
    
    // Try to find existing session
    let session = await collection.findOne({ 
      sessionId, 
      userId 
    });

    // If no session exists, create a new one
    if (!session) {
      const newSession: SessionData = {
        sessionId,
        userId,
        history: [],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(newSession);
      session = { ...newSession, _id: result.insertedId.toString() };
      console.log(`Created new session ${sessionId} for user ${userId}`);
    } else {
      console.log(`Found existing session ${sessionId} for user ${userId}`);
    }

    return session;
  } catch (error) {
    console.error('Error fetching session:', error);
    throw new Error(`Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateSession(sessionData: Partial<SessionData> & { sessionId: string; userId: string }): Promise<SessionData> {
  try {
    const collection = await getSessionsCollection();
    
    const updateData = {
      ...sessionData,
      updatedAt: new Date(),
    };

    // Remove _id from update data if present
    const { _id, ...updateFields } = updateData;

    const result = await collection.findOneAndUpdate(
      { 
        sessionId: sessionData.sessionId, 
        userId: sessionData.userId 
      },
      { 
        $set: updateFields 
      },
      { 
        returnDocument: 'after',
        upsert: true 
      }
    );

    if (!result) {
      throw new Error('Failed to update session');
    }

    console.log(`Updated session ${sessionData.sessionId} for user ${sessionData.userId}`);
    return result;
  } catch (error) {
    console.error('Error updating session:', error);
    throw new Error(`Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function addMessageToSession(
  sessionId: string, 
  userId: string, 
  message: Omit<ChatMessage, 'timestamp'>
): Promise<SessionData> {
  try {
    const collection = await getSessionsCollection();
    
    const messageWithTimestamp: ChatMessage = {
      ...message,
      timestamp: new Date(),
    };

    const result = await collection.findOneAndUpdate(
      { sessionId, userId },
      { 
        $push: { history: messageWithTimestamp },
        $set: { updatedAt: new Date() }
      },
      { 
        returnDocument: 'after',
        upsert: true 
      }
    );

    if (!result) {
      throw new Error('Failed to add message to session');
    }

    return result;
  } catch (error) {
    console.error('Error adding message to session:', error);
    throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function addImageToSession(
  sessionId: string, 
  userId: string, 
  imageUrl: string
): Promise<SessionData> {
  try {
    const collection = await getSessionsCollection();
    
    const result = await collection.findOneAndUpdate(
      { sessionId, userId },
      { 
        $addToSet: { images: imageUrl },
        $set: { updatedAt: new Date() }
      },
      { 
        returnDocument: 'after',
        upsert: true 
      }
    );

    if (!result) {
      throw new Error('Failed to add image to session');
    }

    return result;
  } catch (error) {
    console.error('Error adding image to session:', error);
    throw new Error(`Failed to add image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Cleanup function for graceful shutdown
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}
