'use client'
import { useEffect, useRef, useState } from 'react'
import { reportHTML, yesterdayIST } from '@/lib/marketing-daily-report'

export default function MarketingDailyReport() {
  const [date,setDate]=useState(yesterdayIST)
  const [html,setHtml]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [retry,setRetry]=useState(0)
  const frame=useRef<HTMLIFrameElement>(null)
  useEffect(()=>{
    const handler=(event:MessageEvent)=>{
      if(event.source!==frame.current?.contentWindow || event.data?.type!=='marketing-report-date')return
      const next=event.data.date
      if(typeof next==='string' && /^\d{4}-\d{2}-\d{2}$/.test(next) && next<=yesterdayIST()){setLoading(true);setError('');setHtml('');setDate(next);setRetry(n=>n+1)}
    }
    window.addEventListener('message',handler)
    return()=>window.removeEventListener('message',handler)
  },[])
  useEffect(()=>{
    if(!date)return
    const controller=new AbortController()
    fetch('/api/marketing-daily-report?date='+encodeURIComponent(date),{cache:'no-store',signal:controller.signal})
      .then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||'Report unavailable');return body})
      .then(body=>{if(!controller.signal.aborted)setHtml(reportHTML(date,body))})
      .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Report unavailable')})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[date,retry])
  if(loading)return <main className="p-10" role="status">Loading SQL report…</main>
  if(error)return <main className="p-10"><h1 className="text-2xl font-semibold">Marketing Daily Report</h1><p role="alert" className="my-4 text-red-700">{error}</p><label>Report date <input type="date" value={date} max={yesterdayIST()} onChange={e=>{if(e.target.value){setLoading(true);setError('');setDate(e.target.value)}}} /></label><button className="ml-4 rounded border px-4 py-2" onClick={()=>{setLoading(true);setError('');setRetry(n=>n+1)}}>Retry</button></main>
  return <iframe ref={frame} title="Marketing Daily Report" srcDoc={html} sandbox="allow-scripts allow-modals allow-downloads" className="block h-screen w-full border-0" />
}
