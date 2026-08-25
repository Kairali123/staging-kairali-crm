const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  });
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  // Check columns that might have recording URLs
  const [cols] = await conn.execute(`
    SHOW COLUMNS FROM lead_fms
  `);
  console.log('All column names in lead_fms:');
  console.log(cols.map(c => c.Field));

  // Count non-empty values for recording-related columns
  const [counts] = await conn.execute(`
    SELECT
      COUNT(*) as total,
      COUNT(latest_recording_url) as count_latest_recording_url,
      COUNT(IVR_URL) as count_IVR_URL,
      SUM(CASE WHEN latest_recording_url IS NOT NULL AND latest_recording_url != '' THEN 1 ELSE 0 END) as non_empty_latest_rec,
      SUM(CASE WHEN IVR_URL IS NOT NULL AND IVR_URL != '' THEN 1 ELSE 0 END) as non_empty_ivr_url
    FROM lead_fms
  `);
  console.log('\nRecording counts:', counts[0]);

  // Check sample rows with non-empty recordings
  const [sampleRec] = await conn.execute(`
    SELECT sl_no, lead_id, timeIdKey, Timestamp, Date_Time, IVR_URL, latest_recording_url, call_recording_duration, Full_Disposition
    FROM lead_fms
    WHERE (latest_recording_url IS NOT NULL AND latest_recording_url != '')
       OR (IVR_URL IS NOT NULL AND IVR_URL != '' AND IVR_URL LIKE 'http%')
    ORDER BY sl_no DESC
    LIMIT 10
  `);
  console.log('\nSample rows with recordings (ORDER BY sl_no DESC):');
  console.log(JSON.stringify(sampleRec, null, 2));

  // Check the top 20 rows that were showing on page 1 (sl_no >= 161600)
  const [topPageRows] = await conn.execute(`
    SELECT sl_no, lead_id, timeIdKey, Timestamp, Date_Time, IVR_URL, latest_recording_url, call_recording_duration, Full_Disposition
    FROM lead_fms
    ORDER BY Timestamp DESC
    LIMIT 10
  `);
  console.log('\nTop 10 rows by Timestamp DESC (these are on page 1):');
  console.log(JSON.stringify(topPageRows, null, 2));

  await conn.end();
}

main().catch(console.error);
