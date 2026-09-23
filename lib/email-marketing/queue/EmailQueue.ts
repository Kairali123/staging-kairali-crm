import { getPool } from '../../db';

export interface EnqueueOptions {
  campaignId: string;
  recipientId: string;
  contactId: string;
  providerId: string;
  scheduledAt: Date;
}

export class EmailQueue {
  static async enqueue(jobs: EnqueueOptions[]): Promise<void> {
    if (jobs.length === 0) return;

    // Use bulk insert for efficiency
    const values = jobs.map(job => [
      crypto.randomUUID(),
      job.campaignId,
      job.recipientId,
      job.contactId,
      job.providerId,
      'Pending',
      job.scheduledAt,
      new Date(),
      new Date()
    ]);

    const query = `
      INSERT INTO email_queue 
      (job_id, campaign_id, recipient_id, contact_id, provider_id, status, scheduled_at, created_at, updated_at) 
      VALUES ?
    `;

    // @ts-expect-error
    await (await getPool()).query(query, [values]);
  }

  static async claimJobs(batchSize: number = 50): Promise<any[]> {
    // MySQL 8+ supports SKIP LOCKED, which is crucial for queue workers.
    // Assuming standard InnoDB here.
    const query = `
      SELECT job_id, campaign_id, recipient_id, contact_id, provider_id, attempt
      FROM email_queue
      WHERE status IN ('Pending', 'Retrying') 
        AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC, attempt ASC
      LIMIT ?
      FOR UPDATE SKIP LOCKED
    `;
    
    const [rows] = await (await getPool()).query(query, [batchSize]);
    const jobs = rows as any[];
    
    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j.job_id);
      await (await getPool()).query(
        `UPDATE email_queue SET status = 'Processing', updated_at = NOW() WHERE job_id IN (?)`,
        [jobIds]
      );
    }
    
    return jobs;
  }

  static async updateJobStatus(jobId: string, status: string, providerMessageId?: string, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE email_queue 
      SET 
        status = ?, 
        provider_message_id = ?, 
        error_message = ?,
        attempt = attempt + (CASE WHEN ? IN ('Failed', 'Retrying', 'Unknown') THEN 1 ELSE 0 END),
        updated_at = NOW()
      WHERE job_id = ?
    `;
    
    await (await getPool()).query(query, [status, providerMessageId || null, errorMessage || null, status, jobId]);
  }

  static async logCampaignEvent(campaignId: string, jobId: string, eventType: string): Promise<void> {
    const query = `
      INSERT INTO email_campaign_events (id, campaign_id, job_id, event_type, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    await (await getPool()).query(query, [crypto.randomUUID(), campaignId, jobId, eventType]);
  }
}
