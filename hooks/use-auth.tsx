// "use client"

// import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
// import { toast } from "sonner"

// export type UserRole =
//   | "super_admin"
//   | "admin"
//   | "general_manager"
//   | "department_head"
//   | "sales_manager"
//   | "sales_agent"
//   | "operation_manager"
//   | "operation_staff"
//   | "account_manager"
//   | "account_staff"
//   | "doctor"
//   | "front_office"
//   | "hr_manager"
//   | "villa_raag_manager"

// export type Department =
//   | "Administration"
//   | "Sales"
//   | "Operations"
//   | "Accounts"
//   | "Medical"
//   | "Front Office"
//   | "HR"
//   | "IT"

// export interface User {
//   id: string
//   email: string
//   name: string
//   role: UserRole
//   department: Department
//   company: "KAPPL" | "KTAHV"
//   permissions: string[]
//   employeeId: string
//   phone: string
//   joinDate: string
//   isActive: boolean
//   reportingTo?: string
//   shift?: "morning" | "evening" | "night"
//   targets?: {
//     daily?: number
//     weekly?: number
//     monthly?: number
//   }
//   action?: Record<string, string>
// }

// interface AuthContextType {
//   user: User | null
//   login: (email: string, password: string, company: string) => Promise<void>
//   logout: () => Promise<void>
//   hasPermission: (permission: string) => boolean
//   hasActionPermission: (page: string, action: string) => boolean
//   isLoading: boolean
//   getAllUsers: () => User[]
//   createUser: (userData: Omit<User, "id">) => Promise<void>
//   updateUser: (id: string, userData: Partial<User>) => Promise<void>
//   deleteUser: (id: string) => Promise<void>
//   rolePermissions: Record<string, string[]>
//   refreshPermissions: () => Promise<void>
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined)

// //"approvalAll", "collectionAll",
// // Action permissions configuration
// const actionPermissionsByPageByRole: Record<string, Record<string, string[]>> = {
//   ktahvPage: {
//     sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf","arrivalFlightSelf", "departureFlightSelf"],
//     sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf","arrivalFlightSelf", "departureFlightSelf"],
//     account_manager: ["viewAll", "accountsVerify"],
//     operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
//     fo_manager: ["viewAll", "collectionAll", "checkOutVerify"],
//     superVisor: ["viewAll"],
//   },
//   villaRaagPage: {
//     sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
//     sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
//     account_manager: ["viewAll", "accountsVerify"],
//     operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
//     villa_raag_manager: ["viewAll", "editAll", "manageAll"],
//   },
//   kapplPage: {
//     sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
//     sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
//     account_manager: ["viewAll", "accountsVerify"],
//     operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
//   },
// }

// // Fallback permissions (used if API fails)
// const fallbackRolePermissions: Record<string, string[]> = {
//   super_admin: ["all"],
//   admin: [
//     "users.view", "users.create", "users.edit", "users.delete",
//     "leads.view", "leads.edit", "leads.assign", "leads.delete",
//     "calls.view", "calls.make", "calls.monitor",
//     "reports.view", "reports.export", "reports.admin",
//     "fms.view", "fms.edit", "fms.admin",
//     "helpdesk.view", "helpdesk.admin",
//     "performance.view", "performance.admin",
//     "marketing.view", "marketing.admin",
//     "employee.tools",
//   ],
//   general_manager: [
//     "leads.view", "leads.assign",
//     "calls.monitor",
//     "reports.view", "reports.export",
//     "fms.view", "fms.approve",
//     "performance.view",
//     "escalations.handle",
//     "marketing.view",
//     "employee.tools",
//   ],
//   department_head: [
//     "leads.view", "leads.assign",
//     "calls.monitor",
//     "reports.view",
//     "fms.view", "fms.approve",
//     "performance.view",
//     "team.manage",
//     "marketing.view",
//     "employee.tools",
//   ],
//   sales_manager: [
//     "dashboard.view",
//     "leads.view", "leads.edit", "leads.assign",
//     "calls.view", "calls.make", "calls.monitor",
//     "reports.view",
//     "performance.view",
//     "team.manage",
//     "marketing.view",
//     "employee.tools",
//   ],
//   sales_agent: [
//     "dashboard.view",
//     "leads.view", "leads.edit",
//     "calls.make",
//     "reports.view",
//     "performance.view",
//     "employee.tools",
//     "fms.view",
//     "team.view",
//     "bookings.view",
//   ],
//   operation_manager: [
//     "fms.view", "fms.edit", "fms.approve",
//     "bookings.view", "bookings.edit",
//     "reports.view",
//     "performance.view",
//     "team.manage",
//     "employee.tools",
//   ],
//   operation_staff: [
//     "dashboard.view",
//     "fms.view", "fms.edit",
//     "performance.view",
//     "bookings.view",
//     "reports.view",
//     "employee.tools",
//     "team.view",
//   ],
//   account_manager: [
//     "payments.view", "payments.edit",
//     "invoices.view", "invoices.create",
//     "reports.view",
//     "performance.view",
//     "team.manage",
//     "employee.tools",
//   ],
//   account_staff: [
//     "dashboard.view",
//     "fms.view",
//     "payments.view", "payments.edit",
//     "invoices.view",
//     "reports.view",
//     "employee.tools",
//     "bookings.view",
//     "team.view",
//   ],
//   doctor: [
//     "consultations.view", "consultations.edit",
//     "prescriptions.create",
//     "reports.view",
//     "employee.tools",
//   ],
//   front_office: [
//     "bookings.view", "bookings.edit",
//     "guests.view",
//     "reports.view",
//     "employee.tools",
//   ],
//   hr_manager: [
//     "users.view", "users.create", "users.edit",
//     "performance.view",
//     "reports.view",
//     "team.manage",
//     "marketing.view",
//     "employee.tools",
//   ],
//   villa_raag_manager: [
//     "dashboard.view",
//     "villa_raag.view", "villa_raag.edit", "villa_raag.manage",
//     "fms.view",
//   ],
// }

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null)
//   const [isLoading, setIsLoading] = useState(true)
//   const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(fallbackRolePermissions)
//   const [users, setUsers] = useState<User[]>([])

