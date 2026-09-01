import React from 'react';

interface StatusBadgeProps {
  type: 'mismatch' | 'aiCategory' | 'confidence' | 'auditStatus';
  value: string | number | null | undefined;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  if (value == null) {
    return <span className="text-slate-300 text-xs italic">—</span>;
  }
  if (type === 'mismatch') {
    // Real API values are 'YES' (mismatch), 'NO' (match), or 'N/A' (not
    // applicable, e.g. no recording / not billed) — not 'Match'/'Mismatch'.
    const v = String(value).toUpperCase();

    if (v === 'N/A' || v === 'NA') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-slate-50 text-slate-500 border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          N/A
        </span>
      );
    }

    const isMismatch = v === 'YES';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
          isMismatch
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isMismatch ? 'bg-rose-500' : 'bg-emerald-500'}`} />
        {isMismatch ? 'Mismatch' : 'Match'}
      </span>
    );
  }

  if (type === 'confidence') {
    const num = String(value);
    let classes = 'bg-rose-50 text-rose-700 border-rose-200';
    let dotClass = 'bg-rose-500';
    if (num === 'HIGH') {
      classes = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotClass = 'bg-emerald-500';
    } else if (num === 'MEDIUM') {
      classes = 'bg-amber-50 text-amber-700 border-amber-200';
      dotClass = 'bg-amber-500';
    }else if (num === 'LOW') {
      classes = 'bg-rose-50 text-rose-700 border-rose-200';
      dotClass = 'bg-rose-500';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border ${classes}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        {num}
      </span>
    );
  }

  if (type === 'auditStatus') {
    const status = String(value);
    let classes = 'bg-slate-100 text-slate-700 border-slate-300';
    let dotClass = 'bg-slate-500';

    if (status === 'Approved') {
      classes = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotClass = 'bg-emerald-500';
    } else if (status === 'Pending') {
      classes = 'bg-amber-50 text-amber-700 border-amber-200';
      dotClass = 'bg-amber-500';
    } else if (status === 'Reviewed') {
      classes = 'bg-blue-50 text-blue-700 border-blue-200';
      dotClass = 'bg-blue-500';
    } else if (status === 'Flagged') {
      classes = 'bg-rose-50 text-rose-700 border-rose-200';
      dotClass = 'bg-rose-500';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${classes}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        {status}
      </span>
    );
  }

  // aiCategory or general
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
      {value}
    </span>
  );
};
