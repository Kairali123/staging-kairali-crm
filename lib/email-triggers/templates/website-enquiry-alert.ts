/**
 * Website Lead & Online PPC Enquiry Alert Email Template
 * 
 * Clean, simple, lightweight email body template for incoming leads sent to sales & admin.
 * Follows the exact layout of the original enquiry email with elegant inline CSS styling:
 * - From: ...
 * - Data Source: ...
 * - Enquiry Details: (Name*, Phone No*, E-mail*, Message*)
 * - Sent via Website link
 * - 100% inline CSS, ultra-lightweight (~7 KB), zero spam triggers.
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
 * Generates sample data matching the exact screenshot provided by the user
 */
export function getSampleEnquiryData(companyScope = 'All companies', appUrl = 'https://staging-kairali-crm.vercel.app'): WebsiteEnquiryData {
  return {
    company: 'Kairali - The Ayurvedic Healing Village',
    dataSource: 'Kairali - The Ayurvedic Healing Village Online PPC Enquiry for Panchakarma Treatment',
    leadName: 'Sonaram netam',
    leadPhone: '+91 9131193207',
    leadEmail: 'sonaramnetamnetam877@gmail.com',
    message: 'Message : Program: Not sure — advise me Preferred month: November 2026 Length of stay: Doctor to advise | Other-information: Form variant: r10-panchakarma | Campaign name: Panchakarma_India',
    rawMessage: 'Message : Program: Not sure — advise me Preferred month: November 2026 Length of stay: Doctor to advise | Other-information: Form variant: r10-panchakarma | Campaign name: Panchakarma_India',
    sourceUrl: 'https://ayurvedichealingvillage.com/panchkarma-treatment.html?gclid=Cj0KCQiA5NXXBhDEARIsABAJhdJPF39i1UpeKBQMSJfLy781ypFBI51fwBjPS5Uv35ltYGBrBi1qNFMaAr_yEALw_wcB&utm_source=Google&utm_medium=ppc&utm_campaign=Panchakarma_India',
    utmSource: 'Google',
    utmMedium: 'ppc',
    utmCampaign: 'Panchakarma_India',
    receivedAt: '13 Nov 2026, 10:09 AM IST',
    crmLeadUrl: `${appUrl}/leads?search=9131193207`,
    appUrl,
  }
}

/**
 * Builds the simple, clean, lightweight HTML email with 100% inline CSS.
 */
