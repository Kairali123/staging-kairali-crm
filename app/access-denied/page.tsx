'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function AccessDeniedPage() {
  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-slate-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full border border-red-200">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Access Denied
        </h1>
        
        <p className="text-slate-600 text-center mb-4">
          You don't have permission to view this page. If you believe this is a mistake, please contact your administrator.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-6">
          <p className="text-sm text-red-700">
            <strong>Note:</strong> Your user role has restricted access to certain pages.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/" className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Go Home
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleGoBack}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
