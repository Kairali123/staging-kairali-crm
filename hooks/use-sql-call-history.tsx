'use client'
import { useState, useEffect } from 'react'
import type { FollowUp } from '@/hooks/Use-call-history'

interface SqlRow {
    enquiryStatus: string
    fullDisposition: string
    agentId: string
    agentName: string
    agentRemarks: string
    callNotes: string
    comment: string
    actualDate: string
    plannedDate: string
    followUpDoneIn: string
    callDuration: string
    recordingUrl: string | null
    potentialValue: number
    hangUpReason: string
    leadConversion: string
    totalFollowups: number
}

function transformRow(row: SqlRow, index: number): FollowUp {
    let timeStr = '—'
    try {
        if (row.actualDate) {
            const d = new Date(row.actualDate)
            if (!isNaN(d.getTime())) {
                timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            }
        }
    } catch { /* keep '—' */ }

    return {
        id: `fu-${index}`,
        plannedDate:     row.plannedDate || '',
        actualDate:      row.actualDate || '',
        time:            timeStr,
        callStatus:      row.enquiryStatus || row.fullDisposition || 'Cold',
        enquiryStatus:   row.enquiryStatus || row.fullDisposition || 'Cold',
        callDuration:    row.callDuration || undefined,
        agent:           row.agentName || `Agent ${row.agentId || 'N/A'}`,
        agentId:         row.agentId || 'N/A',
        campaignName:    '',
        callType:        row.followUpDoneIn || 'AppSheet',
        agentRemarks:    row.callNotes || row.agentRemarks || row.comment || 'No remarks available',
        recordingUrl:    row.recordingUrl || undefined,
        nextFollowUpDate: undefined,
        nextAction:      row.agentName || undefined,
        followUpDoneIn:  row.followUpDoneIn || 'AppSheet',
        potentialValue:  row.potentialValue || 0,
    }
}

export function useSqlCallHistory(clientId: string | number | null | undefined) {
    const [followUps, setFollowUps] = useState<FollowUp[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!clientId) { setFollowUps([]); setError(null); return }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000)

        setIsLoading(true)
        setError(null)

        fetch(`/api/leads/${clientId}/history`, { signal: controller.signal })
            .then(async r => {
                const json = await r.json()
                if (!json.success) throw new Error(json.message || json.error || 'Failed to load call history')
                const rows: SqlRow[] = Array.isArray(json.followups) ? json.followups : []
                setFollowUps(rows.map(transformRow))
            })
            .catch(err => {
                if (err?.name === 'AbortError') {
                    setError('Request timed out. Please try again.')
                } else {
                    setError(err instanceof Error ? err.message : 'Failed to load call history')
                }
                setFollowUps([])
            })
            .finally(() => {
                clearTimeout(timeoutId)
                setIsLoading(false)
            })

        return () => {
            clearTimeout(timeoutId)
            controller.abort()
        }
    }, [String(clientId)])

    return { followUps, isLoading, error }
}