//   // Load role permissions through the same-origin route. The Apps Script
//   // deployment URL and the getRolePermissions request now live server-side in
//   // /api/auth/permissions, so neither is in the browser bundle. Same values,
//   // same caching, same fallback — only the transport changed.
//   const loadRolePermissions = async () => {
//     try {
//       const response = await fetch("/api/auth/permissions", {
//         cache: "no-store",
//         headers: { "Cache-Control": "no-store" },
//       })
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       // The explicit content-type check the direct Apps Script fetch needed is
//       // gone: this route always answers JSON, and anything unparseable throws
//       // out of .json() into the same catch that the TypeError reached.
//       const data = await response.json()

//       if (data.success && data.rolePermissions) {
//         setRolePermissions(data.rolePermissions)

//         // Cache the permissions
//         localStorage.setItem("cached_role_permissions", JSON.stringify({
//           data: data.rolePermissions,
//           timestamp: Date.now()
//         }))

//         return data.rolePermissions
//       } else {
//         console.warn("⚠️ Failed to load permissions from sheet, using fallback")
//         return fallbackRolePermissions
//       }
//     } catch (error) {
//       console.error("❌ Error loading role permissions:", error)
//       return fallbackRolePermissions
//     }
//   }

//   // Refresh permissions manually
//   const refreshPermissions = async () => {
//     const newPermissions = await loadRolePermissions()

//     // If user is logged in, update their permissions
//     if (user && user.email) {
//       const updatedUser = {
//         ...user,
//         permissions: newPermissions[user.email] || user.permissions
//       }
//       setUser(updatedUser)
//       localStorage.setItem("kairali_user", JSON.stringify(updatedUser))
//       toast.success("Permissions updated")
//     }
//   }

//   // Initialize: Load permissions and user
//   useEffect(() => {
//     const initAuth = async () => {
//       // Try to load cached permissions first (faster)
//       const cached = localStorage.getItem("cached_role_permissions")
//       if (cached) {
//         try {
//           const { data, timestamp } = JSON.parse(cached)
//           const cacheAge = Date.now() - timestamp
//           const ONE_HOUR = 60 * 60 * 1000

//           if (cacheAge < ONE_HOUR) {
//             setRolePermissions(data)
//           }
//         } catch (e) {
//           console.warn("⚠️ Failed to parse cached permissions")
//         }
//       }

//       // Load fresh permissions in background
//       loadRolePermissions()

//       // Establish the user from the signed HttpOnly session, never from
//       // localStorage. The local copy is writable by anyone with devtools, so
//       // reading it back would let a tampered record become the app's idea of
//       // who is signed in. /api/auth/me re-derives identity from the cookie
//       // signature on every reload; any failure to prove a session leaves the
//       // user null and drops the stale local copy.
//       try {
//         const response = await fetch("/api/auth/me", {
//           cache: "no-store",
//           headers: { "Cache-Control": "no-store" },
//         })

