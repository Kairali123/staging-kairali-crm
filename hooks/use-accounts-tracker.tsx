import { useState, useEffect, useCallback } from 'react';

export interface SalesVerifyStage {
    piNo: string;
    bookingPIAmount: string;
    totalBilledValue: string;
    checkOutDate: string;
    treatmentCharges?: string;
    extraPackageTreatment?: string;
    extraAdditionalTreatment?: string;
    ayurvedicMedicine?: string;
    pickDropCharges?: string;
    privateYoga?: string;
    remarks: string;
    invoiceLink?: string;
    status: 'Done' | 'Pending' | 'Discrepancy';
    verifiedBy?: string;
    verifiedAt?: string;
}

export interface PaymentVerifyStage {
    reservationId: string;
    piAmount: number;
    piAmountSales: number;
    piUrl?: string;
    tallyInvoiceAmount: number;
    additionalAmount: number;
    totalInvoiceAmount: number;
    amountReceived: number;
    bankReceivedDate: string;
    totalReceivedBank: number | null;  // stage2_total_received_amount_bank_date — null = overdue
    invoiceLink?: string;
    proofLink?: string;
    differenceAmount: number;
    differencePercentage: number;
    doer: string;
    verifyStatus: 'Verified Done' | 'Pending' | 'Discrepancy' | string;
    amtDiffReason: string;
    nameCorrect: string;
    remarks: string;
    verifiedBy?: string;
    verifiedAt?: string;
    planned?: string | null;
    actualRaw?: string | null;
    amountReceivedRaw?: number | null;
    proofLinkRaw?: string | null;
    managementVerify?: boolean | null;
    managementRemarks?: string | null;
    managementVerifiedBy?: string | null;
    managementVerifiedAt?: string | null;
}

export interface Booking {
    id: string;
    uid: string;
    bookingDate: string;
    clientName: string;
    email: string;
    mobile: string;
    arrivalDate: string;
    departureDate: string;
    daysOfStay: number;
    packageType: string;
    programmeName: string;
    roomType: string;
    roomCategory: string;
    roomNo: string;
    bookingTakenBy: string;
    month: string;
    year: number;
    company: string;
    bookingDateRaw: number;
    salesVerify: SalesVerifyStage;
    paymentVerify: PaymentVerifyStage;
}

const API_URL = '/api/account-tracker';

