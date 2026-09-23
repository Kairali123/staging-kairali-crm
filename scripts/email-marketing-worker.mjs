import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

// Simplified worker logic without TS imports to run directly via Node.js
// Loads environment manually for standalone execution

function loadLocalEnv() {
  for (const envFile of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), envFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

function getDbConfig() {
  return {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 3306),
    timezone: '+05:30'
  };
}

let conn = null;

async function startWorker() {
  loadLocalEnv();
  const config = getDbConfig();
  console.log('Starting Email Marketing Background Worker...');
  
  try {
    conn = await mysql.createConnection(config);
    console.log('Database connected.');
    
    // Simple polling loop
    setInterval(async () => {
      await processQueue();
    }, 5000); // Check every 5 seconds
    
  } catch (err) {
    console.error('Failed to start worker:', err);
    process.exit(1);
  }
}

async function processQueue() {
  if (!conn) return;

  try {
    // 1. Claim Jobs
    const [rows] = await conn.query(`
      SELECT q.job_id, q.campaign_id, q.recipient_id, q.contact_id, q.provider_id, q.attempt, 
             c.template_id, c.template_version_id, r.email as recipient_email,
             v.html_content, v.subject, p.type as provider_type, cred.api_key_encrypted, cred.api_secret_encrypted
      FROM email_queue q
      JOIN email_campaigns c ON q.campaign_id = c.id
      JOIN email_campaign_recipients r ON q.recipient_id = r.id
      JOIN email_template_versions v ON c.template_version_id = v.id
      JOIN email_providers p ON q.provider_id = p.id
      LEFT JOIN email_provider_credentials cred ON p.id = cred.provider_id
      WHERE q.status IN ('Pending', 'Retrying') 
        AND q.scheduled_at <= NOW()
      ORDER BY q.scheduled_at ASC
      LIMIT 20
      FOR UPDATE SKIP LOCKED
    `);

    if (rows.length === 0) return;

    // Mark as processing
    const jobIds = rows.map(r => r.job_id);
    await conn.query(`UPDATE email_queue SET status = 'Processing', updated_at = NOW() WHERE job_id IN (?)`, [jobIds]);
    
    console.log(`Processing ${rows.length} jobs...`);

    // 2. Process each job
    for (const job of rows) {
      try {
        // Implement standard send flow based on provider_type here.
        // For security and simplicity in this raw worker, we just simulate sending or use native fetch to provider.
        
        // Simulating the provider API call
        console.log(`Sending email to ${job.recipient_email} via ${job.provider_type}`);
        
        const success = true; // Replace with actual Adapter call in a full build
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        if (success) {
           await conn.query(`UPDATE email_queue SET status = 'Sent', provider_message_id = ?, updated_at = NOW() WHERE job_id = ?`, [messageId, job.job_id]);
           await conn.query(`INSERT INTO email_campaign_events (id, campaign_id, job_id, event_type, created_at) VALUES (UUID(), ?, ?, 'Sent', NOW())`, [job.campaign_id, job.job_id]);
        } else {
           await handleFailure(job.job_id, 'Failed via Provider', job.attempt);
        }
      } catch (err) {
        await handleFailure(job.job_id, err.message, job.attempt);
      }
    }

  } catch (err) {
    console.error('Error processing queue:', err);
  }
}

async function handleFailure(jobId, errorMsg, attempt) {
  const maxAttempts = 3;
  const nextStatus = attempt >= (maxAttempts - 1) ? 'Failed' : 'Retrying';
  await conn.query(`
    UPDATE email_queue 
    SET status = ?, error_message = ?, attempt = attempt + 1, updated_at = NOW()
    WHERE job_id = ?
  `, [nextStatus, errorMsg, jobId]);
}

startWorker();
