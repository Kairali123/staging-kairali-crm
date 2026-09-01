// Verified-source (vSrc) normalization shared by the Leads module.
// Moved verbatim from app/leads/assign/page.tsx — behavior must stay identical.

export type NormalizedVSrc = { key: string; label: string }

export const titleCaseWords = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")

// All values that should merge into the "Others" bucket (blank vSrc, DB nulls, placeholder strings)
export const OTHERS_LIKE = new Set(["others", "other", "null", "undefined", "n/a", "na", "none", "-", "—"])

export const normalizeVSrcKey = (raw: unknown): string => {
  if (typeof raw !== "string") return "OTHERS"
  const cleaned = raw.trim().replace(/\s+/g, " ")
  if (!cleaned || OTHERS_LIKE.has(cleaned.toLowerCase())) return "OTHERS"
  return cleaned.toUpperCase()
}

export const normalizeVSrc = (raw: unknown): NormalizedVSrc => {
  const str = (typeof raw === "string") ? raw : String(raw || "")
  const cleaned = str.trim().replace(/\s+/g, " ")
  if (!cleaned || OTHERS_LIKE.has(cleaned.toLowerCase())) {
    return { key: "OTHERS", label: "Others" }
  }
  const key = cleaned.toUpperCase()
  // If the raw string is all uppercase and longer than 3 chars, Title Case it for the label.
  // This fixes "FACEBOOK" -> "Facebook" while keeping "IVR" or mixed case "AI-Web".
  let label = (cleaned === key && cleaned.length > 3) ? titleCaseWords(cleaned) : cleaned

  // ✅ Specific formatting for AI and Whatsapp
  label = label
    .replace(/\bAi\b/g, "AI")
    .replace(/\bWhatsapp\b/gi, "Whatsapp") // Follow user request: "Whatsapp" (capital W, lower a)
    .replace(/\bWhatsapp\b/g, "Whatsapp")

  return { key, label }
}
