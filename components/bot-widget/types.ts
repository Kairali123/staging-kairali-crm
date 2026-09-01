export type LookupSource = 'lead' | 'ktahv' | 'order' | 'villa' | 'unknown'

export interface LookupResponse {
    source: LookupSource
    data: any
    note?: string | null
    error?: string
}

export interface TicketPayload {
    referenceId: string
    category: string
    description: string
    source: LookupSource | 'unknown'
}

export interface TicketResponse {
    ticketId: string
    status: string
}

export interface SearchResultItem {
    source: 'ktahv' | 'villa' | 'order' | 'lead'
    id: string
    name: string
    mobile?: string
    email?: string
    date?: string
    status?: string
}

export type ChatMessageType = 'text' | 'result' | 'ticket-form' | 'ticket-confirm' | 'typing' | 'my-tickets' | 'search-results'
export type ChatRole = 'user' | 'bot'

export interface ChatMessage {
    id: string
    role: ChatRole
    type: ChatMessageType
    text?: string
    lookup?: LookupResponse
    refId?: string
    ticket?: TicketResponse
    ticketsList?: any[]
    searchResults?: SearchResultItem[]
}

export interface ResultField {
    label: string
    value: string
}

// Maps each source's raw `data` shape to display rows + a status badge.
// Adjust field paths here if your actual column names differ.
export function formatResult(lookup: LookupResponse): {
    title: string
    status: string
    fields: ResultField[]
} {
    const { source, data } = lookup

    switch (source) {
        case 'lead': {
            const d = data || {}
            return {
                title: 'Lead',
                status: d.status || 'Unknown',
                fields: [
                    { label: 'Name', value: d.Name_of_Client || '-' },
                    { label: 'Mobile', value: d.Mobile || '-' },
                    { label: 'Subject', value: d.Subjects || '-' },
                    { label: 'Email', value: d.Email_Id || '-' },
                ],
            }
        }
        case 'ktahv': {
            const part1 = data?.part1 || {}
            const stages = ['nb', 'av', 'ft', 'dc'] as const
            const currentStage = stages.find((s) => data?.[s]) || 'part1'
            return {
                title: 'KTAHV booking',
                status: currentStage.toUpperCase(),
                fields: [
                    { label: 'Guest', value: part1.client_name || '-' },
                    { label: 'Room', value: part1.room_no || '-' },
                    { label: 'Mobile', value: part1.mobile || '-' },
                    { label: 'Current stage', value: currentStage.toUpperCase() },
                ],
            }
        }
        case 'villa': {
            const d = data || {}
            return {
                title: 'Villa Raag booking',
                status: d.booking_status || 'Unknown',
                fields: [
                    { label: 'Guest', value: d.name_of_client || '-' },
                    { label: 'Room', value: d.room_category || '-' },
                    { label: 'Check-in', value: d.arrival_date || '-' },
                    { label: 'Check-out', value: d.departure_date || '-' },
                ],
            }
        }
        case 'order': {
            const d = data?.order || {}
            return {
                title: 'New Order FMS',
                status: d.order_status || 'Unknown',
                fields: [
                    { label: 'Buyer ID', value: d.buyer_id || '-' },
                    { label: 'Client', value: d.client_name || '-' },
                    { label: 'Billing type', value: d.billing_type || '-' },
                    { label: 'Invoice', value: d.invoice_amount || '-' },
                ],
            }
        }
        default:
            return { title: 'Unknown', status: 'Not found', fields: [] }
    }
}

interface FieldMapping {
    label: string
    key: string
    format?: (val: any, allData: any) => string
}

