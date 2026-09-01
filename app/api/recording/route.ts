// app/api/recording/route.ts
// ─────────────────────────────────────────────────────────────
// AUDIO PROXY — streams IVR call recordings through the server
// Fixes: http→https mixed content, provider redirects, CORS,
// and links that only serve audio with specific headers.
// Player usage:  /api/recording?url=<encoded IVR Url>
// Supports Range requests so seek/scrub works in the player.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Only allow proxying to known IVR/recording hosts — add yours here.
// Keep this list tight; an open proxy is a security risk.
const ALLOWED_HOSTS: RegExp[] = [
    /(^|\.)servetel\.in$/i,
    /(^|\.)tatateleservices\.com$/i,
    /(^|\.)smartflo\.tatatele\.com$/i,
    /(^|\.)exotel\.com$/i,
    /(^|\.)exotel\.in$/i,
    /(^|\.)myoperator\.co$/i,
    /(^|\.)knowlarity\.com$/i,
    /(^|\.)kaleyra\.com$/i,
    /(^|\.)googleapis\.com$/i,
    /(^|\.)google\.com$/i,
    /(^|\.)googleusercontent\.com$/i,
    /(^|\.)amazonaws\.com$/i,
    /(^|\.)cloudfront\.net$/i,
];

function isAllowed(host: string) {
    return ALLOWED_HOSTS.some(rx => rx.test(host));
}

// Time budget for the upstream response headers. The body streams afterwards
// without a timer, so a long recording isn't cut off mid-playback.
const UPSTREAM_TIMEOUT_MS = 20_000;

export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get("url")?.trim();
    if (!raw) {
        return NextResponse.json({ error: "Missing url param" }, { status: 400 });
    }

    let target: URL;
    try {
        target = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    } catch {
        return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (!isAllowed(target.hostname)) {
        return NextResponse.json(
            { error: `Host not allowed: ${target.hostname}. Add it to ALLOWED_HOSTS.` },
            { status: 403 },
        );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        // Forward Range header so the audio element can seek
        const range = req.headers.get("range");
        const upstream = await fetch(target.toString(), {
            headers: {
                ...(range ? { Range: range } : {}),
                "User-Agent": "Mozilla/5.0 (KairaliCRM AudioProxy)",
                Accept: "audio/*,*/*;q=0.8",
            },
            redirect: "follow",
            cache: "no-store",
            signal: controller.signal,
        });

        if (!upstream.ok && upstream.status !== 206) {
            return NextResponse.json(
                { error: `Upstream returned ${upstream.status}` },
                { status: 502 },
            );
        }

        const contentType = upstream.headers.get("content-type") || "";

        // If the provider returned an HTML page instead of audio,
        // inline playback is impossible — tell the client cleanly.
        if (contentType.includes("text/html")) {
            return NextResponse.json(
                { error: "URL is a webpage, not an audio file" },
                { status: 415 },
            );
        }

        const headers = new Headers();
        headers.set("Content-Type", contentType || "audio/mpeg");
        const passThrough = ["content-length", "content-range", "accept-ranges"];
        passThrough.forEach(h => {
            const v = upstream.headers.get(h);
            if (v) headers.set(h, v);
        });
        // Cache recordings for a day — they never change once created
        headers.set("Cache-Control", "private, max-age=86400");

        return new NextResponse(upstream.body, {
            status: upstream.status, // 200 or 206 (partial for range)
            headers,
        });
    } catch (err) {
        // Log the error class and host only — the full url can carry signed
        // query tokens, and the raw error may echo them back in its message.
        const kind = err instanceof Error ? err.name : "UnknownError";
        const timedOut = kind === "AbortError" || kind === "TimeoutError";
        console.error(
            `[recording-proxy] upstream request ${timedOut ? "timed out" : "failed"} for ${target.hostname} (${kind})`,
        );
        return NextResponse.json({ error: "Failed to fetch recording" }, { status: 502 });
    } finally {
        // Cleared as soon as the headers are in, so the timer can never abort
        // the response body while it is still streaming to the player.
        clearTimeout(timer);
    }
}
