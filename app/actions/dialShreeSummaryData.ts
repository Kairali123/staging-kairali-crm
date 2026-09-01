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
        if (str.startsWith("0000-00-00")) return "";
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
        if (m) return m[1] + "-" + m[2] + "-" + m[3] + "T" + m[4] + ":" + m[5] + ":" + m[6];
        const m2 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}T${m2[4]}:${m2[5]}:${m2[6]}`;
        const m3 = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}T00:00:00`;
        const m4 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (m4) return `${m4[3]}-${m4[2]}-${m4[1]}T00:00:00`;
        return str;
    } catch {
        return "";
    }
}

function extractDateOnly(val: any): string {
    if (!val) return "";
    try {
        let iso = "";
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return "";
            const p = (n: number) => String(n).padStart(2, "0");
            iso = `${val.getFullYear()}-${p(val.getMonth() + 1)}-${p(val.getDate())}`;
        } else {
            const str = String(val).trim();
            if (str.startsWith("0000-00-00")) return "";
            const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) iso = `${m[1]}-${m[2]}-${m[3]}`;
            else {
                const m2 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                if (m2) iso = `${m2[3]}-${m2[2]}-${m2[1]}`;
                else {
                    const d = new Date(str);
                    if (!isNaN(d.getTime())) {
                        const p = (n: number) => String(n).padStart(2, "0");
                        iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
                    }
                }
            }
        }
        return iso;
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

function mapSentCompany(websiteName: string, dataSource: string, campaignName: string) {
    const s = `${safeStr(websiteName)} ${safeStr(dataSource)} ${safeStr(campaignName)}`.toUpperCase();
    if (s.includes("VILLARAAG") || s.includes("VILLA RAAG")) return "VILLA RAAG";
    if (s.includes("KTAHV") || s.includes("HEALING VILLAGE") || s.includes("AHV")) return "KTAHV";
    if (s.includes("KAPPL") || s.includes("PRODUCTS") || s.includes("KAP") || s.includes("AYURVEDIC PRODUCTS")) return "KAPPL";
    return "KAC";
}

function mapReceivedCompany(company: string, websiteName: string, dataSource: string, sheetName: string) {
    const s = `${safeStr(company)} ${safeStr(websiteName)} ${safeStr(dataSource)} ${safeStr(sheetName)}`.toUpperCase();
    if (s.includes("VILLARAAG") || s.includes("VILLA RAAG")) return "VILLA RAAG";
    if (s.includes("KTAHV") || s.includes("HEALING VILLAGE") || s.includes("AHV")) return "KTAHV";
    if (s.includes("KAPPL") || s.includes("PRODUCTS") || s.includes("KAP") || s.includes("AYURVEDIC PRODUCTS")) return "KAPPL";
    return "KAC";
}

function normalizeSourceName(value: any) {
    return safeStr(value) || "Others";
}

function deriveQualificationBucket(leadCategory: string, disposition: string) {
    const cat = safeStr(leadCategory).toLowerCase();
    const disp = safeStr(disposition).toLowerCase();

    if (cat) {
        if (cat.includes("qualified") && !cat.includes("non") && !cat.includes("not") && !cat.includes("un")) {
            return "qualified";
        }
        if (cat.includes("non") || cat.includes("not") || cat.includes("un") || cat.includes("junk") || cat.includes("cold")) {
            return "dead";
        }
    }

    if (disp) {
        if (["sale made", "converted", "transfer to mr", "call transferred", "product distributor", "product stockists"].some(k => disp.includes(k))) {
            return "qualified";
        }
        if (["cold", "not interested", "declined sale", "junk", "disconnected number", "do not call", "dead air", "wrong number", "dnc"].some(k => disp.includes(k))) {
            return "dead";
        }
    }

    return "pending";
}

function parseTatSeconds(val: any): number {
    if (!val || val === "—") return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const s = String(val).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const parts = s.split(":").map(Number);
    if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2 && parts.every(p => !isNaN(p))) {
        return parts[0] * 60 + parts[1];
    }
    const floatVal = parseFloat(s);
    return isNaN(floatVal) ? 0 : floatVal;
}

