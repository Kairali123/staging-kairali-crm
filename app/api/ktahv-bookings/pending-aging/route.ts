import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { normalizeUserName } from "@/lib/utils";

export interface PendingAgingBooking {
  bookingId: string;
  guestName: string;
  sheetName: string;
  stageName: string;
  employee: string;
  plannedDate: string;
  agingDays: number;
  actionStatus: string;
  doerRemarks: string;
  cancelReason: string;
}

export interface SheetSummary {
  sheetKey: string;
  sheetName: string;
  total: number;
  normal: number;
  risky: number;
  critical: number;
  bookings: PendingAgingBooking[];
}

export interface EmployeeAgingSummary {
  employee: string;
  sheets: SheetSummary[];
  totalPending: number;
  totalCritical: number;
  totalRisky: number;
}

export interface AgingSummary {
  total: number;
  critical: number;
  risky: number;
  normal: number;
  bySheet: Record<string, number>;
}

function getDbConfig() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 20000,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

function getAgingDays(raw: any): number {
  if (!raw) return -1;
  let planned: Date;
  if (raw instanceof Date) {
    planned = raw;
  } else {
    const str = String(raw).trim();
    if (!str) return -1;
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
    if (m) {
      const p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10), yr = parseInt(m[3], 10);
      const hr = parseInt(m[4] ?? "0", 10), min = parseInt(m[5] ?? "0", 10), sec = parseInt(m[6] ?? "0", 10);
      const [month, day] = p1 > 12 ? [p2 - 1, p1] : [p1 - 1, p2];
      planned = new Date(yr, month, day, hr, min, sec);
    } else {
      planned = new Date(str);
    }
  }
  if (!planned || isNaN(planned.getTime())) return -1;
  const now = new Date();
  const diffMs = now.getTime() - planned.getTime();
  if (diffMs <= 0) return -1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function agingTag(days: number): "normal" | "risky" | "critical" {
  if (days >= 6) return "critical";
  if (days >= 3) return "risky";
  return "normal";
}

