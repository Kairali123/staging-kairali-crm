const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '165.22.220.165',
  port: 3306,
  database: 'spalabsdomain_Kairali_CRM_Db',
  user: 'spalabsdomain_developer',
  password: '$c0%r!zKF~66=,q{',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    const [rows] = await conn.query("SELECT * FROM ktahv_guest_tracker WHERE booking_id = 'KTAHV-PMS-8894'");
    console.log("DATABASE ROW:", JSON.stringify(rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

main();
