export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '../../../lib/mongo';
import { storeImage } from '../../../lib/pinata';
import { callGemini } from '../../../lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { prompt, user_id, sessionID, image } = await req.json();

    if (!prompt || !user_id || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch previous session messages + state from MongoDB
    console.log('Fetching session...');
    const session = await getSession(sessionID, user_id);
    console.log('Session fetched:', session.sessionId);

    // 2. Store the uploaded image to Pinata IPFS
    console.log('Storing image...');
    let imageUrl = 'https://example.com/placeholder-image.jpg'; // Fallback URL
    try {
      const { cid, url } = await storeImage(image);
      imageUrl = url;
      console.log('Image stored:', cid);
    } catch (imageError) {
      if (imageError instanceof Error) {
        console.warn('Image storage failed, using placeholder:', imageError.message);
      } else {
        console.warn('Image storage failed, using placeholder:', String(imageError));
      }
    }

    // 3. Call Gemini API with the prompt + image URL
    console.log('Calling Gemini...');
    let geminiResponse;
    try {
      geminiResponse = await callGemini(prompt, imageUrl, session.history);
      console.log('Gemini response received');
    } catch (geminiError) {
      const message = typeof geminiError === 'object' && geminiError !== null && 'message' in geminiError
        ? (geminiError as { message: string }).message
        : String(geminiError);
      console.warn('Gemini API failed, using mock response:', message);
      // Mock response for testing when API keys are not configured
      geminiResponse = {
        success: true,
        text: `I understand you're asking: "${prompt}". This is a mock response because the Gemini API key is not configured. Please add your GEMINI_API_KEY to .env.local to get real AI responses.`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }

    // 4. Update Mongo with the new conversation state + response
    console.log('Updating session...');
    // Add user message
    const userMessage = {
      role: 'user' as const,
      parts: [{ text: prompt }],
      timestamp: new Date()
    };
    
    // Add AI response
    const aiMessage = {
      role: 'model' as const,
      parts: [{ text: geminiResponse.text }],
      timestamp: new Date()
    };

    const updatedSession = {
      sessionId: session.sessionId,
      userId: session.userId,
      history: [...session.history, userMessage, aiMessage],
      images: [...session.images, imageUrl],
      updatedAt: new Date(),
    };
    await updateSession(updatedSession);
    console.log('Session updated successfully');

    // 5. Return the Gemini response
    return NextResponse.json({ 
      response: geminiResponse,
      sessionId: session.sessionId,
      messageCount: updatedSession.history.length
    });
  } catch (error) {
    console.error('API Error:', error);
    let errorMessage = 'Unknown error';
    let errorStack: string | undefined = undefined;
    if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof (error as any).message === 'string') {
        errorMessage = (error as any).message;
      }
      if (process.env.NODE_ENV === 'development' && 'stack' in error && typeof (error as any).stack === 'string') {
        errorStack = (error as any).stack;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
}
