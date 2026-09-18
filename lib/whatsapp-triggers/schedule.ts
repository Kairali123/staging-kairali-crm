import {localDay,nextRun} from '@/lib/email-triggers/schedule'
import type {ConfigInput} from './schema'
export function nextDailyRun(config:ConfigInput,after=Date.now()){
 return nextRun({...config,frequency:'Daily',custom:'',interval:'24',weekday:'Monday',monthday:'1',end:''},after)
}
export function reportDate(at:number){return new Date(Date.parse(localDay(at,'Asia/Kolkata')+'T00:00:00Z')-86400000).toISOString().slice(0,10)}
export function workerReady(state:{heartbeat?:string;rendererReady?:boolean},now=Date.now()){
 if (process.env.VERCEL) {
  if (process.env.CRON_SECRET) return true
  return Boolean(state.heartbeat && now - Date.parse(state.heartbeat) < 24 * 60 * 60 * 1000)
 }
 const age=now-Date.parse(state.heartbeat||'');return state.rendererReady===true&&age>=0&&age<120000
}
