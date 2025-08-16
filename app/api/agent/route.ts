export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  createFreshSession,
} from "../../../lib/mongo";
import { callGemini } from "../../../lib/gemini";
import { Payment, User } from "../../../lib/interface";
import { MongoClient } from "mongodb";
import { storeImage, storeImageFromUrl } from "../../../lib/pinata";
import { getCookie } from "@/utils/cookie";

// Bill splitting conversation states
type ConversationState =
  | "INITIAL"
  | "WAITING_FOR_PEOPLE_COUNT"
  | "WAITING_FOR_USERNAMES"
  | "WAITING_FOR_PAYER"
  | "WAITING_FOR_SPLIT_METHOD"
  | "WAITING_FOR_CONFIRMATION"
  | "COMPLETED";

interface BillSplittingData {
  totalAmount?: number;
  peopleCount?: number;
  users?: User[];
  payer?: User;
  splitMethod?: "equal" | "itemwise" | "ratio" | "custom";
  splitDetails?: any;
  settlement?: Payment;
}

// Get bill splitting conversation prompts
function getBillSplittingPrompt(
  state: ConversationState,
  data: BillSplittingData,
  userPrompt: string
): string {
  const systemPrompts = {
    INITIAL: `You are AnyPay, an AI assistant specialized in analyzing receipts and bills to help people split expenses fairly.

The user has uploaded a receipt/bill image. Your task is to:
1. Carefully analyze the receipt and extract the total amount (look for "Total", "Amount Due", etc.)
2. Identify individual items and their prices if visible
3. Provide a clear summary of what you found
4. Ask how many people are splitting this bill

Be friendly, concise, and focus on the bill splitting task. Start by clearly stating the total amount you found and then ask for the number of people splitting.`,

    WAITING_FOR_PEOPLE_COUNT: `Continue helping with bill splitting. The user needs to tell you how many people are splitting the bill. Ask clearly for this information if they haven't provided it yet.`,

    WAITING_FOR_USERNAMES: `Now collect the usernames and wallet addresses for each person splitting the bill. You need ${data.peopleCount} people's information. Format: "username:wallet_address". Be clear about the format and ask for all at once.`,

    WAITING_FOR_PAYER: `Ask who paid the bill from the list of people provided. Present the options clearly and ask them to specify which person paid.`,

    WAITING_FOR_SPLIT_METHOD: `Ask how they want to split the bill. Options:
- Equal: Split the total amount equally among all people
- Item-wise: Each person pays for specific items they consumed
- Ratio: Split based on custom percentages
- Custom: Manual amounts for each person

Explain each option briefly and ask them to choose.`,

    WAITING_FOR_CONFIRMATION: `Present the settlement plan clearly showing who owes who how much money. Ask for confirmation before saving to the system.`,

    COMPLETED: `The bill has been successfully split and saved! Provide a summary of the settlement.`,
  };

  return systemPrompts[state] || systemPrompts.INITIAL;
}

