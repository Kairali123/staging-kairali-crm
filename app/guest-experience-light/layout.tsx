import type React from "react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Welcome to Kairali",
  description: "Guest Experience Application",
  manifest: "/manifest.json",
  icons: {
    apple: "/riya-sharma-qr.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kairali Guest",
  },
}

export default function GuestExperienceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1E1]">
      <main className="flex-1 w-full mx-auto relative">
        {children}
      </main>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `,
        }}
      />
    </div>
  )
}
