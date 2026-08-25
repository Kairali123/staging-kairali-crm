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

  const [ivrTypes] = await conn.execute(`
    SELECT
      COUNT(*) as total_rows,
      SUM(CASE WHEN IVR_URL IS NOT NULL AND IVR_URL != '' THEN 1 ELSE 0 END) as has_ivr_url,
      SUM(CASE WHEN IVR_URL LIKE 'http%mp3%' OR IVR_URL LIKE 'http%wav%' OR IVR_URL LIKE '%recording%' OR IVR_URL LIKE '%kstorage%' OR IVR_URL LIKE '%squadiq%' THEN 1 ELSE 0 END) as has_audio_ivr_url,
      SUM(CASE WHEN latest_recording_url IS NOT NULL AND latest_recording_url != '' THEN 1 ELSE 0 END) as has_latest_rec_url
    FROM lead_fms
  `);
  console.log('IVR_URL analysis:');
  console.log(ivrTypes[0]);

  // Check sample non-audio IVR_URLs
  const [nonAudio] = await conn.execute(`
    SELECT sl_no, IVR_URL, latest_recording_url
    FROM lead_fms
    WHERE IVR_URL IS NOT NULL AND IVR_URL != '' AND IVR_URL NOT LIKE '%.mp3%' AND IVR_URL NOT LIKE '%.wav%' AND IVR_URL NOT LIKE '%recording%' AND IVR_URL NOT LIKE '%kstorage%'
    LIMIT 5
  `);
  console.log('\nSample non-audio IVR_URLs:');
  console.log(nonAudio);

  // Check sample audio IVR_URLs
  const [audio] = await conn.execute(`
    SELECT sl_no, lead_id, IVR_URL, latest_recording_url
    FROM lead_fms
    WHERE IVR_URL LIKE '%.mp3%' OR IVR_URL LIKE '%kstorage%' OR IVR_URL LIKE '%squadiq%' OR latest_recording_url IS NOT NULL
    LIMIT 5
  `);
  console.log('\nSample audio IVR_URLs:');
  console.log(audio);

  await conn.end();
}

main().catch(console.error);
