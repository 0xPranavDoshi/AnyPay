// utils/cookie-server.ts
// Server-only cookie helpers using next/headers
import { cookies } from 'next/headers';

export async function getCookie(name: string): Promise<string | null> {
  const store = cookies();
  const cookie = store.get(name);
  return cookie?.value ?? null;
}

