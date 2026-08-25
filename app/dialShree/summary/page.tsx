"use client";

import { Suspense } from "react";

function DialShreeSummaryPageInner() {
    return (
        <div className="font-sans bg-[#f0f2f8] min-h-screen text-slate-800 p-6">
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
                <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                <h2 className="text-xl font-bold text-slate-800">DialShree Summary</h2>
                <p className="text-sm text-slate-500 mt-2">DialShree call summary and analytics.</p>
            </div>
        </div>
    );
}

export default function DialShreeSummaryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading...</div>}>
            <DialShreeSummaryPageInner />
        </Suspense>
    );
}
