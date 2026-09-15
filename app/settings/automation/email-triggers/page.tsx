import { readFile } from 'node:fs/promises'
import path from 'node:path'
import EmailConfigBridge from './report-bridge'
import { EMAIL_TRIGGER_CONFIG_HTML } from '@/lib/email-triggers/embedded-document'

export const dynamic = 'force-dynamic'

export default async function EmailTriggersPage() {
  let documentHtml = EMAIL_TRIGGER_CONFIG_HTML

  try {
    const root = path.join(process.cwd(), 'docs/email-trigger-config')
    const [html, renderer, body, bridge, persistence] = await Promise.all([
      'index.html',
      'report-renderer.js',
      'report-body.js',
      'report-link.js',
      'persistence.js',
    ].map((file) => readFile(path.join(root, file), 'utf8')))

    // Inline only repository-owned scripts, never report data or query-string values.
    const inline = (script: string) => '<script>' + script.replace(/<\/script/gi, '<\\/script') + '</script>'
    documentHtml = html
      .replace('<script src="report-renderer.js"></script>', inline(renderer))
      .replace('<script src="report-body.js"></script>', inline(body))
      .replace('<script src="report-link.js"></script>', inline(bridge))
      .replace('<script src="persistence.js"></script>', inline(persistence))
  } catch {
    // In hosted / serverless runtimes (e.g. Vercel) where docs/ is omitted from lambda bundles,
    // fallback cleanly to the bundled embedded template without throwing runtime errors.
  }

  return <EmailConfigBridge document={documentHtml} />
}

