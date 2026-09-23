import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { provider: string } }) {
  try {
    const providerStr = params.provider.toLowerCase();
    const body = await req.json();

    const events = Array.isArray(body) ? body : [body];
    
    for (const event of events) {
      let eventType = 'Unknown';
      let messageId = '';
      let eventId = crypto.randomUUID();

      if (providerStr === 'sendgrid') {
        messageId = event.sg_message_id?.split('.')[0] || '';
        eventType = normalizeSendGridEvent(event.event);
        eventId = event.sg_event_id || eventId;
      } else if (providerStr === 'brevo') {
        messageId = event.messageId || '';
        eventType = normalizeBrevoEvent(event.event);
      } else if (providerStr === 'mailgun') {
        messageId = event['event-data']?.message?.headers?.['message-id'] || '';
        eventType = normalizeMailgunEvent(event['event-data']?.event);
      }

      if (!messageId) continue;

      const [rows] = await (await getPool()).query(`SELECT job_id, campaign_id FROM email_queue WHERE provider_message_id = ? LIMIT 1`, [messageId]);
      const job = (rows as any[])[0];

      if (job) {
        await (await getPool()).query(`
          INSERT IGNORE INTO email_webhook_events 
          (id, provider_id, provider_event_id, job_id, provider_message_id, event_type, payload_json, processed, created_at)
          VALUES (?, (SELECT id FROM email_providers WHERE type = ? LIMIT 1), ?, ?, ?, ?, ?, TRUE, NOW())
        `, [crypto.randomUUID(), providerStr, eventId, job.job_id, messageId, eventType, JSON.stringify(event)]);

        await (await getPool()).query(`
          INSERT INTO email_campaign_events (id, campaign_id, job_id, event_type, created_at)
          VALUES (?, ?, ?, ?, NOW())
        `, [crypto.randomUUID(), job.campaign_id, job.job_id, eventType]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalizeSendGridEvent(event: string) {
  const map: Record<string, string> = { 'delivered': 'Delivered', 'open': 'Opened', 'click': 'Clicked', 'bounce': 'Hard Bounce', 'spamreport': 'Complaint', 'unsubscribe': 'Unsubscribe' };
  return map[event] || 'Unknown';
}
function normalizeBrevoEvent(event: string) {
  const map: Record<string, string> = { 'delivered': 'Delivered', 'opened': 'Opened', 'click': 'Clicked', 'hard_bounce': 'Hard Bounce', 'soft_bounce': 'Soft Bounce', 'complaint': 'Complaint', 'unsubscribed': 'Unsubscribe' };
  return map[event] || 'Unknown';
}
function normalizeMailgunEvent(event: string) {
  const map: Record<string, string> = { 'delivered': 'Delivered', 'opened': 'Opened', 'clicked': 'Clicked', 'failed': 'Hard Bounce', 'complained': 'Complaint', 'unsubscribed': 'Unsubscribe' };
  return map[event] || 'Unknown';
}
