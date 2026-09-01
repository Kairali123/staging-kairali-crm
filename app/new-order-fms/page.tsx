"use client"

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNewOrderFMS } from '@/hooks/use-new-order-fms';
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BackButton } from "@/components/back-button"
import Loader from "@/components/Loader"

import {
    Package,
    Clock,
    CheckCircle,
    AlertCircle,
    XCircle,
    PauseCircle,
    Filter,
    RefreshCw,
    Loader2,
    Search,
    Building,
    Calendar,
    DollarSign,
    BarChart3,
    Box,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Info
} from "lucide-react"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface StageDetails {
    planned?: string;
    actual?: string;
    delay?: string;
    user?: string;
    status?: string;
    [key: string]: any;
}

interface Order {
    id: number;
    timestamp: string;
    actual: string;
    buyerId: string;
    orderId: string;
    name: string;
    mobile: string;
    email: string;
    billingType: string;
    orderType: string;
    billingAddress: string;
    shippingAddress: string;
    invoiceAmount: string;
    totalAmtBeforeDiscount: string;
    uploadedImageLink: string;
    paymentTerms: string;
    paymentCollectionDate: string;
    orderTakenBy: string;
    whatsappSMS: string;
    piLink: string;
    piUrl: string;
    orderStatus: string;
    planned: string;
    actualDelay: string;
    fmsUserName: string;
    activeStage: number; // 0–6
    status?: 'Cancelled' | 'Hold' | 'Normal';
    editOrderLink?: string;
    dispatch?: string;

    // New fields from API
    advancePaymentLink?: string;
    whatsappStatus?: string;
    remarkPiHistory?: string;
    trftoDispatchStatus?: string;
    helpingTicketStatus?: string;
    expectedDispatchDate?: string;
    cod?: string;
    codConfirmationStatus?: string;
    shippingAddressChanged?: string;
    updatedAddress?: string;
    deliveryNoteNo?: string;
    dnUrlRemarks?: string;
    invoiceNo?: string;
    invoiceLink?: string;
    ewayBillNo?: string;
    ewayBillUrl?: string;

    // Packing
    packingStatus?: string;
    packingSlip?: string;
    packinglist?: string;
    packingsticker?: string;
    dispatchFormCourier?: string;
    dispatchFromPacking?: string;
    packingState?: string;
    updateLeadStatus?: string;
    packingRemarks?: string;

    // QC
    qcStatus?: string;
    dispatchDoc?: string;
    qcImage1?: string;
    qcImage2?: string;
    qcImage3?: string;
    qcDoer?: string;
    qcRemarks?: string;

    // Address Verify
    addressVerifyStatus?: string;
    addressChanged?: string;
    newAddress?: string;
    addressRemarks?: string;
    eshopboxUpdated?: string;
    shopifyUpdated?: string;

    // Dispatch
    dispatchStatus?: string;
    dispatchRemarks?: string;
    imsStockLink?: string;
    dispatchImage?: string;

    // Tracking
    trackingId?: string;
    dispatchThrough?: string;
    trackingUrl?: string;

    // Stock
    deductionStatus?: string;
    deductedBy?: string;
    deductionDate?: string;

    // Stage-wise data
    stages: Record<number, StageDetails>;
}


interface StageModalState {
    order: Order;
    stageIndex: number;
}

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const STAGE_NAMES = [
    'Order Verify Status',
    'Inventory Verify Status',
    'Payment Verify Status',
    'Order Packing Status',
    'QC Verify Status',
    'Address ReVerify Status',
    'Dispatch Status',
    'Tracking Update Status',
    'Stock Deduction Status',
];

const STAGE_SHORT = [
    'Order Verify',
    'Inventory Verify',
    'Payment Verify',
    'Order Packing',
    'QC Verify',
    'Address ReVerify',
    'Dispatch',
    'Tracking Update',
    'Stock Deduction',
];

/* ─────────────────────────────────────────────
   MOCK DATA (10 orders)
───────────────────────────────────────────── */
// Mock data removed. Using useNewOrderFMS hook.


/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getInitials(name: string): string {
    return name
        .replace(/^(Ms\.|Mr\.|Dr\.)\s*/i, '')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('');
}

