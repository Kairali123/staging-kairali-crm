// src/lib/meeting-url-parser.ts
// Parses any meeting URL or code and returns platform + clean ID

export type Platform = 'meet' | 'zoom' | 'teams' | 'other'

export interface ParsedMeeting {
  platform:    Platform
  meetCode:    string   // Google Meet code e.g. "abc-defg-hij"
  zoomId:      string   // Zoom numeric ID e.g. "78974709034"
  displayId:   string   // What to show in the input
  confidence:  'high' | 'low'
  error?:      string
}

export function parseMeetingInput(input: string): ParsedMeeting {
  const raw = input.trim()

  if (!raw) {
    return { platform: 'meet', meetCode: '', zoomId: '', displayId: '', confidence: 'low' }
  }

  // ── Google Meet URL ───────────────────────────────────────────────────────
  // https://meet.google.com/abc-defg-hij
  const meetUrlMatch = raw.match(
    /meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i
  )
  if (meetUrlMatch) {
    const code = meetUrlMatch[1].toLowerCase()
    return {
      platform:   'meet',
      meetCode:   code,
      zoomId:     '',
      displayId:  code,
      confidence: 'high',
    }
  }

  // ── Zoom URL (all variants) ───────────────────────────────────────────────
  // https://zoom.us/j/78974709034
  // https://us04web.zoom.us/j/78974709034
  // https://zoom.us/j/78974709034?pwd=xxx
  // https://kairali.zoom.us/j/78974709034
  const zoomUrlMatch = raw.match(
    /zoom\.us\/j\/(\d{9,11})/i
  )
  if (zoomUrlMatch) {
    const id = zoomUrlMatch[1]
    return {
      platform:   'zoom',
      meetCode:   '',
      zoomId:     id,
      displayId:  id,
      confidence: 'high',
    }
  }

  // ── Zoom invite text (contains "Meeting ID: 123 456 7890") ────────────────
  const zoomInviteMatch = raw.match(/meeting\s+id[:\s]+(\d[\d\s]{8,12}\d)/i)
  if (zoomInviteMatch) {
    const id = zoomInviteMatch[1].replace(/\s/g, '')
    return {
      platform:   'zoom',
      meetCode:   '',
      zoomId:     id,
      displayId:  id,
      confidence: 'high',
    }
  }

  // ── Microsoft Teams URL ───────────────────────────────────────────────────
  const teamsMatch = raw.match(/teams\.microsoft\.com|teams\.live\.com/i)
  if (teamsMatch) {
    return {
      platform:   'teams',
      meetCode:   '',
      zoomId:     '',
      displayId:  'Teams meeting detected',
      confidence: 'high',
    }
  }

  // ── Raw Google Meet code (xxx-xxxx-xxx) ───────────────────────────────────
  const meetCodeMatch = raw.match(/^([a-z]{3}-[a-z]{4}-[a-z]{3})$/i)
  if (meetCodeMatch) {
    const code = meetCodeMatch[1].toLowerCase()
    return {
      platform:   'meet',
      meetCode:   code,
      zoomId:     '',
      displayId:  code,
      confidence: 'high',
    }
  }

  // ── Raw Zoom numeric ID (9-11 digits, with or without spaces) ────────────
  const zoomIdMatch = raw.replace(/\s/g, '').match(/^(\d{9,11})$/)
  if (zoomIdMatch) {
    const id = zoomIdMatch[1]
    return {
      platform:   'zoom',
      meetCode:   '',
      zoomId:     id,
      displayId:  id,
      confidence: 'high',
    }
  }

  // ── Unknown ───────────────────────────────────────────────────────────────
  return {
    platform:   'other',
    meetCode:   '',
    zoomId:     '',
    displayId:  raw,
    confidence: 'low',
    error:      'Could not detect meeting platform. Please select manually.',
  }
}