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

  const [years] = await conn.execute(`
    SELECT
      YEAR(Timestamp) as yr,
      COUNT(*) as count_rows,
      MIN(sl_no) as min_sl,
      MAX(sl_no) as max_sl,
      SUM(CASE WHEN (latest_recording_url IS NOT NULL AND latest_recording_url != '') OR (IVR_URL LIKE 'http%mp3%' OR IVR_URL LIKE '%kstorage%' OR IVR_URL LIKE '%recording%') THEN 1 ELSE 0 END) as rows_with_rec
    FROM lead_fms
    GROUP BY YEAR(Timestamp)
    ORDER BY yr DESC
  `);
  console.log('Yearly breakdown in lead_fms:');
  console.log(years);

  const [topByTime] = await conn.execute(`
    SELECT sl_no, lead_id, Timestamp, Date_Time, IVR_URL, latest_recording_url
    FROM lead_fms
    ORDER BY Timestamp DESC
    LIMIT 20
  `);
  console.log('\nTop 20 by Timestamp DESC:');
  console.log(topByTime);

  await conn.end();
}

main().catch(console.error);
