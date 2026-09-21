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
 // Sum non-null values; null only when no companies matched at all
 const sum=(key:keyof PendingCompany)=>{const nonNull=values.filter(v=>v[key]!==null);return nonNull.length?nonNull.reduce((n,v)=>n+v[key]!,0):null}
 const dates=[...new Set(data?.employees.map(r=>r.date).filter(Boolean))];const sameDay=dates.length===1
 const scopedEmp=scopedEmployees(data,scope)
 const appsheet=scope==='ALL'&&sameDay&&data?.employees.length&&data.employees.every(r=>r.appsheet!==null)?data.employees.reduce((n,r)=>n+r.appsheet!,0):employeeTotal(scopedEmp,'appsheet')
 const dialer=employeeTotal(scopedEmp,'dialer')
 const done=employeeTotal(scopedEmp,'done')
 const empPending=employeeTotal(scopedEmp,'pending')
 const pendingAppsheet=empPending!==null?empPending:sum('appsheet')
 return {pendingAppsheet,pendingNational:sum('national'),pendingInternational:sum('international'),appsheet,dialer,done,dates}
}
export const showCount=(value:number|null|undefined)=>value==null?'—':value.toLocaleString('en-IN')

// Sum non-null employee values; null only when the list is empty or all values are null (data truly missing)
export function employeeTotal(employees:CallingEmployee[]|undefined,key:"pending"|"appsheet"|"dialer"|"done"){if(!employees?.length)return null;const nonNull=employees.filter(r=>r[key]!==null);return nonNull.length?nonNull.reduce((sum,r)=>sum+r[key]!,0):null}

export function scopedEmployees(data:CallingData|undefined,scope:string){return (data?.employees||[]).filter(r=>scope==='ALL'||r.companies?.includes(scope))}

export function parseEmployeeCompany(raw: unknown): string | null {
  if (!raw) return null
  const s = String(raw).toUpperCase().trim()
  if (s.includes('KTAHV') || s.includes('HEALING VILLAGE')) return 'KTAHV'
  if (s.includes('KAPPL') || s.includes('PRODUCTS')) return 'KAPPL'
  if (s.includes('VILLARAAG') || s.includes('VILLA RAAG')) return 'VILLARAAG'
  if (s.includes('KAC') || s.includes('CENTRE') || s.includes('CENTER')) return 'KAC'
  return null
}

export function mapEmployeeCompanies(
  employees: CallingEmployee[],
  companyRecords: { user_name?: string; company?: string; company_name?: string }[],
  validCompanies: Record<string, string>
) {
  for (const employee of employees) {
    const empName = employee.name.trim().toLowerCase()
    let matches = companyRecords.filter(r => (r.user_name || '').trim().toLowerCase() === empName)
    if (!matches.length) {
      matches = companyRecords.filter(r => {
        const u = (r.user_name || '').trim().toLowerCase()
        return u && (u.startsWith(empName.split(' ')[0]) || empName.startsWith(u.split(' ')[0]))
      })
    }
    const resolved = matches
      .map(r => parseEmployeeCompany(r.company) || parseEmployeeCompany(r.company_name))
      .filter((c): c is string => Boolean(c && (Object.hasOwn(validCompanies, c) || c === 'KAC')))
    employee.companies = [...new Set(resolved)]
  }
}
