/**
 * Preview page: /preview/website-enquiry-alert
 *
 * Standalone live preview of the Website Lead & Online PPC Enquiry Alert email template.
 * Displays the exact email body that will be received by sales reps and admin.
 * Uses the exact sample data requested: Sivagnanam Surendra (7956382557).
 */
import { buildWebsiteEnquiryAlertEmail, getSampleEnquiryData } from '@/lib/email-triggers/templates/website-enquiry-alert'

export const dynamic = 'force-dynamic'

export default async function WebsiteEnquiryAlertPreviewPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://staging-kairali-crm.vercel.app'
  const sample = getSampleEnquiryData('KTAHV', appUrl)
  const renderedHtml = buildWebsiteEnquiryAlertEmail(sample)

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#0f172a', minHeight: '100vh', padding: '0', margin: 0 }}>
      {/* Top Navbar */}
      <div
        style={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          color: '#f8fafc',
          padding: '12px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📧</span>
            <strong style={{ fontSize: 16, color: '#ffffff' }}>
              Website Lead &amp; PPC Enquiry Alert &mdash; Email Body Template
            </strong>
            <span
              style={{
                background: '#166534',
                color: '#86efac',
                fontSize: 11,
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              100% Inline CSS &bull; Anti-Spam
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Sample Data: Sivagnanam Surendra &bull; 7956382557 &bull; drsurendra.bpdp@gmail.com &bull; Kairali - The Ayurvedic Healing Village Contact Us
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href="/api/website-enquiry-alert-preview"
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#334155',
              color: '#f1f5f9',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 12,
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🔗</span> Raw HTML
          </a>
          <a
            href="/email-templates/website-enquiry-alert.html"
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#334155',
              color: '#f1f5f9',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 12,
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📄</span> Static Template
          </a>
          <a
            href="/settings/automation/email-triggers?report=website-enquiry-alert"
            style={{
              background: '#166534',
              color: '#ffffff',
              padding: '7px 16px',
              borderRadius: 6,
              fontSize: 12,
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚙️</span> CRM Automation Config &rarr;
          </a>
        </div>
      </div>

      {/* Main Preview Container */}
      <div style={{ padding: '24px 16px', maxWidth: 840, margin: '0 auto' }}>
        {/* Info card */}
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '12px 18px',
            marginBottom: 20,
            fontSize: 13,
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <strong style={{ color: '#f8fafc' }}>Subject Line:</strong>{' '}
            <span style={{ color: '#93c5fd' }}>
              Kairali - The Ayurvedic Healing Village Contact Us - Sivagnanam Surendra
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            Compact Height: ~270px &bull; Zero external images &bull; Spam score: 0
          </div>
        </div>

        {/* Email Client Mock Frame */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Email client header */}
          <div
            style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '12px 20px',
              fontSize: 12,
              color: '#64748b',
              line-height: '1.6',
            }}
          >
            <div>
              <strong style={{ color: '#0f172a' }}>From:</strong> info@ktahv.com
            </div>
            <div>
              <strong style={{ color: '#0f172a' }}>To:</strong> info, onlineenquiry, outreach, ose, seo, srsales, me
            </div>
            <div>
              <strong style={{ color: '#0f172a' }}>Date:</strong> Today at 3:39 PM
            </div>
          </div>

          {/* Email Body Content */}
          <div
            style={{ padding: '0', background: '#f8fafc' }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>

        {/* Footer help note */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#64748b' }}>
          This email body template is ready to replace incoming website &amp; PPC lead notification emails across all Kairali domains.
        </div>
      </div>
    </div>
  )
}
