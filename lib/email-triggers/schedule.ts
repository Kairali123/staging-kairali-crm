export type Schedule = {frequency:string;time:string;custom:string;interval:string;weekday:string;monthday:string;timezone:string;start:string;end:string}
export const offsets:Record<string,number>={'Asia/Kolkata':330,'Asia/Dubai':240,UTC:0}
export function localDay(at:number,zone:string){return new Date(at+offsets[zone]*60000).toISOString().slice(0,10)}
export function validDay(day:string){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day}
export function nextRun(s:Schedule,after:number):string|null{
 const offset=offsets[s.timezone]*60000,anchor=Date.parse(s.start+'T'+s.time+':00Z')-offset
 if(s.frequency==='Every 6 hours'){
  const step=Number(s.interval)*3600000,n=Math.max(0,Math.floor((after-anchor)/step)+1),at=anchor+n*step
  return s.end&&localDay(at,s.timezone)>s.end?null:new Date(at).toISOString()
 }
 if(s.frequency==='One-time')return anchor>after?new Date(anchor).toISOString():null
 const first=Date.parse((localDay(after,s.timezone)>s.start?localDay(after,s.timezone):s.start)+'T00:00:00Z')
 for(let day=0;day<370;day++){
  const d=new Date(first+day*86400000),date=d.toISOString().slice(0,10)
  if(s.end&&date>s.end)return null
  if(s.frequency==='Weekly'&&d.getUTCDay()!==['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(s.weekday))continue
  if(s.frequency==='Monthly'&&(s.monthday==='Last day'?new Date(d.getTime()+86400000).getUTCDate()!==1:d.getUTCDate()!==Number(s.monthday)))continue
  const times=s.frequency==='Custom'?[...new Set(s.custom.split(',').map(x=>x.trim()))].sort():[s.time]
  for(const time of times){const at=Date.parse(date+'T'+time+':00Z')-offset;if(at>after)return new Date(at).toISOString()}
 }
 return null
}
