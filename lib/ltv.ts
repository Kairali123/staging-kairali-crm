/**
 * Guest Lifetime Value (LTV) Calculation and Utilities
 * 
 * Rules:
 * - Cancelled bookings are strictly excluded from count (totalStays) and amount (totalLtv).
 * - Active/valid bookings contribute to count and amount.
 * - Double subtraction prevention: LTV is derived deterministically from the current booking dataset.
 */

export interface GuestLtvSummary {
  totalLtv: number;
  totalStays: number;
  guestName: string;
  tier: "VIP" | "Premium" | "Standard";
}

export interface GuestLtvMetricsResult {
  guestMap: Map<string, GuestLtvSummary>;
  avgCustomerLtv: number;
  repeatRate: number;
  repeatGuestCount: number;
  uniqueGuestCount: number;
  getGuestSummary: (b: any) => GuestLtvSummary | null;
}

/**
 * Checks if a booking is cancelled based on all supported status properties.
 */
export function isBookingCancelled(b: any): boolean {
  if (!b) return false;
  const status = (b.status ?? "").toString().toLowerCase().trim();
  const bookingStatus = (
    b.bookingStatus ??
    b.bookingDetails?.bookingStatus ??
    b.rawItem?.bookingStatus ??
    ""
  ).toString().toLowerCase().trim();
  const cancelByUserCheck = (b.cancelByUserCheck ?? "").toString().toLowerCase().trim();
  const editActionStatus = (b.editActionStatus ?? "").toString().toLowerCase().trim();

  return (
    status === "cancelled" ||
    status.includes("cancel") ||
    bookingStatus === "cancelled" ||
    bookingStatus.includes("cancel") ||
    cancelByUserCheck === "cancelled" ||
    cancelByUserCheck.includes("cancel") ||
    editActionStatus === "cancelled"
  );
}

/**
 * Generates a consistent guest lookup key using mobile, email, guestId, or guestName.
 */
export function getGuestKey(b: any): string {
  if (!b) return "";
  const mobileKey = (b.mobile || b.phone || b.phoneNumber || b.mobileNo || "").toString().replace(/[^0-9]/g, "");
  const emailKey = (b.email || "").toString().trim().toLowerCase();
  return mobileKey
    ? `m_${mobileKey}`
    : (emailKey
      ? `e_${emailKey}`
      : (b.guestId
        ? `id_${b.guestId}`
        : `n_${(b.guestName || "").toString().trim().toLowerCase()}`));
}

/**
 * Computes guest LTV metrics across an array of bookings.
 * Cancelled bookings are excluded from count and amount.
 */
export function calculateGuestLtvMetrics(bookings: any[]): GuestLtvMetricsResult {
  const guestMap = new Map<string, GuestLtvSummary>();

  (bookings || []).forEach((b: any) => {
    // 1. Exclude cancelled bookings from LTV calculation
    if (isBookingCancelled(b)) return;

    const guestKey = getGuestKey(b);
    if (!guestKey || guestKey === "n_") return;

    const currentAmount = Number(b.amount || b.originalAmount || b.totalAmount || 0) || 0;
    const existing = guestMap.get(guestKey);
    if (existing) {
      existing.totalLtv += currentAmount;
      existing.totalStays += 1;
      if (b.guestName && !existing.guestName) existing.guestName = b.guestName;
    } else {
      guestMap.set(guestKey, {
        totalLtv: currentAmount,
        totalStays: 1,
        guestName: b.guestName || "",
        tier: "Standard",
      });
    }
  });

  // Assign tiers based on total valid stays and LTV
  guestMap.forEach((val) => {
    if (val.totalLtv >= 300000 || val.totalStays >= 3) {
      val.tier = "VIP";
    } else if (val.totalLtv >= 150000 || val.totalStays >= 2) {
      val.tier = "Premium";
    } else {
      val.tier = "Standard";
    }
  });

  const uniqueGuestCount = guestMap.size;
  let totalLtvSum = 0;
  let repeatGuestCount = 0;
  guestMap.forEach((val) => {
    totalLtvSum += val.totalLtv;
    if (val.totalStays > 1) repeatGuestCount++;
  });

  const avgCustomerLtv = uniqueGuestCount > 0 ? Math.round(totalLtvSum / uniqueGuestCount) : 0;
  const repeatRate = uniqueGuestCount > 0 ? Math.round((repeatGuestCount / uniqueGuestCount) * 100) : 0;

  const getGuestSummary = (b: any): GuestLtvSummary | null => {
    if (!b) return null;
    const guestKey = getGuestKey(b);

    const existing = guestMap.get(guestKey);
    if (existing) {
      return existing;
    }

    // Fallback for bookings not present in the aggregated active map
    const isCancelled = isBookingCancelled(b);
    return {
      totalLtv: isCancelled ? 0 : (Number(b.amount || b.originalAmount || b.totalAmount || 0) || 0),
      totalStays: isCancelled ? 0 : 1,
      guestName: b.guestName || "",
      tier: "Standard" as const,
    };
  };

  return {
    guestMap,
    avgCustomerLtv,
    repeatRate,
    repeatGuestCount,
    uniqueGuestCount,
    getGuestSummary,
  };
}
