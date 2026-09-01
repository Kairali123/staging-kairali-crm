'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { HeaderBanner } from '@/components/ksereve-billing-auditer/HeaderBanner';
import { FiltersCard } from '@/components/ksereve-billing-auditer/FiltersCard';
import { KpiSummary } from '@/components/ksereve-billing-auditer/KpiSummary';
import { CategoryGapImpact } from '@/components/ksereve-billing-auditer/CategoryGapImpact';
import { BillingTable } from '@/components/ksereve-billing-auditer/BillingTable';
import { Pagination } from '@/components/ksereve-billing-auditer/Pagination';
import { RecordingModal } from '@/components/ksereve-billing-auditer/RecordingModal';
import { TranscriptModal } from '@/components/ksereve-billing-auditer/TranscriptModal';
import { getBillingData } from '@/data/mockBillingData';
import { BillingRow } from '@/types/billing';

export default function BillingAuditerPage() {
  // Data State
  const [billingData, setBillingData] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View Settings
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('this_week');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('All');
  const [mismatchFilter, setMismatchFilter] = useState<string>('All');
  const [aiCategoryFilter, setAiCategoryFilter] = useState<string>('All');
  const [aiConfidenceFilter, setAiConfidenceFilter] = useState<string>('All');

  // Sorting & Pagination States
  const [sortField, setSortField] = useState<string>('callStartTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Row Selection State
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Modal States
  const [activeRecordingRow, setActiveRecordingRow] = useState<BillingRow | null>(null);
  const [activeTranscriptRow, setActiveTranscriptRow] = useState<BillingRow | null>(null);

  // Fetch billing data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getBillingData();
        setBillingData(data);
      } catch (err) {
        console.error('Error fetching billing data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Unique lists of categories for filter dropdowns
  const { categories, aiCategories } = useMemo(() => {
    const cats = new Set<string>();
    const aiCats = new Set<string>();
    billingData.forEach((row) => {
      if (row.category) cats.add(row.category);
      if (row.aiCategory) aiCats.add(row.aiCategory);
    });
    return {
      categories: Array.from(cats).sort(),
      aiCategories: Array.from(aiCats).sort(),
    };
  }, [billingData]);

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFilter('this_week');
    // Reset dates to past 7 days range
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setCategoryFilter('All');
    setAuditStatusFilter('All');
    setMismatchFilter('All');
    setAiCategoryFilter('All');
    setAiConfidenceFilter('All');
    setCurrentPage(1);
  };

  // Date range bounds calculation
  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let start = '';
    let end = formatDate(today);

    switch (dateFilter) {
      case 'today':
        start = formatDate(today);
        end = formatDate(today);
        break;
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = formatDate(yesterday);
        end = formatDate(yesterday);
        break;
      }
      case 'this_week': {
        const startOfWeek = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        start = formatDate(startOfWeek);
        end = formatDate(today);
        break;
      }
      case 'last_week': {
        const startOfLastWeek = new Date(today);
        const endOfLastWeek = new Date(today);
        const day = today.getDay();
        const diffStart = today.getDate() - day - 6 + (day === 0 ? -6 : 1);
        const diffEnd = diffStart + 6;
        startOfLastWeek.setDate(diffStart);
        endOfLastWeek.setDate(diffEnd);
        start = formatDate(startOfLastWeek);
        end = formatDate(endOfLastWeek);
        break;
      }
      case 'this_month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const offset = startOfMonth.getTimezoneOffset();
        const localStart = new Date(startOfMonth.getTime() - offset * 60 * 1000);
        start = formatDate(localStart);
        end = formatDate(today);
        break;
      }
      case 'last_month': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const offsetStart = startOfLastMonth.getTimezoneOffset();
        const offsetEnd = endOfLastMonth.getTimezoneOffset();
        start = formatDate(new Date(startOfLastMonth.getTime() - offsetStart * 60 * 1000));
        end = formatDate(new Date(endOfLastMonth.getTime() - offsetEnd * 60 * 1000));
        break;
      }
      case 'this_year': {
        start = `${today.getFullYear()}-01-01`;
        end = formatDate(today);
        break;
      }
      case 'last_year': {
        start = `${today.getFullYear() - 1}-01-01`;
        end = `${today.getFullYear() - 1}-12-31`;
        break;
      }
      case 'custom':
        start = startDate;
        end = endDate;
        break;
      case 'all':
      default:
        start = '';
        end = '';
        break;
    }
    return { start, end };
  }, [dateFilter, startDate, endDate]);

  // Filter application
  const filteredData = useMemo(() => {
    return billingData.filter((row) => {
      // Keyword search
      if (searchTerm) {
        const keyword = searchTerm.toLowerCase();
        const matchesKeyword =
          row.taskId.toLowerCase().includes(keyword) ||
          (row.number ?? '').toLowerCase().includes(keyword) ||
          (row.auditorName ?? '').toLowerCase().includes(keyword) ||
          (row.category ?? '').toLowerCase().includes(keyword) ||
          (row.aiCategory ?? '').toLowerCase().includes(keyword);
        if (!matchesKeyword) return false;
      }

      // Date Range Filter — callStartTime is ISO 8601 e.g. "2026-05-02T22:00:00.000Z"
      const rowDate = row.callStartTime ? row.callStartTime.split('T')[0] : '';
      if (dateFilter !== 'all' && rowDate) {
        if (dateRangeBounds.start && rowDate < dateRangeBounds.start) return false;
        if (dateRangeBounds.end && rowDate > dateRangeBounds.end) return false;
      }

      // Category Dropdown
      if (categoryFilter !== 'All' && row.category !== categoryFilter) return false;

      // Audit Status Dropdown
      if (auditStatusFilter !== 'All' && row.auditStatus !== auditStatusFilter) return false;

      // Duration Mismatch Dropdown
      if (mismatchFilter !== 'All' && row.durationMismatch !== mismatchFilter) return false;

      // AI Category Dropdown
      if (aiCategoryFilter !== 'All' && row.aiCategory !== aiCategoryFilter) return false;

      // AI Confidence Dropdown
      if (aiConfidenceFilter !== 'All') {
        const conf = row.aiConfidence ? String(row.aiConfidence).trim().toUpperCase() : null;
        if (conf == null) return false; // exclude null-confidence rows when filtering
        // Keep ONLY rows whose confidence matches the selected level
        if (aiConfidenceFilter === 'High' && conf !== 'HIGH') return false;
        if (aiConfidenceFilter === 'Medium' && conf !== 'MEDIUM') return false;
        if (aiConfidenceFilter === 'Low' && conf !== 'LOW') return false;
      }

      return true;
    });
  }, [
    billingData,
    searchTerm,
    dateFilter,
    dateRangeBounds,
    categoryFilter,
    auditStatusFilter,
    mismatchFilter,
    aiCategoryFilter,
    aiConfidenceFilter,
  ]);

  // Sort application
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField as keyof BillingRow];
      const valB = b[sortField as keyof BillingRow];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination application
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Reset page when filters or total entries change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    dateFilter,
    startDate,
    endDate,
    categoryFilter,
    auditStatusFilter,
    mismatchFilter,
    aiCategoryFilter,
    aiConfidenceFilter,
    itemsPerPage,
  ]);

  // Update single row status in local state
  const handleUpdateStatus = (taskId: string, newStatus: BillingRow['auditStatus']) => {
    setBillingData((prev) =>
      prev.map((row) => (row.taskId === taskId ? { ...row, auditStatus: newStatus } : row))
    );
  };

  // Bulk update status for all selected rows
  const handleBulkUpdateStatus = (newStatus: BillingRow['auditStatus']) => {
    setBillingData((prev) =>
      prev.map((row) =>
        selectedTaskIds.includes(row.taskId) ? { ...row, auditStatus: newStatus } : row
      )
    );
    setSelectedTaskIds([]); // Clear selection after bulk update
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Banner */}
        <HeaderBanner totalRecords={billingData.length} />

        {/* Filters Card */}
        <FiltersCard
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          auditStatusFilter={auditStatusFilter}
          setAuditStatusFilter={setAuditStatusFilter}
          mismatchFilter={mismatchFilter}
          setMismatchFilter={setMismatchFilter}
          aiCategoryFilter={aiCategoryFilter}
          setAiCategoryFilter={setAiCategoryFilter}
          aiConfidenceFilter={aiConfidenceFilter}
          setAiConfidenceFilter={setAiConfidenceFilter}
          categories={categories}
          aiCategories={aiCategories}
          onClearFilters={handleClearFilters}
        />

        {/* KPI Tiles / Summary Card */}
        <KpiSummary
          data={filteredData}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {/* Category-wise Time Gap Impact — billing root-cause analysis, sits between KPI section and the CDR table */}
        <CategoryGapImpact data={filteredData} />

        {/* Main Content Area */}
        {viewMode === 'table' ? (
          <>
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 font-medium">
                Loading call billing records...
              </div>
            ) : (
              <>
                <BillingTable
                  data={paginatedData}
                  selectedTaskIds={selectedTaskIds}
                  setSelectedTaskIds={setSelectedTaskIds}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  setSortField={setSortField}
                  setSortDirection={setSortDirection}
                  onPlayRecording={setActiveRecordingRow}
                  onViewTranscript={setActiveTranscriptRow}
                  onUpdateStatus={handleUpdateStatus}
                  onBulkUpdateStatus={handleBulkUpdateStatus}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  setItemsPerPage={setItemsPerPage}
                  setCurrentPage={setCurrentPage}
                />
              </>
            )}
          </>
        ) : (
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400 italic">
            Switch to Table View to inspect records list, play audio recordings, or edit audit status codes.
          </div>
        )}

        {/* Audio Player Modal */}
        {activeRecordingRow && (
          <RecordingModal
            isOpen={!!activeRecordingRow}
            onClose={() => setActiveRecordingRow(null)}
            taskId={activeRecordingRow.taskId}
            callStartTime={activeRecordingRow.callStartTime ?? ''}
            recordingUrl={activeRecordingRow.recordingUrl ?? ''}
          />
        )}

        {/* Transcript Viewer Modal */}
        {activeTranscriptRow && (
          <TranscriptModal
            isOpen={!!activeTranscriptRow}
            onClose={() => setActiveTranscriptRow(null)}
            taskId={activeTranscriptRow.taskId}
            transcript={activeTranscriptRow.transcript ?? ''}
          />
        )}
      </div>
    </DashboardLayout>
  );
}