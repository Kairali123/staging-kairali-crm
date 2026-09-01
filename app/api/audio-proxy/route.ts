// app/api/audio-proxy/route.ts
// ─────────────────────────────────────────────────────────────
// AUDIO PROXY — streams SquadIQ call recordings through the server.
// Player usage (unchanged):  /api/audio-proxy?url=<recording url>
// Requires a valid Kairali CRM session; /api/* is excluded from
// middleware.ts, so this route does its own session check.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookieValue } from "@/lib/session";

export const dynamic = "force-dynamic";

// Exact host only. A regex or endsWith check would also accept
// "evil-squadiq-call-recs.s3.amazonaws.com" or "…s3.amazonaws.com.attacker.tld".
const ALLOWED_HOST = "squadiq-call-recs.s3.amazonaws.com";

// Time budget for the upstream response headers. The body streams afterwards
// without a timer, so a long recording isn't cut off mid-playback.
const UPSTREAM_TIMEOUT_MS = 15_000;

// Returns the parsed target only if it is unambiguously the allowed bucket.
function parseAllowedTarget(raw: string): URL | null {
    let target: URL;
    try {
        target = new URL(raw);
    } catch {
        return null;
    }
    if (target.protocol !== "https:") return null;
    // Credentials in a URL are never legitimate here and are a classic way to
    // smuggle a different authority past a naive host check.
    if (target.username || target.password) return null;
    // URL already lowercases and punycode-normalizes the hostname.
    if (target.hostname !== ALLOWED_HOST) return null;
    if (target.port !== "") return null;
    return target;
}

export async function GET(req: NextRequest) {
    const sessionCookie = req.cookies.get("kairali_user")?.value;
    // Rejects missing, tampered, forged, and expired cookies.
    if (!sessionCookie || !verifySessionCookieValue(sessionCookie)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = req.nextUrl.searchParams.get("url")?.trim();
    if (!raw) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const target = parseAllowedTarget(raw);
    if (!target) {
        // Deliberately does not echo the rejected url back to the caller.
        return NextResponse.json({ error: "Invalid or disallowed url" }, { status: 400 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        // Forward Range so the audio element can seek.
        const range = req.headers.get("range");
        const upstream = await fetch(target.toString(), {
            headers: {
                ...(range ? { Range: range } : {}),
                Accept: "audio/*,*/*;q=0.8",
            },
            // Never follow a redirect off the allowlisted host.
            redirect: "manual",
            cache: "no-store",
            signal: controller.signal,
        });

        if (upstream.status >= 300 && upstream.status < 400) {
            return NextResponse.json({ error: "Failed to fetch recording" }, { status: 502 });
        }

        if (upstream.status !== 200 && upstream.status !== 206) {
            // Upstream status/body may carry bucket or credential detail — don't relay it.
            return NextResponse.json({ error: "Failed to fetch recording" }, { status: 502 });
        }

        // Only the headers the browser audio element needs; nothing else is relayed.
        const headers = new Headers();
        headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
        for (const name of ["content-length", "accept-ranges", "content-range"]) {
            const value = upstream.headers.get(name);
            if (value) headers.set(name, value);
        }
        // Authenticated audio must not land in a shared cache.
        headers.set("Cache-Control", "private, no-store");

        // Stream the body through instead of buffering the whole file in memory.
        return new NextResponse(upstream.body, {
            status: upstream.status, // 200, or 206 for a range request
            headers,
        });
    } catch (err) {
        // Log the error class only — never the url, cookie, or stack.
        const kind = err instanceof Error ? err.name : "UnknownError";
        if (kind === "AbortError" || kind === "TimeoutError") {
            console.error("[audio-proxy] upstream request timed out");
            return NextResponse.json({ error: "Upstream request timed out" }, { status: 504 });
        }
        console.error(`[audio-proxy] upstream request failed (${kind})`);
        return NextResponse.json({ error: "Failed to fetch recording" }, { status: 502 });
    } finally {
        clearTimeout(timer);
    }
}
