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

  const [res] = await conn.execute('SELECT COUNT(*) as cnt FROM lead_fms WHERE IVR_URL IS NOT NULL OR latest_recording_url IS NOT NULL');
  console.log('Rows with audio recording:', res[0].cnt);
  const [recSample] = await conn.execute('SELECT sl_no, timeIdKey, lead_id, IVR_URL, latest_recording_url, call_recording_duration, Full_Disposition FROM lead_fms WHERE IVR_URL IS NOT NULL OR latest_recording_url IS NOT NULL LIMIT 2');
  console.log('Rec sample:', recSample);

  await conn.end();
}

main().catch(console.error);
