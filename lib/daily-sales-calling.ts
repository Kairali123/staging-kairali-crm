export type CallingEmployee={name:string;date:string;updatedAt:string;pending:number|null;appsheet:number|null;dialer:number|null;done:number|null;campaign:string;companies?:string[]}
export type PendingCompany={appsheet:number|null;national:number|null;international:number|null}
export type CallingData={employees:CallingEmployee[];pending:Record<string,PendingCompany>;pendingCapturedAt:string|null;pendingMode:'live'|'snapshot'|'database'|'unavailable';fetchedAt:string;warnings:string[]}
export function count(value:unknown):number|null{if(value===null||value===undefined||String(value).trim()==='')return 0;const n=Number(String(value).replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:null}
export function liveDate(value:unknown){const s=String(value||'');const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:''}
export function parseEmployees(rows:Record<string,unknown>[]):CallingEmployee[]{
 return rows.filter(r=>String(r.Name||'').trim()).map(r=>{const appsheet=count(r['Appsheet - Total Calls Done']),dialer=count(r['Dialer - Total Calls Done']??r['Dialer - Total Calls Done ']);return{name:String(r.Name).trim(),date:liveDate(r.Date),updatedAt:String(r.Date||''),pending:count(r['Appsheet - Total Calls Pending (Till Today)']),appsheet,dialer,done:appsheet===null||dialer===null?null:appsheet+dialer,campaign:String(r['Dialer - Last Loggedin Campaign']||'')}})
}
export function parsePending(rows:unknown[][]):Record<string,PendingCompany>{
 if(rows[0]?.[3]!=='KTAHV'||rows[0]?.[4]!=='VILLARAAG'||rows[0]?.[5]!=='KAPPL')throw Error('Pending sheet headers changed')
 // O8:T23: summary totals are worksheet rows 13, 18 and 23.
 for(const index of [5,10,15])if(String(rows[index]?.[0]).trim()!=='TOTAL')throw Error('Pending totals moved')
 return Object.fromEntries(['KTAHV','VILLARAAG','KAPPL'].map((code,i)=>[code,{national:count(rows[5][i+3]),international:count(rows[10][i+3]),appsheet:count(rows[15][i+3])}]))
}
export function callingSummary(data:CallingData|undefined,scope:string){
 const values=data?Object.entries(data.pending).filter(([code])=>scope==='ALL'||scope===code).map(([,v])=>v):[]
 const sum=(key:keyof PendingCompany)=>values.length&&values.every(v=>v[key]!==null)?values.reduce((n,v)=>n+v[key]!,0):null
 const dates=[...new Set(data?.employees.map(r=>r.date).filter(Boolean))];const sameDay=dates.length===1
 const scopedEmp=scopedEmployees(data,scope)
 const appsheet=scope==='ALL'&&sameDay&&data?.employees.length&&data.employees.every(r=>r.appsheet!==null)?data.employees.reduce((n,r)=>n+r.appsheet!,0):employeeTotal(scopedEmp,'appsheet')
 const dialer=employeeTotal(scopedEmp,'dialer')
 const done=employeeTotal(scopedEmp,'done')
 const pendingAppsheet=sum('appsheet')
 return {pendingAppsheet,pendingNational:sum('national'),pendingInternational:sum('international'),appsheet,dialer,done,dates}
}
export const showCount=(value:number|null|undefined)=>value==null?'—':value.toLocaleString('en-IN')

export function employeeTotal(employees:CallingEmployee[]|undefined,key:"pending"|"appsheet"|"dialer"|"done"){return employees?.length&&employees.every(r=>r[key]!==null)?employees.reduce((sum,r)=>sum+r[key]!,0):null}

export function scopedEmployees(data:CallingData|undefined,scope:string){return (data?.employees||[]).filter(r=>scope==='ALL'||r.companies?.includes(scope))}
