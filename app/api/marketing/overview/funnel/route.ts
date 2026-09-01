import { NextResponse } from "next/server"
import { marketingVsSalesMockData } from "@/lib/marketing-vs-sales-mock"

export async function GET() {
  return NextResponse.json(marketingVsSalesMockData.overview.funnel)
}
