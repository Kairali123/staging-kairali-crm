// Resolving which KTAHV_CRR_Calling_FMS row backs a given UI stage. Shared by the
// bookings route (full page load) and the stage-status route (Processing poll), so
// both agree on which row a stage is waiting on.

export interface CallingRowLike {
    uid?: string | null;
    stage_key?: string | null;
    call_purpose?: string | null;
    to_show?: unknown;
}

export interface CallingRowIndex<T extends CallingRowLike> {
    byStageKey: Map<string, T>;
    byUid: Map<string, T[]>;
}

// Keyword fallbacks per stage, for legacy rows written before stage_key existed.
export const STAGE_PURPOSE_KEYWORDS: Record<number, string[]> = {
    1: ["Welcome Call"],
    5: ["Rating Request", "rating", "review request"],
    6: ["Call after landing", "Safe Return", "Time to Return"],
    7: ["Result and Progress Since Return", "Result and Progress"],
};

// Stages backed by KTAHV_CRR_Calling_FMS rows; 9/10/11 live on the tracker tables.
export const CALLING_STAGES = [1, 5, 6, 7];

// MySQL hands `to_show` back as a boolean, 1/0, or the strings "true"/"1"
// depending on the column type, so every reader normalises the same way.
export function parseToShow(val: unknown): boolean {
    if (val === true || val === 1) return true;
    if (typeof val === "string") {
        const lower = val.trim().toLowerCase();
        return lower === "true" || lower === "1";
    }
    return false;
}

export function indexCallingRows<T extends CallingRowLike>(rows: T[]): CallingRowIndex<T> {
    const byStageKey = new Map<string, T>();
    const byUid = new Map<string, T[]>();
    for (const row of rows) {
        const sk = String(row.stage_key ?? "").trim().toLowerCase();
        if (sk) byStageKey.set(sk, row); // last match wins (callers order by id ASC)
        const uid = String(row.uid ?? "").trim();
        if (uid) {
            if (!byUid.has(uid)) byUid.set(uid, []);
            byUid.get(uid)!.push(row);
        }
    }
    return { byStageKey, byUid };
}

// Priority 1: the stage_key column (`${uid}_Stage${n}`, case-insensitive).
// Priority 2: call_purpose keywords, but never stealing a row that names another stage.
export function findCallingRowForStage<T extends CallingRowLike>(
    index: CallingRowIndex<T>,
    uid: string,
    stageNum: number,
    fallbackKeywords: string[] = STAGE_PURPOSE_KEYWORDS[stageNum] ?? []
): T | null {
    const trimmedUid = String(uid || "").trim();
    if (!trimmedUid) return null;

    const targetKey = `${trimmedUid.toLowerCase()}_stage${stageNum}`;
    const direct = index.byStageKey.get(targetKey);
    if (direct) return direct;

    const list = index.byUid.get(trimmedUid) || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const itemKey = String(list[i].stage_key ?? "").trim().toLowerCase();
        if (itemKey && (itemKey === targetKey || itemKey === `stage${stageNum}`)) return list[i];
    }

    for (const kw of fallbackKeywords) {
        const kwLower = kw.toLowerCase();
        for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            const itemKey = String(item.stage_key ?? "").trim().toLowerCase();
            if (itemKey && itemKey !== targetKey && itemKey !== `stage${stageNum}`) {
                continue; // row belongs to a different stage, do not steal it
            }
            if (String(item.call_purpose ?? "").toLowerCase().includes(kwLower)) return item;
        }
    }

    return null;
}
