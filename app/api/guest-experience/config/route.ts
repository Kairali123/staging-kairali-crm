import { NextRequest, NextResponse } from "next/server"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const CONFIG_FILE = join(process.cwd(), "data", "guest-kiosk-config.json")

const DEFAULT_CONFIG = {
  guestName: "",
  roomNumber: "",
  checkIn: "",
  checkOut: "",
  welcomeMessage: "",
  activeTheme: "dark", // "dark" | "light"
  enabledSlides: [1, 2, 3, 4, 5, 6, 7, 8],
  defaultLanguage: "EN",
  kioskLabel: "Reception Lobby",
  lastUpdated: new Date().toISOString(),
}

function readConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"))
    }
  } catch {}
  return DEFAULT_CONFIG
}

function writeConfig(data: typeof DEFAULT_CONFIG) {
  try {
    const { mkdirSync } = require("fs")
    mkdirSync(join(process.cwd(), "data"), { recursive: true })
    writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Could not write config:", err)
  }
}

export async function GET() {
  const config = readConfig()
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = readConfig()
    const updated = { ...existing, ...body, lastUpdated: new Date().toISOString() }
    writeConfig(updated)
    return NextResponse.json({ success: true, config: updated })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