// dd/MM/yyyy or dd-MM-yyyy → Date
function parseDDMMYYYY(str: any): Date | null {
    if (!str || str === 'N/A') return null;

    if (str instanceof Date) return isNaN(str.getTime()) ? null : str;

    if (typeof str === 'number') {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    const s = String(str).trim();
    if (!s) return null;

    // dd-MM-yyyy aur dd/MM/yyyy dono support karo
    const [dd, mm, yyyy] = s.split(/[-\/]/);
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
}

// "dd/MM/yyyy" → "12 May 2026"
function fmtDate(str: string): string {
    const d = parseDDMMYYYY(str);
    if (!d) return str || '_';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// DateTime string like "5/18/2026 09:00:00" or ISO → "18 May 2026"
function fmtISO(str: string | null | undefined): string {
    if (!str || str === 'N/A' || str === 'NA' || str === '_') return '_';
    const d = new Date(str);
    if (isNaN(d.getTime())) return '_';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Null-safe URL cleaner — '_', 'NA', 'null', '' → empty string
function cleanUrl(v: any): string {
    if (!v || v === '_' || v === 'NA' || v === 'null' || v === 'NULL' || v === '-') return '';
    return String(v);
}

// Maps verifyStatus → SalesVerify status
function mapSalesStatus(status: any): 'Done' | 'Pending' | 'Discrepancy' {
    if (!status) return 'Pending';
    const s = String(status).toLowerCase();
    if (s === 'verified done' || s === 'done') return 'Done';
    if (s === 'discrepancy') return 'Discrepancy';
    return 'Pending';
}

export function useAccountsTracker() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch data');
            const result = await response.json();

            if (result.success === true && Array.isArray(result.data)) {
                const mappedData: Booking[] = result.data.map((item: any) => {
                    return {
                        // ── Core booking fields ──────────────────────────────────────
                        id: item.reservationId || '_',
                        uid: String(item.rowNumber),
                        bookingDate: fmtDate(item.bookingDateTime),
                        clientName: item.clientName || '_',
                        email: item.email || '_',
                        mobile: item.mobile || '_',
                        arrivalDate: fmtDate(item.arrivalDate),
                        departureDate: fmtDate(item.departureDate),
                        daysOfStay: item.daysOfStay || 0,
                        packageType: item.packageType || '_',
                        programmeName: item.programmePackageName || '_',
                        roomType: item.roomType || '_',
                        roomCategory: item.roomCategory || '_',
                        roomNo: String(item.roomNo || '_'),
                        bookingTakenBy: item.bookingtakenby || '_',
                        month: item.bookingMonth || '_',
                        year: parseDDMMYYYY(item.bookingDateTime)?.getFullYear() ?? new Date().getFullYear(),
                        company: 'KTAHV',
                        bookingDateRaw: parseDDMMYYYY(item.bookingDateTime)?.getTime() ?? 0,

                        // ── Stage 1 → salesVerify ────────────────────────────────────
                        salesVerify: {
                            piNo: '-',                                                  // no dedicated piNo field in API
                            bookingPIAmount: String(item.piAmountSales ?? 0),           // PI amount from sales
                            totalBilledValue: String(item.totalInvoiceAmount ?? 0),     // ✅ fixed: was using invoiceAmount, now totalInvoiceAmount (invoice + additional)
                            checkOutDate: fmtDate(item.departureDate),                  // ✅ fixed: was passing raw string, now formatted
                            remarks: item.remarks || '',
                            invoiceLink: cleanUrl(item.invoiceUrl),                     // ✅ fixed: was missing entirely
                            status: mapSalesStatus(item.verifyStatus),                  // ✅ fixed: now handles null + Discrepancy
                            verifiedBy: item.doer || undefined,                         // ✅ fixed: was missing
                            verifiedAt: item.actual ? fmtISO(item.actual) : undefined,  // ✅ fixed: was missing
                        } satisfies SalesVerifyStage,

                        // ── Stage 2 → paymentVerify ─────────────────────────────────
                        paymentVerify: {
                            reservationId: item.reservationId || '_',
                            piAmount: item.piAmountSales ?? 0,
                            piAmountSales: item.piAmountSales ?? 0,
                            piUrl: cleanUrl(item.piUrl),                                // ✅ fixed: now also strips '_' not just 'NA'
                            tallyInvoiceAmount: item.invoiceAmountTally ?? 0,
                            additionalAmount: item.additionalAmount ?? 0,               // ✅ fixed: was hardcoded 0
                            totalInvoiceAmount: item.totalInvoiceAmount ?? 0,           // ✅ fixed: was using invoiceAmount
                            amountReceived: item.amountReceivedTotal ?? 0,
                            bankReceivedDate: fmtISO(item.actual),                      // stage1_actual (kept for display)
                            totalReceivedBank: item.totalReceivedBank ?? null,           // ✅ stage2_total_received_amount_bank_date — null = overdue
                            invoiceLink: cleanUrl(item.invoiceUrl),                     // ✅ fixed: now also strips '_'
                            proofLink: cleanUrl(item.amountProofLink),                  // ✅ fixed: now also strips '_'
                            differenceAmount: item.differenceAmt ?? 0,
                            differencePercentage: item.differencePercent ?? 0,
                            doer: item.doer || 'Anuj Kumar Singh',
                            verifyStatus: (() => {
                                const status = item.verifyStatus || 'Pending';
                                if (String(status).trim().toLowerCase() === 'verified done') {
                                    const verifiedAtVal = item.actual ? fmtISO(item.actual) : '_';
                                    if (verifiedAtVal && verifiedAtVal !== '_') {
                                        return 'Verified Done';
                                    } else {
                                        return 'Pending';
                                    }
                                }
                                return status;
                            })(),
                            amtDiffReason: item.amountDifferenceReason || '_',
                            nameCorrect: item.correctName || '_',
                            remarks: item.remarks || '_',
                            verifiedBy: item.doer || undefined,
                            verifiedAt: item.actual ? fmtISO(item.actual) : undefined,
                            planned: item.planned || null,
                            actualRaw: item.actualRaw ? String(item.actualRaw) : null,
                            amountReceivedRaw: item.amountReceivedTotal ?? null,
                            proofLinkRaw: cleanUrl(item.amountProofLink) || null,      // ✅ fixed: consistent with proofLink
                            managementVerify: item.managementVerify,
                            managementRemarks: item.managementRemarks,
                            managementVerifiedBy: item.managementVerifiedBy,
                            managementVerifiedAt: item.managementVerifiedAt,
                        } satisfies PaymentVerifyStage,
                    };
                });
                setBookings(mappedData);
            } else {
                throw new Error('Invalid data format from API');
            }
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching accounts tracker data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { bookings, loading, error, refresh: fetchData };
}
