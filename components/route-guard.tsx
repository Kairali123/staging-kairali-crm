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
  '/doctor-consultation/report': 'doctor.consultation.view',
  '/reports/doctor-consultation': 'doctor.consultation.view',
  '/doctor-consultation/calendar': 'doctor.consultation.view',
  '/doctor-consultation/history': 'doctor.consultation.view',
  '/doctor-consultation/prescription/new': 'doctor.consultation.view',
  '/doctor-consultation/prescription/preview': 'doctor.consultation.view',
  '/marketing-dashboard': 'marketing.view',
  '/good-lead-leakage': 'good_lead_leakage.view',
  '/marketing-daily-report': 'marketing_daily_report.view',
  '/marketing-funnel': 'marketing_funnel.view',
  '/marketing/google-ppc': 'marketing_google_report.view',
  '/marketing/facebook-ppc': 'marketing_facebook_report.view',
  '/google-adword-reports': 'google_adword_report.view',
  '/calls/reports': 'calls_report.view',
  '/sales/reports': 'sales_report.view',
  '/sales/reports/daily-alert': 'daily_sales_alert.view',
  '/sales/reports/email-trigger-config': 'sales_report.view',
  '/settings': 'sales_report.view',
  '/settings/automation': 'sales_report.view',
  '/settings/automation/email-triggers': 'sales_report.view',
  '/settings/automation/whatsapp': 'sales_report.view',
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
  '/dialShree/summary': 'dialshree_menu.view',
  '/voicecall/summary': 'ai_voice_summary.view',
  '/meetings': 'meetings.view',
  '/accounts-tracker': 'accounts_tracker.view',
  '/fms/booking-pi-review-tracker': 'ktahv_pi_audit_tracker.view',
  '/booking-pi-review-tracker': 'ktahv_pi_audit_tracker.view',
  '/pi-tracker': 'ktahv_pi_audit_tracker.view',
  '/MR-FMS': 'mr-fms.view',
  '/crr-fms': 'crr_fms.view',
  '/voicecall/non-qualified': 'non_qualified.view',
  '/fms/pending-tasks': 'task_fms.view',
  // M7: was `fms/enquiry-reverification` with no leading slash, so it never
  // matched. `app/fms/enquiry-reverification/page.tsx` is a real page and the
  // permission is unchanged — only the key is repaired.
  '/fms/enquiry-reverification': 'cold_enquiry_reverification.view',
  '/new-order-fms': 'new-order-fms.view',
  '/new-order-fms/primary-order-form': 'primary_order_form.view',
  '/lead-search': 'lead_search.view',
  '/client-database': 'client_database.view',
  '/client-database/upload': 'client_database_upload.view',
  '/voicecall/kserve-lead-lost': 'voicecall_kserve_lead_lost.view',
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
    '/marketing-dashboard',
    '/fms/booking-pi-review-tracker',
    '/booking-pi-review-tracker',
    '/pi-tracker',
    '/good-lead-leakage',
    '/marketing-daily-report',
    '/sales/reports/daily-alert'
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

    // Allow access to login page for all users and guest experience app
    if (pathname === '/' || pathname.startsWith('/guest-experience')) return

    // If user is not authenticated (or just logged out), redirect to login page '/', not access-denied
    if (!user) {
      router.replace('/')
      return
    }

    // Check user roles
    const roleStr = String(user?.role || '').toLowerCase().trim()
    const isSuperAdmin = roleStr === 'super_admin' || roleStr === 'super admin'

    // Routes exclusively restricted to super admin (no other role or permission allowed)
    const cleanPath = pathname.replace(/\/$/, '') || '/'
    const superAdminOnlyRoutes = [
      '/settings',
      '/settings/automation',
      '/settings/automation/email-triggers',
      '/settings/automation/whatsapp',
      '/sales/reports/email-trigger-config',
    ]
    if (
      superAdminOnlyRoutes.includes(cleanPath) ||
      cleanPath.startsWith('/settings')
    ) {
      if (!isSuperAdmin) {
        router.replace('/access-denied')
        return
      }
      return
    }

    // Super admin and admin have unrestricted access to all other pages
    if (isSuperAdmin || roleStr === 'admin' || user?.permissions?.includes('all')) return

    // If route is restricted, redirect to access-denied unless user has the permission
    if (isRestricted(pathname)) {
      const requiredPermission = pagePermissions[pathname]
      if (!requiredPermission || !hasPermission(requiredPermission)) {
        router.replace('/access-denied')
        return
      }
    }

    // Dedicated check for KAPPL New Order routes
    if (pathname === '/new-order-fms' || pathname.startsWith('/new-order-fms/')) {
      if (pathname.startsWith('/new-order-fms/primary-order-form')) {
        const hasPrimaryAccess =
          hasPermission('primary_order_form.view') ||
          hasPermission('primary_order_form.viewSelf') ||
          hasPermission('primary_order_form.viewAll') ||
          hasPermission('primary_order_form.edit') ||
          hasPermission('primary_order_form') ||
          hasPermission('primary-order-form.view') ||
          hasPermission('primary-order-form.viewSelf') ||
          hasPermission('primary-order-form.viewAll') ||
          hasPermission('primary-order-form.edit') ||
          hasPermission('primary-order-form')
        if (!hasPrimaryAccess) {
          router.replace('/access-denied')
          return
        }
        return
      }

      const hasFmsAccess =
        hasPermission('new-order-fms.view') ||
        hasPermission('new-order-fms.viewSelf') ||
        hasPermission('new-order-fms.viewAll') ||
        hasPermission('new-order-fms.edit') ||
        hasPermission('new-order-fms') ||
        hasPermission('new_order_fms.view') ||
        hasPermission('new_order_fms.viewSelf') ||
        hasPermission('new_order_fms.viewAll') ||
        hasPermission('new_order_fms.edit') ||
        hasPermission('new_order_fms')
      if (!hasFmsAccess) {
        router.replace('/access-denied')
        return
      }
      return
    }

    // Dedicated check for Lead Search
    if (pathname === '/lead-search' || pathname.startsWith('/lead-search/')) {
      const hasAccess =
        hasPermission('lead_search.view') ||
        hasPermission('lead_search.viewSelf') ||
        hasPermission('lead_search.viewAll') ||
        hasPermission('lead_search.edit') ||
        hasPermission('lead_search') ||
        hasPermission('leads.view')
      if (!hasAccess) {
        router.replace('/access-denied')
        return
      }
      return
    }

    // Dedicated check for Client Database Upload
    if (pathname === '/client-database/upload' || pathname.startsWith('/client-database/upload/')) {
      const hasAccess =
        hasPermission('client_database_upload.view') ||
        hasPermission('client_database_upload.viewSelf') ||
        hasPermission('client_database_upload.viewAll') ||
        hasPermission('client_database_upload.edit') ||
        hasPermission('client_database_upload') ||
        hasPermission('client_database.edit') ||
        hasPermission('client_database.viewAll')
      if (!hasAccess) {
        router.replace('/access-denied')
        return
      }
      return
    }

    // Dedicated check for Client Database
    if (pathname === '/client-database' || (pathname.startsWith('/client-database/') && !pathname.startsWith('/client-database/upload'))) {
      const hasAccess =
        hasPermission('client_database.view') ||
        hasPermission('client_database.viewSelf') ||
        hasPermission('client_database.viewAll') ||
        hasPermission('client_database.edit') ||
        hasPermission('client_database')
      if (!hasAccess) {
        router.replace('/access-denied')
        return
      }
      return
    }

    // Dedicated check for KServe Lead Lost Tracker
    if (pathname === '/voicecall/kserve-lead-lost' || pathname.startsWith('/voicecall/kserve-lead-lost/')) {
      const hasAccess =
        hasPermission('voicecall_kserve_lead_lost.view') ||
        hasPermission('voicecall_kserve_lead_lost.viewSelf') ||
        hasPermission('voicecall_kserve_lead_lost.viewAll') ||
        hasPermission('voicecall_kserve_lead_lost.edit') ||
        hasPermission('voicecall_kserve_lead_lost') ||
        hasPermission('kserve_lead_lost.view') ||
        hasPermission('ai_voice_menu.view')
      if (!hasAccess) {
        router.replace('/access-denied')
        return
      }
      return
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
