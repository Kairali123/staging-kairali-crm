// CRM date parsing shared by the Leads module.
// Moved verbatim from app/leads/assign/page.tsx — behavior must stay identical.

// Parse "DD/MM/YYYY HH:MM:SS" — JS new Date() misreads DD as MM for this format
export function parseCRMDate(str: string): number {
  if (!str) return 0
  const [datePart, timePart = '00:00:00'] = str.split(' ')
  const parts = datePart.split('/')
  if (parts.length !== 3) return new Date(str).getTime()
  const [dd, mm, yyyy] = parts
  return new Date(`${yyyy}-${mm}-${dd}T${timePart}`).getTime()
}

// Format a Date as "YYYY-MM-DD" in Asia/Kolkata, for date-range query params
export const formatIST = (date: Date): string => {
  const ist = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
