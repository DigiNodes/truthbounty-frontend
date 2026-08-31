import { NextResponse } from 'next/server';
import type { RpContext } from '@worldcoin/idkit';

function parseRpContext(): RpContext | null {
  const raw = process.env.WORLDCOIN_RP_CONTEXT_JSON;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RpContext;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.walletAddress) {
    return NextResponse.json({ message: 'walletAddress is required' }, { status: 400 });
  }

  const rpContext = parseRpContext();
  if (!rpContext) {
    return NextResponse.json(
      { message: 'Worldcoin RP context is not configured on the server' },
      { status: 503 },
    );
  }

  return NextResponse.json(rpContext);
}
