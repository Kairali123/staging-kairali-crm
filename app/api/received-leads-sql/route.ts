import { NextResponse } from "next/server";

// Consolidated into /api/received-leads — redirect for backward compatibility
export async function GET(request: Request) {
    const url = new URL(request.url);
    const params = url.searchParams.toString();
    return NextResponse.redirect(
        new URL(`/api/received-leads${params ? `?${params}` : ""}`, request.url)
    );
}