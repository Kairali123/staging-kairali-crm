'use client'

import { useState } from 'react'
import { LookupSource, TicketResponse } from './types'
import { useAuth } from '@/hooks/use-auth'

interface TicketFormProps {
    refId?: string
    source: LookupSource | 'unknown'
    onSubmitted: (ticket: TicketResponse) => void
}

const CATEGORIES = ['Incorrect data', 'Missing record', 'Access issue', 'Other']

export default function TicketForm({ refId = '', source, onSubmitted }: TicketFormProps) {
    const { user } = useAuth()
    const [referenceId, setReferenceId] = useState(refId)
    const [category, setCategory] = useState(CATEGORIES[0])
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    async function handleSubmit() {
        if (!description.trim()) {
            setErrorMsg("Add a short description so support knows what's wrong.")
            return
        }
        setErrorMsg(null)
        setSubmitting(true)
        try {
            const res = await fetch('/api/support-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referenceId,
                    category,
                    description,
                    source,
                    userId: user?.id || user?.employeeId || null,
                    userName: user?.name || null
                }),
            })
            if (!res.ok) throw new Error('Ticket submission failed')
            const data: TicketResponse = await res.json()
            onSubmitted(data)
        } catch (err) {
            setErrorMsg("Couldn't submit the ticket. Try again.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-1.5 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-red-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
                Raise a help ticket
            </div>

            <div className="flex flex-col gap-2.5 px-3.5 py-3">
                <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">Submitted By</label>
                    <input
                        type="text"
                        value={user ? `${user.name} (${user.employeeId || user.id})` : 'Anonymous'}
                        disabled
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12.5px] text-gray-500 focus:outline-none cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">Reference ID</label>
                    <input
                        type="text"
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        placeholder="Booking / lead / order ID"
                        className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#8EA12E] focus:outline-none"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#8EA12E] focus:outline-none"
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">Describe the issue</label>
                    <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us what's wrong or missing"
                        className="w-full resize-none rounded-md border border-gray-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#8EA12E] focus:outline-none"
                    />
                </div>

                {errorMsg && <p className="text-[11.5px] text-red-600">{errorMsg}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mt-0.5 rounded-lg bg-[#152238] px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#1B2E4A] disabled:opacity-60"
                >
                    {submitting ? 'Submitting…' : 'Submit ticket'}
                </button>
            </div>
        </div>
    )
}