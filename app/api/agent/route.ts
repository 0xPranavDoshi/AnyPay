export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  createFreshSession,
} from "../../../lib/mongo";
import { callGemini } from "../../../lib/gemini";
import { Payment, User, PaymentStatus } from "../../../lib/interface";
import { MongoClient } from "mongodb";
import { storeImage, storeImageFromUrl } from "../../../lib/pinata";

interface BillSplittingData {
  totalAmount?: number;
  peopleCount?: number;
  users?: User[];
  payer?: User;
  splitMethod?: "equal" | "itemwise" | "ratio" | "custom";
  splitDetails?: any;
  settlement?: string[] | null; // Array of payment IDs instead of Payment objects
  confirmed?: boolean;
}

// OpenAI Function Calling Tool Definitions
const AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "updateBillSplittingData",
      description: "Update bill splitting data including total amount, payer, split method, and confirmation status",
      parameters: {
        type: "object",
        properties: {
          totalAmount: {
            type: "number",
            description: "The total amount of the bill in dollars"
          },
          payer: {
            type: "string",
            description: "Username of the person who paid the bill"
          },
          splitMethod: {
            type: "string",
            enum: ["equal", "itemwise", "ratio", "custom"],
            description: "Method for splitting the bill"
          },
          confirmed: {
            type: "boolean",
            description: "Whether the user has confirmed the settlement plan"
          }
        }
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "save_settlement",
      description: "Save settlement as 1:1 payment edges (one document per sender→recipient with amount)",
      parameters: {
        type: "object",
        properties: {
          payments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sender: {
                  type: "string",
                  description: "Username of the person who owes money (ower)"
                },
                recipient: {
                  type: "string", 
                  description: "Username of the person who should receive money (payer)"
                },
                amount: {
                  type: "number",
                  description: "Amount owed from sender to recipient"
                }
              },
              required: ["sender", "recipient", "amount"]
            },
            description: "List of payment edges to save"
          }
        },
        required: ["payments"]
      }
    }
  }
];

// Get concise bill splitting prompt with tool-calling instructions
function getBillSplittingPrompt(
  data: BillSplittingData,
  userPrompt: string,
  justSelectedUsers?: User[]
): string {
  const currentUsers = justSelectedUsers || data.users || [];
  const usersText = currentUsers.length > 0 ? 
    `People involved: ${currentUsers.map(u => u.username).join(', ')}.` : 
    'No people selected yet.';

  return `You are Vitalik, a helpful and focused AI agent hired by AnyPay. AnyPay offers a way to split shared purchases through cross-chain multi-token web3 payments between a group of people. Your goal is to help the user through this process. If you are given an image of a receipt, you should parse it and understand the itemised breakdown; confirm with the user. Show the total amount to the user and gather the following information to decide how the split would be facilitated:
  total amount, users involved, who paid the bill (could be multiple), how is it being split (equally, item-wise, ratio-wise, etc.). Take the user through these one by one.
  
  Once you have this information, you should do the calculations required to create a settlement plan that just shows the user who owes who. Proceed toward achieving the goal based on the following status/progress so far. Your end goal is to understand how the user wants to split it and update AnyPay's DB using save_settlement() at the end. Once that happens, AnyPay updates their dashboard and allows them to transfer to each other.

  Before calling the save_settlement() tool call, just confirm the settlement with the user. Once user confirms the plan, call save_settlement({ payments }).

Storage model for settlements (do not reveal to user):
- AnyPay stores one payment document per sender→recipient edge. Each has: sender (ower), recipient (payer), amount.
- When saving, call save_settlement({ payments: [{ sender, recipient, amount }, ...] }). Do NOT send totals here.
- Newly created payments default to status PENDING. Leave other fields blank.

Current status:
- Total: ${data.totalAmount ? `$${data.totalAmount.toFixed(2)}` : 'Unknown'}
- ${usersText}
- Payer: ${data.payer ? data.payer.username : 'Unknown'}
- Split: ${data.splitMethod || 'Unknown'}

If everything in current status is known, proceed to showing the settlement plan and request user confirmation.

Tool-use policy (do not reveal to user):
- If user provides an amount (text or image), call updateBillSplittingData({ totalAmount }).
- If user names the payer, call updateBillSplittingData({ payer }).
- If user specifies split method, call updateBillSplittingData({ splitMethod }).
- If billSplittingData is filled and plan is confirmed, call save_settlement({ payments: [{ sender, recipient, amount }] }).
- Users list from UI is authoritative. Once that comes in, the users involved in the status will automatically be updated.

Style:
- Be succinct, friendly and stay focused on bill splitting. 
- Follow the flow defined by the status but don't print out the status. Nudge the user 1 step at a time. 
- ALWAYS provide a text response to the user, even when calling tools.

COMPLETION: Your work is done once you call save_settlement(). Say thank you and goodbye.

User message: ${userPrompt}`;
}

