import {mkdir,readFile,rename,open,rmdir} from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import type {Trigger,Run} from './schema'
export type State={version:1;triggers:Trigger[];runs:Run[];heartbeat?:string}
export function stateRoot(){if(process.env.VERCEL)throw Error('Shared persistent storage must be configured before hosted scheduling');return path.join(process.cwd(),'.local/email-triggers')}
export async function readState():Promise<State>{try{return JSON.parse(await readFile(path.join(stateRoot(),'state.json'),'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {version:1,triggers:[],runs:[]};throw e}}
export async function transaction<T>(fn:(s:State)=>T|Promise<T>):Promise<T>{
 const root=stateRoot();await mkdir(root,{recursive:true,mode:0o700});const lock=path.join(root,'lock');
 try{await mkdir(lock,{mode:0o700})}catch{throw Error('Configuration busy; retry shortly. A persistent lock needs operator review.')}
 try{const state=await readState(),result=await fn(state);state.runs=state.runs.slice(-2000);const temp=path.join(root,randomUUID()+'.tmp'),file=await open(temp,'wx',0o600);try{await file.writeFile(JSON.stringify(state));await file.sync()}finally{await file.close()}await rename(temp,path.join(root,'state.json'));return result}finally{await rmdir(lock)}
}
