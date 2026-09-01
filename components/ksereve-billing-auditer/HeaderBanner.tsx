import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneCall } from 'lucide-react';

interface HeaderBannerProps {
  totalRecords: number;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({ totalRecords }) => {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setLastUpdated(
      now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' ' + now.toLocaleTimeString('en-GB', { hour12: false })
    );
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)]">
      {/* Decorative background circle */}
      <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => router.push('/fms')}
          className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
        >
          ← Back to FMS
        </button>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Left Section - Title */}
          <div className="space-y-3 w-full lg:w-auto">
            <div className="flex items-start sm:items-center gap-4">
              {/* Icon Container */}
              <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                <PhoneCall className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
              </div>

              {/* Title & Subtitle */}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                  K-Serve Billing Auditor
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                  Call Recording Audit • Billing Reconciliation
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - KPI Cards */}
          <div className="flex flex-wrap w-full lg:w-auto justify-start lg:justify-end gap-3">
            <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
              <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                TOTAL RECORDS
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                {totalRecords}
              </p>
            </div>
            <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
              <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                LAST UPDATED
              </p>
              <p className="text-lg sm:text-xl font-bold text-white font-mono">
                {lastUpdated ? lastUpdated.split(' ')[0] + ' ' + lastUpdated.split(' ')[1] : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
