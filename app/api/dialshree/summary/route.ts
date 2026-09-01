import { NextRequest, NextResponse } from 'next/server';
import { fetchDialShreeTableData } from '@/app/actions/dialShreeSummaryData';
import { getSessionUserResult, hasDialShreeSummaryAccess } from '@/lib/authz';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
};

export async function GET(req: NextRequest) {
    try {
        const session = getSessionUserResult(req);

        if (session.state === 'missing') {
            return NextResponse.json(
                { success: false, error: 'Access denied: Not logged in' },
                { status: 401, headers: noStoreHeaders }
            );
        }

        if (session.state === 'invalid') {
            return NextResponse.json(
                { success: false, error: 'Access denied: Invalid session' },
                { status: 401, headers: noStoreHeaders }
            );
        }

        const user = session.user;

        if (!hasDialShreeSummaryAccess(user)) {
            return NextResponse.json(
                { success: false, error: 'Access denied: Insufficient permissions to view DialShree summary data' },
                { status: 403, headers: noStoreHeaders }
            );
        }

        const { searchParams } = new URL(req.url);
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const company = searchParams.get('company') || undefined;
        const source = searchParams.get('source') || undefined;

        const data = await fetchDialShreeTableData({ dateFrom, dateTo, company, source });

        return NextResponse.json({
            success: true,
            data,
        }, {
            headers: noStoreHeaders
        });

    } catch (error: any) {
        console.error('DialShree Summary API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch DialShree summary data', error: error?.message, data: [] },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
