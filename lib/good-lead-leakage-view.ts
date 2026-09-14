import type { LeakageRow } from './good-lead-leakage'
export const metricKeys = ['cold','reopened','aiReopened','manualReopened','bothReopened','aiReassign','aiEscalated','manualReassign','manualEscalated','pending','lowAttempts','aiRejected','missingAttempts','missingCompany','missingSource','missingOwner'] as const
export type Metrics = Record<typeof metricKeys[number], number>
export function sumRows(rows: LeakageRow[]): Metrics {
 const result = Object.fromEntries(metricKeys.map(key=>[key,0])) as Metrics
 for (const row of rows) for (const key of metricKeys) result[key] += Number(row[key] ?? 0)
 return result
}
export type GroupDimension = 'source' | 'owner' | 'company'
export interface Breakdown extends Metrics {key:string;name:string;company:string}
export function groupRows(rows:LeakageRow[], dimension:GroupDimension):Breakdown[] {
 const groups = new Map<string, LeakageRow[]>()
 for(const row of rows){const key=JSON.stringify(dimension==='company'?[row.company]:[row.company,row[dimension]]);groups.set(key,[...(groups.get(key)||[]),row])}
 return [...groups].map(([key,items])=>({key,name:items[0][dimension],company:items[0].company,...sumRows(items)}))
 .sort((a,b)=>b.manualReopened-a.manualReopened || b.reopened-a.reopened || b.cold-a.cold || a.key.localeCompare(b.key))
}
export const percent = (part:number, whole:number) => whole > 0 ? (100*part/whole).toFixed(1) : '0.0'
export function reportDate(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function quickRange(period:'month'|'previous'|'week',now=new Date()) {
 const to=reportDate(now)
 if(period==='month')return {from:to.slice(0,8)+'01',to}
 if(period==='week')return {from:new Date(Date.parse(to+'T00:00:00Z')-6*86400000).toISOString().slice(0,10),to}
 const end=new Date(Date.parse(to.slice(0,8)+'01T00:00:00Z')-86400000).toISOString().slice(0,10)
 return {from:end.slice(0,8)+'01',to:end}
}
