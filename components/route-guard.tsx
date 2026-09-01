'use client'

import { useAuth } from '@/hooks/use-auth'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Map routes to required permissions.
//
// Keys are matched against `usePathname()` with `pagePermissions[pathname]`, so a
// key must be exactly a pathname: leading slash, no query string, no trailing
// slash. Three keys did not satisfy that and so enforced nothing (matrix M6/M7);
// they are corrected below and each carries a note.
const pagePermissions: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/leads': 'leads.view',
  '/leads/assign': 'leads.assign',
  '/leads/duplicates': 'leads.view',
  '/calls': 'calls.view',
  '/reports': 'reports.view',
  '/reports/sales-conversion': 'reports.view',
  '/performance': 'performance.view',
  '/users': 'users.view',
  '/helpdesk': 'helpdesk.view',
  '/fms': 'fms.view',
  '/fms/bookings': 'bookings.view',
  '/fms/bookings/villa-raag': 'villa_raag.view',
  '/fms/bookings/employee-wise': 'bookings.view',
  '/fms/bookings/team': 'team.view',
  '/fms/bookings/new': 'bookings.view',
  '/fms/bookings/verified': 'bookings.view',
  '/fms/bookings/unverified': 'bookings.view',
  '/fms/complaints': 'fms.view',
  '/fms/complaints/new': 'fms.view',
  '/fms/doctor-consultation': 'fms.view',
  '/fms/riya-sharma': 'fms.view',
  '/fms/v3': 'fms.view',
  '/doctor-consultation': 'doctor.consultation.view',
  '/doctor-consultation/calendar': 'doctor.consultation.view',
  '/doctor-consultation/history': 'doctor.consultation.view',
  '/doctor-consultation/prescription/new': 'doctor.consultation.view',
  '/marketing-dashboard': 'marketing.view',
  '/marketing-funnel': 'marketing_funnel.view',
  '/marketing/google-ppc': 'marketing_google_report.view',
  '/marketing/facebook-ppc': 'marketing_facebook_report.view',
  '/google-adword-reports': 'google_adword_report.view',
  '/calls/reports': 'calls_report.view',
  '/sales/reports': 'sales_report.view',
  // `sales_call_audit.view` is page access only — the data itself is gated
  // server-side by `viewSelf`/`viewAll`, so this key deliberately does not name a
  // scope. The email template is a whole-team artifact, so it names `viewAll`.
  '/sales-call-audit': 'sales_call_audit.view',
  '/sales-call-audit/email-template': 'sales_call_audit.viewAll',
  // M6: these were `/voicecall/data?tab=received` and `?tab=sent`, which
  // `usePathname()` can never produce. The pages the two tabs became are
  // `/voicecall/data/received` and `/voicecall/data/sent`, and each already calls
  // `hasPermission` for exactly the permission its old key named
  // (`app/voicecall/data/received/page.tsx:1696`,
  // `app/voicecall/data/sent/page.tsx:466`), so the guard now agrees with the page
  // rather than being silently inert. `/voicecall/data` itself stays unmapped —
  // giving it a permission would be new policy, which is D7.
  '/voicecall/data/received': 'ai_voice_received.view',
  '/voicecall/data/sent': 'ai_voice_sent.view',
  '/dialShree/received': 'dialshree_received.view',
  '/dialShree/sent': 'dialshree_sent.view',
  '/dialShree/summary': 'dialshree_summary.view',
  '/dialshree/received': 'dialshree_received.view',
  '/dialshree/sent': 'dialshree_sent.view',
  '/dialshree/summary': 'dialshree_summary.view',
  '/voicecall/summary': 'ai_voice_summary.view',
  '/meetings': 'meetings.view',
  '/accounts-tracker': 'accounts_tracker.view',
  '/MR-FMS': 'mr-fms.view',
  '/crr-fms': 'crr_fms.view',
  '/voicecall/non-qualified': 'non_qualified.view',
  '/fms/pending-tasks': 'task_fms.view',
  // M7: was `fms/enquiry-reverification` with no leading slash, so it never
  // matched. `app/fms/enquiry-reverification/page.tsx` is a real page and the
  // permission is unchanged — only the key is repaired.
  '/fms/enquiry-reverification': 'cold_enquiry_reverification.view',
}

const isRestricted = (pathname: string) => {
  const path = pathname.replace(/\/$/, '') || '/'

  if (path.startsWith('/fms/complaints')) {
    return true
  }

  const exactRestricted = [
    // Both keys above were previously unreachable: `pagePermissions` is only
    // consulted for paths listed here, so the audit page enforced nothing
    // client-side. Listing them makes the `view` grant actually gate the page.
    '/sales-call-audit',
    '/sales-call-audit/email-template',
    '/helpdesk',
    '/meet',
    '/performance',
    '/users',
    '/calls',
    '/fms',
    '/fms/bookings',
    '/fms/bookings/employee-wise',
    '/fms/bookings/new',
    '/fms/bookings/unverified',
    '/fms/bookings/verified',
    '/fms/doctor-consultation',
    '/fms/v3',
    '/leads/duplicates',
    '/leads/duplicates/assign',
    '/leads/duplicates/duplicates',
    '/leads/duplicates_old',
    '/reports',
    '/reports/sales-conversion',
    '/marketing-dashboard'
  ]

  return exactRestricted.includes(path)
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, hasPermission, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    // Allow access to login page for all users
    if (pathname === '/') return

    // If user is not authenticated (or just logged out), redirect to login page '/', not access-denied
    if (!user) {
      router.replace('/')
      return
    }

    // Super admin and admin have unrestricted access to all pages
    const roleStr = String(user?.role || '').toLowerCase().trim()
    if (roleStr === 'super_admin' || roleStr === 'admin' || user?.permissions?.includes('all')) return

    // If route is restricted, redirect to access-denied unless user has the permission
    if (isRestricted(pathname)) {
      const requiredPermission = pagePermissions[pathname]
      if (!requiredPermission || !hasPermission(requiredPermission)) {
        router.replace('/access-denied')
        return
      }
    }

    // Check if current path requires permission
    const requiredPermission = pagePermissions[pathname]

    // If route requires permission and user doesn't have it, redirect to access-denied
    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.replace('/access-denied')
    }
  }, [user, isLoading, pathname, hasPermission, router])

  return <>{children}</>
}


// export default function RouteGuard({ children }: { children: React.ReactNode }) {
//   const { user, hasPermission, isLoading } = useAuth()
//   const pathname = usePathname()
//   const router = useRouter()

//   useEffect(() => {
//     // Don't redirect while loading
//     if (isLoading) return

//     // Allow access to login page for all users
//     if (pathname === '/') return
//     // Check if current path requires permission
//     const requiredPermission = pagePermissions[pathname]

//     // If route requires permission and user doesn't have it, redirect to access-denied
//     if (requiredPermission && user && !hasPermission(requiredPermission)) {
//       router.replace('/access-denied')
//     }
//   }, [user, isLoading, pathname, hasPermission, router])

//   // Hold guarded children back until the session bootstrap in AuthProvider has
//   // settled. Rendering them during loading let child components mount and read
//   // the localStorage compatibility cache before /api/auth/me had a chance to
//   // disprove it — a tampered local record would have driven a full render pass.
//   // The wait is one same-origin request; a blank frame is the intended cost.
//   if (isLoading) return <></>

//   return <>{children}</>
// }
