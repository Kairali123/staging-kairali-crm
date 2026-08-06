import { NextRequest, NextResponse } from 'next/server'
import {
  GEMINI_CONFIG,
  SYSTEM_PROMPT,
  getPromptForStage,
  getSummaryPrompt,
  getNextBestActionPrompt,
} from '@/lib/config'

export const dynamic = 'force-dynamic'

type CachedDraftPayload = {
  success: true
  message: string
  mode: string
  source: 'gemini' | 'fallback' | 'cache'
}

type CachedDraftEntry = {
  expiresAt: number
  payload: CachedDraftPayload
}

const DRAFT_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const GEMINI_REQUEST_TIMEOUT_MS = 20000
const GENERIC_UPSTREAM_ERROR = 'Failed to generate follow-up message'
const globalForDraftCache = globalThis as typeof globalThis & {
  __dealAssistantDraftCache?: Map<string, CachedDraftEntry>
}

const draftCache =
  globalForDraftCache.__dealAssistantDraftCache ?? new Map<string, CachedDraftEntry>()
globalForDraftCache.__dealAssistantDraftCache = draftCache

function normalizeKeyPart(value: any): string {
  return String(value ?? '').trim().toLowerCase()
}

function buildDraftCacheKey(params: {
  mode: string
  name: string
  stage: string
  package_interested?: string
  quote_amount?: number | null
  notes?: string
  daysStalled?: number
  assigned_sales_rep?: string
  representative_name?: string
}) {
  return [
    normalizeKeyPart(params.mode),
    normalizeKeyPart(params.name),
    normalizeKeyPart(params.stage),
    normalizeKeyPart(params.package_interested),
    normalizeKeyPart(params.quote_amount),
    normalizeKeyPart(params.notes),
    normalizeKeyPart(params.daysStalled),
    normalizeKeyPart(params.assigned_sales_rep),
    normalizeKeyPart(params.representative_name),
  ].join('|')
}

