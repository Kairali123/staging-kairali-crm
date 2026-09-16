// CRM date parsing shared by the Leads module.

// Combine date part from createdAt + time part from updatedAt if createdAt is missing time or 00:00:00
export function getLeadFullDateTime(lead?: { createdAt?: string; updatedAt?: string } | null): string {
  if (!lead) return ''
  const created = (lead.createdAt || '').trim()
  const updated = (lead.updatedAt || '').trim()

  if (!created) return updated
  if (!updated) return created

  const createdDatePart = created.split(' ')[0]
  const createdTimePart = created.includes(' ') ? created.split(' ')[1] : ''

  if (createdTimePart && createdTimePart !== '00:00:00') {
    return created
  }

  const updatedTimePart = updated.includes(' ') ? updated.split(' ')[1] : ''
  if (updatedTimePart && updatedTimePart !== '00:00:00') {
    return `${createdDatePart} ${updatedTimePart}`
  }

  return created
}

// Parse any CRM date string ("DD/MM/YYYY HH:MM:SS", "YYYY-MM-DD HH:MM:SS", "DD-MM-YYYY", etc.) to epoch ms
export function parseCRMDate(str?: string | null): number {
  if (!str) return 0
  const s = String(str).trim()
  if (!s) return 0

  // Split date and time
  const [datePart, timePart = '00:00:00'] = s.split(/[T ]+/)
  if (!datePart) return 0

  // Standardize delimiters (- to /)
  const normDate = datePart.replace(/-/g, '/')
  const parts = normDate.split('/')

  let yyyy = 0, mm = 0, dd = 0

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      yyyy = parseInt(parts[0], 10)
      mm = parseInt(parts[1], 10)
      dd = parseInt(parts[2], 10)
    } else {
      // DD/MM/YYYY
      dd = parseInt(parts[0], 10)
      mm = parseInt(parts[1], 10)
      yyyy = parseInt(parts[2], 10)
    }
  } else {
    const d = new Date(s)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  }

  if (isNaN(yyyy) || isNaN(mm) || isNaN(dd) || yyyy <= 0 || mm <= 0 || dd <= 0) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  }

  const timeParts = timePart.split(':')
  const hh = parseInt(timeParts[0] || '0', 10)
  const min = parseInt(timeParts[1] || '0', 10)
  const ss = parseInt(timeParts[2] || '0', 10)

  const d = new Date(yyyy, mm - 1, dd, hh, min, ss)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

// Format a Date as "YYYY-MM-DD" in Asia/Kolkata, for date-range query params
export const formatIST = (date: Date): string => {
  const ist = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

