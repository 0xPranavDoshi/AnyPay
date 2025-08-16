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
import { getCookie } from "@/utils/cookie-server";

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
  settlement?: Payment[] | null;
}

// Get bill splitting conversation prompts
function getBillSplittingPrompt(
  state: ConversationState,
  data: BillSplittingData,
  userPrompt: string,
  justSelectedUsers?: User[]
): string {
  const systemPrompts = {
    INITIAL: `You are AnyPay, an AI assistant specialized in understanding receipts and bills from images or text to help people split expenses.

If the user provided an image URL, analyze it for the bill total (look for "Total", "Amount Due", etc.) and any itemization. If the user provided only text (e.g., "hey we want to split a $52 bill"), extract the total from the text.

Your goals:
1. Extract the total amount reliably from image or text
2. Provide a concise summary of the amount you found
3. Ask the user to @ mention all the people involved in this split (they can type @ to see available users and select them)

Be friendly, concise, and stay focused on bill splitting. Start by clearly stating the total amount you identified, then ask them to @ mention everyone who was part of this expense.`,

    WAITING_FOR_PEOPLE_COUNT: `Continue helping with bill splitting. Ask the user to @ mention all the people involved in this split (they can type @ to see available users and select them).`,

    WAITING_FOR_USERNAMES: `The users have been selected! ${
      data.users
        ? `People involved: ${data.users.map((u) => u.username).join(", ")}.`
        : ""
    } Now ask who paid the bill and how they want to split it.`,

    WAITING_FOR_PAYER: `Ask who paid the bill from the list of people provided. Present the options clearly and ask them to specify which person paid.`,

    WAITING_FOR_SPLIT_METHOD: `Ask how they want to split the bill. Options:
- Equal: Split the total amount equally among all people
- Item-wise: Each person pays for specific items they consumed
- Ratio: Split based on custom percentages
- Custom: Manual amounts for each person

Explain each option briefly and ask them to choose.`,

    WAITING_FOR_CONFIRMATION: `Present the settlement plan clearly showing who owes who how much money. 
    
${
  data.settlement
    ? `Current settlement plan:
${data.settlement
  .map(
    (p) =>
      `• ${p.sender.username} owes ${
        p.recipient.username
      }: $${p.totalAmount.toFixed(2)}`
  )
  .join("\n")}

Total amount being split: $${data.totalAmount?.toFixed(2) || "0.00"}`
    : "Settlement plan will be generated once all information is provided."
}

Ask for confirmation before saving to the system.`,

    COMPLETED: `The bill has been successfully split and saved! Provide a summary of the settlement.`,
  };

  return systemPrompts[state] || systemPrompts.INITIAL;
}

