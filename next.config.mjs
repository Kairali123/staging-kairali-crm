/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.3.58',
  ],

  async rewrites() {
    return [
      {
        source: '/dialshree/:path*',
        destination: '/dialShree/:path*',
      },
    ]
  },

  // ── Increase body size limit for all API routes (App Router) ──────────────
  // Note: config.api.bodyParser only works in Pages Router (/pages/api)
  // For App Router, use this experimental config for Server Actions,
  // and handle large bodies via streaming (req.arrayBuffer / req.text)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',  // for any Server Actions
    },
  },

  // Do not add wildcard CORS to authenticated CRM APIs. Meeting uploads now go
  // through session-authenticated route handlers, and direct browser uploads to
  // Google Drive depend on Google's own CORS policy rather than exposing CRM API
  // responses to every origin.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
          { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:" },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