function getGoogleDriveThumbnail(url: string): string {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/i) ||
            url.match(/id=([a-zA-Z0-9_-]{25,})/i) ||
            url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/i);

        if (idMatch && idMatch[1]) {
            // Using the official thumbnail endpoint which is generally more reliable
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w400-h400`;
        }
    }
    return url;
}

function parseCurrency(val: string): number {
    if (!val) return 0;
    return Number(val.replace(/[₹,]/g, '')) || 0;
}



function getOrderTypeStyles(type: string) {
    const t = (type || "").toUpperCase();
    if (t.includes("NEW ORDER")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (t.includes("ONLINE ORDER")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (t.includes("COD") || t.includes("CASH")) return "bg-orange-50 text-orange-700 border-orange-200";

    // Distinct colors for others
    if (t.includes("SAMPLE")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (t.includes("REPLACEMENT")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (t.includes("B2B")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (t.includes("B2C")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
    if (t.includes("EXCHANGE")) return "bg-teal-50 text-teal-700 border-teal-200";

    return "bg-slate-50 text-slate-700 border-slate-200";
}

const isFilled = (v: any) => {
    return (
        v &&
        v !== "-" &&
        v !== "—" &&
        v !== "" &&
        v !== "N/A" &&
        v !== "#N/A"
    );
};

const completedStatus = () => ({
    label: "Completed",
    type: "done" as const
});

const pendingStatus = () => ({
    label: "Pending",
    type: "fail" as const
});

function EditedCancelledInfo({ label }: { label: string }) {
    if (label !== "Edited-Cancelled" && label.toUpperCase() !== "EDITED-CANCELLED") return null;

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                        color: 'inherit',
                        opacity: 0.9
                    }}>
                        <Info size={13} strokeWidth={2.5} />
                    </span>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border-none max-w-[250px] leading-relaxed z-[9999]"
                >
                    <p className="font-medium text-[11px]">
                        {/* This order has been cancelled, and the user has placed a new order. You can track the latest order using the buyer ID. */}
                        This order was edited, so this order ID has been cancelled, and a new order has been created with the updated details.
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}


const holdStatus = () => ({
    label: "Hold",
    type: "warn" as const
});

const cancelledStatus = () => ({
    label: "Cancelled",
    type: "fail" as const
});

function getOrderVerifyStage(order: any) {
    const s = order.stages?.[0];
    if (!s) return pendingStatus();

    const status = (s.status || "").trim();
    const dispatch = (s.dispatch || "").trim();
    const actual = (s.actual || "").trim();

    const sLower = status.toLowerCase();
    if (sLower.includes("cancel") || sLower === "edit order") {
        return { label: sLower === "edit order" ? "Edited-Cancelled" : "Cancelled", type: "fail" as const };
    }
    if (sLower === "hold") {
        return holdStatus();
    }

    const isOk = sLower === "ok to dispatch";
    const isFactory = dispatch.toLowerCase() === "factory" || dispatch.toLowerCase() === "office";

    if (isOk && isFactory && isFilled(actual)) {
        return completedStatus();
    }

    if (!isFilled(status) || !isFilled(dispatch) || !isFilled(actual)) {
        return pendingStatus();
    }

    return holdStatus();
}

function getInventoryStage(order: any) {
    const s = order.stages?.[1];
    if (!s) return pendingStatus();

    const status = (s.status || "").trim();
    const dispatch = (s.dispatchfrom || s.dispatch || "").trim();
    const actual = (s.actual || "").trim();

    const sLower = status.toLowerCase();
    if (sLower.includes("cancel") || sLower === "edit order") {
        return { label: sLower === "edit order" ? "Edited-Cancelled" : "Cancelled", type: "fail" as const };
    }
    if (sLower === "hold") {
        return holdStatus();
    }

    const isOk = sLower === "ok to dispatch";
    const isFactory = dispatch.toLowerCase() === "factory" || dispatch.toLowerCase() === "office";

    if (isOk && isFactory && isFilled(actual)) {
        return completedStatus();
    }

    if (!isFilled(status) || !isFilled(dispatch) || !isFilled(actual)) {
        return pendingStatus();
    }

    return holdStatus();
}

function getPaymentStage(order: any) {
    const s = order.stages?.[2];
    if (!s) return pendingStatus();

    const status = (s.status || "").trim();
    const dispatch = (s.dispactfrom || s.dispatch || "").trim();
    const actual = (s.actual || "").trim();

    const sLower = status.toLowerCase();
    if (sLower.includes("cancel") || sLower === "edit order") {
        return { label: sLower === "edit order" ? "Edited-Cancelled" : "Cancelled", type: "fail" as const };
    }
    if (sLower === "hold") {
        return holdStatus();
    }

    const isOk = sLower === "ok to dispatch";
    const isFactory = dispatch.toLowerCase() === "factory" || dispatch.toLowerCase() === "office";

    if (isOk && isFactory && isFilled(actual)) {
        return completedStatus();
    }

    if (!isFilled(status) || !isFilled(dispatch) || !isFilled(actual)) {
        return pendingStatus();
    }

    return holdStatus();
}

function getPackingStage(order: any) {
    const s = order.stages?.[3];
    if (!s) return pendingStatus();

    const actual = s.actual || "";
    const status = s.packingstatus || s.status || "";

    const sLower = status.toLowerCase();
    if (sLower.includes("cancel") || sLower === "edit order") {
        return { label: sLower === "edit order" ? "Edited-Cancelled" : "Cancelled", type: "fail" as const };
    }
    if (sLower === "hold") {
        return holdStatus();
    }

    if (isFilled(actual)) {
        return completedStatus();
    }

    return pendingStatus();
}

function getQCStage(order: any) {
    const s = order.stages?.[4];
    if (!s) return pendingStatus();

    const status = s.qcstatus || s.status || "";
    const actual = s.actual || "";

    if (!isFilled(status) && !isFilled(actual)) {
        return pendingStatus();
    }

    if (status === "QC Done" && isFilled(actual)) {
        return completedStatus();
    }

    const sLower = status.toLowerCase();
    if (sLower.includes("cancel")) {
        return cancelledStatus();
    }
    if (isFilled(status) && (sLower.includes("pending") || sLower.includes("progress") || sLower.includes("reject") || status !== "QC Done")) {
        return holdStatus();
    }

    return pendingStatus();
}

function getAddressVerifyStage(order: any) {
    const s = order.stages?.[5];
    if (!s) return pendingStatus();
    const status = (s.status || "").trim();
    const actual = (s.actual || "").trim();
    const sLower = status.toLowerCase();
    if (sLower.includes("cancel")) return cancelledStatus();
    if (isFilled(actual)) return completedStatus();
    if (sLower.includes("hold")) return holdStatus();
    return pendingStatus();
}

function getDispatchStage(order: any) {
    const s = order.stages?.[6];
    if (!s) return pendingStatus();
    const status = (s.status || "").trim();
    const actual = (s.actual || "").trim();
    const sLower = status.toLowerCase();
    if (sLower.includes("cancel")) return cancelledStatus();
    if (sLower.includes("hold")) return holdStatus();
    if ((isFilled(actual) || isFilled(s.dispatchstatus) || (isFilled(status) && !sLower.includes("pending"))) && !sLower.includes("pending")) return completedStatus();
    return pendingStatus();
}

function getTrackingStage(order: any) {
    const s = order.stages?.[7];
    if (!s) return pendingStatus();
    const status = (s.status || "").trim();
    const actual = (s.actual || "").trim();
    const sLower = status.toLowerCase();

    if (sLower.includes("cancel")) return cancelledStatus();
    if (isFilled(actual) || isFilled(s.trackingid) || isFilled(s.trackingurl)) return completedStatus();
    return pendingStatus();
}

function getStockDeductionStage(order: any) {
    const s = order.stages?.[8];
    if (!s) return pendingStatus();
    const status = (s.status || "").trim();
    const actual = (s.actual || "").trim();
    const sLower = status.toLowerCase();

    if (sLower.includes("cancel")) return cancelledStatus();
    if (isFilled(actual) || isFilled(s.deductionStatus) || isFilled(s.deductionDate)) return completedStatus();
    return pendingStatus();
}

function getStageStatusDataRaw(stageIndex: number, order: any) {
    const hasEditOrderLink = order.editOrderLink &&
        order.editOrderLink.toLowerCase() !== 'no' &&
        order.editOrderLink !== '-' &&
        order.editOrderLink !== '—' &&
        order.editOrderLink.trim() !== '';

    const currentStatus = (order.orderStatus || order.stages?.[0]?.status || "").trim();
    const isEditOrder = currentStatus.toLowerCase() === "edit order";

    switch (stageIndex) {
        case 0:
            return getOrderVerifyStage(order);
        case 1:
            return getInventoryStage(order);
        case 2:
            return getPaymentStage(order);
        case 3:
            return getPackingStage(order);
        case 4:
            return getQCStage(order);
        case 5:
            return getAddressVerifyStage(order);
        case 6:
            return getDispatchStage(order);
        case 7:
            return getTrackingStage(order);
        case 8:
            return getStockDeductionStage(order);
        default:
            break;
    }

    return pendingStatus();
}

function isStageCompleted(stageIdx: number, order: any): boolean {
    const raw = getStageStatusDataRaw(stageIdx, order);
    return raw.type === "done";
}

function getStageStatusData(stageIndex: number, order: any, fetchingStageIndex?: number | null) {
    // 1. Find the first uncompleted stage index (the current active stage)
    let activeIdx = 9;
    for (let i = 0; i <= 8; i++) {
        if (!isStageCompleted(i, order)) {
            activeIdx = i;
            break;
        }
    }

    // 2. Case: All stages are completed
    if (activeIdx === 9) {
        return getStageStatusDataRaw(stageIndex, order);
    }

    // 3. Case: Stage is before the current active stage (completed stages)
    if (stageIndex < activeIdx) {
        return getStageStatusDataRaw(stageIndex, order);
    }

    // 4. Case: Stage is AFTER the current active stage
    if (stageIndex > activeIdx) {
        // All NEXT stages must immediately display static -
        return { label: "-", type: "fail" as const };
    }

    // 5. Case: Stage is the current active stage (stageIndex === activeIdx)
    const rawStatus = getStageStatusDataRaw(stageIndex, order);
    const stage = order.stages?.[stageIndex];

    const statusStr = (stage?.status || stage?.qcstatus || stage?.packingstatus || stage?.addressverifystatus || stage?.dispatchstatus || stage?.deductionstatus || "").toLowerCase().trim();
    const orderStatusStr = (order.orderStatus || "").toLowerCase().trim();

    // Check if this exact stage is actively being fetched right now
    if (fetchingStageIndex === stageIndex) {
        return { label: "processing", type: "active" as const };
    }

    // Check for terminal statuses that should display their badge
    if (["Hold", "Cancelled", "Edited-Cancelled"].includes(rawStatus.label)) {
        return rawStatus;
    }

    // If it evaluated to Pending (not completed)
    if (rawStatus.label === "Pending") {
        return rawStatus;
    }

    return rawStatus;
}

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val);
}

function StageBadge({
    order,
    stageIndex,
    onClick,
    fetchingStageIndex,
}: {
    order: Order;
    stageIndex: number;
    onClick: () => void;
    fetchingStageIndex?: number | null;
}) {
    const status = getStageStatusData(stageIndex, order, fetchingStageIndex);
    const isPlaceholder = status.label === "_" || status.label === "-";

    if (status.label === "processing") {
        return (
            <button
                onClick={onClick}
                style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                }}
                className="hover:bg-slate-100 rounded-full transition-all duration-200"
            >
                <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" strokeWidth={2.5} />
            </button>
        );
    }

    if (isPlaceholder) {
        return (
            <div style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '14px',
                fontWeight: 700,
                width: '100%',
                userSelect: 'none'
            }}>
                -
            </div>
        );
    }



    const styles: Record<string, { bg: string; text: string; border: string }> = {
        done: { bg: '#EAF3DE', text: '#27500A', border: 'transparent' },
        warn: { bg: '#FFF3CD', text: '#7A5200', border: '#fde68a' },
        fail: { bg: '#FCEBEB', text: '#791F1F', border: '#F09595' },
        active: { bg: '#E6F1FB', text: '#0C447C', border: '#93c5fd' },
    };

    const s = styles[status.type] || styles.fail;

    return (
        <button
            onClick={onClick}
            style={{
                background: s.bg,
                color: s.text,
                border: `1.5px solid ${s.border}`,
                borderRadius: '20px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            <span className="flex items-center gap-1.5 justify-center">
                {status.label}
                <EditedCancelledInfo label={status.label} />
            </span>
        </button>
    );
}

/* ─────────────────────────────────────────────
   STAGE POPUP CONTENT — DARK THEME
───────────────────────────────────────────── */

const VALUE_COLORS: Record<string, string> = {
    green: '#3B6D11',
    red: '#A32D2D',
    amber: '#854F0B',
    blue: '#185FA5',
    orange: '#D35400',
    gray: '#888',
};

/** Single label : value row inside an InfoCard */
function Row({
    label,
    value,
    color,
    isLast = false,
}: {
    label: string;
    value: string;
    color?: string;
    isLast?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                padding: '7px 0',
                borderBottom: isLast ? 'none' : '1px solid #f0f2f5',
            }}
        >
            <span style={{ fontSize: 13, color: '#4a5a7a', fontWeight: 600, flexShrink: 0, minWidth: 90 }}>{label}</span>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: color ? VALUE_COLORS[color] ?? '#1a1a2e' : '#1a1a2e',
                    textAlign: 'right',
                    flex: 1,
                    wordBreak: 'break-word',
                }}
            >
                {value}
            </span>
        </div>
    );
}

/** Label : link row */
function RowLink({ label, href, text = 'View Document', isLast = false }: { label: string; href?: string; text?: string; isLast?: boolean }) {
    const isUrl = href && (href.startsWith('http://') || href.startsWith('https://'));
    const hasLink = Boolean(href) && isUrl;
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '7px 0',
                borderBottom: isLast ? 'none' : '1px solid #f0f2f5',
            }}
        >
            <span style={{ fontSize: 13, color: '#4a5a7a', fontWeight: 600, flexShrink: 0, minWidth: 90 }}>{label}</span>
            {hasLink ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, fontWeight: 600, color: '#185FA5', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ display: 'inline' }}>
                        <path d="M2 2h3.5M10 2v8H2V4.5M6 6l4-4M7 2h3v3" stroke="#185FA5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {text}
                </a>
            ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: '#9aa3b2', textAlign: 'right' }}>-</span>
            )}
        </div>
    );
}

function ImagePreviewRow({ label, href, isLast = false }: { label: string; href?: string; isLast?: boolean }) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [href]);

    const isUrl = href && (href.startsWith('http://') || href.startsWith('https://'));
    const hasLink = Boolean(href) && isUrl;
    const displayUrl = hasLink ? getGoogleDriveThumbnail(href!) : '';

    const containerStyle: React.CSSProperties = {
        display: 'block',
        width: 72,
        height: 56,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        cursor: hasLink ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        background: '#f1f5f9'
    };

    const hoverEffects = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!hasLink) return;
        e.currentTarget.style.borderColor = '#185FA5';
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    };

    const outEffects = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!hasLink) return;
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '7px 0',
                borderBottom: isLast ? 'none' : '1px solid #f0f2f5',
            }}
        >
            <span style={{ fontSize: 13, color: '#4a5a7a', fontWeight: 600, flexShrink: 0, minWidth: 90 }}>{label}</span>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <a
                    href={hasLink ? href : undefined}
                    target="_blank"
                    rel="noreferrer"
                    style={containerStyle}
                    onMouseOver={hoverEffects}
                    onMouseOut={outEffects}
                    onClick={(e) => !hasLink && e.preventDefault()}
                >
                    {hasLink && !imgError ? (
                        <img
                            src={displayUrl}
                            alt={label}
                            referrerPolicy="no-referrer"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'opacity 0.2s ease'
                            }}
                            onError={(e) => {
                                // Try fallback to original URL if thumbnail fails
                                if (displayUrl !== href && e.currentTarget.src !== href) {
                                    e.currentTarget.src = href!;
                                } else {
                                    setImgError(true);
                                }
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            background: '#f8fafc',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                                {hasLink ? 'View' : 'No Image'}
                            </span>
                        </div>
                    )}
                </a>
            </div>
        </div>
    );
}

/** Specialized Edit Order row with conditional logic */
function EditOrderRow({ link, isLast = false }: { link?: string; isLast?: boolean }) {
    const hasLink = link && link.toLowerCase() !== 'no' && link !== '-' && link !== '—';
    return <Row label="Edit Order" value={hasLink ? "Yes" : "No"} isLast={isLast} />;
}

/** Card with icon + colored title — light theme */
function InfoCard({
    title,
    titleColor = '#185FA5',
    icon,
    badge,
    children,
    fullWidth = false,
    highlight = false,
}: {
    title: string;
    titleColor?: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    children: React.ReactNode;
    fullWidth?: boolean;
    highlight?: boolean;
}) {
    return (
        <div
            style={{
                border: highlight ? '1.5px solid #b8d0ea' : '1px solid #e5e7eb',
                borderRadius: 12,
                overflow: 'hidden',
                background: highlight ? '#f6faff' : '#fff',
                gridColumn: fullWidth ? '1 / -1' : undefined,
                boxShadow: highlight ? '0 2px 10px rgba(24,95,165,0.08)' : undefined,
            }}
        >
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: highlight
                    ? 'linear-gradient(90deg, #deeaf8 0%, #eaf3ff 100%)'
                    : '#f5f8fc',
                borderBottom: highlight ? '1.5px solid #b8d0ea' : '1px solid #e5e7eb',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon && (
                        <span style={{
                            width: 28, height: 28, borderRadius: 7,
                            background: `${titleColor}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{icon}</span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: titleColor }}>{title}</span>
                </div>
                {badge}
            </div>
            <div style={{ padding: '4px 14px 8px' }}>
                {children}
            </div>
        </div>
    );
}

