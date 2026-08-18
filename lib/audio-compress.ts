// src/lib/audio-compress.ts
// Compresses recorded audio in the browser BEFORE upload using ffmpeg.wasm.
// WebM/Opus → MP3 32kbps mono. A 1-hour meeting drops from ~30MB to ~14MB,
// which uploads 2× faster AND stays under OpenAI's 25MB transcription limit.
//
// ffmpeg.wasm loads lazily (only when first compression runs) so it doesn't
// bloat initial page load. Falls back to the original blob if ffmpeg fails —
// compression is an optimization, never a hard dependency.
//
// Install:
//   npm install @ffmpeg/ffmpeg@0.12.10 @ffmpeg/util@0.12.1

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let loadPromise: Promise<void> | null = null

const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

// ── Lazy-load ffmpeg.wasm once ────────────────────────────────────────────────
async function ensureLoaded(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg && (ffmpeg as any).loaded) return ffmpeg

  if (!loadPromise) {
    ffmpeg = new FFmpeg()
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message))

    loadPromise = ffmpeg.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`,  'text/javascript'),
      wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    }).then(() => undefined)
  }
  await loadPromise
  return ffmpeg!
}

export interface CompressProgress {
  ratio:   number   // 0–1 progress
  percent: number   // 0–100
}

export interface CompressResult {
  blob:           Blob
  originalSize:   number
  compressedSize: number
  compressed:     boolean   // false if fallback to original
}

// ── Compress audio blob → MP3 32kbps mono ─────────────────────────────────────
export async function compressAudio(
  input:       Blob,
  onProgress?: (p: CompressProgress) => void,
): Promise<CompressResult> {
  const originalSize = input.size

  // Skip compression for already-small files (< 5MB) — not worth the wasm load
  if (originalSize < 5 * 1024 * 1024) {
    return { blob: input, originalSize, compressedSize: originalSize, compressed: false }
  }

  try {
    const ff = await ensureLoaded()

    if (onProgress) {
      ff.on('progress', ({ progress }) => {
        const ratio = Math.max(0, Math.min(1, progress))
        onProgress({ ratio, percent: Math.round(ratio * 100) })
      })
    }

    const inputName  = 'input.webm'
    const outputName = 'output.mp3'

    await ff.writeFile(inputName, await fetchFile(input))

    // -ac 1   → mono
    // -b:a 32k → 32kbps (plenty for speech transcription)
    // -ar 16000 → 16kHz sample rate (Whisper/gpt-4o-transcribe standard)
    await ff.exec([
      '-i', inputName,
      '-ac', '1',
      '-ar', '16000',
      '-b:a', '32k',
      '-f', 'mp3',
      outputName,
    ])

    const data = await ff.readFile(outputName)
    const bytes = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : (() => {
          const buffer = new ArrayBuffer(data.byteLength)
          const view = new Uint8Array(buffer)
          view.set(data)
          return view
        })()
    const blob = new Blob([bytes], { type: 'audio/mp3' })

    // Cleanup wasm FS
    try { await ff.deleteFile(inputName)  } catch {}
    try { await ff.deleteFile(outputName) } catch {}

    // If compression somehow made it bigger, keep original
    if (blob.size >= originalSize) {
      return { blob: input, originalSize, compressedSize: originalSize, compressed: false }
    }

    return { blob, originalSize, compressedSize: blob.size, compressed: true }

  } catch (err) {
    console.warn('[audio-compress] ffmpeg failed, using original blob:', err)
    // Fallback — never block the pipeline on compression failure
    return { blob: input, originalSize, compressedSize: originalSize, compressed: false }
  }
}
