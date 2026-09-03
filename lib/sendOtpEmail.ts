import nodemailer from "nodemailer";

export interface SendOtpEmailParams {
  name: string;
  action: string;
  reason: string;
  otp: string;
  expiresInMinutes: number;
}

export async function sendOtpEmail({
  name,
  action,
  reason,
  otp,
  expiresInMinutes,
}: SendOtpEmailParams) {
  const adminEmail =
    process.env.ADMIN_OTP_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.SMTP_USER ||
    "admin@kairali.com";

  // `.env` names this SMTP_PASSWORD; some deployments set SMTP_PASS. Accept both,
  // otherwise the credential silently reads as absent and no mail is dispatched.
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  // If SMTP is configured, send actual email
  if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || `"Kairali CRM Security" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `[Kairali CRM] DB Access OTP for ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4f46e5;">Database Access Request OTP</h2>
            <p>A user has requested database access privileges:</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 20px 0;">
              <tr><td style="padding: 8px; font-weight: bold;">User:</td><td style="padding: 8px;">${name}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Action:</td><td style="padding: 8px;">${action}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Reason:</td><td style="padding: 8px;">${reason}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">OTP Code:</td><td style="padding: 8px; font-size: 24px; font-weight: bold; color: #4f46e5; letter-spacing: 4px;">${otp}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Validity:</td><td style="padding: 8px;">${expiresInMinutes} minutes</td></tr>
            </table>
            <p style="color: #666; font-size: 12px;">If you did not expect this request, please investigate immediately.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[sendOtpEmail] OTP email dispatched to ${adminEmail}`);
      return;
    } catch (emailErr) {
      console.error("[sendOtpEmail] Failed to send email via SMTP:", emailErr);
    }
  } else {
    console.log(
      `[sendOtpEmail] OTP generated for user ${name} (${action}). Valid for ${expiresInMinutes}m.`
    );
  }
}
