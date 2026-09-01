import { NextRequest, NextResponse } from 'next/server';
import { fetchDialShreeTableData } from '@/app/actions/dialShreeSummaryData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
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
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        });

    } catch (error) {
        console.error('DialShree Summary API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch DialShree summary data', data: [] },
            { status: 500 }
        );
    }
}
