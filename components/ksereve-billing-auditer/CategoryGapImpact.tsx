import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BillingRow } from '../../types/billing';

interface CategoryGapImpactProps {
    data: BillingRow[];
}

interface CategoryGapStat {
    category: string;
    description: string;
    count: number;
    original: number;
    audited: number;
    /** sum of per-call |original - audited|; always = overbilled + underbilled */
    gap: number;
    /** seconds where system billed MORE than actual audio (original > audited) */
    overbilled: number;
    /** seconds where system billed LESS than actual audio (original < audited) */
    underbilled: number;
}

// ── Fixed 8-category template (designer/client-approved) ───────────────────
// These 8 categories always render as cards, regardless of month or which
// aiCategory values happen to appear in the current dataset — matching the
// approved monthly auditor-verified report spec. `aliases` lists the
// different raw aiCategory spellings seen in real API data that should be
// folded into this canonical card (case-insensitive, exact match).
const CANONICAL_CATEGORIES: { name: string; aliases: string[]; description: string }[] = [
    {
        name: 'Incorrect Call Duration Recording',
        aliases: ['incorrect call duration', 'incorrect call duration recording'],
        description: 'System recorded a highly incorrect or excessive duration for the call.',
    },
    {
        name: 'Agent Failure',
        aliases: ['agent failure'],
        description: 'AI agent failed to understand or respond to the customer.',
    },
    {
        name: 'Inactive Call Detection Failure',
        aliases: ['inactive call detection failure'],
        description: 'AI did not detect an inactive or third-party call and let it run long.',
    },
    {
        name: 'AI Conversation Handling Failure',
        aliases: ['ai conversation handling failure'],
        description: 'AI could not handle the conversation flow properly with the customer.',
    },
    {
        name: 'Voicemail Call',
        aliases: ['voicemail call'],
        description: 'Call went to voicemail but was recorded as a talked call.',
    },
    {
        name: 'Time Duration Mismatch',
        aliases: ['time duration', 'time duration mismatch'],
        description: 'Mismatch between recorded and actual conversation duration.',
    },
    {
        name: 'AI to AI Conversation',
        aliases: ['ai to ai conversation'],
        description: 'AI agent ended up talking to another AI or IVR system, not a human.',
    },
    {
        name: 'Connect but Not Fruitful',
        aliases: ['connect but not fruitful'],
        description: 'Agent gave intro but customer did not respond or engage.',
    },
];

// 9th card: everything audited that doesn't match the approved 8. Rendering it
// is what guarantees Σ(card gaps) === grand-total gap and Σ(card counts) ===
// header count — the section now always reconciles with itself.
const OTHER_CATEGORY_NAME = 'Other / Uncategorized';
const OTHER_CATEGORY_DESC =
    'Audited calls whose AI category is empty or outside the 8 approved categories.';

const formatSecsToHm = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    // Show seconds when under a minute so small-but-real gaps never render
    // as "0h 0m" next to a nonzero percentage.
    if (h === 0 && m === 0) return `${s}s`;
    return `${h}h ${m}m`;
};

const formatPct = (v: number) => `${v.toFixed(1)}%`;

