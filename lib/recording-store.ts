// src/lib/recording-store.ts
// Persists in-progress recordings to IndexedDB so a tab close / crash / reload
// never loses audio. Chunks are appended live during recording. On reload, an
// orphaned recording can be detected and its processing resumed.
//
// Separate DB from leads cache (lib/idb.ts) — audio blobs are large and need
// their own store/version lifecycle.

const DB_NAME    = 'CRM_Meetings_DB'
const STORE_REC  = 'active_recording'   // single in-progress recording
const DB_VERSION = 1

// Fixed key — only one active recording at a time (single-user app)
const ACTIVE_KEY = 'current'

export interface StoredRecording {
  chunks:      Blob[]          // raw MediaRecorder chunks
  mimeType:    string
  startedAt:   string          // ISO — when recording began
  title:       string
  mode:        string          // 'online' | 'offline'
  platform:    string | null
  meetCode:    string | null
  zoomId:      string | null
  durationSec: number          // elapsed at last save
  updatedAt:   number          // Date.now() of last write
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('IndexedDB unavailable on server'))
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_REC)) db.createObjectStore(STORE_REC)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ── Save / update the active recording ────────────────────────────────────────
export async function saveActiveRecording(rec: StoredRecording): Promise<void> {
  try {
    const db = await openDB()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx    = db.transaction(STORE_REC, 'readwrite')
        const store = tx.objectStore(STORE_REC)
        const req   = store.put(rec, ACTIVE_KEY)
        req.onsuccess = () => resolve()
        req.onerror   = () => reject(req.error)
      })
    } finally { db.close() }
  } catch (e) {
    console.warn('[recording-store] save failed:', e)
  }
}

// ── Append a single chunk to the active recording (live during recording) ──────
// Read-modify-write keeps it simple and reliable for a single-user app.
let appendQueue: Promise<void> = Promise.resolve()
export function appendChunk(chunk: Blob, meta: Partial<StoredRecording>): Promise<void> {
  // Serialize appends so concurrent ondataavailable events don't race
  appendQueue = appendQueue.then(async () => {
    const existing = await getActiveRecording()
    const rec: StoredRecording = existing || {
      chunks:      [],
      mimeType:    meta.mimeType   || 'audio/webm',
      startedAt:   meta.startedAt  || new Date().toISOString(),
      title:       meta.title      || '',
      mode:        meta.mode       || 'online',
      platform:    meta.platform   ?? null,
      meetCode:    meta.meetCode   ?? null,
      zoomId:      meta.zoomId     ?? null,
      durationSec: 0,
      updatedAt:   Date.now(),
    }
    rec.chunks.push(chunk)
    rec.durationSec = meta.durationSec ?? rec.durationSec
    rec.updatedAt   = Date.now()
    // carry through any updated metadata
    if (meta.title    !== undefined) rec.title    = meta.title!
    if (meta.platform !== undefined) rec.platform = meta.platform!
    if (meta.meetCode !== undefined) rec.meetCode = meta.meetCode!
    if (meta.zoomId   !== undefined) rec.zoomId   = meta.zoomId!
    await saveActiveRecording(rec)
  }).catch(e => console.warn('[recording-store] append failed:', e))
  return appendQueue
}

// ── Read the active recording ──────────────────────────────────────────────────
export async function getActiveRecording(): Promise<StoredRecording | null> {
  try {
    const db = await openDB()
    try {
      return await new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE_REC, 'readonly')
        const store = tx.objectStore(STORE_REC)
        const req   = store.get(ACTIVE_KEY)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror   = () => reject(req.error)
      })
    } finally { db.close() }
  } catch (e) {
    console.warn('[recording-store] get failed:', e)
    return null
  }
}

// ── Clear the active recording (on success or explicit discard) ────────────────
export async function clearActiveRecording(): Promise<void> {
  try {
    const db = await openDB()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx    = db.transaction(STORE_REC, 'readwrite')
        const store = tx.objectStore(STORE_REC)
        const req   = store.delete(ACTIVE_KEY)
        req.onsuccess = () => resolve()
        req.onerror   = () => reject(req.error)
      })
    } finally { db.close() }
  } catch (e) {
    console.warn('[recording-store] clear failed:', e)
  }
}

// ── Rebuild a playable/uploadable Blob from stored chunks ──────────────────────
export function blobFromStored(rec: StoredRecording): Blob {
  return new Blob(rec.chunks, { type: rec.mimeType || 'audio/webm' })
}

// ── Is there a recoverable recording? (has real audio, not just noise) ─────────
export async function hasRecoverableRecording(): Promise<StoredRecording | null> {
  const rec = await getActiveRecording()
  if (!rec || rec.chunks.length === 0) return null
  const blob = blobFromStored(rec)
  // Ignore sub-10KB fragments (silent / accidental)
  if (blob.size < 10 * 1024) { await clearActiveRecording(); return null }
  return rec
}
