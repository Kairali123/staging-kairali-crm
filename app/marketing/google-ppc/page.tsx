"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import useGooglePPCData from "@/hooks/useGooglePPCData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Percent,
  BarChart3,
  Search,
  ChevronUp,
  ChevronDown,
  LineChart,
  TableIcon,
  Users,
  IndianRupee,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";

// For counts & ratios (ROAS etc.)
// const roundInt = (value: number | undefined | null) =>
//   Math.round(value || 0);

// // For percentages
// const roundPercent = (value: number | undefined | null) =>
//   Math.round(value || 0);

// For currency values (₹)
const roundCurrency = (value: number | undefined | null) =>
  Math.round(value || 0);


type PPCData = {
  campaign: string;
  company: string;
  totalLeads: number;
  conversions: number;
  conversionAmount: number;
  expense: number;
  conversionRate: number;
  roas: number;
};

// 🔹 Badge to indicate ALL-TIME charts
const AllTimeBadge = () => (
  <span
    className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200 cursor-help"
    title="This chart shows all-time top 10 campaigns and is not affected by date filters"
  >
    ALL-TIME
  </span>
);



export default function GooglePPCPage(): JSX.Element {
  // UI state
  const [selectedCampaign, setSelectedCampaign] = useState<string>("ALL");
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL")
  const [dateFilter, setDateFilter] = useState<string>("this_month");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [sortColumn, setSortColumn] = useState<keyof PPCData | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const resetFilters = () => {
    setSelectedCampaign("ALL");
    setSelectedCompany("ALL");
    setSearchTerm("");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortColumn(null);
    setSortDirection("desc");
    setCurrentPage(1);
  };
  const PAGINATION_HEIGHT = 96;

  //  Toggle between ALL-TIME and DATE RANGE charts
  //const [chartMode, setChartMode] = useState<"all-time" | "date-range">("all-time");

  // pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);


  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompany, selectedCampaign, searchTerm, dateFilter, pageSize]);

  // const { aggregatedData, loading } = useGooglePPCData();
  const { rawData, loading, error } = useGooglePPCData();

  // // STEP 3: Date filter RAW DATA pe
  // const dateFilteredRawData = useMemo(() => {
  //   const today = new Date();

  //   const parseDate = (d: string) => {
  //     // "2026-January-01" → Date
  //     return new Date(d.replace(/-/g, " "));
  //   };

  //   return rawData.filter((row) => {
  //     const d = parseDate(row.date);
  //     if (isNaN(d.getTime())) return true;

  //     switch (dateFilter) {
  //       case "today":
  //         return d.toDateString() === today.toDateString();

  //       case "this_week": {
  //         const start = new Date(today);
  //         start.setDate(today.getDate() - today.getDay());
  //         return d >= start && d <= today;
  //       }

  //       case "this_month":
  //         return (
  //           d.getMonth() === today.getMonth() &&
  //           d.getFullYear() === today.getFullYear()
  //         );

  //       case "this_year":
  //         return d.getFullYear() === today.getFullYear();

  //       case "custom":
  //         if (!customStartDate || !customEndDate) return true;
  //         return (
  //           d >= new Date(customStartDate) &&
  //           d <= new Date(customEndDate)
  //         );

  //       default:
  //         return true;
  //     }
  //   });
  // }, [rawData, dateFilter, customStartDate, customEndDate]);


  //  FULL date range support (ALL cases)
  const dateFilteredRawData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseAPIDate = (value: string) => {
      // "2026-January-01"
      const [year, monthName, day] = value.split("-");
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      return new Date(Number(year), monthIndex, Number(day));
    };

    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const endOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(23, 59, 59, 999);
      return x;
    };

    const startOfWeek = (d: Date) => {
      const x = new Date(d);
      x.setDate(d.getDate() - d.getDay());
      return startOfDay(x);
    };

    const endOfWeek = (d: Date) => {
      const x = new Date(d);
      x.setDate(d.getDate() - d.getDay() + 6);
      return endOfDay(x);
    };

    const startOfMonth = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), 1);

    const endOfMonth = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    return rawData.filter((row) => {
      const rowDate = parseAPIDate(row.date);

      switch (dateFilter) {
        case "all":
          return true;

        case "today":
          return rowDate.getTime() === today.getTime();

        case "yesterday": {
          const y = new Date(today);
          y.setDate(today.getDate() - 1);
          return rowDate.getTime() === y.getTime();
        }

        case "this_week":
          return rowDate >= startOfWeek(today) && rowDate <= endOfWeek(today);

        case "last_week": {
          const lw = new Date(today);
          lw.setDate(today.getDate() - 7);
          return rowDate >= startOfWeek(lw) && rowDate <= endOfWeek(lw);
        }

        case "this_month":
          return rowDate >= startOfMonth(today) && rowDate <= endOfMonth(today);

        case "last_month": {
          const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          return rowDate >= startOfMonth(lm) && rowDate <= endOfMonth(lm);
        }

        case "last_30_days": {
          const from = new Date(today);
          from.setDate(today.getDate() - 30);
          return rowDate >= startOfDay(from) && rowDate <= endOfDay(today);
        }

        case "last_90_days": {
          const from = new Date(today);
          from.setDate(today.getDate() - 90);
          return rowDate >= startOfDay(from) && rowDate <= endOfDay(today);
        }

        case "this_year":
          return rowDate.getFullYear() === today.getFullYear();

        case "last_year":
          return rowDate.getFullYear() === today.getFullYear() - 1;

        case "custom":
          if (!customStartDate || !customEndDate) return true;
          return (
            rowDate >= new Date(customStartDate + "T00:00:00") &&
            rowDate <= new Date(customEndDate + "T23:59:59")
          );

        default:
          return true;
      }
    });
  }, [rawData, dateFilter, customStartDate, customEndDate]);

  const parseAPIDate = (value: string) => {
    const [year, monthName, day] = value.split("-");
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    return new Date(Number(year), monthIndex, Number(day));
  };

  const previousDateFilteredRawData = useMemo(() => {
    if (dateFilter === "all") return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shiftDays = (days: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() - days);
      return d;
    };

    let from: Date | null = null;
    let to: Date | null = null;

    switch (dateFilter) {
      case "today": {
        from = shiftDays(1);
        to = shiftDays(1);
        break;
      }

      case "yesterday": {
        from = shiftDays(2);
        to = shiftDays(2);
        break;
      }

      case "this_week": {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        from = start;
        to = shiftDays(today.getDay() + 1);
        break;
      }

      case "last_week": {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 14);
        from = start;
        to = shiftDays(today.getDay() + 7);
        break;
      }

      case "this_month": {
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      }

      case "last_month": {
        from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        to = new Date(today.getFullYear(), today.getMonth() - 1, 0);
        break;
      }

      case "last_30_days":
        from = shiftDays(60);
        to = shiftDays(30);
        break;

      case "last_90_days":
        from = shiftDays(180);
        to = shiftDays(90);
        break;

      case "this_year":
        from = new Date(today.getFullYear() - 1, 0, 1);
        to = new Date(today.getFullYear() - 1, 11, 31);
        break;

      case "last_year":
        from = new Date(today.getFullYear() - 2, 0, 1);
        to = new Date(today.getFullYear() - 2, 11, 31);
        break;

      case "custom": {
        if (!customStartDate || !customEndDate) return [];
        const diffDays =
          (new Date(customEndDate).getTime() -
            new Date(customStartDate).getTime()) /
          (1000 * 60 * 60 * 24);

        from = new Date(customStartDate);
        from.setDate(from.getDate() - diffDays - 1);

        to = new Date(customStartDate);
        to.setDate(to.getDate() - 1);
        break;
      }

      default:
        return [];
    }


    return rawData.filter((row) => {
      const rowDate = parseAPIDate(row.date);
      return rowDate >= from! && rowDate <= to!;
    });
  }, [rawData, dateFilter, customStartDate, customEndDate]);


  const previousKPIs = useMemo(() => {
    const totalConversions = previousDateFilteredRawData.reduce(
      (s, r) => s + (r.conversions || 0),
      0
    );

    const totalLeads = previousDateFilteredRawData.reduce(
      (s, r) => s + (r.leads || 0),
      0
    );

    const conversionRate =
      totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;

    return { totalConversions, conversionRate };
  }, [previousDateFilteredRawData]);



  const apiData: PPCData[] = useMemo(() => {
    const map = new Map<string, any>();

    dateFilteredRawData.forEach((r) => {
      const key = `${r.company}__${r.campaign}`;

      if (!map.has(key)) {
        map.set(key, {
          company: r.company,
          campaign: r.campaign,
          totalLeads: 0,
          conversions: 0,
          conversionAmount: 0,
          expense: 0,
        });
      }

      const curr = map.get(key);
      curr.totalLeads += r.leads;
      curr.conversions += r.conversions;
      curr.conversionAmount += r.conversionAmount;
      curr.expense += r.expense;
    });

    return Array.from(map.values()).map((v) => ({
      ...v,

      conversionRate:
        v.totalLeads > 0
          ? (v.conversions / v.totalLeads) * 100
          : 0,

      roas:
        v.expense > 0
          ? v.conversionAmount / v.expense
          : 0,


    }));

  }, [dateFilteredRawData]);
  // ✅ STEP 1: ALL-TIME TOP 10 CAMPAIGNS (IGNORES DATE FILTERS)
  const top10AllTimeCampaigns = useMemo(() => {
    const map = new Map<string, {
      campaign: string;
      totalLeads: number;
      conversions: number;
      conversionAmount: number;
      expense: number;
      roas: number;
    }>();

    rawData.forEach((row) => {
      const key = row.campaign;

      if (!map.has(key)) {
        map.set(key, {
          campaign: key,
          totalLeads: 0,
          conversions: 0,
          conversionAmount: 0,
          expense: 0,
          roas: 0,
        });
      }

      const curr = map.get(key)!;
      curr.totalLeads += row.leads || 0;
      curr.conversions += row.conversions || 0;
      curr.conversionAmount += row.conversionAmount || 0;
      curr.expense += row.expense || 0;
    });

    return Array.from(map.values())
      .map((v) => ({
        ...v,
        roas: v.expense > 0 ? v.conversionAmount / v.expense : 0,
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads)
      .slice(0, 10);
  }, [rawData]);

  const campaigns = useMemo(() => {
    return Array.from(
      new Set(
        apiData
          .filter(d => selectedCompany === "ALL" || d.company === selectedCompany)
          .map(d => d.campaign)
      )
    ).sort()
  }, [apiData, selectedCompany])


  // data + loading
  // const [apiData, setApiData] = useState<PPCData[]>([]);
  // const [loading, setLoading] = useState<boolean>(false);

  const tableRef = useRef<HTMLDivElement | null>(null);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const res = await fetch("/api/google-ppc");
  //       if (!res.ok) throw new Error("API not ok");
  //       const json = await res.json();
      //       const data = json?.data ?? [];
      //       setApiData(Array.isArray(data) ? data : []);
      //     } catch (err) {
      //       console.error("Failed to fetch API", err);
      //       setApiData([]);
      //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // helpers

  // For 2 decimal display WITHOUT rounding
  const formatTwoDecimal = (value: number | undefined | null) =>
    value !== undefined && value !== null
      ? Number(value).toFixed(2)
      : "0.00";

  const totalByCompany = (company: string) =>
    apiData.filter((d) => d.company === company).reduce((s, d) => s + (d.totalLeads || 0), 0);
  const totalLeadsAll = useMemo(
    () => apiData.reduce((s, d) => s + (d.totalLeads || 0), 0),
    [apiData]
  );


  // filtered data
  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return apiData.filter((item) => {
      const matchesCompany =
        selectedCompany === "ALL" || item.company === selectedCompany

      const matchesCampaign =
        selectedCampaign === "ALL" || item.campaign === selectedCampaign

      const matchesSearch =
        !q ||
        item.campaign.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q)

      return matchesCompany && matchesCampaign && matchesSearch
    })
  }, [
    apiData,
    selectedCompany,
    selectedCampaign,
    searchTerm,
    dateFilter,
    customStartDate,
    customEndDate,
  ])



  const kpis = useMemo(() => {
    const totalLeads = filteredData.reduce((s, d) => s + (d.totalLeads || 0), 0);
    const totalConversions = filteredData.reduce((s, d) => s + (d.conversions || 0), 0);
    const totalConversionAmount = filteredData.reduce((s, d) => s + (d.conversionAmount || 0), 0);
    const totalExpense = filteredData.reduce((s, d) => s + (d.expense || 0), 0);
    const avgConversionRate = filteredData.length ? filteredData.reduce((s, d) => s + (d.conversionRate || 0), 0) / filteredData.length : 0;
    const avgRoas =
      filteredData.length > 0
        ? filteredData.reduce((sum, d) => sum + (d.roas || 0), 0) /
        filteredData.length
        : 0;
    return { totalLeads, totalConversions, totalConversionAmount, totalExpense, avgConversionRate, avgRoas };
  }, [filteredData]);

  const conversionTrend =
    kpis.totalConversions > previousKPIs.totalConversions
      ? "up"
      : kpis.totalConversions < previousKPIs.totalConversions
        ? "down"
        : "flat";


  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal: any = a[sortColumn];
      const bVal: any = b[sortColumn];

      // 🔤 STRING SORT (campaign, company)
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // 🔢 NUMBER SORT (existing behaviour)
      if (aVal === bVal) return 0;

      return sortDirection === "asc"
        ? aVal > bVal ? 1 : -1
        : aVal < bVal ? 1 : -1;
    });
  }, [filteredData, sortColumn, sortDirection]);


  //  DATE-RANGE TOP 10 CAMPAIGNS (RESPECTS FILTERS)
  const top10DateRangeCampaigns = useMemo(() => {
    const map = new Map<
      string,
      {
        campaign: string;
        totalLeads: number;
        conversions: number;
        conversionAmount: number;
        expense: number;
        roas: number;
      }
    >();

    filteredData.forEach((row) => {
      const key = row.campaign;

      if (!map.has(key)) {
        map.set(key, {
          campaign: key,
          totalLeads: 0,
          conversions: 0,
          conversionAmount: 0,
          expense: 0,
          roas: 0,
        });
      }

      const curr = map.get(key)!;
      curr.totalLeads += row.totalLeads || 0;
      curr.conversions += row.conversions || 0;
      curr.conversionAmount += row.conversionAmount || 0;
      curr.expense += row.expense || 0;
    });

    return Array.from(map.values())
      .map((v) => ({
        ...v,
        roas: v.expense > 0
          ? v.conversionAmount / v.expense
          : 0,

      }))
      .sort((a, b) => b.totalLeads - a.totalLeads)
      .slice(0, 10);
  }, [filteredData]);


  //  Final chart data based on toggle
  const chartData = top10DateRangeCampaigns;


  const totalPages = Math.ceil(sortedData.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize]);

  if (!loading && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <Card className="mx-auto mt-16 max-w-xl border-red-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <BarChart3 className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Unable to load Google PPC data</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const renderSortIcon = (column: keyof PPCData) => {
    if (sortColumn !== column) {
      return <ChevronUp className="h-3.5 w-3.5 text-white/40" />;
    }

    return sortDirection === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-white drop-shadow-sm" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-white drop-shadow-sm" />
    );
  };


  const handleSort = (col: keyof PPCData) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 backdrop-blur-md">

          <div className="flex flex-col items-center">

            {/* WRAPPER – BIGGER */}
            <div className="relative h-64 w-64 flex items-center justify-center">

              {/* SPINNER (ONLY THIS ROTATES) */}
              <div className="absolute inset-0 rounded-full border-[7px] border-teal-300/40 border-t-blue-600 animate-spin" />

              {/* LOGOS (STATIC, CENTERED) */}
              <div className="relative flex items-center gap-10 z-10">

                {/* Kairali */}
                <img
                  src="/kairali-logo-green-leaf-ayurveda.png"
                  alt="Kairali"
                  className="h-16 animate-kairali-in"
                />

                {/* Google PPC */}
                <img
                  src="/google-ppc.jpg"
                  alt="Google Ads"
                  className="h-16 animate-google-in"
                />
              </div>

            </div>

            <p className="mt-8 text-lg font-semibold text-slate-700 tracking-wide">
              Loading Google PPC data…
            </p>
          </div>
        </div>
      )}



      {/* Header */}
      <div
        className="mb-4 p-5 sm:p-6 rounded-xl shadow-xl"
        style={{
          background: "linear-gradient(90deg, #0F766E 0%, #1E40AF 50%, #312E81 100%)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          {/* LEFT : Logo + Title */}
          <div className="flex items-center gap-3 sm:gap-5 justify-center sm:justify-start min-w-0">

            {/* Google Logo — Funnel Consistent */}
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0">
              <div className="bg-white rounded-md sm:rounded-lg p-1.5 sm:p-2">
                <img
                  src="/google-ppc.jpg"
                  alt="Google Ads"
                  className="w-[40px] h-[40px] sm:w-[46px] sm:h-[46px] object-contain"
                />
              </div>

            </div>

            {/* Text */}
            <div className="min-w-0 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight truncate">
                Google PPC Performance Report
              </h1>
              <p className="hidden sm:block text-blue-100/90 text-sm sm:text-base mt-1">
                Track campaign performance and ROAS metrics
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && !loading && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-semibold text-red-800">Failed to load live Google PPC data</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Filters Panel */}
      <div className="-mt-0">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">

          {/* ================= HEADER ================= */}
          <div
            className="
        flex flex-col sm:flex-row
        items-start sm:items-center
        justify-between
        gap-4
        px-4 sm:px-6
        py-4 sm:py-5
        bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50
        border-b border-slate-200
      "
          >
            {/* LEFT */}
            <div className="flex items-center gap-3">
              <div
                className="
            w-9 h-9 sm:w-10 sm:h-10
            rounded-xl
            bg-gradient-to-br from-teal-600 to-emerald-600
            flex items-center justify-center
            shadow-md
          "
              >
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                  Filters & Search
                </h3>
                <p className="text-xs text-slate-500">
                  Narrow down results quickly
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <button
              onClick={() => {
                setSearchTerm("")
                setDateFilter("all")
                setSelectedCompany("ALL")
                setSelectedCampaign("ALL")
                setCustomStartDate("")
                setCustomEndDate("")
              }}
              className="
          w-full sm:w-auto
          inline-flex items-center justify-center
          gap-2
          px-4 py-2
          rounded-lg
          text-sm font-semibold
          text-slate-700
          bg-white
          border border-slate-300
          shadow-sm
          hover:bg-slate-100 hover:border-slate-400
          active:scale-[0.98]
          transition-all duration-200
        "
            >
              Clear Filters
            </button>
          </div>


          {/* ================= CONTENT ================= */}
          <div className="px-4 sm:px-5 py-5 space-y-4">

            {/* ================= ROW 1 ================= */}
            <div
              className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-4
          gap-4
        "
            >
              {/* SEARCH */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">
                  Search Campaign
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search campaign or company"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 sm:h-10 w-full rounded-md border-gray-300"
                  />
                </div>
              </div>

              {/* DATE RANGE */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">
                  Date Range
                </label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300 text-xs sm:text-sm">
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>

                  <SelectContent className="max-w-[calc(100vw-2rem)] text-xs sm:text-sm">
                    <SelectItem value="all">All Date</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CAMPAIGN */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">
                  Campaign
                </label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300 text-xs sm:text-sm">
                    <SelectValue placeholder="All Campaigns" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)] text-xs sm:text-sm">
                    <SelectItem value="ALL">All Campaigns</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* COMPANY */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">
                  Company
                </label>
                <Select
                  value={selectedCompany}
                  onValueChange={(value) => {
                    setSelectedCompany(value);
                    resetFilters();
                  }}
                >
                  <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300 text-xs sm:text-sm">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)] text-xs sm:text-sm">
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="KTAHV">KTAHV</SelectItem>
                    <SelectItem value="KAPPL">KAPPL</SelectItem>
                    <SelectItem value="VILLARAAG">VILLARAAG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ================= CUSTOM DATE RANGE ================= */}
            {dateFilter === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-11 sm:h-10 w-full rounded-md border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-11 sm:h-10 w-full rounded-md border-gray-300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 mt-8 px-2 sm:px-0">

        {/* TOTAL LEADS */}
        <Card className="group relative h-[170px] overflow-hidden rounded-2xl border-2 border-cyan-200/60 bg-gradient-to-br from-cyan-50 to-cyan-100/50 shadow-md hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-300/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex h-full flex-col p-5">
            {/* TOP ROW */}
            <div className="flex items-center justify-between mb-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                Total Leads
              </p>
              <div className="p-2 rounded-xl bg-cyan-500/10 shrink-0">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
            </div>

            {/* VALUE */}
            <div className="text-xl font-semibold text-slate-900 break-words leading-tight">
              {kpis.totalLeads.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* CONVERSIONS */}
        <Card className="group relative h-[170px] overflow-hidden rounded-2xl border-2 border-slate-300/60 bg-gradient-to-br from-slate-50 to-slate-100/50 shadow-md hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-slate-300/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex h-full flex-col p-5">
            <div className="flex items-center justify-between mb-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Conversions
              </p>
              <div
                className={`p-2 rounded-xl shrink-0 ${conversionTrend === "up"
                  ? "bg-green-100"
                  : conversionTrend === "down"
                    ? "bg-red-100"
                    : "bg-slate-100"
                  }`}
              >
                {conversionTrend === "up" ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : conversionTrend === "down" ? (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                ) : (
                  <Target className="h-5 w-5 text-slate-600" />
                )}
              </div>
            </div>

            <div className="text-xl font-semibold text-slate-900 break-words leading-tight">
              {kpis.totalConversions.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* CONVERSION AMOUNT */}
        <Card className="group relative h-[170px] overflow-hidden rounded-2xl border-2 border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-md hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-300/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex h-full flex-col p-5">
            <div className="flex items-center justify-between mb-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Conversion Amount
              </p>
              <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
            </div>

            <div className="text-xl font-semibold text-slate-900 break-words leading-tight">
              ₹{roundCurrency(kpis.totalConversionAmount).toLocaleString()}
            </div>
          </div>
        </Card>

        {/* EXPENSE */}
        <Card className="group relative h-[170px] overflow-hidden rounded-2xl border-2 border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50 to-fuchsia-100/50 shadow-md hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-fuchsia-300/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex h-full flex-col p-5">
            <div className="flex items-center justify-between mb-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-700">
                Expense
              </p>
              <div className="p-2 rounded-xl bg-fuchsia-500/10 shrink-0">
                <IndianRupee className="h-5 w-5 text-fuchsia-600" />
              </div>
            </div>

            <div className="text-xl font-semibold text-slate-900 break-words leading-tight">
              ₹{roundCurrency(kpis.totalExpense).toLocaleString()}
            </div>
          </div>
        </Card>

        {/* AVG CONVERSION RATE */}
        <Card className="group relative h-[170px] overflow-hidden rounded-2xl border-2 border-orange-200/60 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-md hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-orange-300/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex h-full flex-col p-5">
            <div className="flex items-center justify-between mb-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                Avg Conversion Rate
              </p>
              <div className="p-2 rounded-xl bg-orange-500/10 shrink-0">
                <Percent className="h-5 w-5 text-orange-600" />
              </div>
            </div>

            <div className="text-xl font-semibold text-slate-900 break-words leading-tight">
              {formatTwoDecimal(kpis.avgConversionRate)}%
            </div>
          </div>
        </Card>

        {/* AVG ROAS */}
        <Card className="group relative h-[170px] overflow-hidden rounded-2xl border-2 border-teal-200/60 bg-gradient-to-br from-teal-50 to-teal-100/50 shadow-md hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-teal-300/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex h-full flex-col p-5">
            <div className="flex items-center justify-between mb-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                Avg ROAS
              </p>
              <div className="p-2 rounded-xl bg-teal-500/10 shrink-0">
                <BarChart3 className="h-5 w-5 text-teal-600" />
              </div>
            </div>

            <div className="text-xl font-semibold text-slate-900 break-words leading-tight">
              {formatTwoDecimal(kpis.avgRoas)}x
            </div>
          </div>
        </Card>

      </div>



      {/* Table / Chart Toggle */}
      <Card ref={tableRef} className="p-4 sm:p-5 bg-white shadow-lg rounded-xl">
        <div
          className="
      w-full
      flex flex-col sm:flex-row
      sm:items-center sm:justify-between
      gap-3 sm:gap-0
      px-4 sm:px-5
      py-2.5
      bg-[#d6eefc]
      rounded-lg
    "
        >
          {/* LEFT: Title + Campaign Count */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              Campaign Performance Analysis
            </h2>

            <span
              className="
          inline-flex items-center
          px-2.5 py-0.5
          rounded-full
          text-xs sm:text-sm
          font-semibold
          bg-blue-100 text-blue-800
          whitespace-nowrap
          mx-auto sm:mx-0
        "
            >
              {filteredData.length} Campaign
              {filteredData.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* RIGHT: View Mode Toggle */}
          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            <Button
              onClick={() => setViewMode("table")}
              size="sm"
              variant={viewMode === "table" ? "default" : "outline"}
              className={`transition-all duration-200 ${viewMode === "table"
                ? "bg-blue-600 shadow-md text-white"
                : "hover:bg-blue-50"
                }`}
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Table View
            </Button>

            <Button
              onClick={() => setViewMode("chart")}
              size="sm"
              variant={viewMode === "chart" ? "default" : "outline"}
              className={`transition-all duration-200 ${viewMode === "chart"
                ? "bg-blue-600 shadow-md text-white"
                : "hover:bg-blue-50"
                }`}
            >
              <LineChart className="h-4 w-4 mr-2" />
              Chart View
            </Button>
          </div>
        </div>




        {
          viewMode === "table" ? (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-gradient-to-b from-[#1F3A5F] to-[#162B46] text-white">

                      {/* CAMPAIGN */}
                      <th
                        className="p-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wider
        border-r border-white/15 cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("campaign")}
                      >
                        <div className="flex items-center gap-1">
                          Campaign
                          {renderSortIcon("campaign")}
                        </div>
                      </th>

                      {/* COMPANY */}
                      <th
                        className="p-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider
        border-r border-white/15 cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("company")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Company
                          {renderSortIcon("company")}
                        </div>
                      </th>

                      <th
                        className="p-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider
        border-r border-white/15 cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("totalLeads")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Total Leads
                          {renderSortIcon("totalLeads")}
                        </div>
                      </th>

                      <th
                        className="p-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider
        border-r border-white/15 cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("conversions")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Conversions
                          {renderSortIcon("conversions")}
                        </div>
                      </th>

                      <th
                        className="p-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider
        border-r border-white/15 cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("conversionAmount")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Conv. Amount
                          {renderSortIcon("conversionAmount")}
                        </div>
                      </th>

                      <th
                        className="p-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider
        border-r border-white/15 cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("expense")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Expense
                          {renderSortIcon("expense")}
                        </div>
                      </th>

                      <th
                        className="p-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider
        border-r border-white/15 cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("conversionRate")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Conv. Rate
                          {renderSortIcon("conversionRate")}
                        </div>
                      </th>

                      <th
                        className="p-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider
        cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => handleSort("roas")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          ROAS
                          {renderSortIcon("roas")}
                        </div>
                      </th>

                    </tr>
                  </thead>

                  {/* ================= TBODY ================= */}
                  <tbody
                    className="
      bg-white
      [&_tr:hover]:bg-blue-200
      [&_tr]:transition-colors
      [&_tr]:duration-150
    "
                  >
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row) => (
                        <tr
                          key={`${row.company}-${row.campaign}`}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          {/* CAMPAIGN */}
                          <td className="p-3 text-left align-middle">
                            <div className="font-medium text-slate-900 text-sm leading-snug">
                              {row.campaign}
                            </div>
                          </td>

                          {/* COMPANY */}
                          <td className="p-3 text-center align-middle">
                            <Badge
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${row.company === "KTAHV"
                                ? "bg-blue-100 text-blue-700"
                                : row.company === "KAPPL"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                                }`}
                            >
                              {row.company}
                            </Badge>
                          </td>

                          <td className="p-3 text-center font-medium text-sm">
                            {row.totalLeads.toLocaleString()}
                          </td>

                          <td className="p-3 text-center text-green-700 font-semibold text-sm">
                            {row.conversions.toLocaleString()}
                          </td>

                          <td className="p-3 text-center font-semibold text-sm text-blue-600">
                            ₹{roundCurrency(row.conversionAmount).toLocaleString()}
                          </td>

                          <td className="p-3 text-center text-amber-700 font-semibold text-sm">
                            ₹{roundCurrency(row.expense).toLocaleString()}
                          </td>

                          <td className="p-3 text-center">
                            <Badge className="bg-indigo-100 text-indigo-700">
                              {formatTwoDecimal(row.conversionRate)}%
                            </Badge>
                          </td>

                          <td className="p-3 text-center">
                            <Badge className="bg-emerald-100 text-emerald-700">
                              {formatTwoDecimal(row.roas)}x
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      /* ✅ NO RECORDS FOUND */
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                              <Search className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-base font-semibold text-slate-700">
                              No records found
                            </p>
                            <p className="text-sm text-slate-500 max-w-md">
                              Try adjusting the date range, campaign, company, or search keyword.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

              </div>

              {/* Pagination */}
              <div
                className="
    bg-white
    border-t border-slate-200
    mt-4
    px-4 py-3
    flex flex-col sm:flex-row
    items-center
    justify-center sm:justify-between
    gap-4
    shadow-[0_-4px_12px_rgba(0,0,0,0.06)]
  "
              >
                {/* LEFT – Rows per page */}
                <div className="flex items-center gap-2 justify-center sm:justify-start w-full sm:w-auto">
                  <span className="text-sm text-slate-600 font-medium">
                    Rows per page:
                  </span>

                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="h-9 w-[90px] border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* RIGHT – Controls */}
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    First
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>

                  <span className="text-sm text-slate-700 font-medium">
                    Page <strong>{currentPage}</strong> of{" "}
                    <strong>{totalPages}</strong>
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8">

              {/* Lead & Conversion Performance - with KPI row */}
              <Card className="p-5 sm:p-6 bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-lg transition-shadow">

                {/* TITLE */}
                <div className="mb-5 flex items-start justify-between gap-4">
                  {/* LEFT: TITLE */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Lead & Conversion Performance
                      <AllTimeBadge />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      All-time top 10 campaigns by leads & conversions
                    </p>
                  </div>

                  {/* RIGHT: TOGGLE */}
                  {/* <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs shrink-0">
                    <button
                      onClick={() => setChartMode("all-time")}
                      className={`px-3 py-1 rounded-md font-semibold transition ${chartMode === "all-time"
                        ? "bg-white text-blue-700 shadow"
                        : "text-slate-500"
                        }`}
                    >
                      All-time
                    </button>

                    <button
                      onClick={() => setChartMode("date-range")}
                      className={`px-3 py-1 rounded-md font-semibold transition ${chartMode === "date-range"
                        ? "bg-white text-blue-700 shadow"
                        : "text-slate-500"
                        }`}
                    >
                      Date range
                    </button>
                  </div> */}
                </div>



                {/* KPI SUMMARY ROW */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">

                  <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                      Total Leads
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-800 mt-1">
                      {kpis.totalLeads.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">
                      Conversions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-green-800 mt-1">
                      {kpis.totalConversions.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">
                      Conv. Rate
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-800 mt-1">
                      {formatTwoDecimal(kpis.avgConversionRate)}%

                    </p>
                  </div>

                  <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">
                      ROAS
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">
                      {formatTwoDecimal(kpis.avgRoas)}x
                    </p>
                  </div>

                </div>


                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} barGap={6} barSize={35}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                    <XAxis dataKey="campaign" angle={-25} textAnchor="end" height={80} tick={{ fill: "#374151", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#374151", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Legend />
                    <Bar dataKey="totalLeads" name="Total Leads" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="conversions" name="Conversions" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Company Distribution - upgraded with KPI row + donut center */}
              <Card className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-2xl transition-all">

                {/* HEADER WITH HOVER TOOLTIP */}
                <div className="relative inline-block group mb-4">
                  <h3 className="text-xl font-bold text-slate-900 cursor-help">
                    🏢 Company Distribution Breakdown
                  </h3>

                  {/* TOOLTIP */}
                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50">
                    <div className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-xl whitespace-nowrap">
                      Total Leads:{" "}
                      <span className="font-semibold">
                        {(
                          totalByCompany("KTAHV") +
                          totalByCompany("KAPPL") +
                          totalByCompany("VILLARAAG")
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI SUMMARY ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-3">

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm text-center hover:scale-[1.02] transition">
                    <p className="text-sm text-blue-600 font-semibold">KTAHV Leads</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {totalByCompany("KTAHV").toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm text-center hover:scale-[1.02] transition">
                    <p className="text-sm text-green-600 font-semibold">KAPPL Leads</p>
                    <p className="text-2xl font-bold text-green-800">
                      {totalByCompany("KAPPL").toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm text-center hover:scale-[1.02] transition">
                    <p className="text-sm text-purple-600 font-semibold">VILLARAAG Leads</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {totalByCompany("VILLARAAG").toLocaleString()}
                    </p>
                  </div>

                </div>



                {/* Donut Pie Chart with center total */}
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>

                    <Pie
                      data={[
                        { name: "KTAHV", value: totalByCompany("KTAHV") },
                        { name: "KAPPL", value: totalByCompany("KAPPL") },
                        { name: "VILLARAAG", value: totalByCompany("VILLARAAG") },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={4}
                      stroke="none"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                      <Cell fill="#8b5cf6" />
                    </Pie>

                    {/* HOVER TOOLTIP */}
                    <Tooltip
                      formatter={(value, name) => [
                        value.toLocaleString(),
                        `${name} Leads`,
                      ]}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "8px",
                        border: "none",
                        color: "#fff",
                      }}
                      itemStyle={{ color: "#fff" }}
                    />

                    {/* Center total */}
                    <text
                      x="50%"
                      y="47%"
                      textAnchor="middle"
                      fontSize="28"
                      fontWeight="700"
                      fill="#1f2937"
                    >
                      {totalLeadsAll.toLocaleString()}
                    </text>

                    <text
                      x="50%"
                      y="60%"
                      textAnchor="middle"
                      fontSize="13"
                      fill="#6b7280"
                    >
                      Total Leads
                    </text>

                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>

              </Card>

              {/* Revenue vs Expense */}
              <Card className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-2xl transition-all">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  💰 Revenue vs Expense Comparison
                  <AllTimeBadge />
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-2">
                  All-time top 10 campaigns – revenue vs expense
                </p>


                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} barSize={35}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                    <XAxis dataKey="campaign" angle={-25} textAnchor="end" height={80} tick={{ fill: "#374151", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#374151", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Legend />
                    <Bar dataKey="conversionAmount" name="Revenue (₹)" fill="#a855f7" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expense (₹)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* ROAS Performance */}
              <Card className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-2xl transition-all">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  📈 ROAS Trend Analysis
                  <AllTimeBadge />
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-2">
                  All-time top 10 campaigns by ROAS
                </p>


                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                    <XAxis dataKey="campaign" angle={-25} textAnchor="end" height={80} tick={{ fill: "#374151", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#374151", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Legend />
                    <Bar dataKey="roas" name="ROAS" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

            </div>
          )
        }
      </Card >
    </div >
  );
}