/** Status badge pill — light pastel */
function StatusBadge({ label, type }: { label: string; type: 'done' | 'active' | 'pending' | 'warn' | 'fail' }) {
    const styles: Record<string, { bg: string; border: string; color: string }> = {
        done: { bg: '#EAF3DE', border: '#b6d98a', color: '#27500A' }, // Completed (Green)
        active: { bg: '#E6F1FB', border: '#93c5fd', color: '#0C447C' }, // Blue (keep as legacy/fallback)
        pending: { bg: '#FFFBF0', border: '#fde68a', color: '#854F0B' }, // Hold (Orange/Amber)
        warn: { bg: '#FFF3CD', border: '#fde68a', color: '#7A5200' }, // Hold (Orange)
        fail: { bg: '#FCEBEB', border: '#fca5a5', color: '#791F1F' }, // Pending (Red)
    };
    const s = styles[type] ?? styles.pending;
    return (
        <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: s.bg,
            border: `1px solid ${s.border}`,
            color: s.color,
            letterSpacing: '.3px',
        }}>
            <span className="flex items-center gap-1.5">
                {label}
                <EditedCancelledInfo label={label} />
            </span>
        </span>
    );
}

/** Delay badge — shows raw HH:MM:SS delay value */
function DelayBadge({ delay }: { delay: string }) {
    if (!delay || delay === '—') return null;
    return (
        <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: '#FCEBEB',
            border: '1px solid #fca5a5',
            color: '#791F1F',
        }}>
            {delay}
        </span>
    );
}

