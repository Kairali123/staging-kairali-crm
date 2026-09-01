import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Play, FileText, Download } from 'lucide-react';
import { BillingRow } from '../../types/billing';
import { StatusBadge } from './StatusBadge';

interface BillingTableProps {
  data: BillingRow[];
  selectedTaskIds: string[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  setSortField: (field: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  onPlayRecording: (row: BillingRow) => void;
  onViewTranscript: (row: BillingRow) => void;
  onUpdateStatus: (taskId: string, newStatus: BillingRow['auditStatus']) => void;
  onBulkUpdateStatus: (newStatus: BillingRow['auditStatus']) => void;
}

export const BillingTable: React.FC<BillingTableProps> = ({
  data,
  selectedTaskIds,
  setSelectedTaskIds,
  sortField,
  sortDirection,
  setSortField,
  setSortDirection,
  onPlayRecording,
  onViewTranscript,
  onUpdateStatus,
  onBulkUpdateStatus,
}) => {

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // CSV Exporter
  const handleExportCSV = (rowsToExport: BillingRow[]) => {
    if (rowsToExport.length === 0) return;
    const headers = [
      'Task ID', 'Number', 'Destination Number', 'Call Start Time',
      'Category', 'Unpod Remarks', 'Call Connected Time', 'Call End Time',
      'Duration With Ringing', 'Duration Without Ringing', 'Duration Minutes',
      'Remarks', 'Time Duration in Second', 'Auditor Name', 'Time Gap (s)',
      'Recording URL', 'Transcript', 'Actual Audio Duration', 'File Size',
      'Duration Mismatch', 'AI Category', 'AI Remarks', 'AI Confidence', 'Audit Status'
    ];

    const safeStr = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const safeNum = (v: number | null | undefined) => v ?? '';

    const csvContent = [
      headers.join(','),
      ...rowsToExport.map(r => [
        safeStr(r.taskId),
        safeStr(r.number),
        safeStr(r.destinationNumber),
        safeStr(r.callStartTime),
        safeStr(r.category),
        safeStr(r.unpodRemarks),
        safeStr(r.callConnectedTime),
        safeStr(r.callEndTime),
        safeNum(r.durationWithRinging),
        safeNum(r.durationWithoutRinging),
        safeNum(r.durationMinutes),
        safeStr(r.remarks),
        safeNum(r.timeDurationInSecond),
        safeStr(r.auditorName),
        safeNum(r.timeGapInSecond),
        safeStr(r.recordingUrl),
        safeStr(r.transcript ? r.transcript.substring(0, 100) + '...' : ''),
        safeNum(r.actualAudioDuration),
        safeNum(r.fileSize),
        safeStr(r.durationMismatch),
        safeStr(r.aiCategory),
        safeStr(r.aiRemarks),
        safeStr(r.aiConfidence),
        safeStr(r.auditStatus),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `billing_audit_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAuditStatusColorSelect = (status: BillingRow['auditStatus']) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Reviewed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Flagged': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-white/50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-white" />
      : <ArrowDown className="w-3 h-3 text-white" />;
  };

  // Format callStartTime from ISO string to readable date/time
  const formatDateTime = (iso: string | null) => {
    if (!iso) return { date: '—', time: '' };
    try {
      const d = new Date(iso);
      const date = d.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return { date, time };
    } catch {
      return { date: iso, time: '' };
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden mb-6 relative">
      {/* Header operations bar */}
      <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200 rounded-t-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">CDR &amp; Audit Ledger</h3>
            <p className="text-[11px] text-slate-500">Total {data.length} records matching current filter criteria</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCSV(data)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => handleExportCSV(data)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Main Horizontally Scrollable Table */}
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-slate-200 table-fixed">
          {/* Header */}
          <thead
            className="sticky top-0 z-10 border-b-2 border-slate-400 shadow"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            <tr className="border-b-2 border-slate-400">
              {/* Table Headers — only columns that exist in API */}
              {[
                { label: 'Task ID', key: 'taskId' },
                { label: 'Number', key: 'number' },
                { label: 'Destination Number', key: 'destinationNumber' },
                { label: 'Call Start Time', key: 'callStartTime' },
                { label: 'Category', key: 'category' },
                { label: 'Unpod Remarks', key: 'unpodRemarks' },
                { label: 'Call Connected Time', key: 'callConnectedTime' },
                { label: 'Call End Time', key: 'callEndTime' },
                { label: 'Duration (s) With Ring', key: 'durationWithRinging' },
                { label: 'Duration (s) Without Ring', key: 'durationWithoutRinging' },
                { label: 'Duration (m)', key: 'durationMinutes' },
                { label: 'Remarks', key: 'remarks' },
                { label: 'Time Duration (s)', key: 'timeDurationInSecond' },
                { label: 'Auditor Name', key: 'auditorName' },
                { label: 'Time Gap (s)', key: 'timeGapInSecond' },
                { label: 'Recording', key: 'recordingUrl' },
                { label: 'Transcript', key: 'transcript' },
                { label: 'Actual Audio Dur (s)', key: 'actualAudioDuration' },
                { label: 'File Size (KB)', key: 'fileSize' },
                { label: 'Duration Mismatch', key: 'durationMismatch' },
                { label: 'AI Category', key: 'aiCategory' },
                { label: 'AI Remarks', key: 'aiRemarks' },
                { label: 'AI Confidence', key: 'aiConfidence' },
                { label: 'Audit Status', key: 'auditStatus' }
              ].map((header) => {
                const isFrozen = header.key === 'taskId' || header.key === 'number' || header.key === 'destinationNumber';
                const stickyLeft = header.key === 'taskId'
                  ? 0
                  : header.key === 'number'
                    ? '9.5rem'
                    : header.key === 'destinationNumber'
                      ? '18.5rem'
                      : undefined;

                return (
                  <th
                    key={header.key}
                    scope="col"
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                    style={{
                      backgroundColor: "#1e3a5f",
                      minWidth: header.key === 'aiRemarks' || header.key === 'unpodRemarks' ? '250px' : '150px',
                      position: isFrozen ? 'sticky' : undefined,
                      left: isFrozen ? stickyLeft : undefined,
                      zIndex: isFrozen ? 20 : undefined,
                    }}
                    onClick={() => handleSort(header.key)}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {header.label}
                      {renderSortIcon(header.key)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={25} className="p-8 text-center text-sm text-slate-400 italic border-r border-slate-100">
                  No billing records match the current filter selection.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const { date, time } = formatDateTime(row.callStartTime);
                const rowBackground = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                return (
                  <tr
                    key={row.taskId}
                    className={`hover:bg-blue-50/45 transition-colors border-b border-slate-200 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Task ID */}
                    <td
                      className="p-3 text-sm font-semibold text-slate-800 font-mono border-r border-slate-100 whitespace-nowrap"
                      style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: rowBackground }}
                    >
                      {row.taskId}
                    </td>

                    {/* Number */}
                    <td
                      className="p-3 text-sm text-slate-700 border-r border-slate-100 whitespace-nowrap"
                      style={{ position: 'sticky', left: '9.5rem', zIndex: 10, backgroundColor: rowBackground }}
                    >
                      {row.number ?? '—'}
                    </td>

                    {/* Destination Number */}
                    <td
                      className="p-3 text-sm text-slate-700 border-r border-slate-100 whitespace-nowrap"
                      style={{ position: 'sticky', left: '18.5rem', zIndex: 10, backgroundColor: rowBackground }}
                    >
                      {row.destinationNumber ?? '—'}
                    </td>

                    {/* Call Start Time */}
                    <td className="p-3 text-xs text-slate-600 font-mono whitespace-nowrap border-r border-slate-100">
                      <div className="font-semibold text-slate-900">{date}</div>
                      {time && <div className="text-xs text-slate-500">{time}</div>}
                    </td>

                    {/* Category */}
                    <td className="p-3 text-xs text-slate-600 whitespace-nowrap border-r border-slate-100">
                      {row.category ?? <span className="text-slate-300 italic">—</span>}
                    </td>

                    {/* Unpod Remarks */}
                    <td className="p-3 text-xs text-slate-700 truncate max-w-[250px] border-r border-slate-100" title={row.unpodRemarks ?? ''}>
                      {row.unpodRemarks ?? <span className="text-slate-300 italic">—</span>}
                    </td>

                    {/* Call Connected Time */}
                    <td className="p-3 text-xs text-slate-600 font-mono whitespace-nowrap border-r border-slate-100">
                      {row.callConnectedTime ? formatDateTime(row.callConnectedTime).time || row.callConnectedTime : '—'}
                    </td>

                    {/* Call End Time */}
                    <td className="p-3 text-xs text-slate-600 font-mono whitespace-nowrap border-r border-slate-100">
                      {row.callEndTime ? (() => { const f = formatDateTime(row.callEndTime); return `${f.date} ${f.time}`; })() : '—'}
                    </td>

                    {/* Duration With Ringing */}
                    <td className="p-3 text-sm text-slate-700 text-right border-r border-slate-100">
                      {row.durationWithRinging != null ? `${row.durationWithRinging}s` : '—'}
                    </td>

                    {/* Duration Without Ringing */}
                    <td className="p-3 text-sm text-slate-700 text-right border-r border-slate-100">
                      {row.durationWithoutRinging != null ? `${row.durationWithoutRinging}s` : '—'}
                    </td>

                    {/* Duration Minutes */}
                    <td className="p-3 text-sm text-slate-700 text-right border-r border-slate-100">
                      {row.durationMinutes != null ? `${row.durationMinutes.toFixed(2)}m` : '—'}
                    </td>

                    {/* Remarks */}
                    <td className="p-3 text-xs text-slate-700 truncate max-w-[150px] border-r border-slate-100" title={row.remarks ?? ''}>
                      {row.remarks ?? <span className="text-slate-300 italic">—</span>}
                    </td>

                    {/* Time Duration in Second */}
                    <td className="p-3 text-sm text-slate-700 text-right border-r border-slate-100">
                      {row.timeDurationInSecond != null ? `${row.timeDurationInSecond}s` : '—'}
                    </td>

                    {/* Auditor Name */}
                    <td className="p-3 text-xs font-semibold text-slate-700 border-r border-slate-100">
                      {row.auditorName ?? <span className="text-slate-300 italic">—</span>}
                    </td>

                    {/* Time Gap (s) */}
                    <td className="p-3 text-sm text-slate-700 text-right border-r border-slate-100">
                      {row.timeGapInSecond != null ? `${row.timeGapInSecond}s` : '—'}
                    </td>

                    {/* Play Recording Button */}
                    <td className="p-3 text-sm border-r border-slate-100">
                      {row.recordingUrl ? (
                        <button
                          onClick={() => onPlayRecording(row)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Play
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs italic">No audio</span>
                      )}
                    </td>

                    {/* View Transcript Button */}
                    <td className="p-3 text-sm border-r border-slate-100">
                      {row.transcript ? (
                        <button
                          onClick={() => onViewTranscript(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          Transcript
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs italic">No transcript</span>
                      )}
                    </td>

                    {/* Actual Audio Duration */}
                    <td className="p-3 text-sm text-slate-700 text-right border-r border-slate-100">
                      {row.actualAudioDuration != null ? `${row.actualAudioDuration}s` : '—'}
                    </td>

                    {/* File Size */}
                    <td className="p-3 text-sm text-slate-700 text-right border-r border-slate-100">
                      {row.fileSize != null ? `${row.fileSize} KB` : '—'}
                    </td>

                    {/* Duration Mismatch Status Badge */}
                    <td className="p-3 text-sm border-r border-slate-100">
                      <StatusBadge type="mismatch" value={row.durationMismatch} />
                    </td>

                    {/* AI Category */}
                    <td className="p-3 text-sm border-r border-slate-100">
                      <StatusBadge type="aiCategory" value={row.aiCategory} />
                    </td>

                    {/* AI Remarks with Tooltip on Hover */}
                    <td className="p-3 text-xs text-slate-700 truncate max-w-[250px] relative group border-r border-slate-100" title={row.aiRemarks ?? ''}>
                      <span className="block truncate">{row.aiRemarks ?? <span className="text-slate-300 italic">—</span>}</span>
                      {row.aiRemarks && (
                        <div className="absolute left-0 bottom-full mb-1 w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg hidden group-hover:block z-30 leading-snug">
                          {row.aiRemarks}
                        </div>
                      )}
                    </td>

                    {/* AI Confidence */}
                    <td className="p-3 text-sm border-r border-slate-100">
                      <StatusBadge type="confidence" value={row.aiConfidence} />
                    </td>

                    {/* Inline-editable Audit Status */}
                    <td className="p-3 text-sm border-r border-slate-100">
                      <select
                        value={(() => {
                          const v = (row.auditStatus ?? '').trim();
                          // Data contains "Review" as well as "Reviewed" — map to the canonical option
                          return v.toUpperCase() === 'REVIEW' ? 'Reviewed' : v;
                        })()}
                        onChange={(e) => onUpdateStatus(row.taskId, (e.target.value || null) as BillingRow['auditStatus'])}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${getAuditStatusColorSelect(
                          row.auditStatus
                        )}`}
                      >
                        <option value="">— None —</option>
                        <option value="Pending">Pending</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Approved">Approved</option>
                        <option value="Flagged">Flagged</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
