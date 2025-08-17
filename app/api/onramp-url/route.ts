import { NextRequest, NextResponse } from 'next/server';
import { generateOnrampUrl } from '@/utils/onramp';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

// Use CDP API keys from environment
const COINBASE_API_KEY = process.env.NEXT_PUBLIC_CDP_API_KEY_ID!;
const COINBASE_API_SECRET = process.env.NEXT_PUBLIC_CDP_API_KEY_SECRET!;

const COINBASE_SESSION_TOKEN_URL = 'https://api.developer.coinbase.com/onramp/v1/token';

async function getSessionToken(address: string, blockchains: string[], assets: string[]) {
  // Use the official Coinbase SDK to generate the JWT
  const jwtToken = await generateJwt({
    apiKeyId: COINBASE_API_KEY,
    apiKeySecret: COINBASE_API_SECRET,
    requestMethod: 'POST',
    requestHost: 'api.developer.coinbase.com',
    requestPath: '/onramp/v1/token',
    expiresIn: 120,
  });

  // Call Coinbase Session Token API
  const res = await fetch(COINBASE_SESSION_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addresses: [{ address, blockchains }],
      assets,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Coinbase session token error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  
  // Handle different possible response formats
  if (data.token) {
    return data.token;
  } else if (data.data && data.data.token) {
    return data.data.token;
  } else {
    throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, blockchains = ['base'], assets = ['USDC'], ...onrampOpts } = await req.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    const sessionToken = await getSessionToken(address, blockchains, assets);
    const url = generateOnrampUrl({ sessionToken, ...onrampOpts });
    
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
