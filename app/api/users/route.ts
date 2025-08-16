import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = new MongoClient(process.env.MONGO_URL!);
    await client.connect();

    const db = client.db("users");
    const profilesCollection = db.collection("profiles");

    // Fetch all users, excluding sensitive information like passwords
    const users = await profilesCollection
      .find({}, { projection: { username: 1, walletAddress: 1, _id: 0 } })
      .toArray();

    await client.close();

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
