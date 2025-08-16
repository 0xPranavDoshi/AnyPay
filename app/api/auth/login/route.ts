import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { User } from "@/lib/interface";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, 3-20 characters)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          error: "Invalid username format",
        },
        { status: 400 }
      );
    }

    // Validate password (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Invalid password format" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGO_URL!);
    await client.connect();

    const db = client.db("users");
    const profilesCollection = db.collection("profiles");

    // Find user by username
    const user = await profilesCollection.findOne({ username });

    if (!user) {
      await client.close();
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check password (in production, you should hash passwords)
    if (user.password !== password) {
      await client.close();
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    await client.close();

    // Return success response with user data (excluding password)
    return NextResponse.json(
      {
        message: "Login successful",
        user: {
          username: user.username,
          walletAddress: user.walletAddress,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);

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
