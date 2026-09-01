'use server';

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

function normalizeCompanyFilter(value?: string) {
    const raw = safeStr(value).toUpperCase();
    if (!raw || raw === "ALL") return "";
    if (raw === "VILLARAAG") return "VILLA RAAG";
    return raw;
}

function normalizeSourceFilter(value?: string) {
    const raw = safeStr(value);
    if (!raw || raw.toLowerCase() === "all") return "";
    return raw;
}

function mapSentCompany(websiteName: string) {
    const wName = safeStr(websiteName);
    if (wName === "Kairali The Ayurvedic Healing Village") return "KTAHV";
    if (wName === "Kairali Ayurvedic Centers") return "KAC";
    if (wName === "Kairali Ayurvedic Products") return "KAPPL";
    if (wName === "Villaraag") return "VILLA RAAG";
    return "KAPPL";
}

function mapReceivedCompany(company: string, websiteName: string) {
    const c = safeStr(company).toUpperCase();
    const w = safeStr(websiteName).toLowerCase();

    if (c.includes("VILLARAAG") || w.includes("villaraag")) return "VILLA RAAG";
    if (c.includes("KTAHV") || c.includes("HEALING VILLAGE") || c.includes("AHV") || w.includes("healing village") || w.includes("ktahv")) return "KTAHV";
    if (c.includes("KAPPL") || c.includes("AYURVEDIC PRODUCTS") || c.includes("KAP") || w.includes("ayurvedic products") || w.includes("kappl")) return "KAPPL";
    return "KAC";
}

function normalizeSourceName(value: any) {
    return safeStr(value) || "Others";
}

function getQualificationBucket(value: any) {
    const status = safeStr(value).toLowerCase();
    if (status === "qualified") return "qualified";
    if (status === "non-qualified" || status === "non qualified" || status === "not qualified" || status === "unqualified" || status === "junk") return "dead";
    return "pending";
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
        leadIntent: safeStr(row.lead_intent),
        urgency: safeStr(row.urgency),
    };
}

function mapRcvdRow(row: any, i: number) {
    const clientDetails = [safeStr(row.client_name), safeStr(row.mobile), safeStr(row.email)]
        .filter(Boolean)
        .join(' · ');

    return {
        srNo: i,
        timestamp: safeDate(row.created_at),
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
        finalCallStatus: safeStr(row.final_call_status),
        callOutcome: safeStr(row.call_outcome),
        finalLeadOutcome: safeStr(row.final_lead_outcome),
        customerIntent: safeStr(row.customer_intent),
        customerInterestLevel: safeStr(row.interest_level),
        preferredDateTime: safeDate(row.preferred_datetime),
        scheduledTime: safeDate(row.followup_time),
        scheduledStatus: safeStr(row.followup_status),
        aiCallSummary: safeStr(row.ai_call_summary),
        assignTo: safeStr(row.assigned_mr),
        calculatedstatus:safeStr(row.calculated_qualification_status)
    };
}

