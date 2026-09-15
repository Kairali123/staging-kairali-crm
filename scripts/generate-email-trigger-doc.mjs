import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), 'docs/email-trigger-config')
const files = [
  'index.html',
  'report-renderer.js',
  'report-body.js',
  'report-link.js',
  'persistence.js',
]

const [html, renderer, body, bridge, persistence] = files.map((file) =>
  readFileSync(join(root, file), 'utf8')
)

const inline = (script) =>
  '<script>' + script.replace(/<\/script/gi, '<\\/script') + '</script>'

const documentHtml = html
  .replace('<script src="report-renderer.js"></script>', inline(renderer))
  .replace('<script src="report-body.js"></script>', inline(body))
  .replace('<script src="report-link.js"></script>', inline(bridge))
  .replace('<script src="persistence.js"></script>', inline(persistence))

const outputTs = `// Embedded standalone HTML document for Email Triggering Config.
// This allows the route /settings/automation/email-triggers to render reliably
// in serverless / hosted environments (e.g. Vercel) without depending on
// filesystem access to docs/email-trigger-config at runtime.

export const EMAIL_TRIGGER_CONFIG_HTML = ${JSON.stringify(documentHtml)}
`

const targetPath = join(process.cwd(), 'lib/email-triggers/embedded-document.ts')
writeFileSync(targetPath, outputTs, 'utf8')
console.log(`Successfully generated ${targetPath} (${outputTs.length} bytes)`)
