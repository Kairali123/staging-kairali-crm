// // src/lib/google-drive.ts
// import { google } from 'googleapis'
// import { Readable } from 'stream'

// function getDriveClient() {
//   const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
//   if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set in .env')
//   console.log('[Drive] Initializing Google Drive client', raw)
//   const credentials = JSON.parse(raw)
//   const auth = new google.auth.GoogleAuth({
//     credentials,
//     scopes: ['https://www.googleapis.com/auth/drive'],
//   })
//   return google.drive({ version: 'v3', auth })
// }

// export async function uploadAudioToDrive(
//   audioBuffer: Buffer,
//   fileName: string,
//   mimeType = 'audio/webm'
// ): Promise<{ fileId: string; streamUrl: string; webViewLink: string }> {
//   const drive    = getDriveClient()
//   const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
//   if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in .env')
//   console.log(`[Drive] Uploading file ${fileName} (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB)`)
//   const stream = new Readable()
//   stream.push(audioBuffer)
//   stream.push(null)

//   const res = await drive.files.create({
//     supportsAllDrives: true,
//     fields: 'id, webViewLink, webContentLink',
//     requestBody: {
//       name:    fileName,
//       parents: [folderId],
//       mimeType,
//     },
//     media: { mimeType, body: stream },
//   })

//   const fileId      = res.data.id!
//   const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

//   await drive.permissions.create({
//     fileId,
//     supportsAllDrives: true,
//     requestBody: { role: 'reader', type: 'anyone' },
//   })

//   const streamUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
//   return { fileId, streamUrl, webViewLink }
// }

// export async function deleteAudioFromDrive(audioUrl: string): Promise<void> {
//   const match = audioUrl.match(/[?&]id=([^&]+)/)
//   if (!match) return
//   const fileId = match[1]
//   const drive  = getDriveClient()
//   try {
//     await drive.files.delete({ fileId, supportsAllDrives: true })
//   } catch (err: any) {
//     console.warn(`[Drive] Could not delete file ${fileId}:`, err.message)
//   }
// }


// src/lib/google-drive.ts
import { google } from 'googleapis'
import { Readable } from 'stream'

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set in .env')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

export async function uploadAudioToDrive(
  audioBuffer: Buffer,
  fileName: string,
  mimeType = 'audio/webm',
  ownerEmail?: string,
): Promise<{ fileId: string; streamUrl: string; webViewLink: string }> {
  const drive = getDriveClient()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in .env')

  const stream = new Readable()
  stream.push(audioBuffer)
  stream.push(null)

  const res = await drive.files.create({
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'id, webViewLink',
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
      appProperties: ownerEmail
        ? {
            crmOwnerEmail: ownerEmail,
            crmUploadPurpose: 'meeting-audio',
          }
        : undefined,
    },
    media: { mimeType, body: stream },
  } as any)

  const fileId = res.data.id!
  const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

  // NO public permission needed anymore — audio is served via our proxy route
  // which authenticates with the service account on the backend.

  // Store the proxy URL — this is what goes in the DB and in <audio src="...">
  // The proxy handles Range requests so browser can seek + show duration correctly.
  const streamUrl = `/api/meetings/audio?id=${fileId}`

  return { fileId, streamUrl, webViewLink }
}

export async function deleteAudioFromDrive(audioUrl: string): Promise<void> {
  // audioUrl is now "/api/meetings/audio?id=FILE_ID" — extract the id
  const match = audioUrl.match(/[?&]id=([^&]+)/)
  if (!match) return
  const fileId = match[1]
  const drive = getDriveClient()
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true })
  } catch (err: any) {
    console.warn(`[Drive] Could not delete file ${fileId}:`, err.message)
  }
}
