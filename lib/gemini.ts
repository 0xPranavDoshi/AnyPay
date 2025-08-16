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
    // Do not inline base64; pass URL directly as the model expects
    currentContent.push({ type: 'image_url', image_url: { url: imageData } });
  }

  // Add current message
  messages.push({ role: 'user', content: currentContent });

  const requestBody = {
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-5-nano',
    messages,
    temperature: 0.7,
    max_tokens: 8192,
    top_p: 0.95,
  };

  console.log('Calling OpenRouter with model:', requestBody.model);

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

  // Robustly extract text (flatten arrays/objects)
  let text: string = '';
  const choice = result?.choices?.[0] ?? {};
  const msg = choice?.message ?? {};
  const content = msg?.content ?? choice?.content ?? choice?.text;
  const flatten = (node: any): string[] => {
    if (!node) return [];
    if (typeof node === 'string') return [node];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node === 'object') {
      const keys = ['text', 'content', 'value', 'output_text'];
      const parts: string[] = [];
      for (const k of keys) {
        if (typeof node[k] === 'string') parts.push(node[k]);
        else if (node[k]) parts.push(...flatten(node[k]));
      }
      // some providers nest under message -> content -> [ { type, text } ]
      for (const v of Object.values(node)) {
        if (v && typeof v === 'object') parts.push(...flatten(v));
      }
      return parts;
    }
    return [];
  };
  text = flatten(content).join('\n').trim();
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
