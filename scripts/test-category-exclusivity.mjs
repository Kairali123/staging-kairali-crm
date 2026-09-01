/**
 * Regression Test Suite: Verify 1-and-only-1 Tab Mutual Exclusivity
 * Validates that every possible category value maps to EXACTLY ONE tab.
 */

function classifyCategory(val) {
  if (val === null || val === undefined) {
    return "manual_review";
  }
  const str = String(val).trim().toLowerCase();
  if (str === "") {
    return "manual_review";
  }

  const isEscalate = str.includes("escalate") || str.includes("abhilash");
  const isOther = str.includes("other") && !isEscalate;
  const isReopen = str.includes("reopen") && !isOther && !isEscalate;
  const isCold = str.includes("cold") && !isReopen && !isOther && !isEscalate;
  const isManualReview = !isEscalate && !isOther && !isReopen && !isCold;

  const matches = [
    { name: "manual_review", match: isManualReview },
    { name: "ai_reopen", match: isReopen },
    { name: "ai_cold", match: isCold },
    { name: "ai_reopen_to_other", match: isOther },
    { name: "ai_escalate_abhilash", match: isEscalate },
  ].filter(m => m.match);

  if (matches.length !== 1) {
    throw new Error(`Exclusivity violation for value "${val}": matched ${matches.length} tabs: ${matches.map(m => m.name).join(", ")}`);
  }

  return matches[0].name;
}

const testCases = [
  // Manual Review cases
  { input: null, expected: "manual_review" },
  { input: "", expected: "manual_review" },
  { input: "   ", expected: "manual_review" },
  { input: "Manual Review", expected: "manual_review" },
  { input: "Review Needed", expected: "manual_review" },
  { input: "Pending Review", expected: "manual_review" },
  { input: "Needs Verification", expected: "manual_review" },
  { input: "Unknown status", expected: "manual_review" },
  { input: "N/A", expected: "manual_review" },

  // Reopen cases
  { input: "Reopen", expected: "ai_reopen" },
  { input: "AI Reopened", expected: "ai_reopen" },
  { input: "reopen", expected: "ai_reopen" },
  { input: "Client Reopen", expected: "ai_reopen" },

  // Cold cases
  { input: "Cold", expected: "ai_cold" },
  { input: "AI Cold Confirmed", expected: "ai_cold" },
  { input: "cold lead", expected: "ai_cold" },

  // Other / Reassign cases (including potential edge cases)
  { input: "Reopen to Other", expected: "ai_reopen_to_other" },
  { input: "Reopen to Others", expected: "ai_reopen_to_other" },
  { input: "Other Team", expected: "ai_reopen_to_other" },
  { input: "Other", expected: "ai_reopen_to_other" },
  { input: "Transferred to Other", expected: "ai_reopen_to_other" },

  // Escalate / Abhilash cases
  { input: "Reopen and Escalate To Abhilash Sir", expected: "ai_escalate_abhilash" },
  { input: "Escalate to Abhilash", expected: "ai_escalate_abhilash" },
  { input: "Escalated", expected: "ai_escalate_abhilash" },
  { input: "Abhilash Sir Review", expected: "ai_escalate_abhilash" },
];

let passed = 0;
for (const tc of testCases) {
  const result = classifyCategory(tc.input);
  if (result === tc.expected) {
    passed++;
    console.log(`PASS: "${tc.input}" -> ${result}`);
  } else {
    console.error(`FAIL: "${tc.input}" expected ${tc.expected}, got ${result}`);
    process.exit(1);
  }
}

console.log(`\nALL ${passed} MUTUAL EXCLUSIVITY TESTS PASSED (1-AND-ONLY-1 TAB GUARANTEED).`);
