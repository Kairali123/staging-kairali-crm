import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getSessionUser, hasAdminRole, hasServerActionPermission } from "@/lib/authz"
import { getPool } from "@/lib/db"
import { normalizeUserName } from "@/lib/utils"

function normalizeName(value: unknown): string {
  return normalizeUserName(typeof value === "string" ? value : "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function getActorName(user: any): string {
  return String(user?.name || user?.email || "Unknown").trim() || "Unknown"
}

export function ktahvNamesMatch(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeName(left)
  const normalizedRight = normalizeName(right)
  return normalizedLeft !== "" && normalizedLeft === normalizedRight
}

export async function getKtahvBookingOwnerNames(bookingId: string): Promise<string[]> {
  const normalizedBookingId = String(bookingId || "").trim()
  if (!normalizedBookingId) return []

  const pool = await getPool()
  const [rows]: any[] = await pool.execute(
    `
      SELECT nbs.nb_bvs_doer
      FROM ktahv_bookings_fms_v3_part1 nb
      LEFT JOIN ktahv_bookings_fms_v3_nb_booking_verification_stage nbs
        ON nb.reservation_id = nbs.reservation_id
      WHERE nb.reservation_id = ?
      LIMIT 1
    `,
    [normalizedBookingId],
  )

  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) return []

  return [row.nb_bvs_doer]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
}

export async function canUseKtahvBookingAction(
  user: unknown,
  bookingId: string,
  selfAction: string,
  allAction?: string,
): Promise<{ allowed: boolean; missingBooking: boolean }> {
  if (hasAdminRole(user, "lower")) {
    return { allowed: true, missingBooking: false }
  }

  if (allAction && hasServerActionPermission(user, "ktahvPage", allAction)) {
    return { allowed: true, missingBooking: false }
  }

  if (!hasServerActionPermission(user, "ktahvPage", selfAction)) {
    return { allowed: false, missingBooking: false }
  }

  const ownerNames = await getKtahvBookingOwnerNames(bookingId)
  if (ownerNames.length === 0) {
    return { allowed: false, missingBooking: true }
  }

  return {
    allowed: ownerNames.some((ownerName) => ktahvNamesMatch(ownerName, (user as any)?.name)),
    missingBooking: false,
  }
}

export async function authorizeKtahvBookingAction(
  req: NextRequest,
  bookingId: unknown,
  selfAction: string,
  allAction: string,
): Promise<
  | { ok: true; user: any; actorName: string }
  | { ok: false; response: NextResponse }
> {
  const user = getSessionUser(req)
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    }
  }

  const access = await canUseKtahvBookingAction(user, String(bookingId || "").trim(), selfAction, allAction)
  if (access.missingBooking) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 }),
    }
  }
  if (!access.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    }
  }

  return { ok: true, user, actorName: getActorName(user) }
}
