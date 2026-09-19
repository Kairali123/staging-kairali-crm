/**
 * KServe Lead Lost Alert Email Template
 * Sent when leads remain unreturned from KServe beyond the configured threshold.
 */

export interface LostLead {
    id: string;
    name_of_client: string;
    mobile: string;
    email_id: string;
    subjects: string;
    company: string;
    data_source: string;
    sent_date: string | Date;
    days_pending: number;
}

export function buildKserveLostAlertEmail(leads: LostLead[], lostDays: number, appUrl: string): string {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const count = leads.length;

    const rows = leads.map((l, i) => {
        const sentDate = l.sent_date ? new Date(l.sent_date).toLocaleDateString("en-IN") : "—";
        const urgencyColor = l.days_pending > lostDays * 2 ? "#dc2626" : l.days_pending > lostDays ? "#d97706" : "#374151";
        return `
            <tr style="background: ${i % 2 === 0 ? "#fff" : "#f8faff"};">
                <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${i + 1}</td>
                <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
                    <strong>${escHtml(l.name_of_client || "—")}</strong><br>
                    <span style="color:#64748b;font-size:11px;">${escHtml(l.mobile || "—")}</span><br>
                    <span style="color:#64748b;font-size:11px;">${escHtml(l.email_id || "—")}</span>
                </td>
                <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;font-family:monospace;">${escHtml(l.id)}</td>
                <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${escHtml(l.company || "—")}</td>
                <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${escHtml(l.data_source || "—")}</td>
                <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${sentDate}</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${urgencyColor};border-bottom:1px solid #e5e7eb;">${l.days_pending} days</td>
            </tr>
        `;
    }).join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KServe Lead Lost Alert</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 16px;">
        <tr><td align="center">
            <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">

                <!-- Header -->
                <tr><td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
                    <div style="font-size:28px;margin-bottom:8px;">🚨</div>
                    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">KServe Lead Lost Alert</div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">Generated: ${now} IST</div>
                </td></tr>

                <!-- Alert Banner -->
                <tr><td style="background:#fef2f2;border-left:4px solid #ef4444;border-right:4px solid #ef4444;padding:16px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="font-size:14px;color:#991b1b;font-weight:700;">
                                ⚠️ ${count} lead${count !== 1 ? "s" : ""} sent to KServe ${count !== 1 ? "have" : "has"} not been returned for more than <strong>${lostDays} days</strong> and may be lost.
                            </td>
                        </tr>
                    </table>
                </td></tr>

                <!-- KPI Summary -->
                <tr><td style="background:#fff;padding:20px 32px;border-left:4px solid #ef4444;border-right:4px solid #ef4444;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="50%" style="text-align:center;padding:14px;background:#fef2f2;border-radius:10px;margin-right:8px;">
                                <div style="font-size:36px;font-weight:800;color:#dc2626;">${count}</div>
                                <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:1px;">Total Lost / Pending</div>
                            </td>
                            <td width="8px"></td>
                            <td width="50%" style="text-align:center;padding:14px;background:#fef3c7;border-radius:10px;">
                                <div style="font-size:36px;font-weight:800;color:#d97706;">${lostDays}</div>
                                <div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">Days Threshold</div>
                            </td>
                        </tr>
                    </table>
                </td></tr>

                <!-- Table -->
                <tr><td style="background:#fff;padding:0 32px 24px;border-left:4px solid #ef4444;border-right:4px solid #ef4444;">
                    <div style="font-size:13px;font-weight:700;color:#1e293b;padding:14px 0 10px;border-bottom:2px solid #e5e7eb;margin-bottom:0;">📋 Lost Lead Details</div>
                    <div style="overflow-x:auto;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:560px;">
                            <thead>
                                <tr style="background:#1e2a4a;">
                                    <th style="padding:10px 14px;font-size:10px;color:rgba(255,255,255,0.8);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">#</th>
                                    <th style="padding:10px 14px;font-size:10px;color:rgba(255,255,255,0.8);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">Client Details</th>
                                    <th style="padding:10px 14px;font-size:10px;color:rgba(255,255,255,0.8);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">Lead ID</th>
                                    <th style="padding:10px 14px;font-size:10px;color:rgba(255,255,255,0.8);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">Company</th>
                                    <th style="padding:10px 14px;font-size:10px;color:rgba(255,255,255,0.8);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">Source</th>
                                    <th style="padding:10px 14px;font-size:10px;color:rgba(255,255,255,0.8);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">Sent Date</th>
                                    <th style="padding:10px 14px;font-size:10px;color:rgba(255,255,255,0.8);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">Days Pending</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </td></tr>

                <!-- Action Required -->
                <tr><td style="background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #ef4444;border-right:4px solid #ef4444;padding:16px 32px 24px;">
                    <div style="font-size:13px;font-weight:700;color:#92400e;">🎯 Action Required</div>
                    <ul style="font-size:12.5px;color:#78350f;margin:8px 0 16px;padding-left:20px;line-height:1.9;">
                        <li>Contact KServe team to follow up on above leads immediately.</li>
                        <li>Verify if the leads were contacted and what disposition was recorded.</li>
                        <li>If leads are not recoverable, mark them as lost in the CRM.</li>
                    </ul>
                    
                    <div style="text-align:center;">
                        <a href="${appUrl}/voicecall/kserve-lead-lost" style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 6px -1px rgba(239,68,68,0.2);">
                            View Tracker Dashboard &rarr;
                        </a>
                    </div>
                </td></tr>

                <!-- Footer -->
                <tr><td style="background:#1e2a4a;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
                    <div style="font-size:12px;color:rgba(255,255,255,0.6);">This is an automated alert from the Kairali CRM system.</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px;">Threshold can be changed in Settings on the KServe Lead Lost Tracker page.</div>
                </td></tr>

            </table>
        </td></tr>
    </table>
</body>
</html>
    `.trim();
}

function escHtml(s: string): string {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]!));
}
