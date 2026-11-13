/**
 * Website Lead & Online PPC Enquiry Alert Email Template
 * 
 * Compact, low-height, lightweight email body template for incoming leads sent to sales & admin.
 * Fits on a single screen without scrolling (easy view, small vertical height).
 * 
 * Sample Data:
 * - From: Sivagnanam Surendra
 * - Data Source: Kairali - The Ayurvedic Healing Village Contact Us
 * - Enquiry Details: Name*, Phone No*, E-mail*, Message*
 * - Website Source: https://ayurvedichealingvillage.com/contact-us/
 *
 * 100% inline CSS, ultra-lightweight (~6 KB), spam-proof.
 */

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  )
}

export interface WebsiteEnquiryData {
  company?: string
  dataSource?: string
  leadName: string
  leadPhone: string
  leadEmail?: string
  message?: string
  rawMessage?: string
  sourceUrl?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  gclid?: string
  receivedAt?: string
  leadId?: string
  crmLeadUrl?: string
  appUrl?: string
}

/**
 * Normalizes phone numbers for WhatsApp link (digits only with country code)
 */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
}

/**
 * Generates sample data matching the exact example provided by the user
 */
export function getSampleEnquiryData(companyScope = 'All companies', appUrl = 'https://staging-kairali-crm.vercel.app'): WebsiteEnquiryData {
  return {
    company: 'Kairali - The Ayurvedic Healing Village',
    dataSource: 'Kairali - The Ayurvedic Healing Village Contact Us',
    leadName: 'Sivagnanam Surendra',
    leadPhone: '7956382557',
    leadEmail: 'drsurendra.bpdp@gmail.com',
    message: 'We are planning a trip next year and we both are over 75 and not having any medical problems. Wanting to know more about your clinic our stay will be for 7-10 days',
    rawMessage: 'Message : We are planning a trip next year and we both are over 75 and not having any medical problems. Wanting to know more about your clinic our stay will be for 7-10 days',
    sourceUrl: 'https://ayurvedichealingvillage.com/contact-us/',
    utmSource: 'Website Direct',
    utmMedium: 'Contact Form',
    receivedAt: '3:39 PM',
    crmLeadUrl: `${appUrl}/leads?search=7956382557`,
    appUrl,
  }
}

/**
 * Builds the compact, small-height HTML email with 100% inline CSS.
 */
