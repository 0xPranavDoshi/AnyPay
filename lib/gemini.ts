// Keep your external shape if you like
export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export async function callGemini(prompt: string, imageData?: string, history: ChatMessage[] = []) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  // Convert history to OpenAI format messages
  const messages: any[] = [];
  
  // Add conversation history
  for (const msg of history) {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const content: any[] = [];
    
    for (const part of msg.parts) {
      if (part.text) {
        content.push({ type: 'text', text: part.text });
      }
      if (part.inlineData) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        });
      }
    }
    
    messages.push({ role, content });
  }

  // Build current message content
  const currentContent: any[] = [{ type: 'text', text: prompt }];

  // Handle image data
  if (imageData) {
    try {
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        // Handle base64 data URL directly
        currentContent.push({
          type: 'image_url',
          image_url: { url: imageData }
        });
      } else {
        // Handle regular URL - fetch and convert to base64
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(imageData, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
        const mimeType = res.headers.get('content-type') || 'image/jpeg';
        const buf = Buffer.from(await res.arrayBuffer());
        const base64Data = buf.toString('base64');
        
        currentContent.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Data}` }
        });
      }
    } catch (e) {
      console.error('Image processing failed; continuing without image:', e);
    }
  }

  // Add current message
  messages.push({ role: 'user', content: currentContent });

  const requestBody = {
    model: 'google/gemini-2.0-flash-exp:free',
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.95,
  };

  console.log('Calling OpenRouter with model: google/gemini-2.0-flash-exp:free');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://anypay.app',
      'X-Title': 'AnyPay Receipt Splitter'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Debug logging for empty responses
  const text = result.choices?.[0]?.message?.content || '';
  if (!text || text.trim() === '') {
    console.warn('OpenRouter returned empty text response');
    console.warn('Finish reason:', result.choices?.[0]?.finish_reason);
    console.warn('Full response:', JSON.stringify(result, null, 2));
  }

  return {
    success: true,
    text,
    usage: {
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
      totalTokens: result.usage?.total_tokens ?? 0,
    },
  };
}