//         // 401 (no/forged/expired session) and any other non-OK status are the
//         // same answer here: no established identity.
//         if (!response.ok) throw new Error("No active session")

//         const data = await response.json()

//         // A reply we don't recognise is not an identity, however it failed.
//         if (data?.success !== true || !data.user || typeof data.user !== "object" || Array.isArray(data.user)) {
//           throw new Error("Malformed session response")
//         }

//         const sessionUser: User = data.user
//         // Same harmless fallback login applies, so hasActionPermission can read
//         // user.action without a guard on legacy records that predate the field.
//         sessionUser.action = sessionUser.action || {}

//         setUser(sessionUser)
//         // Compatibility cache only: legacy components still read this key
//         // directly. It is written from the verified session, never read back to
//         // decide who the user is.
//         localStorage.setItem("kairali_user", JSON.stringify(sessionUser))
//       } catch {
//         // No session, an unreadable reply, or a failed request — all end the
//         // same way. Fixed handling: the error itself is never logged.
//         setUser(null)
//         localStorage.removeItem("kairali_user")
//       } finally {
//         setIsLoading(false)
//       }
//     }

//     initAuth()
//   }, [])

//   const login = async (email: string, password: string, company: string) => {
//     try {
//       const response = await fetch("/api/auth/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, password, company }),
//       })

//       const data = await response.json()

//       if (data.success && data.user) {
//         // Trust the server's permission set. /api/auth/login now resolves the
//         // role-permissions sheet before signing the session cookie and returns
//         // the very object it signed, so this is already the sheet's array for
//         // this account when the sheet had one. Re-applying the client's own
//         // `rolePermissions` state here could only substitute a
//         // `cached_role_permissions` copy up to an hour stale for the value that
//         // is actually in the cookie — and the cookie's set is what the next
//         // reload restores through /api/auth/me. That was the last local
//         // producer of a login-versus-reload divergence
//         // (docs/PHASE_8_RBAC_AUTHORIZATION_MATRIX.md M1/M2, rollout step 5).
//         //
//         // Anything that is not an array is not a permission set: `hasPermission`
//         // reads this with `.includes(...)`, so a missing or wrongly typed value
//         // becomes [] — grants nothing, throws nothing.
//         data.user.permissions = Array.isArray(data.user.permissions) ? data.user.permissions : []

//         data.user.action = data.user.action || {}

//         setUser(data.user)
//         localStorage.setItem("kairali_user", JSON.stringify(data.user))
//         // Session cookie is set server-side (HttpOnly) by /api/auth/login — see lib/session.ts

//         toast.success("Login successful")
//       } else {
//         throw new Error(data.message || "Invalid credentials or inactive account")
//       }
//     } catch (error: any) {
//       console.error("Login error:", error)

//       // ✅ User-friendly error message
//       toast.error(
//         error?.message === "Invalid credentials or inactive account"
//           ? "You have entered wrong Id / Password"
//           : error?.message || "Login failed"
//       )

//       throw error
//     }

//   }

//   const logout = async () => {
//     // HttpOnly session cookie can't be cleared by client JS — clear it server-side first.
//     try {
//       await fetch("/api/auth/logout", { method: "POST" })
//     } catch (e) {
//       console.error("Logout API call failed:", e)
//     }
//     setUser(null)
//     localStorage.removeItem("kairali_user")
//     toast.success("Logged out successfully")
//   }

//   const hasPermission = (permission: string) => {
//     if (!user) return false

//     // Super admin has all permissions
//     if (user.permissions.includes("all")) return true

//     // Check if user has the specific permission
//     return user.permissions.includes(permission)
//   }

//   const hasActionPermission = (page: string, action: string): boolean => {
//     if (!user || !user.action) return false

//     // Get the roles for this page (can be comma-separated)
//     const pageRolesString = user.action[page]
//     if (!pageRolesString) return false

//     // Split by comma and trim whitespace
//     const pageRoles = pageRolesString.indexOf(",") !== -1
//       ? pageRolesString.split(',').map(role => role.trim())
//       : [pageRolesString.trim()]

//     // Get the page permissions configuration
//     const pagePermissions = actionPermissionsByPageByRole[page as keyof typeof actionPermissionsByPageByRole]
//     if (!pagePermissions) return false

//     // Check if ANY of the user's roles for this page have the required permission
//     return pageRoles.some(role => {
//       const rolePermissionsForPage = pagePermissions[role as keyof typeof pagePermissions]
//       return rolePermissionsForPage && rolePermissionsForPage.includes(action)
//     })
//   }

