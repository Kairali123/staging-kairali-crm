import { NextResponse } from 'next/server'
import { google } from 'googleapis'

function parseServiceAccountJson(raw: string): any {
  try { return JSON.parse(raw) } catch (_) {}
  try {
    const fixed = raw.replace(/("(?:[^"\\]|\\[\s\S])*")/g, (match) =>
      match.replace(/\n/g, '\\n').replace(/\r/g, '')
    )
    return JSON.parse(fixed)
  } catch (_) {}
  try {
    const stripped = raw
      .replace(/\r\n/g, '\\n').replace(/\r/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
    return JSON.parse(stripped)
  } catch (err: any) {
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${err.message}`)
  }
}

function getGoogleAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured.')
  const credentials = parseServiceAccountJson(raw)
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  })
}

export async function GET() {
  try {
    const auth = getGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })

    // List ALL files (any type) visible to the service account — no folder filter
    const allRes = await drive.files.list({
      q: 'trashed = false',
      fields: 'files(id, name, mimeType, parents, owners)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 100,
    })
    const allFiles = allRes.data.files || []

    // Specifically filter Google Sheets
    const googleSheets = allFiles.filter(
      (f: any) => f.mimeType === 'application/vnd.google-apps.spreadsheet'
    )

    // Try to read the specific folder ID in use
    const FOLDER_ID = '14hJWI8WndvOL5srlKd44wI-misC8pWei'
    let folderFilesResult: any[] = []
    let folderError: string | null = null
    try {
      const folderRes = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 200,
      })
      folderFilesResult = folderRes.data.files || []
    } catch (e: any) {
      folderError = e?.message || 'Unknown error accessing folder'
    }

    return NextResponse.json({
      success: true,
      serviceAccountEmail: 'kairali-crm-sync@kairali-crm-sync.iam.gserviceaccount.com',
      targetFolderId: FOLDER_ID,
      targetFolderUrl: `https://drive.google.com/drive/folders/${FOLDER_ID}`,
      folderFiles: {
        count: folderFilesResult.length,
        error: folderError,
        files: folderFilesResult.map((f: any) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
      },
      allAccessibleFiles: {
        total: allFiles.length,
        googleSheets: {
          count: googleSheets.length,
          sheets: googleSheets.map((f: any) => ({
            id: f.id,
            name: f.name,
            url: `https://docs.google.com/spreadsheets/d/${f.id}`,
            parents: f.parents,
          })),
        },
        others: allFiles
          .filter((f: any) => f.mimeType !== 'application/vnd.google-apps.spreadsheet')
          .map((f: any) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
      },
      instruction: googleSheets.length > 0
        ? `Service account CAN see ${googleSheets.length} Google Sheet(s). Copy the correct folder ID from the parents array of your sheets and update DEFAULT_DRIVE_FOLDER_ID in lib/google-client-sync.ts.`
        : 'Service account cannot see ANY Google Sheets. Please share the individual Google Sheets OR the folder containing them with kairali-crm-sync@kairali-crm-sync.iam.gserviceaccount.com',
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      hint: 'Check that GOOGLE_SERVICE_ACCOUNT_JSON is correctly set in .env.local',
    }, { status: 500 })
  }
}
