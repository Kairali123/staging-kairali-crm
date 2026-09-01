import React, { useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  setCurrentPage: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
}) => {
  const [gotoPageInput, setGotoPageInput] = useState('');

  const handleGotoPage = () => {
    const pageNum = parseInt(gotoPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setGotoPageInput('');
    }
  };

  if (totalPages <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {/* Left - Page navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(1)}
          className="h-8 w-8 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
        >
          «
        </button>

        {/* Prev */}
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          className="h-8 px-3 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white flex items-center justify-center cursor-pointer"
        >
          ‹ Prev
        </button>

        {/* Page numbers list */}
        {(() => {
          const pages = [];
          const start = Math.max(1, currentPage - 2);
          const end = Math.min(totalPages, currentPage + 2);

          if (start > 1) {
            pages.push(
              <span key="s-ellipsis" className="px-1 text-slate-400">
                …
              </span>
            );
          }

          for (let i = start; i <= end; i++) {
            pages.push(
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-8 w-8 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  i === currentPage
                    ? 'bg-blue-600 text-white shadow-md border border-blue-700'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {i}
              </button>
            );
          }

          if (end < totalPages) {
            pages.push(
              <span key="e-ellipsis" className="px-1 text-slate-400">
                …
              </span>
            );
          }

          return pages;
        })()}

        {/* Next */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          className="h-8 px-3 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white flex items-center justify-center cursor-pointer"
        >
          Next ›
        </button>

        {/* Last Page */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className="h-8 w-8 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
        >
          »
        </button>
      </div>

      {/* Right - Items per page selector & Goto Page */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Items per page */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rows/page</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {[10, 15, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Goto page input */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Go to</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={gotoPageInput}
            onChange={(e) => setGotoPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGotoPage();
            }}
            className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Page"
          />
          <button
            onClick={handleGotoPage}
            className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
};
