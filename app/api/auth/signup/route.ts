import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { User } from "@/lib/interface";

export async function POST(request: NextRequest) {
  try {
    const { username, walletAddress } = await request.json();

    // Validate required fields
    if (!username || !walletAddress) {
      return NextResponse.json(
        { error: "Username and wallet address are required" },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, 3-20 characters)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters long and contain only letters, numbers, and underscores",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format (Ethereum address)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGO_URL!);
    await client.connect();

    const db = client.db("users");
    const profilesCollection = db.collection("profiles");

    // Check if username already exists
    const existingUsername = await profilesCollection.findOne({ username });
    if (existingUsername) {
      await client.close();
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Check if wallet address already exists
    const existingWallet = await profilesCollection.findOne({ walletAddress });
    if (existingWallet) {
      await client.close();
      return NextResponse.json(
        { error: "Wallet address already registered" },
        { status: 409 }
      );
    }

    // Create user document
    const user: User = {
      username,
      walletAddress,
    };

    // Insert user into profiles collection
    const result = await profilesCollection.insertOne(user);

    await client.close();

    // Return success response
    return NextResponse.json(
      {
        message: "User created successfully",
        userId: result.insertedId,
        user: {
          username: user.username,
          walletAddress: user.walletAddress,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);

    // Handle MongoDB connection errors
    if (error instanceof Error && error.message.includes("MongoNetworkError")) {
      return NextResponse.json(
        { error: "Database connection failed. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
