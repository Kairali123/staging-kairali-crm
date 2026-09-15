"use client"

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface PITrackerItem {
  id: string
  generatedAt: string
  bookingDateTime: string | null
  actualDateTime: string | null
  isFreshBooking: boolean
  eventContext: string
  isOlderBooking: boolean
  reservationId: string
  piNumber: string
  guest: string
  bookingStatus: string
  checkInDate: string | null
  checkOutDate: string | null
  salesDoer: string
  invoiceAmount: number
  currency: string
  originalInvoiceAmount: number
  fxRate: number
  previousInvoiceAmount: number
  previousCurrency: string | null
  previousOriginalAmount: number | null
  previousFxRate: number | null
  amountChange: number
  amendmentReason: string
  status: string
  cancellationReason: string
  piLink: string
  piHistoryLink: string
  reviewed: boolean
  reviewLocked: boolean
  reviewStatus: string
  reviewedBy: string
  reviewedAt: string | null
}

interface Summary {
  total: number
  current: number
  amended: number
  cancelled: number
  reviewed: number
  todaySalesCount: number
  todaySalesAmount: number
  newPi: number
}

interface SalesBreakdown {
  name: string
  todaySalesCount: number
  todaySalesAmount: number
  newPi: number
  amended: number
  cancelled: number
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function BookingPIReviewTrackerPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST())
  const [items, setItems] = useState<PITrackerItem[]>([])
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    current: 0,
    amended: 0,
    cancelled: 0,
    reviewed: 0,
    todaySalesCount: 0,
    todaySalesAmount: 0,
    newPi: 0,
  })
  const [salesBreakdown, setSalesBreakdown] = useState<SalesBreakdown[]>([])
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('All sales people')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [savingId, setSavingId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All')
  const [toastMsg, setToastMsg] = useState<string>('')
  const [statusMsg, setStatusMsg] = useState<string>('Select a date and click Sync')
  const [reviewSheetUrl, setReviewSheetUrl] = useState<string>(
    'https://docs.google.com/spreadsheets/d/1eTEsMwgIWqSGJ2FOiyQ42AegJ81dywaiwHo7ynVbJXE/edit#gid=1445771307'
  )

  const loadTrackerData = async (targetDate: string = selectedDate) => {
    setIsLoading(true)
    setToastMsg('')
    try {
      const res = await fetch(`/api/booking-pi-review-tracker?date=${encodeURIComponent(targetDate)}`, {
        cache: 'no-store',
      })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Server returned an invalid response. Please refresh once.')
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'PI tracker is unavailable')
      }

      setItems(data.items || [])
      setSummary(data.summary || { total: 0, current: 0, amended: 0, cancelled: 0, reviewed: 0, todaySalesCount: 0, todaySalesAmount: 0, newPi: 0 })
      setSalesBreakdown(data.salesBreakdown || [])
      if (data.reviewSheetUrl) setReviewSheetUrl(data.reviewSheetUrl)
      setSelectedSalesPerson('All sales people')
      setIsConnected(true)
      setStatusMsg(`Live Database Synced · ${new Date(data.generatedAt || Date.now()).toLocaleString('en-IN')}`)
    } catch (err: any) {
      setItems([])
      setSummary({ total: 0, current: 0, amended: 0, cancelled: 0, reviewed: 0, todaySalesCount: 0, todaySalesAmount: 0, newPi: 0 })
      setSalesBreakdown([])
      setIsConnected(false)
      setToastMsg(err instanceof Error ? err.message : 'PI tracker is unavailable')
      setStatusMsg('Database sync required')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTrackerData(selectedDate)
  }, [])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSales = selectedSalesPerson === 'All sales people' || item.salesDoer === selectedSalesPerson
      const matchesStatus = selectedStatusFilter === 'All' || item.status === selectedStatusFilter
      const matchesQuery =
        !q ||
        `${item.reservationId} ${item.piNumber} ${item.guest} ${item.salesDoer}`
          .toLowerCase()
          .includes(q)

      return matchesSales && matchesStatus && matchesQuery
    })
  }, [items, selectedSalesPerson, selectedStatusFilter, searchQuery])

  const activeMetrics = useMemo(() => {
    if (selectedSalesPerson === 'All sales people') return summary
    const sb = salesBreakdown.find((s) => s.name === selectedSalesPerson)
    const personItems = items.filter((i) => i.salesDoer === selectedSalesPerson)
    return {
      total: personItems.length,
      current: personItems.filter((i) => i.status === 'Current').length,
      amended: sb?.amended || 0,
      cancelled: sb?.cancelled || 0,
      reviewed: personItems.filter((i) => i.reviewLocked || i.reviewed).length,
      todaySalesCount: sb?.todaySalesCount || 0,
      todaySalesAmount: sb?.todaySalesAmount || 0,
      newPi: sb?.newPi || 0,
    }
  }, [items, salesBreakdown, selectedSalesPerson, summary])

  const handleReviewToggle = async (item: PITrackerItem, reviewedState: boolean) => {
    setSavingId(item.id)
    setToastMsg('')
    try {
      const res = await fetch('/api/booking-pi-review-tracker', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reservationId: item.reservationId,
          piNumber: item.piNumber,
          reviewed: reviewedState,
          reviewedBy: 'Accounts',
          guest: item.guest,
          invoiceAmount: item.invoiceAmount,
          checkInDate: item.checkInDate,
          checkOutDate: item.checkOutDate,
        }),
      })

      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Review service returned an invalid response. Please retry.')
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Review status could not be saved')
      }

      const finalReviewed = data.reviewed ?? reviewedState
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                reviewed: finalReviewed,
                reviewLocked: true,
                reviewStatus: data.reviewStatus || (finalReviewed ? 'Yes' : 'No'),
                reviewedAt: data.reviewedAt || new Date().toISOString(),
                reviewedBy: data.reviewedBy || 'Accounts',
              }
            : i
        )
      )

      if (!item.reviewLocked) {
        setSummary((prev) => ({ ...prev, reviewed: prev.reviewed + 1 }))
      }

      setToastMsg(`${item.piNumber} review saved in SQL as ${finalReviewed ? 'Yes' : 'No'}.`)
    } catch (err: any) {
      setToastMsg(err instanceof Error ? err.message : 'Review status could not be saved')
    } finally {
      setSavingId('')
    }
  }

  const reviewPercentage = summary.total ? Math.round((summary.reviewed / summary.total) * 100) : 0

  return (
    <div className="w-full text-[#14251d] font-sans">
      <style jsx global>{`
        .piContent { max-width: 1600px; margin: auto; }
        .eyebrow { letter-spacing: .16em; color: #758078; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        .liveTag { letter-spacing: .12em; color: #285d45; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; }
        .liveTag span { background: #46a16e; border-radius: 50%; width: 7px; height: 7px; margin-right: 6px; }
        .reviewGauge { background: #e2ece5; border: 9px solid #96b4a1; border-radius: 50%; flex-direction: column; flex: none; justify-content: center; align-items: center; width: 105px; height: 105px; display: flex; }
        .reviewGauge strong { font-size: 25px; line-height: 1; }
        .reviewGauge small { text-transform: uppercase; color: #6c7a72; letter-spacing: .08em; font-size: 9px; margin-top: 4px; }
        .piMetricGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 11px; }
        .piMetricGrid article { border: 1px solid #dce4df; background: #fff; border-top: 3px solid #8aa195; border-radius: 11px; padding: 15px 17px; }
        .piMetricGrid article.current { border-top-color: #4f7e65; }
        .piMetricGrid article.amended { border-top-color: #d78d35; }
        .piMetricGrid article.cancelled { border-top-color: #c94c47; }
        .piMetricGrid article.reviewed { border-top-color: #625c88; }
        .salesFilterBar { border: 1px solid #dce4df; background: #fff; border-radius: 11px; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 12px; padding: 12px 14px; display: flex; }
        .salesChips button { border: 1px solid #dce4df; color: #66736b; white-space: nowrap; cursor: pointer; background: #f7f9f7; border-radius: 20px; padding: 7px 11px; font-size: 9px; font-weight: 800; margin-right: 6px; }
        .salesChips button.selected { background: #14251d; border-color: #14251d; color: #fff; }
        .piTable { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .piTable th { text-align: left; color: #758078; letter-spacing: .1em; text-transform: uppercase; border-top: 1px solid #dce4df; border-bottom: 1px solid #dce4df; background: #f7f9f7; padding: 10px 18px; font-size: 9px; }
        .piTable td { color: #34453b; border-bottom: 1px solid #edf1ee; padding: 14px 18px; font-size: 12px; }
        .piStatus { text-transform: uppercase; color: #32684d; background: #e5eee8; border-radius: 5px; padding: 5px 7px; font-size: 9px; font-weight: 800; display: inline-block; }
        .piStatus.amended { color: #9a611e; background: #faead8; }
        .piStatus.cancelled { color: #a83834; background: #f7dcda; }
        .viewPi { color: #285d45; background: #f6faf7; border: 1px solid #bdd0c4; border-radius: 7px; padding: 7px 9px; font-size: 10px; font-weight: 800; text-decoration: none; display: inline-block; }
        .viewPi.disabled { color: #929c96; border-color: #dce4df; background: #f0f3f0; cursor: not-allowed; }
        .viewPi.history { color: #625c88; background: #f8f7fc; border-color: #c9c5df; }
        .reviewToggle { background: #edf1ee; border-radius: 7px; padding: 3px; display: inline-flex; }
        .reviewToggle button { color: #758078; cursor: pointer; background: transparent; border: 0; border-radius: 5px; padding: 6px 9px; font-size: 10px; font-weight: 800; }
        .reviewToggle button.selected.yes { color: #286448; background: #dcebe1; }
        .reviewToggle button.selected.no { color: #9a4c48; background: #fff; box-shadow: 0 1px 2px #12201618; }
        .reviewToggle button:disabled { cursor: not-allowed; opacity: .55; }
        .reviewLocked { border-left: 3px solid #c94c47; color: #a83834; background: #fff2f1; border-radius: 6px; min-width: 145px; padding: 8px 10px; }
        .eventDateBlock { display: flex; flex-direction: column; gap: 3px; min-width: 160px; }
        .eventDateRow { display: flex; align-items: flex-start; gap: 5px; }
        .eventDateDot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
        .eventDateDot.booking { background: #14251d; }
        .eventDateDot.amend { background: #b45309; }
        .eventDateDot.cancel { background: #dc2626; }
        .eventDateLabel { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
        .eventDateLabel.booking { color: #6c7a72; }
        .eventDateLabel.amend { color: #b45309; }
        .eventDateLabel.cancel { color: #dc2626; }
        .eventDateValue { font-size: 11px; font-weight: 700; }
        .eventDateValue.booking { color: #14251d; }
        .eventDateValue.amend { color: #b45309; }
        .eventDateValue.cancel { color: #dc2626; }
        .eventDateTime { font-size: 10px; font-weight: 500; opacity: .8; }
        .eventDateTime.booking { color: #34453b; }
        .eventDateTime.amend { color: #92400e; }
        .eventDateTime.cancel { color: #b91c1c; }
        @media (max-width: 1100px) { .piMetricGrid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 760px) { .piMetricGrid { grid-template-columns: 1fr 1fr; } .salesFilterBar { flex-direction: column; align-items: flex-start; } }
      `}</style>

      <section className="piContent">
        {/* Top Header */}
        <header className="border-b border-[#dce4df] flex flex-wrap justify-between items-center py-4 mb-6 gap-4">
          <div>
            <p className="eyebrow">ACCOUNTS CONTROL</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#14251d] mt-1">Daily PI tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="border border-[#dce4df] bg-white rounded-lg flex items-center gap-2 px-3 py-2 text-xs">
              <span className="font-extrabold uppercase tracking-wider text-[#6c7a72] text-[9px]">Booking date · Column C</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  loadTrackerData(e.target.value)
                }}
                className="bg-transparent border-0 outline-none font-semibold text-[#14251d]"
              />
            </label>
            <button
              className="bg-[#14251d] text-white font-bold rounded-lg px-4 py-2 text-xs disabled:opacity-65 transition hover:bg-[#285d45]"
              onClick={() => loadTrackerData(selectedDate)}
              disabled={isLoading}
            >
              {isLoading ? 'Syncing…' : 'Sync from SQL'}
            </button>
            <span className="bg-[#d7c8a5] text-[#14251d] rounded-full w-9 h-9 grid place-items-center font-bold text-xs">AC</span>
          </div>
        </header>

        {/* Hero Banner */}
        <section className="flex justify-between items-center py-6 px-2 mb-4 gap-6">
          <div>
            <span className="liveTag">
              <span />
              {isConnected ? 'SYNCED · MYSQL DATABASE' : 'MANUAL SYNC READY'}
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#14251d] my-3 leading-tight">
              Daily sales &amp; PI movement,<br />
              <em className="text-[#285d45] font-serif not-italic">one accurate view.</em>
            </h2>
            <p className="text-[#6c7a72] max-w-[650px] text-xs md:text-sm leading-relaxed">
              Sales use NewBookings column C stored in MySQL database. EUR/USD amounts are converted to INR at the booking-date rate. Older amendments and cancellations remain visible on their event date.
            </p>
          </div>
          <div className="reviewGauge hidden sm:flex">
            <strong>{reviewPercentage}%</strong>
            <small>reviewed</small>
          </div>
        </section>

        {/* Connection & Toast Banners */}
        {!isConnected && (
          <div className="bg-[#fff7e9] border border-[#ecd4ae] rounded-lg flex items-center gap-3 p-3 text-xs mb-4 text-[#806d52]">
            <span className="bg-[#f2d8ae] text-[#8f5a16] rounded-md w-7 h-7 grid place-items-center font-bold">↻</span>
            <div>
              <strong className="block text-black">{isLoading ? 'Syncing selected date...' : 'Manual sync is waiting'}</strong>
              <small className="block text-[#806d52]">{statusMsg}</small>
            </div>
          </div>
        )}

        {toastMsg && (
          <div className="bg-[#e2efe7] border border-[#b2d8c3] text-[#286648] rounded-lg p-3 text-xs font-semibold mb-4">
            {toastMsg}
          </div>
        )}

        {/* Sales Person Chips */}
        <section className="salesFilterBar">
          <div>
            <span className="text-[8px] font-bold text-[#6c7a72] tracking-widest block uppercase">SALES PERSON</span>
            <strong className="text-sm text-[#14251d] block mt-0.5">{selectedSalesPerson}</strong>
          </div>
          <div className="salesChips flex overflow-x-auto py-1">
            {['All sales people', ...salesBreakdown.map((s) => s.name)].map((spName) => (
              <button
                key={spName}
                className={selectedSalesPerson === spName ? 'selected' : ''}
                onClick={() => setSelectedSalesPerson(spName)}
              >
                {spName === 'All sales people' ? 'All' : spName}
              </button>
            ))}
          </div>
        </section>

        {/* Metric Cards Grid */}
        <section className="piMetricGrid mb-6">
          <article>
            <span className="text-[#6c7a72] text-[10px] font-bold block">Today's sales</span>
            <strong className="text-2xl text-[#14251d] my-2 block">
              ₹{activeMetrics.todaySalesAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </strong>
            <small className="text-[#6c7a72] text-[10px]">
              {activeMetrics.todaySalesCount} fresh new booking{activeMetrics.todaySalesCount === 1 ? '' : 's'}
            </small>
          </article>
          <article className="current">
            <span className="text-[#6c7a72] text-[10px] font-bold block">New PIs (Fresh)</span>
            <strong className="text-2xl text-[#14251d] my-2 block">{activeMetrics.newPi}</strong>
            <small className="text-[#6c7a72] text-[10px]">Fresh booking on selected date</small>
          </article>
          <article className="amended">
            <span className="text-[#6c7a72] text-[10px] font-bold block">Amended today</span>
            <strong className="text-2xl text-[#14251d] my-2 block">{activeMetrics.amended}</strong>
            <small className="text-[#6c7a72] text-[10px]">Includes older bookings</small>
          </article>
          <article className="cancelled">
            <span className="text-[#6c7a72] text-[10px] font-bold block">Cancelled today</span>
            <strong className="text-2xl text-[#14251d] my-2 block">{activeMetrics.cancelled}</strong>
            <small className="text-[#6c7a72] text-[10px]">Includes older bookings</small>
          </article>
          <article className="reviewed">
            <span className="text-[#6c7a72] text-[10px] font-bold block">Reviewed</span>
            <strong className="text-2xl text-[#14251d] my-2 block">
              {activeMetrics.reviewed}/{activeMetrics.total}
            </strong>
            <small className="text-[#6c7a72] text-[10px]">Accounts completed</small>
          </article>
        </section>

        {/* PI Queue Table */}
        <section className="bg-white border border-[#dce4df] rounded-xl overflow-hidden shadow-sm">
          <div className="flex flex-wrap justify-between items-end p-5 border-b border-[#dce4df] gap-4">
            <div>
              <p className="eyebrow">SELECTED DAY</p>
              <h3 className="text-lg font-bold text-[#14251d] mt-1">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <label className="border border-[#dce4df] bg-white rounded-lg flex items-center gap-2 px-3 py-1.5 min-w-[220px]">
                <span className="text-[#829088]">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search PI, booking or guest"
                  className="bg-transparent border-0 outline-none text-xs w-full text-[#14251d]"
                />
              </label>
              <div className="bg-[#f0f3f0] p-1 rounded-lg flex text-xs">
                {['All', 'Current', 'Amended', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatusFilter(st)}
                    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                      selectedStatusFilter === st ? 'bg-white text-[#14251d] font-bold shadow-sm' : 'text-[#6d7871]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="piTable">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Booking ID / PI</th>
                  <th>Guest name</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Sales person</th>
                  <th>Amount</th>
                  <th>Amendment details</th>
                  <th>Status</th>
                  <th>Latest PI</th>
                  <th>PI history</th>
                  <th>Accounts review</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  let piUrl = item.piLink
                  if (piUrl && /^https?:\/\//i.test(piUrl.trim())) {
                    const params = new URLSearchParams({ url: piUrl.trim(), bookingId: item.reservationId })
                    piUrl = `/api/pi-document?${params.toString()}`
                  }

                  return (
                    <tr key={item.id} className="hover:bg-[#f8faf8] transition">
                      <td>
                        <div className="eventDateBlock">
                          {/* Actual original booking date — always shown in black */}
                          {item.bookingDateTime && (
                            <div className="eventDateRow">
                              <span className="eventDateDot booking" />
                              <div>
                                <span className="eventDateLabel booking">Booked</span>
                                <div className="eventDateValue booking">
                                  {new Date(item.bookingDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="eventDateTime booking">
                                  {new Date(item.bookingDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Amend date — amber/orange */}
                          {item.status === 'Amended' && item.actualDateTime && (
                            <div className="eventDateRow" style={{ marginTop: 5 }}>
                              <span className="eventDateDot amend" />
                              <div>
                                <span className="eventDateLabel amend">Amended</span>
                                <div className="eventDateValue amend">
                                  {new Date(item.actualDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="eventDateTime amend">
                                  {new Date(item.actualDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Cancel date — red */}
                          {item.status === 'Cancelled' && item.actualDateTime && (
                            <div className="eventDateRow" style={{ marginTop: 5 }}>
                              <span className="eventDateDot cancel" />
                              <div>
                                <span className="eventDateLabel cancel">Cancelled</span>
                                <div className="eventDateValue cancel">
                                  {new Date(item.actualDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="eventDateTime cancel">
                                  {new Date(item.actualDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Fallback: no datetime stored yet */}
                          {!item.bookingDateTime && (
                            <div className="eventDateRow">
                              <span className="eventDateDot booking" />
                              <div>
                                <span className="eventDateLabel booking">Booked</span>
                                <div className="eventDateValue booking">
                                  {new Date(item.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="eventDateTime booking">
                                  {new Date(item.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Context label */}
                          <span className={`text-[9px] font-bold mt-1 inline-block ${
                            item.status === 'Amended' ? 'text-[#b45309]' :
                            item.status === 'Cancelled' ? 'text-[#dc2626]' :
                            item.isFreshBooking ? 'text-[#285d45]' : 'text-[#849087]'
                          }`}>{item.eventContext}</span>
                        </div>
                      </td>
                      <td>
                        <strong className="block text-xs text-[#14251d]">{item.reservationId}</strong>
                        <small className="block text-[10px] text-[#849087] mt-0.5">{item.piNumber}</small>
                      </td>
                      <td>
                        <strong className="block text-xs text-[#14251d]">{item.guest}</strong>
                        <small className="block text-[10px] text-[#849087] mt-0.5">{item.bookingStatus}</small>
                      </td>
                      <td>
                        <strong className="block text-xs text-[#14251d]">
                          {item.checkInDate ? new Date(`${item.checkInDate}T00:00:00`).toLocaleDateString('en-IN') : '—'}
                        </strong>
                      </td>
                      <td>
                        <strong className="block text-xs text-[#14251d]">
                          {item.checkOutDate ? new Date(`${item.checkOutDate}T00:00:00`).toLocaleDateString('en-IN') : '—'}
                        </strong>
                      </td>
                      <td className="text-xs text-[#34453b]">{item.salesDoer}</td>
                      <td>
                        <strong className="block text-xs text-[#14251d]">
                          ₹{item.invoiceAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </strong>
                        {item.currency !== 'INR' && item.fxRate > 0 && (
                          <small className="block text-[10px] text-[#625c88] mt-0.5">
                            {item.currency === 'EUR' ? '€' : '$'}
                            {item.originalInvoiceAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} × ₹
                            {item.fxRate.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                          </small>
                        )}
                        {item.status === 'Amended' && item.previousInvoiceAmount > 0 && (
                          <small className="block text-[10px] text-[#756e68] mt-1">
                            Previous ₹{item.previousInvoiceAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            <br />
                            <span className="font-extrabold text-[#c94c47]">
                              Change {item.amountChange >= 0 ? '+' : '−'}₹
                              {Math.abs(item.amountChange).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </small>
                        )}
                      </td>
                      <td>
                        <strong className="block text-xs text-[#34453b]">{item.amendmentReason || '—'}</strong>
                      </td>
                      <td>
                        <span className={`piStatus ${item.status.toLowerCase()}`}>{item.status}</span>
                        {item.cancellationReason && (
                          <small className="block text-[10px] text-[#849087] mt-1" title={item.cancellationReason}>
                            {item.cancellationReason}
                          </small>
                        )}
                      </td>
                      <td>
                        {item.piLink && /^https?:\/\//i.test(item.piLink.trim()) ? (
                          <a className="viewPi" href={piUrl} target="_blank" rel="noreferrer">
                            View PI ↗
                          </a>
                        ) : (
                          <span className="viewPi disabled">PI not Created</span>
                        )}
                      </td>
                      <td>
                        {item.piHistoryLink ? (
                          <a className="viewPi history" href={item.piHistoryLink} target="_blank" rel="noreferrer">
                            History ↗
                          </a>
                        ) : (
                          <span className="viewPi disabled">No history</span>
                        )}
                      </td>
                      <td>
                        {item.reviewLocked ? (
                          <div className="reviewLocked">
                            <strong className="block text-[10px] font-bold">Reviewed: {item.reviewStatus}</strong>
                            <small className="block text-[9px] text-[#b15c57] mt-0.5">
                              {item.reviewedBy || 'Accounts'}
                              <br />
                              {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString('en-IN') : 'Saved in SQL'}
                            </small>
                          </div>
                        ) : (
                          <div className="reviewToggle">
                            <button
                              disabled={savingId === item.id}
                              className={item.reviewed ? 'selected yes' : ''}
                              onClick={() => handleReviewToggle(item, true)}
                            >
                              Yes
                            </button>
                            <button
                              disabled={savingId === item.id}
                              className={!item.reviewed && item.reviewStatus === 'No' ? 'selected no' : ''}
                              onClick={() => handleReviewToggle(item, false)}
                            >
                              No
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!isLoading && filteredItems.length === 0 && (
              <div className="text-center text-[#6c7a72] py-12 text-xs">
                <strong className="block text-[#14251d] text-sm">No PIs found for this view.</strong>
                Try another date or status filter.
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="flex justify-between items-center pt-8 text-[10px] text-[#89958d]">
          <span>Kairali Booking Audit · Accounts PI Tracker</span>
          <span>
            Source: MySQL Database (`ktahv_bookings_fms_v3_part1` &amp; `booking_pi_records`) ·{' '}
            <a href={reviewSheetUrl} target="_blank" rel="noreferrer" className="text-[#285d45] font-bold">
              Open PI review log Sheet ↗
            </a>
          </span>
        </footer>
      </section>
    </div>
  )
}
