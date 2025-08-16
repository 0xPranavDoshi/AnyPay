import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';

// Keep your external shape if you like
export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export async function callGemini(prompt: string, imageUrl?: string, history: ChatMessage[] = []) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  // Map your history -> SDK types to satisfy the union (Part) properly
  const historyAsContent: Content[] = history.map((m) => ({
    role: m.role,
    parts: m.parts.map((p) => {
      if (typeof p.text === 'string') {
        return { text: p.text } as Part;
      }
      if (p.inlineData) {
        return {
          inlineData: {
            mimeType: p.inlineData.mimeType,
            data: p.inlineData.data,
          },
        } as Part;
      }
      // Defensive fallback: empty text part
      return { text: '' } as Part;
    }),
  }));

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // 👇 switch to 2.5 Flash
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    // (optional) systemInstruction: 'You are a receipt-splitting assistant...'
  });

  // Build current message parts as proper SDK Parts
  const parts: Part[] = [{ text: prompt }];

  // If you’re on Next.js App Router, ensure this runs in the Node runtime, not Edge:
  // export const runtime = 'nodejs'  (in your route file)
  if (imageUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(imageUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
      const mimeType = res.headers.get('content-type') || 'image/jpeg';
      const buf = Buffer.from(await res.arrayBuffer());
      parts.push({
        inlineData: {
          mimeType,
          data: buf.toString('base64'),
        },
      });
    } catch (e) {
      console.error('Image fetch failed; continuing without image:', e);
    }
  }

  const chat = model.startChat({
    history: historyAsContent,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  });

  const result = await chat.sendMessage(parts);
  const resp = result.response;
  const text = resp.text();

  return {
    success: true,
    text,
    usage: {
      promptTokens: resp.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: resp.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: resp.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}