function formatPlanned(raw: any): string {
  if (!raw) return "";
  let d: Date;
  if (raw instanceof Date) {
    d = raw;
  } else {
    const str = String(raw).trim();
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
    if (m) {
      const p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10), yr = parseInt(m[3], 10);
      const hr = parseInt(m[4] ?? "0", 10), min = parseInt(m[5] ?? "0", 10), sec = parseInt(m[6] ?? "0", 10);
      const [month, day] = p1 > 12 ? [p2 - 1, p1] : [p1 - 1, p2];
      d = new Date(yr, month, day, hr, min, sec);
    } else {
      d = new Date(str);
    }
  }

  if (isNaN(d.getTime())) return String(raw);

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${h}:${m}:${s}`;
}

export async function GET(_req: NextRequest) {
  let connection: mysql.PoolConnection | undefined;
  try {
    const pool = mysql.createPool(getDbConfig());
    connection = await pool.getConnection();

    // ── 1. New Bookings stage ─────────────────────────────────────────────
    const [nbRows] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        nbs.reservation_id        AS bookingId,
        nb.client_name            AS guestName,
        nbs.nb_bvs_planned        AS plannedDate,
        nbs.nb_bvs_actual         AS actualDate,
        nbs.nb_bvs_doer           AS employee,
        nbs.nb_bvs_action_status  AS actionStatus,
        nbs.nb_bvs_doer_remarks   AS doerRemarks,
        nbs.nb_bvs_reason_of_cancellation AS cancelReason
      FROM ktahv_bookings_fms_v3_nb_booking_verification_stage nbs
      LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON nb.reservation_id = nbs.reservation_id
      WHERE (nbs.nb_bvs_actual IS NULL OR nbs.nb_bvs_actual = '')
        AND nbs.nb_bvs_planned IS NOT NULL AND nbs.nb_bvs_planned != ''
        AND nbs.nb_bvs_doer IS NOT NULL AND nbs.nb_bvs_doer != ''
    `).catch(() => [[]] as [mysql.RowDataPacket[]]);

    // ── 2. Account Verify — Accounts stage ───────────────────────────────
    const [avAccountsRows] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        av.reservation_id       AS bookingId,
        nb.client_name          AS guestName,
        av.av_apcs_planned      AS plannedDate,
        av.av_apcs_actual       AS actualDate,
        av.av_apcs_doer         AS employee,
        av.av_apcs_pay_recv_status AS actionStatus,
        av.av_apcs_remarks      AS doerRemarks,
        ''                      AS cancelReason
      FROM ktahv_bookings_fms_v3_av_AccountsVerify_frontoffice av
      LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON nb.reservation_id = av.reservation_id
      WHERE (av.av_apcs_actual IS NULL OR av.av_apcs_actual = '')
        AND av.av_apcs_planned IS NOT NULL AND av.av_apcs_planned != ''
        AND av.av_apcs_doer IS NOT NULL AND av.av_apcs_doer != ''
    `).catch(() => [[]] as [mysql.RowDataPacket[]]);

    // ── 3. Account Verify — FO stage ─────────────────────────────────────
    const [avFoRows] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        av.reservation_id         AS bookingId,
        nb.client_name            AS guestName,
        av.av_fobr_planned        AS plannedDate,
        av.av_fobr_actual         AS actualDate,
        av.av_fobr_doer_name      AS employee,
        av.av_fobr_release_pass_status AS actionStatus,
        av.av_fobr_remarks        AS doerRemarks,
        ''                        AS cancelReason
      FROM ktahv_bookings_fms_v3_av_AccountsVerify_frontoffice av
      LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON nb.reservation_id = av.reservation_id
      WHERE (av.av_fobr_actual IS NULL OR av.av_fobr_actual = '')
        AND av.av_fobr_planned IS NOT NULL AND av.av_fobr_planned != ''
        AND av.av_fobr_doer_name IS NOT NULL AND av.av_fobr_doer_name != ''
    `).catch(() => [[]] as [mysql.RowDataPacket[]]);

    // ── 4. Final Transfer — Accounts stage ───────────────────────────────
    const [ftAccountsRows] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        ft.reservation_id         AS bookingId,
        nb.client_name            AS guestName,
        ft.ft_ppv_planned         AS plannedDate,
        ft.ft_ppv_actual          AS actualDate,
        ft.ft_ppv_doer_name       AS employee,
        ft.ft_ppv_payment_recv_status AS actionStatus,
        ft.ft_ppv_remarks         AS doerRemarks,
        ''                        AS cancelReason
      FROM ktahv_bookings_fms_v3_ft_final_transfer ft
      LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON nb.reservation_id = ft.reservation_id
      WHERE (ft.ft_ppv_actual IS NULL OR ft.ft_ppv_actual = '')
        AND ft.ft_ppv_planned IS NOT NULL AND ft.ft_ppv_planned != ''
        AND ft.ft_ppv_doer_name IS NOT NULL AND ft.ft_ppv_doer_name != ''
    `).catch(() => [[]] as [mysql.RowDataPacket[]]);

    // ── 5. Final Transfer — FO stage ─────────────────────────────────────
    const [ftFoRows] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        ft.reservation_id         AS bookingId,
        nb.client_name            AS guestName,
        ft.ft_fpbr_planned        AS plannedDate,
        ft.ft_fpbr_actual         AS actualDate,
        ft.ft_fpbr_doer_name      AS employee,
        ft.ft_fpbr_release_status AS actionStatus,
        ft.ft_fpbr_remarks        AS doerRemarks,
        ''                        AS cancelReason
      FROM ktahv_bookings_fms_v3_ft_final_transfer ft
      LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON nb.reservation_id = ft.reservation_id
      WHERE (ft.ft_fpbr_actual IS NULL OR ft.ft_fpbr_actual = '')
        AND ft.ft_fpbr_planned IS NOT NULL AND ft.ft_fpbr_planned != ''
        AND ft.ft_fpbr_doer_name IS NOT NULL AND ft.ft_fpbr_doer_name != ''
    `).catch(() => [[]] as [mysql.RowDataPacket[]]);

    // ── 6. Delete Complete — FO stage ────────────────────────────────────
    const [dcFoRows] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        dc.reservation_id              AS bookingId,
        nb.client_name                 AS guestName,
        dc.dcpv_planned                AS plannedDate,
        dc.dcpv_actual                 AS actualDate,
        dc.dcpv_doer_name              AS employee,
        dc.dcpv_payment_upload_status  AS actionStatus,
        dc.dcpv_remarks                AS doerRemarks,
        ''                             AS cancelReason
      FROM ktahv_bookings_fms_v3_dc_delete_complete dc
      LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON nb.reservation_id = dc.reservation_id
      WHERE (dc.dcpv_actual IS NULL OR dc.dcpv_actual = '')
        AND dc.dcpv_planned IS NOT NULL AND dc.dcpv_planned != ''
        AND dc.dcpv_doer_name IS NOT NULL AND dc.dcpv_doer_name != ''
    `).catch(() => [[]] as [mysql.RowDataPacket[]]);

    // ── 7. Delete Complete — Accounts stage ──────────────────────────────
    const [dcAccountsRows] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        dc.reservation_id                    AS bookingId,
        nb.client_name                       AS guestName,
        dc.dc_afpv_planned                   AS plannedDate,
        dc.dc_afpv_actual                    AS actualDate,
        dc.dc_afpv_doer_name                 AS employee,
        dc.dc_afpv_payment_received_status   AS actionStatus,
        dc.dc_afpv_remarks                   AS doerRemarks,
        ''                                   AS cancelReason
      FROM ktahv_bookings_fms_v3_dc_delete_complete dc
      LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON nb.reservation_id = dc.reservation_id
      WHERE (dc.dc_afpv_actual IS NULL OR dc.dc_afpv_actual = '')
        AND dc.dc_afpv_planned IS NOT NULL AND dc.dc_afpv_planned != ''
        AND dc.dc_afpv_doer_name IS NOT NULL AND dc.dc_afpv_doer_name != ''
    `).catch(() => [[]] as [mysql.RowDataPacket[]]);

    connection.release();
    pool.end();

    type SheetKey = "newBookings" | "accountVerify" | "finalTransfer" | "deleteComplete";
    const sheetMeta: Record<SheetKey, { name: string }> = {
      newBookings:    { name: "New Bookings" },
      accountVerify:  { name: "Account Verify" },
      finalTransfer:  { name: "Final Transfer" },
      deleteComplete: { name: "Delete Complete" },
    };

    const empMap: Record<string, Record<SheetKey, PendingAgingBooking[]>> = {};

    function addRow(row: mysql.RowDataPacket, sheetKey: SheetKey) {
      const agingDays = getAgingDays(row.plannedDate);
      if (agingDays < 0) return;
      const emp = normalizeUserName(String(row.employee || "Unknown").trim());
      if (!empMap[emp]) {
        empMap[emp] = { newBookings: [], accountVerify: [], finalTransfer: [], deleteComplete: [] };
      }
      empMap[emp][sheetKey].push({
        bookingId:    String(row.bookingId || "-"),
        guestName:    String(row.guestName || "-"),
        sheetName:    sheetMeta[sheetKey].name,
        stageName:    sheetMeta[sheetKey].name,
        employee:     emp,
        plannedDate:  formatPlanned(row.plannedDate),
        agingDays,
        actionStatus: String(row.actionStatus || ""),
        doerRemarks:  String(row.doerRemarks || ""),
        cancelReason: String(row.cancelReason || ""),
      });
    }

    for (const row of nbRows as mysql.RowDataPacket[])         addRow(row, "newBookings");
    for (const row of avAccountsRows as mysql.RowDataPacket[]) addRow(row, "accountVerify");
    for (const row of avFoRows as mysql.RowDataPacket[])       addRow(row, "accountVerify");
    for (const row of ftAccountsRows as mysql.RowDataPacket[]) addRow(row, "finalTransfer");
    for (const row of ftFoRows as mysql.RowDataPacket[])       addRow(row, "finalTransfer");
    for (const row of dcFoRows as mysql.RowDataPacket[])       addRow(row, "deleteComplete");
    for (const row of dcAccountsRows as mysql.RowDataPacket[]) addRow(row, "deleteComplete");

    const result: EmployeeAgingSummary[] = Object.entries(empMap).map(([employee, sheets]) => {
      const sheetSummaries: SheetSummary[] = (Object.entries(sheets) as [SheetKey, PendingAgingBooking[]][]).map(
        ([sheetKey, bookings]) => {
          const seen = new Set<string>();
          const deduped = bookings.filter((b) => {
            if (seen.has(b.bookingId)) return false;
            seen.add(b.bookingId);
            return true;
          });
          return {
            sheetKey,
            sheetName: sheetMeta[sheetKey].name,
            total:    deduped.length,
            normal:   deduped.filter((b) => agingTag(b.agingDays) === "normal").length,
            risky:    deduped.filter((b) => agingTag(b.agingDays) === "risky").length,
            critical: deduped.filter((b) => agingTag(b.agingDays) === "critical").length,
            bookings: deduped.sort((a, b) => b.agingDays - a.agingDays),
          };
        }
      ).filter((s) => s.total > 0);

      const totalPending  = sheetSummaries.reduce((s, x) => s + x.total,    0);
      const totalCritical = sheetSummaries.reduce((s, x) => s + x.critical, 0);
      const totalRisky    = sheetSummaries.reduce((s, x) => s + x.risky,    0);
      return { employee, sheets: sheetSummaries, totalPending, totalCritical, totalRisky };
    }).filter((e) => e.totalPending > 0)
      .sort((a, b) => b.totalCritical - a.totalCritical || b.totalRisky - a.totalRisky);

    const grandTotal    = result.reduce((s, e) => s + e.totalPending,  0);
    const grandCritical = result.reduce((s, e) => s + e.totalCritical, 0);
    const grandRisky    = result.reduce((s, e) => s + e.totalRisky,    0);
    const grandNormal   = grandTotal - grandCritical - grandRisky;

    // Sheet-wise totals for KPI breakdown
    const bySheet: Record<string, number> = { newBookings: 0, accountVerify: 0, finalTransfer: 0, deleteComplete: 0 };
    for (const emp of result) {
      for (const s of emp.sheets) {
        bySheet[s.sheetKey] = (bySheet[s.sheetKey] ?? 0) + s.total;
      }
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      summary: { total: grandTotal, critical: grandCritical, risky: grandRisky, normal: grandNormal, bySheet },
      data: result,
    });
  } catch (err: any) {
    connection?.release?.();
    console.error("[pending-aging] DB error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