//   const getAllUsers = () => {
//     return users.filter((u) => user?.company === u.company || user?.permissions.includes("all"))
//   }

//   const createUser = async (userData: Omit<User, "id">) => {
//     const newUser: User = {
//       ...userData,
//       id: Date.now().toString(),
//       permissions: rolePermissions[userData.email] || [],
//     }
//     setUsers((prev) => [...prev, newUser])
//     toast.success("User created successfully")
//   }

//   const updateUser = async (id: string, userData: Partial<User>) => {
//     setUsers((prev) =>
//       prev.map((u) =>
//         u.id === id
//           ? {
//             ...u,
//             ...userData,
//             permissions: userData.email ? rolePermissions[userData.email] : u.permissions
//           }
//           : u,
//       ),
//     )
//     toast.success("User updated successfully")
//   }

//   const deleteUser = async (id: string) => {
//     setUsers((prev) => prev.filter((u) => u.id !== id))
//     toast.success("User deleted successfully")
//   }

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         login,
//         logout,
//         hasPermission,
//         hasActionPermission,
//         isLoading,
//         getAllUsers,
//         createUser,
//         updateUser,
//         deleteUser,
//         rolePermissions,
//         refreshPermissions,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   )
// }

// export function useAuth() {
//   const context = useContext(AuthContext)
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider")
//   }
//   return context
// }

"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { toast } from "sonner"

export type UserRole =
  | "super_admin"
  | "admin"
  | "general_manager"
  | "department_head"
  | "sales_manager"
  | "sales_agent"
  | "operation_manager"
  | "operation_staff"
  | "account_manager"
  | "account_staff"
  | "doctor"
  | "front_office"
  | "hr_manager"
  | "villa_raag_manager"

