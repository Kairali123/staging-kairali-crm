import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const otpFilePath = path.join(process.cwd(), 'temp', 'last_otp.txt');
    if (!fs.existsSync(otpFilePath)) {
      return NextResponse.json({ otp: 'No OTP generated yet' });
    }
    const otp = fs.readFileSync(otpFilePath, 'utf8').trim();
    return NextResponse.json({ otp });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