/** Reusable Timing Card matching Stage 1 design */
function TimingCard({
    order,
    stageIndex,
    label = "Timing",
    personLabel = "DOER",
    personValue
}: {
    order: Order,
    stageIndex?: number,
    label?: string,
    personLabel?: string,
    personValue?: string
}) {
    const stageData = stageIndex !== undefined ? order.stages?.[stageIndex] : null;
    const plannedVal = stageData?.planned || "—";
    const actualVal = stageData?.actual || "—";
    const delayVal = stageData?.delay || "—";
    const userVal = personValue || stageData?.user || "—";

    const [plannedDate, plannedTime] = (plannedVal || '').split(' ');
    const [actualDate, actualTime] = (actualVal || '').split(' ');

    return (
        <InfoCard
            title={label}
            titleColor="#CC7A00"
            icon={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="#CC7A00" strokeWidth="1.3" />
                    <path d="M7 4v3l2 1.5" stroke="#CC7A00" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            }
            badge={<DelayBadge delay={delayVal} />}
        >
            <div
                className="grid grid-cols-1 sm:grid-cols-3"
                style={{
                    gap: 0,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    marginBottom: 0,
                    marginTop: 4,
                }}>
                <div
                    className="border-b sm:border-b-0 sm:border-r border-[#e5e7eb]"
                    style={{ padding: '10px 14px', textAlign: 'center', background: '#fafbfc' }}
                >
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', marginBottom: 6, textTransform: 'uppercase' }}>PLANNED</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{[plannedDate, plannedTime].filter(Boolean).join(' ') || '—'}</div>
                </div>
                <div
                    className="border-b sm:border-b-0 sm:border-r border-[#e5e7eb]"
                    style={{ padding: '10px 14px', textAlign: 'center', background: '#fafbfc' }}
                >
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', marginBottom: 6, textTransform: 'uppercase' }}>ACTUAL</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{[actualDate, actualTime].filter(Boolean).join(' ') || '—'}</div>
                </div>
                <div style={{ padding: '10px 12px', textAlign: 'center', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', textTransform: 'uppercase' }}>{personLabel}</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginTop: 4 }}>{userVal || '-'}</span>
                </div>
            </div>
        </InfoCard>
    );
}

function StageContent({ stageIndex, order }: { stageIndex: number; order: Order }) {
    const status = getStageStatusData(stageIndex, order);
    if (status.label === "_") {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                <Box className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-bold uppercase tracking-widest opacity-50">Stage Not Available</p>
                <p className="text-sm mt-2 font-medium">Dependency conditions from previous stages not met.</p>
            </div>
        );
    }

    if (stageIndex === 0) {
        const s0 = order.stages?.[0];
        const status = getStageStatusData(stageIndex, order);
        const orderStatusLabel = status.label;
        const orderStatusType = status.type;
        const orderStatusColor = orderStatusType === 'done' ? 'green' : orderStatusType === 'warn' ? 'orange' : 'red';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoCard
                    title="Order Details"
                    titleColor="#185FA5"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <rect x="1" y="2" width="12" height="10" rx="2" stroke="#185FA5" strokeWidth="1.3" />
                            <path d="M4 5h6M4 7.5h4" stroke="#185FA5" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                    }
                    badge={<StatusBadge label={orderStatusLabel} type={orderStatusType} />}
                    highlight
                >
                    <Row label="Order Status" value={s0?.status || '-'} color={orderStatusColor} />
                    <Row label="Dispatch From" value={s0?.dispatch || '-'} />
                    <Row
                        label="WhatsApp Status"
                        value={s0?.whatsappSMS || '-'}
                        color={s0?.whatsappSMS === 'Sent' ? 'green' : s0?.whatsappSMS === 'Failed' ? 'red' : 'amber'}
                    />
                    <Row label="Shipping Addr. Changed?" value={s0?.shippingaddresschanged || '-'} />
                    <EditOrderRow link={order.editOrderLink} />
                    <Row label="Remarks / PI Edit Remarks" value={s0?.remarkpihistory || '-'} isLast />
                </InfoCard>

                <TimingCard order={order} stageIndex={0} personLabel="Doer" />
            </div>
        );
    }


    if (stageIndex === 1 || stageIndex === 2) {
        const status = getStageStatusData(stageIndex, order);
        const orderStatusLabel = status.label;
        const orderStatusType = status.type;
        const orderStatusColor = orderStatusType === 'done' ? 'green' : orderStatusType === 'warn' ? 'orange' : 'red';

        if (stageIndex === 1) {
            const s1 = order.stages?.[1];
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <InfoCard title="Inventory & PI Details" titleColor="#185FA5"
                        icon={
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M1 4l6-3 6 3-6 3-6-3zM1 10l6 3 6-3M1 7l6 3 6-3" stroke="#185FA5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        }
                        badge={<StatusBadge label={orderStatusLabel} type={orderStatusType} />}
                        highlight
                    >
                        <Row label="Order Status" value={s1?.status || '-'} color={orderStatusColor} />
                        <Row label="Dispatch From" value={s1?.dispatchfrom || '-'} />
                        <Row label="Delivery Note No" value={s1?.deliverynoteno || '-'} />
                        <RowLink label="DN URL / Remarks" href={s1?.dnurlremarks} text="View DN" />
                        <EditOrderRow link={order.editOrderLink} isLast />
                        <Row label="WhatsApp Status" value={s1?.whatsappstaus || '-'} color={s1?.whatsappstaus === 'Sent' ? 'green' : s1?.whatsappstaus === 'Failed' ? 'red' : 'amber'} />
                    </InfoCard>
                    <TimingCard order={order} stageIndex={1} />
                </div>
            );
        }

        if (stageIndex === 2) {
            const s2 = order.stages?.[2];
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <InfoCard title="Payment & Transfer" titleColor="#3B6D11"
                        icon={
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="5.5" stroke="#3B6D11" strokeWidth="1.3" />
                                <path d="M7 4v6M5 6l2-2 2 2" stroke="#3B6D11" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        }
                        badge={<StatusBadge label={orderStatusLabel} type={orderStatusType} />}
                        highlight
                    >
                        <Row label="Order Status" value={s2?.status || '-'} color={orderStatusColor} />
                        <Row label="Dispatch From" value={s2?.dispactfrom || '-'} />
                        {/* <Row label="Invoice No" value={s2?.invoiceno || '-'} /> */}
                        <Row label="Eway Bill No / URL" value={s2?.ewaybill || '-'} />
                        <Row label="Helping Ticket" value={order.helpingTicketStatus || "-"} />
                        {/* <RowLink label="Invoice Link" href={s2?.invoicelink} text="View Invoice" /> */}
                        <EditOrderRow link={order.editOrderLink} isLast />
                        <Row label="WhatsApp Status" value={s2?.whatsappstaus || '-'} color={s2?.whatsappstaus === 'Sent' ? 'green' : s2?.whatsappstaus === 'Failed' ? 'red' : 'amber'} />
                    </InfoCard>
                    <TimingCard order={order} stageIndex={2} />
                </div>
            );
        }
    }


    if (stageIndex === 3) {
        const s3 = order.stages?.[3];
        const status = getStageStatusData(stageIndex, order);
        const statusColor = status.type === 'done' ? 'green' : status.type === 'warn' ? 'orange' : 'red';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoCard title="Packing" titleColor="#185FA5"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 4.5V11a1 1 0 001 1h8a1 1 0 001-1V4.5M1 4.5l6-3 6 3-6 3-6-3z" stroke="#185FA5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    }
                    badge={<StatusBadge label={status.label} type={status.type} />}
                    highlight
                >
                    <Row label="Packing Status" value={s3?.packingstatus || s3?.status || '-'} color={statusColor} />
                    {/* <RowLink label="Packing Slip" href={s3?.packingSlipFormLink} text="View Packing Slip" />
                    <RowLink label="Dispatch Form Courier" href={s3?.dispatchformcourier} text="Click Here" />
                    <RowLink label="Dispatch From Packing" href={s3?.dispatchfrompacking} text="Click Here" />
                    <Row label="State" value={s3?.state || '-'} />
                    <Row label="Update Lead Status" value={s3?.updateleadstatus || '-'} />
                    <Row label="Remarks" value={s3?.dipatachremarks || '-'} isLast /> */}
                    <RowLink label="Packing List" href={order.packinglist} text="View" />
                    <RowLink label="Packing Sticker" href={order.packingsticker} text="View" isLast />
                </InfoCard>
                <TimingCard order={order} stageIndex={3} />
            </div>
        );
    }


    if (stageIndex === 4) {
        const s4 = order.stages?.[4];
        const status = getStageStatusData(stageIndex, order);
        const statusColor = status.type === 'done' ? 'green' : status.type === 'warn' ? 'orange' : 'red';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoCard title="QC-Dispatch Packets" titleColor="#3B6D11"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 7h12M1 4h5l1 1h6v7H1V4z" stroke="#3B6D11" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    }
                    badge={<StatusBadge label={status.label} type={status.type} />}
                    highlight
                >
                    <Row label="QC Status" value={s4?.qcstatus || s4?.status || '-'} color={statusColor} />
                    <Row label="Remarks" value={s4?.remarks || '-'} />
                    {/* <RowLink label="Dispatch Doc" href={s4?.qcstatusuploadurl} text="View QC Doc" /> */}
                    <ImagePreviewRow label="QC Image 1" href={s4?.qcimage1 || order.qcImage1} />
                    <ImagePreviewRow label="QC Image 2" href={s4?.qcimage2 || order.qcImage2} />
                    <ImagePreviewRow label="QC Image 3" href={s4?.qcimage3 || order.qcImage3} />
                    <Row label="WhatsApp Status" value={s4?.whatsappstaus || '-'} color={s4?.whatsappstaus === 'Sent' ? 'green' : s4?.whatsappstaus === 'Failed' ? 'red' : 'amber'} />
                </InfoCard>
                <TimingCard order={order} stageIndex={4} />
            </div>
        );
    }


    if (stageIndex === 5) {
        const s5 = order.stages?.[5];
        const status = getStageStatusData(stageIndex, order);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoCard title="Address Verify Before Dispatch" titleColor="#185FA5"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5" stroke="#185FA5" strokeWidth="1.3" />
                            <path d="M7 4v3l2 1" stroke="#185FA5" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                    }
                    badge={<StatusBadge label={status.label} type={status.type} />}
                    highlight
                >
                    <Row label="Address Verify Status" value={s5?.status || '-'} />
                    <Row label="Address Changed" value={s5?.addresschanged || '-'} />
                    <Row label="New Address" value={s5?.newaddress || '-'} />
                    {/* <Row label="eShopbox Updated" value={s5?.eshopboxupdated || '-'} /> */}
                    {/* <Row label="Shopify Updated" value={s5?.shopifyupdated || '-'} /> */}
                    <Row label="Remarks" value={s5?.remarks || '-'} />

                </InfoCard>
                <TimingCard order={order} stageIndex={5} label="Dispatch Timing" />
            </div>
        );
    }


    if (stageIndex === 6) {
        const s6 = order.stages?.[6];
        const status = getStageStatusData(stageIndex, order);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoCard title="Dispatch To Clients" titleColor="#185FA5"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 4h9l3 3v4H1V4z" stroke="#185FA5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="3.5" cy="11" r="1.5" stroke="#185FA5" strokeWidth="1.3" />
                            <circle cx="10.5" cy="11" r="1.5" stroke="#185FA5" strokeWidth="1.3" />
                        </svg>
                    }
                    badge={<StatusBadge label={status.label} type={status.type} />}
                    highlight
                >
                    <Row label="Dispatch Status" value={s6?.dispatchstatus || s6?.status || "-"} color={status.type === 'done' ? 'green' : status.type === 'warn' ? 'orange' : 'red'} />
                    <Row label="Remarks" value={s6?.remarks || "-"} />
                    {/* <RowLink label="IMS Stock Link" href={s6?.dispatchstatusuploadurl} text="Click Here" /> */}
                    <RowLink label="Dispatch Image" href={s6?.dispatchimage || order.dispatchImage} text="View Image" isLast />
                </InfoCard>
                <TimingCard order={order} stageIndex={6} />
            </div>
        );
    }

    if (stageIndex === 7) {
        const s7 = order.stages?.[7];
        const status = getStageStatusData(stageIndex, order);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoCard title="Tracking Updates" titleColor="#185FA5"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1v12M1 7h12" stroke="#185FA5" strokeWidth="1.3" strokeLinecap="round" />
                            <circle cx="7" cy="7" r="5" stroke="#185FA5" strokeWidth="1.3" />
                        </svg>
                    }
                    badge={<StatusBadge label={status.label} type={status.type} />}
                    highlight
                >
                    <Row label="Tracking ID" value={s7?.trackingid || "-"} />
                    <Row label="Dispatch Through" value={s7?.dispatchthrough || s7?.dispatchtrough || order?.dispatchThrough || "-"} />
                    <Row label="Tracking URL" value={s7?.trackingurl || "-"} />
                </InfoCard>
                <TimingCard order={order} stageIndex={7} />
            </div>
        );
    }

    if (stageIndex === 8) {
        const s8 = order.stages?.[8];
        const status = getStageStatusData(stageIndex, order);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoCard title="Stock Deduction" titleColor="#7B3FA0"
                    icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 4h12M1 7h12M1 10h12" stroke="#7B3FA0" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                    }
                    badge={<StatusBadge label={status.label} type={status.type} />}
                    highlight
                >
                    <Row label="Deduction Status" value={s8?.deductionstatus || s8?.status || "-"} color="amber" />
                    <Row label="Deducted By" value={s8?.deductedby || s8?.user || '-'} />
                    <Row label="Deduction Date" value={s8?.deductiondate || s8?.actual || '-'} />
                    {/* <Row label="System Sync" value="-" color="amber" /> */}
                    <Row label="Remarks" value={s8?.remarks || "-"} />
                </InfoCard>
                <TimingCard order={order} stageIndex={8} />
            </div>
        );
    }


    return null;
}

