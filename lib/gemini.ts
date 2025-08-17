// Chat-completions + tool_calls via OpenRouter
// Minimal wrapper returning { text, toolCalls }

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

type ToolCall = {
  id?: string;
  function?: { name?: string; arguments?: string };
};

export async function callGemini(
  prompt: string,
  imageData?: string,
  history: ChatMessage[] = [],
  tools?: any[]
) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  const MODEL = 'google/gemini-2.5-flash-lite';

  // Extract a system message from the composed prompt if present
  const messages: any[] = [];
  const SPLIT_TOKEN = '\n\nUser: ';
  let systemText = prompt;
  let userText = '';
  const idx = prompt.indexOf(SPLIT_TOKEN);
  if (idx !== -1) {
    systemText = prompt.slice(0, idx);
    userText = prompt.slice(idx + SPLIT_TOKEN.length);
  }

  messages.push({ role: 'system', content: systemText });

  // Map stored chat history
  for (const msg of history) {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const textParts: string[] = [];
    for (const p of msg.parts) {
      if (p.text) textParts.push(p.text);
    }
    const contentText = textParts.join('\n');
    messages.push({ role, content: contentText });
  }

  // Current user turn with optional image attachment using image_url schema
  if (imageData) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userText || systemText },
        { type: 'image_url', image_url: { url: imageData } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userText || systemText });
  }

  const body: any = {
    model: MODEL,
    messages,
    temperature: 0.7,
  };

  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  console.log('Calling OpenRouter with model:', MODEL);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'AnyPay',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};
    const text = (message.content ?? '').trim();
    const toolCalls: ToolCall[] = message.tool_calls ?? [];

    return { success: true, text, toolCalls, assistantMessage: message, sentMessages: messages };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw new Error(
      `OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
