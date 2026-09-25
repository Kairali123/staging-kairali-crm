/**
 * Preview page: /preview/booking-pi-review-alert
 *
 * LOCAL ONLY — shows the Booking PI Review Alert email template rendered
 * in an iframe so you can inspect it exactly as it will appear in email clients.
 * Also lets you fire a manual cron test call.
 */
import { buildPIReviewAlertEmail } from '@/lib/email-triggers/templates/booking-pi-review-alert'

export const dynamic = 'force-dynamic'

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export default async function BookingPIReviewAlertPreviewPage() {
  const today = getTodayIST()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

  // Sample data — mix of states to show the full email
  const sampleHtml = buildPIReviewAlertEmail({
    reportDate:  today,
    totalPIs:    7,
    reviewedYes: 3,
    reviewedNo:  1,
    pending:     3,
    appUrl,
    pendingItems: [
      {
        reservationId: 'RES-2024-001',
        piNumber:      'PI-0001',
        guest:         'Rajesh Kumar',
        salesDoer:     'Priya S.',
        invoiceAmount: 58000,
        currency:      'INR',
        checkInDate:   today,
        reviewStatus:  'Pending',
      },
      {
        reservationId: 'RES-2024-002',
        piNumber:      'PI-0002',
        guest:         'Sarah Johnson',
        salesDoer:     'Arun M.',
        invoiceAmount: 125000,
        currency:      'INR',
        checkInDate:   today,
        reviewStatus:  'Pending',
      },
      {
        reservationId: 'RES-2024-003',
        piNumber:      'PI-0003',
        guest:         'Mohammed Al-Farsi',
        salesDoer:     'Deepa K.',
        invoiceAmount: 89500,
        currency:      'INR',
        checkInDate:   today,
        reviewStatus:  'No',
      },
      {
        reservationId: 'RES-2024-004',
        piNumber:      'PI-0004',
        guest:         'Anita Sharma',
        salesDoer:     'Priya S.',
        invoiceAmount: 43200,
        currency:      'INR',
        checkInDate:   today,
        reviewStatus:  'Pending',
      },
    ],
  })

  const encodedHtml = Buffer.from(sampleHtml).toString('base64')

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f0f4f8', minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{
        background: '#1e3a5f', color: '#fff', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <strong style={{ fontSize: 16 }}>📧 Email Template Preview</strong>
          <span style={{ marginLeft: 16, fontSize: 13, opacity: 0.75 }}>
            Booking PI Review Alert · {today}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a
            href="/settings/automation/email-triggers"
            style={{
              background: '#2d5f8a', color: '#fff', padding: '8px 16px',
              borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600,
            }}
          >
            ⚙️ Email Config →
          </a>
          <a
            href="/settings/automation/helpdesk"
            style={{
              background: '#16a34a', color: '#fff', padding: '8px 16px',
              borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600,
            }}
          >
            🎫 Help Ticket Config →
          </a>
          <a
            href="/api/cron/booking-pi-review-alert"
            target="_blank"
            style={{
              background: '#dc2626', color: '#fff', padding: '8px 16px',
              borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600,
            }}
          >
            🔥 Fire Cron Now →
          </a>
        </div>
      </div>

      {/* Info strip */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '12px 24px', fontSize: 12, color: '#374151',
        display: 'flex', gap: 32,
      }}>
        <span>⏰ <strong>Schedule:</strong> Daily 18:30 IST (6:30 PM)</span>
        <span>📬 <strong>Trigger:</strong> Always send (shows summary even if all reviewed)</span>
        <span>🎫 <strong>Help Ticket:</strong> Created only if <em>Pending</em> reviews remain at 18:30</span>
        <span>📄 <strong>Sample data:</strong> 7 PIs · 3 Yes · 1 No · 3 Pending</span>
      </div>

      {/* Email iframe preview */}
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <div style={{
            background: '#374151', color: '#d1d5db', fontSize: 11,
            padding: '8px 16px', borderRadius: '8px 8px 0 0',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ marginLeft: 8 }}>Inbox Preview — Booking PI Review Alert</span>
          </div>
          <iframe
            srcDoc={sampleHtml}
            style={{
              width: '100%', height: 900, border: 'none',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
            title="Booking PI Review Alert Email Preview"
          />
        </div>
      </div>
    </div>
  )
}