export type Department =
  | "Administration"
  | "Sales"
  | "Operations"
  | "Accounts"
  | "Medical"
  | "Front Office"
  | "HR"
  | "IT"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  department: Department
  company: "KAPPL" | "KTAHV"
  permissions: string[]
  employeeId: string
  phone: string
  joinDate: string
  isActive: boolean
  reportingTo?: string
  shift?: "morning" | "evening" | "night"
  targets?: {
    daily?: number
    weekly?: number
    monthly?: number
  }
  action?: Record<string, string>
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, company: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasActionPermission: (page: string, action: string) => boolean
  isLoading: boolean
  getAllUsers: () => User[]
  createUser: (userData: Omit<User, "id">) => Promise<void>
  updateUser: (id: string, userData: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

//"approvalAll", "collectionAll",
// Action permissions configuration
const actionPermissionsByPageByRole: Record<string, Record<string, string[]>> = {
  ktahvPage: {
    sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf", "arrivalFlightSelf", "departureFlightSelf"],
    sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf", "arrivalFlightSelf", "departureFlightSelf"],
    account_manager: ["viewAll", "accountsVerify"],
    operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
    fo_manager: ["viewAll", "collectionAll", "checkOutVerify"],
    superVisor: ["viewAll"],
  },
  villaRaagPage: {
    sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    account_manager: ["viewAll", "accountsVerify"],
    operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
    villa_raag_manager: ["viewAll", "editAll", "manageAll"],
  },
  kapplPage: {
    sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    account_manager: ["viewAll", "accountsVerify"],
    operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])

  // Refresh only the authenticated user's permissions. The server also
  // re-signs the session cookie so the refreshed UI survives a reload.
  const refreshPermissions = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/auth/permissions", {
        method: "POST",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      })
      const data = await response.json()

      if (!response.ok || data?.success !== true || !data.user) {
        throw new Error(data?.error || "Unable to refresh permissions")
      }

      const updatedUser: User = data.user
      updatedUser.permissions = Array.isArray(updatedUser.permissions) ? updatedUser.permissions : []
      updatedUser.action = updatedUser.action || {}

      setUser(updatedUser)
      localStorage.setItem("kairali_user", JSON.stringify(updatedUser))
      toast.success("Permissions updated")
    } catch (error) {
      console.error("Permission refresh failed:", error)
      toast.error("Unable to refresh permissions")
    }
  }

  // Initialize from the signed session only. Permissions are resolved during
  // login and stored inside that session; no permission request is made before
  // login or during a normal reload.
  useEffect(() => {
    const initAuth = async () => {
      // Remove the obsolete full-table cache left by earlier versions.
      localStorage.removeItem("cached_role_permissions")

      // Establish the user from the signed HttpOnly session, never from
      // localStorage. The local copy is writable by anyone with devtools, so
      // reading it back would let a tampered record become the app's idea of
      // who is signed in. /api/auth/me re-derives identity from the cookie
      // signature on every reload; any failure to prove a session leaves the
      // user null and drops the stale local copy.
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        })

        // 401 (no/forged/expired session) and any other non-OK status are the
        // same answer here: no established identity.
        if (!response.ok) throw new Error("No active session")

        const data = await response.json()

        // A reply we don't recognise is not an identity, however it failed.
        if (data?.success !== true || !data.user || typeof data.user !== "object" || Array.isArray(data.user)) {
          throw new Error("Malformed session response")
        }

        const sessionUser: User = data.user
        // Same harmless fallback login applies, so hasActionPermission can read
        // user.action without a guard on legacy records that predate the field.
        sessionUser.action = sessionUser.action || {}

        setUser(sessionUser)
        // Compatibility cache only: legacy components still read this key
        // directly. It is written from the verified session, never read back to
        // decide who the user is.
        localStorage.setItem("kairali_user", JSON.stringify(sessionUser))
      } catch {
        // No session, an unreadable reply, or a failed request — all end the
        // same way. Fixed handling: the error itself is never logged.
        setUser(null)
        localStorage.removeItem("kairali_user")
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string, company: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, company }),
      })

      const contentType = response.headers.get("content-type") || ""
      const data = contentType.includes("application/json")
        ? await response.json()
        : null

      if (!response.ok) {
        throw new Error(data?.message || "Login service unavailable")
      }

      if (data.success && data.user) {
        // Login returns the same permission set it signs into the session.
        // Anything other than an array grants nothing on the client.
        data.user.permissions = Array.isArray(data.user.permissions) ? data.user.permissions : []

        data.user.action = data.user.action || {}

        setUser(data.user)
        localStorage.setItem("kairali_user", JSON.stringify(data.user))
        // Session cookie is set server-side (HttpOnly) by /api/auth/login — see lib/session.ts

        toast.success("Login successful")
      } else {
        throw new Error(data.message || "Invalid credentials or inactive account")
      }
    } catch (error: any) {
      console.error("Login error:", error)

      // ✅ User-friendly error message
      toast.error(
        error?.message === "Invalid credentials or inactive account"
          ? "You have entered wrong Id / Password"
          : error?.message || "Login failed"
      )

      throw error
    }

  }

  const logout = async () => {
    // HttpOnly session cookie can't be cleared by client JS — clear it server-side first.
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (e) {
      console.error("Logout API call failed:", e)
    }
    setUser(null)
    localStorage.removeItem("kairali_user")
    localStorage.removeItem("cached_role_permissions")
    toast.success("Logged out successfully")
  }

  const hasPermission = (permission: string) => {
    if (!user) return false

    // Super admin has all permissions
    if (user.permissions.includes("all")) return true

    // Check if user has the specific permission
    return user.permissions.includes(permission)
  }

  const hasActionPermission = (page: string, action: string): boolean => {
    if (!user || !user.action) return false

    // Get the roles for this page (can be comma-separated)
    const pageRolesString = user.action[page]
    if (!pageRolesString) return false

    // Split by comma and trim whitespace
    const pageRoles = pageRolesString.indexOf(",") !== -1
      ? pageRolesString.split(',').map(role => role.trim())
      : [pageRolesString.trim()]

    // Get the page permissions configuration
    const pagePermissions = actionPermissionsByPageByRole[page as keyof typeof actionPermissionsByPageByRole]
    if (!pagePermissions) return false

    // Check if ANY of the user's roles for this page have the required permission
    return pageRoles.some(role => {
      const rolePermissionsForPage = pagePermissions[role as keyof typeof pagePermissions]
      return rolePermissionsForPage && rolePermissionsForPage.includes(action)
    })
  }

  const getAllUsers = () => {
    return users.filter((u) => user?.company === u.company || user?.permissions.includes("all"))
  }

  const createUser = async (userData: Omit<User, "id">) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
    }
    setUsers((prev) => [...prev, newUser])
    toast.success("User created successfully")
  }

  const updateUser = async (id: string, userData: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
            ...u,
            ...userData,
            permissions: Array.isArray(userData.permissions) ? userData.permissions : u.permissions
          }
          : u,
      ),
    )
    toast.success("User updated successfully")
  }

  const deleteUser = async (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    toast.success("User deleted successfully")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        hasActionPermission,
        isLoading,
        getAllUsers,
        createUser,
        updateUser,
        deleteUser,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}