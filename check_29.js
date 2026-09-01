const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '165.22.220.165',
  port: 3306,
  database: 'spalabsdomain_Kairali_CRM_Db',
  user: 'spalabsdomain_kairalicrm_users',
  password: 'SoPNxU*[zF~6W{=f',
};

function parseToDate(val) {
    if (val === null || val === undefined || val === '') return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    try {
        const d = new Date(val)
        if (!isNaN(d.getTime())) return d

        const str = String(val).trim()
        const mYMD = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
        if (mYMD) {
            return new Date(Number(mYMD[1]), Number(mYMD[2]) - 1, Number(mYMD[3]), Number(mYMD[4]), Number(mYMD[5]), Number(mYMD[6]))
        }

        const mDMY = str.match(/^(\d{2})\/(\d{2})\/(\d{4})[T ](\d{2}):(\d{2}):(\d{2})/)
        if (mDMY) {
            return new Date(Number(mDMY[3]), Number(mDMY[2]) - 1, Number(mDMY[1]), Number(mDMY[4]), Number(mDMY[5]), Number(mDMY[6]))
        }
    } catch {
        return null
    }
    return null
}

function calculateTAT_old(candidates, dateTime) {
    const dt = parseToDate(dateTime)
    if (!dt) return null
    const list = Array.isArray(candidates) ? candidates : [candidates]
    for (const val of list) {
        const t2 = parseToDate(val)
        if (t2) {
            const diffMs = t2.getTime() - dt.getTime()
            return Math.max(0, Math.floor(diffMs / 1000))
        }
    }
    return null
}

function calculateTAT_new(candidates, dateTime) {
    const dt = parseToDate(dateTime)
    if (!dt) return null
    if (dt.getFullYear() < 2024) return null
    
    const list = Array.isArray(candidates) ? candidates : [candidates]
    for (const val of list) {
        const t2 = parseToDate(val)
        if (t2) {
            if (t2.getFullYear() < 2024) continue
            const diffMs = t2.getTime() - dt.getTime()
            const diffSec = Math.max(0, Math.floor(diffMs / 1000))
            return Math.min(diffSec, 24 * 3600)
        }
    }
    return null
}

async function main() {
  const pool = mysql.createPool(DB_CONFIG);
  const connection = await pool.getConnection();
  try {
    // Fetch leads updated on June 29, 2026
    const [rows] = await connection.query(`
      SELECT  
          m.lead_id, m.Date_Time, m.Timestamp,
          s.NBD_CRR, s.gpt_Extraction_Status, s.Sent_status, s.Timestamp_2,
          m.Data_Source
      FROM master_buffer m
      INNER JOIN staging_buffer_new s
        ON m.lead_id = s.Lead_id
      WHERE DATE(m.Timestamp) = '2026-06-29'
    `);
    
    console.log("Total leads on 2026-06-29:", rows.length);
    
    // Filter for CRR leads
    const crrLeads = rows.filter(r => r.NBD_CRR === 'CRR');
    console.log("CRR leads count:", crrLeads.length);
    
    let oldTatSum = 0;
    let oldTatCount = 0;
    
    let newTatSum = 0;
    let newTatCount = 0;
    
    for (const row of crrLeads) {
      const candidates = [row.gpt_Extraction_Status, row.Sent_status, row.Timestamp_2];
      const oldTat = calculateTAT_old(candidates, row.Date_Time);
      const newTat = calculateTAT_new(candidates, row.Date_Time);
      
      if (oldTat !== null) {
        oldTatSum += oldTat;
        oldTatCount++;
      }
      
      if (newTat !== null) {
        newTatSum += newTat;
        newTatCount++;
      }
      
      console.log(`Lead ID: ${row.lead_id}, Data_Source: ${row.Data_Source}, Date_Time: ${row.Date_Time}, gpt_Extraction_Status: ${row.gpt_Extraction_Status}, Sent_status: ${row.Sent_status}, Timestamp_2: ${row.Timestamp_2}`);
      console.log(`  -> Old TAT: ${oldTat ? (oldTat / 3600).toFixed(2) : null} hrs, New TAT: ${newTat ? (newTat / 3600).toFixed(2) : null} hrs`);
    }
    
    console.log(`\nOld Avg TAT: ${oldTatCount > 0 ? (oldTatSum / oldTatCount / 3600).toFixed(2) : 0} hrs`);
    console.log(`New Avg TAT: ${newTatCount > 0 ? (newTatSum / newTatCount / 3600).toFixed(2) : 0} hrs`);
    
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch(console.error);
