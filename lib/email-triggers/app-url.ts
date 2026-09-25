/**
 * Absolute base URL used for links embedded in outbound emails (e.g. the KServe
 * Lead Lost Alert "Download Excel Report" button). Getting this wrong doesn't fail
 * loudly — it mails a working-looking but broken link — so this only ever falls
 * back to `localhost` when NODE_ENV genuinely says local development, and throws
 * otherwise instead of guessing a domain that may not be the real live site.
 */
export function resolveAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  if (env.NODE_ENV === 'development') return 'http://localhost:3000'
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, '')
  throw new Error(
    'NEXT_PUBLIC_APP_URL is not set. Set it to the live site URL before this trigger can send ' +
    '(without it, report links would either fail to build or point at the wrong host).'
  )
}
