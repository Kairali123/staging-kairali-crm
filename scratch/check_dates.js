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

  const [latestDates] = await conn.execute(`
    SELECT
      MAX(Timestamp) as max_timestamp,
      MIN(Timestamp) as min_timestamp,
      MAX(Date_Time) as max_date_time,
      MIN(Date_Time) as min_date_time,
      MAX(created_at) as max_created_at,
      MAX(actual_time) as max_actual_time
    FROM lead_fms
  `);
  console.log('Date extrema in lead_fms:');
  console.log(JSON.stringify(latestDates, null, 2));

  const [topByTimestamp] = await conn.execute(`
    SELECT sl_no, lead_id, Timestamp, Date_Time, Name_of_Client, Mobile, Full_Disposition
    FROM lead_fms
    ORDER BY Timestamp DESC
    LIMIT 5
  `);
  console.log('\nTop 5 rows ordered by Timestamp DESC:');
  console.log(JSON.stringify(topByTimestamp, null, 2));

  const [topByDateTime] = await conn.execute(`
    SELECT sl_no, lead_id, Timestamp, Date_Time, Name_of_Client, Mobile, Full_Disposition
    FROM lead_fms
    ORDER BY Date_Time DESC
    LIMIT 5
  `);
  console.log('\nTop 5 rows ordered by Date_Time DESC:');
  console.log(JSON.stringify(topByDateTime, null, 2));

  const [topBySlNo] = await conn.execute(`
    SELECT sl_no, lead_id, Timestamp, Date_Time, created_at, Name_of_Client, Mobile, Full_Disposition
    FROM lead_fms
    ORDER BY sl_no DESC
    LIMIT 5
  `);
  console.log('\nTop 5 rows ordered by sl_no DESC:');
  console.log(JSON.stringify(topBySlNo, null, 2));

  await conn.end();
}

main().catch(console.error);