// Save payment to MongoDB
async function savePayment(payment: Payment): Promise<string> {
  try {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
      throw new Error("MongoDB configuration missing");
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("payments");

    const result = await collection.insertOne({
      ...payment,
      createdAt: new Date(),
      status: "pending",
    });

    await client.close();
    return result.insertedId.toString();
  } catch (error) {
    console.error("Error saving payment:", error);
    throw new Error(
      `Failed to save payment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Determine conversation state from session history
function determineConversationState(
  history: any[],
  billData: BillSplittingData
): ConversationState {
  if (history.length === 0) return "INITIAL";

  if (!billData.totalAmount || !billData.peopleCount)
    return "WAITING_FOR_PEOPLE_COUNT";
  if (!billData.users || billData.users.length !== billData.peopleCount)
    return "WAITING_FOR_USERNAMES";
  if (!billData.payer) return "WAITING_FOR_PAYER";
  if (!billData.splitMethod) return "WAITING_FOR_SPLIT_METHOD";
  if (!billData.settlement) return "WAITING_FOR_CONFIRMATION";

  return "COMPLETED";
}

// Extract bill splitting data from conversation history
function extractBillSplittingData(history: any[]): BillSplittingData {
  const data: BillSplittingData = {};

  // Look for extracted data in AI responses
  for (const message of history) {
    if (message.role === "model" && message.parts[0]?.text) {
      const text = message.parts[0].text;

      // Extract total amount
      if (!data.totalAmount) {
        // 1) Prefer amounts explicitly labeled as total
        const totalLabelRegex =
          /(total|amount\s*due|grand\s*total)[^\$]*\$\s*([0-9]+(?:\.[0-9]{1,2})?)/i;
        const totalLabelMatch = text.match(totalLabelRegex);
        if (totalLabelMatch) {
          data.totalAmount = parseFloat(totalLabelMatch[2]);
        } else {
          // 2) Fallback to the largest $ amount in the text
          const allAmounts = (
            text.match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/g) || []
          )
            .map((m) => parseFloat(m.replace(/[^0-9.]/g, "")))
            .filter((n) => !Number.isNaN(n));
          if (allAmounts.length > 0) {
            data.totalAmount = Math.max(...allAmounts);
          }
        }
      }
    }

    if (message.role === "user" && message.parts[0]?.text) {
      const text = message.parts[0].text.toLowerCase();

      // Extract people count
      const countMatch = text.match(/\b(\d+)\s*people|\b(\d+)\s*person/);
      if (countMatch && !data.peopleCount) {
        data.peopleCount = parseInt(countMatch[1] || countMatch[2]);
      }

      // Extract usernames and wallet addresses
      const userMatches = text.match(/([a-zA-Z0-9_]+):([a-fA-F0-9x]+)/g);
      if (userMatches && !data.users) {
        data.users = userMatches.map((match) => {
          const [username, walletAddress] = match.split(":");
          return { username, walletAddress, password: "" }; // Password not needed for splitting
        });
      }

      // Extract payer
      if (text.includes("paid") && data.users && !data.payer) {
        const paidUser = data.users.find((user) =>
          text.includes(user.username.toLowerCase())
        );
        if (paidUser) data.payer = paidUser;
      }

      // Extract split method
      if (
        (text.includes("equal") || text.includes("evenly")) &&
        !data.splitMethod
      ) {
        data.splitMethod = "equal";
      } else if (text.includes("item") && !data.splitMethod) {
        data.splitMethod = "itemwise";
      } else if (text.includes("ratio") && !data.splitMethod) {
        data.splitMethod = "ratio";
      }
    }
  }

  return data;
}

// Generate settlement plan
function generateSettlement(data: BillSplittingData): Payment | null {
  if (!data.totalAmount || !data.users || !data.payer || !data.splitMethod) {
    return null;
  }

  const { totalAmount, users, payer, splitMethod } = data;

  if (splitMethod === "equal") {
    const amountPerPerson = totalAmount / users.length;

    // All users (including payer) contribute their share
    const senders = users.map((user) => ({ user, amount: amountPerPerson }));

    // The payer receives the full amount back since they paid upfront
    const recipients = [{ user: payer, amount: totalAmount }];

    return {
      totalAmount,
      senders,
      recipients,
    };
  }

  // For now, only implement equal split. Other methods can be added later
  return null;
}

// Validate settlement sums consistency
function validateSettlement(settlement: Payment): boolean {
  const epsilon = 0.01; // tolerance for floating point arithmetic
  const sumSenders = settlement.senders.reduce((acc, s) => acc + s.amount, 0);
  const sumRecipients = settlement.recipients.reduce(
    (acc, r) => acc + r.amount,
    0
  );
  const total = settlement.totalAmount;
  const close = (a: number, b: number) => Math.abs(a - b) <= epsilon;
  return close(sumSenders, total) && close(sumRecipients, total);
}

// Helper: parse data URL into inlineData
function parseDataUrl(
  dataUrl: string
): { mimeType: string; data: string } | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
  } catch {
    return null;
  }
}

// Retrieve the most recent inline image from history as a data URL
function getLastImageDataUrl(history: any[]): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const parts = Array.isArray(msg?.parts) ? msg.parts : [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const inline = parts[j]?.inlineData;
      if (inline?.mimeType && inline?.data) {
        return `data:${inline.mimeType};base64,${inline.data}`;
      }
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sessionID, image, refresh_session } = await req.json();

    const userCookie = getCookie("user");

    if (!prompt || !userCookie) {
      return NextResponse.json(
        { error: "Missing required fields: prompt and user_id are required" },
        { status: 400 }
      );
    }

    const userData = JSON.parse(userCookie);
    const user_id = userData.username;

    // 1. Handle session creation/retrieval
    console.log("Handling session...");
    let session;

    if (refresh_session === true) {
      // Create a fresh session for new conversation (test mode)
      session = await createFreshSession(
        sessionID || `session-${Date.now()}`,
        user_id
      );
      console.log("Created fresh session:", session.sessionId);
    } else {
      // Get existing session or create if doesn't exist
      session = await getSession(sessionID || `session-${Date.now()}`, user_id);
      console.log("Session retrieved:", session.sessionId);
    }

    // 2. Extract bill splitting data and determine conversation state
    const isFirstPrompt = session.history.length === 0;
    const billData = extractBillSplittingData(session.history);
    const conversationState = determineConversationState(
      session.history,
      billData
    );

    console.log("Conversation state:", conversationState);
    console.log("Bill data:", billData);
    let imageDataForGemini: string | undefined;

    if (isFirstPrompt) {
      // FIRST PROMPT: Handle receipt image analysis
      if (!image) {
        return NextResponse.json(
          { error: "Receipt image is required for the first prompt" },
          { status: 400 }
        );
      }

      console.log("Processing first prompt with receipt image...");
      // Upload to Pinata and use the resulting HTTP URL for the LLM
      try {
        if (typeof image === "string" && image.startsWith("data:")) {
          const base64 = image.split(",")[1] || "";
          const buffer = Buffer.from(base64, "base64");
          const stored = await storeImage(buffer, "receipt.jpg");
          imageDataForGemini = stored.url;
          // Track the stored URL in session images (non-blocking)
          session.images = Array.from(
            new Set([...(session.images || []), stored.url])
          );
        } else if (
          typeof image === "string" &&
          (image.startsWith("http://") || image.startsWith("https://"))
        ) {
          // Optionally ensure it is pinned for persistence
          const stored = await storeImageFromUrl(image, "receipt.jpg");
          imageDataForGemini = stored.url;
          session.images = Array.from(
            new Set([...(session.images || []), stored.url])
          );
        } else {
          return NextResponse.json(
            { error: "Unsupported image format" },
            { status: 400 }
          );
        }
      } catch (pinErr) {
        console.error("Failed to upload image to Pinata:", pinErr);
        return NextResponse.json(
          { error: "Agent is unreachable at the moment" },
          { status: 502 }
        );
      }
    } else {
      // FOLLOW-UP PROMPTS: No need to resend image; rely on history text
      console.log("Processing follow-up prompt using conversation context");
      imageDataForGemini = undefined;
    }

    // 3. Get state-aware system prompt
    const systemPrompt = getBillSplittingPrompt(
      conversationState,
      billData,
      prompt
    );
    const enhancedPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

    // 4. Always call the LLM (OpenRouter)
    let geminiResponse;
    console.log("Calling OpenRouter...");
    console.log("Enhanced prompt:", enhancedPrompt);
    console.log("Has image data:", !!imageDataForGemini);
    console.log("History length:", session.history.length);
    try {
      if (typeof imageDataForGemini !== "undefined") {
        geminiResponse = await callGemini(
          enhancedPrompt,
          imageDataForGemini,
          session.history
        );
      } else {
        geminiResponse = await callGemini(
          enhancedPrompt,
          undefined,
          session.history
        );
      }
      console.log("OpenRouter response received successfully");
      console.log("Response text length:", geminiResponse.text?.length || 0);
      if (!geminiResponse.text || geminiResponse.text.trim() === "") {
        console.error("LLM returned empty text payload");
        return NextResponse.json(
          { error: "Agent is unreachable at the moment" },
          { status: 502 }
        );
      }
    } catch (geminiError) {
      console.error("OpenRouter API failed:", geminiError);
      return NextResponse.json(
        { error: "Agent is unreachable at the moment" },
        { status: 503 }
      );
    }

    // 5. Check if user is confirming settlement
    let paymentId: string | undefined;
    const updatedBillData = extractBillSplittingData([
      ...session.history,
      { role: "user", parts: [{ text: prompt }], timestamp: new Date() },
      {
        role: "model",
        parts: [{ text: geminiResponse.text }],
        timestamp: new Date(),
      },
    ]);

    if (
      prompt.toLowerCase().includes("confirm") &&
      conversationState === "WAITING_FOR_CONFIRMATION"
    ) {
      const settlement = generateSettlement(updatedBillData);
      if (!settlement || !validateSettlement(settlement)) {
        return NextResponse.json(
          { error: "Agent is unreachable at the moment" },
          { status: 422 }
        );
      }
      try {
        paymentId = await savePayment(settlement);
        console.log("Payment saved with ID:", paymentId);
      } catch (saveError) {
        console.error("Failed to save payment:", saveError);
        return NextResponse.json(
          { error: "Agent is unreachable at the moment" },
          { status: 500 }
        );
      }
    }

    // 6. Update session with new conversation state
    console.log("Updating session with new messages...");

    // Create user message
    const userParts: any[] = [{ text: prompt }];
    const userMessage = {
      role: "user" as const,
      parts: userParts,
      timestamp: new Date(),
    };

    // Create AI response message
    const aiMessage = {
      role: "model" as const,
      parts: [{ text: geminiResponse.text }],
      timestamp: new Date(),
    };

    // Update session data
    const updatedSessionData = {
      sessionId: session.sessionId,
      userId: session.userId,
      history: [...session.history, userMessage, aiMessage],
      images: session.images, // Keep/augment image URLs
      updatedAt: new Date(),
    };

    await updateSession(updatedSessionData);
    console.log("Session updated successfully");

    // 7. Return response with bill splitting context
    return NextResponse.json({
      response: geminiResponse,
      sessionId: session.sessionId,
      messageCount: updatedSessionData.history.length,
      isFirstPrompt,
      hasImage: !!imageDataForGemini,
      billSplitting: {
        state: conversationState,
        data: updatedBillData,
        paymentId: paymentId,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    let errorMessage = "Unknown error";
    let errorStack: string | undefined = undefined;

    if (typeof error === "object" && error !== null) {
      if ("message" in error && typeof (error as any).message === "string") {
        errorMessage = (error as any).message;
      }
      if (
        process.env.NODE_ENV === "development" &&
        "stack" in error &&
        typeof (error as any).stack === "string"
      ) {
        errorStack = (error as any).stack;
      }
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    );
  }
}
