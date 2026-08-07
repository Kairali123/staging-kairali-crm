import { getPool } from "@/lib/db";

let ensured = false;

export async function ensureAccountTrackerManagementColumns() {
  if (ensured) return;

  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    await connection.execute(`
      ALTER TABLE ktahv_account_tracker
        ADD COLUMN IF NOT EXISTS management_verify TINYINT(1) NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS management_remarks TEXT NULL,
        ADD COLUMN IF NOT EXISTS management_verified_by VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS management_verified_at DATETIME NULL
    `);
    ensured = true;
  } catch (error: any) {
    const message = String(error?.message || error || "");
    if (
      !message.includes("Duplicate column name") &&
      !message.includes("IF NOT EXISTS")
    ) {
      throw error;
    }
    ensured = true;
  } finally {
    connection.release();
  }
}
