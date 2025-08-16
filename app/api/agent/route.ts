export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, createFreshSession } from '../../../lib/mongo';
import { storeImage, downloadImageFromPinata } from '../../../lib/pinata';
import { callGemini } from '../../../lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { prompt, user_id, sessionID, image, refresh_session } = await req.json();

    if (!prompt || !user_id) {
      return NextResponse.json({ error: 'Missing required fields: prompt and user_id are required' }, { status: 400 });
    }

    // 1. Handle session creation/retrieval
    console.log('Handling session...');
    let session;
    
    if (refresh_session === true) {
      // Create a fresh session for new conversation (test mode)
      session = await createFreshSession(sessionID || `session-${Date.now()}`, user_id);
      console.log('Created fresh session:', session.sessionId);
    } else {
      // Get existing session or create if doesn't exist
      session = await getSession(sessionID || `session-${Date.now()}`, user_id);
      console.log('Session retrieved:', session.sessionId);
    }

    // 2. Determine if this is the first prompt or a follow-up
    const isFirstPrompt = session.history.length === 0;
    let imageDataForGemini: string | undefined;
    let imageUrl: string | undefined;

    if (isFirstPrompt) {
      // FIRST PROMPT: Handle image upload to Pinata
      if (!image) {
        return NextResponse.json({ error: 'Image is required for the first prompt' }, { status: 400 });
      }

      console.log('Processing first prompt with image upload...');
      
      try {
        // Parse and store image to Pinata
        let imageBuffer: Buffer;
        let fileName = 'image.jpg';
        
        if (typeof image === 'string' && image.startsWith('data:')) {
          // Extract MIME type and base64 data
          const matches = image.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) {
            throw new Error('Invalid base64 data URL format');
          }
          
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          // Determine file extension from MIME type
          if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
            fileName = 'image.jpg';
          } else if (mimeType.includes('png')) {
            fileName = 'image.png';
          } else if (mimeType.includes('gif')) {
            fileName = 'image.gif';
          } else if (mimeType.includes('webp')) {
            fileName = 'image.webp';
          }
          
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          // Assume it's already a buffer or other supported format
          imageBuffer = image as Buffer;
        }
        
        const { cid, url } = await storeImage(imageBuffer, fileName);
        imageUrl = url;
        imageDataForGemini = image; // Use original image data for Gemini
        console.log('Image stored to Pinata:', cid);
        
      } catch (imageError) {
        console.error('Image storage failed:', imageError);
        return NextResponse.json({ 
          error: 'Failed to store image', 
          details: imageError instanceof Error ? imageError.message : 'Unknown error'
        }, { status: 500 });
      }
      
    } else {
      // FOLLOW-UP PROMPT: Retrieve image from Pinata if available
      if (session.images.length > 0) {
        console.log('Processing follow-up prompt, downloading image from Pinata...');
        
        try {
          const lastImageUrl = session.images[session.images.length - 1];
          console.log('Downloading image from URL:', lastImageUrl);
          imageDataForGemini = await downloadImageFromPinata(lastImageUrl);
          console.log('Image downloaded from Pinata successfully');
          console.log('Downloaded image size:', imageDataForGemini?.length || 0, 'characters');
          console.log('Downloaded image starts with:', imageDataForGemini?.substring(0, 50));
        } catch (downloadError) {
          console.warn('Failed to download image from Pinata, continuing without image:', downloadError);
          imageDataForGemini = undefined;
        }
      } else {
        console.log('No images in session history, processing text-only follow-up');
        imageDataForGemini = undefined;
      }
    }

    // 3. Call Gemini API via OpenRouter with prompt, image data, and conversation history
    console.log('Calling OpenRouter (Gemini 2.0 Flash)...');
    console.log('Prompt:', prompt);
    console.log('Has image data:', !!imageDataForGemini);
    console.log('History length:', session.history.length);
    let geminiResponse;
    
    try {
      geminiResponse = await callGemini(prompt, imageDataForGemini, session.history);
      console.log('OpenRouter response received successfully');
      console.log('Response text length:', geminiResponse.text?.length || 0);
    } catch (geminiError) {
      const message = typeof geminiError === 'object' && geminiError !== null && 'message' in geminiError
        ? (geminiError as { message: string }).message
        : String(geminiError);
      console.warn('OpenRouter API failed, using mock response:', message);
      
      // Mock response for testing when API keys are not configured
      geminiResponse = {
        success: true,
        text: `I understand you're asking: "${prompt}". This is a mock response because the OpenRouter API key is not configured. Please add your OPENROUTER_API_KEY to .env.local to get real AI responses.`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }

    // 4. Update session with new conversation state
    console.log('Updating session with new messages...');
    
    // Create user message
    const userMessage = {
      role: 'user' as const,
      parts: [{ text: prompt }],
      timestamp: new Date()
    };
    
    // Create AI response message
    const aiMessage = {
      role: 'model' as const,
      parts: [{ text: geminiResponse.text }],
      timestamp: new Date()
    };

    // Update session data
    const updatedSessionData = {
      sessionId: session.sessionId,
      userId: session.userId,
      history: [...session.history, userMessage, aiMessage],
      images: imageUrl ? [...session.images, imageUrl] : session.images,
      updatedAt: new Date(),
    };
    
    await updateSession(updatedSessionData);
    console.log('Session updated successfully');

    // 5. Return response
    return NextResponse.json({ 
      response: geminiResponse,
      sessionId: session.sessionId,
      messageCount: updatedSessionData.history.length,
      isFirstPrompt,
      hasImage: !!imageDataForGemini,
      imageStored: !!imageUrl
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
