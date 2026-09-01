import { getPool } from "@/lib/db"

/**
 * Standalone initialization helper to ensure index setup for
 * fms_enquiry_cold_reverification_v2 table.
 * Should be run once during schema initialization or maintenance,
 * outside the request-response lifecycle of API endpoints.
 */
export async function ensureIndexesExist() {
  let connection
  try {
    const pool = await getPool()
    connection = await pool.getConnection()

    try {
      await connection.execute("CREATE INDEX idx_generate_date_time ON fms_enquiry_cold_reverification_v2 (generate_date_time)")
    } catch (e) {
      console.log("Index idx_generate_date_time already exists or could not be created")
    }

    try {
      await connection.execute("CREATE INDEX idx_company_belongs_to ON fms_enquiry_cold_reverification_v2 (company_belongs_to)")
    } catch (e) {
      console.log("Index idx_company_belongs_to already exists or could not be created")
    }

    try {
      await connection.execute("CREATE INDEX idx_website_name ON fms_enquiry_cold_reverification_v2 (website_name)")
    } catch (e) {
      console.log("Index idx_website_name already exists or could not be created")
    }

    try {
      await connection.execute("CREATE INDEX idx_cold_by_employee_name ON fms_enquiry_cold_reverification_v2 (cold_by_employee_name)")
    } catch (e) {
      console.log("Index idx_cold_by_employee_name already exists or could not be created")
    }

  } catch (error) {
    console.error("Failed to run index initialization:", error)
    throw error
  } finally {
    if (connection) connection.release()
  }
}
