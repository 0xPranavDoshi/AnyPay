// utils/cookie-server.ts
// Server-only cookie helpers using next/headers
import { cookies } from 'next/headers';

export async function getCookie(name: string): Promise<string | null> {
  // In Next.js route handlers, cookies() must be awaited
  const store = await cookies();
  const cookie = store.get(name);
  return cookie?.value ?? null;
}
