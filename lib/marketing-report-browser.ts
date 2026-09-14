'use client'
/** Render script-free export markup in an isolated document, never in the application DOM. */
export async function exportFrame(html:string){
 const frame=document.createElement('iframe')
 frame.setAttribute('sandbox','allow-same-origin allow-modals')
 frame.setAttribute('aria-hidden','true')
 frame.style.cssText='position:fixed;left:-20000px;top:0;width:1400px;height:1000px;border:0;pointer-events:none;'
 document.body.appendChild(frame)
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Report rendering timed out')),15000);frame.onload=()=>{clearTimeout(timer);resolve()};frame.srcdoc=html}).catch(e=>{frame.remove();throw e})
 await frame.contentDocument?.fonts.ready
 return frame
}
export function saveReportFile(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
export async function reportJPG(html:string){
 const frame=await exportFrame(html)
 try{
  const doc=frame.contentDocument!
  const height=doc.documentElement.scrollHeight
  frame.style.height=height+'px'
  const scale=Math.min(2,16000/height,Math.sqrt(32000000/(1400*height)))
  if(scale<0.7)throw Error('This report is too long for one readable JPG. Export one company at a time.')
  const {default:html2canvas}=await import('html2canvas')
  const canvas=await html2canvas(doc.body,{backgroundColor:'#f2f5f1',scale,width:1400,height,windowWidth:1400,windowHeight:height,logging:false})
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image generation failed')),'image/jpeg',.95))
 }finally{frame.remove()}
}
export async function printReport(html:string){
 const frame=await exportFrame(html)
 const cleanup=()=>frame.remove()
 frame.contentWindow!.addEventListener('afterprint',cleanup,{once:true})
 frame.contentWindow!.focus();frame.contentWindow!.print()
 // Keep the document alive until the user closes print preview.
 // A timeout can blank a preview while the user is still choosing PDF settings.
}
export async function copyReportHTML(html:string){
 const plain=new DOMParser().parseFromString(html,'text/html').body.textContent??''
 await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([plain],{type:'text/plain'})})])
}
