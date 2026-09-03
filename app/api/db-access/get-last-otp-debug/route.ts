import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ error: 'Endpoint permanently disabled for security' }, { status: 404 });
}
