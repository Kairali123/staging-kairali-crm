"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import useSalesData from "@/hooks/useSalesData";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, TrendingUp, TrendingDown, TableIcon, BarChart3, ChevronUp, ChevronDown, Filter, Search, Award, Target, DollarSign, Activity, ChevronsUpDown, AlertCircle, XCircle, Calendar, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Cell, LabelList, Area, AreaChart } from "recharts"
import type { SalesRow } from "@/hooks/useSalesData"
import type { Border, Fill } from "exceljs"
import { Medal } from "lucide-react"

// ─── Sticky column pixel constants ────────────────────────────────────────────
// MOBILE-FIRST sizing: Rank=56px, Name=150px → total frozen = 206px
// On a 390px wide mobile: 184px remains for scrollable content (shows ~1.5 cols)
// These constants MUST exactly match the colgroup <col> widths below.
const RANK_W = 56    // px – Rank column
const NAME_W = 150   // px – Employee Name column
const NAME_L = RANK_W            // left offset for Employee Name sticky cell
const TH_BG = '#1e293b'         // slate-800
const SHADOW_R = '3px 0 8px -2px rgba(0,0,0,0.30)'
// ──────────────────────────────────────────────────────────────────────────────

export default function SalesReportsPage() {

  const normalizeEmployeeForApi = (name = "") =>
    name.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();

  const MONTH_ORDER = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];

  // New API stores month as zero-padded number "01"–"12"
  // These helpers convert between UI month names and API month numbers
  const monthNameToNum = (name: string): string =>
    String(MONTH_ORDER.indexOf(name.toUpperCase()) + 1).padStart(2, "0")
  const monthNumToName = (num: string): string =>
    MONTH_ORDER[parseInt(num, 10) - 1] ?? "UNKNOWN"

  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")

  const _months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];

  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [filterMode, setFilterMode] = useState<"dateRange" | "monthYear">("monthYear")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [sortBy, setSortBy] = useState<keyof SalesRow | "rank">("rank")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [view, setView] = useState<"table" | "graph">("table")
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const toggleDate = (date: string) => setExpandedDates(prev => {
    const next = new Set(prev)
    next.has(date) ? next.delete(date) : next.add(date)
    return next
  })

  const PageLoader = () => (
    <div className="fixed inset-0 z-[30] flex items-center justify-center bg-white pointer-events-auto">
      <div className="flex flex-col items-center gap-6">
        <img src="/grouploader.gif" alt="Logo" className="w-48 h-auto object-contain" />
        <p className="text-base font-semibold text-slate-700">Loading data...</p>
      </div>
    </div>
  )

  const { salesData, loading, error, refetch } = useSalesData()
  const isInitialLoad = useRef(true)

  useEffect(() => {
    if (!loading && isInitialLoad.current && salesData.length > 0) {
      const now = new Date()
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
      setMonthFilter(months[lastMonthDate.getMonth()])
      setYearFilter(lastMonthDate.getFullYear().toString())
      setEmployeeFilter("all")
      setCompanyFilter("KTAHV")
      setCurrentPage(1)
      isInitialLoad.current = false
    }
  }, [loading, salesData])

  const availableYears = useMemo(() =>
    Array.from(new Set(salesData.map(d => d.year))).sort(), [salesData])

  const availableCompanies = useMemo(() =>
    Array.from(new Set(salesData.map(d => d.company).filter((c): c is string => typeof c === "string" && c.trim() !== ""))).sort(),
    [salesData])

  const [showLoader, setShowLoader] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const loaderStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (loading) {
      loaderStartRef.current = Date.now()
      setShowLoader(true)
    } else {
      const elapsed = Date.now() - (loaderStartRef.current || 0)
      const minDisplay = 700
      if (elapsed < minDisplay) {
        const t = setTimeout(() => { setShowLoader(false); setLastUpdated(new Date()) }, minDisplay - elapsed)
        return () => clearTimeout(t)
      }
      setShowLoader(false)
      setLastUpdated(new Date())
    }
  }, [loading])

  useEffect(() => {
    if (showLoader) { document.body.style.overflow = "hidden"; window.scrollTo(0, 0) }
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [showLoader])

  // Date Range selected → disable Month/Year
  const handleDateFilterChange = (val: string) => {
    setDateFilter(val)
    if (val !== "all") {
      setFilterMode("dateRange")
      setMonthFilter("all")
      setYearFilter("all")
    } else {
      setFilterMode("monthYear")
    }
  }

  // Month selected → disable Date Range
  const handleMonthFilterChange = (val: string) => {
    setMonthFilter(val)
    if (val !== "all") {
      setFilterMode("monthYear")
      setDateFilter("all")
      setCustomFromDate("")
      setCustomToDate("")
    } else if (yearFilter === "all") {
      setFilterMode("monthYear")
    }
  }

  // Year selected → disable Date Range
  const handleYearFilterChange = (val: string) => {
    setYearFilter(val)
    if (val !== "all") {
      setFilterMode("monthYear")
      setDateFilter("all")
      setCustomFromDate("")
      setCustomToDate("")
    } else if (monthFilter === "all") {
      setFilterMode("monthYear")
    }
  }

  useEffect(() => {
    if (filterMode !== "dateRange") return
    const now = new Date()
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
    const currentMonth = months[now.getMonth()]
    const currentYear = now.getFullYear().toString()

    switch (dateFilter) {
      case "today":
      case "this_week":
        setMonthFilter(currentMonth); setYearFilter(currentYear); break
      case "this_month": setMonthFilter(currentMonth); setYearFilter(currentYear); break
      case "last_month": {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        setMonthFilter(months[d.getMonth()]); setYearFilter(d.getFullYear().toString()); break
      }
      case "this_quarter":
      case "last_quarter":
      case "this_year":
        setMonthFilter("all"); setYearFilter(currentYear); break
      case "last_year": setMonthFilter("all"); setYearFilter((now.getFullYear() - 1).toString()); break
      default: break
    }
  }, [dateFilter, filterMode])

  const previousMonthData = useMemo(() => {
    if (monthFilter === "all" || yearFilter === "all")
      return { plannedSalesAmount: 0, actualSalesAmount: 0, varianceAmount: 0, variancePercent: 0 }
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
    const idx = months.indexOf(monthFilter)
    const prevMonthName = idx > 0 ? months[idx - 1] : months[11]
    const prevMonthNum = monthNameToNum(prevMonthName)
    const prevData = salesData.filter(d => d.month === prevMonthNum && d.year === yearFilter)
    return {
      plannedSalesAmount: prevData.reduce((s, r) => s + r.plannedSalesAmount, 0),
      actualSalesAmount: prevData.reduce((s, r) => s + r.actualSalesAmount, 0),
      varianceAmount: prevData.reduce((s, r) => s + r.varianceAmount, 0),
      variancePercent: prevData.length > 0 ? prevData.reduce((s, r) => s + r.variancePercent, 0) / prevData.length : 0,
    }
  }, [monthFilter, yearFilter, salesData])

  const filteredData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear().toString()

    // Quarter helper: returns { monthNums: string[], year: string }
    const getQuarterMonths = (filter: string) => {
      const m = now.getMonth() // 0-indexed
      const currentQ = Math.floor(m / 3) // 0,1,2,3
      if (filter === "this_quarter") {
        const start = currentQ * 3
        return { monthNums: _months.slice(start, start + 3).map(monthNameToNum), year: currentYear }
      }
      if (filter === "last_quarter") {
        const prevQ = currentQ === 0 ? 3 : currentQ - 1
        const prevYear = currentQ === 0 ? (now.getFullYear() - 1).toString() : currentYear
        const start = prevQ * 3
        return { monthNums: _months.slice(start, start + 3).map(monthNameToNum), year: prevYear }
      }
      return null
    }

    return salesData.filter(row => {
      const matchesCompany = companyFilter === "all" || row.company === companyFilter
      const matchesEmployee = employeeFilter === "all" || row.empName === employeeFilter
      const matchesSearch = searchQuery === "" ||
        row.empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.company.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesDate = true
      if (dateFilter === "custom" && customFromDate && customToDate) {
        // row.date is "dd-mm-yyyy", parse to comparable Date
        const [dd, mm, yyyy] = row.date.split("-")
        const rowDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
        const fromDate = new Date(customFromDate); fromDate.setHours(0, 0, 0, 0)
        const toDate = new Date(customToDate); toDate.setHours(23, 59, 59, 999)
        matchesDate = rowDate >= fromDate && rowDate <= toDate
      }

      // Quarter filters — override monthFilter/yearFilter logic
      if (dateFilter === "this_quarter" || dateFilter === "last_quarter") {
        const q = getQuarterMonths(dateFilter)!
        return matchesCompany && matchesEmployee && matchesSearch &&
          q.monthNums.includes(row.month) && row.year === q.year
      }

      // monthFilter is a name like "JANUARY" — convert to "01" for comparison
      const activeMonthNum = monthFilter !== "all" ? monthNameToNum(monthFilter) : "all"
      const matchesMonth = dateFilter === "custom" ? true : activeMonthNum === "all" || row.month === activeMonthNum
      const matchesYear = dateFilter === "custom" ? true : yearFilter === "all" || row.year === yearFilter
      return matchesCompany && matchesEmployee && matchesSearch && matchesMonth && matchesYear && matchesDate
    })
  }, [salesData, monthFilter, yearFilter, companyFilter, employeeFilter, searchQuery, dateFilter, customFromDate, customToDate])

  const handleSort = (column: keyof SalesRow | "rank") => {
    if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(column); setSortOrder("asc") }
  }

  const sortedData = useMemo(() => {
    let base: typeof filteredData = []

    if (sortBy === "year") {
      base = [...filteredData].sort((a, b) => {
        if (a.year !== b.year) return Number(b.year) - Number(a.year)
        // sort by full date descending when year ties
        return b.date.split("-").reverse().join("").localeCompare(a.date.split("-").reverse().join(""))
      })
    } else if (sortBy === "rank") {
      base = [...filteredData]
    } else {
      base = [...filteredData].sort((a, b) => {
        const av = a[sortBy], bv = b[sortBy]
        if (av == null) return 1; if (bv == null) return -1
        if (typeof av === "string" && typeof bv === "string")
          return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
        if (typeof av === "number" && typeof bv === "number")
          return sortOrder === "asc" ? av - bv : bv - av
        return 0
      })
    }

    const scoped = yearFilter === "all" ? base : base.filter(r => r.year === yearFilter)
    const ranked = [...scoped].sort((a, b) => b.actualSalesAmount - a.actualSalesAmount)
    const withRanks = ranked.map((r, i) => ({ ...r, rank: i + 1 }))

    if (sortBy === "rank" || sortBy === "actualSalesAmount")
      return sortOrder === "asc" ? withRanks : [...withRanks].reverse()

    return base.map(row => {
      const r = withRanks.find(x => x.empName === row.empName && x.date === row.date)
      return { ...row, rank: r?.rank || 0 }
    })
  }, [filteredData, sortBy, sortOrder, yearFilter])

  const grandTotal = useMemo(() => {
    if (!filteredData.length)
      return { plannedSalesAmount: 0, actualSalesAmount: 0, unverifiedSalesAmount: 0, cancelledSalesAmount: 0, collectionAmount: 0, varianceAmount: 0, variancePercent: 0 }
    const planned = filteredData.reduce((s, r) => s + (r.plannedSalesAmount || 0), 0)
    const actual = filteredData.reduce((s, r) => s + (r.actualSalesAmount || 0), 0)
    const unverified = filteredData.reduce((s, r) => s + (r.unverifiedSalesAmount || 0), 0)
    const cancelled = filteredData.reduce((s, r) => s + (r.cancelledSalesAmount || 0), 0)
    const collection = filteredData.reduce((s, r) => s + (r.collectionAmount || 0), 0)
    const variance = actual - planned
    return { plannedSalesAmount: planned, actualSalesAmount: actual, unverifiedSalesAmount: unverified, cancelledSalesAmount: cancelled, collectionAmount: collection, varianceAmount: variance, variancePercent: planned !== 0 ? (variance / planned) * 100 : 0 }
  }, [filteredData])

  const growthMetrics = useMemo(() => ({
    plannedGrowth: previousMonthData.plannedSalesAmount !== 0 ? ((grandTotal.plannedSalesAmount - previousMonthData.plannedSalesAmount) / previousMonthData.plannedSalesAmount) * 100 : 0,
    actualGrowth: previousMonthData.actualSalesAmount !== 0 ? ((grandTotal.actualSalesAmount - previousMonthData.actualSalesAmount) / previousMonthData.actualSalesAmount) * 100 : 0,
    varianceGrowth: previousMonthData.varianceAmount !== 0 ? ((grandTotal.varianceAmount - previousMonthData.varianceAmount) / previousMonthData.varianceAmount) * 100 : 0,
    variancePercentGrowth: grandTotal.variancePercent - previousMonthData.variancePercent,
  }), [grandTotal, previousMonthData])

  const handlePrint = () => window.print()

  const handleExcelDownload = async () => {
    const ExcelJS = (await import("exceljs")).default
    const { saveAs } = await import("file-saver")

    const companyLabel = companyFilter === "all" ? "All Companies" : companyFilter
    const monthLabel = monthFilter === "all" ? "All Months" : monthFilter
    const yearLabel = yearFilter === "all" ? "All Years" : yearFilter
    const empLabel = employeeFilter === "all" ? "All Employees" : employeeFilter

    const wb = new ExcelJS.Workbook()
    wb.creator = "Kairali CRM"
    wb.created = new Date()
    const sheetName = companyFilter === "all" ? "All Companies" : companyFilter.slice(0, 31)
    const ws = wb.addWorksheet(sheetName, { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 } })

    // ── Column widths ──────────────────────────────────────────────────────────
    ws.columns = [
      { width: 6 },  // Rank
      { width: 22 }, // Emp Name
      { width: 12 }, // Company
      { width: 14 }, // Date  (was Month + Year)
      { width: 18 }, // Planned
      { width: 18 }, // Actual
      { width: 18 }, // Variance Amt
      { width: 12 }, // Variance %
      { width: 18 }, // Collection
      { width: 18 }, // Unverified
      { width: 18 }, // Cancelled
    ]

    // ── Helper styles ──────────────────────────────────────────────────────────
    const titleFill: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
    const infoFill: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
    const headerFill: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
    const greenFill: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }
    const redFill: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }
    const altFill: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }

    const thin: Border = { style: "thin", color: { argb: "FFE2E8F0" } }
    const allBorders = { top: thin, left: thin, bottom: thin, right: thin }

    // ── ROW 1 — Title ──────────────────────────────────────────────────────────
    ws.mergeCells("A1:K1")
    const titleRow = ws.getRow(1)
    titleRow.height = 28
    const titleCell = ws.getCell("A1")
    titleCell.value = "📊  Sales Performance Report"
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" }, name: "Arial" }
    titleCell.fill = titleFill
    titleCell.alignment = { vertical: "middle", horizontal: "center" }

    // ── ROW 2 — Info bar ──────────────────────────────────────────────────────
    ws.mergeCells("A2:K2")
    const infoRow = ws.getRow(2)
    infoRow.height = 20
    const infoCell = ws.getCell("A2")
    infoCell.value = `Company: ${companyLabel}     |     Month: ${monthLabel}     |     Year: ${yearLabel}     |     Employee: ${empLabel}     |     Records: ${sortedData.length}     |     Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`
    infoCell.font = { bold: false, size: 10, color: { argb: "FFE2E8F0" }, name: "Arial" }
    infoCell.fill = infoFill
    infoCell.alignment = { vertical: "middle", horizontal: "center" }

    // ── ROW 3 — blank spacer ───────────────────────────────────────────────────
    ws.getRow(3).height = 6

    // ── ROW 4 — Column Headers ─────────────────────────────────────────────────
    const headers = ["Rank", "Employee Name", "Company", "Date",
      "Planned Sales", "Actual Sales", "Variance Amt", "Variance %",
      "Collection", "Unverified Sales", "Cancelled Sales"]
    const hRow = ws.getRow(4)
    hRow.height = 22
    headers.forEach((h, i) => {
      const cell = hRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" }, name: "Arial" }
      cell.fill = headerFill
      cell.alignment = { vertical: "middle", horizontal: i < 2 ? "left" : "center" }
      cell.border = allBorders
    })

    // ── DATA ROWS ──────────────────────────────────────────────────────────────
    const numCols = [5, 6, 7, 8, 9, 10, 11] // 1-indexed cols with currency values (shifted by -1 vs before)
    const pctCol = 8 // Variance % (was 9)

    sortedData.forEach((item, idx) => {
      const r = ws.getRow(5 + idx)
      r.height = 18
      const isAlt = idx % 2 === 1
      const values = [
        item.rank, item.empName, item.company, item.date,  // date replaces month + year
        item.plannedSalesAmount || 0,
        item.actualSalesAmount || 0,
        item.varianceAmount || 0,
        item.variancePercent || 0,
        item.collectionAmount || 0,
        item.unverifiedSalesAmount || 0,
        item.cancelledSalesAmount || 0,
      ]
      values.forEach((val, ci) => {
        const cell = r.getCell(ci + 1)
        cell.value = val
        cell.font = { size: 10, name: "Arial" }
        cell.border = allBorders
        cell.alignment = { vertical: "middle", horizontal: ci < 2 ? "left" : "center" }

        const colNum = ci + 1
        const isNumeric = numCols.includes(colNum)
        const isPct = colNum === pctCol

        if (isPct) {
          const v = Number(val)
          cell.font = { size: 10, name: "Arial", bold: true, color: { argb: v >= 0 ? "FF166534" : "FF991B1B" } }
          cell.fill = v >= 0 ? greenFill : redFill
          cell.numFmt = '0.00"%"'
        } else if (colNum === 7) {
          // Variance Amount — color + highlight
          const v = Number(val)
          cell.font = { size: 10, name: "Arial", bold: true, color: { argb: v >= 0 ? "FF166534" : "FF991B1B" } }
          cell.fill = v >= 0 ? greenFill : redFill
          cell.numFmt = '₹#,##0'
        } else if (isNumeric) {
          cell.numFmt = '₹#,##0'
          cell.fill = isAlt ? altFill : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
        } else {
          cell.fill = isAlt ? altFill : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
        }
      })
    })

    // ── Save ──────────────────────────────────────────────────────────────────
    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `Sales_${companyLabel}_${monthLabel}_${yearLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const handleTablePrint = () => {
    const companyLabel = companyFilter === "all" ? "All Companies" : companyFilter
    const monthLabel = monthFilter === "all" ? "All Months" : monthFilter
    const yearLabel = yearFilter === "all" ? "All Years" : yearFilter
    const employeeLabel = employeeFilter === "all" ? "All Employees" : employeeFilter

    const rows = sortedData.map(item => `
      <tr>
        <td>${item.rank}</td>
        <td>${item.empName}</td>
        <td>${item.company}</td>
        <td>${item.date}</td>
        <td>₹${Math.round(item.plannedSalesAmount || 0).toLocaleString("en-IN")}</td>
        <td>₹${Math.round(item.actualSalesAmount || 0).toLocaleString("en-IN")}</td>
        <td style="color:${(item.varianceAmount || 0) >= 0 ? '#166534' : '#991b1b'}">₹${Math.round(item.varianceAmount || 0).toLocaleString("en-IN")}</td>
        <td style="color:${(item.variancePercent || 0) >= 0 ? '#166534' : '#991b1b'}">${(item.variancePercent || 0).toFixed(1)}%</td>
        <td>₹${Math.round(item.collectionAmount || 0).toLocaleString("en-IN")}</td>
        <td>₹${Math.round(item.unverifiedSalesAmount || 0).toLocaleString("en-IN")}</td>
        <td>₹${Math.round(item.cancelledSalesAmount || 0).toLocaleString("en-IN")}</td>
      </tr>`).join("")

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Sales Report – ${companyLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
    .header { margin-bottom: 12px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; }
    .title { font-size: 18px; font-weight: bold; color: #1e293b; }
    .company-badge { display: inline-block; margin-top: 4px; background: #1e3a5f; color: white; padding: 3px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; }
    .meta-row { margin-top: 6px; font-size: 10px; color: #475569; }
    .meta-row span { margin-right: 16px; }
    .meta-row .label { font-weight: 600; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #1e293b; color: white; padding: 6px 7px; text-align: left; font-size: 9.5px; white-space: nowrap; }
    td { padding: 5px 7px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; }
    tr:nth-child(even) td { background: #f8fafc; }
    @page { margin: 12mm 10mm; size: A4 landscape; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Sales Performance Report</div>
    <div class="company-badge">🏢 ${companyLabel}</div>
    <div class="meta-row">
      <span><span class="label">Month:</span> ${monthLabel}</span>
      <span><span class="label">Year:</span> ${yearLabel}</span>
      <span><span class="label">Employee:</span> ${employeeLabel}</span>
      <span><span class="label">Records:</span> ${sortedData.length}</span>
      <span><span class="label">Printed:</span> ${format(new Date(), "dd MMM yyyy, hh:mm a")}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Rank</th><th>Employee Name</th><th>Company</th><th>Date</th>
        <th>Planned Sales</th><th>Actual Sales</th><th>Variance Amt</th><th>Variance %</th>
        <th>Collection</th><th>Unverified</th><th>Cancelled</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

    const win = window.open("", "_blank", "width=1200,height=800")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const staticEmployees = [
    "Puneet Endlay", "Pawan Kamra", "Sadik Rehman", "Vidisha Bahukhandi",
    "Harpal Singh", "Zaki Ahmed", "Pushpanshu Kumar (KTAHV)", "Pushpanshu Kumar (KAPPL)",
    "Levil Kumar", "Pushpanshu Kumar (VILLARAAG)", "Pawan Kamra (VILLARAAG)",
    "Sadik Rehman (VILLARAAG)", "Harpal Singh (VILLARAAG)", "Levil Kumar (VILLARAAG)",
    "Online order", "OTA ", "Online Reservation",
  ]

  const formatCurrency = (v: number | undefined | null) => !v || isNaN(v) ? "0" : Math.round(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })
  const formatPercentage = (v: number | undefined | null) => !v || isNaN(v) ? "0.0" : v.toFixed(1)

  const SortIcon = ({ column }: { column: keyof SalesRow | "rank" }) =>
    sortBy !== column
      ? <ChevronsUpDown className="ml-1 h-3 w-3 text-slate-400" />
      : sortOrder === "asc"
        ? <ChevronUp className="ml-1 h-3 w-3 text-white" />
        : <ChevronDown className="ml-1 h-3 w-3 text-white" />

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload || {}
    const planned = Number(d.planned ?? 0)
    const actual = Number(d.actual ?? 0)
    const unverified = Number(d.unverified ?? 0)
    const cancelled = Number(d.cancelled ?? 0)
    const variance = Number(d.variance ?? (actual - planned))
    const vp = Number(d.variancePercent ?? (planned !== 0 ? (variance / planned) * 100 : 0))
    return (
      <div style={{ borderRadius: 12, border: "2px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: 12, backgroundColor: "white", minWidth: 180 }}>
        <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8, fontSize: 14 }}>{label}</div>
        <div className="flex flex-col gap-1">
          {[["Planned", formatCurrency(planned), "text-slate-600", ""],
          ["Actual", formatCurrency(actual), "text-slate-600", ""],
          ["Unverified", formatCurrency(unverified), "text-yellow-600", "text-yellow-700"],
          ["Cancelled", formatCurrency(cancelled), "text-red-600", "text-red-700"],
          ["Variance", formatCurrency(variance), "text-slate-600", variance >= 0 ? "text-green-700" : "text-red-700"],
          ].map(([lbl, val, lc, vc]) => (
            <div key={lbl} className="flex justify-between">
              <div className={`text-xs ${lc}`}>{lbl}</div>
              <div className={`text-sm font-semibold ${vc}`}>₹{val}</div>
            </div>
          ))}
          <div className="flex justify-between">
            <div className="text-xs text-slate-600">Variance %</div>
            <div className={`text-sm font-semibold ${vp >= 0 ? "text-green-700" : "text-red-700"}`}>{vp >= 0 ? "+" : ""}{formatPercentage(vp)}%</div>
          </div>
        </div>
      </div>
    )
  }

  const monthlyChartData = useMemo(() => {
    return MONTH_ORDER.map((monthName, idx) => {
      const monthNum = String(idx + 1).padStart(2, "0")
      const md = filteredData.filter(d => d.month === monthNum && (yearFilter === "all" || d.year === yearFilter))
      const planned = md.reduce((s, d) => s + (d.plannedSalesAmount || 0), 0)
      const actual = md.reduce((s, d) => s + (d.actualSalesAmount || 0), 0)
      const unverified = md.reduce((s, d) => s + (d.unverifiedSalesAmount || 0), 0)
      const cancelled = md.reduce((s, d) => s + (d.cancelledSalesAmount || 0), 0)
      const variance = actual - planned
      return {
        month: monthName.substring(0, 3).charAt(0).toUpperCase() + monthName.substring(1, 3).toLowerCase(),
        planned, actual, unverified, cancelled, variance,
        variancePercent: Number((planned !== 0 ? (variance / planned) * 100 : 0).toFixed(1)),
      }
    }).filter(d => d.planned > 0 || d.actual > 0)
  }, [filteredData, yearFilter])

  const selectedMonthKPIs = useMemo(() => {
    const activeMonthNum = monthFilter !== "all" ? monthNameToNum(monthFilter) : "all"
    const cd = filteredData.filter(d => (activeMonthNum === "all" || d.month === activeMonthNum) && (yearFilter === "all" || d.year === yearFilter))
    const planned = cd.reduce((s, d) => s + (d.plannedSalesAmount || 0), 0)
    const actual = cd.reduce((s, d) => s + (d.actualSalesAmount || 0), 0)
    const unverified = cd.reduce((s, d) => s + (d.unverifiedSalesAmount || 0), 0)
    const cancelled = cd.reduce((s, d) => s + (d.cancelledSalesAmount || 0), 0)
    const variance = actual - planned
    return { plannedSales: planned, actualSales: actual, unverifiedSales: unverified, cancelledSales: cancelled, variance, variancePercent: planned !== 0 ? (variance / planned) * 100 : 0 }
  }, [filteredData, monthFilter, yearFilter])

  const quarterlyMetrics = useMemo(() => {
    const qs = { Q1: ["JANUARY", "FEBRUARY", "MARCH"], Q2: ["APRIL", "MAY", "JUNE"], Q3: ["JULY", "AUGUST", "SEPTEMBER"], Q4: ["OCTOBER", "NOVEMBER", "DECEMBER"] }
    return Object.entries(qs).map(([quarter, months]) => {
      const monthNums = months.map(monthNameToNum)
      const qd = filteredData.filter(d => monthNums.includes(d.month) && (yearFilter === "all" || d.year === yearFilter))
      const planned = qd.reduce((s, d) => s + (d.plannedSalesAmount || 0), 0)
      const actual = qd.reduce((s, d) => s + (d.actualSalesAmount || 0), 0)
      const variance = actual - planned
      return { quarter, planned, actual, variance, variancePercent: Number((planned !== 0 ? (variance / planned) * 100 : 0).toFixed(1)), achieved: actual >= planned }
    }).filter(q => q.planned > 0 || q.actual > 0)
  }, [filteredData, yearFilter])

  const cumulativeSalesData = useMemo(() => {
    let cp = 0, ca = 0, cu = 0, cc = 0
    return monthlyChartData.map(m => {
      cp += m.planned; ca += m.actual; cu += m.unverified || 0; cc += m.cancelled || 0
      return { month: m.month, planned: m.planned, actual: m.actual, unverified: m.unverified || 0, cancelled: m.cancelled || 0, cumulativePlanned: cp, cumulativeActual: ca, cumulativeUnverified: cu, cumulativeCancelled: cc, cumulativeVariance: ca - cp }
    })
  }, [monthlyChartData])

  /* ─── date-grouped data (for collapsible table, same as call report) ─────── */
  const filteredDateGroups = useMemo(() => {
    // Group filteredData by date key (dd-mm-yyyy)
    const map = new Map<string, typeof filteredData>()
    filteredData.forEach(row => {
      const existing = map.get(row.date) ?? []
      existing.push(row)
      map.set(row.date, existing)
    })
    // Sort dates chronologically: yyyy-mm-dd
    const sortedDates = Array.from(map.keys()).sort((a, b) => {
      const [dd1, mm1, yy1] = a.split("-")
      const [dd2, mm2, yy2] = b.split("-")
      return `${yy1}-${mm1}-${dd1}`.localeCompare(`${yy2}-${mm2}-${dd2}`)
    })
    return sortedDates.map(date => {
      const rows = map.get(date)!
      const planned = rows.reduce((s, r) => s + (r.plannedSalesAmount || 0), 0)
      const actual = rows.reduce((s, r) => s + (r.actualSalesAmount || 0), 0)
      const unverified = rows.reduce((s, r) => s + (r.unverifiedSalesAmount || 0), 0)
      const cancelled = rows.reduce((s, r) => s + (r.cancelledSalesAmount || 0), 0)
      const collection = rows.reduce((s, r) => s + (r.collectionAmount || 0), 0)
      const variance = actual - planned
      // displayDate: "03 Jan 2026"
      const [dd, mm, yyyy] = date.split("-")
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const displayDate = `${dd} ${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`
      return { date, displayDate, rows, totalPlanned: planned, totalActual: actual, totalUnverified: unverified, totalCancelled: cancelled, totalCollection: collection, totalVariance: variance }
    })
  }, [filteredData])

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [goToPage, setGoToPage] = useState("")

  const totalDatePages = Math.ceil(filteredDateGroups.length / itemsPerPage)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [dateFilter, monthFilter, yearFilter, employeeFilter, companyFilter])

  const paginatedDateGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredDateGroups.slice(start, start + itemsPerPage)
  }, [filteredDateGroups, currentPage, itemsPerPage])

  const dateGrandTotal = useMemo(() => {
    const allRows = filteredDateGroups.flatMap(g => g.rows)
    const planned = allRows.reduce((s, r) => s + (r.plannedSalesAmount || 0), 0)
    const actual = allRows.reduce((s, r) => s + (r.actualSalesAmount || 0), 0)
    const unverified = allRows.reduce((s, r) => s + (r.unverifiedSalesAmount || 0), 0)
    const cancelled = allRows.reduce((s, r) => s + (r.cancelledSalesAmount || 0), 0)
    const collection = allRows.reduce((s, r) => s + (r.collectionAmount || 0), 0)
    const variance = actual - planned
    return { planned, actual, unverified, cancelled, collection, variance, variancePercent: planned !== 0 ? (variance / planned) * 100 : 0 }
  }, [filteredDateGroups])

  // ── shared inline-style helper for Grand Total dark cells ──────────────────
  const GT_CELL = { backgroundColor: '#0f172a' } as React.CSSProperties
  const GT_STICKY_NAME = { ...GT_CELL, left: `${NAME_L}px`, boxShadow: SHADOW_R } as React.CSSProperties

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      {showLoader && <PageLoader />}

      <div className="relative z-10">
        <div className="w-full space-y-8">

          {/* ── HERO HEADER ────────────────────────────────────────────────── */}
          <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.08),transparent_40%)]" />
            <div className="relative px-6 py-8 md:px-8 md:py-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <Activity className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">Sales Performance Dashboard</h1>
                    <p className="text-sm md:text-base text-white/90">Real-time analytics and performance insights</p>
                  </div>
                </div>

                {/* Last Updated card — full width pill on mobile, compact box on desktop */}
                <div className="flex md:inline-flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-5 py-3 shadow-lg w-full md:w-auto">
                  <div className="text-center">
                    <p className="text-xs text-white/80 font-semibold tracking-wide mb-1">Last Updated</p>
                    {lastUpdated ? (
                      <p className="text-sm font-bold text-white leading-snug">
                        {lastUpdated.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                      </p>
                    ) : (
                      <p className="text-sm text-white/60 italic">Loading…</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ── FILTERS ────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Filters & Search</h3>
                  <p className="text-xs text-slate-500">Narrow down results quickly</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const now = new Date()
                  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
                  setSearchQuery("")
                  setDateFilter("all"); setCustomFromDate(""); setCustomToDate("")
                  setMonthFilter(months[now.getMonth()]); setYearFilter(now.getFullYear().toString())
                  setFilterMode("monthYear")
                  setEmployeeFilter("all"); setCompanyFilter("all"); setSortBy("rank"); setSortOrder("asc"); setView("table"); setCurrentPage(1)
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 shadow-sm hover:bg-slate-100 hover:border-slate-400 active:scale-[0.98] transition-all duration-200"
              >
                Clear Filters
              </button>
            </div>

            <div className="px-4 sm:px-5 py-5">
              <form onSubmit={e => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">

                {/* Search */}
                <div className="order-2 sm:order-none">
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Search</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="Employee or company" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-11 sm:h-10 w-full rounded-md border-gray-300" />
                  </div>
                </div>

                {/* Date Range — greyed when month/year active */}
                <div className="order-3 sm:order-none">
                  <label className={`text-xs mb-1 block uppercase font-semibold tracking-wide ${filterMode === "monthYear" ? "text-slate-300" : "text-slate-500"}`}>Date Range</label>
                  <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                    <SelectTrigger className={`h-11 sm:h-10 w-full rounded-md border-gray-300 transition-opacity ${filterMode === "monthYear" ? "opacity-40" : ""}`}>
                      <SelectValue placeholder="All Dates" />
                    </SelectTrigger>
                    <SelectContent>
                      {[["all", "All Dates"], ["today", "Today"], ["this_week", "This Week"], ["this_month", "This Month"], ["this_quarter", "This Quarter"], ["this_year", "This Year"], ["last_month", "Last Month"], ["last_quarter", "Last Quarter"], ["last_year", "Last Year"], ["custom", "Custom Range"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month — greyed when date range active */}
                <div className="order-4 sm:order-none">
                  <label className={`text-xs mb-1 block uppercase font-semibold tracking-wide ${filterMode === "dateRange" ? "text-slate-300" : "text-slate-500"}`}>Month</label>
                  <Select value={monthFilter} onValueChange={handleMonthFilterChange}>
                    <SelectTrigger className={`h-11 sm:h-10 w-full rounded-md border-gray-300 transition-opacity ${filterMode === "dateRange" ? "opacity-40" : ""}`}>
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTH_ORDER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year — greyed when date range active */}
                <div className="order-5 sm:order-none">
                  <label className={`text-xs mb-1 block uppercase font-semibold tracking-wide ${filterMode === "dateRange" ? "text-slate-300" : "text-slate-500"}`}>Year</label>
                  <Select value={yearFilter} onValueChange={handleYearFilterChange}>
                    <SelectTrigger className={`h-11 sm:h-10 w-full rounded-md border-gray-300 transition-opacity ${filterMode === "dateRange" ? "opacity-40" : ""}`}>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Employee */}
                <div className="order-6 sm:order-none">
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Employee</label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All employees" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {staticEmployees.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company — mobile: pill buttons | desktop: dropdown */}
                <div className="order-1 sm:order-none">
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Company</label>

                  {/* Mobile grouped buttons (hidden on sm and above) */}
                  <div className="flex sm:hidden w-full rounded-lg overflow-hidden border border-slate-300">
                    {[
                      { value: "all", label: "ALL" },
                      { value: "KTAHV", label: "KTAHV" },
                      { value: "KAPPL", label: "KAPPL" },
                      { value: "VILLARAAG", label: "VILLA RAAG" },
                    ].map(({ value, label }, idx, arr) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setCompanyFilter(value); setCurrentPage(1) }}
                        className={`flex-1 py-2.5 text-xs font-bold transition-all duration-200 active:scale-95 ${idx !== arr.length - 1 ? "border-r border-slate-300" : ""
                          } ${companyFilter === value
                            ? "bg-teal-600 text-white"
                            : "bg-white text-teal-700 hover:bg-teal-50"
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Desktop/Laptop dropdown (hidden on mobile) */}
                  <div className="hidden sm:block">
                    <Select value={companyFilter} onValueChange={(val) => { setCompanyFilter(val); setCurrentPage(1) }}>
                      <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All companies" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ALL</SelectItem>
                        <SelectItem value="KTAHV">KTAHV</SelectItem>
                        <SelectItem value="KAPPL">KAPPL</SelectItem>
                        <SelectItem value="VILLARAAG">VILLA RAAG</SelectItem>
                        {availableCompanies.filter(c => !["KTAHV", "KAPPL", "VILLARAAG"].includes(c)).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </form>

              {/* Custom date range pickers */}
              {filterMode === "dateRange" && dateFilter === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-1 border-t border-slate-200">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Start Date</label>
                    <Input type="date" value={customFromDate} onChange={e => setCustomFromDate(e.target.value)} className="h-11 w-full rounded-md border-gray-300" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">End Date</label>
                    <Input type="date" value={customToDate} onChange={e => setCustomToDate(e.target.value)} className="h-11 w-full rounded-md border-gray-300" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
          <div className="mt-8 hidden sm:block">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Key Performance Indicators</h3>
                    <p className="text-xs text-slate-500">Overview of sales metrics & performance</p>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-5 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3 md:gap-4">
                  <div className="relative min-h-[170px] rounded-2xl border border-blue-200 bg-gradient-to-br from-white via-blue-50 to-blue-100/70 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Planned Sales</p><p className="text-xs font-medium text-slate-600 mt-1">Target Value</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-200/70 shrink-0 ml-2"><Target className="h-5 w-5 text-blue-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-slate-900 leading-tight break-all">₹{formatCurrency(grandTotal.plannedSalesAmount)}</p>
                    </div>
                  </div>
                  <div className="relative min-h-[170px] rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/70 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Actual Sales</p><p className="text-xs font-medium text-slate-600 mt-1">Achieved Value</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-200/70 shrink-0 ml-2"><DollarSign className="h-5 w-5 text-emerald-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-slate-900 leading-tight break-all">₹{formatCurrency(grandTotal.actualSalesAmount)}</p>
                    </div>
                  </div>
                  <div className={`relative min-h-[170px] rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 ${grandTotal.varianceAmount >= 0 ? "border-green-200 bg-gradient-to-br from-white via-green-50 to-green-100/70" : "border-red-200 bg-gradient-to-br from-white via-red-50 to-red-100/70"}`}>
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className={`text-sm font-semibold uppercase tracking-wide ${grandTotal.varianceAmount >= 0 ? "text-green-800" : "text-red-800"}`}>Variance Amount</p><p className="text-xs font-medium text-slate-600 mt-1">Gap Analysis</p></div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ml-2 ${grandTotal.varianceAmount >= 0 ? "bg-green-200/70" : "bg-red-200/70"}`}><Activity className={`h-5 w-5 ${grandTotal.varianceAmount >= 0 ? "text-green-700" : "text-red-700"}`} /></div>
                      </div>
                      <p className={`text-[15px] xl:text-[17px] font-extrabold leading-tight break-all ${grandTotal.varianceAmount >= 0 ? "text-green-700" : "text-red-700"}`}>₹{formatCurrency(grandTotal.varianceAmount)}</p>
                    </div>
                  </div>
                  <div className={`relative min-h-[170px] rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 ${grandTotal.variancePercent >= 0 ? "border-green-200 bg-gradient-to-br from-white via-green-50 to-green-100/70" : "border-red-200 bg-gradient-to-br from-white via-red-50 to-red-100/70"}`}>
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className={`text-sm font-semibold uppercase tracking-wide ${grandTotal.variancePercent >= 0 ? "text-green-800" : "text-red-800"}`}>Variance %</p><p className="text-xs font-medium text-slate-600 mt-1">Efficiency Rate</p></div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ml-2 ${grandTotal.variancePercent >= 0 ? "bg-green-200/70" : "bg-red-200/70"}`}><Award className={`h-5 w-5 ${grandTotal.variancePercent >= 0 ? "text-green-700" : "text-red-700"}`} /></div>
                      </div>
                      <p className={`text-[15px] xl:text-[17px] font-extrabold leading-tight break-all ${grandTotal.variancePercent >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPercentage(grandTotal.variancePercent)}%</p>
                    </div>
                  </div>
                  <div className="relative min-h-[170px] rounded-2xl border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-violet-100/70 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-violet-800">Collection</p><p className="text-xs font-medium text-slate-600 mt-1">Collected Amount</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-200/70 shrink-0 ml-2"><TrendingUp className="h-5 w-5 text-violet-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-violet-700 leading-tight break-all">₹{formatCurrency(grandTotal.collectionAmount)}</p>
                    </div>
                  </div>
                  <div className="group relative min-h-[170px] rounded-2xl border border-amber-200 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/40 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Unverified Sales</p><p className="text-xs font-medium text-slate-500 mt-1">Pending Verification</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 transition-all duration-300 group-hover:bg-amber-50 shrink-0 ml-2"><AlertCircle className="h-5 w-5 text-amber-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-amber-700 leading-tight break-all">₹{formatCurrency(grandTotal.unverifiedSalesAmount)}</p>
                    </div>
                  </div>
                  <div className="relative min-h-[170px] rounded-2xl border border-red-200 bg-gradient-to-br from-white via-red-50 to-red-100/70 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-red-800">Cancelled Sales</p><p className="text-xs font-medium text-slate-600 mt-1">Lost Revenue</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-200/70 shrink-0 ml-2"><XCircle className="h-5 w-5 text-red-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-red-700 leading-tight break-all">₹{formatCurrency(grandTotal.cancelledSalesAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>{/* end w-full space-y-8 */}

        {/* ── MAIN TABLE CARD ────────────────────────────────────────────── */}
        <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden bg-white mt-8">
          <div ref={resultsRef} className="w-full -mt-2 sm:-mt-3 px-4 sm:px-6 py-2.5 bg-[#f5f9ff] border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Sales Performance Analytics</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">{filteredDateGroups.length} Dates · {filteredData.length} Records</span>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                <button onClick={() => setView("table")} aria-pressed={view === "table"} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border transition-all duration-200 ${view === "table" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50"}`}>
                  <TableIcon className="h-4 w-4" />Table View
                </button>
                <button onClick={() => setView("graph")} aria-pressed={view === "graph"} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border transition-all duration-200 ${view === "graph" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50"}`}>
                  <BarChart3 className="h-4 w-4" />Graph View
                </button>
                {/* <button
                  onClick={handleExcelDownload}
                  title="Download Excel"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 transition-all duration-200"
                >
                  <Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={handleTablePrint}
                  title="Print Table"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 transition-all duration-200"
                >
                  <Printer className="h-4 w-4" /><span className="hidden sm:inline">Print</span>
                </button> */}
              </div>
            </div>
          </div>

          <CardContent className="p-0">
            {view === "table" ? (
              <div className="space-y-0 p-0">

                {/* ── COLLAPSIBLE DATE-GROUPED TABLE ───────────────────────── */}
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <AlertCircle className="h-12 w-12 text-red-300 mb-4" />
                    <p className="text-base font-semibold text-slate-700 mb-1">Unable to load sales report data</p>
                    <p className="text-sm text-slate-500 max-w-md">{error}</p>
                    <Button onClick={refetch} className="mt-5">
                      Retry
                    </Button>
                  </div>
                ) : filteredDateGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-base font-semibold text-slate-600 mb-1">No data found</p>
                    <p className="text-sm text-slate-400">Try adjusting your filters</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: "touch" }}>
                      <table className="border-collapse" style={{ minWidth: "1100px", width: "100%", tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: "220px" }} /> {/* Date / Employee */}
                          <col style={{ width: "100px" }} /> {/* Company */}
                          <col style={{ width: "115px" }} /> {/* Planned Sales */}
                          <col style={{ width: "115px" }} /> {/* Actual Sales */}
                          <col style={{ width: "105px" }} /> {/* Variance Amt */}
                          <col style={{ width: "75px" }} />  {/* Variance % */}
                          <col style={{ width: "115px" }} /> {/* Collection Amt */}
                          <col style={{ width: "115px" }} /> {/* Unverified Amt */}
                          <col style={{ width: "115px" }} /> {/* Cancelled Amt */}
                        </colgroup>

                        {/* ── THEAD ─────────────────────────────────────────── */}
                        <thead>
                          <tr style={{ background: "linear-gradient(to right, #1e293b, #334155, #1e293b)" }}>
                            <th style={{ backgroundColor: "#1e293b", position: "sticky", left: 0, zIndex: 3, boxShadow: "4px 0 8px -2px rgba(0,0,0,0.4)" }}
                              className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-slate-600 min-w-[220px]">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                Date / Employee
                              </span>
                            </th>
                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-300 border-r border-slate-600">Company</th>
                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-blue-300 border-r border-slate-600">Planned Sales</th>
                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-green-300 border-r border-slate-600">Actual Sales</th>
                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white border-r border-slate-600">Variance Amt</th>
                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white border-r border-slate-600">Variance%</th>
                            <th style={{ backgroundColor: "#4c1d95" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-violet-200 border-r border-violet-700">Collection Amt</th>
                            <th style={{ backgroundColor: "#78350f" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-amber-200 border-r border-amber-700">Unverified Amt</th>
                            <th style={{ backgroundColor: "#7f1d1d" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-red-200">Cancelled Amt</th>
                          </tr>
                        </thead>

                        {/* ── TBODY — one tbody per date group ──────────────── */}
                        {paginatedDateGroups.map((group) => {
                          const isExpanded = expandedDates.has(group.date)
                          const varPct = group.totalPlanned !== 0
                            ? (group.totalVariance / group.totalPlanned) * 100 : 0
                          const dateRowBg = "#f1f5f9"
                          const dateRowHover = "#cbd5e1"

                          return (
                            <tbody key={group.date}>
                              {/* ── Date summary row ───────────────────────── */}
                              <tr
                                className="cursor-pointer border-b-2 border-slate-300 transition-colors"
                                style={{ backgroundColor: dateRowBg }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowHover}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowBg}
                                onClick={() => toggleDate(group.date)}
                              >
                                {/* Sticky date cell */}
                                <td
                                  style={{ backgroundColor: dateRowBg, position: "sticky", left: 0, zIndex: 2, boxShadow: "4px 0 8px -2px rgba(0,0,0,0.08), 2px 0 0 0 #e2e8f0", transition: "background-color 150ms" }}
                                  className="px-4 py-3 border-r border-slate-300"
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowHover}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowBg}
                                >
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-all duration-200 ${isExpanded ? "bg-blue-600 text-white shadow-sm" : "bg-slate-300 text-slate-600"}`}>
                                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      </div>
                                      <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                      <span className="font-bold text-slate-900 text-xs tabular-nums">{group.displayDate}</span>
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-200 text-slate-600 border-slate-300 font-medium shrink-0">{group.rows.length}</Badge>
                                    </div>
                                    {/* Per-date download + print */}
                                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                      <button
                                        title={`Download ${group.displayDate}`}
                                        onClick={async () => {
                                          const ExcelJS = (await import("exceljs")).default
                                          const { saveAs } = await import("file-saver")
                                          const wb = new ExcelJS.Workbook()
                                          wb.creator = "Kairali CRM"; wb.created = new Date()
                                          const ws = wb.addWorksheet(group.displayDate)
                                          const COL_COUNT = 10
                                          ws.mergeCells(1, 1, 1, COL_COUNT)
                                          const titleCell = ws.getCell("A1")
                                          titleCell.value = "📊  Sales Performance Report"
                                          titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" }, name: "Arial" }
                                          titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
                                          titleCell.alignment = { vertical: "middle", horizontal: "center" }
                                          ws.getRow(1).height = 28
                                          ws.mergeCells(2, 1, 2, COL_COUNT)
                                          const infoCell = ws.getCell("A2")
                                          infoCell.value = `Date: ${group.displayDate}  |  Company: ${companyFilter === "all" ? "All Companies" : companyFilter}  |  Employees: ${group.rows.length}  |  Generated: ${new Date().toLocaleString("en-IN")}`
                                          infoCell.font = { size: 10, color: { argb: "FFE2E8F0" }, name: "Arial" }
                                          infoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
                                          infoCell.alignment = { vertical: "middle", horizontal: "center" }
                                          ws.getRow(2).height = 20
                                          ws.getRow(3).height = 6
                                          ws.columns = [
                                            { key: "emp", width: 26 }, { key: "co", width: 12 },
                                            { key: "pl", width: 14 }, { key: "ac", width: 14 },
                                            { key: "uv", width: 14 }, { key: "ca", width: 14 },
                                            { key: "col", width: 14 }, { key: "va", width: 14 },
                                            { key: "vp", width: 10 },
                                          ]
                                          const headerLabels = ["Employee", "Company", "Planned", "Actual", "Unverified", "Cancelled", "Collection", "Variance", "Var%"]
                                          const hRow = ws.getRow(4); hRow.height = 22
                                          const thin = { style: "thin" as const, color: { argb: "FFE2E8F0" } }
                                          const borders = { top: thin, left: thin, bottom: thin, right: thin }
                                          headerLabels.forEach((lbl, i) => {
                                            const cell = hRow.getCell(i + 1)
                                            cell.value = lbl
                                            cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" }, name: "Arial" }
                                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
                                            cell.alignment = { vertical: "middle", horizontal: i < 2 ? "left" : "center" }
                                            cell.border = borders
                                          })
                                          const greenFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }
                                          const redFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }
                                          group.rows.forEach((row, i) => {
                                            const vp = row.plannedSalesAmount !== 0 ? (row.varianceAmount / row.plannedSalesAmount) * 100 : 0
                                            const r = ws.getRow(5 + i); r.height = 18
                                            const altFill: any = i % 2 === 1 ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } } : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
                                            const vals = [row.empName, row.company, row.plannedSalesAmount, row.actualSalesAmount, row.unverifiedSalesAmount, row.cancelledSalesAmount, row.collectionAmount, row.varianceAmount, Number(vp.toFixed(1))]
                                            vals.forEach((val, ci) => {
                                              const cell = r.getCell(ci + 1)
                                              cell.value = val
                                              cell.font = { size: 10, name: "Arial" }
                                              cell.border = borders
                                              cell.alignment = { vertical: "middle", horizontal: ci < 2 ? "left" : "center" }
                                              if (ci === 8) { cell.font = { size: 10, name: "Arial", bold: true, color: { argb: Number(val) >= 0 ? "FF166534" : "FF991B1B" } }; cell.fill = Number(val) >= 0 ? greenFill : redFill; cell.numFmt = '0.00"%"' }
                                              else if (ci === 7) { cell.font = { size: 10, name: "Arial", bold: true, color: { argb: Number(val) >= 0 ? "FF166534" : "FF991B1B" } }; cell.fill = Number(val) >= 0 ? greenFill : redFill; cell.numFmt = '₹#,##0' }
                                              else if (ci >= 2) { cell.numFmt = '₹#,##0'; cell.fill = altFill }
                                              else { cell.fill = altFill }
                                            })
                                          })
                                          const buf = await wb.xlsx.writeBuffer()
                                          saveAs(new Blob([buf], { type: "application/octet-stream" }), `Sales_${group.date}.xlsx`)
                                        }}
                                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all"
                                      ><Download className="h-3 w-3" /></button>
                                      <button
                                        title={`Print ${group.displayDate}`}
                                        onClick={() => {
                                          const rows = group.rows.map(row => {
                                            const vp = row.plannedSalesAmount !== 0 ? (row.varianceAmount / row.plannedSalesAmount * 100).toFixed(1) : "0.0"
                                            return `<tr><td>${row.empName}</td><td>${row.company}</td><td>₹${Math.round(row.plannedSalesAmount).toLocaleString("en-IN")}</td><td>₹${Math.round(row.actualSalesAmount).toLocaleString("en-IN")}</td><td>₹${Math.round(row.unverifiedSalesAmount).toLocaleString("en-IN")}</td><td>₹${Math.round(row.cancelledSalesAmount).toLocaleString("en-IN")}</td><td>₹${Math.round(row.collectionAmount).toLocaleString("en-IN")}</td><td style="color:${row.varianceAmount >= 0 ? "#166534" : "#991b1b"}">₹${Math.round(row.varianceAmount).toLocaleString("en-IN")}</td><td style="color:${Number(vp) >= 0 ? "#166534" : "#991b1b"}">${vp}%</td></tr>`
                                          }).join("")
                                          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Sales – ${group.displayDate}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:16px}.title{font-size:16px;font-weight:bold;margin-bottom:4px}.date{font-size:12px;color:#475569;margin-bottom:12px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:white;padding:6px 8px;text-align:left;font-size:10px}td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10px}tr:nth-child(even) td{background:#f8fafc}@page{margin:10mm;size:A4 landscape}</style></head><body><div class="title">Sales Report — ${group.displayDate}</div><div class="date">Company: ${companyFilter === "all" ? "All" : companyFilter} · ${group.rows.length} employees</div><table><thead><tr><th>Employee</th><th>Company</th><th>Planned</th><th>Actual</th><th>Unverified</th><th>Cancelled</th><th>Collection</th><th>Variance</th><th>Var%</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
                                          const win = window.open("", "_blank", "width=1100,height=700")
                                          if (!win) return
                                          win.document.write(html); win.document.close(); win.focus(); win.print(); win.close()
                                        }}
                                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all"
                                      ><Printer className="h-3 w-3" /></button>
                                    </div>
                                  </div>
                                </td>
                                {/* Company col — blank on date row */}
                                <td className="text-center px-3 py-3 text-xs text-slate-400">—</td>
                                {/* Date totals — new order: Planned, Actual, Variance, Var%, Collection, Unverified, Cancelled */}
                                <td className="text-center px-3 py-3 font-bold text-xs text-blue-700 bg-blue-50/60">₹{formatCurrency(group.totalPlanned)}</td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-green-700 bg-green-50/60">₹{formatCurrency(group.totalActual)}</td>
                                <td className={`text-center px-3 py-3 font-bold text-xs ${group.totalVariance >= 0 ? "text-green-700 bg-green-50/40" : "text-red-700 bg-red-50/40"}`}>₹{formatCurrency(group.totalVariance)}</td>
                                <td className="text-center px-3 py-3">
                                  <Badge variant="outline" className={`font-bold px-1.5 py-0 text-xs ${varPct >= 0 ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}`}>
                                    {varPct >= 0 ? "+" : ""}{varPct.toFixed(1)}%
                                  </Badge>
                                </td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-violet-700 bg-violet-50/60">₹{formatCurrency(group.totalCollection)}</td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-amber-700 bg-amber-50/60">₹{formatCurrency(group.totalUnverified)}</td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-red-700 bg-red-50/60">₹{formatCurrency(group.totalCancelled)}</td>
                              </tr>

                              {/* ── Expanded employee rows ──────────────────── */}
                              {isExpanded && group.rows.map((row, ri) => {
                                const evenRow = ri % 2 === 0
                                const rowBg = evenRow ? "#ffffff" : "#f8fafc"
                                const empVarPct = row.plannedSalesAmount !== 0
                                  ? (row.varianceAmount / row.plannedSalesAmount) * 100 : 0

                                return (
                                  <tr
                                    key={`${group.date}-${row.empName}-${ri}`}
                                    className="border-b border-slate-100 transition-colors"
                                    style={{ backgroundColor: rowBg }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#e2e8f0"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = rowBg}
                                  >
                                    {/* Employee — sticky */}
                                    <td
                                      style={{ backgroundColor: rowBg, position: "sticky", left: 0, zIndex: 2, boxShadow: "4px 0 8px -2px rgba(0,0,0,0.06), 2px 0 0 0 #f1f5f9", transition: "background-color 150ms" }}
                                      className="px-4 py-2.5 border-r border-slate-100"
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#e2e8f0"}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = rowBg}
                                    >
                                      <div className="flex items-center gap-2 pl-8">
                                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0 border border-slate-200">{ri + 1}</span>
                                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]" title={row.empName}>{row.empName}</span>
                                      </div>
                                    </td>

                                    {/* Company */}
                                    <td className="text-center px-3 py-2.5">
                                      <Badge variant="outline" className={`font-bold px-1 py-0 text-xs ${row.company === "KTAHV" ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300" : row.company === "KAPPL" ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300" : "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300"}`}>
                                        {row.company}
                                      </Badge>
                                    </td>

                                    {/* Planned */}
                                    <td className="text-center px-3 py-2.5 text-xs font-bold text-blue-700">₹{formatCurrency(row.plannedSalesAmount)}</td>

                                    {/* Actual — clickable */}
                                    <td className="text-center px-3 py-2.5 text-xs font-bold text-green-700">
                                      {Number(row.actualSalesAmount) > 0 ? (
                                        <span className="relative group/tip">
                                          <a href={`https://script.google.com/macros/s/AKfycbxGKmbfFeyKqfxF1JQucV8EC1JkPmwkIYW0b0I_n1bI_mwHmZiJOOlBdjKGm4hKuiKWrQ/exec?company=${encodeURIComponent(row.company)}&employee=${encodeURIComponent(normalizeEmployeeForApi(row.empName))}&date=${encodeURIComponent(row.date)}&day=${encodeURIComponent(row.day)}&month=${encodeURIComponent(monthNumToName(row.month))}&year=${encodeURIComponent(row.year)}`}
                                            target="_blank" rel="noopener noreferrer" className="text-green-700 underline font-bold hover:text-green-900 transition-colors">
                                            ₹{formatCurrency(row.actualSalesAmount)}
                                          </a>
                                          <span className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover/tip:block bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">Click for detailed sales report</span>
                                        </span>
                                      ) : <span className="text-green-700 font-medium">₹0</span>}
                                    </td>

                                    {/* Variance */}
                                    <td className={`text-center px-3 py-2.5 text-xs font-bold ${row.varianceAmount >= 0 ? "text-green-700" : "text-red-700"}`}>
                                      ₹{formatCurrency(row.varianceAmount)}
                                    </td>

                                    {/* Variance % */}
                                    <td className="text-center px-3 py-2.5">
                                      <Badge variant="outline" className={`font-bold px-1 py-0 text-xs ${empVarPct >= 0 ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300" : "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300"}`}>
                                        {empVarPct >= 0 ? "+" : ""}{empVarPct.toFixed(1)}%
                                      </Badge>
                                    </td>

                                    {/* Collection — clickable */}
                                    <td className="text-center px-3 py-2.5 text-xs font-semibold text-violet-700">
                                      {Number(row.collectionAmount) > 0 ? (
                                        <span className="relative group/tip">
                                          <a href={`https://script.google.com/macros/s/AKfycbwMMPtbBYO3ndUSfiLkWnokeBxIzUbKvyJfeYmfRMayhP1akOOxMbnhkPyKE-Vl0-dG/exec?date=${encodeURIComponent(row.date)}&month=${encodeURIComponent(row.month)}&year=${encodeURIComponent(row.year)}&employee=${encodeURIComponent(normalizeEmployeeForApi(row.empName))}&company=${encodeURIComponent(row.company)}`}
                                            target="_blank" rel="noopener noreferrer" className="text-violet-700 underline font-bold hover:text-violet-900 transition-colors">
                                            ₹{formatCurrency(row.collectionAmount)}
                                          </a>
                                          <span className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover/tip:block bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">Click for collection report</span>
                                        </span>
                                      ) : <span className="text-violet-700 font-medium">₹0</span>}
                                    </td>

                                    {/* Unverified — clickable */}
                                    <td className="text-center px-3 py-2.5 text-xs font-semibold text-amber-700">
                                      {Number(row.unverifiedSalesAmount) > 0 ? (
                                        <span className="relative group/tip">
                                          <a href={`https://script.google.com/macros/s/AKfycbyqoDenAH1VkFsDpMM9m9tl338QtOdFzaWJkuD3mDyvpdWpFpd2K76RSdDB8eEfi1fO/exec?company=${encodeURIComponent(row.company)}&employee=${encodeURIComponent(normalizeEmployeeForApi(row.empName))}&date=${encodeURIComponent(row.date)}&day=${encodeURIComponent(row.day)}&month=${encodeURIComponent(monthNumToName(row.month))}&year=${encodeURIComponent(row.year)}&type=unverified`}
                                            target="_blank" rel="noopener noreferrer" className="text-amber-700 underline font-bold hover:text-amber-900 transition-colors">
                                            ₹{formatCurrency(row.unverifiedSalesAmount)}
                                          </a>
                                          <span className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover/tip:block bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">Click for unverified report</span>
                                        </span>
                                      ) : <span className="text-amber-700 font-medium">₹0</span>}
                                    </td>

                                    {/* Cancelled — clickable */}
                                    <td className="text-center px-3 py-2.5 text-xs font-semibold text-red-700">
                                      {Number(row.cancelledSalesAmount) > 0 ? (
                                        <span className="relative group/tip">
                                          <a href={`https://script.google.com/macros/s/AKfycbyqoDenAH1VkFsDpMM9m9tl338QtOdFzaWJkuD3mDyvpdWpFpd2K76RSdDB8eEfi1fO/exec?company=${encodeURIComponent(row.company)}&employee=${encodeURIComponent(normalizeEmployeeForApi(row.empName))}&date=${encodeURIComponent(row.date)}&day=${encodeURIComponent(row.day)}&month=${encodeURIComponent(monthNumToName(row.month))}&year=${encodeURIComponent(row.year)}&type=cancelled`}
                                            target="_blank" rel="noopener noreferrer" className="text-red-700 underline font-bold hover:text-red-900 transition-colors">
                                            ₹{formatCurrency(row.cancelledSalesAmount)}
                                          </a>
                                          <span className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover/tip:block bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">Click for cancelled report</span>
                                        </span>
                                      ) : <span className="text-red-700 font-medium">₹0</span>}
                                    </td>

                                  </tr>
                                )
                              })}
                            </tbody>
                          )
                        })}

                        {/* ── GRAND TOTAL ───────────────────────────────────── */}
                        {filteredDateGroups.length > 1 && (
                          <tfoot>
                            <tr style={{ borderTop: "4px solid #f59e0b" }}>
                              <td style={{ backgroundColor: "#0f172a", position: "sticky", left: 0, zIndex: 2, boxShadow: "4px 0 8px -2px rgba(0,0,0,0.5)" }}
                                className="font-extrabold text-xs text-white text-left px-4 py-4 border-r border-slate-700">GRAND TOTAL</td>
                              <td className="text-center px-3 py-4 border-r border-slate-700 text-slate-400" style={{ backgroundColor: "#0f172a" }}>—</td>
                              <td className="font-bold text-sm text-blue-400 text-center px-3 py-4 border-r border-slate-700" style={{ backgroundColor: "#0f172a" }}>₹{formatCurrency(dateGrandTotal.planned)}</td>
                              <td className="font-bold text-sm text-green-400 text-center px-3 py-4 border-r border-slate-700" style={{ backgroundColor: "#0f172a" }}>₹{formatCurrency(dateGrandTotal.actual)}</td>
                              <td className={`font-bold text-sm text-center px-3 py-4 border-r border-slate-700 ${dateGrandTotal.variance >= 0 ? "text-green-400" : "text-red-400"}`} style={{ backgroundColor: "#0f172a" }}>₹{formatCurrency(dateGrandTotal.variance)}</td>
                              <td className={`font-bold text-sm text-center px-3 py-4 border-r border-slate-700 ${dateGrandTotal.variancePercent >= 0 ? "text-green-400" : "text-red-400"}`} style={{ backgroundColor: "#0f172a" }}>{dateGrandTotal.variancePercent >= 0 ? "+" : ""}{dateGrandTotal.variancePercent.toFixed(1)}%</td>
                              <td className="font-bold text-sm text-violet-400 text-center px-3 py-4 border-r border-slate-700" style={{ backgroundColor: "#0f172a" }}>₹{formatCurrency(dateGrandTotal.collection)}</td>
                              <td className="font-bold text-sm text-amber-400 text-center px-3 py-4 border-r border-slate-700" style={{ backgroundColor: "#0f172a" }}>₹{formatCurrency(dateGrandTotal.unverified)}</td>
                              <td className="font-bold text-sm text-red-400 text-center px-3 py-4" style={{ backgroundColor: "#0f172a" }}>₹{formatCurrency(dateGrandTotal.cancelled)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* ── PAGINATION ──────────────────────────────────────────── */}
                    <div className="sticky bottom-0 z-20 sm:static border-t border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-600">
                          <span className="font-medium">Rows</span>
                          <select aria-label="Rows per page" value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                          </select>
                          <span className="text-xs text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredDateGroups.length)}–{Math.min(currentPage * itemsPerPage, filteredDateGroups.length)}</span> of <span className="font-semibold text-slate-700">{filteredDateGroups.length}</span> dates
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
                          <span>Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalDatePages}</span></span>
                          <div className="flex items-center gap-1">
                            <input aria-label="Go to page" type="number" min={1} max={totalDatePages} value={goToPage} onChange={e => setGoToPage(e.target.value)} placeholder="Go" className="w-16 h-9 rounded-md border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button onClick={() => { const p = Number(goToPage); if (p >= 1 && p <= totalDatePages) { setCurrentPage(p); setGoToPage("") } }} className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">Go</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-center sm:justify-end gap-2">
                          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">Previous</button>
                          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalDatePages))} disabled={currentPage === totalDatePages} className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">Next</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

            ) : (

              /* ── GRAPH VIEW ──────────────────────────────────────────────── */
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{monthFilter} {yearFilter}</h2>
                    <p className="text-sm text-slate-600 mt-1">Performance Overview & Metrics</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-4 md:gap-5">
                    {[
                      { icon: <Target className="w-6 h-6 text-blue-600" />, bg: "bg-blue-100", badge: "TARGET", badgeCls: "bg-blue-50 text-blue-700 border-blue-200", label: "Planned Sales", val: selectedMonthKPIs.plannedSales, color: "text-slate-900", note: "Monthly target benchmark", hoverBorder: "hover:border-blue-300" },
                      { icon: <DollarSign className="w-6 h-6 text-green-600" />, bg: "bg-green-100", badge: "ACHIEVED", badgeCls: "bg-green-50 text-green-700 border-green-200", label: "Actual Sales", val: selectedMonthKPIs.actualSales, color: "text-slate-900", note: null, hoverBorder: "hover:border-green-300" },
                      { icon: <AlertCircle className="w-6 h-6 text-yellow-600" />, bg: "bg-yellow-100", badge: "UNVERIFIED", badgeCls: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Unverified Sales", val: selectedMonthKPIs.unverifiedSales, color: "text-yellow-700", note: "Pending verification", hoverBorder: "hover:border-yellow-300" },
                      { icon: <XCircle className="w-6 h-6 text-red-600" />, bg: "bg-red-100", badge: "CANCELLED", badgeCls: "bg-red-50 text-red-700 border-red-200", label: "Cancelled Sales", val: selectedMonthKPIs.cancelledSales, color: "text-red-700", note: "Lost revenue", hoverBorder: "hover:border-red-300" },
                    ].map(c => (
                      <Card key={c.label} className={`border border-slate-200 ${c.hoverBorder} transition-colors`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 ${c.bg} rounded-lg`}>{c.icon}</div>
                            <Badge variant="outline" className={`${c.badgeCls} text-xs font-medium`}>{c.badge}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{c.label}</p>
                          <p className={`text-xl font-bold ${c.color} mb-2 break-all`}>₹{formatCurrency(c.val)}</p>
                          {c.note && <p className="text-xs text-slate-500">{c.note}</p>}
                        </CardContent>
                      </Card>
                    ))}
                    <Card className={`border border-slate-200 ${selectedMonthKPIs.variance >= 0 ? "hover:border-green-300" : "hover:border-red-300"} transition-colors`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-lg ${selectedMonthKPIs.variance >= 0 ? "bg-green-100" : "bg-red-100"}`}><Activity className={`w-6 h-6 ${selectedMonthKPIs.variance >= 0 ? "text-green-600" : "text-red-600"}`} /></div>
                          <Badge variant="outline" className={selectedMonthKPIs.variance >= 0 ? "bg-green-50 text-green-700 border-green-200 text-xs font-medium" : "bg-red-50 text-red-700 border-red-200 text-xs font-medium"}>{selectedMonthKPIs.variance >= 0 ? "SURPLUS" : "DEFICIT"}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Variance</p>
                        <p className={`text-xl font-bold mb-2 break-all ${selectedMonthKPIs.variance >= 0 ? "text-green-600" : "text-red-600"}`}>₹{formatCurrency(Math.abs(selectedMonthKPIs.variance))}</p>
                        <p className="text-xs text-slate-500"><span className={`font-semibold text-sm ${selectedMonthKPIs.variancePercent >= 0 ? "text-green-600" : "text-red-600"}`}>{selectedMonthKPIs.variancePercent >= 0 ? "+" : ""}{formatPercentage(selectedMonthKPIs.variancePercent)}%</span> from target</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-lg"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
                        <div><CardTitle className="text-base font-bold text-slate-800">Quarter Performance</CardTitle><p className="text-xs text-slate-500 mt-0.5">Q1 to Q4 breakdown</p></div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {quarterlyMetrics.length > 0 ? quarterlyMetrics.map(q => (
                          <div key={q.quarter} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${q.achieved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{q.quarter}</div>
                              <div><div className="text-sm font-semibold text-slate-800">₹{formatCurrency(q.actual)}</div><div className="text-xs text-slate-500">Target: ₹{formatCurrency(q.planned)}</div></div>
                            </div>
                            <div className={`text-sm font-bold ${q.variancePercent >= 0 ? "text-green-600" : "text-red-600"}`}>{q.variancePercent >= 0 ? "+" : ""}{q.variancePercent}%</div>
                          </div>
                        )) : <div className="text-center py-8 text-slate-500"><BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">No quarterly data available</p></div>}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-100 rounded-lg"><Award className="w-5 h-5 text-purple-600" /></div>
                        <div><CardTitle className="text-base font-bold text-slate-800">Performance Summary</CardTitle><p className="text-xs text-slate-500 mt-0.5">Cumulative totals</p></div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {cumulativeSalesData.length > 0 && (<>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><div className="text-xs text-slate-600 font-semibold mb-1">Cumulative Target</div><div className="text-xl font-black text-blue-700 break-all">₹{formatCurrency(cumulativeSalesData[cumulativeSalesData.length - 1].cumulativePlanned)}</div></div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200"><div className="text-xs text-slate-600 font-semibold mb-1">Cumulative Actual</div><div className="text-xl font-black text-green-700 break-all">₹{formatCurrency(cumulativeSalesData[cumulativeSalesData.length - 1].cumulativeActual)}</div></div>
                        </>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div className="p-2.5 bg-purple-100 rounded-lg"><Activity className="w-5 h-5 text-purple-600" /></div>
                    <div><h3 className="text-lg font-semibold text-slate-800">Cumulative Sales Tracking</h3><p className="text-xs text-slate-500 mt-0.5">Year-to-date for {yearFilter}</p></div>
                  </div>
                  {cumulativeSalesData.length > 0 ? (
                    <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200">
                      <div className="overflow-x-auto -mx-4 px-4"><div className="min-w-[600px]">
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={cumulativeSalesData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                            <defs>
                              <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} /></linearGradient>
                              <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} /></linearGradient>
                              <linearGradient id="cuGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.3} /><stop offset="95%" stopColor="#eab308" stopOpacity={0.05} /></linearGradient>
                              <linearGradient id="ccGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" />
                            <YAxis tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" width={85} />
                            <Tooltip content={({ active, payload, label }) => {
                              if (!active || !payload) return null
                              return <div className="bg-white p-4 rounded-lg border-2 border-slate-200 shadow-lg"><p className="font-bold text-slate-900 mb-2">{label}</p><div className="space-y-1 text-sm">{[["Cumulative Target", "text-blue-600", 0], ["Cumulative Actual", "text-green-600", 1], ["Cumulative Unverified", "text-yellow-600", 2], ["Cumulative Cancelled", "text-red-600", 3]].map(([lbl, cls, i]) => <div key={lbl} className="flex justify-between gap-6"><span className={`${cls} font-semibold`}>{lbl}:</span><span className="font-bold">₹{formatCurrency(payload[i as number]?.value || 0)}</span></div>)}</div></div>
                            }} />
                            <Area type="monotone" dataKey="cumulativePlanned" stroke="#3b82f6" strokeWidth={3} fill="url(#cpGrad)" name="Cumulative Target" />
                            <Area type="monotone" dataKey="cumulativeActual" stroke="#22c55e" strokeWidth={3} fill="url(#caGrad)" name="Cumulative Actual" />
                            <Area type="monotone" dataKey="cumulativeUnverified" stroke="#eab308" strokeWidth={2} fill="url(#cuGrad)" name="Cumulative Unverified" />
                            <Area type="monotone" dataKey="cumulativeCancelled" stroke="#ef4444" strokeWidth={2} fill="url(#ccGrad)" name="Cumulative Cancelled" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <Activity className="w-16 h-16 text-slate-300 mb-4" />
                      <p className="text-base font-semibold text-slate-600 mb-1">No Data Available</p>
                      <p className="text-sm text-slate-500">Select a year to view cumulative tracking</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div className="p-2.5 bg-slate-100 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
                    <div><h3 className="text-lg font-semibold text-slate-800">Year-to-Date Performance Trends</h3><p className="text-xs text-slate-500 mt-0.5">Monthly planned vs actual for {yearFilter}</p></div>
                  </div>
                  {monthlyChartData.length > 0 ? (
                    <div className="space-y-6">
                      <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200">
                        <div className="overflow-x-auto -mx-4 px-4"><div className="min-w-[600px]">
                          <ResponsiveContainer width="100%" height={monthlyChartData.length <= 3 ? 400 : monthlyChartData.length <= 6 ? 450 : 550}>
                            <BarChart data={monthlyChartData} margin={{ top: 40, right: 30, left: 20, bottom: 80 }}>
                              <defs>
                                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={1} /></linearGradient>
                                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} /><stop offset="100%" stopColor="#22c55e" stopOpacity={1} /></linearGradient>
                                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} /><stop offset="100%" stopColor="#eab308" stopOpacity={1} /></linearGradient>
                                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.9} /><stop offset="100%" stopColor="#ef4444" stopOpacity={1} /></linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="month" angle={monthlyChartData.length > 6 ? -45 : -35} textAnchor="end" height={90} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" interval={0} />
                              <YAxis tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" width={75} />
                              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Bar dataKey="planned" fill="url(#pg)" name="Planned Sales" radius={[6, 6, 0, 0]} maxBarSize={60} />
                              <Bar dataKey="actual" fill="url(#ag)" name="Actual Sales" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                <LabelList dataKey="variancePercent" position="top" formatter={(value: unknown) => { const variance = Number(value); return Number.isFinite(variance) && variance !== 0 ? `${variance > 0 ? "+" : ""}${variance.toFixed(1)}%` : "" }} style={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                              </Bar>
                              <Bar dataKey="unverified" fill="url(#ug)" name="Unverified Sales" radius={[6, 6, 0, 0]} maxBarSize={60} />
                              <Bar dataKey="cancelled" fill="url(#cg)" name="Cancelled Sales" radius={[6, 6, 0, 0]} maxBarSize={60} />
                              <Bar dataKey="variance" name="Variance" radius={[4, 4, 0, 0]} maxBarSize={35}>
                                {monthlyChartData.map((e, i) => <Cell key={`c-${i}`} fill={e.variance >= 0 ? "#22c55e" : "#ef4444"} opacity={0.75} />)}
                                <LabelList dataKey="variancePercent" position="top" formatter={(value: unknown) => { const variance = Number(value); return Number.isFinite(variance) ? `${variance > 0 ? "+" : ""}${variance.toFixed(1)}%` : "" }} style={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                          ["bg-blue-50 border-blue-100", "bg-blue-500", "Planned Sales", "Target benchmark"],
                          ["bg-green-50 border-green-100", "bg-green-500", "Actual Sales", "Achieved results"],
                          ["bg-yellow-50 border-yellow-100", "bg-yellow-500", "Unverified Sales", "Pending verification"],
                          ["bg-red-50 border-red-100", "bg-red-500", "Cancelled Sales", "Lost revenue"],
                        ].map(([wrap, dot, lbl, sub]) => (
                          <div key={lbl} className={`flex items-center gap-3 p-4 ${wrap} rounded-lg border`}>
                            <div className={`w-3 h-3 ${dot} rounded`} />
                            <div><p className="text-xs text-slate-600 font-medium">{lbl}</p><p className="text-xs text-slate-500">{sub}</p></div>
                          </div>
                        ))}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-600" /><TrendingDown className="w-3.5 h-3.5 text-red-600" /></div>
                          <div><p className="text-xs text-slate-600 font-medium">Variance %</p><p className="text-xs text-slate-500">Performance gap</p></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
                      <p className="text-base font-semibold text-slate-600 mb-1">No Data Available</p>
                      <p className="text-sm text-slate-500">Select a different year or add sales data</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
