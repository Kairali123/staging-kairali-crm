import { NextRequest, NextResponse } from "next/server"
import { getSessionUserResult, hasAdminRole } from "@/lib/authz"
import { ensureIndexesExist } from "../db-init"

export async function POST(request: NextRequest) {
  try {
    const session = getSessionUserResult(request)

    if (session.state === "missing") {
      return NextResponse.json(
        { success: false, error: "Access denied: Not logged in" },
        { status: 401 }
      )
    }

    if (session.state === "invalid") {
      return NextResponse.json(
        { success: false, error: "Access denied: Invalid session" },
        { status: 401 }
      )
    }

    const user = session.user

    // Admin-only validation check (using CRM standard authz helpers)
    const isAdmin = hasAdminRole(user, "lower") || (user?.permissions && user.permissions.includes("all"))
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Access denied: Insufficient permissions" },
        { status: 403 }
      )
    }

    await ensureIndexesExist()

    return NextResponse.json({
      success: true,
      message: "Database indexes setup initiated/completed successfully."
    })
  } catch (error: any) {
    console.error("Index setup route failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
