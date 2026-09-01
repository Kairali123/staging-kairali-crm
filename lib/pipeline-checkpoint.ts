// src/lib/pipeline-checkpoint.ts
// DB-backed pipeline checkpoint manager
// Uses /api/pipeline CRUD — no sessionStorage, no size limit
// Only the checkpoint ID is kept in sessionStorage (tiny — just a number)

const ID_KEY = 'kairali_pipeline_id'

export type PipelineStep =
  | 'uploading' | 'transcribing' | 'diarizing'
  | 'processing' | 'saving' | 'extracting' | 'done'

export interface PipelineCheckpoint {
  id?:                  number
  title?:               string
  mode?:                string
  platform?:            string
  meetCode?:            string
  zoomId?:              string
  recordedAt?:          string
  durationSec?:         number
  sizeKb?:              number
  lastStep?:            string | null
  errorStep?:           string | null
  errorMessage?:        string | null
  audioUrl?:            string | null
  transcript?:          string | null
  segments?:            any[]  | null
  formattedTranscript?: string | null
  procData?:            any    | null
  participants?:        any[]  | null
  meetingId?:           number | null
  createdAt?:           string
  uploadSessionUrl?: string | null
}

// ── Create a new checkpoint row in DB ─────────────────────────────────────────
export async function createCheckpoint(data: Omit<PipelineCheckpoint, 'id'>): Promise<number | null> {
  try {
    const res  = await fetch('/api/pipeline', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    const json = await res.json()
    if (json.id) {
      // Store only the ID in sessionStorage
      sessionStorage.setItem(ID_KEY, String(json.id))
      return json.id
    }
  } catch (e) {
    console.warn('[Checkpoint] Create failed:', e)
  }
  return null
}

// ── Update checkpoint after each step ─────────────────────────────────────────
export async function updateCheckpoint(id: number, data: Partial<PipelineCheckpoint>): Promise<void> {
  try {
    await fetch('/api/pipeline', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, ...data }),
    })
  } catch (e) {
    console.warn('[Checkpoint] Update failed:', e)
  }
}

// ── Load checkpoint from DB using stored ID ───────────────────────────────────
export async function loadCheckpoint(): Promise<PipelineCheckpoint | null> {
  try {
    const id = sessionStorage.getItem(ID_KEY)
    if (!id) return null

    const res  = await fetch(`/api/pipeline?id=${id}`)
    const json = await res.json()

    if (!json.checkpoint) {
      sessionStorage.removeItem(ID_KEY)
      return null
    }

    // Expired or done — don't resume
    const cp = json.checkpoint
    if (cp.lastStep === 'done') {
      await clearCheckpoint(cp.id)
      return null
    }

    return cp
  } catch {
    return null
  }
}

// ── Check if resumable checkpoint exists ──────────────────────────────────────
// Only resumable if audio was already uploaded (no need to re-record)
export async function hasResumableCheckpoint(): Promise<boolean> {
  try {
    const id = sessionStorage.getItem(ID_KEY)
    if (!id) return false

    const res  = await fetch(`/api/pipeline?id=${id}`)
    const json = await res.json()
    const cp   = json.checkpoint

    if (!cp || !cp.audioUrl) return false
    if (cp.lastStep === 'done') return false

    // Only resume if created within last 24h
    const age = Date.now() - new Date(cp.createdAt || 0).getTime()
    return age < 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

// ── Clear checkpoint on success ───────────────────────────────────────────────
export async function clearCheckpoint(id?: number): Promise<void> {
  try {
    const storedId = id || sessionStorage.getItem(ID_KEY)
    if (storedId) {
      await fetch(`/api/pipeline?id=${storedId}`, { method: 'DELETE' })
    }
  } catch {}
  sessionStorage.removeItem(ID_KEY)
}

// ── Get stored checkpoint ID (without fetching) ───────────────────────────────
export function getStoredCheckpointId(): number | null {
  const id = sessionStorage.getItem(ID_KEY)
  return id ? parseInt(id) : null
}

export const STEP_LABELS: Record<string, string> = {
  uploading:   'Upload audio',
  transcribing:'Transcribe',
  diarizing:   'Speaker detection',
  processing:  'Generate notes',
  saving:      'Save to CRM',
  extracting:  'Extract tasks',
  done:        'Complete',
}