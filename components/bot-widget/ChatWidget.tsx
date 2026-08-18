'use client'

import { useEffect, useRef, useState } from 'react'
import ChatBubble from './ChatBubble'
import ResultCard from './ResultCard'
import TicketForm from './TicketForm'
import { ChatMessage, LookupResponse, TicketResponse, getFollowUpAnswer } from './types'
import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'

function uid() {
    return Math.random().toString(36).slice(2, 10)
}

export default function ChatWidget() {
    const { user, isLoading } = useAuth()
    const pathname = usePathname()

    if (isLoading || !user || pathname === '/') return null

    return <AuthenticatedChatWidget />
}

function AuthenticatedChatWidget() {
    const { user } = useAuth()
    const [open, setOpen] = useState(false)
    const [greeted, setGreeted] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [lastLookup, setLastLookup] = useState<LookupResponse | null>(null)
    const bodyRef = useRef<HTMLDivElement>(null)

    async function fetchMyTickets() {
        if (!user) return
        const typingId = uid()
        pushMessage({ id: typingId, role: 'bot', type: 'typing' })
        setLoading(true)
        try {
            const res = await fetch('/api/support-tickets/my-tickets')
            if (!res.ok) throw new Error()
            const data = await res.json()
            removeMessage(typingId)
            pushMessage({
                id: uid(),
                role: 'bot',
                type: 'my-tickets',
                ticketsList: data.tickets || []
            })
        } catch (err) {
            removeMessage(typingId)
            pushMessage({
                id: uid(),
                role: 'bot',
                type: 'text',
                text: "Sorry, I couldn't retrieve your tickets right now."
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (open && !greeted) {
            setGreeted(true)
            const greeting = user?.name ? `Welcome ${user.name} to Kairav!` : 'Welcome to Kairav!'
            pushMessage({
                id: uid(),
                role: 'bot',
                type: 'text',
                text: `${greeting} I am the AI assistant bot of Kairali Group CRM.\n\nI can help you retrieve booking details, payment status, lead information, order progress, customer records, reports, and CRM insights.\n\nSimply enter a Booking ID, Lead ID, Order ID, or ask your question naturally.`,
            })
        }
    }, [open, greeted, user])

    function pushMessage(msg: ChatMessage) {
        setMessages((prev) => [...prev, msg])
    }

    function removeMessage(id: string) {
        setMessages((prev) => prev.filter((m) => m.id !== id))
    }

    async function runQuery(query: string) {
        const trimmed = query.trim()
        if (!trimmed || loading) return

        pushMessage({ id: uid(), role: 'user', type: 'text', text: trimmed })
        setInput('')

        const ID_REGEX = /(KTAHV-PMS-\d+|VRV\d{7}|OID_\d+|IN\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
        const match = trimmed.match(ID_REGEX)

        if (!match) {
            if (lastLookup) {
                const answer = getFollowUpAnswer(trimmed, lastLookup)
                if (answer) {
                    const typingId = uid()
                    pushMessage({ id: typingId, role: 'bot', type: 'typing' })
                    setLoading(true)
                    setTimeout(() => {
                        removeMessage(typingId)
                        pushMessage({ id: uid(), role: 'bot', type: 'text', text: answer })
                        setLoading(false)
                    }, 500)
                    return
                }
            }

            const typingId = uid()
            pushMessage({ id: typingId, role: 'bot', type: 'typing' })
            setLoading(true)

            try {
                const res = await fetch(`/api/bot-lookup?q=${encodeURIComponent(trimmed)}`)
                const searchRes = await res.json()
                removeMessage(typingId)

                if (res.ok && searchRes.source === 'search' && Array.isArray(searchRes.results)) {
                    const results = searchRes.results
                    if (results.length === 1) {
                        setLoading(false)
                        runQuery(results[0].id)
                        return
                    } else if (results.length > 1) {
                        pushMessage({
                            id: uid(),
                            role: 'bot',
                            type: 'text',
                            text: `I found ${results.length} possible matches for "${trimmed}":`
                        })
                        pushMessage({
                            id: uid(),
                            role: 'bot',
                            type: 'search-results',
                            searchResults: results
                        })
                        setLoading(false)
                        return
                    }
                }

                pushMessage({
                    id: uid(),
                    role: 'bot',
                    type: 'text',
                    text: "Please include a valid booking ID, lead ID, or order ID (e.g. KTAHV-PMS-9111, VRV0000095, OID_35424) so I can help.",
                })
            } catch (err) {
                removeMessage(typingId)
                pushMessage({
                    id: uid(),
                    role: 'bot',
                    type: 'text',
                    text: "Please include a valid booking ID, lead ID, or order ID (e.g. KTAHV-PMS-9111, VRV0000095, OID_35424) so I can help.",
                })
            } finally {
                setLoading(false)
            }
            return
        }

        const extractedId = match[0]
        const typingId = uid()
        pushMessage({ id: typingId, role: 'bot', type: 'typing' })
        setLoading(true)

        try {
            const res = await fetch(`/api/bot-lookup?id=${encodeURIComponent(extractedId)}`)
            const lookup: LookupResponse = await res.json()

            removeMessage(typingId)

            if (!res.ok || lookup.source === 'unknown') {
                pushMessage({
                    id: uid(),
                    role: 'bot',
                    type: 'text',
                    text:
                        lookup.error ||
                        "I couldn't recognize that ID format. Try a KTAHV booking ID, Villa Raag reservation number, lead ID, or order ID.",
                })
                offerTicket(extractedId, 'unknown')
                return
            }

            setLastLookup(lookup)
            pushMessage({ id: uid(), role: 'bot', type: 'text', text: "Found a match, here's what I have:" })
            pushMessage({ id: uid(), role: 'bot', type: 'result', lookup, refId: extractedId })
        } catch (err) {
            removeMessage(typingId)
            pushMessage({
                id: uid(),
                role: 'bot',
                type: 'text',
                text: "Something went wrong reaching the CRM data. Let's log a ticket so the team can look into it.",
            })
            offerTicket(extractedId, 'unknown')
        } finally {
            setLoading(false)
        }
    }

    function offerTicket(refId: string, source: ChatMessage['lookup'] extends undefined ? any : any) {
        setTimeout(() => {
            pushMessage({
                id: uid(),
                role: 'bot',
                type: 'text',
                text: "Sorry about that. Let's get this to the team — fill in a few details below.",
            })
            pushMessage({
                id: uid(),
                role: 'bot',
                type: 'ticket-form',
                refId,
                lookup: { source: 'unknown', data: null },
            })
        }, 300)
    }

    function handleNotHelpful(refId: string, source: LookupResponse['source']) {
        pushMessage({ id: uid(), role: 'user', type: 'text', text: "This isn't what I needed" })
        setTimeout(() => {
            pushMessage({
                id: uid(),
                role: 'bot',
                type: 'text',
                text: "Sorry about that. Let's get this to the team — fill in a few details below.",
            })
            pushMessage({ id: uid(), role: 'bot', type: 'ticket-form', refId, lookup: { source, data: null } })
        }, 300)
    }

    function handleHelpful() {
        pushMessage({ id: uid(), role: 'user', type: 'text', text: 'Thanks, that works' })
        setTimeout(() => {
            pushMessage({ id: uid(), role: 'bot', type: 'text', text: 'Glad that helped. Anything else to look up?' })
        }, 300)
    }

    function handleTicketSubmitted(formMsgId: string, ticket: TicketResponse) {
        removeMessage(formMsgId)
        pushMessage({ id: uid(), role: 'bot', type: 'text', text: 'Got it — thanks for the details.' })
        pushMessage({ id: uid(), role: 'bot', type: 'ticket-confirm', ticket })
    }

    return (
        <>
            <ChatBubble open={open} onClick={() => setOpen((v) => !v)} />

            {open && (
                <div className="fixed bottom-[76px] sm:bottom-[88px] right-3 sm:right-7 z-[1000] flex h-[calc(100vh-96px)] max-h-[560px] w-[calc(100vw-24px)] sm:w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-200">
                    <div
                        className="flex flex-shrink-0 items-center gap-[12px] border-b-2 border-[#C58B2B] px-[18px] py-3.5 text-white shadow-md transition-all duration-300"
                        style={{ background: 'linear-gradient(135deg, #152238 0%, #1B2E4A 100%)' }}
                    >
                        <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8EA12E] to-[#6F8C24] text-[15px] font-bold text-white border border-white/50 shadow-md hover:scale-105 transition-transform duration-200">
                            KA
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center text-[17px] font-bold leading-tight">
                                Kairav
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C58B2B" strokeWidth="2.5" className="ml-1.5 inline-block align-middle">
                                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                </svg>
                            </div>
                            <div className="text-[12px] font-medium text-[#B8C2D1] leading-tight mt-0.5">
                                AI Operations Assistant
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[#22C55E] mt-0.5 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                                Online
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div ref={bodyRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto bg-slate-50 p-4">
                        {messages.map((m) => (
                            <MessageRow
                                key={m.id}
                                message={m}
                                onHelpful={handleHelpful}
                                onNotHelpful={() => m.refId !== undefined && handleNotHelpful(m.refId, m.lookup!.source)}
                                onTicketSubmitted={(ticket) => handleTicketSubmitted(m.id, ticket)}
                                onSelectId={runQuery}
                            />
                        ))}
                    </div>

                    {user && (
                        <div className="flex flex-shrink-0 gap-2 px-3.5 py-1.5 border-t border-gray-100 bg-slate-50 overflow-x-auto text-[11px] select-none">
                            <button
                                onClick={fetchMyTickets}
                                className="flex-shrink-0 px-2.5 py-1 rounded-full border border-[#8EA12E] bg-white text-[#8EA12E] hover:bg-[#8EA12E] hover:text-white font-medium transition duration-200"
                            >
                                📋 My Tickets
                            </button>
                        </div>
                    )}

                    <div className="flex flex-shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3.5 py-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runQuery(input)}
                            placeholder="Ask Kairav about bookings, leads, payments, reports, or enter an ID..."
                            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-[13px] focus:border-[#8EA12E] focus:outline-none"
                        />
                        <button
                            onClick={() => runQuery(input)}
                            aria-label="Send"
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#152238] hover:bg-[#1B2E4A] transition-all duration-200"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m22 2-7 20-4-9-9-4Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

function MessageRow({
    message,
    onHelpful,
    onNotHelpful,
    onTicketSubmitted,
    onSelectId,
}: {
    message: ChatMessage
    onHelpful: () => void
    onNotHelpful: () => void
    onTicketSubmitted: (ticket: TicketResponse) => void
    onSelectId?: (id: string) => void
}) {
    if (message.type === 'typing') {
        return (
            <div className="flex items-start gap-2">
                <BotAvatar />
                <div className="flex w-fit gap-1 rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-3.5 py-2.5">
                    <Dot delay="0s" />
                    <Dot delay=".2s" />
                    <Dot delay=".4s" />
                </div>
            </div>
        )
    }

    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[250px] rounded-[16px] rounded-tr-[4px] bg-[#152238] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white shadow-sm">
                    {message.text}
                </div>
            </div>
        )
    }

    if (message.type === 'result' && message.lookup) {
        return (
            <div className="flex items-start gap-2">
                <BotAvatar />
                <ResultCard lookup={message.lookup} onHelpful={onHelpful} onNotHelpful={onNotHelpful} />
            </div>
        )
    }

    if (message.type === 'ticket-form') {
        return (
            <div className="flex items-start gap-2">
                <BotAvatar />
                <TicketForm
                    refId={message.refId}
                    source={message.lookup?.source ?? 'unknown'}
                    onSubmitted={onTicketSubmitted}
                />
            </div>
        )
    }

    if (message.type === 'ticket-confirm' && message.ticket) {
        return (
            <div className="flex items-start gap-2">
                <BotAvatar />
                <div className="max-w-[270px] rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-emerald-900">
                    Ticket <span className="font-mono text-[13px] font-bold text-emerald-700">{message.ticket.ticketId}</span>{' '}
                    created. The support team usually responds within a few hours — you can ask me for this ticket ID anytime
                    to check status.
                </div>
            </div>
        )
    }

    if (message.type === 'my-tickets') {
        return (
            <div className="flex items-start gap-2">
                <BotAvatar />
                <div className="max-w-[280px] rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                    <div className="mb-2 text-[13px] font-bold text-[#152238]">My Support Tickets</div>
                    {!message.ticketsList || message.ticketsList.length === 0 ? (
                        <p className="text-[12px] text-gray-500">You haven't submitted any tickets yet.</p>
                    ) : (
                        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {message.ticketsList.map((t: any) => (
                                <div key={t.ticketId} className="rounded-lg border border-gray-100 bg-slate-50 p-2.5 text-[11.5px] leading-normal text-gray-700">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-mono font-bold text-[#152238]">{t.ticketId}</span>
                                        <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${t.status === 'open' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            t.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {t.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="text-gray-500 text-[10.5px] mb-1">
                                        Ref: <span className="font-medium text-gray-700">{t.referenceId || 'N/A'}</span> | Cat: <span className="font-medium text-gray-700">{t.category}</span>
                                    </div>
                                    <div className="text-gray-600 italic">"{t.description}"</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }
    
    if (message.type === 'search-results' && message.searchResults) {
        return (
            <div className="flex items-start gap-2">
                <BotAvatar />
                <SearchResultsCard results={message.searchResults} onSelectId={onSelectId} />
            </div>
        )
    }

    return (
        <div className="flex items-start gap-2">
            <BotAvatar />
            <div className="max-w-[250px] rounded-[16px] rounded-tl-[4px] border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-gray-900 shadow-sm">
                {message.text}
            </div>
        </div>
    )
}

function SearchResultsCard({
    results,
    onSelectId,
}: {
    results: any[]
    onSelectId?: (id: string) => void
}) {
    const getBadgeStyles = (source: string) => {
        switch (source) {
            case 'ktahv':
                return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'villa':
                return 'bg-purple-50 text-purple-700 border-purple-200'
            case 'order':
                return 'bg-teal-50 text-teal-700 border-teal-200'
            case 'lead':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200'
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200'
        }
    }

    const getSourceName = (source: string) => {
        switch (source) {
            case 'ktahv': return 'KTAHV'
            case 'villa': return 'Villa Raag'
            case 'order': return 'Order'
            case 'lead': return 'Lead'
            default: return source.toUpperCase()
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    return (
        <div className="w-full max-w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#152238]/5 px-3.5 py-2 text-[12.5px] font-bold text-[#152238]">
                Matching Records
            </div>
            <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto">
                {results.map((r, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectId?.(r.id)}
                        className="w-full text-left p-3 hover:bg-slate-50 transition duration-150 focus:outline-none flex flex-col gap-1"
                    >
                        <div className="flex items-center justify-between gap-1.5 w-full">
                            <span className="font-mono text-[11px] font-bold text-[#152238] break-all">{r.id}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${getBadgeStyles(r.source)}`}>
                                {getSourceName(r.source)}
                            </span>
                        </div>
                        <div className="text-[12.5px] font-semibold text-gray-800 line-clamp-1">{r.name}</div>
                        <div className="flex justify-between items-center text-[10px] text-gray-400 mt-0.5">
                            <span>{r.status || 'N/A'}</span>
                            {r.date && <span>{formatDate(r.date)}</span>}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}

function BotAvatar() {
    return (
        <div className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8EA12E] to-[#6F8C24] text-[10px] font-bold text-white border border-white/30 shadow-sm">
            KA
        </div>
    )
}

function Dot({ delay }: { delay: string }) {
    return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: delay }} />
}
