/*path: app/layout.tsx */
import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth"
import { LeadsProvider } from "@/hooks/use-leads"
import RouteGuard from "@/components/route-guard"
import ContentProtectionProvider from "@/components/content-protection-provider"
import { NotificationProvider } from "@/contexts/notification-context"
import { NextAuthSessionProvider } from "@/components/session-provider"
import { SessionGuard } from "@/components/session-guard"
import { Suspense } from "react"
import { Toaster } from "sonner"
import ChatWidget from "@/components/bot-widget/ChatWidget"

export const metadata: Metadata = {
  title: "Kairali Group Management System",
  description: "Employee and Business Management Platform",
  generator: "v0.app",
  icons: {
    icon: "/crm.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              Loading...
            </div>
          }
        >
          <AuthProvider>
            <SessionGuard />
            <RouteGuard>
              <LeadsProvider>
                <NotificationProvider>
                  <ContentProtectionProvider>
                    <NextAuthSessionProvider>
                      {children}
                    </NextAuthSessionProvider>
                  </ContentProtectionProvider>
                </NotificationProvider>

                <Toaster
                  position="top-right"
                  richColors
                  expand={false}
                  visibleToasts={5}
                  toastOptions={{
                    style: {
                      fontSize: "14px",
                      pointerEvents: "auto",
                    },
                  }}
                />
              </LeadsProvider>
            </RouteGuard>
            <ChatWidget />
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}



/*path: app/layout.tsx */
// import type React from "react"
// import type { Metadata } from "next"
// import { Inter } from "next/font/google"
// import "./globals.css"
// import { AuthProvider } from "@/hooks/use-auth"
// import { LeadsProvider } from "@/hooks/use-leads"
// import RouteGuard from "@/components/route-guard"
// import ContentProtectionProvider from "@/components/content-protection-provider" // 👈 ADD THIS
// import { NotificationProvider } from "@/contexts/notification-context"
// import { Suspense } from "react"
// import { Toaster } from "sonner"

// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-sans",
// })

// export const metadata: Metadata = {
//   title: "Kairali Group Management System",
//   description: "Employee and Business Management Platform",
//   generator: "v0.app",
//   icons: {
//     icon: "/crm.png",
//   },
// }

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode
// }>)
//  {
//   return (
//     <html lang="en" className={`${inter.variable} antialiased`}>
//       <body>
//         <Suspense
//           fallback={
//             <div className="flex items-center justify-center min-h-screen">
//               Loading...
//             </div>
//           }
//         >
//           <AuthProvider>
//             <RouteGuard>
//               <LeadsProvider>
//                 <NotificationProvider>
//                   {/* 🛡️ ADD CONTENT PROTECTION HERE */}
//                   <ContentProtectionProvider>
//                     {children}
//                   </ContentProtectionProvider>
//                 </NotificationProvider>

//                 {/* ✅ GLOBAL TOAST MOUNT - Ensures no click blocking */}
//                 <Toaster
//                   position="top-right"
//                   richColors
//                   expand={false}
//                   visibleToasts={5}
//                   toastOptions={{
//                     style: {
//                       fontSize: "14px",
//                       pointerEvents: "auto", // Toasts themselves should be clickable
//                     },
//                   }}
//                 />
//               </LeadsProvider>
//             </RouteGuard>
//           </AuthProvider>
//         </Suspense>
//       </body>
//     </html>
//   )
// }
