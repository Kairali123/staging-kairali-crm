import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const leadId = id?.trim()

  if (!leadId) {
    return NextResponse.json(
      { success: false, message: 'Lead ID required' },
      { status: 400 }
    )
  }

  try {
    const pool = await getPool()

    const [rows]: any = await pool.query(`
      SELECT 
       *FROM master_buffer mb
        INNER JOIN staging_buffer_new sbn 
        ON mb.lead_id = sbn.lead_id
          WHERE mb.lead_id = ?
           ORDER BY sbn.sl_no DESC
         LIMIT 1
    `, [leadId])

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: `No data found for Lead ID: ${leadId}` },
        { status: 404 }
      )
    }

    const raw = rows[0]

    const data = {
      Lead_id:                      safeStr(raw.lead_id),
      Name_of_Client:               safeStr(raw.Name_of_Client),
      Mobile:                       safeStr(raw.Mobile),
      Email_Id:                     safeStr(raw.Email_Id),
      Subjects:                     safeStr(raw.Subjects),
      Notes:                        safeStr(raw.Notes),
      IVR_URL:                      safeStr(raw.IVR_URL),
      WebSite_Name:                 safeStr(raw.WebSite_Name),
      Data_Source:                  safeStr(raw.Data_Source),
      Assign_To_MR_Main:            safeStr(raw.Assign_To_MR_Main),
      Timestamp_2:                  safeDate(raw.Timestamp_2),
      column14:                     safeStr(raw.column14),
      Year:                         safeStr(raw.Year),
      Month:                        safeStr(raw.Month),
      Week:                         safeStr(raw.Week),
      Intent:                       safeStr(raw.Intent),
      Duplicate:                    safeStr(raw.Duplicate),
      Sheet_Name:                   safeStr(raw.staging_sheet_name),
      UTM_Campaign_Name:            safeStr(raw.UTM_Campaign_Name),
      UTM_Adgroup_Name:             safeStr(raw.UTM_Adgroup_Name),
      Enquiry_Status_Last:          safeStr(raw.Enquiry_Status_Last),
      Converted_Amount:             safeStr(raw.Converted_Amount),
      Converted_Date:               safeDate(raw.Converted_Date),
      Order_Taken_By:               safeStr(raw.Order_Taken_By),
      status:                       safeStr(raw.status),
      NBD_CRR:                      safeStr(raw.NBD_CRR),
      KAPPL_KTAHV:                  safeStr(raw.KAPPL_KTAHV),
      Transcription:                safeStr(raw.Transcription),
      Lead_Relates_to_which_company: safeStr(raw.Lead_Relates_to_which_company),
      Name_of_User:                 safeStr(raw.Name_of_User),
      Phone_Number_of_User:         safeStr(raw.Phone_Number_of_User),
      Email_of_User:                safeStr(raw.Email_of_User),
      Country:                      safeStr(raw.Country),
      Priority:                     safeStr(raw.Priority),
      Urgency_YES_NO:               safeStr(raw.Urgency_YES_NO),
      Contact_Time:                 safeStr(raw.Contact_Time),
      Summary_of_Conversation:      safeStr(raw.Summary_of_Conversation),
      Lead_Outcome:                 safeStr(raw.Lead_Outcome),
      Lead_Category:                safeStr(raw.Lead_Category),
      Preferred_Way_to_Contact:     safeStr(raw.Preferred_Way_to_Contact),
      gpt_Extraction_Status:        safeStr(raw.gpt_Extraction_Status),
      Sent_status:                  safeStr(raw.Sent_status),
      Test_Col:                     safeStr(raw.Test_Col),
      Mail_Status:                  safeStr(raw.Mail_Status),
      Reason_why_assign_Or_Delete:  safeStr(raw.Reason_why_assign_Or_Delete),
      Verified_Source:              safeStr(raw.Verified_Source),
      created_at:                   safeDate(raw.actual_time),
      updated_at:                   safeDate(raw.actual_time),
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