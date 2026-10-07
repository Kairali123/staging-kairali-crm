import { OAuth2Client } from 'google-auth-library'
import { decrypt, encrypt, appOrigin } from './security'
import { projectKey } from './model'
import { readMonitor, monitorTransaction } from './store'
export const scopes = ['openid','email','https://www.googleapis.com/auth/drive.metadata.readonly']
export function oauthClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw Error('Google OAuth is not configured')
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, appOrigin()+'/api/trigger-monitor/callback')
}
export async function scanAccount(email: string) {
  const account=(await readMonitor()).accounts.find(a=>a.email===email)
  if(!account?.refreshToken) throw Error('Connect this Google account first')
  try {
    const auth=oauthClient();auth.setCredentials({refresh_token:decrypt(account.refreshToken)})
    const params=new URLSearchParams({q:"trashed = false and mimeType = 'application/vnd.google-apps.script'",pageSize:'100',fields:'nextPageToken,files(id,name)',spaces:'drive'})
    if(account.scanCursor)params.set('pageToken',account.scanCursor)
    const response=await auth.request<{nextPageToken?:string;files?:{id?:string;name?:string}[]}>({url:'https://www.googleapis.com/drive/v3/files?'+params,timeout:20000})
    await monitorTransaction(s=>{
      const a=s.accounts.find(x=>x.email===email)!; a.lastScan=new Date().toISOString();a.scanError=undefined;a.scanCursor=response.data.nextPageToken || undefined
      for(const f of response.data.files||[]) {
        if(!f.id) continue
        const key=projectKey(email,f.id), existing=s.projects.find(p=>p.key===key)
        if(existing) existing.name=f.name||existing.name
        else if(s.projects.length<1000) s.projects.push({key,email,scriptId:f.id,name:f.name||'Apps Script project',discoveredAt:a.lastScan})
        else a.scanError='Project limit reached (1000); discovery is incomplete.'
      }
    })
    return { discovered:response.data.files?.length||0, more:Boolean(response.data.nextPageToken) }
  } catch {
    await monitorTransaction(s=>{const a=s.accounts.find(x=>x.email===email);if(a)a.scanError='Google discovery failed. Reconnect the account and verify Drive API access.'})
    throw Error('Google discovery failed. Reconnect and verify Drive API access.')
  }
}
export async function completeGoogleConnection(code: string, expectedEmail: string, codeVerifier: string) {
  const auth=oauthClient(), {tokens}=await auth.getToken({code,codeVerifier})
  if(!tokens.id_token) throw Error('Google identity was not returned')
  const ticket=await auth.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID}),identity=ticket.getPayload()
  if(!identity?.email_verified || identity.email?.toLowerCase()!==expectedEmail) throw Error('Sign in with the selected Google account')
  if(!tokens.scope?.split(' ').includes(scopes[2])) throw Error('Drive metadata permission is required')
  await monitorTransaction(s=>{
    const a=s.accounts.find(a=>a.email===expectedEmail)
    if(!a) throw Error('Account registration no longer exists')
    if(tokens.refresh_token) a.refreshToken=encrypt(tokens.refresh_token)
    if(!a.refreshToken) throw Error('Offline access is required; reconnect and grant consent')
    a.connectedAt=new Date().toISOString();a.scanError=undefined;a.scanCursor=undefined
  })
}
