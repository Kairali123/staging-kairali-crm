import { NextRequest, NextResponse } from 'next/server';
import { getPool, requiresOtpProtection, executeWriteQuery, ensureDbAccessTables } from '@/lib/db';
import { verifySessionCookieValue } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbAccessTables();
    return NextResponse.json({ success: true, message: 'Database ready' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Session verification
    const userCookie = req.cookies.get('kairali_user')?.value;
    const sessionUser = userCookie ? verifySessionCookieValue(userCookie) : null;

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to access database console.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { query, otpRequestId } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'SQL query is required.' }, { status: 400 });
    }

    await ensureDbAccessTables();
    const needsOtp = requiresOtpProtection(query);

    // 2. If it is table creation (CREATE) or table/data deletion (DELETE, DROP, TRUNCATE), enforce OTP
    if (needsOtp) {
      if (!otpRequestId) {
        return NextResponse.json(
          {
            error:
              'Database action blocked: OTP verification is strictly required for creating tables (CREATE) and deleting tables/data (DELETE, DROP, TRUNCATE).',
          },
          { status: 403 }
        );
      }

      const result = await executeWriteQuery(query, [], req, otpRequestId);
      return NextResponse.json({ success: true, result });
    } else {
      // 3. For INSERT, UPDATE, SELECT, SHOW, DESCRIBE, etc. -> Execute directly without OTP!
      const pool = await getPool();
      const [result] = await pool.query(query);
      return NextResponse.json({ success: true, result });
    }
  } catch (err: any) {
    console.error('[inspect-db error]:', err);
    return NextResponse.json(
      { error: err.message || 'Database query execution failed.' },
      { status: 500 }
    );
  }
}
