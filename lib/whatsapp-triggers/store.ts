import {mkdir,readFile,rename,open,rmdir} from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import type {Config} from './schema'
export type Run={id:string;triggerId:string;startedAt:string;status:'Preparing'|'Sending'|'Accepted'|'Failed'|'Unknown'|'Skipped'|'Partial';messageId?:string;scheduledAt?:string;detail?:string;recipients?:{to:string;status:'Pending'|'Sending'|'Accepted'|'Unknown'|'Skipped';messageId?:string}[]}
export type State={version:1;triggers:Config[];runs:Run[];heartbeat?:string;rendererReady?:boolean}
export function stateRoot(){if(process.env.VERCEL)throw Error('Persistent WhatsApp storage is not configured for this deployment');return path.join(process.cwd(),'.local/whatsapp-triggers')}
export async function readState():Promise<State>{try{return JSON.parse(await readFile(path.join(stateRoot(),'state.json'),'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {version:1,triggers:[],runs:[]};throw e}}
export async function transaction<T>(fn:(s:State)=>T|Promise<T>):Promise<T>{
 const dir=stateRoot();await mkdir(dir,{recursive:true,mode:0o700});const lock=path.join(dir,'lock');
 try{await mkdir(lock,{mode:0o700})}catch{throw Error('Configuration busy. Retry after the current operation finishes.')}
 try{const state=await readState(),result=await fn(state);const temp=path.join(dir,randomUUID()+'.tmp'),file=await open(temp,'wx',0o600);try{await file.writeFile(JSON.stringify(state));await file.sync()}finally{await file.close()}await rename(temp,path.join(dir,'state.json'));return result}finally{await rmdir(lock)}
}