function mapSentRow(row: any, i: number) {
    return {
        srNo: i,
        timestamp: safeDate(row.timestamp),
        enquiryId: safeStr(row.lead_id || row.id),
        nameOfClient: safeStr(row.name_of_client),
        mobile: safeStr(row.mobile),
        emailId: safeStr(row.email_id),
        subjects: safeStr(row.subjects),
        notes: safeStr(row.notes),
        ivrUrl: safeStr(row.url),
        websiteName: safeStr(row.website_name),
        dataSource: safeStr(row.data_source),
        source: safeStr(row.data_source || row.website_name),
        company: mapSentCompany(row.website_name, row.data_source, row.campaign_name),
        campaignId: safeStr(row.list_id),
        campaignName: safeStr(row.campaign_name),
        assignTo: safeStr(row.assign_to),
        responseFromKserve: safeStr(row.response_result),
        codeStatus: safeStr(row.code),
        leadIntent: safeStr(row.sqv_lead_intent),
        urgency: safeStr(row.region || row.geo),
    };
}

function mapRcvdRow(row: any, i: number) {
    const clientDetails = [safeStr(row.Name_of_Client || row.customer_name), safeStr(row.Mobile || row.Default_Contact_No), safeStr(row.Email_Id || row.Default_Email_ID)]
        .filter(Boolean)
        .join(' · ');

    const qBucket = deriveQualificationBucket(row.lead_category, row.Full_Disposition);
    const calculatedStatus = qBucket === "qualified" ? "Qualified" : qBucket === "dead" ? "Non-Qualified" : "Pending";

    return {
        srNo: i,
        timestamp: safeDate(row.Date_Time || row.Timestamp || row.created_at),
        enquiryId: safeStr(row.lead_id || row.sl_no),
        clientDetails,
        subject: safeStr(row.Subjects),
        websiteName: safeStr(row.WebSite_Name),
        source: safeStr(row.Verified_Source || row.Data_Source),
        dataSource: safeStr(row.Data_Source),
        company: mapReceivedCompany(row.company, row.WebSite_Name, row.Data_Source, row.sheet_name),
        callSubId: safeStr(row.list_id),
        initialId: safeStr(row.lead_id || row.timeIdKey),
        callStartTime: safeDate(row.actual_time || row.Timestamp),
        callEndTime: safeDate(row.send_lead_Date_Time || row.actual_time),
        callDuration: safeStr(row.call_recording_duration || "0"),
        callStatus: safeStr(row.Full_Disposition),
        callRecording: safeStr(row.latest_recording_url || row.IVR_URL || row.Sample_New_Order_Form_Link),
        callEndReason: safeStr(row.HangUp_Reason),
        finalCallStatus: safeStr(row.Full_Disposition),
        callOutcome: safeStr(row.Full_Disposition),
        finalLeadOutcome: safeStr(row.Full_Disposition),
        customerIntent: safeStr(row.sqv_lead_intent || row.lead_priority),
        customerInterestLevel: safeStr(row.lead_priority || row.sqv_lead_intent),
        preferredDateTime: safeDate(row.Followup_Date),
        scheduledTime: safeDate(row.planned_date || row.Followup_Date),
        scheduledStatus: safeStr(row.Followup),
        aiCallSummary: safeStr(row.Remarks_History || row.Comment || row.Call_Notes),
        assignTo: safeStr(row.Assign_To_MR_Main_Agent_Name || row.Transfer_To),
        calculatedstatus: calculatedStatus,
        calculated_qualification_status: calculatedStatus,
    };
}

import { cookies } from 'next/headers';
import { getSessionUser, hasDialShreeSummaryAccess } from '@/lib/authz';