// Insert a single non-cumulative settlement payment document
async function insertSettlementPayment(payment: Payment): Promise<string> {
  try {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
      throw new Error("MongoDB configuration missing");
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("payments");

    const doc = {
      ...payment,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const insert = await collection.insertOne(doc);
    await client.close();
    return insert.insertedId.toString();
  } catch (error) {
    console.error("Error inserting settlement payment:", error);
    throw new Error(
      `Failed to insert settlement payment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Tool call handlers
async function handleUpdateBillSplittingData(
  params: any,
  currentData: BillSplittingData,
  allUsers: User[]
): Promise<BillSplittingData> {
  const updatedData = { ...currentData };
  
  if (params.totalAmount !== undefined) {
    updatedData.totalAmount = params.totalAmount;
  }
  
  if (params.payer !== undefined) {
    const payerUser = allUsers.find(u => u.username === params.payer);
    if (payerUser) {
      updatedData.payer = payerUser;
    }
  }
  
  if (params.splitMethod !== undefined) {
    updatedData.splitMethod = params.splitMethod;
  }
  
  if (params.splitDetails !== undefined) {
    updatedData.splitDetails = params.splitDetails;
  }
  
  if (params.confirmed !== undefined) {
    updatedData.confirmed = params.confirmed;
  }
  
  return updatedData;
}

async function handleSaveSettlement(
  params: any,
  allUsers: User[],
  billData: BillSplittingData
): Promise<string[]> {
  // Create individual payment records using new one-to-one structure
  const paymentIds: string[] = [];
  
  for (const paymentData of params.payments) {
    const sender = allUsers.find((u) => u.username === paymentData.sender);
    const recipient = allUsers.find((u) => u.username === paymentData.recipient);

    if (!sender || !recipient) {
      throw new Error(
        `User not found: ${paymentData.sender} or ${paymentData.recipient}`
      );
    }

    const amount = Number(
      paymentData.amount !== undefined ? paymentData.amount : paymentData.totalAmount
    ) || 0;
    
          const payment: Payment = {
        payer: recipient, // Person who is owed money (recipient)
        owers: [{ user: sender, amount }], // Person who owes money (sender)
        totalAmount: amount,
        description: billData.splitMethod ? `Split: ${billData.splitMethod}` : "Bill split payment",
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

    const paymentId = await insertSettlementPayment(payment);
    paymentIds.push(paymentId);
  }

  return paymentIds;
}

// Helper to persist image via Pinata and return URL
async function processImageInput(image: any, session: any): Promise<string | undefined> {
  if (!image) return undefined;
  if (typeof image === "string" && image.startsWith("data:")) {
    const base64 = image.split(",")[1] || "";
    const buffer = Buffer.from(base64, "base64");
    const stored = await storeImage(buffer, "receipt.jpg");
    session.images = Array.from(new Set([...(session.images || []), stored.url]));
    return stored.url;
  }
  if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
    const stored = await storeImageFromUrl(image, "receipt.jpg");
    session.images = Array.from(new Set([...(session.images || []), stored.url]));
    return stored.url;
  }
  throw new Error("Unsupported image format");
}

// Tool call handlers for OpenAI function calling

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      image,
      sessionID,
      refresh_session,
      stream = false,
      users,
      userData,
    } = await req.json();

    if (!prompt && !image) {
      return NextResponse.json(
        {
          error: "Missing required fields: either prompt or image are required",
        },
        { status: 400 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: user not logged in/cookie not detected",
        },
        { status: 400 }
      );
    }
    const user_id = userData.username;

    // 1. Handle session creation/retrieval
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

    // 2. Initialize bill splitting data from session, overlaying UI users
    const isFirstPrompt = session.history.length === 0;
    const existingBillData = (session as any).billData || {};
    const billData: BillSplittingData = {
      ...existingBillData,
      users: users && users.length > 0 ? users : existingBillData.users || [],
      peopleCount: users && users.length > 0 ? users.length : existingBillData.peopleCount || (existingBillData.users?.length || 0),
    };

    console.log("Bill data:", billData);
    let imageDataForGemini: string | undefined;
    try {
      imageDataForGemini = await processImageInput(image, session);
    } catch (pinErr) {
      console.error("Image handling failed:", pinErr);
      return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
    }

    // 3. Get task-based system prompt with tool calling capabilities
    const systemPrompt = getBillSplittingPrompt(
      billData,
      prompt,
      users
    );
    const enhancedPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

    // 4. Always call the LLM (OpenRouter)
    let geminiResponse: any;
    console.log("Calling OpenRouter...");
    try {
      if (typeof imageDataForGemini !== "undefined") {
        geminiResponse = await callGemini(
          enhancedPrompt,
          imageDataForGemini,
          session.history,
          AVAILABLE_TOOLS
        );
      } else {
        geminiResponse = await callGemini(
          enhancedPrompt,
          undefined,
          session.history,
          AVAILABLE_TOOLS
        );
              }
        console.log("OpenRouter response received");
        console.log("Text tokens in response:", (geminiResponse.text || '').length);
        // console.log("Response text:", geminiResponse.text || '[NO TEXT]');
    } catch (geminiError) {
      console.error("OpenRouter API failed:", geminiError);
      return NextResponse.json(
        { error: "Agent is unreachable at the moment" },
        { status: 503 }
      );
    }

    // 5. Execute tool calls from OpenAI function calling response
    let paymentIds: string[] | undefined;
    let updatedBillData = { ...billData };
    const toolSummaries: string[] = [];
    let additionalToolCallsExecuted = 0;

    // Prepare OpenRouter messages log to align with tool call protocol
    const messagesLog: any[] = Array.isArray(geminiResponse.sentMessages)
      ? [...geminiResponse.sentMessages]
      : [];
    if (geminiResponse.assistantMessage) {
      messagesLog.push(geminiResponse.assistantMessage);
    }
    
    // Get tool calls from OpenAI response
    const toolCalls = geminiResponse.toolCalls || [];
    console.log("Tool calls:", toolCalls?.length || 0);
    console.log(toolCalls)
    
    // Execute tool calls
    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function?.name;
        const functionArgs = JSON.parse(toolCall.function?.arguments || '{}');
        
        if (functionName === "updateBillSplittingData") {
          updatedBillData = await handleUpdateBillSplittingData(
            functionArgs,
            updatedBillData,
            users || []
          );
          console.log("Updated bill data:", updatedBillData);
          // Append tool message result for protocol completeness
          messagesLog.push({
            role: 'tool',
            tool_call_id: (toolCall as any).id,
            name: functionName,
            content: JSON.stringify({ status: 'ok', billData: updatedBillData })
          });
          try {
            const keys = Object.keys(functionArgs || {}).join(', ');
            toolSummaries.push(`[tool updateBillSplittingData] status: ok${keys ? `, updated: ${keys}` : ''}`);
          } catch {}
        } else if (functionName === "save_settlement") {
          paymentIds = await handleSaveSettlement(
            functionArgs,
            users || [],
            updatedBillData
          );
          console.log("Payments saved with IDs:", paymentIds);
          updatedBillData.confirmed = true;
          updatedBillData.settlement = paymentIds;
          messagesLog.push({
            role: 'tool',
            tool_call_id: (toolCall as any).id,
            name: functionName,
            content: JSON.stringify({ status: 'ok', paymentIds })
          });
          toolSummaries.push(`[tool save_settlement] status: ok${paymentIds && paymentIds.length ? `, paymentIds: ${paymentIds.join(', ')}` : ''}`);
        }
      } catch (toolError) {
        console.error(`Error executing tool ${toolCall.function?.name}:`, toolError);
        return NextResponse.json(
          { error: "Agent is unreachable at the moment" },
          { status: 500 }
        );
      }
    }
    
    // Update users in bill data from UI (single source of truth)
    if (users && users.length > 0) {
      updatedBillData.users = users;
      updatedBillData.peopleCount = users.length;
    }
    
    // Build a user-visible response; if model text is empty, retry and allow more tool calls
    let userVisibleResponse = (geminiResponse.text || '').trim();
    if (!userVisibleResponse) {
      try {
        const followupSystem = `Please complete your previous reply with a short, user-facing message. Keep it helpful.`;
        const followupPrompt = `${followupSystem}\n\nUser: ${prompt}`;

        // Provide assistant + tool outputs so the model knows tools succeeded
        const assistantAndToolMessages = [
          ...(geminiResponse.assistantMessage ? [geminiResponse.assistantMessage] : []),
          ...messagesLog.filter((m: any) => m.role === 'tool'),
        ];

        const retry = await callGemini(
          followupPrompt,
          undefined,
          session.history,
          AVAILABLE_TOOLS,
          assistantAndToolMessages
        );
        // Execute any tool calls returned in the retry (e.g., save_settlement)
        const retryToolCalls = retry.toolCalls || [];
        if ((retryToolCalls?.length || 0) > 0) {
          console.log('Retry tool calls:', retryToolCalls.length);
          console.log(retryToolCalls)
          if ((retry as any)?.assistantMessage) {
            messagesLog.push((retry as any).assistantMessage);
          }
          for (const toolCall of retryToolCalls) {
            try {
              const functionName = toolCall.function?.name;
              const functionArgs = JSON.parse(toolCall.function?.arguments || '{}');
              if (functionName === 'updateBillSplittingData') {
                updatedBillData = await handleUpdateBillSplittingData(
                  functionArgs,
                  updatedBillData,
                  users || []
                );
                messagesLog.push({
                  role: 'tool',
                  tool_call_id: (toolCall as any).id,
                  name: functionName,
                  content: JSON.stringify({ status: 'ok', billData: updatedBillData })
                });
                try {
                  const keys = Object.keys(functionArgs || {}).join(', ');
                  toolSummaries.push(`[tool updateBillSplittingData] status: ok${keys ? `, updated: ${keys}` : ''}`);
                } catch {}
              } else if (functionName === 'save_settlement') {
                paymentIds = await handleSaveSettlement(
                  functionArgs,
                  users || [],
                  updatedBillData
                );
                updatedBillData.confirmed = true;
                updatedBillData.settlement = paymentIds;
                messagesLog.push({
                  role: 'tool',
                  tool_call_id: (toolCall as any).id,
                  name: functionName,
                  content: JSON.stringify({ status: 'ok', paymentIds })
                });
                toolSummaries.push(`[tool save_settlement] status: ok${paymentIds && paymentIds.length ? `, paymentIds: ${paymentIds.join(', ')}` : ''}`);
              }
              additionalToolCallsExecuted += 1;
            } catch (retryToolErr) {
              console.error('Error executing retry tool call:', retryToolErr);
            }
          }
          // Nudge once more to produce a user-facing message after executing tools
          const assistantAndToolMessages2 = [
            ...messagesLog.filter((m: any) => m.role === 'assistant' || m.role === 'tool')
          ];
          const retry2 = await callGemini(
            followupPrompt,
            undefined,
            session.history,
            AVAILABLE_TOOLS,
            assistantAndToolMessages2
          );
          userVisibleResponse = (retry2.text || '').trim() || userVisibleResponse;
          if ((retry2 as any)?.assistantMessage) {
            (geminiResponse as any).assistantMessageFallback2 = (retry2 as any).assistantMessage;
          }
        } else {
          userVisibleResponse = (retry.text || '').trim() || userVisibleResponse;
        }
        if ((retry as any)?.assistantMessage) {
          (geminiResponse as any).assistantMessageFallback = (retry as any).assistantMessage;
        }
      } catch (retryErr) {
        console.warn('Follow-up text-only call failed:', retryErr);
      }
    }

    // Server-side confirmation heuristic and robust fallback messaging
    const promptText = String(prompt || '').toLowerCase();
    const confirms = /(confirm|looks good|save|go ahead|yes|yep|sure|do it|finalize|complete|done)\b/i.test(promptText);
    const hasReadyEqualSplit = !!(
      updatedBillData?.totalAmount &&
      Array.isArray(updatedBillData?.users) &&
      (updatedBillData.users as User[]).length >= 2 &&
      updatedBillData?.payer &&
      (updatedBillData?.splitMethod === 'equal')
    );

    // If user text implies confirmation and we are ready, mark confirmed
    if (confirms && hasReadyEqualSplit) {
      updatedBillData.confirmed = true;
    }

    // If still no payments and now confirmed + ready, save settlement server-side (equal split)
    if ((!paymentIds || paymentIds.length === 0) && updatedBillData?.confirmed && hasReadyEqualSplit) {
      try {
        const allUsersList = (updatedBillData.users as User[]) || [];
        const payerUser = updatedBillData.payer as User;
        const totalCents = Math.round((updatedBillData.totalAmount as number) * 100);
        const peopleCount = allUsersList.length;
        const perPersonBase = Math.floor(totalCents / peopleCount);
        const remainder = totalCents - perPersonBase * peopleCount;
        // Distribute remainder by user order for determinism
        const payments = allUsersList
          .map((u, idx) => ({
            username: u.username,
            shareCents: perPersonBase + (idx < remainder ? 1 : 0),
          }))
          .filter(({ username }) => username !== payerUser.username)
          .map(({ username, shareCents }) => ({
            sender: username,
            recipient: payerUser.username,
            amount: shareCents / 100,
          }));
        if (payments.length > 0) {
          const autoIds = await handleSaveSettlement(
            { payments },
            allUsersList,
            updatedBillData
          );
          paymentIds = autoIds;
          updatedBillData.settlement = autoIds;
        }
      } catch (autoErr2) {
        console.warn('Equal-split server-side save failed:', autoErr2);
      }
    }

    // If we still don't have any user-visible text, synthesize a concise message
    if (!userVisibleResponse) {
      const missing: string[] = [];
      if (!updatedBillData?.totalAmount) missing.push('total amount');
      if (!updatedBillData?.payer) missing.push('payer');
      if (!updatedBillData?.splitMethod) missing.push('split method');

      if (missing.length > 0) {
        userVisibleResponse = `Got it. Please provide: ${missing.join(', ')}.`;
      } else if (updatedBillData?.splitMethod === 'equal' && Array.isArray(updatedBillData?.users) && updatedBillData.users.length > 0) {
        const allUsersList = updatedBillData.users as User[];
        const payerUser = updatedBillData.payer as User | undefined;
        if (updatedBillData.totalAmount && payerUser) {
          const totalCents = Math.round((updatedBillData.totalAmount as number) * 100);
          const perPersonBase = Math.floor(totalCents / allUsersList.length);
          const remainder = totalCents - perPersonBase * allUsersList.length;
          const lines: string[] = [];
          allUsersList.forEach((u, idx) => {
            const share = (perPersonBase + (idx < remainder ? 1 : 0)) / 100;
            if (u.username !== payerUser.username) {
              lines.push(`${u.username} owes ${payerUser.username} $${share.toFixed(2)}`);
            }
          });
          if (lines.length > 0) {
            userVisibleResponse = `Equal split on $${(updatedBillData.totalAmount as number).toFixed(2)}.\n${lines.join('\n')}\nConfirm to save?`;
          } else {
            userVisibleResponse = 'Ready to confirm the equal split?';
          }
        } else {
          userVisibleResponse = 'Who paid and what is the total?';
        }
      } else {
        userVisibleResponse = 'How would you like to split the bill? (equal, item-wise, ratio)';
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

    // Optional: summarize executed tool calls as a compact model message
    // Do not surface tool summaries to the user; keep them internal only
    const toolSummaryMessage = null;

    // If model set confirmed=true but did not call save_settlement, try equal-split fallback
    try {
      const shouldAutoSave =
        (!paymentIds || paymentIds.length === 0) &&
        updatedBillData?.confirmed === true &&
        updatedBillData?.totalAmount &&
        Array.isArray(updatedBillData?.users) &&
        updatedBillData.users.length > 0 &&
        updatedBillData?.payer &&
        (updatedBillData?.splitMethod === "equal" || !updatedBillData?.splitMethod);

      if (shouldAutoSave) {
        const payerUser = updatedBillData.payer as User;
        const allUsersList = (updatedBillData.users as User[]) || [];
        const owers = allUsersList.filter((u) => u.username !== payerUser.username);

        if (owers.length > 0) {
          const totalCents = Math.round((updatedBillData.totalAmount as number) * 100);
          const perPersonBase = Math.floor(totalCents / allUsersList.length);
          const remainder = totalCents - perPersonBase * allUsersList.length;
          const payments = allUsersList
            .map((u, idx) => ({
              username: u.username,
              shareCents: (perPersonBase + (idx < remainder ? 1 : 0)),
            }))
            .filter(({ username }) => username !== payerUser.username)
            .map(({ username, shareCents }) => ({
              sender: username,
              recipient: payerUser.username,
              amount: shareCents / 100,
            }));

          const autoIds = await handleSaveSettlement(
            { payments },
            allUsersList,
            { ...updatedBillData, splitMethod: updatedBillData.splitMethod || "equal" }
          );
          paymentIds = autoIds;
          updatedBillData.settlement = autoIds;
        }
      }
    } catch (autoErr) {
      console.warn("Auto-save settlement fallback failed:", autoErr);
    }

    // Create AI response message (with tool calls removed)
    const aiMessage = {
      role: "model" as const,
      parts: [{ text: userVisibleResponse }],
      timestamp: new Date(),
    };

    // Update session data
    const updatedSessionData = {
      sessionId: session.sessionId,
      userId: session.userId,
      history: [
        ...session.history,
        userMessage,
        ...(toolSummaryMessage ? [toolSummaryMessage] : []),
        aiMessage,
      ],
      images: session.images, // Keep/augment image URLs
      billData: updatedBillData,
      updatedAt: new Date(),
    };

    await updateSession(updatedSessionData);
    console.log("Session updated successfully");

    // 7. Return response with bill splitting context
    // Determine completion status based on tool execution
    const isCompleted = paymentIds && paymentIds.length > 0;
    
    const responseData = {
      response: {
        ...geminiResponse,
        text: userVisibleResponse // Use clean response without tool calls
      },
      sessionId: session.sessionId,
      messageCount: updatedSessionData.history.length,
      isFirstPrompt,
      hasImage: !!imageDataForGemini,
      billSplitting: {
        completed: isCompleted,
        data: updatedBillData,
        paymentIds,
        toolCallsExecuted: toolCalls.length + additionalToolCallsExecuted,
      },
      // For debugging and verifying tool-call message format
      toolCallProtocol: {
        assistantMessage: geminiResponse.assistantMessage || null,
        toolMessages: messagesLog.filter((m: any) => m.role === 'tool'),
      }
    };

    if (stream) {
      // Create a streaming response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        start(controller) {
          // Send the response in chunks to simulate streaming
          const text = userVisibleResponse || "";
          const words = text.split(' ');
          let currentText = '';
          
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