function buildLocalFallback(mode: string, input: {
  name: string
  stage: string
  package_interested?: string
  quote_amount?: number | null
  notes?: string
  daysStalled: number
  assigned_sales_rep?: string
  representative_name?: string
}) {
  const repName = input.representative_name || (input.assigned_sales_rep && input.assigned_sales_rep !== 'unassigned'
    ? input.assigned_sales_rep
    : 'Kairali Team')
  const packageName = input.package_interested || 'our package'
  const quoteText = typeof input.quote_amount === 'number' && input.quote_amount > 0
    ? ` (approx. ₹${Math.round(input.quote_amount).toLocaleString('en-IN')})`
    : ''
  const stageLabel = String(input.stage || 'new').replace(/_/g, ' ')
  const noteText = input.notes ? input.notes.slice(0, 120) : ''

  if (mode === 'summary') {
    return [
      `- Current status: ${input.name} is in ${stageLabel} stage${quoteText} and has been inactive for ${input.daysStalled} days.`,
      `- Main risk / blocker: Momentum is slowing${noteText ? `, with notes mentioning: ${noteText}` : ''}.`,
      `- Recommended next step: Send a concise follow-up and ask for the next decision point.`,
    ].join('\n')
  }

  if (mode === 'next_action') {
    const action =
      input.stage === 'proposal_sent'
        ? 'Schedule a call to review the proposal'
        : input.stage === 'negotiating'
          ? 'Follow up on objections and clarify concerns'
          : input.stage === 'payment_pending'
            ? 'Confirm payment and remove any blockers'
            : 'Call the customer and re-engage the conversation'
    return `1. ${action}\n2. It best matches a ${stageLabel} deal that has been idle for ${input.daysStalled} days and keeps the conversation moving.`
  }

  const followupName = input.name ? `Hi ${input.name},` : 'Hi there,'
  return `${followupName} ${repName} here from Kairali. I wanted to follow up on the ${packageName}${quoteText} and check if you’d like any clarification or support to move ahead. Please let me know how I can help.`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured in .env.local. Please add your Google AI Studio API key and restart the server.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const {
      mode = 'followup',
      regenerate = false,
      name = '',
      stage,
      package_interested,
      quote_amount,
      notes,
      daysStalled,
      assigned_sales_rep,
      representative_name,
    } = body

    if (!stage) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: stage' },
        { status: 400 }
      )
    }

    const normalizedMode = String(mode || 'followup').toLowerCase()
    const normalizedQuoteAmount = typeof quote_amount === 'number' ? quote_amount : Number(quote_amount) || null
    const parsedDaysStalled = parseInt(daysStalled) || 0
    const cacheKey = buildDraftCacheKey({
      mode: normalizedMode,
      name,
      stage,
      package_interested,
      quote_amount: normalizedQuoteAmount,
      notes,
      daysStalled: parsedDaysStalled,
      assigned_sales_rep,
      representative_name,
    })

    if (!regenerate) {
      const cached = draftCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({
          ...cached.payload,
          source: 'cache',
        })
      }
    }

    let fullTextPrompt = ''
    if (normalizedMode === 'summary') {
      fullTextPrompt = getSummaryPrompt({
        name,
        packageInterested: package_interested,
        notes,
        quoteAmount: normalizedQuoteAmount,
        daysStalled: parsedDaysStalled,
        stage,
        representativeName: representative_name || assigned_sales_rep,
      })
    } else if (normalizedMode === 'next_action') {
      fullTextPrompt = getNextBestActionPrompt({
        name,
        packageInterested: package_interested,
        notes,
        quoteAmount: normalizedQuoteAmount,
        daysStalled: parsedDaysStalled,
        stage,
        representativeName: representative_name || assigned_sales_rep,
      })
    } else {
      const userPrompt = getPromptForStage(stage, {
        name,
        packageInterested: package_interested,
        notes,
        quoteAmount: normalizedQuoteAmount,
        daysStalled: parsedDaysStalled,
        representativeName: representative_name || assigned_sales_rep
      })
      fullTextPrompt = `${SYSTEM_PROMPT}\n\nUser Context:\n${userPrompt}`
    }

    // Single deadline covering the fetch and the response body read
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS)

    let upstreamStatus = 0
    let upstreamOk = false
    let rawMessage = ''

    try {
      // Fetch call to Google Gemini API
      const response = await fetch(`${GEMINI_CONFIG.apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullTextPrompt
                }
              ]
            }
          ],
          generationConfig: normalizedMode === 'followup'
            ? {
                maxOutputTokens: 1024,
                temperature: 0.7,
                thinkingConfig: { thinkingBudget: 0 },
              }
            : {
                maxOutputTokens: 512,
                temperature: 0.4,
                thinkingConfig: { thinkingBudget: 0 },
              }
        })
      })

      upstreamStatus = response.status
      upstreamOk = response.ok

      if (upstreamOk) {
        const data = await response.json()
        rawMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } else {
        // Drain the error body inside the deadline; its contents are never logged or returned.
        await response.text().catch(() => undefined)
      }
    } finally {
      clearTimeout(timeoutId)
    }

    if (!upstreamOk) {
      console.error('[Gemini API Error] upstream responded with status', upstreamStatus)
      if (upstreamStatus === 429 || upstreamStatus === 503 || upstreamStatus === 504) {
        const fallbackMessage = buildLocalFallback(normalizedMode, {
          name,
          stage,
          package_interested,
          quote_amount: normalizedQuoteAmount,
          notes,
          daysStalled: parsedDaysStalled,
          assigned_sales_rep,
          representative_name,
        })
        const fallbackPayload: CachedDraftPayload = {
          success: true,
          message: fallbackMessage,
          mode: normalizedMode,
          source: 'fallback',
        }
        draftCache.set(cacheKey, {
          expiresAt: Date.now() + DRAFT_CACHE_TTL_MS,
          payload: fallbackPayload,
        })
        return NextResponse.json(fallbackPayload)
      }
      return NextResponse.json(
        { success: false, error: GENERIC_UPSTREAM_ERROR },
        { status: 500 }
      )
    }

    // Clean up response if it wraps with quotes or whitespace
    const message = rawMessage.trim().replace(/^["']|["']$/g, '')

    const payload: CachedDraftPayload = {
      success: true,
      message,
      mode: normalizedMode,
      source: 'gemini',
    }
    draftCache.set(cacheKey, {
      expiresAt: Date.now() + DRAFT_CACHE_TTL_MS,
      payload,
    })
    return NextResponse.json(payload)

  } catch (err) {
    // Log only a coarse failure kind: error objects/messages may embed the key, URL or prompt.
    const failureKind = err instanceof Error && err.name === 'AbortError' ? 'upstream_timeout' : 'unexpected_error'
    console.error('[API Generate Follow-up Error]', failureKind)
    return NextResponse.json(
      { success: false, error: GENERIC_UPSTREAM_ERROR },
      { status: 500 }
    )
  }
}
