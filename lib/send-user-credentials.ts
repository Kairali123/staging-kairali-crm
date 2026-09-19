import nodemailer from "nodemailer"

export interface SendUserCredentialsParams {
  name: string
  email: string
  password: string
  loginUrl?: string
}

export interface SendCredentialsResult {
  success: boolean
  message: string
  messageId?: string
}

export async function sendUserCredentialsEmail({
  name,
  email,
  password,
  loginUrl,
}: SendUserCredentialsParams): Promise<SendCredentialsResult> {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465

  if (!email || !email.includes("@")) {
    return {
      success: false,
      message: "Valid recipient email address is required.",
    }
  }

  if (!password) {
    return {
      success: false,
      message: "Password is required to share credentials.",
    }
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[sendUserCredentialsEmail] SMTP credentials not fully configured on server.")
    return {
      success: false,
      message: "SMTP server is not configured. Please check SMTP settings in environment variables.",
    }
  }

  const effectiveLoginUrl =
    loginUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://crm.kairali.com"

  const senderFrom =
    process.env.SMTP_FROM || `"Kairali IT Team" <${smtpUser}>`

  const subject = `Your Kairali CRM Account Credentials - Action Required`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eff2e6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #22251a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eff2e6; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #dce2d2; overflow: hidden; box-shadow: 0 4px 18px rgba(70, 80, 40, 0.06);">
          
          <!-- Header Banner: Authentic Kairali Herbal Olive Green -->
          <tr>
            <td style="background-color: #556827; padding: 30px 24px 26px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2;">
                Kairali Ayurvedic Group
              </h1>
              <p style="margin: 6px 0 0; color: #e1e7cb; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                AUTHENTIC AYURVEDA SINCE 1908 • CRM SYSTEM
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px 28px;">
              <!-- Greeting -->
              <p style="margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #22251a;">
                Hello ${name || "Employee"},
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.65; color: #474c3b;">
                Your login credentials for the <strong>Kairali CRM System</strong> have been updated by <strong>Kairali IT Team</strong>. You can now access your account using the credentials below:
              </p>

              <!-- Credentials Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8faf5; border: 1px solid #e7ecde; border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <!-- Login Email Row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px dashed #dce2d2;">
                      <tr>
                        <td>
                          <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #556827; letter-spacing: 0.8px; margin-bottom: 4px;">
                            LOGIN EMAIL
                          </span>
                          <span style="display: block; font-size: 15px; font-weight: 700; color: #22251a; word-break: break-all; text-decoration: none;">
                            ${email}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Password Row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #556827; letter-spacing: 0.8px; margin-bottom: 6px;">
                            PASSWORD
                          </span>
                          <div style="display: inline-block; font-family: 'SFMono-Regular', Consolas, Monaco, monospace; font-size: 18px; font-weight: 800; color: #556827; background-color: #ffffff; padding: 8px 20px; border-radius: 6px; border: 1.5px solid #b8c79c; letter-spacing: 2px;">
                            ${password}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button (Kairali Olive Green) -->
              <div style="text-align: center; margin: 26px 0;">
                <a href="${effectiveLoginUrl}" target="_blank" style="display: inline-block; background-color: #556827; color: #ffffff; text-decoration: none; font-size: 14.5px; font-weight: 700; padding: 13px 34px; border-radius: 8px; box-shadow: 0 4px 10px rgba(85, 104, 39, 0.25);">
                  Login to Kairali CRM &rarr;
                </a>
              </div>

              <!-- Fallback Direct URL -->
              <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.5; color: #6a7452; text-align: center;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${effectiveLoginUrl}" target="_blank" style="color: #556827; word-break: break-all; font-weight: 600;">${effectiveLoginUrl}</a>
              </p>

              <!-- Security Notice Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f6f8f0; border-left: 4px solid #556827; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 26px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #474c3b;">
                      <strong style="color: #364019;">Security Notice:</strong> Do not share your credentials with anyone. Your account is tied to authorized devices. If you did not request this update, please contact the Kairali IT Team immediately.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Sign-off as requested -->
              <div style="border-top: 1px solid #e6ebdc; padding-top: 18px;">
                <p style="margin: 0 0 4px; font-size: 13.5px; color: #5a604f;">
                  Regards,
                </p>
                <p style="margin: 0; font-size: 14.5px; font-weight: 800; color: #556827; letter-spacing: 0.3px;">
                  Kairali IT Team, Kairali Ayurvedic Group
                </p>
              </div>

            </td>
          </tr>

          <!-- Clean Corporate Footer -->
          <tr>
            <td style="background-color: #f7f9f2; padding: 20px 28px; text-align: center; border-top: 1px solid #e8ede0;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #788260; line-height: 1.5;">
                This is an automated system email from Kairali CRM.
              </p>
              <p style="margin: 0; font-size: 11px; color: #788260;">
                &copy; ${new Date().getFullYear()} Kairali Ayurvedic Group. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const info = await transporter.sendMail({
      from: senderFrom,
      to: email,
      subject,
      html,
    })

    console.log(`[sendUserCredentialsEmail] Credentials sent to ${email} (MessageID: ${info.messageId})`)
    return {
      success: true,
      message: `Credentials sent successfully to ${email}`,
      messageId: info.messageId,
    }
  } catch (error: any) {
    console.error("[sendUserCredentialsEmail] Error sending email via SMTP:", error?.message || error)
    return {
      success: false,
      message: error?.message || "Failed to dispatch email via SMTP server.",
    }
  }
}
