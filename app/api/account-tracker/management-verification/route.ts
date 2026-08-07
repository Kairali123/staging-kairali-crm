import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser, hasPermission, hasAdminRole } from "@/lib/authz";
import { ensureAccountTrackerManagementColumns } from "../db-init";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MANAGEMENT_PERMISSION = "management.authority";

function isTruthyVerify(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export async function POST(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const canManage = hasAdminRole(session, "trimmed-lower");
  if (!canManage) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const reservationId = String(body?.reservationId || "").trim();
  const remarks = String(body?.remarks || "").trim();
  if (!reservationId) {
    return NextResponse.json({ success: false, error: "reservationId is required" }, { status: 400 });
  }
  if (!remarks) {
    return NextResponse.json({ success: false, error: "Remarks are required" }, { status: 400 });
  }

  const verifiedBy = String(session?.name || session?.fullName || session?.email || "").trim() || "Unknown";

  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await ensureAccountTrackerManagementColumns();
    await connection.beginTransaction();

    const [existingResult]: any = await connection.execute(
      `SELECT reservation_id, management_verify, management_remarks, management_verified_by, management_verified_at
       FROM ktahv_account_tracker
       WHERE reservation_id = ?
       LIMIT 1`,
      [reservationId]
    );
    const existing = Array.isArray(existingResult) ? existingResult[0] : null;
    if (!existing) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    await connection.execute(
      `UPDATE ktahv_account_tracker
       SET management_verify = 1,
           management_remarks = ?,
           management_verified_by = ?,
           management_verified_at = NOW()
       WHERE reservation_id = ?`,
      [remarks, verifiedBy, reservationId]
    );

    const [updatedResult]: any = await connection.execute(
      `SELECT
          reservation_id,
          management_verify,
          management_remarks,
          management_verified_by,
          management_verified_at
       FROM ktahv_account_tracker
       WHERE reservation_id = ?
       LIMIT 1`,
      [reservationId]
    );

    await connection.commit();

    const updated = Array.isArray(updatedResult) ? updatedResult[0] : null;
    return NextResponse.json({
      success: true,
      data: {
        reservationId: updated?.reservation_id || reservationId,
        managementVerify: isTruthyVerify(updated?.management_verify),
        managementRemarks: updated?.management_remarks ?? remarks,
        managementVerifiedBy: updated?.management_verified_by ?? verifiedBy,
        managementVerifiedAt: updated?.management_verified_at ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("[account-tracker management verification] save failed:", error);
    return NextResponse.json({ success: false, error: "Failed to save management verification" }, { status: 500 });
  } finally {
    connection.release();
  }
}