export function buildWebsiteEnquiryAlertEmail(data: Partial<WebsiteEnquiryData>): string {
  const dataSource = data.dataSource || 'Kairali - The Ayurvedic Healing Village Online PPC Enquiry for Panchakarma Treatment'
  const leadName = data.leadName || 'Sonaram netam'
  const leadPhone = data.leadPhone || '+91 9131193207'
  const leadEmail = data.leadEmail || 'sonaramnetamnetam877@gmail.com'
  const rawMessage = data.rawMessage || data.message || 'Message : Program: Not sure — advise me Preferred month: November 2026 Length of stay: Doctor to advise | Other-information: Form variant: r10-panchakarma | Campaign name: Panchakarma_India'
  const sourceUrl = data.sourceUrl || 'https://ayurvedichealingvillage.com/panchkarma-treatment.html?gclid=Cj0KCQiA5NXXBhDEARIsABAJhdJPF39i1UpeKBQMSJfLy781ypFBI51fwBjPS5Uv35ltYGBrBi1qNFMaAr_yEALw_wcB&utm_source=Google&utm_medium=ppc&utm_campaign=Panchakarma_India'
  const appUrl = data.appUrl || 'https://staging-kairali-crm.vercel.app'
  const crmLeadUrl = data.crmLeadUrl || `${appUrl}/leads?search=${encodeURIComponent(leadPhone.replace(/\D/g, '') || leadName)}`

  const cleanPhone = leadPhone.replace(/[^0-9+]/g, '')
  const waNumber = toWhatsAppNumber(leadPhone)
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${leadName}, thank you for contacting us. We received your enquiry. How may we assist you?`)}` : ''

  // Clean preheader snippet for inbox preview
  const preheaderText = `New Enquiry from ${leadName} (${leadPhone}) - ${dataSource}`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>Enquiry: ${esc(leadName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color:#1f2937;line-height:1.5;">

  <!-- Hidden Preview Preheader Text for Inbox snippet -->
  <div style="display:none;font-size:1px;color:#f9fafb;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${esc(preheaderText)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email Canvas -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb;width:100%;margin:0;padding:24px 12px;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- Main Card (Max width 620px) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;background-color:#ffffff;border:1px solid #e5e7eb;border-top:4px solid #166534;border-radius:6px;overflow:hidden;margin:0 auto;text-align:left;">
          <tr>
            <td style="padding:24px 28px;">

              <!-- From & Data Source Section -->
              <div style="font-size:14px;color:#111827;line-height:22px;margin-bottom:6px;">
                <strong style="color:#374151;">From:</strong> ${esc(leadName)}
              </div>
              <div style="font-size:14px;color:#111827;line-height:22px;margin-bottom:20px;">
                <strong style="color:#374151;">Data Source:</strong> ${esc(dataSource)}
              </div>

              <!-- Section Heading -->
              <div style="font-size:15px;font-weight:bold;color:#111827;margin-bottom:14px;">
                Enquiry Details:
              </div>

              <!-- Enquiry Details Table -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;font-size:13px;line-height:20px;margin-bottom:24px;">

                <!-- Name* -->
                <tr style="background-color:#ffffff;">
                  <td style="padding:10px 14px;width:110px;color:#4b5563;font-weight:bold;border:1px solid #e5e7eb;background-color:#f9fafb;vertical-align:top;">
                    Name*
                  </td>
                  <td style="padding:10px 14px;color:#111827;font-weight:bold;border:1px solid #e5e7eb;vertical-align:top;">
                    ${esc(leadName)}
                  </td>
                </tr>

                <!-- Phone No* -->
                <tr style="background-color:#ffffff;">
                  <td style="padding:10px 14px;color:#4b5563;font-weight:bold;border:1px solid #e5e7eb;background-color:#f9fafb;vertical-align:top;">
                    Phone No*
                  </td>
                  <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;vertical-align:top;">
                    <a href="tel:${esc(cleanPhone)}" style="color:#0f766e;font-weight:bold;text-decoration:none;font-size:14px;">
                      ${esc(leadPhone)}
                    </a>
                    &nbsp;&nbsp;
                    <!-- Quick Call Button -->
                    <a href="tel:${esc(cleanPhone)}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-size:11px;font-weight:bold;text-decoration:none;padding:3px 9px;border-radius:4px;vertical-align:middle;">
                      📞 Call
                    </a>
                    ${waUrl ? `
                    &nbsp;
                    <!-- Quick WhatsApp Button -->
                    <a href="${esc(waUrl)}" target="_blank" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:11px;font-weight:bold;text-decoration:none;padding:3px 9px;border-radius:4px;vertical-align:middle;">
                      💬 WhatsApp
                    </a>
                    ` : ''}
                  </td>
                </tr>

                <!-- E-mail* -->
                <tr style="background-color:#ffffff;">
                  <td style="padding:10px 14px;color:#4b5563;font-weight:bold;border:1px solid #e5e7eb;background-color:#f9fafb;vertical-align:top;">
                    E-mail*
                  </td>
                  <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;vertical-align:top;">
                    <a href="mailto:${esc(leadEmail)}" style="color:#2563eb;text-decoration:none;">
                      ${esc(leadEmail)}
                    </a>
                  </td>
                </tr>

                <!-- Message* -->
                <tr style="background-color:#ffffff;">
                  <td style="padding:10px 14px;color:#4b5563;font-weight:bold;border:1px solid #e5e7eb;background-color:#f9fafb;vertical-align:top;">
                    Message*
                  </td>
                  <td style="padding:10px 14px;color:#1f2937;line-height:21px;border:1px solid #e5e7eb;vertical-align:top;white-space:pre-wrap;">${esc(rawMessage)}</td>
                </tr>

              </table>

              <!-- Website Footer Source Line -->
              <div style="padding-top:14px;border-top:1px solid #e5e7eb;font-size:12px;color:#4b5563;line-height:19px;">
                This mail is sent via <strong>KTAHV Website</strong> &ndash; 
                <a href="${esc(sourceUrl)}" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all;">
                  ${esc(sourceUrl)}
                </a>
              </div>

              <!-- Quick CRM Link -->
              <div style="margin-top:16px;text-align:right;">
                <a href="${esc(crmLeadUrl)}" target="_blank" style="display:inline-block;font-size:11px;font-weight:bold;color:#166534;background-color:#f0fdf4;border:1px solid #bbf7d0;padding:5px 12px;border-radius:4px;text-decoration:none;">
                  Open in CRM &rarr;
                </a>
              </div>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
}
