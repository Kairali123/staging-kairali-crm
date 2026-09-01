const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '165.22.220.165',
  port: 3306,
  database: 'spalabsdomain_Kairali_CRM_Db',
  user: 'spalabsdomain_kairalicrm_users',
  password: 'SoPNxU*[zF~6W{=f',
};

async function main() {
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    console.log("Searching for KTAHV-PMS-9130 in ktahv_bookings_fms_v3_part1...");
    const [rows1] = await connection.execute(
      `SELECT * FROM ktahv_bookings_fms_v3_part1 WHERE reservation_id = ? OR guest_id = ?`,
      ['KTAHV-PMS-9130', 'KTAHV-PMS-9130']
    );
    console.log("Rows in ktahv_bookings_fms_v3_part1:", JSON.stringify(rows1, null, 2));

    console.log("Searching for 9130 in ktahv_bookings_fms_v3_part1...");
    const [rows1_alt] = await connection.execute(
      `SELECT * FROM ktahv_bookings_fms_v3_part1 WHERE reservation_id LIKE '%9130%' OR guest_id LIKE '%9130%'`
    );
    console.log("Alternative search rows:", JSON.stringify(rows1_alt, null, 2));

    console.log("Searching in response_of_group_bookings_part1...");
    const [grp1] = await connection.execute(
      `SELECT * FROM response_of_group_bookings_part1 WHERE Res_code LIKE '%9130%' OR edit_ID LIKE '%9130%' OR txt_patient_ID1 LIKE '%9130%'`
    );
    console.log("Rows in response_of_group_bookings_part1:", JSON.stringify(grp1, null, 2));

    if (grp1.length > 0) {
      const keys = grp1.map(g => g.unique_key);
      for (const k of keys) {
        console.log(`Checking response_of_group_bookings_part2 for unique_key = ${k}...`);
        const [grp2] = await connection.execute(
          `SELECT * FROM response_of_group_bookings_part2 WHERE unique_key = ?`,
          [k]
        );
        console.log(`Rows in response_of_group_bookings_part2 for unique_key ${k}:`, JSON.stringify(grp2, null, 2));
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
