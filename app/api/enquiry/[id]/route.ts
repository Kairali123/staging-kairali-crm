import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'

export const dynamic = 'force-dynamic'

function safeDate(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '') return fallback
  try {
    const d = val instanceof Date ? val : new Date(String(val))
    if (isNaN(d.getTime())) return fallback
    return d.toISOString()
  } catch { return fallback }
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return ''
  if (val instanceof Date) return safeDate(val)
  return String(val)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req)
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const leadId = decodeURIComponent(id || '').trim()

  if (!leadId) {
    return NextResponse.json(
      { success: false, message: 'Lead ID required' },
      { status: 400 }
    )
  }

  try {
    const pool = await getPool()

    const [rows] = await pool.execute(
      `SELECT
        mb.lead_id AS mb_lead_id,
        mb.Date_Time AS mb_date_time,
        mb.Timestamp AS mb_timestamp,
        mb.actual_time AS mb_actual_time,
        mb.Name_of_Client AS mb_client_name,
        mb.Mobile AS mb_mobile,
        mb.Email_Id AS mb_email,
        mb.Subjects AS mb_subjects,
        mb.Notes AS mb_notes,
        mb.IVR_URL AS mb_ivr_url,
        mb.WebSite_Name AS mb_website_name,
        mb.Data_Source AS mb_data_source,
        mb.Verified_Source AS mb_verified_source,
        mb.sheet_name AS mb_sheet_name,
        sbn.*
      FROM master_buffer mb
      LEFT JOIN staging_buffer_new sbn
        ON mb.lead_id = sbn.Lead_id
      WHERE mb.lead_id = ?
      ORDER BY sbn.sl_no DESC
      LIMIT 1`,
      [leadId]
    )
    const recordset = Array.isArray(rows) ? rows : []

    if (recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: `No data found for Lead ID: ${leadId}` },
        { status: 404 }
      )
    }

    const raw = recordset[0] as Record<string, unknown>

    const data = {
      Lead_id: safeStr(raw.mb_lead_id || raw.Lead_id),
      Enquiry_Date_Time: safeDate(raw.mb_date_time || raw.mb_timestamp),
      Buffer_Arrival: safeDate(raw.mb_timestamp || raw.mb_actual_time || raw.mb_date_time),
      Actual_Time: safeDate(raw.mb_actual_time),
      Name_of_Client: safeStr(raw.mb_client_name || raw.Name_of_User),
      Mobile: safeStr(raw.mb_mobile || raw.Phone_Number_of_User),
      Email_Id: safeStr(raw.mb_email || raw.Email_of_User),
      Subjects: safeStr(raw.mb_subjects),
      Notes: safeStr(raw.mb_notes),
      IVR_URL: safeStr(raw.mb_ivr_url),
      WebSite_Name: safeStr(raw.mb_website_name),
      Data_Source: safeStr(raw.mb_data_source),
      Verified_Source: safeStr(raw.mb_verified_source),
      Assign_To_MR_Main: safeStr(raw.Assign_To_MR_Main),
      Timestamp_2: safeDate(raw.Timestamp_2),
      column14: safeStr(raw.column14),
      Year: safeStr(raw.Year),
      Month: safeStr(raw.Month),
      Week: safeStr(raw.Week),
      Intent: safeStr(raw.Intent),
      Duplicate: safeStr(raw.Duplicate),
      Sheet_Name: safeStr(raw.Sheet_Name || raw.mb_sheet_name),
      UTM_Campaign_Name: safeStr(raw.UTM_Campaign_Name),
      UTM_Adgroup_Name: safeStr(raw.UTM_Adgroup_Name),
      Enquiry_Status_Last: safeStr(raw.Enquiry_Status_Last),
      Converted_Amount: safeStr(raw.Converted_Amount),
      Converted_Date: safeDate(raw.Converted_Date),
      Order_Taken_By: safeStr(raw.Order_Taken_By),
      status: safeStr(raw.status),
      NBD_CRR: safeStr(raw.NBD_CRR),
      KAPPL_KTAHV: safeStr(raw.KAPPL_KTAHV),
      Transcription: safeStr(raw.Transcription),
      Lead_Relates_to_which_company: safeStr(raw.Lead_Relates_to_which_company),
      Name_of_User: safeStr(raw.Name_of_User),
      Phone_Number_of_User: safeStr(raw.Phone_Number_of_User),
      Email_of_User: safeStr(raw.Email_of_User),
      Country: safeStr(raw.Country),
      Priority: safeStr(raw.Priority),
      Urgency_YES_NO: safeStr(raw.Urgency_YES_NO),
      Contact_Time: safeStr(raw.Contact_Time),
      Summary_of_Conversation: safeStr(raw.Summary_of_Conversation),
      Lead_Outcome: safeStr(raw.Lead_Outcome),
      Lead_Category: safeStr(raw.Lead_Category),
      Preferred_Way_to_Contact: safeStr(raw.Preferred_Way_to_Contact),
      gpt_Extraction_Status: safeDate(raw.gpt_Extraction_Status) || safeStr(raw.gpt_Extraction_Status),
      Sent_status: safeDate(raw.Sent_status) || safeStr(raw.Sent_status),
      Test_Col: safeStr(raw.Test_Col),
      Mail_Status: safeStr(raw.Mail_Status),
      Reason_why_assign_Or_Delete: safeStr(raw.Reason_why_assign_Or_Delete),
    }

    return NextResponse.json({
      success: true,
      totalRows: 1,
      data: [data],
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Enquiry API Error]', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
