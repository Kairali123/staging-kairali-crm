import { NextRequest, NextResponse } from 'next/server';
import { fetchCRMTableData } from '@/app/actions/crmData';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const company = searchParams.get('company') || undefined;
        const source = searchParams.get('source') || undefined;

        const data = await fetchCRMTableData({ dateFrom, dateTo, company, source });

        return NextResponse.json({
            success: true,
            data,
        });

    } catch (error) {
        console.error('Voice Summary API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch CRM summary data', data: [] },
            { status: 500 }
        );
    }
}