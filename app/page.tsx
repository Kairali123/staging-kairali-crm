"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Building2, Mail, Lock, LogIn, AlertCircle } from "lucide-react"

function loginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""

  if (message === "Invalid credentials or inactive account") {
    return "Invalid email or password. Please try again."
  }

  if (message === "Login service timed out") {
    return "Login service timed out. Please try again in a moment."
  }

  if (message === "Login service unavailable" || message === "Login failed") {
    return "Login service is unavailable right now. Please try again in a moment."
  }

  return "Unable to sign in right now. Please try again."
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { login } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const company = email.includes("@kappl.com") ? "KAPPL" : "KTAHV"
      await login(email, password, company)
      router.replace("/dashboard")
    } catch (error) {
      console.error("Login failed:", error)
      setError(loginErrorMessage(error))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 flex items-center justify-center px-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="mx-auto w-[170px] sm:w-[190px] mb-2">
            <img
              src="/logo1.png"
              alt="Kairali Logo"
              className="w-full object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1 sm:mt-0">
            Kairali CRM System
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Unified Management Platform</p>
        </div>

        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center justify-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Employee Portal
            </CardTitle>
            <CardDescription className="text-gray-600">
              Access KAPPL, KTAHV & VILLARAAG systems with your credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@kappl.com or @ktahv.com"
                  className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
                <p className="text-xs text-gray-500">Company will be auto-detected from your email domain</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-emerald-800 hover:bg-emerald-900 text-white font-medium shadow-lg transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In to CRM
                  </div>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-1 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  KAPPL
                </div>
                <div className="flex items-center gap-1 text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                  KTAHV
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#a67900] rounded-full"></div>
                  <span className="text-[#a67900] font-medium">VILLA RAAG</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-gray-500">© 2026 Kairali Group. All rights reserved.</div>
      </div>
    </div>
  )
}


// "use client"

// import type React from "react"
// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { useRouter } from "next/navigation"
// import { useAuth } from "@/hooks/use-auth"
// import { Building2, Mail, Lock, LogIn, AlertCircle } from "lucide-react"

// export default function LoginPage() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState("")
//   const router = useRouter()
//   const { login } = useAuth()

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)
//     setError("")

//     try {
//       const company = email.includes("@kappl.com") ? "KAPPL" : "KTAHV"
//       await login(email, password, company)
//       router.replace("/dashboard")
//     } catch (error) {
//       console.error("Login failed:", error)
//       setError("Invalid email or password. Please try again.")
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-[100svh] bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 flex items-center justify-center px-3 sm:p-4">
//       <div className="w-full max-w-md">
//         <div className="text-center mb-5">
//           <div className="mx-auto w-[170px] sm:w-[190px] mb-2">
//             <img
//               src="/logo1.png"
//               alt="Kairali Logo"
//               className="w-full object-contain"
//             />
//           </div>
//           <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1 sm:mt-0">
//             Kairali CRM System
//           </h1>
//           <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Unified Management Platform</p>
//         </div>

//         <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
//           <CardHeader className="text-center pb-4">
//             <CardTitle className="text-xl font-semibold text-gray-800 flex items-center justify-center gap-2">
//               <Building2 className="w-5 h-5 text-emerald-600" />
//               Employee Portal
//             </CardTitle>
//             <CardDescription className="text-gray-600">
//               Access KAPPL, KTAHV & VILLARAAG systems with your credentials
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             <form onSubmit={handleLogin} className="space-y-5">
//               <div className="space-y-2">
//                 <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
//                   <Mail className="w-4 h-4 text-emerald-600" />
//                   Email Address
//                 </Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="your.name@kappl.com or @ktahv.com"
//                   className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
//                   required
//                 />
//                 <p className="text-xs text-gray-500">Company will be auto-detected from your email domain</p>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
//                   <Lock className="w-4 h-4 text-emerald-600" />
//                   Password
//                 </Label>
//                 <Input
//                   id="password"
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder="Enter your password"
//                   className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
//                   required
//                 />
//               </div>

//               {error && (
//                 <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
//                   <AlertCircle className="w-4 h-4 shrink-0" />
//                   {error}
//                 </div>
//               )}

//               <Button
//                 type="submit"
//                 className="w-full h-11 bg-emerald-800 hover:bg-emerald-900 text-white font-medium shadow-lg transition-all duration-200"
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                     Signing in...
//                   </div>
//                 ) : (
//                   <div className="flex items-center gap-2">
//                     <LogIn className="w-4 h-4" />
//                     Sign In to CRM
//                   </div>
//                 )}
//               </Button>
//             </form>

//             <div className="pt-4 border-t border-gray-100">
//               <div className="flex justify-center gap-6 text-xs text-gray-500">
//                 <div className="flex items-center gap-1 text-blue-600">
//                   <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
//                   KAPPL
//                 </div>
//                 <div className="flex items-center gap-1 text-emerald-600">
//                   <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
//                   KTAHV
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <div className="w-2 h-2 bg-[#a67900] rounded-full"></div>
//                   <span className="text-[#a67900] font-medium">VILLA RAAG</span>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <div className="text-center mt-6 text-xs text-gray-500">© 2026 Kairali Group. All rights reserved.</div>
//       </div>
//     </div>
//   )
// }
