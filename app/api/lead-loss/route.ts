export const dynamic = "force-dynamic";
export const maxDuration = 300;

// A forced 31-day Google Sheets reconciliation currently takes about 4.5 minutes.
// Keep the bridge deadline just below the Vercel function ceiling so a fresh scan
// can complete, while normal dashboard loads are served by the compact GAS cache.
const BRIDGE_TIMEOUT_MS = 295_000;

type BridgePayload = {
  ok?: boolean;
  error?: string;
  schemaVersion?: number;
  logicVersion?: string;
  mode?: string;
  crmMode?: string;
  rows?: unknown[];
  scannedAt?: string;
  pipelineHealth?: unknown;
  currentSummary?: unknown;
  currentIssues?: unknown[];
  validation?: unknown;
};


const retryableStatus = new Set([404, 408, 429, 500, 502, 503, 504]);

export async function GET(request: Request) {
  const url = process.env.LEAD_LOSS_BRIDGE_URL ?? process.env.AUDIT_BRIDGE_URL; const secret = process.env.LEAD_LOSS_BRIDGE_SECRET ?? process.env.AUDIT_BRIDGE_SECRET;
  const requestUrl = new URL(request.url);
  const includeDetails = requestUrl.searchParams.get("details") === "1";
  const rowIds = requestUrl.searchParams.get("ids") ?? "";
  const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
  if ((!url || !secret) && process.env.NODE_ENV !== "production" && process.env.LEAD_LOSS_USE_PRODUCTION_FALLBACK === "1") {
    const previewUrl = new URL("https://leadguard-lead-lost-monitor.vercel.app/api/lead-loss");
    previewUrl.search = requestUrl.search;
    const response = await fetch(previewUrl, { cache: "no-store", signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS) });
    return new Response(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
  }
  let bridgeDiagnostic = url && secret ? "Bridge returned no usable rows" : "Bridge environment is not configured";
  if (url && secret) try {
    const bridgeUrl = new URL(url);
    bridgeUrl.searchParams.set("token", secret);
    bridgeUrl.searchParams.set("mode", "lead_loss");
    bridgeUrl.searchParams.set("days", "31");
    bridgeUrl.searchParams.set("compact", includeDetails ? "0" : "1");
    if (rowIds) bridgeUrl.searchParams.set("rowIds", rowIds);
    if (forceRefresh) bridgeUrl.searchParams.set("refresh", "1");
    const fetchBridge = async () => {
      const initial = await fetch(bridgeUrl, {
        method: "GET",
        headers: { accept: "application/json" },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
      });
      if (initial.status < 300 || initial.status >= 400) return initial;
      const location = initial.headers.get("location");
      if (!location) return initial;
      return fetch(location, { method: "GET", headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS) });
    };
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetchBridge();
      if(response.ok){
        const data=await response.json() as BridgePayload;
        if(data.ok&&data.rows?.length)return Response.json({live:true,schemaVersion:data.schemaVersion,logicVersion:data.logicVersion,mode:data.mode??"Live Google Sheets reconciliation",crmMode:data.crmMode,scannedAt:data.scannedAt??new Date().toISOString(),rows:data.rows,pipelineHealth:data.pipelineHealth,currentSummary:data.currentSummary,currentIssues:data.currentIssues??[],validation:data.validation});
        bridgeDiagnostic=data.error||`Bridge returned ${data.rows?.length??0} rows (keys: ${Object.keys(data).join(",")})`;
        break;
      }
      const responseUrl = new URL(response.url);
      bridgeDiagnostic=`Bridge HTTP ${response.status} at ${responseUrl.origin}${responseUrl.pathname}`;
      if (!retryableStatus.has(response.status) || attempt === 3) break;
      await new Promise(resolve => setTimeout(resolve, attempt * 400));
    }
  } catch (error) { bridgeDiagnostic=error instanceof Error ? error.name : "Bridge request failed"; }
  console.error("lead-loss-bridge", bridgeDiagnostic);
  return Response.json({
    live:false,
    mode:"Live source temporarily unavailable",
    diagnostic:process.env.NODE_ENV !== "production" && (!url || !secret) ? "Local bridge environment is not configured; production fallback is disabled so local code changes are not hidden." : bridgeDiagnostic,
    scannedAt:new Date().toISOString(),
    rows:[],
  },{status:503});
}
