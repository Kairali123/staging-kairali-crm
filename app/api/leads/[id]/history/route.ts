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

function safeFloat(val: any): number {
  if (val === null || val === undefined || val === '') return 0
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
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

    // ── Query 1: Main lead from master_buffer ─────────────────────────────
    const [mainRows]: any = await pool.query(`
      SELECT
        m.lead_id,
        m.Name_of_Client,
        m.Mobile,
        m.Email_Id,
        m.Notes,
        m.IVR_URL,
        m.actual_time,
        sbn.Assign_To_MR_Main,
        sbn.Enquiry_Status_Last,
        sbn.Converted_Amount
      FROM master_buffer m
      LEFT JOIN staging_buffer_new sbn ON m.lead_id = sbn.Lead_id
      WHERE m.lead_id = ?
    `, [leadId])

    if (mainRows.length === 0) {
      return NextResponse.json(
        { success: false, message: `No lead found: ${leadId}` },
        { status: 404 }
      )
    }

    const row = mainRows[0]

    const mainLead = {
      leadId:             safeStr(row.lead_id),
      name:               safeStr(row.Name_of_Client),
      mobile:             safeStr(row.Mobile),
      email:              safeStr(row.Email_Id),
      campaignName:       '',
      agentName:          safeStr(row.Assign_To_MR_Main),
      disposition:        safeStr(row.Enquiry_Status_Last),
      latestRecordingUrl: safeStr(row.IVR_URL) || null,
      callCount:          0,
    }

    // ── Query 2: Exact working query ──────────────────────────────────────
    let followups: object[] = []

    try {
      const [callRows]: any = await pool.query(`
        SELECT 
          c2.*,
          c1.Followup_Date,
          c1.Conversion_Amount,
          c1.send_lead_Date_Time,
          c1.Lead_Conversion,
          c1.Email_Sent,
          c1.WhatsApp_Sent,
          c1.SMS_Sent,
          c1.sl_no AS comm_sl_no
        FROM followup_activity c2
        LEFT JOIN followup_communication c1 
          ON c2.timeIdKey = c1.timeIdKey
        WHERE c2.lead_id = ?
        ORDER BY c2.sl_no DESC
      `, [leadId])

      if (callRows.length > 0) {
        mainLead.callCount = callRows.length

        followups = callRows.map((r: any) => ({
          enquiryStatus:   safeStr(r.Full_Disposition) || safeStr(r.Disposition) || 'Cold',
          fullDisposition: safeStr(r.Full_Disposition),
          agentId:         safeStr(r.agent_Id) || 'N/A',
          agentName:       safeStr(r.Assign_To_MR_Main_Agent_Name),
          agentRemarks:    safeStr(r.Call_Notes) || safeStr(r.Remarks_History) || safeStr(r.Comment) || 'No remarks available',
          callNotes:       safeStr(r.Call_Notes),
          comment:         safeStr(r.Comment),
          actualDate:      safeDate(r.latest_called_at),
          plannedDate:     safeDate(r.planned_date),
          followUpDoneIn:  safeStr(r.Call_Type) || 'AppSheet',
          followupDate:    safeDate(r.Followup_Date),
          callDuration:    safeStr(r.call_recording_duration) || safeStr(r.Call_Recording_Duration) || '0',
          recordingUrl:    safeStr(r.latest_recording_url) || null,
          potentialValue:  safeFloat(r.Conversion_Amount),
          leadConversion:  safeStr(r.Lead_Conversion),
          hangUpReason:    safeStr(r.HangUp_Reason),
          transferTo:      safeStr(r.Transfer_To),
          callCount:       r.call_Count || 0,
          totalFollowups:  callRows.length,
          emailSent:       safeStr(r.Email_Sent),
          whatsappSent:    safeStr(r.WhatsApp_Sent),
          smsSent:         safeStr(r.SMS_Sent),
          createdAt:       safeDate(r.created_at),
        }))
      }
    } catch (callErr) {
      console.warn('[Lead History API] followup query failed:',
        callErr instanceof Error ? callErr.message : callErr)
    }

    // ── Fallback ──────────────────────────────────────────────────────────
    if (followups.length === 0) {
      followups = [{
        enquiryStatus:  safeStr(row.Enquiry_Status_Last) || 'Cold',
        agentId:        safeStr(row.Assign_To_MR_Main) || 'N/A',
        agentName:      safeStr(row.Assign_To_MR_Main),
        agentRemarks:   safeStr(row.Notes) || 'No remarks available',
        actualDate:     safeDate(row.actual_time),
        plannedDate:    safeDate(row.actual_time),
        followUpDoneIn: 'AppSheet',
        callDuration:   '0',
        recordingUrl:   safeStr(row.IVR_URL) || null,
        potentialValue: safeFloat(row.Converted_Amount),
        totalFollowups: 0,
      }]
    }

    return NextResponse.json({
      success: true,
      mainLead,
      followups,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Lead Detail API Error]', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