// Upsert (cumulative) payment to MongoDB for a sender->recipient pair
async function upsertCumulativePayment(payment: Payment): Promise<string> {
  try {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
      throw new Error("MongoDB configuration missing");
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("payments");

    const query = {
      "sender.username": payment.sender.username,
      "recipient.username": payment.recipient.username,
    } as const;

    const existing = await collection.findOne(query);

    if (existing) {
      const result = await collection.findOneAndUpdate(
        query,
        {
          $inc: { totalAmount: payment.totalAmount },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after" }
      );
      await client.close();
      return (result?._id || existing._id).toString();
    } else {
      const doc = {
        ...payment,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const insert = await collection.insertOne(doc);
      await client.close();
      return insert.insertedId.toString();
    }
  } catch (error) {
    console.error("Error upserting payment:", error);
    throw new Error(
      `Failed to upsert payment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Determine conversation state from session history
function determineConversationState(
  history: any[],
  billData: BillSplittingData,
  justSelectedUsers?: User[]
): ConversationState {
  if (history.length === 0) return "INITIAL";

  // Only move from INITIAL if receipt total has been parsed
  if (!billData.totalAmount) return "INITIAL";

  // If users were just selected via @ mentions, move to the appropriate next state
  if (justSelectedUsers && justSelectedUsers.length > 0) {
    return "WAITING_FOR_USERNAMES"; // This will show the selected users and ask for payer
  }

  // Check if we have users from conversation or just selected
  const hasUsers = billData.users && billData.users.length > 0;

  if (!hasUsers) {
    return "WAITING_FOR_PEOPLE_COUNT"; // Ask them to @ mention people
  }

  // We have users, now check progression
  if (!billData.payer) return "WAITING_FOR_PAYER";
  if (!billData.splitMethod) return "WAITING_FOR_SPLIT_METHOD";
  if (!billData.settlement) return "WAITING_FOR_CONFIRMATION";

  return "COMPLETED";
}

// Extract bill splitting data from conversation history
function extractBillSplittingData(
  history: any[],
  justSelectedUsers?: User[]
): BillSplittingData {
  const data: BillSplittingData = {};

  // If users were just selected via @ mentions, use them
  if (justSelectedUsers && justSelectedUsers.length > 0) {
    data.users = justSelectedUsers;
    data.peopleCount = justSelectedUsers.length;
  }

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

      // Extract usernames and wallet addresses (only if not just selected via @ mentions)
      if (!justSelectedUsers || justSelectedUsers.length === 0) {
        const userMatches = text.match(/([a-zA-Z0-9_]+):([a-fA-F0-9x]+)/g);
        if (userMatches && !data.users) {
          data.users = userMatches.map((match) => {
            const [username, walletAddress] = match.split(":");
            return { username, walletAddress, password: "" }; // Password not needed for splitting
          });
        }
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

  // Auto-generate settlement if we have all required information
  if (
    data.totalAmount &&
    data.users &&
    data.payer &&
    data.splitMethod &&
    !data.settlement
  ) {
    data.settlement = generateSettlement(data);
  }

  return data;
}

// Generate settlement plan
function generateSettlement(data: BillSplittingData): Payment[] | null {
  if (!data.totalAmount || !data.users || !data.payer || !data.splitMethod) {
    return null;
  }

  const { totalAmount, users, payer, splitMethod } = data;

  if (splitMethod === "equal") {
    const amountPerPerson = totalAmount / users.length;

    // Create 1:1 payments where each non-payer owes the payer
    const payments: Payment[] = users
      .filter((u) => u.username !== payer.username)
      .map((debtor) => ({
        sender: debtor,
        recipient: payer,
        totalAmount: amountPerPerson,
      }));

    return payments;
  }

  // For now, only implement equal split. Other methods can be added later
  return null;
}

// Validate settlement sums consistency (sum of all 1:1 equals total)
function validateSettlement(
  settlement: Payment[],
  totalAmount: number
): boolean {
  const epsilon = 0.01; // tolerance for floating point arithmetic
  const summed = settlement.reduce((acc, p) => acc + p.totalAmount, 0);
  return Math.abs(summed - totalAmount) <= epsilon;
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      image,
      sessionID,
      refresh_session,
      stream = false,
      users,
    } = await req.json();

    const userCookie = getCookie("user");

    if (!prompt && !image) {
      return NextResponse.json(
        {
          error: "Missing required fields: either prompt or image are required",
        },
        { status: 400 }
      );
    }

    const userCookieValue = await userCookie;
    if (!userCookieValue) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: user not logged in/cookie not detected",
        },
        { status: 400 }
      );
    }
    const userData = JSON.parse(userCookieValue);
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
    const billData = extractBillSplittingData(session.history, users);
    const conversationState = determineConversationState(
      session.history,
      billData,
      users
    );

    console.log("Conversation state:", conversationState);
    console.log("Bill data:", billData);
    let imageDataForGemini: string | undefined;

    if (image) {
      console.log("Processing first prompt with receipt image...");
      try {
        if (typeof image === "string" && image.startsWith("data:")) {
          const base64 = image.split(",")[1] || "";
          const buffer = Buffer.from(base64, "base64");
          const stored = await storeImage(buffer, "receipt.jpg");
          imageDataForGemini = stored.url;
          session.images = Array.from(
            new Set([...(session.images || []), stored.url])
          );
        } else if (
          typeof image === "string" &&
          (image.startsWith("http://") || image.startsWith("https://"))
        ) {
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
      console.log("Processing prompt with text-only description...");
      imageDataForGemini = undefined;
    }

    // 3. Get state-aware system prompt
    const systemPrompt = getBillSplittingPrompt(
      conversationState,
      billData,
      prompt,
      users
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
    let paymentIds: string[] | undefined;
    const updatedBillData = extractBillSplittingData(
      [
        ...session.history,
        { role: "user", parts: [{ text: prompt }], timestamp: new Date() },
        {
          role: "model",
          parts: [{ text: geminiResponse.text }],
          timestamp: new Date(),
        },
      ],
      users
    );

    // Check if user is confirming settlement (more flexible confirmation detection)
    const isConfirming =
      conversationState === "WAITING_FOR_CONFIRMATION" &&
      (prompt.toLowerCase().includes("confirm") ||
        prompt.toLowerCase().includes("yes") ||
        prompt.toLowerCase().includes("looks good") ||
        prompt.toLowerCase().includes("correct") ||
        prompt.toLowerCase().includes("save"));

    if (isConfirming) {
      const settlement = generateSettlement(updatedBillData);
      if (
        !settlement ||
        !validateSettlement(settlement, updatedBillData.totalAmount || 0)
      ) {
        return NextResponse.json(
          { error: "Agent is unreachable at the moment" },
          { status: 422 }
        );
      }
      try {
        const ids: string[] = [];
        for (const p of settlement) {
          const id = await upsertCumulativePayment(p);
          ids.push(id);
        }
        paymentIds = ids;
        console.log("Payments upserted with IDs:", paymentIds);
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
    const responseData = {
      response: geminiResponse,
      sessionId: session.sessionId,
      messageCount: updatedSessionData.history.length,
      isFirstPrompt,
      hasImage: !!imageDataForGemini,
      billSplitting: {
        state: conversationState,
        data: updatedBillData,
        paymentIds,
      },
    };

    if (stream) {
      // Create a streaming response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        start(controller) {
          // Send the response in chunks to simulate streaming
          const text = geminiResponse.text || "";
          const words = text.split(" ");
          let currentText = "";

          const sendChunk = (index: number) => {
            if (index >= words.length) {
              // Send final metadata and close stream
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "metadata",
                    ...responseData,
                  })}\n\n`
                )
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }

            currentText += (index > 0 ? " " : "") + words[index];
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "content",
                  content: currentText,
                })}\n\n`
              )
            );

            // Continue with next word after a small delay
            setTimeout(() => sendChunk(index + 1), 50);
          };

          sendChunk(0);
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      return NextResponse.json(responseData);
    }
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