export const FIELD_GROUPS: Record<string, Record<string, FieldMapping[]>> = {
    lead: {
        payment: [
            { label: 'Converted Amount', key: 'Converted_Amount' }
        ],
        status: [
            { label: 'Status', key: 'status' },
            { label: 'Enquiry Status Last', key: 'Enquiry_Status_Last' }
        ],
        contact: [
            { label: 'Mobile', key: 'Mobile' },
            { label: 'Email', key: 'Email_Id' }
        ]
    },
    ktahv: {
        payment: [
            { label: 'Advance Amount', key: 'advance_amount', format: (v, d) => `₹${v} ${d.part1?.currency || ''}` },
            { label: 'Balance Amount', key: 'balance_amount', format: (v, d) => `₹${v} ${d.part1?.currency || ''}` },
            { label: 'Total Received Amount', key: 'nb_pch_total_recv_amount', format: (v, d) => `₹${v} ${d.part1?.currency || ''}` },
            { label: 'Pending Amount', key: 'nb_pch_pending_amount', format: (v, d) => `₹${v} ${d.part1?.currency || ''}` },
            { label: 'Invoice Amount', key: 'invoice_amount', format: (v, d) => `₹${v} ${d.part1?.currency || ''}` }
        ],
        status: [
            { label: 'Booking Status', key: 'booking_status' },
            { label: 'Guest Status', key: 'guest_status' }
        ],
        room: [
            { label: 'Room No', key: 'room_no' },
            { label: 'Room Type', key: 'room_type' },
            { label: 'Room Category', key: 'room_category' }
        ],
        contact: [
            { label: 'Mobile', key: 'mobile' },
            { label: 'Email', key: 'email' }
        ]
    },
    villa: {
        payment: [
            { label: 'Net Payable', key: 'net_payable_a', format: (v, d) => `₹${v} ${d.currency || ''}` },
            { label: 'Total Received', key: 'total_received_amount', format: (v, d) => `₹${v} ${d.currency || ''}` },
            { label: 'Pending Amount', key: 'pending_amount', format: (v, d) => `₹${v} ${d.currency || ''}` },
            { label: 'Payment Mode', key: 'payment_mode' }
        ],
        status: [
            { label: 'Booking Status', key: 'booking_status' },
            { label: 'Guest Status', key: 'guest_status' }
        ],
        room: [
            { label: 'Room No', key: 'room_no' },
            { label: 'Room Category', key: 'room_category' }
        ],
        contact: [
            { label: 'Mobile', key: 'mobile' },
            { label: 'Email', key: 'guest_email' }
        ]
    },
    order: {
        payment: [
            { label: 'Invoice Amount', key: 'invoice_amount', format: (v) => `₹${v}` },
            { label: 'Total Before Discount', key: 'total_amount_before_discount', format: (v) => `₹${v}` }
        ],
        status: [
            { label: 'Order Status', key: 'order_status' }
        ],
        contact: [
            { label: 'Mobile', key: 'mobile' },
            { label: 'Email', key: 'email' }
        ]
    }
}

export function getFollowUpAnswer(messageText: string, lookup: LookupResponse): string | null {
    const text = messageText.toLowerCase()
    const source = lookup.source
    const groups = FIELD_GROUPS[source]
    if (!groups) return null

    let matchedGroup: string | null = null
    if (/\b(payment|paid|pending|amount)\b/.test(text)) {
        matchedGroup = 'payment'
    } else if (/\b(status|stage)\b/.test(text)) {
        matchedGroup = 'status'
    } else if (/\b(room)\b/.test(text)) {
        matchedGroup = 'room'
    } else if (/\b(contact|mobile|phone|email)\b/.test(text)) {
        matchedGroup = 'contact'
    }

    if (!matchedGroup || !groups[matchedGroup]) return null

    const mappings = groups[matchedGroup]
    const details = mappings.map(m => {
        let val: any = undefined
        if (source === 'ktahv') {
            for (const stageKey of ['part1', 'nb', 'av', 'ft', 'dc']) {
                if (lookup.data?.[stageKey] && lookup.data[stageKey][m.key] !== undefined) {
                    val = lookup.data[stageKey][m.key]
                    break
                }
            }
        } else if (source === 'order') {
            val = lookup.data?.order?.[m.key] ?? lookup.data?.dispatch?.[m.key]
        } else {
            val = lookup.data?.[m.key]
        }

        if (val === undefined || val === null || val === '') {
            return `${m.label}: -`
        }
        const formattedVal = m.format ? m.format(val, lookup.data) : String(val)
        return `${m.label}: **${formattedVal}**`
    })

    const idVal = source === 'ktahv' ? lookup.data?.part1?.reservation_id :
        source === 'villa' ? lookup.data?.reservation_number :
            source === 'order' ? lookup.data?.order?.order_id :
                lookup.data?.lead_id

    return `Here are the **${matchedGroup}** details for **${idVal || 'the record'}**:\n\n` + details.join('\n')
}