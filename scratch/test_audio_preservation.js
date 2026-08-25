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

function isAudioUrl(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return u.includes('.mp3') || u.includes('.wav') || u.includes('kstorage') || u.includes('squadiq') || u.includes('recording') || u.includes('knowlarity') || u.includes('dialer') || u.includes('/recordings/');
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  const [rows] = await conn.execute(`
    SELECT sl_no, lead_id, timeIdKey, Timestamp, Date_Time, IVR_URL, latest_recording_url, call_recording_duration
    FROM lead_fms
    ORDER BY sl_no DESC
    LIMIT 25000
  `);

  let audioCount = 0;
  let uniqueAudioCount = 0;
  const byKey = new Map();

  for (const r of rows) {
    const rec = (isAudioUrl(r.latest_recording_url) ? r.latest_recording_url : null) ||
                (isAudioUrl(r.IVR_URL) ? r.IVR_URL : null);
    if (rec) audioCount++;

    const key = r.lead_id || r.timeIdKey || String(r.sl_no);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...r, rec });
    } else {
      // Keep best recording
      if (!existing.rec && rec) {
        existing.rec = rec;
      }
    }
  }

  for (const v of byKey.values()) {
    if (v.rec) uniqueAudioCount++;
  }

  console.log(`Out of 25,000 scanned rows:`);
  console.log(`- Total rows with audio URL: ${audioCount}`);
  console.log(`- Total unique deduplicated leads: ${byKey.size}`);
  console.log(`- Unique leads with audio URL (after preserving): ${uniqueAudioCount}`);

  await conn.end();
}

main().catch(console.error);