/* ─────────────────────────────────────────────
   STAGE MODAL — DARK THEME (matches screenshot)
───────────────────────────────────────────── */
function StageModal({
    state,
    onClose,
}: {
    state: StageModalState;
    onClose: () => void;
}) {
    const { order, stageIndex } = state;

    const status = getStageStatusData(stageIndex, order);

    const stageStatusType = status.type;
    const stageStatusLabel = status.label.toUpperCase();

    const piNo = order.piLink || '-';

    const headerChip: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.12)',
        padding: '5px 10px', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.18)',
    };

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            className="fixed inset-0 bg-black/45 flex items-start justify-center z-[1000] p-4 sm:p-6 overflow-y-auto"
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 16,
                    width: '100%',
                    maxWidth: 680,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                }}
            >
                {/* ── GRADIENT HEADER ── */}
                <div
                    className="p-4 sm:p-5"
                    style={{
                        background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 60%, #378ADD 100%)',
                    }}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-sm sm:text-base font-medium text-white/85 m-0 flex flex-wrap items-center gap-2">
                                {STAGE_NAMES[stageIndex]} —{' '}
                                <span className="text-white font-bold">{order.orderId}</span>
                            </h2>
                            <span style={{
                                alignSelf: 'flex-start',
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: status.type === 'done' ? '#EAF3DE' : status.type === 'fail' ? '#FCEBEB' : '#FFF3CD',
                                color: status.type === 'done' ? '#27500A' : status.type === 'fail' ? '#791F1F' : '#7A5200',
                                border: '1px solid rgba(255,255,255,0.2)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                <span className="flex items-center gap-1.5">
                                    {stageStatusLabel}
                                    <EditedCancelledInfo label={stageStatusLabel} />
                                </span>
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: 30, height: 30, borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.25)',
                                background: 'rgba(255,255,255,0.12)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, color: '#fff', flexShrink: 0,
                            }}
                        >×</button>
                    </div>

                    {/* chips row inside header */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <div style={headerChip}>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <rect x="1" y="1" width="12" height="12" rx="2.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" />
                                <path d="M4 5h6M4 7.5h4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" strokeLinecap="round" />
                            </svg>
                            <span className="text-xs text-white font-medium">{order.name}</span>
                        </div>
                        <div style={headerChip}>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <path d="M3 2h2.5l1 2.5-1.5 1a7 7 0 003 3l1-1.5L11.5 8V10.5A1.5 1.5 0 0110 12C5.5 12 2 8.5 2 4a1.5 1.5 0 011.5-1.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" strokeLinecap="round" />
                            </svg>
                            <span className="text-xs text-white">+91 {order.mobile.replace(/^91/, '').replace(/(\d{5})(\d{5})/, '$1 $2')}</span>
                        </div>
                        <div style={headerChip}>
                            <span className="text-xs text-white">{piNo}</span>
                        </div>
                        <a
                            href={order.piUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-3 py-1.5 rounded-md border-[1.5px] border-white text-[#185FA5] bg-white hover:bg-white/90 transition-colors cursor-pointer font-bold inline-flex items-center gap-1 no-underline"
                        >
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path d="M2 2h6.5M8.5 2v6.5M2 10L8.5 2" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                            View PI
                        </a>
                        {(order.invoiceLink || order.uploadedImageLink) && (
                            <a
                                href={order.invoiceLink || order.uploadedImageLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-3 py-1.5 rounded-md border-[1.5px] border-white text-[#185FA5] bg-white hover:bg-white/90 transition-colors cursor-pointer font-bold inline-flex items-center gap-1 no-underline"
                            >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 2h6.5M8.5 2v6.5M2 10L8.5 2" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                                Invoice Link
                            </a>
                        )}
                    </div>
                </div>

                {/* ── STAGE-SPECIFIC CONTENT ── */}
                <div className="p-4 sm:p-6">
                    <StageContent stageIndex={stageIndex} order={order} />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function NewOrderFMS() {
    const { user } = useAuth()
    var { orders, loading: apiLoading, error: apiError, refresh, fetchingStageIndex } = useNewOrderFMS();
    const [search, setSearch] = useState('');
    const [filterOrderType, setFilterOrderType] = useState('All');
    const [filterBillingType, setFilterBillingType] = useState('All');
    const [filterStage, setFilterStage] = useState('All');
    const [filterTakenBy, setFilterTakenBy] = useState('All');
    const [datePreset, setDatePreset] = useState('this_week');

    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [stageModal, setStageModal] = useState<StageModalState | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [goPage, setGoPage] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });
    const [lastUpdated, setLastUpdated] = useState('');

    useEffect(() => {
        const now = new Date();
        const formatted = now.toLocaleDateString('en-GB').replace(/\//g, '/') + ', ' +
            now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastUpdated(formatted);
    }, []);

    if (orders.length > 0 && user) {
        if (user.permissions && user.permissions.includes('new-order-fms.viewSelf')) {
            orders = orders.filter(o => o.orderTakenBy === user.name);
        }
    }

    const uniqueOrderTypes = useMemo(() => {
        const types = new Set(orders.map(o => o.orderType).filter(Boolean));
        return Array.from(types).sort();
    }, [orders]);

    const uniqueBillingTypes = useMemo(() => {
        const types = new Set(orders.map(o => o.billingType).filter(Boolean));
        return Array.from(types).sort();
    }, [orders]);

    const uniqueAgents = useMemo(() => {
        const agents = new Set(orders.map(o => o.orderTakenBy).filter(Boolean));
        return Array.from(agents).sort();
    }, [orders]);




    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Loading state is now handled by the hook


    /**
     * Reusable custom date parser for DD/MM/YYYY HH:mm:ss format
     */
    const parseCustomDate = (str: string) => {
        if (!str || str === '—' || str === '' || str === ' ') return new Date(NaN);

        const parts = str.trim().split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || '';

        const dateParts = datePart.split('/');
        if (dateParts.length === 3) {
            const d = parseInt(dateParts[0], 10);
            const m = parseInt(dateParts[1], 10) - 1;
            const y = parseInt(dateParts[2], 10);

            const date = new Date(y, m, d);

            if (timePart) {
                const timeParts = timePart.split(':');
                const hh = parseInt(timeParts[0], 10) || 0;
                const mm = parseInt(timeParts[1], 10) || 0;
                const ss = parseInt(timeParts[2], 10) || 0;
                date.setHours(hh, mm, ss, 0);
            } else {
                date.setHours(0, 0, 0, 0);
            }
            return date;
        }

        // Fallback for ISO or other formats
        const date = new Date(str);
        return date;
    };

    const parseDateStr = (str: string) => {
        const d = parseCustomDate(str);
        if (isNaN(d.getTime())) return d;
        // Normalize to 00:00:00 for date-only comparisons
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const isInDateRange = (timestamp: string) => {
        if (datePreset === 'all') return true;
        const d = parseDateStr(timestamp);
        if (isNaN(d.getTime())) return false;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (datePreset) {
            case 'today':
                return d.getTime() === today.getTime();
            case 'yesterday': {
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                return d.getTime() === yesterday.getTime();
            }
            case 'this_week': {
                const startOfWeek = new Date(today);
                const day = today.getDay() || 7; // Sunday as 7
                startOfWeek.setDate(today.getDate() - (day - 1));
                return d >= startOfWeek && d <= today;
            }
            case 'last_7_days': {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                return d >= sevenDaysAgo && d <= today;
            }
            case 'last_week': {
                const day = today.getDay() || 7;
                const startOfLastWeek = new Date(today);
                startOfLastWeek.setDate(today.getDate() - day - 6);
                const endOfLastWeek = new Date(today);
                endOfLastWeek.setDate(today.getDate() - day);
                return d >= startOfLastWeek && d <= endOfLastWeek;
            }
            case 'this_month':
                return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
            case 'last_month': {
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
            }
            case 'this_year':
                return d.getFullYear() === today.getFullYear();
            case 'last_year':
                return d.getFullYear() === today.getFullYear() - 1;
            case 'custom': {
                if (!customDateRange.start || !customDateRange.end) return true;
                const [sY, sM, sD] = customDateRange.start.split('-').map(Number);
                const [eY, eM, eD] = customDateRange.end.split('-').map(Number);
                const cS = new Date(sY, sM - 1, sD);
                const cE = new Date(eY, eM - 1, eD);
                return d >= cS && d <= cE;
            }
            default:
                return true;
        }
    };

    const parseFullDateStr = (str: string) => {
        return parseCustomDate(str);
    };


    const filtered = useMemo(() => {
        return orders.filter((o) => {

            const q = search.toLowerCase();
            if (
                q &&
                !String(o.name || "").toLowerCase().includes(q) &&
                !String(o.orderId || "").toLowerCase().includes(q) &&
                !String(o.buyerId || "").toLowerCase().includes(q) &&
                !String(o.mobile || "").includes(q) &&
                !String(o.email || "").toLowerCase().includes(q)
            )
                return false;
            if (filterOrderType !== 'All' && o.orderType !== filterOrderType) return false;
            if (filterBillingType !== 'All' && o.billingType !== filterBillingType) return false;
            if (filterTakenBy !== 'All' && o.orderTakenBy !== filterTakenBy) return false;
            if (filterStage !== 'All') {
                const si = parseInt(filterStage);
                if (o.activeStage !== si) return false;
            }
            if (!isInDateRange(o.timestamp)) return false;

            return true;
        });
    }, [orders, search, filterOrderType, filterBillingType, filterStage, filterTakenBy, datePreset, customDateRange]);


    /* KPI */
    const kpi = useMemo(() => {
        const total = filtered.length;
        const totalValue = filtered.reduce((acc, o) => acc + parseCurrency(o.invoiceAmount), 0);

        // Derive category for each order based on all 9 workflow stages to ensure KPI matches table
        const categorizedOrders = filtered.map(o => {
            const stageStatuses = Array.from({ length: 9 }, (_, i) => getStageStatusData(i, o));

            let category: 'Completed' | 'Pending' | 'Hold' | 'Cancelled' | 'InProgress' = 'InProgress';

            const hasCancelled = stageStatuses.some(
                (s) => s.label === 'Cancelled' || s.label === 'Edited-Cancelled'
            );
            const hasHold = stageStatuses.some((s) => s.label === 'Hold');
            const hasPending = stageStatuses.some((s) => s.label === 'Pending');
            const allCompleted = stageStatuses.every((s) => s.label === 'Completed');
            const stage0Completed = stageStatuses[0]?.label === 'Completed';

            if (hasCancelled) {
                category = 'Cancelled';
            } else if (hasHold) {
                category = 'Hold';
            } else if (hasPending || !stage0Completed) {
                category = 'Pending';
            } else if (allCompleted) {
                category = 'Completed';
            } else {
                category = 'InProgress';
            }

            return { ...o, category };
        });

        const completedOrders = categorizedOrders.filter(o => o.category === 'Completed');
        const completed = completedOrders.length;
        const completedValue = completedOrders.reduce((acc, o) => acc + parseCurrency(o.invoiceAmount), 0);
        const pendingOrders = categorizedOrders.filter(o => o.category === 'Pending');
        const holdOrders = categorizedOrders.filter(o => o.category === 'Hold');
        const hold = holdOrders.length;
        const holdValue = holdOrders.reduce((acc, o) => acc + parseCurrency(o.invoiceAmount), 0);

        const cancelledOrders = categorizedOrders.filter(o => o.category === 'Cancelled');
        const cancelled = cancelledOrders.length;
        const cancelledValue = cancelledOrders.reduce((acc, o) => acc + parseCurrency(o.invoiceAmount), 0);

        const inProgressOrders = categorizedOrders.filter(o => o.category === 'InProgress');
        const inProgress = inProgressOrders.length;
        const inProgressValue = inProgressOrders.reduce((acc, o) => acc + parseCurrency(o.invoiceAmount), 0);

        const pending = pendingOrders.length + inProgress;
        const pendingValue = pendingOrders.reduce((acc, o) => acc + parseCurrency(o.invoiceAmount), 0) + inProgressValue;

        const delayed = filtered.filter((o) => o.actualDelay !== '—').length;

        return {
            total, totalValue,
            inProgress, inProgressValue,
            completed, completedValue,
            pending, pendingValue,
            delayed,
            cancelled, cancelledValue,
            hold, holdValue
        };
    }, [filtered]);


    /* SORTING */
    const sortedData = useMemo(() => {
        if (!sortConfig) return filtered;
        return [...filtered].sort((a, b) => {
            const key = sortConfig.key as keyof Order;
            const aVal = a[key] ?? '';
            const bVal = b[key] ?? '';

            if (key === 'timestamp' || key === 'paymentCollectionDate') {
                const dateA = parseFullDateStr(aVal as string).getTime();
                const dateB = parseFullDateStr(bVal as string).getTime();
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filtered, sortConfig]);

    /* PAGINATION */
    const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
    const paginated = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const clearFilters = () => {
        setSearch('');
        setFilterOrderType('All');
        setFilterBillingType('All');
        setFilterStage('All');
        setFilterTakenBy('All');
        setDatePreset('all');
        setCustomDateRange({ start: '', end: '' });
        setSortConfig({ key: 'timestamp', direction: 'desc' });
        setCurrentPage(1);
    };

    /* STYLES */
    const thBase: React.CSSProperties = {
        padding: '8px 12px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        textAlign: 'left',
        fontSize: 13,
        borderRight: '1px solid rgba(255,255,255,0.08)',
    };
    const thDetail: React.CSSProperties = {
        ...thBase,
        background: '#2b3235',
        color: '#ffffff',
    };
    const thStage: React.CSSProperties = {
        ...thBase,
        background: '#0581a0',
        color: '#ffffff',
        textAlign: 'center',
        fontSize: 12,
    };

    const SortableHeader = ({ label, sortKey, style }: { label: string, sortKey: string, style: React.CSSProperties }) => {
        const isActive = sortConfig?.key === sortKey;
        return (
            <th
                style={{ ...style, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort(sortKey)}
                className="hover:bg-[#3d4548] transition-colors"
            >
                <div className="flex items-center gap-2">
                    {label}
                    {isActive ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                </div>
            </th>
        );
    };
    const tdBase: React.CSSProperties = {
        padding: '8px 12px',
        fontSize: 13,
        color: '#1a1a2e',
        borderRight: '1px solid #e5e7eb',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
    };
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const stickyBase: React.CSSProperties = {
        position: 'sticky',
        zIndex: 1,
    };

    const selectStyle: React.CSSProperties = {
        padding: '7px 10px',
        borderRadius: 6,
        border: '1px solid #e0d8cc',
        background: '#fff',
        fontSize: 13,
        color: '#1a1a2e',
        cursor: 'pointer',
    };
    const inputStyle: React.CSSProperties = {
        padding: '7px 12px',
        borderRadius: 6,
        border: '1px solid #e0d8cc',
        background: '#fff',
        fontSize: 13,
        color: '#1a1a2e',
        outline: 'none',
    };

    return (
        <div style={{ background: '#f4f6fa', minHeight: '100vh', width: '100%', fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <Loader isLoading={apiLoading && orders.length === 0} contentOnly={true} />


            <div style={{
                opacity: (apiLoading && orders.length === 0) ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out'
            }}>

                {/* ── PAGE HEADER (Premium Villa Raag Style - Full Width Breakout) ── */}
                <div className="relative overflow-hidden -mt-6 sm:-mt-10 -mx-4 sm:-mx-6 lg:-mx-8 mb-6 border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
                    style={{ background: 'linear-gradient(135deg, #0f1f45 0%, #162d6b 45%, #1a3080 100%)' }}>

                    {/* Ambient depth layers */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-600/10 pointer-events-none" />
                    <div className="absolute -top-10 left-1/4 w-[500px] h-32 bg-blue-400/10 blur-3xl rounded-full pointer-events-none" />
                    <div className="absolute -top-6 right-1/4 w-64 h-20 bg-indigo-400/10 blur-2xl rounded-full pointer-events-none" />

                    <div className="relative w-full px-4 sm:px-6 lg:px-8 py-5">
                        <BackButton className="mb-4" />
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div className="flex items-center gap-5">
                                {/* ICON CONTAINER */}
                                <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 border border-blue-300/25 shadow-[0_0_24px_rgba(147,197,253,0.2)]"
                                    style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.25) 100%)' }}>
                                    <Box className="h-7 w-7 text-blue-200" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white drop-shadow-sm">
                                        New Order FMS
                                    </h1>
                                    <p className="text-sm lg:text-base mt-1.5 font-normal tracking-wide text-blue-200/55">
                                        Order Management&nbsp;&nbsp;·&nbsp;&nbsp;Stage Tracking&nbsp;&nbsp;·&nbsp;&nbsp;Real-time Monitoring
                                    </p>
                                </div>
                            </div>

                            {/* LAST UPDATED */}
                            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                                <div className="w-full sm:w-auto rounded-xl px-4 py-3 border border-blue-300/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <p className="text-xs text-blue-300/50 font-semibold uppercase tracking-widest">
                                        Last Updated
                                    </p>
                                    <p className="text-sm font-semibold text-white/80 mt-1">
                                        {lastUpdated}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* ── CONTENT ── */}
                <div style={{ padding: '0px 0px 32px 0px', display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>

                    {/* ── FILTERS (Professional Upgrade) ── */}
                    <div className="mt-4">
                        <div className="rounded-xl border border-slate-200 bg-white shadow-md">

                            {/* HEADER */}
                            <div className="
            flex flex-col sm:flex-row
            items-start sm:items-center
            justify-between
            gap-4
            px-4 sm:px-5
            py-4
            bg-gradient-to-r from-blue-50 via-white to-indigo-50
            border-b border-slate-200
        ">
                                <div className="flex items-center gap-3">
                                    <div className="
                    w-9 h-9 sm:w-10 sm:h-10
                    rounded-lg
                    bg-gradient-to-br
                    from-[#0f172a]
                    via-[#1e3a5f]
                    to-[#1d4ed8]
                    flex items-center justify-center
                    shadow-md
                    border border-[#1e40af]/40
                ">
                                        <Filter className="w-5 h-5 text-white" />
                                    </div>

                                    <div>
                                        <h3 className="text-base font-semibold text-[#1e3a5f]">
                                            Filters & Search
                                        </h3>
                                        <p className="text-xs text-[#64748b]">
                                            Refine your order feed using smart parameters
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={clearFilters}
                                    className="
                    w-full sm:w-auto
                    bg-gradient-to-r from-[#1e3a5f] to-[#1d4ed8]
                    text-white
                    border-none
                    hover:opacity-90
                    shadow-sm
                "
                                >
                                    Clear Filters
                                </Button>
                            </div>

                            {/* CONTENT */}
                            <div className="px-4 sm:px-6 py-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">

                                    {/* SEARCH */}
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <Label className="text-[11px] font-medium uppercase tracking-wide text-[#1e3a5f]">
                                            Search Orders
                                        </Label>
                                        <div className="relative w-full">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1d4ed8]" />
                                            <Input
                                                placeholder="Order ID, Client..."
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value)
                                                    setCurrentPage(1)
                                                }}
                                                className="
                                h-10 w-full pl-9 text-sm
                                border-[#bfdbfe]
                                focus:border-[#1d4ed8]
                                focus:ring-1 focus:ring-[#1d4ed8]/20
                                rounded-md
                                transition-all duration-200
                            "
                                            />
                                        </div>
                                    </div>

                                    {/* DATE RANGE */}
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <Label className="text-[11px] font-medium uppercase tracking-wide text-[#1e3a5f]">
                                            Date Range
                                        </Label>
                                        <Select value={datePreset} onValueChange={(v) => { setDatePreset(v); setCurrentPage(1) }}>
                                            <SelectTrigger className="h-10 w-full text-sm border-[#bfdbfe] focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]/20 rounded-md">
                                                <SelectValue placeholder="All Dates" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Dates</SelectItem>
                                                <SelectItem value="today">Today</SelectItem>
                                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                                <SelectItem value="this_week">This Week</SelectItem>
                                                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                                                <SelectItem value="last_week">Last Week</SelectItem>
                                                <SelectItem value="this_month">This Month</SelectItem>
                                                <SelectItem value="last_month">Last Month</SelectItem>
                                                <SelectItem value="this_year">This Year</SelectItem>
                                                <SelectItem value="last_year">Last Year</SelectItem>
                                                <SelectItem value="custom">Custom Range</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* ORDER TYPE */}
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <Label className="text-[11px] font-medium uppercase tracking-wide text-[#1e3a5f]">
                                            Order Type
                                        </Label>
                                        <Select value={filterOrderType} onValueChange={(v) => { setFilterOrderType(v); setCurrentPage(1) }}>
                                            <SelectTrigger className="h-10 w-full text-sm border-[#bfdbfe] focus:border-[#1d4ed8] rounded-md">
                                                <SelectValue placeholder="All Types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All">All Types</SelectItem>
                                                {uniqueOrderTypes.map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>

                                        </Select>
                                    </div>

                                    {/* BILLING TYPE */}
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <Label className="text-[11px] font-medium uppercase tracking-wide text-[#1e3a5f]">
                                            Billing Type
                                        </Label>
                                        <Select value={filterBillingType} onValueChange={(v) => { setFilterBillingType(v); setCurrentPage(1) }}>
                                            <SelectTrigger className="h-10 w-full text-sm border-[#bfdbfe] focus:border-[#1d4ed8] rounded-md">
                                                <SelectValue placeholder="All Billing" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All">All Billing</SelectItem>
                                                {uniqueBillingTypes.map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>

                                        </Select>
                                    </div>

                                    {/* STAGE */}
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <Label className="text-[11px] font-medium uppercase tracking-wide text-[#1e3a5f]">
                                            Order Stage
                                        </Label>
                                        <Select value={filterStage} onValueChange={(v) => { setFilterStage(v); setCurrentPage(1) }}>
                                            <SelectTrigger className="h-10 w-full text-sm border-[#bfdbfe] focus:border-[#1d4ed8] rounded-md">
                                                <SelectValue placeholder="All Stages" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All">All Stages</SelectItem>
                                                {STAGE_SHORT.map((s, i) => (
                                                    <SelectItem key={i} value={String(i)}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* TAKEN BY */}
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <Label className="text-[11px] font-medium uppercase tracking-wide text-[#1e3a5f]">
                                            Taken By
                                        </Label>
                                        <Select value={filterTakenBy} onValueChange={(v) => { setFilterTakenBy(v); setCurrentPage(1) }}>
                                            <SelectTrigger className="h-10 w-full text-sm border-[#bfdbfe] focus:border-[#1d4ed8] rounded-md">
                                                <SelectValue placeholder="All Agents" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All">All Agents</SelectItem>
                                                {uniqueAgents.map(a => (
                                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                                ))}
                                            </SelectContent>

                                        </Select>
                                    </div>

                                </div>

                                {/* CUSTOM DATE */}
                                {datePreset === "custom" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#bfdbfe]">
                                        <Input
                                            className="h-10 w-full border-[#bfdbfe] focus:border-[#1d4ed8]"
                                            type="date"
                                            value={customDateRange.start}
                                            onChange={(e) => {
                                                setCustomDateRange(prev => ({ ...prev, start: e.target.value }));
                                                setCurrentPage(1);
                                            }}
                                        />
                                        <Input
                                            className="h-10 w-full border-[#bfdbfe] focus:border-[#1d4ed8]"
                                            type="date"
                                            value={customDateRange.end}
                                            onChange={(e) => {
                                                setCustomDateRange(prev => ({ ...prev, end: e.target.value }));
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* ── KPI CARDS (Premium Grid) ── */}
                    <div className="mt-5">

                        {/* ================= KPI WRAPPER ================= */}
                        <div className="
    rounded-2xl
    border border-[#dbeafe]
    bg-[#f8fafc]
    shadow-[0_10px_30px_rgba(30,58,138,0.08)]
    px-4 sm:px-5 py-5
  ">

                            {/* ================= UPDATED HEADER ================= */}
                            <div className="flex items-center justify-between mb-4">

                                <div className="flex items-center gap-3">

                                    {/* ICON */}
                                    <div className="
          w-10 h-10
          rounded-lg
          bg-gradient-to-br from-[#2563eb] to-[#1e40af]
          flex items-center justify-center
          shadow-md
        ">
                                        <BarChart3 className="w-5 h-5 text-white" />
                                    </div>

                                    {/* TEXT */}
                                    <div>
                                        <h3 className="text-base font-semibold text-[#1e3a8a]">
                                            Key Performance Indicators
                                        </h3>
                                        <p className="text-xs text-[#64748b]">
                                            Overview of order metrics & performance
                                        </p>
                                    </div>

                                </div>




                            </div>

                            {/* ================= KPI GRID ================= */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

                                {/* TOTAL ORDERS */}
                                <div className="rounded-xl border border-[#93c5fd] bg-blue-50 p-5 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
                                                Total Orders
                                            </p>
                                            <p className="text-2xl font-bold text-[#0f172a]">{kpi.total}</p>
                                            <p className="text-sm font-medium text-emerald-600">
                                                {formatCurrency(kpi.totalValue)}
                                            </p>
                                        </div>

                                        <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <Package className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                                            All Records
                                        </span>
                                    </div>
                                </div>

                                {/* COMPLETED */}
                                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
                                                Completed
                                            </p>
                                            <p className="text-2xl font-bold text-[#0f172a]">{kpi.completed}</p>
                                            <p className="text-sm font-medium text-emerald-600">
                                                {formatCurrency(kpi.completedValue)}
                                            </p>
                                        </div>

                                        <div className="h-11 w-11 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                                        </div>
                                    </div>

                                    {/* <div className="mt-3">
                                        <span className="text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">
                                            Stage 6
                                        </span>
                                    </div> */}
                                </div>

                                {/* PENDING */}
                                <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
                                                Pending
                                            </p>
                                            <p className="text-2xl font-bold text-[#0f172a]">{kpi.pending}</p>
                                            <p className="text-sm font-medium text-rose-600">
                                                {formatCurrency(kpi.pendingValue)}
                                            </p>
                                        </div>

                                        <div className="h-11 w-11 rounded-lg bg-rose-50 flex items-center justify-center">
                                            <Clock className="h-5 w-5 text-rose-500" />
                                        </div>
                                    </div>

                                    {/* <div className="mt-3">
                                        <span className="text-xs px-2 py-1 rounded-md bg-rose-100 text-rose-600">
                                            Stage 0
                                        </span>
                                    </div> */}
                                </div>

                                {/* HOLD */}
                                <div className="rounded-xl border border-violet-300 bg-violet-50 p-5 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
                                                Hold
                                            </p>
                                            <p className="text-2xl font-bold text-[#0f172a]">{kpi.hold}</p>
                                            <p className="text-sm font-medium text-violet-600">
                                                {formatCurrency(kpi.holdValue)}
                                            </p>
                                        </div>

                                        <div className="h-11 w-11 rounded-lg bg-violet-50 flex items-center justify-center">
                                            <PauseCircle className="h-5 w-5 text-violet-500" />
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <span className="text-xs px-2 py-1 rounded-md bg-violet-100 text-violet-700">
                                            On Hold
                                        </span>
                                    </div>
                                </div>

                                {/* CANCELLED */}
                                <div className="rounded-xl border border-pink-300 bg-pink-50 p-5 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
                                                Cancelled
                                            </p>
                                            <p className="text-2xl font-bold text-[#0f172a]">{kpi.cancelled}</p>
                                            <p className="text-sm font-medium text-slate-600">
                                                {formatCurrency(kpi.cancelledValue)}
                                            </p>
                                        </div>

                                        <div className="h-11 w-11 rounded-lg bg-slate-50 flex items-center justify-center">
                                            <XCircle className="h-5 w-5 text-slate-500" />
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                                            Terminated
                                        </span>
                                    </div>
                                </div>


                            </div>
                        </div>
                    </div>

                    {/* ── TABLE SECTION ── */}
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        {/* Table header bar */}
                        <div
                            className="bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200"
                            style={{
                                padding: '10px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600/10 p-2 rounded-lg border border-blue-200">
                                    <Package className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wider leading-none">Order FMS Records</h3>
                                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                        {filtered.length} of {orders.length} total orders
                                    </p>

                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-600 border-none font-bold">
                                {filtered.length} Records
                            </Badge>
                        </div>

                        {/* Scrollable table */}
                        <div className="overflow-x-auto">
                            <table
                                style={{
                                    borderCollapse: 'collapse',
                                    width: 'max-content',
                                    minWidth: '100%',
                                    fontSize: 13,
                                }}
                            >
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th style={{ ...thDetail, position: 'sticky', left: 0, zIndex: 3, minWidth: 40, borderRight: '2px solid rgba(255,255,255,0.2)' }}>S.NO</th>
                                        <SortableHeader label="Order Date & Time" sortKey="timestamp" style={{ ...thDetail, ...(isMobile ? {} : { position: 'sticky', left: 40, zIndex: 3 }), minWidth: 130, borderRight: '1px solid rgba(255,255,255,0.1)' }} />
                                        <SortableHeader label="Buyer ID" sortKey="buyerId" style={{ ...thDetail, ...(isMobile ? {} : { position: 'sticky', left: 170, zIndex: 3 }), minWidth: 90, borderRight: '1px solid rgba(255,255,255,0.1)' }} />
                                        <SortableHeader label="Order ID" sortKey="orderId" style={{ ...thDetail, ...(isMobile ? {} : { position: 'sticky', left: 260, zIndex: 3 }), minWidth: 90, borderRight: '1px solid rgba(255,255,255,0.1)' }} />
                                        <th style={{ ...thDetail, position: 'sticky', left: isMobile ? 40 : 350, zIndex: 3, minWidth: 200, borderRight: '2px solid rgba(255,255,255,0.2)' }}>Client Details</th>
                                        <SortableHeader label="Billing Type" sortKey="billingType" style={{ ...thDetail, minWidth: 110, borderRight: '1px solid rgba(255,255,255,0.1)' }} />
                                        <SortableHeader label="Order Type" sortKey="orderType" style={{ ...thDetail, minWidth: 100 }} />
                                        <th style={{ ...thDetail, minWidth: 300 }}>Billing Address</th>
                                        <th style={{ ...thDetail, minWidth: 300 }}>Shipping Address</th>

                                        <th style={{ ...thDetail, minWidth: 120 }}>Invoice Amount</th>
                                        {/* <th style={{ ...thDetail, minWidth: 170 }}>Total Amt</th>
                                    <th style={{ ...thDetail, minWidth: 140 }}>Image</th> */}
                                        <SortableHeader label="Payment Terms" sortKey="paymentTerms" style={{ ...thDetail, minWidth: 120 }} />
                                        <SortableHeader label="Payment Collection Date" sortKey="paymentCollectionDate" style={{ ...thDetail, minWidth: 160 }} />
                                        <SortableHeader label="Order Taken By" sortKey="orderTakenBy" style={{ ...thDetail, minWidth: 130 }} />
                                        <th style={{ ...thDetail, minWidth: 120 }}>WhatsApp SMS</th>
                                        <SortableHeader label="PI No" sortKey="piLink" style={{ ...thDetail, minWidth: 100 }} />
                                        <th style={{ ...thDetail, minWidth: 80 }}>PI URL</th>

                                        {/* <th style={{ ...thDetail, minWidth: 135 }}>Planned</th>
                                    <th style={{ ...thDetail, minWidth: 120 }}>Actual Delay</th>
                                    <th style={{ ...thDetail, minWidth: 135 }}>FMS User Name</th> */}
                                        {STAGE_NAMES.map((s) => (
                                            <th key={s} style={{ ...thStage, minWidth: s === 'Order QC and Packed Status' ? 175 : 140 }}>
                                                {s}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {apiLoading && orders.length === 0 ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={19 + STAGE_NAMES.length} className="p-10 text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <RefreshCw className="animate-spin h-5 w-5 text-slate-300" />
                                                        <span className="text-slate-400 font-medium text-sm italic">Loading your order data...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : apiError ? (
                                        <tr>
                                            <td colSpan={19 + STAGE_NAMES.length} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <AlertCircle className="h-10 w-10 text-rose-500" />
                                                    <p className="text-rose-600 font-bold">{apiError}</p>
                                                    <Button onClick={refresh} variant="outline" className="mt-2">Try Again</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginated.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={19 + STAGE_NAMES.length}
                                                style={{ padding: '60px', textAlign: 'center' }}
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                        <Package className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                    <p className="font-bold text-slate-500 uppercase tracking-widest text-base">No orders found</p>
                                                    <p className="text-sm text-slate-400 font-medium">Try adjusting your filters or search terms.</p>
                                                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-slate-600 border-slate-200 font-bold hover:bg-slate-50">
                                                        Reset All Filters
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((o, idx) => {
                                            const rowBg = idx % 2 === 1 ? '#f9fafb' : '#fff';
                                            const sn = (currentPage - 1) * rowsPerPage + idx + 1;
                                            return (
                                                <tr key={o.id} style={{ borderBottom: '1px solid #e5e7eb', background: rowBg }} className="hover:bg-slate-50 shadow-sm transition-colors">
                                                    <td style={{ ...tdBase, ...stickyBase, left: 0, background: rowBg, minWidth: 40, textAlign: 'center', color: '#888', zIndex: 1, borderRight: '2px solid #e2e8f0' }}>
                                                        {sn}
                                                    </td>
                                                    <td style={{ ...tdBase, ...(isMobile ? {} : { ...stickyBase, left: 40, zIndex: 1 }), background: rowBg, minWidth: 130, fontSize: 12, borderRight: '1px solid #e5e7eb' }}>
                                                        {o.timestamp}
                                                    </td>
                                                    <td style={{ ...tdBase, ...(isMobile ? {} : { ...stickyBase, left: 170, zIndex: 1 }), background: rowBg, minWidth: 90, borderRight: '1px solid #e5e7eb' }}>
                                                        {o.buyerId}
                                                    </td>
                                                    <td style={{ ...tdBase, ...(isMobile ? {} : { ...stickyBase, left: 260, zIndex: 1 }), background: rowBg, minWidth: 90, color: '#185FA5', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>
                                                        {o.orderId}
                                                    </td>
                                                    <td style={{ ...tdBase, ...stickyBase, left: isMobile ? 40 : 350, background: rowBg, minWidth: 200, zIndex: 1, borderRight: '2px solid #e2e8f0' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{o.name}</span>
                                                            <div className="flex flex-col gap-0.5 text-[11px] font-medium">
                                                                <span className="text-slate-500">{o.mobile}</span>
                                                                <span className="text-blue-600 truncate max-w-[150px]">{o.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdBase, background: 'inherit' }}>
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-[10px] px-2 py-0">
                                                            {o.billingType}
                                                        </Badge>
                                                    </td>
                                                    <td style={{ ...tdBase, background: 'inherit' }}>
                                                        <Badge variant="outline" className={`${getOrderTypeStyles(o.orderType)} font-bold text-[10px] px-2 py-0`}>
                                                            {o.orderType}
                                                        </Badge>
                                                    </td>
                                                    <td style={{ ...tdBase, background: 'inherit', fontSize: 12, maxWidth: 300, whiteSpace: 'normal', lineHeight: 1.4 }}>{o.billingAddress}</td>
                                                    <td style={{ ...tdBase, background: 'inherit', fontSize: 12, maxWidth: 300, whiteSpace: 'normal', lineHeight: 1.4 }}>{o.shippingAddress}</td>

                                                    <td style={{ ...tdBase, background: 'inherit', fontWeight: 600, color: '#059669' }}>{o.invoiceAmount}</td>
                                                    {/* <td style={{ ...tdBase, background: 'inherit' }}>{o.totalAmtBeforeDiscount}</td> */}
                                                    {/* <td style={{ ...tdBase, background: 'inherit' }}>
                                                    <a href={o.uploadedImageLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-[11px] flex items-center gap-1">
                                                        View Image <Box className="h-3 w-3" />
                                                    </a>
                                                </td> */}
                                                    <td style={{ ...tdBase, background: 'inherit' }}>{o.paymentTerms}</td>
                                                    <td style={{ ...tdBase, background: 'inherit', fontSize: 12 }}>{o.paymentCollectionDate}</td>
                                                    <td style={{ ...tdBase, background: 'inherit' }}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                                                                {getInitials(o.orderTakenBy)}
                                                            </div>
                                                            <span className="font-medium">{o.orderTakenBy}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdBase, background: 'inherit', textAlign: 'center' }}>
                                                        <span
                                                            style={{
                                                                padding: '2px 8px',
                                                                borderRadius: 20,
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                background:
                                                                    o.whatsappSMS === 'Sent' ? '#EAF3DE' : o.whatsappSMS === 'Failed' ? '#FCEBEB' : '#FFFBF0',
                                                                color:
                                                                    o.whatsappSMS === 'Sent' ? '#27500A' : o.whatsappSMS === 'Failed' ? '#791F1F' : '#BA7517',
                                                            }}
                                                        >
                                                            {o.whatsappSMS}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tdBase, background: 'inherit', textAlign: 'center', fontWeight: 600, color: '#185FA5' }}>
                                                        {o.piLink}
                                                    </td>
                                                    <td style={{ ...tdBase, background: 'inherit', fontSize: 12, textAlign: 'center' }}>
                                                        {o.piUrl ? (
                                                            <a href={o.piUrl} target="_blank" rel="noreferrer" style={{ color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 700 }}>
                                                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2h3.5M10 2v8H2V4.5M6 6l4-4M7 2h3v3" stroke="#185FA5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                View
                                                            </a>
                                                        ) : '—'}
                                                    </td>

                                                    {/* <td style={{ ...tdBase, background: 'inherit', fontSize: 12 }}>{o.planned}</td>
                                                <td style={{ ...tdBase, background: 'inherit', fontWeight: 600, color: o.actualDelay === '—' ? '#94a3b8' : '#e11d48' }}>
                                                    {o.actualDelay}
                                                </td>
                                                <td style={{ ...tdBase, background: 'inherit' }}>{o.fmsUserName}</td> */}
                                                    {STAGE_NAMES.map((_, si) => (
                                                        <td key={si} style={{ ...tdBase, background: 'inherit', textAlign: 'center' }}>
                                                            <StageBadge
                                                                order={o}
                                                                stageIndex={si}
                                                                fetchingStageIndex={fetchingStageIndex}
                                                                onClick={() => setStageModal({ order: o, stageIndex: si })}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div
                            style={{
                                padding: '12px 18px',
                                borderTop: '1px solid #e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666' }}>
                                <span>Rows</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    style={{ ...selectStyle, padding: '4px 8px', fontSize: 13 }}
                                >
                                    {[5, 10, 20, 50].map((n) => <option key={n}>{n}</option>)}
                                </select>
                                <span>
                                    Showing {filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}–
                                    {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, color: '#666' }}>
                                    Page {currentPage} of {totalPages}
                                </span>
                                <input
                                    type="number"
                                    value={goPage}
                                    onChange={(e) => setGoPage(e.target.value)}
                                    placeholder="Go"
                                    style={{ ...inputStyle, width: 60, padding: '4px 8px' }}
                                    min={1}
                                    max={totalPages}
                                />
                                <button
                                    onClick={() => {
                                        const p = parseInt(goPage);
                                        if (p >= 1 && p <= totalPages) { setCurrentPage(p); setGoPage(''); }
                                    }}
                                    style={{
                                        background: '#1c2333',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '5px 14px',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                    }}
                                >
                                    Go
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        background: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 6,
                                        padding: '5px 14px',
                                        fontSize: 13,
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        color: currentPage === 1 ? '#bbb' : '#1a1a2e',
                                    }}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        background: '#1c2333',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '5px 14px',
                                        fontSize: 13,
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.6 : 1,
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div >

                {stageModal && (
                    <StageModal
                        state={stageModal}
                        onClose={() => setStageModal(null)}
                    />
                )}
            </div>
        </div>
    )
}
