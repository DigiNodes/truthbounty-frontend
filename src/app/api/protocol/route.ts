import { NextResponse } from 'next/server';
import { getProtocolDiagnostics } from '@/lib/contracts/registry';

export async function GET() {
  return NextResponse.json(getProtocolDiagnostics());
}
