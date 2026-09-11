/** mysql2 parses SQL DATETIME using +05:30. Restore that wall time on every host. */
export function serializeLeadDateIST(value: unknown, fallback = ''): string {
  if (value === null || value === undefined || value === '') return fallback
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return fallback
    const ist = new Date(value.getTime() + 330 * 60_000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(ist.getUTCDate())}/${pad(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}`
  }
  const text = String(value).trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}:${match[6]}`
  return text
}