export async function fetchDialShreeTableData(filters?: { dateFrom?: string; dateTo?: string; company?: string; source?: string }) {
    try {
        try {
            const cookieStore = await cookies();
            const userCookie = cookieStore.get('kairali_user')?.value;
            if (userCookie) {
                const user = getSessionUser(userCookie);
                if (user && !hasDialShreeSummaryAccess(user)) {
                    console.warn('[dialshree-summary] Unauthorized access attempt');
                    return [];
                }
            }
        } catch {
            // Invocation outside request context
        }

        const pool = await getPool();
        const selectedCompany = normalizeCompanyFilter(filters?.company);
        const selectedSource = normalizeSourceFilter(filters?.source);
        const todayIso = new Date().toISOString().split('T')[0];

        let sentWhere = "1=1";
        let rcvdWhere = "1=1";

        const paramsSent: any[] = [];
        const paramsRcvd: any[] = [];

        if (filters?.dateFrom) {
            sentWhere += " AND DATE(COALESCE(timestamp, enquiry_date_time, created_at)) >= ?";
            rcvdWhere += " AND DATE(COALESCE(Date_Time, Timestamp, created_at)) >= ?";
            paramsSent.push(filters.dateFrom);
            paramsRcvd.push(filters.dateFrom);
        }
        if (filters?.dateTo) {
            sentWhere += " AND DATE(COALESCE(timestamp, enquiry_date_time, created_at)) <= ?";
            rcvdWhere += " AND DATE(COALESCE(Date_Time, Timestamp, created_at)) <= ?";
            paramsSent.push(filters.dateTo);
            paramsRcvd.push(filters.dateTo);
        }

        const sentQuery = `
            SELECT
                id, timestamp, enquiry_date_time, lead_id, name_of_client,
                mobile, email_id, subjects, notes, url, website_name,
                data_source, assign_to, remarks_history, sqv_lead_intent,
                campaign_name, list_id, sqv_remarks, alt_mobile, alt_email_id,
                geo, response_result, timestamp_sent_not_sent,
                action_after_getting_exception, timestamp_after_action,
                location, timezone, utc_offset, business_hours_start,
                business_hours_end, weekdays_config, code, region,
                location_2, created_at, updated_at
            FROM dialshree_kairali_sent
            WHERE ${sentWhere}
            ORDER BY id DESC
            LIMIT 5000
        `;

        const receivedQuery = `
            SELECT
                sl_no, timeIdKey, lead_id, Timestamp, Date_Time,
                Name_of_Client, Mobile, Email_Id, Subjects, Notes,
                IVR_URL, WebSite_Name, Data_Source, Verified_Source,
                actual_time, Assign_To_MR_Main_Agent_Name, Remarks_History,
                call_Count, agent_Id, Full_Disposition, HangUp_Reason,
                Call_Type, Comment, Call_Notes, Time_Delay, Transfer_To,
                Sample_New_Order_Form_Link, created_at, latest_recording_url,
                sqv_lead_intent, lead_category, lead_priority, doer,
                call_recording_duration, planned_date, campaign_name,
                customer_name, list_id, leadId_from_dialer, campaign_id,
                from_sheet, Followup, Followup_Date, Lead_Conversion,
                Conversion_Amount, send_lead_Date_Time, sheet_name
            FROM lead_fms
            WHERE ${rcvdWhere}
            ORDER BY sl_no DESC
            LIMIT 5000
        `;

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
                    responses: 0, resp_high: 0, resp_medium: 0, resp_low: 0,
                    qual_count: 0, qual_high: 0, qual_medium: 0, qual_low: 0,
                    dead_count: 0, dead_high: 0, dead_medium: 0, dead_low: 0,
                    pending_count: 0, pending_high: 0, pending_medium: 0, pending_low: 0,
                    tat_responses: 0, tat_resp_high: 0, tat_resp_medium: 0, tat_resp_low: 0,
                    tat_qualified: 0, tat_qual_high: 0, tat_qual_medium: 0, tat_qual_low: 0,
                    tat_dead: 0, tat_dead_high: 0, tat_dead_medium: 0, tat_dead_low: 0,
                    tat_pending: 0, tat_pending_high: 0, tat_pending_medium: 0, tat_pending_low: 0,

                    sentLeads: [],
                    receivedLeads: []
                };
            }
            return mergedMap[key];
        };

        // 1. Process Sent Leads
        sentRows.forEach((row: any) => {
            let dateStr = extractDateOnly(row.timestamp || row.enquiry_date_time || row.created_at);
            // If enquiry_date_time was an inverted future date, fallback to timestamp or created_at
            if (dateStr > todayIso) {
                dateStr = extractDateOnly(row.timestamp || row.created_at) || todayIso;
            }
            if (!dateStr) return;

            const companyName = mapSentCompany(row.website_name, row.data_source, row.campaign_name);
            const sourceName = normalizeSourceName(row.data_source || row.website_name);
            if (selectedCompany && companyName !== selectedCompany) return;
            if (selectedSource && sourceName !== selectedSource) return;

            const group = getGroup(dateStr, companyName, sourceName);
            const intent = (row.sqv_lead_intent || '').toLowerCase();

            group.sent++;
            if (intent.includes('high')) group.sent_high++;
            else if (intent.includes('medium')) group.sent_medium++;
            else group.sent_low++;

            group.sentLeads.push(mapSentRow(row, group.sentLeads.length + 1));
        });

        // 2. Process Received Leads
        receivedRows.forEach((row: any) => {
            const dateStr = extractDateOnly(row.Date_Time || row.Timestamp || row.created_at);
            if (!dateStr) return;

            const companyName = mapReceivedCompany(row.company, row.WebSite_Name, row.Data_Source, row.sheet_name);
            const sourceName = normalizeSourceName(row.Verified_Source || row.Data_Source || row.WebSite_Name);
            if (selectedCompany && companyName !== selectedCompany) return;
            if (selectedSource && sourceName !== selectedSource) return;

            const group = getGroup(dateStr, companyName, sourceName);

            const qBucket = deriveQualificationBucket(row.lead_category, row.Full_Disposition);
            const intent = (row.sqv_lead_intent || row.lead_priority || '').toLowerCase();
            const tat = parseTatSeconds(row.Time_Delay);

            group.responses++;
            if (intent.includes('high')) {
                group.resp_high++;
                group.tat_resp_high += tat;
            } else if (intent.includes('medium')) {
                group.resp_medium++;
                group.tat_resp_medium += tat;
            } else {
                group.resp_low++;
                group.tat_resp_low += tat;
            }
            group.tat_responses += tat;

            if (qBucket === 'qualified') {
                group.qual_count++;
                group.tat_qualified += tat;
                if (intent.includes('high')) {
                    group.qual_high++;
                    group.tat_qual_high += tat;
                } else if (intent.includes('medium')) {
                    group.qual_medium++;
                    group.tat_qual_medium += tat;
                } else {
                    group.qual_low++;
                    group.tat_qual_low += tat;
                }
            } else if (qBucket === 'dead') {
                group.dead_count++;
                group.tat_dead += tat;
                if (intent.includes('high')) {
                    group.dead_high++;
                    group.tat_dead_high += tat;
                } else if (intent.includes('medium')) {
                    group.dead_medium++;
                    group.tat_dead_medium += tat;
                } else {
                    group.dead_low++;
                    group.tat_dead_low += tat;
                }
            } else {
                group.pending_count++;
                group.tat_pending += tat;
                if (intent.includes('high')) {
                    group.pending_high++;
                    group.tat_pending_high += tat;
                } else if (intent.includes('medium')) {
                    group.pending_medium++;
                    group.tat_pending_medium += tat;
                } else {
                    group.pending_low++;
                    group.tat_pending_low += tat;
                }
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
                responses: row.responses, respHigh: row.resp_high, respMedium: row.resp_medium, respLow: row.resp_low,
                qualified: row.qual_count, qualHigh: row.qual_high, qualMedium: row.qual_medium, qualLow: row.qual_low,
                dead: row.dead_count, deadHigh: row.dead_high, deadMedium: row.dead_medium, deadLow: row.dead_low,
                pending: row.pending_count, pendingHigh: row.pending_high, pendingMedium: row.pending_medium, pendingLow: row.pending_low,
                tatResponses: row.tat_responses, tatRespHigh: row.tat_resp_high, tatRespMedium: row.tat_resp_medium, tatRespLow: row.tat_resp_low,
                tatQualified: row.tat_qualified, tatQualHigh: row.tat_qual_high, tatQualMedium: row.tat_qual_medium, tatQualLow: row.tat_qual_low,
                tatDead: row.tat_dead, tatDeadHigh: row.tat_dead_high, tatDeadMedium: row.tat_dead_medium, tatDeadLow: row.tat_dead_low,
                tatPending: row.tat_pending, tatPendingHigh: row.tat_pending_high, tatPendingMedium: row.tat_pending_medium, tatPendingLow: row.tat_pending_low,
                sentLeads: row.sentLeads,
                receivedLeads: row.receivedLeads
            });
        });

        return Object.values(groupsMap);

    } catch (error) {
        console.error('[dialshree-summary] Database Error:', error);
        return [];
    }
}
