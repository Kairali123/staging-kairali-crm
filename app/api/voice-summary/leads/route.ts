import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

function safeDate(val: any): string {
    if (!val) return "";
    try {
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return "";
            const p = (n: number) => String(n).padStart(2, "0");
            return val.getFullYear() + "-" + p(val.getMonth() + 1) + "-" + p(val.getDate()) + "T" + p(val.getHours()) + ":" + p(val.getMinutes()) + ":" + p(val.getSeconds());
        }
        const str = String(val).trim();
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
        if (m) return m[1] + "-" + m[2] + "-" + m[3] + "T" + m[4] + ":" + m[5] + ":" + m[6];
        return str;
    } catch {
        return "";
    }
}

function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return safeDate(val);
    return String(val).trim();
}

function mapSentRow(row: any, i: number) {
    return {
        srNo: i,
        timestamp: safeDate(row.generate_timestamp),
        enquiryId: safeStr(row.enquiry_id),
        nameOfClient: safeStr(row.name_of_client),
        mobile: safeStr(row.mobile),
        emailId: safeStr(row.email_id),
        subjects: safeStr(row.subjects),
        notes: safeStr(row.notes),
        ivrUrl: safeStr(row.ivr_url),
        websiteName: safeStr(row.website_name),
        dataSource: safeStr(row.data_source),
        source: safeStr(row.verified_source || row.data_source),
        company: safeStr(row.website_name),
        campaignId: safeStr(row.campaign_id),
        campaignName: safeStr(row.campaign_name),
        assignTo: safeStr(row.assign_to),
        responseFromKserve: safeStr(row.response_from_kserve),
        codeStatus: safeStr(row.code_status),
        leadIntent: safeStr(row.lead_intent)
    };
}

