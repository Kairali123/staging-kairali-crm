import { useState } from 'react'
import { LookupResponse, formatResult } from './types'

interface ResultCardProps {
    lookup: LookupResponse
    onHelpful: () => void
    onNotHelpful: () => void
}

export default function ResultCard({ lookup, onHelpful, onNotHelpful }: ResultCardProps) {
    const { title, status, fields } = formatResult(lookup)
    const [expanded, setExpanded] = useState(false)

    function formatLabel(key: string): string {
        let clean = key
            .replace(/^[a-z]{2,4}_[a-z]{3,4}_/i, '')
            .replace(/^dcpv_/i, '')
            .replace(/_/g, ' ')
        clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        const mappings: Record<string, string> = {
            'Id': 'ID',
            'Uid': 'UID',
            'Lead Id': 'Lead ID',
            'Booking Id': 'Booking ID',
            'Order Id': 'Order ID',
            'Buyer Id': 'Buyer ID',
            'Reservation Id': 'Reservation ID',
            'Reservation Number': 'Reservation Number',
            'Guest Id': 'Guest ID',
            'Edit Id': 'Edit ID',
            'Ivr Url': 'IVR URL',
            'Pi No': 'PI Number',
            'Pi Url': 'PI URL',
            'Cod': 'COD',
            'Mr Main': 'MR Main',
            'Timestamp 2': 'Timestamp',
            'Recv Amt': 'Received Amount',
            'Recv Amount': 'Received Amount',
            'Amt': 'Amount',
            'Fms': 'FMS',
            'Pms': 'PMS',
            'Nbd': 'NBD',
            'Crr': 'CRR',
            'Btp': 'BTP',
            'Ht': 'HT',
        }
        for (const [search, replace] of Object.entries(mappings)) {
            if (clean.includes(search)) {
                clean = clean.replace(new RegExp(search, 'g'), replace)
            }
        }
        return clean
    }

    function renderFullDetails() {
        const { source, data } = lookup
        if (!data) return null

        function renderRow(label: string, val: any) {
            const lowerLabel = label.toLowerCase()
            if (lowerLabel === 'created_at' || lowerLabel === 'updated_at' || lowerLabel === 'timestamp') return null
            if (val === undefined || val === null) return null

            let displayVal = String(val).trim()
            if (displayVal === '' || displayVal === '-' || displayVal.toLowerCase() === 'null') return null

            // Check for ISO Date Time string (e.g. 2026-07-11T09:30:00.000Z)
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(displayVal)) {
                const date = new Date(displayVal)
                if (!isNaN(date.getTime())) {
                    displayVal = date.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })
                }
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(displayVal)) { // Check for pure Date YYYY-MM-DD
                const date = new Date(displayVal)
                if (!isNaN(date.getTime())) {
                    displayVal = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                }
            } else if (displayVal.startsWith('http')) {
                return (
                    <div key={label} className="py-1 border-b border-gray-200 last:border-b-0">
                        <div className="text-gray-400 font-semibold uppercase text-[9px]">{formatLabel(label)}</div>
                        <a href={displayVal} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                            Open Link
                        </a>
                    </div>
                )
            }
            return (
                <div key={label} className="py-1 border-b border-gray-200 last:border-b-0 flex justify-between gap-2.5">
                    <span className="text-gray-400 font-semibold uppercase text-[9px]">{formatLabel(label)}</span>
                    <span className="text-right text-gray-800 break-words max-w-[150px]">{displayVal}</span>
                </div>
            )
        }

        function renderSection(sectTitle: string, obj: any, keys: string[]) {
            const rows = keys.map(k => renderRow(k, obj?.[k])).filter(Boolean)
            if (rows.length === 0) return null
            return (
                <div key={sectTitle} className="mb-4">
                    <div className="text-[11px] font-bold text-gray-600 border-b border-gray-300 pb-0.5 mb-1.5">{sectTitle}</div>
                    <div className="flex flex-col">{rows}</div>
                </div>
            )
        }

        switch (source) {
            case 'lead': {
                const leadGroups = [
                    { title: 'Lead Info', keys: ['lead_id', 'Subjects', 'Notes', 'IVR_URL', 'WebSite_Name', 'Data_Source', 'Verified_Source', 'actual_time', 'sheet_name'] },
                    { title: 'User Details', keys: ['Name_of_User', 'Phone_Number_of_User', 'Email_of_User', 'Country', 'Priority', 'Urgency_YES_NO', 'Contact_Time', 'Summary_of_Conversation', 'Lead_Outcome', 'Lead_Category', 'Preferred_Way_to_Contact'] },
                    { title: 'Status', keys: ['status', 'Enquiry_Status_Last', 'gpt_Extraction_Status', 'Assign_To_MR_Main'] }
                ]
                return (
                    <div>
                        {leadGroups.map(g => renderSection(g.title, data, g.keys))}
                    </div>
                )
            }
            case 'ktahv': {
                const part1 = data.part1 || {}
                const ktahvGroups = [
                    { title: 'Guest Details', keys: ['client_name', 'mobile', 'email', 'gender', 'billing_address', 'country', 'state', 'district'] },
                    { title: 'Stay Info', keys: ['arrival_date', 'departure_date', 'days_of_stay', 'package_type', 'prog_pkg_name', 'room_no', 'room_type', 'room_category', 'number_of_adults', 'guest_status', 'booking_status'] },
                    { title: 'Payment Details', keys: ['advance_amount', 'balance_amount', 'total_amt_before_disc', 'discount_amount', 'discount_percent', 'invoice_amount', 'inr_value', 'currency', 'nb_pch_total_recv_amount', 'nb_pch_pending_amount'] }
                ]
                const stages = [
                    { key: 'nb', title: 'Verification Stage' },
                    { key: 'av', title: 'Accounts Verification' },
                    { key: 'ft', title: 'Final Transfer' },
                    { key: 'dc', title: 'Deletion Complete' }
                ]
                return (
                    <div>
                        {ktahvGroups.map(g => renderSection(g.title, part1, g.keys))}
                        {stages.map(s => {
                            const stageObj = data[s.key]
                            if (!stageObj) return null
                            const allKeys = Object.keys(stageObj).filter(k => k !== 'id' && k !== 'reservation_id')
                            return renderSection(s.title, stageObj, allKeys)
                        })}
                    </div>
                )
            }
            case 'villa': {
                const villaGroups = [
                    { title: 'Guest Details', keys: ['name_of_client', 'mobile', 'guest_email', 'gender', 'billing_address', 'country'] },
                    { title: 'Stay Info', keys: ['arrival_date', 'departure_date', 'total_room_nights', 'room_no', 'no_of_rooms', 'length_of_stay', 'room_category', 'meal_plans', 'meal_plan_type', 'total_pax', 'guest_status', 'booking_status', 'booking_source'] },
                    { title: 'Payment Details', keys: ['net_payable_a', 'subtotal', 'room_price', 'add_ons_price', 'outlet_price', 'discount_amount', 'taxes', 'invoice_amount', 'total_payments', 'net_payable_by_guest', 'received_amount', 'total_received_amount', 'pending_amount', 'payment_mode'] }
                ]
                return (
                    <div>
                        {villaGroups.map(g => renderSection(g.title, data, g.keys))}
                    </div>
                )
            }
            case 'order': {
                const order = data.order || {}
                const dispatch = data.dispatch || {}
                const orderGroups = [
                    { title: 'Order Details', keys: ['order_id', 'buyer_id', 'client_name', 'mobile', 'email', 'billing_type', 'order_type', 'billing_address', 'shipping_address', 'order_taken_by', 'order_status'] },
                    { title: 'Payment Info', keys: ['invoice_amount', 'total_amount_before_discount', 'payment_terms', 'payment_collection_date'] }
                ]
                return (
                    <div>
                        {orderGroups.map(g => renderSection(g.title, order, g.keys))}
                        {Object.keys(dispatch).length > 0 && renderSection('Dispatch details', dispatch, Object.keys(dispatch).filter(k => k !== 'id' && k !== 'order_id' && k !== 'buyer_id'))}
                    </div>
                )
            }
            default:
                return null
        }
    }

    return (
        <div className="max-w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-[#152238]/5 px-3.5 py-2.5">
                <span className="text-[12.5px] font-semibold text-[#152238]">{title}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                    {status}
                </span>
            </div>

            <div className="px-3.5 py-3">
                {fields.map((f) => (
                    <div
                        key={f.label}
                        className="flex items-start justify-between gap-2.5 border-b border-dashed border-gray-100 py-1.5 text-[12.5px] last:border-b-0"
                    >
                        <span className="text-gray-500">{f.label}</span>
                        <span className="text-right font-medium text-gray-900">{f.value}</span>
                    </div>
                ))}

                {lookup.note && (
                    <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11.5px] leading-snug text-amber-800">
                        {lookup.note}
                    </div>
                )}
            </div>

            <div className="border-t border-gray-100 px-3.5 py-2 bg-slate-50 flex justify-center">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[11.5px] font-semibold text-[#8EA12E] hover:text-[#6F8C24] transition focus:outline-none"
                >
                    {expanded ? 'Hide full details' : 'View full details'}
                </button>
            </div>

            {expanded && (
                <div className="border-t border-gray-200 bg-gray-50 px-3.5 py-3.5 max-h-[300px] overflow-y-auto text-[11.5px] leading-normal text-gray-700">
                    {renderFullDetails()}
                </div>
            )}

            <div className="flex gap-2 border-t border-gray-200 px-3.5 py-2.5">
                <button
                    onClick={onHelpful}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[12px] font-medium text-emerald-700 transition hover:bg-emerald-50"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Helpful
                </button>
                <button
                    onClick={onNotHelpful}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                    </svg>
                    Not helpful
                </button>
            </div>
        </div>
    )
}