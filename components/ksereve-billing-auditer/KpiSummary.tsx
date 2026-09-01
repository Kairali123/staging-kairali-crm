import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TableProperties } from 'lucide-react';
import { BillingRow } from '../../types/billing';

interface KpiSummaryProps {
  data: BillingRow[];
  viewMode: 'table' | 'chart';
  setViewMode: (mode: 'table' | 'chart') => void;
}

export const KpiSummary: React.FC<KpiSummaryProps> = ({ data, viewMode, setViewMode }) => {
  // Compute Stats
  const totalCalls = data.length;

  const totalDurationWithRingingSec = data.reduce((acc, r) => acc + (r.durationWithRinging || 0), 0);
  const totalDurationWithoutRingingSec = data.reduce((acc, r) => acc + (r.durationWithoutRinging || 0), 0);

  const formatSecsToHm = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const mismatchCount = data.filter((r) => r.durationMismatch === 'YES').length;

  // ── Average AI Confidence ──────────────────────────────────────────────
  // Only rows that actually have a confidence value are counted, and each
  // is mapped to a % score (HIGH=100, MEDIUM=75, LOW=25). Sum and count
  // are taken over the SAME set of rows, so the average is always 0–100.
  const confidenceScore = (conf: string | null): number | null => {
    if (conf == null) return null;
    const v = String(conf).trim().toUpperCase();
    if (v === 'HIGH') return 100;
    if (v === 'MEDIUM') return 75;
    if (v === 'LOW') return 25;
    return null; // unknown value — exclude from average
  };
  const confScores = data
    .map((r) => confidenceScore(r.aiConfidence))
    .filter((s): s is number => s != null);
  const avgConfidence =
    confScores.length > 0
      ? Math.round(confScores.reduce((acc, s) => acc + s, 0) / confScores.length)
      : 0;

  // ── Audit Status counts (normalized) ───────────────────────────────────
  // Real data contains variants like "Review"/"Reviewed" and blank/null
  // ("None") rows. Normalize everything so EVERY record is reflected in
  // the KPI tiles and the chart, and totals always add up to totalCalls.
  const normalizeStatus = (status: string | null): string => {
    const v = (status ?? '').trim();
    if (!v) return 'None';
    const upper = v.toUpperCase();
    if (upper === 'REVIEW' || upper === 'REVIEWED') return 'Reviewed';
    if (upper === 'PENDING') return 'Pending';
    if (upper === 'APPROVED') return 'Approved';
    if (upper === 'FLAGGED') return 'Flagged';
    return v; // keep any other custom status as-is
  };

  const statusCounts: Record<string, number> = {};
  data.forEach((r) => {
    const s = normalizeStatus(r.auditStatus);
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const pendingCount = statusCounts['Pending'] || 0;
  const reviewedCount = statusCounts['Reviewed'] || 0;
  const approvedCount = statusCounts['Approved'] || 0;
  const flaggedCount = statusCounts['Flagged'] || 0;
  const noneCount = statusCounts['None'] || 0;

  // Chart Data preparation — driven by the same normalized counts so the
  // chart always matches the KPI tiles (includes Reviewed and None).
  const statusColorMap: Record<string, string> = {
    Approved: '#10b981',
    Pending: '#f59e0b',
    Flagged: '#ef4444',
    Reviewed: '#3b82f6',
    None: '#94a3b8',
  };
  const chartData = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      color: statusColorMap[name] || '#6366f1',
    }));

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden mb-6">
      {/* Top title and View Mode selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40 flex-shrink-0">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Key Performance Indicators</h2>
            <p className="text-[11px] text-slate-500">Overview of billing metrics & performance</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === 'table'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            Table View
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === 'chart'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Chart View
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* First Row - Call Distribution & Duration */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-4 relative">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Call Distribution & Duration
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Calls */}
            <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 leading-tight mb-2">
                Total Calls
              </p>
              <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                {totalCalls}
              </p>
              <div className="text-[10px] text-slate-500">Processed in dataset</div>
            </div>

            {/* Duration (Ring) */}
            <div className="bg-blue-50/70 border-2 border-slate-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700 leading-tight mb-2">
                Duration (Ring)
              </p>
              <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                {formatSecsToHm(totalDurationWithRingingSec)}
              </p>
              <div className="text-[10px] text-slate-500">Sum including ring times</div>
            </div>

            {/* Duration (Talk) */}
            <div className="bg-blue-50/70 border-2 border-indigo-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 leading-tight mb-2">
                Duration (Talk)
              </p>
              <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                {formatSecsToHm(totalDurationWithoutRingingSec)}
              </p>
              <div className="text-[10px] text-slate-500">Actual connected talk-time</div>
            </div>

            {/* Mismatches */}
            <div className="bg-rose-50/70 border-2 border-rose-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 leading-tight mb-2">
                Mismatches
              </p>
              <p className="text-2xl font-bold text-rose-600 leading-none mb-2">
                {mismatchCount}
              </p>
              <div className="text-[10px] text-slate-500">Mismatch in CDR dur vs actual</div>
            </div>
          </div>
        </div>

        {/* Second Row - Reconciliation & AI Performance */}
        <div className="bg-green-50/60 border border-green-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Reconciliation & AI Performance
            </h4>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-full">
              Table-synced totals
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Avg AI Conf. */}
            <div className="bg-violet-50/70 border-2 border-violet-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 leading-tight mb-2">
                Avg AI Conf.
              </p>
              <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                {avgConfidence}%
              </p>
              <div className="text-[10px] text-slate-500">Whisper/AI transcription avg</div>
            </div>

            {/* Audit Pending */}
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 leading-tight mb-2">
                Audit Pending
              </p>
              <p className="text-2xl font-bold text-amber-600 leading-none mb-2">
                {pendingCount}
              </p>
              <div className="text-[10px] text-slate-500">Awaiting auditor review</div>
            </div>

            {/* Reviewed */}
            <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 leading-tight mb-2">
                Reviewed
              </p>
              <p className="text-2xl font-bold text-blue-600 leading-none mb-2">
                {reviewedCount}
              </p>
              <div className="text-[10px] text-slate-500">Audited, decision pending</div>
            </div>

            {/* Approved */}
            <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 leading-tight mb-2">
                Approved
              </p>
              <p className="text-2xl font-bold text-emerald-600 leading-none mb-2">
                {approvedCount}
              </p>
              <div className="text-[10px] text-slate-500">Confirmed billing matches</div>
            </div>

            {/* Flagged */}
            <div className="bg-red-50/70 border-2 border-red-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 leading-tight mb-2">
                Flagged
              </p>
              <p className="text-2xl font-bold text-red-600 leading-none mb-2">
                {flaggedCount}
              </p>
              <div className="text-[10px] text-slate-500">Marked for billing issues</div>
            </div>

            {/* None / Unaudited */}
            <div className="bg-slate-50/70 border-2 border-slate-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 leading-tight mb-2">
                None
              </p>
              <p className="text-2xl font-bold text-slate-600 leading-none mb-2">
                {noneCount}
              </p>
              <div className="text-[10px] text-slate-500">No audit status assigned</div>
            </div>
          </div>
        </div>

        {/* Chart View Content */}
        {viewMode === 'chart' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Audit Status Distribution</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="count" name="Calls Count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};