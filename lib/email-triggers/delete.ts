import type { State } from './store'

export class TriggerDeleteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

const AUDIT_REPORT_ID = 'sales-call-audit'

/** Removes one trigger from state. Run history is kept so past sends stay auditable. */
export function removeTrigger(s: State, id: string, revision?: number) {
  const trigger = s.triggers.find(t => t.id === id)
  if (!trigger) throw new TriggerDeleteError('Trigger not found. It may already be deleted; reload the list.', 404)
  if (revision !== undefined && revision !== trigger.revision) throw new TriggerDeleteError('Configuration changed. Reload before deleting.', 409)
  if (s.runs.some(r => r.triggerId === id && (r.status === 'Preparing' || r.status === 'Sending'))) {
    throw new TriggerDeleteError('A send is in progress for this trigger. Try again in a minute.', 409)
  }
  s.triggers = s.triggers.filter(t => t.id !== id)
  // The default audit trigger is re-created whenever none exists; remember the delete so it stays gone.
  if (trigger.reportId === AUDIT_REPORT_ID && !s.triggers.some(t => t.reportId === AUDIT_REPORT_ID)) {
    s.seedSuppressed = [...new Set([...(s.seedSuppressed || []), AUDIT_REPORT_ID])]
  }
  return trigger
}

export function auditSeedSuppressed(s: State) {
  return Boolean(s.seedSuppressed?.includes(AUDIT_REPORT_ID))
}
