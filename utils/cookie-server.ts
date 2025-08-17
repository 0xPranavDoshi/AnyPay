// utils/cookie-server.ts
// Server-only cookie helpers using next/headers
import { cookies } from "next/headers";

export async function getCookie(name: string): Promise<string | null> {
  const store = await cookies();

  console.log("store", store);
  const cookie = store.get(name);

  console.log("cookie", cookie);
  return cookie?.value ?? null;
}
