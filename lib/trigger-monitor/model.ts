import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const googleId = z.string().regex(/^[a-zA-Z0-9_-]{10,200}$/)
export const reasons = {
  none: ['No failure reported', 'No action required.'],
  authorization: ['Authorization required', 'Sign in as the trigger creator, review the requested permissions and reauthorize. Verify the next scheduled execution.'],
  access: ['Sheet access denied', 'Verify the linked sheet and restore the required access for the trigger creator.'],
  timeout: ['Execution timed out', 'Inspect execution logs, batch sheet operations and split long work into resumable chunks.'],
  quota: ['Google service quota exceeded', 'Review quota usage and duplicate schedules. Reduce requests and use bounded backoff.'],
  exception: ['Script exception', 'Open execution logs for the exact error and line. Review the failing function, then verify a successful execution.'],
  unknown: ['Execution outcome unknown', 'Check the execution log and monitoring connector. Missing telemetry is not proof of success.'],
} as const
export type Reason = keyof typeof reasons
export type Account = { email: string; addedAt: string; connectedAt?: string; refreshToken?: string; lastScan?: string; scanError?: string; scanCursor?: string }
export type Project = { key: string; email: string; scriptId: string; name: string; discoveredAt: string; connectorHash?: string; lastInventory?: string; inventoryAt?: string; sheetId?: string; sheetName?: string; sheetOwner?: string }
export type MonitoredTrigger = { key: string; projectKey: string; triggerId: string; handler: string; type: string; sheetId?: string; sheetName?: string; sheetOwner?: string; createdAt?: string; firstSeen: string; lastSeen: string; removedAt?: string; assignee?: string; acknowledgedAt?: string }
export type Execution = { key: string; triggerKey: string; runId: string; startedAt: string; finishedAt?: string; durationMs?: number; status: 'Running' | 'Success' | 'Failed'; reason: Reason }
export type MonitorState = { version: 1; accounts: Account[]; projects: Project[]; triggers: MonitoredTrigger[]; executions: Execution[]; truncatedBefore?: string; heartbeat?: string }
export const initialEmails = ['sysadmin@kairali.com', 'sunaj.kairali@gmail.com', 'dme2@kairalipharma.com']
export function emptyState(): MonitorState { return { version: 1, accounts: initialEmails.map(email => ({ email, addedAt: new Date().toISOString() })), projects: [], triggers: [], executions: [] } }
const date = z.string().datetime()
const triggerId = z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/)
export const ingestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('inventory'), email: emailSchema, scriptId: googleId, at: date, sheetId: googleId.optional(), sheetName: z.string().max(200).optional(), sheetOwner: emailSchema.optional(), triggers: z.array(z.object({ triggerId, handler: z.string().regex(/^[\w$]{1,150}$/), type: z.string().max(80), sheetId: googleId.optional(), sheetName: z.string().max(200).optional(), sheetOwner: emailSchema.optional(), createdAt: date.optional() })).max(100) }),
  z.object({ kind: z.literal('execution'), email: emailSchema, scriptId: googleId, triggerId, runId: z.string().uuid(), startedAt: date, finishedAt: date.optional(), durationMs: z.number().int().min(0).max(86400000).optional(), status: z.enum(['Running', 'Success', 'Failed']), reason: z.enum(['none', 'authorization', 'access', 'timeout', 'quota', 'exception', 'unknown']) }),
])
export type Intake = z.infer<typeof ingestSchema>
export const projectKey = (email: string, scriptId: string) => `${email}:${scriptId}`
export function applyIntake(s: MonitorState, p: Project, event: Intake, now = Date.now()) {
  const iso = new Date(now).toISOString()
  if (event.email !== p.email || event.scriptId !== p.scriptId) throw Error('Connector identity mismatch')
  const eventTime = Date.parse(event.kind === 'inventory' ? event.at : event.startedAt)
  if (eventTime > now + 300000 || eventTime < now - 30 * 86400000) throw Error('Event timestamp outside retention window')
  if (event.kind === 'inventory') {
    if (p.inventoryAt && event.at <= p.inventoryAt) return
    if (new Set(event.triggers.map(t => t.triggerId)).size !== event.triggers.length) throw Error('Duplicate trigger IDs')
    p.lastInventory = iso; p.inventoryAt = event.at
    if (event.sheetId) p.sheetId = event.sheetId
    if (event.sheetName) p.sheetName = event.sheetName
    if (event.sheetOwner) p.sheetOwner = event.sheetOwner
    for (const t of event.triggers) {
      const key = `${p.key}:${t.triggerId}`
      const previous = s.triggers.find(x => x.key === key)
      if (previous) Object.assign(previous, t, { lastSeen: iso, removedAt: undefined })
      else s.triggers.push({ ...t, key, projectKey: p.key, firstSeen: iso, lastSeen: iso })
    }
    for (const t of s.triggers.filter(t => t.projectKey === p.key)) {
      if (!event.triggers.some(x => x.triggerId === t.triggerId)) t.removedAt ||= iso
    }
  } else {
    const triggerKey = `${p.key}:${event.triggerId}`
    if (!s.triggers.some(t => t.key === triggerKey)) throw Error('Sync trigger inventory before reporting executions')
    if (event.status !== 'Running' && (!event.finishedAt || Date.parse(event.finishedAt) < eventTime || Date.parse(event.finishedAt) > now + 300000)) throw Error('Invalid execution completion time')
    const key = `${triggerKey}:${event.runId}`
    const previous = s.executions.find(r => r.key === key)
    if (previous && (previous.status !== 'Running' || previous.startedAt !== event.startedAt)) return
    const record: Execution = { key, triggerKey, runId: event.runId, startedAt: event.startedAt, finishedAt: event.finishedAt, durationMs: event.durationMs, status: event.status, reason: event.status === 'Success' ? 'none' : event.status === 'Running' ? 'unknown' : event.reason === 'none' ? 'exception' : event.reason }
    if (previous) Object.assign(previous, record); else s.executions.push(record)
    const trigger = s.triggers.find(t => t.key === triggerKey)!
    if (event.status === 'Failed' && trigger.acknowledgedAt && event.startedAt > trigger.acknowledgedAt) delete trigger.acknowledgedAt
  }
}
export function dashboard(s: MonitorState, now = Date.now()) {
  const windowStart = now - 86400000
  const triggers = s.triggers.map(t => {
    const project = s.projects.find(p => p.key === t.projectKey)!
    const runs = s.executions.filter(r => r.triggerKey === t.key).sort((a,b) => b.startedAt.localeCompare(a.startedAt))
    const latest = runs[0]
    const window = runs.filter(r => Date.parse(r.startedAt) >= windowStart && Date.parse(r.startedAt) <= now)
    const success = window.filter(r => r.status === 'Success').length, failed = window.filter(r => r.status === 'Failed').length
    const stale = !project.lastInventory || now - Date.parse(project.lastInventory) > 2 * 3600000
    const status = t.removedAt ? 'Removed' : latest?.status === 'Failed' ? 'Failed' : stale || !latest || latest.status === 'Running' && now - Date.parse(latest.startedAt) > 10 * 60000 ? 'Unknown' : latest.status === 'Running' ? 'Running' : 'Healthy'
    const reason = status === 'Unknown' ? 'unknown' : latest?.reason || 'unknown'
    let consecutiveFailures = 0
    for (const r of runs) { if (r.status !== 'Failed') break; consecutiveFailures++ }
    return { ...t, email: project.email, scriptId: project.scriptId, projectName: project.name, sheetName: t.sheetName || project.sheetName, sheetOwner: t.sheetOwner || project.sheetOwner, sheetUrl: (t.sheetId || project.sheetId) ? `https://docs.google.com/spreadsheets/d/${t.sheetId || project.sheetId}/edit` : null, scriptUrl: `https://script.google.com/home/projects/${project.scriptId}/edit`, logsUrl: `https://script.google.com/home/projects/${project.scriptId}/executions`, status, stale, success, failed, successRate: success + failed ? success / (success + failed) * 100 : null, latest, reason: reasons[reason][0], solution: reasons[reason][1], consecutiveFailures, history: runs.slice(0,20) }
  }).sort((a,b) => (({ Failed:0, Unknown:1, Running:2, Healthy:3, Removed:4 }[a.status] ?? 9) - ({ Failed:0, Unknown:1, Running:2, Healthy:3, Removed:4 }[b.status] ?? 9)))
  return { accounts: s.accounts.map(({ refreshToken, ...a }) => ({ ...a, connected: Boolean(refreshToken) })), projects: s.projects.map(({ connectorHash, ...p }) => ({ ...p, connectorConfigured: Boolean(connectorHash) })), triggers, heartbeat: s.heartbeat, truncatedBefore: s.truncatedBefore, windowStart: new Date(windowStart).toISOString(), generatedAt: new Date(now).toISOString() }
}
export type Dashboard = ReturnType<typeof dashboard>
