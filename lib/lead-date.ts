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

// Extract date/time parts in Asia/Kolkata (IST, UTC+05:30) timezone
export function getISTParts(d: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hh = map.hour === '24' ? '00' : (map.hour || '00');
  return {
    day: map.day || '00',
    month: map.month || '00',
    year: map.year || '0000',
    hour: hh,
    minute: map.minute || '00',
    second: map.second || '00',
  };
}

// Format any date/time value to "DD/MM/YYYY HH:MM:SS" in Asia/Kolkata timezone
export function formatDateIST(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '') return fallback;
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return fallback;
      const { day, month, year, hour, minute, second } = getISTParts(val);
      return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
    }

    const str = String(val).trim();
    if (!str) return fallback;

    // If string contains timezone offset or 'Z', parse as Date and format in IST
    if (/Z$|[+\-]\d{2}:?\d{2}$/i.test(str)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return formatDateIST(d, fallback);
    }

    // "YYYY-MM-DD HH:MM:SS" (or with T)
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
    }

    // "YYYY-MM-DD"
    const mDateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (mDateOnly) {
      return `${mDateOnly[3]}/${mDateOnly[2]}/${mDateOnly[1]} 00:00:00`;
    }

    // Already "DD/MM/YYYY HH:MM:SS"
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
      return str;
    }

    return str;
  } catch {
    return fallback;
  }
}

// Format any date/time value to ISO-like "YYYY-MM-DDTHH:MM:SS" in Asia/Kolkata timezone
export function formatIsoIST(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '') return fallback;
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return fallback;
      const { day, month, year, hour, minute, second } = getISTParts(val);
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }

    const str = String(val).trim();
    if (!str) return fallback;

    // If string contains timezone offset or 'Z', parse as Date and format in IST
    if (/Z$|[+\-]\d{2}:?\d{2}$/i.test(str)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return formatIsoIST(d, fallback);
    }

    // "YYYY-MM-DD HH:MM:SS"
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    }

    // "DD/MM/YYYY HH:MM:SS"
    const m2 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (m2) {
      return `${m2[3]}-${m2[2]}-${m2[1]}T${m2[4]}:${m2[5]}:${m2[6]}`;
    }

    return str;
  } catch {
    return fallback;
  }
}


