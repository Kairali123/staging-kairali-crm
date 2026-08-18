// src/lib/chunked-upload.ts
// PRODUCTION: chunks proxied through /api/meetings/upload-chunk → Google Drive
//
// Why proxy (not direct browser→Drive):
//   Google Drive resumable upload URLs do NOT support browser CORS.
//   The Content-Range header triggers a preflight that Drive rejects.
//   So all chunks must go through our same-origin Next.js proxy.
//
// Why 3MB chunks:
//   Vercel serverless functions cap request body at 4.5MB.
//   3MB = exactly 12 × 256KB — satisfies Drive's "chunks must be a
//   multiple of 256KB" rule (except the final chunk) AND stays well
//   under 4.5MB even with HTTP + multipart overhead.
//
// Resilience:
//   - 3× retry per chunk with exponential backoff (1s, 2s, 4s)
//   - Resume from exact byte offset after any failure (checkpoint)
//   - Progress callback for UI

// 3MB — multiple of 256KB (Drive requirement), under Vercel's 4.5MB limit
const CHUNK_SIZE = 3 * 1024 * 1024   // 3,145,728 bytes = 12 × 262,144

export interface UploadProgress {
  uploadedBytes: number
  totalBytes:    number
  percent:       number
  chunkIndex:    number
}

export interface UploadResult {
  fileId:    string
  streamUrl: string
  uploadUrl: string
}

export async function uploadAudioChunked(
  blob:               Blob,
  fileName:           string,
  onProgress?:        (p: UploadProgress) => void,
  existingUploadUrl?: string | null,
): Promise<UploadResult> {

  // ── Step 1: Create or reuse upload session ────────────────────────────────
  let uploadUrl = existingUploadUrl || null

  if (!uploadUrl) {
    const sessionRes = await fetch('/api/meetings/create-upload-session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        fileName,
        mimeType: blob.type || 'audio/webm',
        fileSize: blob.size,
      }),
    })
    const sessionData = await sessionRes.json()
    if (!sessionRes.ok || !sessionData.uploadUrl) {
      throw new Error(sessionData.error || 'Could not create upload session')
    }
    uploadUrl = sessionData.uploadUrl
  }
  if (!uploadUrl) {
    throw new Error('Could not create upload session')
  }
  const activeUploadUrl: string = uploadUrl

  // ── Step 2: Resume offset if reusing session ──────────────────────────────
  let startByte = 0
  if (existingUploadUrl) {
    try {
      const res  = await fetch('/api/meetings/upload-chunk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uploadUrl: activeUploadUrl, totalSize: blob.size }),
      })
      const data = await res.json()
      if (data.complete && data.fileId) {
        return {
          fileId:    data.fileId,
          streamUrl: `/api/meetings/audio?id=${data.fileId}`,
          uploadUrl: activeUploadUrl,
        }
      }
      startByte = data.resumeFrom || 0
      if (startByte > 0) {
        console.log(`[Upload] Resuming from ${(startByte / 1024 / 1024).toFixed(1)}MB`)
      }
    } catch { startByte = 0 }
  }

  // ── Step 3: Upload chunks through the proxy ───────────────────────────────
  let start  = startByte
  let fileId = ''

  while (start < blob.size) {
    const end          = Math.min(start + CHUNK_SIZE, blob.size)
    const chunk        = blob.slice(start, end)
    const contentRange = `bytes ${start}-${end - 1}/${blob.size}`

    let lastError: Error | null = null

    for (let retry = 0; retry < 3; retry++) {
      try {
        const proxyUrl = `/api/meetings/upload-chunk?uploadUrl=${encodeURIComponent(activeUploadUrl)}`

        const res = await fetch(proxyUrl, {
          method:  'PUT',
          headers: {
            'Content-Type':     blob.type || 'audio/webm',
            'x-content-range':  contentRange,
            'x-content-length': String(chunk.size),
          },
          body: chunk,
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          // 413 = chunk too big for proxy → unrecoverable, fail fast
          if (res.status === 413) {
            throw new Error('Chunk too large for server. Please contact support.')
          }
          lastError = new Error(data.error || `Chunk failed: ${res.status}`)
          if (retry < 2) await new Promise(r => setTimeout(r, (retry + 1) * 1000))
          continue
        }

        if (data.status === 308) { lastError = null; break }      // more chunks
        if (data.status === 200 || data.status === 201) {          // complete
          fileId    = data.fileId || ''
          lastError = null
          break
        }
        lastError = null
        break

      } catch (err: any) {
        // Network failure ("Failed to fetch") → retry with backoff
        lastError = err
        if (retry < 2) await new Promise(r => setTimeout(r, (retry + 1) * 1000))
      }
    }

    if (lastError) throw lastError

    if (onProgress) {
      onProgress({
        uploadedBytes: end,
        totalBytes:    blob.size,
        percent:       Math.round((end / blob.size) * 100),
        chunkIndex:    Math.floor(start / CHUNK_SIZE),
      })
    }

    start = end
  }

  // ── Step 4: Confirm fileId ────────────────────────────────────────────────
  if (!fileId) {
    try {
      const res  = await fetch('/api/meetings/upload-chunk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uploadUrl: activeUploadUrl, totalSize: blob.size }),
      })
      const data = await res.json()
      fileId = data.fileId || ''
    } catch {}
  }

  if (!fileId) {
    throw new Error('Upload completed but could not retrieve file ID from Google Drive')
  }

  return {
    fileId,
    streamUrl: `/api/meetings/audio?id=${fileId}`,
    uploadUrl: activeUploadUrl,
  }
}
