import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
export const bookingSQL=`SELECT COALESCE(NULLIF(TRIM(b.booking_taken_by),''),'Unassigned') agent,
 DATE_FORMAT(b.booking_datetime,'%Y-%m-%d') bookingDate, UPPER(TRIM(COALESCE(b.currency,'INR'))) currency,
 SUM(b.invoice_amount) amount, COUNT(*) records
 FROM ktahv_bookings_fms_v3_part1 b
 WHERE b.booking_datetime>=? AND b.booking_datetime<?
 GROUP BY agent,bookingDate,currency`
export const cancellationSQL=`SELECT COALESCE(NULLIF(TRIM(b.booking_taken_by),''),'Unassigned') agent,
 DATE_FORMAT(b.booking_datetime,'%Y-%m-%d') bookingDate, UPPER(TRIM(COALESCE(b.currency,'INR'))) currency,
 SUM(b.invoice_amount) amount, COUNT(*) records
 FROM ktahv_bookings_fms_v3_part1 b
 INNER JOIN JSON_TABLE(?, '$[*]' COLUMNS(reservation_id VARCHAR(255) PATH '$')) d
 ON CONVERT(b.reservation_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(d.reservation_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
 WHERE LOWER(TRIM(b.booking_status)) IN ('cancelled','booking cancelled','canceled')
 GROUP BY agent,bookingDate,currency`
export type BookingAggregate={agent:string;bookingDate:string;currency:string;amount:number|string|null;records:number}
export async function cancellationDates(date:string){
 const saved=JSON.parse(await readFile(join(process.cwd(),'data/daily-sales-report/cancellation-dates.json'),'utf8')) as {capturedAt:string;dates:{id:string;date:string}[]}
 return {ids:[...new Set(saved.dates.filter(r=>r.date===date).map(r=>r.id))],capturedAt:saved.capturedAt}
}
export async function bookingAmounts(bookings:BookingAggregate[],cancellations:BookingAggregate[]){
 const rates=new Map<string,Promise<number>>()
 async function inr(r:BookingAggregate){
  if(r.amount===null||!Number.isFinite(Number(r.amount)))throw Error('Booking amount unavailable')
  const currency=r.currency==='EURO'?'EUR':r.currency
  if(currency==='INR')return Number(r.amount)
  if(!['EUR','USD'].includes(currency)||!/^\d{4}-\d{2}-\d{2}$/.test(r.bookingDate))throw Error('Unsupported booking currency/date')
  const key=currency+r.bookingDate
  if(!rates.has(key))rates.set(key,(async()=>{const response=await fetch(`https://api.frankfurter.dev/v2/rate/${currency}/INR?date=${r.bookingDate}&providers=ecb`,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Historical FX unavailable');const data=await response.json();if(!Number.isFinite(data.rate)||data.rate<=0||!data.date||data.date>r.bookingDate)throw Error('Invalid historical FX');return data.rate as number})())
  return Number(r.amount)*await rates.get(key)!
 }
 const rows=await Promise.all([...bookings.map(r=>({r,cancel:false})),...cancellations.map(r=>({r,cancel:true}))].map(async({r,cancel})=>({company:'KTAHV',agent:r.agent,verified:cancel?0:await inr(r),cancelled:cancel?await inr(r):0,unverified:0,records:r.records,conversions:cancel?0:r.records})))
 return rows
}