export function buildWebsiteEnquiryAlertEmail(data: Partial<WebsiteEnquiryData>): string {
  const company = data.company || 'Kairali - The Ayurvedic Healing Village'
  const dataSource = data.dataSource || 'Kairali - The Ayurvedic Healing Village Contact Us'
  const leadName = data.leadName || 'Sivagnanam Surendra'
  const leadPhone = data.leadPhone || '7956382557'
  const leadEmail = data.leadEmail || 'drsurendra.bpdp@gmail.com'
  const rawMessage = data.rawMessage || data.message || 'Message : We are planning a trip next year and we both are over 75 and not having any medical problems. Wanting to know more about your clinic our stay will be for 7-10 days'
  const sourceUrl = data.sourceUrl || 'https://ayurvedichealingvillage.com/contact-us/'
  const receivedAt = data.receivedAt || '3:39 PM'
  const appUrl = data.appUrl || 'https://staging-kairali-crm.vercel.app'
  const crmLeadUrl = data.crmLeadUrl || `${appUrl}/leads?search=${encodeURIComponent(leadPhone.replace(/\D/g, '') || leadName)}`

  const cleanPhone = leadPhone.replace(/[^0-9+]/g, '')
  const waNumber = toWhatsAppNumber(leadPhone)
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${leadName}, thank you for contacting ${company}. We received your enquiry. How may we assist you with your stay?`)}` : ''

  // Preheader snippet for inbox preview
  const preheaderText = `New Enquiry: ${leadName} (${leadPhone}) - ${dataSource}`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>Contact Enquiry · ${esc(leadName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color:#1e293b;line-height:1.4;">

  <!-- Anti-Spam Hidden Inbox Preheader -->
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${esc(preheaderText)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer Canvas (Low padding for compact height) -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;width:100%;margin:0;padding:12px 6px;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- Main Card (Max width 600px, tight padding, compact height) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #166534;border-radius:6px;overflow:hidden;margin:0 auto;text-align:left;">
          <tr>
            <td style="padding:14px 18px 12px 18px;">

              <!-- Header Row (Compact 1-line layout) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <span style="display:inline-block;background-color:#166534;color:#ffffff;font-size:10px;font-weight:bold;padding:2px 7px;border-radius:3px;text-transform:uppercase;letter-spacing:0.4px;vertical-align:middle;margin-right:6px;">
                      New Lead
                    </span>
                    <strong style="font-size:15px;color:#0f172a;vertical-align:middle;">
                      ${esc(company)}
                    </strong>
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:11px;color:#64748b;white-space:nowrap;padding-left:10px;">
                    ${esc(receivedAt)}
                  </td>
                </tr>
              </table>

              <!-- Source Sub-Header -->
              <div style="font-size:12px;color:#475569;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
                <span style="color:#64748b;">Data Source:</span> <strong>${esc(dataSource)}</strong>
              </div>

              <!-- Enquiry Details Table (Compact row height: 6px-8px padding) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;font-size:13px;line-height:19px;margin-bottom:10px;">

                <!-- Name* -->
                <tr>
                  <td style="padding:7px 12px;width:95px;color:#475569;font-weight:bold;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    Name*
                  </td>
                  <td style="padding:7px 12px;color:#0f172a;font-weight:bold;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    ${esc(leadName)}
                  </td>
                </tr>

                <!-- Phone No* + Action Buttons -->
                <tr>
                  <td style="padding:7px 12px;color:#475569;font-weight:bold;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    Phone No*
                  </td>
                  <td style="padding:7px 12px;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <a href="tel:${esc(cleanPhone)}" style="color:#0f766e;font-weight:bold;text-decoration:none;font-size:14px;vertical-align:middle;">
                      ${esc(leadPhone)}
                    </a>
                    &nbsp;&nbsp;
                    <!-- Call Pill -->
                    <a href="tel:${esc(cleanPhone)}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-size:10px;font-weight:bold;text-decoration:none;padding:2px 8px;border-radius:3px;vertical-align:middle;">
                      📞 Call
                    </a>
                    ${waUrl ? `
                    &nbsp;
                    <!-- WhatsApp Pill -->
                    <a href="${esc(waUrl)}" target="_blank" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:10px;font-weight:bold;text-decoration:none;padding:2px 8px;border-radius:3px;vertical-align:middle;">
                      💬 WhatsApp
                    </a>
                    ` : ''}
                  </td>
                </tr>

                <!-- E-mail* -->
                <tr>
                  <td style="padding:7px 12px;color:#475569;font-weight:bold;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    E-mail*
                  </td>
                  <td style="padding:7px 12px;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <a href="mailto:${esc(leadEmail)}" style="color:#2563eb;text-decoration:none;">
                      ${esc(leadEmail)}
                    </a>
                  </td>
                </tr>

                <!-- Message* -->
                <tr>
                  <td style="padding:7px 12px;color:#475569;font-weight:bold;background-color:#f8fafc;vertical-align:top;">
                    Message*
                  </td>
                  <td style="padding:7px 12px;color:#1e293b;line-height:20px;vertical-align:top;background-color:#fdfdfd;white-space:pre-wrap;">${esc(rawMessage)}</td>
                </tr>

              </table>

              <!-- Compact Footer (Origin URL + CRM Link in 1 row) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:11px;color:#64748b;line-height:16px;">
                <tr>
                  <td align="left" style="vertical-align:middle;padding-top:4px;">
                    This mail is sent via <strong>KTAHV Website</strong> &ndash;
                    <a href="${esc(sourceUrl)}" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all;">
                      ${esc(sourceUrl)}
                    </a>
                  </td>
                  <td align="right" style="vertical-align:middle;white-space:nowrap;padding-left:12px;padding-top:4px;">
                    <a href="${esc(crmLeadUrl)}" target="_blank" style="display:inline-block;font-size:11px;font-weight:bold;color:#166534;background-color:#f0fdf4;border:1px solid #bbf7d0;padding:3px 9px;border-radius:3px;text-decoration:none;">
                      Open in CRM &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
}