function mapRcvdRow(row: any, i: number) {
    const clientDetails = [safeStr(row.client_name), safeStr(row.mobile), safeStr(row.email)]
        .filter(Boolean)
        .join(' · ');
        
    return {
        srNo: i,
        timestamp: safeDate(row.timestamp),
        enquiryId: safeStr(row.lead_id || row.id),
        clientDetails,
        subject: safeStr(row.subject),
        websiteName: safeStr(row.website_name),
        source: safeStr(row.verified_source),
        dataSource: safeStr(row.data_source),
        company: safeStr(row.company),
        callSubId: safeStr(row.call_sub_id),
        initialId: safeStr(row.initial_id),
        callStartTime: safeDate(row.call_start_time),
        callEndTime: safeDate(row.call_end_time),
        callDuration: safeStr(row.call_duration_sec),
        callStatus: safeStr(row.call_status),
        callRecording: safeStr(row.call_recording_url || row.transcription_view_url),
        callEndReason: safeStr(row.call_end_reason),
        finalCallStatus: safeStr(row.calculated_qualification_status),
        callOutcome: safeStr(row.call_outcome),
        finalLeadOutcome: safeStr(row.final_lead_outcome),
        customerIntent: safeStr(row.customer_intent),
        customerInterestLevel: safeStr(row.interest_level),
        preferredDateTime: safeDate(row.preferred_datetime),
        scheduledTime: safeDate(row.followup_time),
        scheduledStatus: safeStr(row.followup_status),
        aiCallSummary: safeStr(row.ai_call_summary),
        assignTo: safeStr(row.assigned_mr)
    };
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');
        const companyParam = searchParams.get('company');
        const srcParam = searchParams.get('src');
        const intentParam = searchParams.get('intent');
        const statusParam = searchParams.get('status');

        if (!dateParam || !statusParam) {
            return NextResponse.json({ success: false, message: 'Missing date or status parameter' }, { status: 400 });
        }

        let formattedDate = dateParam;
        const dObj = new Date(dateParam);
        if (!isNaN(dObj.getTime())) {
            const p = (n: number) => String(n).padStart(2, "0");
            formattedDate = dObj.getFullYear() + "-" + p(dObj.getMonth() + 1) + "-" + p(dObj.getDate());
        }

        const pool = await getPool();
        const connection = await pool.getConnection();
        let rows: any[] = [];

        try {
            if (statusParam === 'SENT') {
                const query = "SELECT * FROM ai_voice_leads_sent WHERE DATE(generate_timestamp) = ? ORDER BY generate_timestamp DESC";
                [rows] = await connection.execute(query, [formattedDate]) as any[];
            } else {
                const query = "SELECT a.* FROM ai_voice_leads_received a INNER JOIN (SELECT MAX(id) AS max_id FROM ai_voice_leads_received GROUP BY initial_id) b ON a.id = b.max_id WHERE DATE(a.timestamp) = ? ORDER BY a.id DESC";
                [rows] = await connection.execute(query, [formattedDate]) as any[];
            }
        } finally {
            connection.release();
        }

        const filtered = rows.filter(row => {
            // COMPANY
            let companyName = '';
            if (statusParam === 'SENT') {
                const wName = (row.website_name || '').trim();
                if (wName === 'Kairali The Ayurvedic Healing Village') companyName = 'KTAHV';
                else if (wName === 'Kairali Ayurvedic Centers') companyName = 'KAC';
                else if (wName === 'Kairali Ayurvedic Products') companyName = 'KAPPL';
                else if (wName === 'Villaraag') companyName = 'VILLARAAG';
                else companyName = 'KAPPL';
            } else {
                const c = (row.company || '').toUpperCase();
                const w = (row.website_name || '').toLowerCase();
                if (c.includes("VILLARAAG") || w.includes("villaraag")) companyName = "VILLARAAG";
                else if (c.includes("KTAHV") || c.includes("HEALING VILLAGE") || c.includes("AHV") || w.includes("healing village") || w.includes("ktahv")) companyName = "KTAHV";
                else if (c.includes("KAPPL") || c.includes("AYURVEDIC PRODUCTS") || c.includes("KAP") || w.includes("ayurvedic products") || w.includes("kappl")) companyName = "KAPPL";
                else companyName = "KAC";
            }

            if (companyParam && companyParam !== 'ALL') {
                if (companyName !== companyParam) return false;
            }

            // SOURCE
            let sourceName = (row.verified_source || '').trim() || 'Others';
            if (srcParam && srcParam !== 'ALL') {
                if (sourceName !== srcParam) return false;
            }

            // INTENT AND STATUS
            if (statusParam === 'SENT') {
                const codeStatus = (row.code_status || '').toLowerCase();
                const received = (row.received || '').toLowerCase();
                if (codeStatus !== 'success' && received !== 'kserve') return false;

                const intent = (row.lead_intent || '').toLowerCase();
                if (intentParam === 'HIGH' && intent !== 'high') return false;
                if (intentParam === 'MEDIUM' && intent !== 'medium') return false;
                if (intentParam === 'LOW' && (intent === 'high' || intent === 'medium')) return false; 
            } else {
                const qStatus = row.calculated_qualification_status;
                const cIntent = (row.customer_intent || '').toLowerCase();

                if (statusParam === 'QUALIFIED' && qStatus !== 'Qualified') return false;
                if (statusParam === 'NON_QUALIFIED' && qStatus !== 'Non-Qualified') return false;
                if (statusParam === 'PENDING' && qStatus !== 'Pending' && qStatus !== 'Pending/Rescheduled') return false;

                if (intentParam === 'HIGH' && !cIntent.includes('high')) return false;
                if (intentParam === 'MEDIUM' && !cIntent.includes('medium')) return false;
                if (intentParam === 'LOW' && (cIntent.includes('high') || cIntent.includes('medium'))) return false;
            }

            return true;
        });

        const data = statusParam === 'SENT' 
            ? filtered.map((row, i) => mapSentRow(row, i + 1))
            : filtered.map((row, i) => mapRcvdRow(row, i + 1));

        return NextResponse.json({ success: true, data });

    } catch {
        console.error('Modal Leads API Error: request failed');
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
