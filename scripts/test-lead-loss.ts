/**
 * Direct test of the lead-loss GET handler bypassing auth middleware.
 * Run: npx tsx --env-file=.env.local scripts/test-lead-loss.ts
 */
import { GET } from "../app/api/lead-loss/route";

async function run() {
  console.log("Testing /api/lead-loss for 2026-10-14 ...\n");

  const req = new Request("http://localhost:3000/api/lead-loss?days=15");
  let res: Response;
  try {
    res = await GET(req);
  } catch (err: any) {
    console.error("GET threw an exception:", err?.message ?? err);
    process.exit(1);
  }

  const text = await res.text();

  if (!res.ok) {
    console.error("Non-OK response:", res.status, text.substring(0, 500));
    process.exit(1);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text.substring(0, 500));
    process.exit(1);
  }

  const list = json.rows ?? json.data ?? [];
  if (!Array.isArray(list)) {
    console.error("Unexpected shape — keys:", Object.keys(json));
    process.exit(1);
  }

  console.log(`Total rows returned: ${list.length}`);
  console.log("\n=== 14-Oct-2026 rows ===");
  const oct14 = list.filter((r: any) => r.date === "2026-10-14");
  if (oct14.length === 0) {
    console.warn("WARNING: no rows found for 2026-10-14!");
    const dates = [...new Set(list.map((r: any) => r.date))].sort();
    console.log("Dates present:", dates);
  } else {
    for (const r of oct14) {
      console.log(
        `${String(r.company).padEnd(35)} | ${String(r.source).padEnd(25)} | Direct:${String(r.direct ?? "-").padStart(3)} | Buf:${String(r.buffer ?? "-").padStart(3)} | CRM:${String(r.crm ?? "-").padStart(3)} | Gap1:${String(r.gap1 ?? "-").padStart(2)} | Gap2:${String(r.gap2 ?? "-").padStart(2)} | TAT:${r.avgTat ?? "-"}`
      );
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
