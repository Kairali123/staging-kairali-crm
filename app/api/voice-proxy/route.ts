import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, hasAdminRole, hasAnyPermission } from '@/lib/authz';

const SENT_VOICE_GAS_URL =
    "https://script.google.com/macros/s/AKfycbym45pQfgcyqKRHLMtMt3gc0KWMcfPiHYngBZuswB7frxb7t4BMfxlVG1zFbe50bMH0/exec";
const ALL_VOICE_GAS_URL =
    "https://script.google.com/macros/s/AKfycbyZgL_rJ8A_8snRTfecPOs4fWtYVHvU6735g1scUgwcil0S4JpUK2tILv6MQuDhQEeixg/exec";
const UPSTREAM_TIMEOUT_MS = 20_000;

class UpstreamTimeoutError extends Error {
    constructor() {
        super('Voice source timed out');
        this.name = 'UpstreamTimeoutError';
    }
}

async function fetchVoiceData(targetUrl: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const res = await fetch(targetUrl, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.error('[Voice Proxy] Target API returned status', res.status);
            return NextResponse.json({ success: false, error: `Target API returned ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            throw new UpstreamTimeoutError();
        }

        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

export async function GET(req: NextRequest) {
    const user = getSessionUser(req);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type_proxy'); // 'sent' or 'all'
    if (type !== 'sent' && type !== 'all') {
        return NextResponse.json({ success: false, error: 'Invalid type_proxy' }, { status: 400 });
    }

    const requiredPermission = type === 'sent' ? 'ai_voice_sent.view' : 'ai_voice_received.view';
    if (!hasAdminRole(user, 'lower') && !hasAnyPermission(user, [requiredPermission])) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Remove our proxy-specific param
    const forwardParams = new URLSearchParams(searchParams.toString());
    forwardParams.delete('type_proxy');

    const baseUrl = type === 'sent' ? SENT_VOICE_GAS_URL : ALL_VOICE_GAS_URL;

    try {
        const targetUrl = `${baseUrl}?${forwardParams.toString()}`;
        return await fetchVoiceData(targetUrl);
    } catch (err) {
        if (err instanceof UpstreamTimeoutError) {
            console.error('[Voice Proxy] Target API request timed out');
            return NextResponse.json({ success: false, error: 'Voice source timed out' }, { status: 504 });
        }

        console.error('[Voice Proxy] Proxy failed');
        return NextResponse.json({ success: false, error: 'Failed to fetch voice data' }, { status: 502 });
    }
}
