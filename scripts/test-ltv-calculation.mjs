/**
 * Test Suite: Guest LTV (Lifetime Value) Calculation Logic
 * 
 * Validates:
 * 1. One active booking -> included in count and amount.
 * 2. One cancelled booking -> excluded from count and amount.
 * 3. Active + cancelled bookings -> only active booking contributes.
 * 4. Active booking later changed to Cancelled -> LTV count and amount update correctly.
 * 5. Multiple cancelled bookings -> all are excluded.
 * 6. No valid bookings -> LTV count = 0 and LTV amount = 0.
 * 7. Prevention of double subtraction / idempotence across recalculations.
 * 8. Handling various cancellation status formats ('cancelled', 'Cancelled', 'CANCELLED', 'cancelByUserCheck', 'editActionStatus').
 */

function isBookingCancelled(b) {
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

function getGuestKey(b) {
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

function calculateGuestLtvMetrics(bookings) {
  const guestMap = new Map();

  (bookings || []).forEach((b) => {
    // Exclude cancelled bookings from LTV calculation
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

  const getGuestSummary = (b) => {
    if (!b) return null;
    const guestKey = getGuestKey(b);

    const existing = guestMap.get(guestKey);
    if (existing) {
      return existing;
    }

    const isCancelled = isBookingCancelled(b);
    return {
      totalLtv: isCancelled ? 0 : (Number(b.amount || b.originalAmount || b.totalAmount || 0) || 0),
      totalStays: isCancelled ? 0 : 1,
      guestName: b.guestName || "",
      tier: "Standard",
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

// -----------------------------------------------------
// TEST RUNNER
// -----------------------------------------------------
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

function assertDeepEqual(actual, expected, message) {
  totalTests++;
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    console.error(`❌ FAIL: ${message}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

console.log("==================================================");
console.log("RUNNING GUEST LTV CALCULATION TEST SUITE");
console.log("==================================================\n");

// TEST CASE 1: One active booking -> included in count and amount
{
  const bookings = [
    {
      id: "b1",
      guestName: "John Doe",
      mobile: "9876543210",
      amount: 50000,
      status: "Confirm-Verified",
      bookingStatus: "CONFIRMED",
    },
  ];

  const metrics = calculateGuestLtvMetrics(bookings);
  const summary = metrics.getGuestSummary(bookings[0]);

  assert(metrics.uniqueGuestCount === 1, "Case 1: uniqueGuestCount is 1");
  assert(metrics.avgCustomerLtv === 50000, "Case 1: avgCustomerLtv is 50000");
  assert(metrics.repeatRate === 0, "Case 1: repeatRate is 0");
  assert(summary.totalStays === 1, "Case 1: totalStays is 1");
  assert(summary.totalLtv === 50000, "Case 1: totalLtv is 50000");
}

// TEST CASE 2: One cancelled booking -> excluded from count and amount
{
  const bookings = [
    {
      id: "b2",
      guestName: "Jane Smith",
      mobile: "9876543211",
      amount: 45000,
      status: "cancelled",
      bookingStatus: "Cancelled",
      cancelByUserCheck: "Cancelled",
    },
  ];

  const metrics = calculateGuestLtvMetrics(bookings);
  const summary = metrics.getGuestSummary(bookings[0]);

  assert(metrics.uniqueGuestCount === 0, "Case 2: uniqueGuestCount is 0 for cancelled booking");
  assert(metrics.avgCustomerLtv === 0, "Case 2: avgCustomerLtv is 0 for cancelled booking");
  assert(summary.totalStays === 0, "Case 2: totalStays is 0 for cancelled booking");
  assert(summary.totalLtv === 0, "Case 2: totalLtv is 0 for cancelled booking");
}

// TEST CASE 3: Active + cancelled bookings -> only active booking contributes
{
  const guestMobile = "9876543212";
  const bookings = [
    {
      id: "b3_1",
      guestName: "Alice Wonderland",
      mobile: guestMobile,
      amount: 60000,
      status: "Confirm-Verified",
      bookingStatus: "CONFIRMED",
    },
    {
      id: "b3_2",
      guestName: "Alice Wonderland",
      mobile: guestMobile,
      amount: 40000,
      status: "cancelled",
      bookingStatus: "Cancelled",
      cancelByUserCheck: "Cancelled",
    },
  ];

  const metrics = calculateGuestLtvMetrics(bookings);
  const activeSummary = metrics.getGuestSummary(bookings[0]);
  const cancelledSummary = metrics.getGuestSummary(bookings[1]);

  assert(metrics.uniqueGuestCount === 1, "Case 3: uniqueGuestCount is 1");
  assert(metrics.repeatGuestCount === 0, "Case 3: repeatGuestCount is 0 (cancelled booking doesn't count as repeat stay)");
  assert(activeSummary.totalStays === 1, "Case 3: active booking totalStays is 1 (excluding cancelled)");
  assert(activeSummary.totalLtv === 60000, "Case 3: active booking totalLtv is 60000 (excluding 40000 cancelled)");
  assert(cancelledSummary.totalStays === 1, "Case 3: guest summary for cancelled booking reflects guest's active count (1)");
  assert(cancelledSummary.totalLtv === 60000, "Case 3: guest summary for cancelled booking reflects guest's active LTV (60000)");
}

// TEST CASE 4: Active booking later changed to Cancelled -> LTV count and amount update correctly
{
  const guestMobile = "9876543213";
  let bookings = [
    {
      id: "b4_1",
      guestName: "Bob Builder",
      mobile: guestMobile,
      amount: 100000,
      status: "Confirm-Verified",
      bookingStatus: "CONFIRMED",
    },
    {
      id: "b4_2",
      guestName: "Bob Builder",
      mobile: guestMobile,
      amount: 80000,
      status: "Confirm-Verified",
      bookingStatus: "CONFIRMED",
    },
  ];

  // Before cancellation
  let metrics = calculateGuestLtvMetrics(bookings);
  let summary = metrics.getGuestSummary(bookings[0]);
  assert(summary.totalStays === 2, "Case 4 (before): totalStays is 2");
  assert(summary.totalLtv === 180000, "Case 4 (before): totalLtv is 180000");
  assert(summary.tier === "Premium", "Case 4 (before): tier is Premium");

  // Status changes to Cancelled
  bookings = bookings.map((b) =>
    b.id === "b4_2"
      ? { ...b, status: "cancelled", bookingStatus: "Cancelled", cancelByUserCheck: "Cancelled" }
      : b
  );

  // After cancellation
  metrics = calculateGuestLtvMetrics(bookings);
  summary = metrics.getGuestSummary(bookings[0]);
  assert(summary.totalStays === 1, "Case 4 (after): totalStays decreased by 1 to 1");
  assert(summary.totalLtv === 100000, "Case 4 (after): totalLtv subtracted 80000 to 100000");
  assert(summary.tier === "Standard", "Case 4 (after): tier downgraded to Standard");
}

// TEST CASE 5: Multiple cancelled bookings -> all are excluded
{
  const guestMobile = "9876543214";
  const bookings = [
    {
      id: "b5_1",
      guestName: "Charlie Brown",
      mobile: guestMobile,
      amount: 30000,
      status: "cancelled",
      bookingStatus: "Cancelled",
    },
    {
      id: "b5_2",
      guestName: "Charlie Brown",
      mobile: guestMobile,
      amount: 40000,
      status: "cancelled",
      bookingStatus: "Cancelled",
    },
    {
      id: "b5_3",
      guestName: "Charlie Brown",
      mobile: guestMobile,
      amount: 50000,
      status: "cancelled",
      bookingStatus: "Cancelled",
    },
  ];

  const metrics = calculateGuestLtvMetrics(bookings);
  const summary = metrics.getGuestSummary(bookings[0]);

  assert(metrics.uniqueGuestCount === 0, "Case 5: uniqueGuestCount is 0 when all bookings are cancelled");
  assert(metrics.avgCustomerLtv === 0, "Case 5: avgCustomerLtv is 0 when all bookings are cancelled");
  assert(summary.totalStays === 0, "Case 5: totalStays is 0 for guest with only cancelled bookings");
  assert(summary.totalLtv === 0, "Case 5: totalLtv is 0 for guest with only cancelled bookings");
}

// TEST CASE 6: No valid bookings -> LTV count = 0 and LTV amount = 0
{
  const metrics = calculateGuestLtvMetrics([]);
  const dummyBooking = { guestName: "Unknown", mobile: "1111111111", amount: 25000, status: "cancelled" };
  const summary = metrics.getGuestSummary(dummyBooking);

  assert(metrics.uniqueGuestCount === 0, "Case 6: uniqueGuestCount is 0 for empty bookings");
  assert(metrics.avgCustomerLtv === 0, "Case 6: avgCustomerLtv is 0 for empty bookings");
  assert(metrics.repeatRate === 0, "Case 6: repeatRate is 0 for empty bookings");
  assert(metrics.repeatGuestCount === 0, "Case 6: repeatGuestCount is 0 for empty bookings");
  assert(summary.totalStays === 0, "Case 6: summary totalStays is 0");
  assert(summary.totalLtv === 0, "Case 6: summary totalLtv is 0");
}

// TEST CASE 7: Idempotence & Double Subtraction Prevention across multiple recalculations
{
  const bookings = [
    { id: "b7_1", guestName: "David", mobile: "9876543215", amount: 50000, status: "Confirm-Verified" },
    { id: "b7_2", guestName: "David", mobile: "9876543215", amount: 75000, status: "cancelled" },
  ];

  const run1 = calculateGuestLtvMetrics(bookings);
  const run2 = calculateGuestLtvMetrics(bookings);
  const run3 = calculateGuestLtvMetrics(bookings);

  assert(run1.getGuestSummary(bookings[0]).totalLtv === 50000, "Case 7: Run 1 LTV is 50000");
  assert(run2.getGuestSummary(bookings[0]).totalLtv === 50000, "Case 7: Run 2 LTV is 50000 (no double subtraction on recalculate)");
  assert(run3.getGuestSummary(bookings[0]).totalLtv === 50000, "Case 7: Run 3 LTV is 50000 (idempotent derivation)");
}

// TEST CASE 8: Status variants detection
{
  const statusVariants = [
    { status: "cancelled" },
    { status: "Cancelled" },
    { status: "CANCELLED" },
    { bookingStatus: "Cancelled" },
    { bookingStatus: "CANCELLED" },
    { cancelByUserCheck: "Cancelled" },
    { editActionStatus: "cancelled" },
    { rawItem: { bookingStatus: "Cancelled" } },
    { bookingDetails: { bookingStatus: "Cancelled" } },
  ];

  for (let i = 0; i < statusVariants.length; i++) {
    const b = { ...statusVariants[i], guestName: `Guest ${i}`, mobile: `900000000${i}`, amount: 50000 };
    assert(isBookingCancelled(b) === true, `Case 8: Variant ${i + 1} correctly identified as cancelled`);
    const metrics = calculateGuestLtvMetrics([b]);
    assert(metrics.uniqueGuestCount === 0, `Case 8: Variant ${i + 1} excluded from LTV calculations`);
  }
}

// TEST CASE 9: Multi-guest calculations with mixed active and cancelled bookings
{
  const multiBookings = [
    // Guest 1: 2 active (50k + 150k = 200k), 1 cancelled (50k) -> LTV: 200k, Stays: 2 (Premium)
    { id: "g1_1", guestName: "Guest One", mobile: "9111111111", amount: 50000, status: "Confirm-Verified" },
    { id: "g1_2", guestName: "Guest One", mobile: "9111111111", amount: 150000, status: "Confirm-Verified" },
    { id: "g1_3", guestName: "Guest One", mobile: "9111111111", amount: 50000, status: "cancelled" },

    // Guest 2: 3 active (100k + 100k + 100k = 300k), 0 cancelled -> LTV: 300k, Stays: 3 (VIP)
    { id: "g2_1", guestName: "Guest Two", mobile: "9222222222", amount: 100000, status: "Confirm-Verified" },
    { id: "g2_2", guestName: "Guest Two", mobile: "9222222222", amount: 100000, status: "Confirm-Verified" },
    { id: "g2_3", guestName: "Guest Two", mobile: "9222222222", amount: 100000, status: "Confirm-Verified" },

    // Guest 3: 0 active, 2 cancelled (40k + 60k) -> Excluded
    { id: "g3_1", guestName: "Guest Three", mobile: "9333333333", amount: 40000, status: "cancelled" },
    { id: "g3_2", guestName: "Guest Three", mobile: "9333333333", amount: 60000, status: "cancelled" },
  ];

  const metrics = calculateGuestLtvMetrics(multiBookings);

  assert(metrics.uniqueGuestCount === 2, "Case 9: uniqueGuestCount is 2 (Guest Three excluded)");
  assert(metrics.repeatGuestCount === 2, "Case 9: repeatGuestCount is 2 (Guest One and Two have >1 active stays)");
  assert(metrics.repeatRate === 100, "Case 9: repeatRate is 100%");
  // Total active LTV = 200k + 300k = 500k; avg = 500k / 2 = 250k
  assert(metrics.avgCustomerLtv === 250000, "Case 9: avgCustomerLtv is 250000");

  const g1Summary = metrics.getGuestSummary(multiBookings[0]);
  assert(g1Summary.totalLtv === 200000, "Case 9: Guest 1 totalLtv is 200000");
  assert(g1Summary.totalStays === 2, "Case 9: Guest 1 totalStays is 2");
  assert(g1Summary.tier === "Premium", "Case 9: Guest 1 tier is Premium");

  const g2Summary = metrics.getGuestSummary(multiBookings[3]);
  assert(g2Summary.totalLtv === 300000, "Case 9: Guest 2 totalLtv is 300000");
  assert(g2Summary.totalStays === 3, "Case 9: Guest 2 totalStays is 3");
  assert(g2Summary.tier === "VIP", "Case 9: Guest 2 tier is VIP");

  const g3Summary = metrics.getGuestSummary(multiBookings[6]);
  assert(g3Summary.totalLtv === 0, "Case 9: Guest 3 totalLtv is 0");
  assert(g3Summary.totalStays === 0, "Case 9: Guest 3 totalStays is 0");
}

console.log(`\n==================================================`);
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`==================================================`);