export const CategoryGapImpact: React.FC<CategoryGapImpactProps> = ({ data }) => {
    const computed = useMemo(() => {
        // ── F1: population = audited rows ONLY ─────────────────────────────
        // A row with actualAudioDuration == null hasn't been audited yet; the
        // old logic coerced it to 0 which counted the FULL original duration
        // as "gap" (verified: pending rows can fabricate ~46% of total gap).
        const auditedRows = data.filter((r) => r.actualAudioDuration != null);
        const pendingCount = data.length - auditedRows.length;
        const auditedCount = auditedRows.length;

        const mkBucket = () => ({ original: 0, audited: 0, overbilled: 0, underbilled: 0, gap: 0, count: 0 });
        const buckets: Record<string, ReturnType<typeof mkBucket>> = {};
        CANONICAL_CATEGORIES.forEach((c) => {
            buckets[c.name] = mkBucket();
        });
        buckets[OTHER_CATEGORY_NAME] = mkBucket();

        const findCanonicalMatch = (raw: string): string | null => {
            const key = raw.trim().toLowerCase();
            const match = CANONICAL_CATEGORIES.find((c) => c.aliases.includes(key));
            return match ? match.name : null;
        };

        auditedRows.forEach((r) => {
            const original = r.timeDurationInSecond ?? r.durationWithRinging ?? 0;
            const audited = r.actualAudioDuration as number; // non-null by filter above

            // ── F2: signed decomposition of the gap ────────────────────────
            //   diff       = original - audited
            //   overbilled = max(diff, 0)   system billed MORE than real audio
            //   underbilled= max(-diff, 0)  system billed LESS than real audio
            //   gap        = overbilled + underbilled = |diff|
            // Invariants (unit-verified):
            //   Σgap = Σover + Σunder            (P3)
            //   Σover - Σunder = ΣOrig - ΣAud    (P4 — direction always
            //   explains why a card's Gap can exceed |Orig - Aud|: calls in
            //   both directions add magnitude but cancel in the net.)
            const diff = original - audited;
            const overbilled = Math.max(diff, 0);
            const underbilled = Math.max(-diff, 0);

            const name = findCanonicalMatch(r.aiCategory ?? '') ?? OTHER_CATEGORY_NAME;
            const b = buckets[name];
            b.count += 1;
            b.original += original;
            b.audited += audited;
            b.overbilled += overbilled;
            b.underbilled += underbilled;
            b.gap += overbilled + underbilled;
        });

        const allBuckets = Object.values(buckets);
        const totalGapSec = allBuckets.reduce((acc, s) => acc + s.gap, 0);
        const totalOriginalSec = allBuckets.reduce((acc, s) => acc + s.original, 0);
        const totalAuditedSec = allBuckets.reduce((acc, s) => acc + s.audited, 0);
        const totalOverbilledSec = allBuckets.reduce((acc, s) => acc + s.overbilled, 0);
        const totalUnderbilledSec = allBuckets.reduce((acc, s) => acc + s.underbilled, 0);

        const toStat = (name: string, description: string): CategoryGapStat => ({
            category: name,
            description,
            ...buckets[name],
        });

        // Fixed 8 first (always present, sorted by gap), then the Other card
        // pinned last so the approved template order/shape stays recognizable.
        const canonicalStats = CANONICAL_CATEGORIES
            .map((c) => toStat(c.name, c.description))
            .sort((a, b) => b.gap - a.gap);
        const otherStat = toStat(OTHER_CATEGORY_NAME, OTHER_CATEGORY_DESC);
        const allStats = otherStat.count > 0 ? [...canonicalStats, otherStat] : canonicalStats;

        // ── Shares: denominators are audited-only, so card counts sum to the
        // header number and gap-shares sum to exactly 100%. (P1, P2, P5)
        const withPct = allStats.map((s) => ({
            ...s,
            callSharePct: auditedCount > 0 ? (s.count / auditedCount) * 100 : 0,
            gapSharePct: totalGapSec > 0 ? (s.gap / totalGapSec) * 100 : 0,
        }));

        // Top driver for the callout is picked from categories that actually
        // have calls/gap — a zero-count card should never be "the top driver".
        const topGapDriver =
            [...withPct].filter((s) => s.count > 0).sort((a, b) => b.gap - a.gap)[0] || null;
        const topImpactRatio =
            topGapDriver && topGapDriver.callSharePct > 0
                ? topGapDriver.gapSharePct / topGapDriver.callSharePct
                : 0;

        return {
            auditedCount,
            pendingCount,
            withPct,
            topGapDriver,
            topImpactRatio,
            totalGapSec,
            totalOriginalSec,
            totalAuditedSec,
            totalOverbilledSec,
            totalUnderbilledSec,
        };
    }, [data]);

    const {
        auditedCount,
        pendingCount,
        withPct,
        topGapDriver,
        topImpactRatio,
        totalGapSec,
        totalOriginalSec,
        totalAuditedSec,
        totalOverbilledSec,
        totalUnderbilledSec,
    } = computed;

    if (data.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden mb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-rose-50 via-white to-slate-100 border-b border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-rose-600 via-rose-700 to-red-700 flex items-center justify-center shadow-md border border-rose-500/40 flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            Category-wise Time Gap Impact
                        </h2>
                        <p className="text-[11px] text-slate-500">Billing root-cause analysis · auditor-verified</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Honest header: only truly audited calls are counted here */}
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-full">
                        {auditedCount} audited call{auditedCount === 1 ? '' : 's'}
                    </span>
                    {pendingCount > 0 && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full">
                            {pendingCount} pending audit
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-5">
                {auditedCount === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-6 text-center text-sm text-slate-400 italic">
                        No audited calls in the current filter — {pendingCount} call
                        {pendingCount === 1 ? ' is' : 's are'} still pending audit.
                    </div>
                ) : (
                    <>
                        {/* Callout: auto-surfaces the single biggest gap driver among categories with real data */}
                        {topGapDriver && topGapDriver.gap > 0 && (
                            <div className="flex items-start gap-3 bg-rose-50 border-2 border-rose-300 rounded-lg p-3 shadow-sm">
                                <div className="w-8 h-8 rounded-md bg-rose-100 border border-rose-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-rose-600 font-bold text-sm">!</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 leading-snug">
                                        &ldquo;{topGapDriver.category}&rdquo; is the top billing-gap driver
                                    </p>
                                    <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                                        {topGapDriver.count} call{topGapDriver.count === 1 ? '' : 's'} (
                                        {formatPct(topGapDriver.callSharePct)} of audited calls) account for{' '}
                                        {formatPct(topGapDriver.gapSharePct)} of the total time gap
                                        {topImpactRatio >= 2 && (
                                            <>
                                                {' '}
                                                — roughly{' '}
                                                <span className="font-bold text-rose-700">
                                                    {topImpactRatio.toFixed(1)}x
                                                </span>{' '}
                                                more impact than its call volume alone would suggest
                                            </>
                                        )}
                                        .
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Category cards — fixed 8 approved categories always shown, plus one
                            "Other / Uncategorized" card whenever data falls outside them, so the
                            grid always reconciles with the grand total below */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {withPct.map((s) => {
                                const isTopDriver =
                                    topGapDriver != null && s.category === topGapDriver.category && s.count > 0;
                                const isEmpty = s.count === 0;
                                return (
                                    <div
                                        key={s.category}
                                        className={`rounded-xl border-2 p-4 shadow-sm transition ${isTopDriver
                                                ? 'border-rose-400 bg-rose-50/60 hover:shadow-md'
                                                : isEmpty
                                                    ? 'border-slate-100 bg-slate-50/50 opacity-70'
                                                    : 'border-slate-200 bg-white hover:shadow-md'
                                            }`}
                                    >
                                        {/* Title + description on left, count + % badge on right */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h5 className="text-sm font-bold text-slate-900 leading-snug">{s.category}</h5>
                                                <p className="text-[11px] text-slate-500 leading-snug mt-1">{s.description}</p>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <p className={`text-xl font-bold leading-none ${isEmpty ? 'text-slate-400' : 'text-slate-900'}`}>
                                                    {s.count}
                                                </p>
                                                <span
                                                    className={`inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isTopDriver ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                >
                                                    {formatPct(s.callSharePct)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Original / Audited / Gap mini-stats */}
                                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                                            <div>
                                                <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-wide">Original</p>
                                                <p className={`text-xs font-bold mt-0.5 ${isEmpty ? 'text-slate-400' : 'text-slate-800'}`}>
                                                    {formatSecsToHm(s.original)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-wide">Audited</p>
                                                <p className={`text-xs font-bold mt-0.5 ${isEmpty ? 'text-slate-400' : 'text-slate-800'}`}>
                                                    {formatSecsToHm(s.audited)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-semibold text-rose-500 tracking-wide">Gap</p>
                                                <p className={`text-xs font-bold mt-0.5 ${isEmpty ? 'text-slate-400' : 'text-rose-600'}`}>
                                                    {formatSecsToHm(s.gap)}
                                                    <span className="text-[9px] font-semibold ml-1 opacity-80">
                                                        ({formatPct(s.gapSharePct)})
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Direction split — explains WHY Gap can differ from |Orig − Aud|
                                            when a category has calls billed both over and under */}
                                        {!isEmpty && s.gap > 0 && (
                                            <p className="text-[9px] text-slate-400 mt-1.5">
                                                {s.overbilled > 0 && (
                                                    <span className="mr-2">
                                                        ▲ over-billed{' '}
                                                        <span className="font-semibold text-slate-500">{formatSecsToHm(s.overbilled)}</span>
                                                    </span>
                                                )}
                                                {s.underbilled > 0 && (
                                                    <span>
                                                        ▼ under-billed{' '}
                                                        <span className="font-semibold text-slate-500">{formatSecsToHm(s.underbilled)}</span>
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Grand total footer, mirroring the PDF's "Grand total across N audited calls" */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">
                                Grand total across {auditedCount} audited calls
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <p className="text-[10px] text-slate-500">Total calls</p>
                                    <p className="text-lg font-bold text-slate-900">{auditedCount}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500">Total original time</p>
                                    <p className="text-lg font-bold text-slate-900">{formatSecsToHm(totalOriginalSec)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500">Total audited time</p>
                                    <p className="text-lg font-bold text-slate-900">{formatSecsToHm(totalAuditedSec)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500">Total time gap</p>
                                    <p className="text-lg font-bold text-rose-600">{formatSecsToHm(totalGapSec)}</p>
                                    {totalGapSec > 0 && (
                                        <p className="text-[9px] text-slate-400 mt-0.5">
                                            ▲ {formatSecsToHm(totalOverbilledSec)} over · ▼ {formatSecsToHm(totalUnderbilledSec)} under
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