export async function fetchCRMTableData(filters?: { dateFrom?: string; dateTo?: string; company?: string; source?: string }) {
    try {
        const pool = await getPool();
        const selectedCompany = normalizeCompanyFilter(filters?.company);
        const selectedSource = normalizeSourceFilter(filters?.source);

        let sentWhere = "generate_timestamp IS NOT NULL AND (LOWER(COALESCE(code_status,'')) = 'success' OR LOWER(COALESCE(received,'')) = 'kserve')";
        let rcvdWhere = "1=1";

        const paramsSent: any[] = [];
        const paramsRcvd: any[] = [];

        if (filters?.dateFrom) {
            sentWhere += " AND DATE(generate_timestamp) >= ?";
            rcvdWhere += " AND DATE(a.timestamp) >= ?";
            paramsSent.push(filters.dateFrom);
            paramsRcvd.push(filters.dateFrom);
        }
        if (filters?.dateTo) {
            sentWhere += " AND DATE(generate_timestamp) <= ?";
            rcvdWhere += " AND DATE(a.timestamp) <= ?";
            paramsSent.push(filters.dateTo);
            paramsRcvd.push(filters.dateTo);
        }

        const sentQuery = `SELECT * FROM ai_voice_leads_sent WHERE ${sentWhere} ORDER BY generate_timestamp DESC`;
        const receivedQuery = `SELECT a.* FROM ai_voice_leads_received a INNER JOIN (SELECT initial_id, MAX(id) AS latest_id FROM ai_voice_leads_received WHERE initial_id IS NOT NULL GROUP BY initial_id) latest ON a.id = latest.latest_id WHERE ${rcvdWhere} ORDER BY a.id DESC`;

        const [sentRows]: any = await pool.query(sentQuery, paramsSent);
        const [receivedRows]: any = await pool.query(receivedQuery, paramsRcvd);

        const mergedMap: Record<string, any> = {};

        const getGroup = (dateStr: string, companyName: string, sourceName: string) => {
            const key = `${dateStr}_${companyName}_${sourceName}`;
            if (!mergedMap[key]) {
                mergedMap[key] = {
                    group_date: dateStr,
                    company_name: companyName,
                    source_name: sourceName,

                    sent: 0, sent_high: 0, sent_medium: 0, sent_low: 0,
                    responses: 0,
                    qual_count: 0, qual_high: 0, qual_medium: 0, qual_low: 0,
                    dead_count: 0, dead_high: 0, dead_medium: 0, dead_low: 0,
                    pending_count: 0, pending_high: 0, pending_medium: 0, pending_low: 0,
                    tat_qualified: 0, tat_dead: 0, tat_pending: 0,

                    sentLeads: [],
                    receivedLeads: []
                };
            }
            return mergedMap[key];
        };

        const formatDate = (date: any) => {
            if (!date) return "";
            const d = new Date(date);
            if (isNaN(d.getTime())) return "";
            return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        };

        sentRows.forEach((row: any) => {
            const dateStr = formatDate(row.generate_timestamp);
            if (!dateStr) return;

            const companyName = mapSentCompany(row.website_name);
            const sourceName = normalizeSourceName(row.verified_source || row.data_source);
            if (selectedCompany && companyName !== selectedCompany) return;
            if (selectedSource && sourceName !== selectedSource) return;

            const group = getGroup(dateStr, companyName, sourceName);
            const intent = (row.lead_intent || '').toLowerCase();

            group.sent++;
            if (intent === 'high') group.sent_high++;
            else if (intent === 'medium') group.sent_medium++;
            else group.sent_low++;

            group.sentLeads.push(mapSentRow(row, group.sentLeads.length + 1));
        });

        receivedRows.forEach((row: any) => {
            const dateStr = formatDate(row.timestamp);
            if (!dateStr) return;

            const companyName = mapReceivedCompany(row.company, row.website_name);
            const sourceName = normalizeSourceName(row.verified_source || row.data_source);
            if (selectedCompany && companyName !== selectedCompany) return;
            if (selectedSource && sourceName !== selectedSource) return;

            const group = getGroup(dateStr, companyName, sourceName);

            const qBucket = getQualificationBucket(row.calculated_qualification_status);
            const intent = (row.customer_intent || '').toLowerCase();
            const tat = Number(row.tat || 0);

            if (qBucket === 'qualified') {
                group.responses++;
                group.qual_count++;
                group.tat_qualified += tat;
                if (intent.includes('high')) group.qual_high++;
                else if (intent.includes('medium')) group.qual_medium++;
                else group.qual_low++;
            } else if (qBucket === 'dead') {
                group.responses++;
                group.dead_count++;
                group.tat_dead += tat;
                if (intent.includes('high')) group.dead_high++;
                else if (intent.includes('medium')) group.dead_medium++;
                else group.dead_low++;
            } else {
                group.pending_count++;
                group.tat_pending += tat;
                if (intent.includes('high')) group.pending_high++;
                else if (intent.includes('medium')) group.pending_medium++;
                else group.pending_low++;
            }

            group.receivedLeads.push(mapRcvdRow(row, group.receivedLeads.length + 1));
        });

        const groupsMap: Record<string, any> = {};
        Object.values(mergedMap).forEach(row => {
            const dateStr = row.group_date;
            if (!groupsMap[dateStr]) {
                groupsMap[dateStr] = { date: dateStr, sources: [] };
            }
            groupsMap[dateStr].sources.push({
                company: row.company_name,
                source: row.source_name,
                sent: row.sent, sentHigh: row.sent_high, sentMedium: row.sent_medium, sentLow: row.sent_low,
                responses: row.responses,
                qualified: row.qual_count, qualHigh: row.qual_high, qualMedium: row.qual_medium, qualLow: row.qual_low,
                dead: row.dead_count, deadHigh: row.dead_high, deadMedium: row.dead_medium, deadLow: row.dead_low,
                pending: row.pending_count, pendingHigh: row.pending_high, pendingMedium: row.pending_medium, pendingLow: row.pending_low,
                tatQualified: row.tat_qualified, tatDead: row.tat_dead, tatPending: row.tat_pending,
                sentLeads: row.sentLeads,
                receivedLeads: row.receivedLeads
            });
        });

        return Object.values(groupsMap);

    } catch (error) {
        console.error('Database Error:', error);
        return [];
    }
}
