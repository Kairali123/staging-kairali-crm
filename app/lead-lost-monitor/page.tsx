"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import "./reconciliation.css";
import "./force-refresh.css";

type StageKey = "direct" | "medium" | "directMediumGap" | "duplicate" | "expectedDuplicateGap" | "bufferTransfer" | "mediumBufferGap" | "mediumBufferLost" | "gap" | "buffer" | "crm" | "sameDayCrm" | "lateTransfer" | "masterCrmLost" | "bufferCrmGap" | "bufferToCrmGap" | "assigned" | "sales" | "kserve";
type GapKey = "gap1" | "gap2" | "gap3";
type DeletedReasonKey = "all" | "id" | "phone" | "spam";
type LeadRecord = {
  id: string; name: string; phone: string; date: string; company: string; source: string; generatedAt: string; timestamp: string;
  email?: string;
  companyRaw?: string; directConfig?: string;
  transferTimestamp: string; bufferTimestamp: string; currentStatus: string; transferStatus: string; bufferStatus: string; crmStatus: string;
  assignee: string; tatMin: number; tat: string; isDuplicate: boolean; validDuplicate?: boolean; expectedDuplicateGap?: boolean; lateTransfer?: boolean; sameDayCrm?: boolean; mediumBufferLost?: boolean; masterCrmLost?: boolean; mediumBufferState?: string; masterCrmState?: string; inMedium: boolean; toBuffer: boolean; inBuffer: boolean; inCrm: boolean; assigned: boolean;
  stage: string; status: "Lost" | "Duplicate" | "Delayed" | "Resolved"; reason: string; directUrl?: string; destinationUrl?: string; crmUrl?: string;
  original?: { id: string; name?: string; phone?: string; email?: string; company?: string; source: string; generatedAt: string; assignee: string; matchBasis?: string; url?: string };
};
type TrackerRow = {
  id: string; date: string; company: string; source: string; directUrl?: string; finalUrl?: string; stageUrls?: Partial<Record<StageKey, string>>;
  gapRecordsIncluded?: boolean;
  direct: number; medium: number; directMediumGap: number; duplicate: number; expectedDuplicateGap: number; lateTransfer: number; masterCrmTotal?: number; bufferTransfer: number; mediumBufferGap: number; mediumBufferLost: number; unexplainedMediumGap?: number; gap: number; buffer: number; crm: number; sameDayCrm: number; masterCrmLost: number; bufferCrmGap: number; bufferToCrmGap: number; assigned: number; sales: number; kserve: number;
  avgTatMin: number; slaBreaches: number; mismatch: boolean; validationErrors: string[]; records: LeadRecord[]; issues: LeadRecord[];
};
type PipelineHealth = { checklistLastDate: string; masterLatestDate: string; trackingLagDays: number; stageTrackingCurrent: boolean; message: string };
type CurrentSummary = { date: string; crm: number; assigned: number; kserve: number; sales: number; unassigned: number; slaBreaches: number };
type DashboardPayload = { live: boolean; schemaVersion?: number; logicVersion?: string; mode: string; diagnostic?: string; crmMode?: string; scannedAt: string; rows: TrackerRow[]; pipelineHealth?: PipelineHealth; currentSummary?: CurrentSummary; currentIssues?: LeadRecord[]; validation?: { rows: number; mismatches: number; leadIds: number; unmappedCompanies?: number; unmappedLeadIds?: string[] } };

const labels: Record<StageKey, string> = { direct: "Direct API Sheet Count", medium: "Master Medium Sheet", directMediumGap: "Actual Lost Direct API–Medium", duplicate: "Valid Duplicate Proof", expectedDuplicateGap: "Expected Duplicate Gap", bufferTransfer: "Transfer Decision: Buffer", mediumBufferGap: "Actual Lost Medium–Buffer", mediumBufferLost: "Actual Lost Medium–Buffer", gap: "Actual Lost Medium–Buffer", buffer: "Actual Buffer Count", crm: "Actual CRM Count", sameDayCrm: "Same-Day CRM", lateTransfer: "Late Transfer", masterCrmLost: "Actual Lost Master–CRM", bufferCrmGap: "Actual Lost Master–CRM", bufferToCrmGap: "Actual Lost Master–CRM", assigned: "Sales / KServe", sales: "Transfer to Sales Person", kserve: "Transfer to Kserve" };
const pipelineKeys: StageKey[] = ["direct", "medium", "buffer", "crm", "assigned"];
const gapMeta: Record<GapKey, { label: string; flow: string; description: string }> = {
  gap1: { label: "Gap 1", flow: "Direct API → Medium", description: "Direct API leads that did not reach Master Medium." },
  gap2: { label: "Gap 2", flow: "Medium → Buffer", description: "Expected duplicate gaps plus genuinely missing Buffer leads." },
  gap3: { label: "Gap 3", flow: "Buffer → CRM", description: "Late CRM transfers plus leads with no CRM proof." },
};
const gapCount = (row: TrackerRow | ReturnType<typeof totalRows>, key: GapKey) => key === "gap1" ? row.directMediumGap : key === "gap2" ? row.expectedDuplicateGap + row.mediumBufferLost : row.lateTransfer + row.masterCrmLost;
const gapLostCount = (row: TrackerRow | ReturnType<typeof totalRows>, key: GapKey) => key === "gap1" ? row.directMediumGap : key === "gap2" ? row.mediumBufferLost : row.masterCrmLost;
const fmt = (n: number) => Number(n || 0).toLocaleString("en-IN");
const dateLabel = (value: string) => { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const normalizeRow = (row: TrackerRow): TrackerRow => ({
  ...row,
  records: row.records ?? row.issues ?? [],
  issues: row.issues ?? [],
  medium: row.medium ?? row.direct,
  directMediumGap: row.directMediumGap ?? Math.max(0, row.direct - (row.medium ?? row.direct)),
  expectedDuplicateGap: row.expectedDuplicateGap ?? row.duplicate ?? 0,
  mediumBufferLost: row.mediumBufferLost ?? row.mediumBufferGap ?? Math.max(0, (row.medium ?? row.direct) - row.buffer - (row.expectedDuplicateGap ?? row.duplicate ?? 0)),
  mediumBufferGap: row.mediumBufferLost ?? row.mediumBufferGap ?? 0,
  unexplainedMediumGap: row.mediumBufferLost ?? row.unexplainedMediumGap ?? row.mediumBufferGap ?? 0,
  sameDayCrm: row.sameDayCrm ?? Math.max(0, row.crm - (row.lateTransfer ?? 0)),
  lateTransfer: row.lateTransfer ?? 0,
  masterCrmLost: row.masterCrmLost ?? row.bufferToCrmGap ?? 0,
  bufferToCrmGap: row.masterCrmLost ?? row.bufferToCrmGap ?? 0,
  sales: row.sales ?? row.assigned,
  kserve: row.kserve ?? 0,
});
const lostReasonStatus = (lead: LeadRecord) => {
  const basis = lead.original?.matchBasis ?? "";
  if (basis === "Enquiry ID") return { tone: "enquiry", label: "Duplicate by Enquiry ID", flag: "VERIFIED DUPLICATE", detail: "The same Enquiry ID was already forwarded within the 24-hour reconciliation window." };
  if (basis.includes("Mobile Number")) return { tone: "mobile", label: "Duplicate by Mobile Number", flag: "VERIFIED DUPLICATE", detail: basis.includes("Email ID") ? "Mobile Number and Email ID both match an earlier forwarded lead within 24 hours." : "Mobile Number matches an earlier forwarded lead within 24 hours." };
  if (basis === "Email ID") return { tone: "email", label: "Duplicate by Email ID", flag: "VERIFIED DUPLICATE", detail: "Email ID matches an earlier forwarded lead within the 24-hour reconciliation window." };
  return { tone: "lost", label: "No Duplicate — It's Lost", flag: "HIGH ALERT", detail: "No earlier forwarded lead matched by Enquiry ID, Mobile Number or Email ID within 24 hours." };
};
const deletedReason = (lead: LeadRecord): { key: Exclude<DeletedReasonKey, "all">; label: string; detail: string } => {
  const evidence = `${lead.reason ?? ""} ${lead.currentStatus ?? ""} ${lead.transferStatus ?? ""} ${lead.bufferStatus ?? ""}`.toLowerCase();
  const basis = (lead.original?.matchBasis ?? "").toLowerCase();
  if (evidence.includes("spam")) return { key: "spam", label: "Spam", detail: "Deleted because the enquiry was classified as spam." };
  if (basis.includes("enquiry id") || basis === "id" || evidence.includes("duplicate by id") || evidence.includes("duplicate enquiry id")) return { key: "id", label: "Duplicate by ID", detail: "Deleted · ID already exists in CRM." };
  return { key: "phone", label: "Duplicate by phone · 24 hr", detail: "Deleted · phone was already assigned inside the 24-hour window." };
};
const hasDeleteProof = (lead: LeadRecord) => {
  const evidence = `${lead.status ?? ""} ${lead.reason ?? ""} ${lead.currentStatus ?? ""} ${lead.transferStatus ?? ""} ${lead.bufferStatus ?? ""}`.toLowerCase();
  return evidence.includes("spam") || evidence.includes("deleted") || evidence.includes("delete sheet");
};
const stageRecords = (records: LeadRecord[], key: StageKey) => ({
  direct: records,
  medium: records.filter(x => x.inMedium),
  directMediumGap: records.filter(x => !x.inMedium),
  duplicate: records.filter(x => x.validDuplicate ?? Boolean(x.original)),
  expectedDuplicateGap: records.filter(x => x.expectedDuplicateGap),
  bufferTransfer: records.filter(x => x.toBuffer),
  mediumBufferGap: records.filter(x => x.mediumBufferLost),
  mediumBufferLost: records.filter(x => x.mediumBufferLost),
  gap: records.filter(x => x.mediumBufferLost),
  buffer: records.filter(x => x.mediumBufferState === "Reconciled" || (!x.mediumBufferState && x.inBuffer)),
  crm: records.filter(x => x.masterCrmState === "Reconciled" || x.masterCrmState === "Late Transfer" || (!x.masterCrmState && x.inCrm)),
  sameDayCrm: records.filter(x => x.sameDayCrm),
  lateTransfer: records.filter(x => x.lateTransfer),
  masterCrmLost: records.filter(x => x.masterCrmLost),
  bufferCrmGap: records.filter(x => x.masterCrmLost),
  bufferToCrmGap: records.filter(x => x.masterCrmLost),
  assigned: records.filter(x => x.assigned),
  sales: records.filter(x => x.assigned && x.assignee.trim().toLowerCase() !== "kserve"),
  kserve: records.filter(x => x.assigned && x.assignee.trim().toLowerCase() === "kserve"),
}[key]);
const gapRecords = (records: LeadRecord[], key: GapKey) => key === "gap1"
  ? records.filter(x => !x.inMedium)
  : key === "gap2"
    ? records.filter(x => x.expectedDuplicateGap || x.mediumBufferLost)
    : records.filter(x => x.lateTransfer || x.masterCrmLost);
const auditClass = (lead: LeadRecord) => lead.lateTransfer || lead.masterCrmState === "Late Transfer"
  ? "transient"
  : lead.expectedDuplicateGap || lead.validDuplicate || Boolean(lead.original) || hasDeleteProof(lead)
    ? "deleted"
    : "unexplained";
const auditReasonLabel = (lead: LeadRecord) => auditClass(lead) === "transient"
  ? "Late Transfer"
  : auditClass(lead) === "deleted"
    ? deletedReason(lead).label
    : lostReasonStatus(lead).label;

const totalRows = (items: TrackerRow[]) => items.reduce((a, r) => ({
  direct: a.direct + r.direct,
  medium: a.medium + r.medium,
  directMediumGap: a.directMediumGap + r.directMediumGap,
  duplicate: a.duplicate + r.duplicate,
  expectedDuplicateGap: a.expectedDuplicateGap + r.expectedDuplicateGap,
  lateTransfer: a.lateTransfer + r.lateTransfer,
  bufferTransfer: a.bufferTransfer + r.bufferTransfer,
  mediumBufferGap: a.mediumBufferGap + r.mediumBufferGap,
  mediumBufferLost: a.mediumBufferLost + r.mediumBufferLost,
  unexplainedMediumGap: a.unexplainedMediumGap + (r.unexplainedMediumGap ?? 0),
  gap: a.gap + r.gap,
  buffer: a.buffer + r.buffer,
  crm: a.crm + r.crm,
  sameDayCrm: a.sameDayCrm + r.sameDayCrm,
  masterCrmLost: a.masterCrmLost + r.masterCrmLost,
  bufferCrmGap: a.bufferCrmGap + r.bufferCrmGap,
  bufferToCrmGap: a.bufferToCrmGap + r.bufferToCrmGap,
  assigned: a.assigned + r.assigned,
  sales: a.sales + r.sales,
  kserve: a.kserve + r.kserve,
  slaBreaches: a.slaBreaches + r.slaBreaches,
  mismatches: a.mismatches + Number(r.mismatch),
  tatSum: a.tatSum + r.avgTatMin * r.buffer,
  tatWeight: a.tatWeight + r.buffer,
}), { direct: 0, medium: 0, directMediumGap: 0, duplicate: 0, expectedDuplicateGap: 0, lateTransfer: 0, bufferTransfer: 0, mediumBufferGap: 0, mediumBufferLost: 0, unexplainedMediumGap: 0, gap: 0, buffer: 0, crm: 0, sameDayCrm: 0, masterCrmLost: 0, bufferCrmGap: 0, bufferToCrmGap: 0, assigned: 0, sales: 0, kserve: 0, slaBreaches: 0, mismatches: 0, tatSum: 0, tatWeight: 0 });

export default function Home() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("All companies");
  const [source, setSource] = useState("All sources");
  const [date, setDate] = useState("All dates");
  const [health, setHealth] = useState("All status");
  const [sort, setSort] = useState("Highest loss");
  const [selected, setSelected] = useState<{ title: string; leads: LeadRecord[]; sheetUrl?: string; variant?: "drawer" | "lost-map"; gap?: GapKey } | null>(null);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [detailRows, setDetailRows] = useState<TrackerRow[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [openAuditSections, setOpenAuditSections] = useState<Set<string>>(new Set(["unexplained"]));
  const [expandedAuditLead, setExpandedAuditLead] = useState<string | null>(null);
  const [deletedReasonFilter, setDeletedReasonFilter] = useState<DeletedReasonKey>("all");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const load = async (force = false) => {
    setLoading(true);
    setForceRefreshing(force);
    setDetailRows(null);
    try {
      const response = await fetch(force ? "/api/lead-loss?refresh=1" : "/api/lead-loss", { cache: "no-store" });
      const data = await response.json() as DashboardPayload;
      setPayload(data);
      if (!response.ok || !data.live) throw new Error(data.diagnostic || "Live reconciliation source unavailable");
      if (force) setToast("Cache bypassed. Fresh sheet scan completed.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Dashboard refresh nahi ho saka.");
    } finally {
      setLoading(false);
      setForceRefreshing(false);
    }
  };
  useEffect(() => { let active = true; fetch("/api/lead-loss", { cache: "no-store" }).then(response => response.json()).then(data => { if (active) { setPayload(data); setDetailRows(null); setLoading(false); } }).catch(() => { if (active) { setToast("Dashboard refresh nahi ho saka."); setLoading(false); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!selected) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); }; document.addEventListener("keydown", close); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; }; }, [selected]);

  const rows = useMemo(() => (payload?.rows ?? []).map(normalizeRow), [payload]);
  const companies = [...new Set(rows.map(r => r.company))].sort();
  const sources = [...new Set(rows.map(r => r.source))].sort();
  const dates = [...new Set(rows.map(r => r.date))].sort((a, b) => b.localeCompare(a));
  const visible = useMemo(() => rows.filter(row => {
    const rowHealth = row.mismatch ? "Data Mismatch" : row.directMediumGap || row.mediumBufferLost || row.masterCrmLost ? "Lost" : row.slaBreaches ? "TAT breach" : "Reconciled";
    return (company === "All companies" || row.company === company) && (source === "All sources" || row.source === source) && (date === "All dates" || row.date === date) && (health === "All status" || health === rowHealth) && `${row.company} ${row.source} ${row.date}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date) || a.company.localeCompare(b.company) || (sort === "Highest loss" ? (b.directMediumGap + b.mediumBufferLost + b.masterCrmLost) - (a.directMediumGap + a.mediumBufferLost + a.masterCrmLost) : sort === "Highest TAT" ? b.avgTatMin - a.avgTatMin : a.source.localeCompare(b.source)) || a.source.localeCompare(b.source)), [rows, company, source, date, health, query, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, TrackerRow[]>();
    visible.forEach(row => map.set(row.date, [...(map.get(row.date) ?? []), row]));
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([groupDate, groupRows]) => {
      const companyMap = new Map<string, TrackerRow[]>();
      groupRows.forEach(row => companyMap.set(row.company, [...(companyMap.get(row.company) ?? []), row]));
      const companiesForDate = [...companyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([groupCompany, companyRows]) => ({ company: groupCompany, rows: companyRows, total: totalRows(companyRows) }));
      return { date: groupDate, rows: groupRows, companies: companiesForDate, total: totalRows(groupRows) };
    });
  }, [visible]);
  const activeExpandedDate = expandedDate && groups.some(group => group.date === expandedDate) ? expandedDate : groups[0]?.date ?? null;
  const allRecords = visible.flatMap(r => r.records ?? r.issues ?? []);
  const summary = visible.reduce((a, r) => ({ direct: a.direct + r.direct, medium: a.medium + r.medium, duplicate: a.duplicate + r.duplicate, expectedDuplicateGap: a.expectedDuplicateGap + r.expectedDuplicateGap, toBuffer: a.toBuffer + r.bufferTransfer, buffer: a.buffer + r.buffer, mediumLost: a.mediumLost + r.mediumBufferLost, crm: a.crm + r.crm, sameDayCrm: a.sameDayCrm + r.sameDayCrm, lateTransfer: a.lateTransfer + r.lateTransfer, masterLost: a.masterLost + r.masterCrmLost, assigned: a.assigned + r.assigned, breaches: a.breaches + r.slaBreaches, tatSum: a.tatSum + r.avgTatMin * r.buffer, tatWeight: a.tatWeight + r.buffer, mismatches: a.mismatches + Number(r.mismatch) }), { direct: 0, medium: 0, duplicate: 0, expectedDuplicateGap: 0, toBuffer: 0, buffer: 0, mediumLost: 0, crm: 0, sameDayCrm: 0, lateTransfer: 0, masterLost: 0, assigned: 0, breaches: 0, tatSum: 0, tatWeight: 0, mismatches: 0 });
  const openLoss = visible.reduce((total, row) => total + row.directMediumGap + row.mediumBufferLost + row.masterCrmLost + Math.max(0, row.crm - row.assigned), 0);
  const tatBreachCount = visible.reduce((total, row) => total + (!row.mismatch && !row.directMediumGap && !row.mediumBufferLost && !row.masterCrmLost ? row.slaBreaches : 0), 0);
  const reconciledCount = Math.max(0, summary.direct - openLoss);
  const reconciledPercent = summary.direct ? Math.round(reconciledCount / summary.direct * 1000) / 10 : 0;
  const funnelLeaks = [
    { label: "API to Master Medium", count: Math.max(0, summary.direct - summary.medium), select: (lead: LeadRecord) => !lead.inMedium },
    { label: "Master Medium to Buffer", count: Math.max(0, summary.medium - summary.buffer), select: (lead: LeadRecord) => lead.inMedium && !lead.inBuffer },
    { label: "Buffer to CRM", count: Math.max(0, summary.buffer - summary.crm), select: (lead: LeadRecord) => lead.inBuffer && !lead.inCrm },
    { label: "CRM to Sales / KServe", count: Math.max(0, summary.crm - summary.assigned), select: (lead: LeadRecord) => lead.inCrm && !lead.assigned },
  ];
  const biggestLeak = funnelLeaks.reduce((largest, stage) => stage.count > largest.count ? stage : largest, funnelLeaks[0]);
  // TODO: expose a per-lead CRM-entry timestamp from the source payload before calculating Direct API capture → CRM entry TAT.
  const avgCrmTat = "—";
  const gapKeys: StageKey[] = ["directMediumGap", "mediumBufferLost", "masterCrmLost"];
  const open = (title: string, leads: LeadRecord[], sheetUrl?: string, variant: "drawer" | "lost-map" = "drawer", gap?: GapKey) => { setDetailError(""); setDrawerQuery(""); setPage(1); setExpandedAuditLead(null); setDeletedReasonFilter("all"); setOpenAuditSections(new Set(["unexplained"])); setSelected({ title, leads, sheetUrl, variant, gap }); };
  const getDetailedRows = async (requestedIds: string[]) => {
    const uniqueIds = [...new Set(requestedIds)];
    const cached = new Map((detailRows ?? []).map(row => [row.id, row]));
    const missingIds = uniqueIds.filter(id => !cached.has(id));
    if (!missingIds.length) return uniqueIds.map(id => cached.get(id)).filter(Boolean) as TrackerRow[];
    setDetailError("");
    setDetailsLoading(true);
    setToast("Exact Lead IDs load ho rahe hain…");
    try {
      const batches = Array.from({ length: Math.ceil(missingIds.length / 20) }, (_, index) => missingIds.slice(index * 20, index * 20 + 20));
      const loaded = (await Promise.all(batches.map(async ids => {
        const response = await fetch(`/api/lead-loss?details=1&ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
        const data = await response.json() as DashboardPayload;
        if (!response.ok || !data.live) throw new Error(data.diagnostic ?? "Lead detail source unavailable");
        return (data.rows ?? []).map(normalizeRow);
      }))).flat();
      loaded.forEach(row => cached.set(row.id, row));
      setDetailRows([...cached.values()]);
      setToast("");
      return uniqueIds.map(id => cached.get(id)).filter(Boolean) as TrackerRow[];
    } catch {
      setDetailError("Lead details source timed out. Please close karke count par dobara click karein.");
      setToast("Lead details load nahi ho sake. Please retry.");
      return null;
    } finally { setDetailsLoading(false); }
  };
  const getGapDetailedRows = async (requestedIds: string[]) => {
    const wanted = new Set(requestedIds);
    const embedded = rows.filter(row => wanted.has(row.id));
    if (embedded.length === wanted.size && embedded.every(row => row.gapRecordsIncluded)) return embedded;
    return getDetailedRows(requestedIds);
  };
  const openGapShell = (title: string, sheetUrl: string | undefined, gap?: GapKey) => open(title, [], sheetUrl, "lost-map", gap);
  const fillOpenGap = (title: string, leads: LeadRecord[], sheetUrl?: string) => setSelected(current => current?.variant === "lost-map" && current.title === title ? { ...current, leads, sheetUrl: sheetUrl ?? current.sheetUrl } : current);
  const openDetailed = async (title: string, predicate: (lead: LeadRecord) => boolean, variant: "drawer" | "lost-map" = "drawer") => { const ids = visible.map(row => row.id); if (variant === "lost-map") { openGapShell(title, undefined); const detailed = await getGapDetailedRows(ids); if (!detailed) return; fillOpenGap(title, detailed.flatMap(row => row.records ?? []).filter(predicate)); return; } const detailed = await getDetailedRows(ids); if (!detailed) return; open(title, detailed.flatMap(row => row.records ?? []).filter(predicate), undefined, variant); };
  const openDetailedStage = async (title: string, key: StageKey) => { const ids = visible.map(row => row.id); const detailed = await getDetailedRows(ids); if (!detailed) return; open(title, detailed.flatMap(row => stageRecords(row.records ?? [], key)), undefined, gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openRowDetailed = async (row: TrackerRow, title: string, predicate: (lead: LeadRecord) => boolean) => { const detailed = await getDetailedRows([row.id]); if (!detailed) return; const exactRow = detailed.find(item => item.id === row.id); open(title, (exactRow?.records ?? []).filter(predicate), row.finalUrl); };
  const openStage = async (row: TrackerRow, key: StageKey) => { const detailed = await getDetailedRows([row.id]); if (!detailed) return; const exactRow = detailed.find(item => item.id === row.id); open(`${row.company} · ${row.source} · ${labels[key]}`, stageRecords(exactRow?.records ?? [], key), row.stageUrls?.[key] ?? row.finalUrl, gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openTotal = async (groupDate: string, key: StageKey) => { const ids = visible.filter(row => row.date === groupDate).map(row => row.id); const detailed = await getDetailedRows(ids); if (!detailed) return; open(`${dateLabel(groupDate)} total · ${labels[key]}`, detailed.flatMap(row => stageRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key], gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openCompanyTotal = async (groupDate: string, groupCompany: string, key: StageKey) => { const ids = visible.filter(row => row.date === groupDate && row.company === groupCompany).map(row => row.id); const detailed = await getDetailedRows(ids); if (!detailed) return; open(`${dateLabel(groupDate)} · ${groupCompany} total · ${labels[key]}`, detailed.flatMap(row => stageRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key], gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openGapRow = async (row: TrackerRow, key: GapKey) => { const title = `${row.company} · ${row.source} · ${dateLabel(row.date)}`; const sheetUrl = row.stageUrls?.[key === "gap1" ? "directMediumGap" : key === "gap2" ? "mediumBufferLost" : "masterCrmLost"] ?? row.finalUrl; openGapShell(title, sheetUrl, key); const detailed = await getGapDetailedRows([row.id]); if (!detailed) return; const exact = detailed.find(item => item.id === row.id); fillOpenGap(title, gapRecords(exact?.records ?? [], key), sheetUrl); };
  const openGapCompany = async (groupDate: string, groupCompany: string, key: GapKey) => { const ids = visible.filter(row => row.date === groupDate && row.company === groupCompany).map(row => row.id); const meta = gapMeta[key]; const title = `${dateLabel(groupDate)} · ${groupCompany} · ${meta.flow}`; openGapShell(title, undefined, key); const detailed = await getGapDetailedRows(ids); if (!detailed) return; fillOpenGap(title, detailed.flatMap(row => gapRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key === "gap1" ? "directMediumGap" : key === "gap2" ? "mediumBufferLost" : "masterCrmLost"]); };
  const openGapDate = async (groupDate: string, key: GapKey) => { const ids = visible.filter(row => row.date === groupDate).map(row => row.id); const meta = gapMeta[key]; const title = `${dateLabel(groupDate)} · All companies · ${meta.flow}`; openGapShell(title, undefined, key); const detailed = await getGapDetailedRows(ids); if (!detailed) return; fillOpenGap(title, detailed.flatMap(row => gapRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key === "gap1" ? "directMediumGap" : key === "gap2" ? "mediumBufferLost" : "masterCrmLost"]); };
  const filteredDrawer = useMemo(() => (selected?.leads ?? []).filter(lead => `${lead.id} ${lead.name} ${lead.phone} ${lead.email ?? ""} ${lead.company} ${lead.source} ${lead.currentStatus} ${lead.bufferStatus} ${lead.crmStatus} ${lead.original?.id ?? ""} ${lead.original?.phone ?? ""} ${lead.original?.email ?? ""}`.toLowerCase().includes(drawerQuery.toLowerCase())), [selected, drawerQuery]);
  const pageSize = 20, pageCount = Math.max(1, Math.ceil(filteredDrawer.length / pageSize));
  const auditOrder = { unexplained: 0, transient: 1, deleted: 2 } as const;
  const pagedDrawer = [...filteredDrawer].sort((a, b) => auditOrder[auditClass(a) as keyof typeof auditOrder] - auditOrder[auditClass(b) as keyof typeof auditOrder]).slice((page - 1) * pageSize, page * pageSize);
  const deletedCount = filteredDrawer.filter(lead => auditClass(lead) === "deleted").length;
  const transientCount = filteredDrawer.filter(lead => auditClass(lead) === "transient").length;
  const actualLostCount = filteredDrawer.filter(lead => auditClass(lead) === "unexplained").length;
  const deletedReasonOptions: Array<{ key: Exclude<DeletedReasonKey, "all">; label: string; description: string }> = [
    { key: "id", label: "Duplicate by ID", description: "Deleted · ID already in the CRM" },
    { key: "phone", label: "Duplicate by phone · 24 hr", description: "Deleted · phone assigned inside 24 hr" },
    { key: "spam", label: "Spam", description: "Deleted · junk or test entry" },
  ];
  const deletedReasonCount = (key: DeletedReasonKey) => filteredDrawer.filter(lead => auditClass(lead) === "deleted" && (key === "all" || deletedReason(lead).key === key)).length;
  const auditSections = [
    { key: "unexplained", title: "Actual Lost", description: "No duplicate reason, no later transfer and no destination proof", rows: pagedDrawer.filter(lead => auditClass(lead) === "unexplained") },
    { key: "transient", title: "Late Transfer", description: "Transferred later; retained on the source date and never counted as Lost", rows: pagedDrawer.filter(lead => auditClass(lead) === "transient") },
    { key: "deleted", title: "Deleted", description: "Removed at distribution by a rule", rows: pagedDrawer.filter(lead => auditClass(lead) === "deleted" && deletedReasonFilter !== "all" && deletedReason(lead).key === deletedReasonFilter) },
  ];
  const auditSectionCount = (key: string) => filteredDrawer.filter(lead => auditClass(lead) === key).length;
  const toggleAuditSection = (key: string) => setOpenAuditSections(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const exportCsv = () => {
    const fields: (keyof LeadRecord)[] = ["id", "name", "phone", "email", "date", "company", "source", "currentStatus", "bufferStatus", "crmStatus", "timestamp", "transferStatus", "transferTimestamp", "tat"];
    const csv = [fields.join(","), ...filteredDrawer.map(lead => fields.map(field => `"${String(lead[field] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = `lead-audit-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  const reset = () => { setQuery(""); setCompany("All companies"); setSource("All sources"); setDate("All dates"); setHealth("All status"); };

  const lossStages: Array<{ label: string; count: number; hint: string; select: (lead: LeadRecord) => boolean }> = [
    { label: "Direct API → Master Medium", count: visible.reduce((n, row) => n + row.directMediumGap, 0), hint: "Lead ID did not enter Master Medium", select: x => !x.inMedium },
    { label: "Medium → Buffer", count: summary.mediumLost, hint: "Eligible non-duplicate Lead ID is missing in Buffer", select: x => Boolean(x.mediumBufferLost) },
    { label: "Master → CRM", count: summary.masterLost, hint: "No same-day or later CRM proof found", select: x => Boolean(x.masterCrmLost) },
    { label: "CRM → Sales / KServe", count: Math.max(0, summary.crm - summary.assigned), hint: "CRM lead has no assignee", select: x => x.inCrm && !x.assigned },
  ];
  const largestLoss = Math.max(1, ...lossStages.map(x => x.count));
  const selectedGapMeta = selected?.gap ? gapMeta[selected.gap] : { label: "Gap / Lost Audit", flow: "Pipeline reconciliation", description: "Missing Lead IDs reconciled against every available stage and reason." };
  const auditStages = (lead: LeadRecord) => [
    { label: "Source sheet", reached: true, value: lead.generatedAt || lead.timestamp || dateLabel(lead.date) },
    { label: "Master Medium", reached: lead.inMedium, value: lead.inMedium ? lead.transferTimestamp || "Matched" : "—" },
    { label: "Buffer", reached: lead.inBuffer, value: lead.inBuffer ? lead.bufferTimestamp || "Matched" : "—" },
    { label: "CRM", reached: lead.inCrm || Boolean(lead.lateTransfer), value: lead.inCrm || lead.lateTransfer ? lead.crmStatus || (lead.lateTransfer ? "Late transfer" : "Matched") : "—" },
  ];

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">LG</span><div><strong>LeadGuard</strong><small>ID reconciliation</small></div></div><nav><button className="active"><span>⌁</span>Command center</button><button onClick={() => document.getElementById("lost-radar")?.scrollIntoView({ behavior: "smooth" })}><span>◎</span>Lost radar <b>{openLoss}</b></button><button onClick={() => document.getElementById("reconciliation")?.scrollIntoView({ behavior: "smooth" })}><span>≡</span>Reconciliation</button><button onClick={() => openDetailed("Open incidents", x => x.status !== "Resolved")}><span>!</span>Incidents <b>{summary.breaches + openLoss}</b></button><button onClick={() => openDetailed("Duplicate proof", x => x.validDuplicate ?? Boolean(x.original))}><span>⌘</span>Duplicate proof</button></nav><div className={`sidebar-card ${summary.mismatches ? "warning" : ""}`}><span className="pulse-dot"/> {summary.mismatches ? "Validation alert" : "Monitoring active"}<strong>{fmt(payload?.validation?.leadIds ?? allRecords.length)} unique Lead IDs</strong><small>{summary.mismatches ? `${summary.mismatches} mismatch rows` : "Automatic live audit"}</small></div><div className="user"><span>SM</span><div><strong>Operations Admin</strong><small>India workspace</small></div></div></aside>
    <main>
      <header className="topbar"><div><p>OPERATIONS / LEAD CONTROL</p><h1>CRM reconciliation command center</h1></div><div className="top-actions"><span className={`mode ${payload?.live ? "live" : "demo"}`}><i/>{payload?.live ? "LIVE DATA" : payload ? "SOURCE ERROR" : "CONNECTING"}</span><button className="refresh" onClick={() => load(false)} disabled={loading}>{loading && !forceRefreshing ? "Refreshing…" : "↻ Refresh now"}</button><button className="force-refresh" onClick={() => load(true)} disabled={loading}>{forceRefreshing ? "Scanning all sheets…" : "⟳ Force fresh scan"}</button></div></header>
      <section className={`alert-strip ${!payload?.live || summary.mismatches ? "tracker-stale" : ""}`}><div className="alert-icon">!</div><div><strong>{loading && !payload ? "Connecting to live Google Sheets…" : payload && !payload.live ? "Live reconciliation source unavailable" : summary.mismatches ? `${summary.mismatches} Data Mismatch row${summary.mismatches > 1 ? "s" : ""} found` : openLoss ? `${openLoss} lead reconciliation exception${openLoss > 1 ? "s" : ""}` : "All Lead IDs are reconciled"}</strong><p>{loading && !payload ? "Latest Date + Company + Source reconciliation is loading. Counts will appear automatically." : payload && !payload.live ? `${payload.diagnostic ?? "Secure Google Sheets bridge did not return live rows."} No demo counts are shown.` : summary.mismatches ? "Row formulas failed—highlighted rows par click karke exact Lead IDs audit karein." : openLoss ? "Lost radar exact pipeline stage aur records identify karta hai." : "Direct, duplicate, buffer and CRM formulas match."}</p></div><button onClick={() => payload?.live ? openDetailed("Reconciliation exceptions", x => x.status !== "Resolved") : load()} disabled={loading || detailsLoading}>{payload?.live ? detailsLoading ? "Loading Lead IDs…" : "Review leads →" : loading ? "Connecting…" : "Retry live sync →"}</button></section>
      <section className="filters"><label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company, source or date…"/></label><select value={company} onChange={e => setCompany(e.target.value)}><option>All companies</option>{companies.map(x => <option key={x}>{x}</option>)}</select><select value={source} onChange={e => setSource(e.target.value)}><option>All sources</option>{sources.map(x => <option key={x}>{x}</option>)}</select><select value={date} onChange={e => setDate(e.target.value)}><option>All dates</option>{dates.map(x => <option key={x} value={x}>{dateLabel(x)}</option>)}</select><select value={health} onChange={e => setHealth(e.target.value)}><option>All status</option><option>Data Mismatch</option><option>Lost</option><option>TAT breach</option><option>Reconciled</option></select><button className="clear" onClick={reset}>Clear</button></section>
      <section className="kpis"><button className="kpi" onClick={() => openDetailed("All direct API leads", () => true)}><span className="kpi-icon teal">↓</span><div><small>DIRECT API LEADS</small><strong>{fmt(summary.direct)}</strong><p>Unique Lead IDs</p></div></button><button className="kpi danger" onClick={() => openDetailed("Open lost leads", x => lossStages.some(stage => stage.select(x)), "lost-map")}><span className="kpi-icon red">!</span><div><small>ACTUAL LOST / OPEN GAPS</small><strong>{fmt(openLoss)}</strong><p>Expected duplicates excluded</p></div></button><button className="kpi" onClick={() => openDetailed("Expected duplicate gaps", x => Boolean(x.expectedDuplicateGap))}><span className="kpi-icon amber">⌘</span><div><small>EXPECTED DUPLICATE GAPS</small><strong>{fmt(summary.expectedDuplicateGap)}</strong><p>Mobile + email · within 24h</p></div></button><button className="kpi" onClick={() => openDetailed("Late CRM transfers", x => Boolean(x.lateTransfer))}><span className="kpi-icon violet">◷</span><div><small>LATE TRANSFER</small><strong>{fmt(summary.lateTransfer)}</strong><p>Delayed, never Lost</p></div></button><button className="kpi" onClick={() => openDetailed("Sales / KServe assignments", x => x.assigned)}><span className="kpi-icon green">✓</span><div><small>SALES / KSERVE</small><strong>{fmt(summary.assigned)}</strong><p>{summary.direct ? Math.round(summary.assigned / summary.direct * 1000) / 10 : 0}% of intake</p></div></button></section>
      <section className="kpis"><button className="kpi" onClick={() => setHealth("TAT breach")}><span className="kpi-icon amber">◷</span><div><small>TAT BREACH</small><strong>{fmt(tatBreachCount)}</strong><p>Over SLA, not lost yet</p></div></button><button className="kpi" onClick={() => setHealth("Data Mismatch")}><span className="kpi-icon teal">≠</span><div><small>DATA MISMATCH</small><strong>{fmt(summary.mismatches)}</strong><p>Field conflict across sheets</p></div></button><button className="kpi" onClick={() => setHealth("Reconciled")}><span className="kpi-icon green">✓</span><div><small>RECONCILED</small><strong>{fmt(reconciledCount)}</strong><p>{reconciledPercent}% fully matched</p></div></button><button className="kpi danger" onClick={() => openDetailed(`${biggestLeak.label} gaps`, biggestLeak.select, "lost-map")}><span className="kpi-icon red">!</span><div><small>BIGGEST LEAK STAGE</small><strong>{fmt(biggestLeak.count)}</strong><p>{biggestLeak.label}</p></div></button><button className="kpi" onClick={() => openDetailed("API to CRM entry TAT", x => x.inCrm)}><span className="kpi-icon violet">◴</span><div><small>AVG TAT</small><strong>{avgCrmTat}</strong><p>API to CRM entry</p></div></button></section>
      <section className="pipeline-card"><div className="section-title"><div><p>LIVE ID FUNNEL</p><h2>Lead ID proof through every stage</h2></div><span>{payload?.crmMode ?? "CRM source unavailable"}</span></div><div className="pipeline">{pipelineKeys.map((key, index) => { const count = visible.reduce((n, row) => n + row[key], 0); return <div className="pipeline-wrap" key={key}><button className={`stage ${key === "assigned" ? "success" : ""}`} onClick={() => openDetailedStage(labels[key], key)}><span>{index + 1}</span><small>{labels[key]}</small><strong>{fmt(count)}</strong><em>{summary.direct ? Math.round(count / summary.direct * 100) : 0}%</em></button>{index < pipelineKeys.length - 1 && <i className="connector"><b>→</b></i>}</div>; })}</div><div className="funnel-note"><span className="green-dot"/> Duplicate/Delete is explained—not lost. Every count is deduplicated by Lead ID and grouped by Date + Company + Verified Source.</div></section>
      <section className="loss-command" id="lost-radar"><div className="section-title"><div><p>LOST LEAD RADAR</p><h2>Exactly where reconciliation is breaking</h2></div><span className={`health-chip ${summary.mismatches ? "stale" : "current"}`}>{summary.mismatches ? `⚠ ${summary.mismatches} formula mismatch` : "● Formula validation passed"}</span></div><div className="loss-grid"><article className="live-master-card"><div className="radar-visual"><i/><i/><i/><span><small>OPEN</small><strong>{fmt(openLoss)}</strong><em>exceptions</em></span></div><div className="master-copy"><p>LATEST RECONCILIATION · {payload?.currentSummary?.date ? dateLabel(payload.currentSummary.date) : "—"}</p><h3>Medium → Buffer and Master → CRM</h3><div className="master-metrics"><span><small>Buffer</small><strong>{fmt(summary.buffer)}</strong></span><span><small>Same-day CRM</small><strong>{fmt(summary.sameDayCrm)}</strong></span><span><small>Late transfer</small><strong>{fmt(summary.lateTransfer)}</strong></span><span className="danger"><small>Actual lost</small><strong>{fmt(summary.mediumLost + summary.masterLost)}</strong></span></div><button onClick={() => openDetailed("All open reconciliation exceptions", x => lossStages.some(stage => stage.select(x)), "lost-map")}>Open exact lost leads →</button></div></article><article className="break-map"><header><div><p>LIVE STAGE MAP</p><h3>Date + Company + Source</h3></div><span>Click a stage to audit</span></header><div className="break-list">{lossStages.map((stage, index) => <button key={stage.label} onClick={() => openDetailed(`${stage.label} lost leads`, stage.select, "lost-map")}><span className="break-rank">0{index + 1}</span><span className="break-copy"><strong>{stage.label}</strong><small>{stage.hint}</small><i><b style={{ width: `${Math.max(3, stage.count / largestLoss * 100)}%` }}/></i></span><em className={stage.count ? "hot" : "clear"}>{fmt(stage.count)}<small>{stage.count ? " lost" : " clear"}</small></em></button>)}</div></article></div></section>
      <section className="table-card" id="reconciliation">
        <div className="section-title"><div><p>DAILY RECONCILIATION</p><h2>Latest date first · click + / − to open one date · daily totals always visible</h2></div><div className="table-tools"><span>{visible.length} source rows</span><select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort sources within each company"><option>Highest loss</option><option>Highest TAT</option><option>Source A–Z</option></select></div></div>
        <div className="table-scroll"><table>
          <thead><tr><th>DATE / COMPANY</th><th>VERIFIED SOURCE</th><th>DIRECT API<span className="column-flow">SOURCE SHEET</span></th><th className="gap-heading">GAP 1<span className="column-flow">DIRECT → MEDIUM</span></th><th>MASTER MEDIUM<span className="column-flow">MERGED</span></th><th className="gap-heading">GAP 2<span className="column-flow">MEDIUM → BUFFER</span></th><th>ACTUAL BUFFER<span className="column-flow">STAGED</span></th><th className="gap-heading">GAP 3<span className="column-flow">BUFFER → CRM</span></th><th>ACTUAL CRM<span className="column-flow">RECONCILED</span></th><th>TRANSFER TO<br/>SALES</th><th>TRANSFER TO<br/>KSERVE</th><th>TAT</th><th>STATUS</th></tr></thead>
          <tbody>{groups.map(group => { const isDateOpen = activeExpandedDate === group.date; const dailyProblem = Boolean(group.total.mismatches || group.total.directMediumGap || group.total.mediumBufferLost || group.total.masterCrmLost || group.total.crm > group.total.sales + group.total.kserve); return <Fragment key={group.date}>
            <tr className={`date-summary-row ${isDateOpen ? "expanded" : "collapsed"}`}>
              <td><button className="date-toggle" aria-expanded={isDateOpen} onClick={() => setExpandedDate(isDateOpen ? null : group.date)}><span>{isDateOpen ? "−" : "+"}</span><div><strong>{dateLabel(group.date)}</strong><small>DAILY TOTAL</small></div></button></td>
              <td><strong>{group.companies.length} companies</strong><small>{group.rows.length} source rows</small></td>
              <td><button className="count-link" onClick={() => openTotal(group.date, "direct")}>{fmt(group.total.direct)}</button></td>
              <td className={`gap-cell total-gap ${gapCount(group.total, "gap1") ? "has-gap" : "clear-gap"}`}><button className="gap-count-link" onClick={() => openGapDate(group.date, "gap1")}>{fmt(gapCount(group.total, "gap1"))}{gapLostCount(group.total, "gap1") > 0 && <small>{fmt(gapLostCount(group.total, "gap1"))} LOST</small>}</button></td>
              <td><button className="count-link" onClick={() => openTotal(group.date, "medium")}>{fmt(group.total.medium)}</button></td>
              <td className={`gap-cell total-gap ${gapCount(group.total, "gap2") ? "has-gap" : "clear-gap"}`}><button className="gap-count-link" onClick={() => openGapDate(group.date, "gap2")}>{fmt(gapCount(group.total, "gap2"))}{gapLostCount(group.total, "gap2") > 0 && <small>{fmt(gapLostCount(group.total, "gap2"))} LOST</small>}</button></td>
              <td><button className="count-link" onClick={() => openTotal(group.date, "buffer")}>{fmt(group.total.buffer)}</button></td>
              <td className={`gap-cell total-gap ${gapCount(group.total, "gap3") ? "has-gap" : "clear-gap"}`}><button className="gap-count-link" onClick={() => openGapDate(group.date, "gap3")}>{fmt(gapCount(group.total, "gap3"))}{gapLostCount(group.total, "gap3") > 0 && <small>{fmt(gapLostCount(group.total, "gap3"))} LOST</small>}</button></td>
              <td><button className="count-link" onClick={() => openTotal(group.date, "crm")}>{fmt(group.total.crm)}</button></td>
              <td><button className="count-link" onClick={() => openTotal(group.date, "sales")}>{fmt(group.total.sales)}</button></td>
              <td><button className="count-link" onClick={() => openTotal(group.date, "kserve")}>{fmt(group.total.kserve)}</button></td>
              <td><strong>{Math.round(group.total.tatSum / Math.max(1, group.total.tatWeight))}m</strong><small>{group.total.slaBreaches} breaches</small></td>
              <td><span className={`status ${group.total.mismatches ? "mismatch" : dailyProblem ? "lost" : group.total.lateTransfer ? "delayed" : "ok"}`}>{group.total.mismatches ? "⚠ Data Mismatch" : dailyProblem ? "● Daily Audit" : group.total.lateTransfer ? "● Late Transfer" : "● Daily Clear"}</span></td>
            </tr>
            {isDateOpen && group.companies.map((companyGroup, companyIndex) => <Fragment key={`${group.date}-${companyGroup.company}`}>
              <tr className="company-group-row"><td colSpan={13}><div><span>COMPANY {String(companyIndex + 1).padStart(2, "0")}</span><strong>{companyGroup.company}</strong><em>{companyGroup.rows.length} verified sources</em></div></td></tr>
              {companyGroup.rows.map(row => {
                const hasLost = Boolean(row.directMediumGap || row.mediumBufferLost || row.masterCrmLost || row.crm > row.sales + row.kserve);
                const status = row.mismatch ? "mismatch" : hasLost ? "lost" : row.lateTransfer || row.slaBreaches ? "delayed" : "ok";
                return <tr key={row.id} className={row.mismatch ? "mismatch-row source-data-row" : status === "lost" ? "problem-row source-data-row" : "source-data-row"}>
                  <td><strong>{dateLabel(row.date)}</strong><small>{row.company}</small></td>
                  <td><span className="source-badge">{row.source.slice(0, 1)}</span><strong>{row.source}</strong></td>
                  <td><button className="count-link" onClick={() => openStage(row, "direct")}>{fmt(row.direct)}</button></td>
                  <td className={`gap-cell ${gapCount(row, "gap1") ? "has-gap" : "clear-gap"}`}><button className={`gap-count-link ${gapCount(row, "gap1") ? "has-value" : ""}`} onClick={() => openGapRow(row, "gap1")}>{fmt(gapCount(row, "gap1"))}{gapLostCount(row, "gap1") > 0 && <small>{fmt(gapLostCount(row, "gap1"))} LOST</small>}</button></td>
                  <td><button className="count-link" onClick={() => openStage(row, "medium")}>{fmt(row.medium)}</button></td>
                  <td className={`gap-cell ${gapCount(row, "gap2") ? "has-gap" : "clear-gap"}`}><button className={`gap-count-link ${gapCount(row, "gap2") ? "has-value" : ""}`} onClick={() => openGapRow(row, "gap2")}>{fmt(gapCount(row, "gap2"))}{gapLostCount(row, "gap2") > 0 && <small>{fmt(gapLostCount(row, "gap2"))} LOST</small>}</button></td>
                  <td><button className="count-link" onClick={() => openStage(row, "buffer")}>{fmt(row.buffer)}</button></td>
                  <td className={`gap-cell ${gapCount(row, "gap3") ? "has-gap" : "clear-gap"}`}><button className={`gap-count-link ${gapCount(row, "gap3") ? "has-value" : ""}`} onClick={() => openGapRow(row, "gap3")}>{fmt(gapCount(row, "gap3"))}{gapLostCount(row, "gap3") > 0 && <small>{fmt(gapLostCount(row, "gap3"))} LOST</small>}</button></td>
                  <td><button className="count-link" onClick={() => openStage(row, "crm")}>{fmt(row.crm)}</button></td>
                  <td><button className="count-link" onClick={() => openStage(row, "sales")}>{fmt(row.sales)}</button></td>
                  <td><button className="count-link" onClick={() => openStage(row, "kserve")}>{fmt(row.kserve)}</button></td>
                  <td><button className={`tat ${row.slaBreaches ? "bad" : ""}`} onClick={() => openRowDetailed(row, `${row.company} · ${row.source} · TAT records`, x => x.toBuffer)}>{row.avgTatMin}m<small>{row.slaBreaches ? `${row.slaBreaches} breach` : "Within SLA"}</small></button></td>
                  <td><span className={`status ${status}`}>{row.mismatch ? "⚠ Data Mismatch" : status === "lost" ? "● Actual Lost" : status === "delayed" ? `● ${row.lateTransfer ? "Late Transfer" : "TAT breach"}` : "● Reconciled"}</span>{row.mismatch && <small>{row.validationErrors.join(" · ")}</small>}</td>
                </tr>;
              })}
              <tr className="company-total-row">
                <td><strong>{companyGroup.company}</strong><small>COMPANY SUBTOTAL</small></td><td><strong>{companyGroup.rows.length} source rows</strong></td>
                <td><button className="count-link" onClick={() => openCompanyTotal(group.date, companyGroup.company, "direct")}>{fmt(companyGroup.total.direct)}</button></td>
                <td className={`gap-cell total-gap ${gapCount(companyGroup.total, "gap1") ? "has-gap" : "clear-gap"}`}><button className="gap-count-link" onClick={() => openGapCompany(group.date, companyGroup.company, "gap1")}>{fmt(gapCount(companyGroup.total, "gap1"))}{gapLostCount(companyGroup.total, "gap1") > 0 && <small>{fmt(gapLostCount(companyGroup.total, "gap1"))} LOST</small>}</button></td>
                <td><button className="count-link" onClick={() => openCompanyTotal(group.date, companyGroup.company, "medium")}>{fmt(companyGroup.total.medium)}</button></td>
                <td className={`gap-cell total-gap ${gapCount(companyGroup.total, "gap2") ? "has-gap" : "clear-gap"}`}><button className="gap-count-link" onClick={() => openGapCompany(group.date, companyGroup.company, "gap2")}>{fmt(gapCount(companyGroup.total, "gap2"))}{gapLostCount(companyGroup.total, "gap2") > 0 && <small>{fmt(gapLostCount(companyGroup.total, "gap2"))} LOST</small>}</button></td>
                <td><button className="count-link" onClick={() => openCompanyTotal(group.date, companyGroup.company, "buffer")}>{fmt(companyGroup.total.buffer)}</button></td>
                <td className={`gap-cell total-gap ${gapCount(companyGroup.total, "gap3") ? "has-gap" : "clear-gap"}`}><button className="gap-count-link" onClick={() => openGapCompany(group.date, companyGroup.company, "gap3")}>{fmt(gapCount(companyGroup.total, "gap3"))}{gapLostCount(companyGroup.total, "gap3") > 0 && <small>{fmt(gapLostCount(companyGroup.total, "gap3"))} LOST</small>}</button></td>
                <td><button className="count-link" onClick={() => openCompanyTotal(group.date, companyGroup.company, "crm")}>{fmt(companyGroup.total.crm)}</button></td>
                <td><button className="count-link" onClick={() => openCompanyTotal(group.date, companyGroup.company, "sales")}>{fmt(companyGroup.total.sales)}</button></td>
                <td><button className="count-link" onClick={() => openCompanyTotal(group.date, companyGroup.company, "kserve")}>{fmt(companyGroup.total.kserve)}</button></td>
                <td><strong>{Math.round(companyGroup.total.tatSum / Math.max(1, companyGroup.total.tatWeight))}m</strong><small>{companyGroup.total.slaBreaches} breaches</small></td>
                <td><span className={`status ${companyGroup.total.mismatches ? "mismatch" : companyGroup.total.directMediumGap || companyGroup.total.mediumBufferLost || companyGroup.total.masterCrmLost || companyGroup.total.crm > companyGroup.total.sales + companyGroup.total.kserve ? "lost" : companyGroup.total.lateTransfer ? "delayed" : "ok"}`}>{companyGroup.total.mismatches ? "⚠ Data Mismatch" : companyGroup.total.directMediumGap || companyGroup.total.mediumBufferLost || companyGroup.total.masterCrmLost || companyGroup.total.crm > companyGroup.total.sales + companyGroup.total.kserve ? "● Company Audit" : companyGroup.total.lateTransfer ? "● Late Transfer" : "● Company Clear"}</span></td>
              </tr>
            </Fragment>)}
          </Fragment>; })}{!visible.length && <tr><td colSpan={13} className="empty">{loading ? "Loading live reconciliation…" : "No matching live records."}</td></tr>}</tbody>
        </table></div>
        <div className="table-foot"><span><i className="dot red-dot"/> Red LOST marker = genuine missing lead</span><span><i className="dot amber-dot"/> Gap total also includes explained duplicates or late transfers</span><span><i className="dot green-dot"/> Click any Gap 1/2/3 count for the complete audit</span><span>Last sync · {payload ? new Date(payload.scannedAt).toLocaleString("en-IN") : "—"}</span></div>
      </section>
    </main>
    {selected?.variant === "lost-map" ? <div className="gap-console-backdrop" onMouseDown={() => setSelected(null)}>
      <section className="gap-console" role="dialog" aria-modal="true" aria-labelledby="gap-console-title" onMouseDown={e => e.stopPropagation()}>
        <header className="gap-console-head"><div><div className="gap-console-title-row"><h2 id="gap-console-title">{selectedGapMeta.label}</h2><span>{selectedGapMeta.flow}</span></div><p>{selected.title}</p></div><button aria-label="Close popup" onClick={() => setSelected(null)}>×</button></header>
        <div className="gap-console-intro"><div><span className="gap-console-kicker">GAP TOTAL</span><strong>{detailsLoading ? "…" : filteredDrawer.length}</strong></div><p>{selectedGapMeta.description} Counts stay anchored to the original source date wherever the lead eventually lands.</p></div>
        <div className="gap-console-ledger"><span className="unexplained"><small>ACTUAL LOST</small><strong>{detailsLoading ? "—" : actualLostCount}</strong><em>needs audit</em></span><span className="transient"><small>LATE TRANSFER</small><strong>{detailsLoading ? "—" : transientCount}</strong><em>not lost</em></span><span className="deleted"><small>DELETED</small><strong>{detailsLoading ? "—" : deletedCount}</strong><em>reason verified</em></span></div>
        <div className="gap-console-toolbar"><input value={drawerQuery} onChange={e => { setDrawerQuery(e.target.value); setPage(1); }} placeholder="Search Lead ID, name, mobile, source or status…"/><div>{selected.sheetUrl && <a href={selected.sheetUrl} target="_blank" rel="noreferrer">Open data sheet ↗</a>}<button onClick={exportCsv} disabled={!filteredDrawer.length}>Export CSV</button></div></div>
        <div className="gap-console-body">{detailsLoading ? <div className="gap-console-loading"><i/><strong>Exact Lead IDs load ho rahe hain</strong><span>Popup open hai—sheet reconciliation background mein complete ho rahi hai.</span></div> : detailError ? <div className="gap-console-error"><strong>Details load nahi ho sake</strong><span>{detailError}</span></div> : filteredDrawer.length ? auditSections.map(section => { const sectionOpen = openAuditSections.has(section.key); return <section className={`gap-bucket ${section.key}`} key={section.key}>
          <button className="gap-bucket-head" aria-expanded={sectionOpen} onClick={() => toggleAuditSection(section.key)}><span className="gap-eye">{sectionOpen ? "◉" : "○"}</span><strong>{section.title}</strong><em>{section.description}</em>{section.key === "deleted" && <span className="gap-reason-total">3 REASONS</span>}<b>{auditSectionCount(section.key)}</b></button>
          {sectionOpen && <div className="gap-bucket-content">{section.key === "deleted" && <div className="gap-delete-reasons">{deletedReasonOptions.map(option => <button className={deletedReasonFilter === option.key ? "active" : ""} aria-expanded={deletedReasonFilter === option.key} key={option.key} onClick={() => { setDeletedReasonFilter(deletedReasonFilter === option.key ? "all" : option.key); setExpandedAuditLead(null); }}><span className="gap-delete-branch">⌁</span><span className="gap-delete-copy"><strong>{option.label}</strong><em>{option.description}</em></span><b>{deletedReasonCount(option.key)}</b></button>)}</div>}{(section.key !== "deleted" || deletedReasonFilter !== "all") && (section.rows.length ? <div className="gap-record-scroll"><table className="gap-record-table"><thead><tr><th></th><th>Lead ID</th><th>Name</th><th>Mobile / Email</th><th>Source</th><th>Enquiry time</th><th>Actual status / reason</th><th>Held</th></tr></thead><tbody>{section.rows.map(lead => { const openLead = expandedAuditLead === lead.id; const status = lostReasonStatus(lead); const original = lead.original; const deleteStatus = deletedReason(lead); return <Fragment key={`${lead.id}-${lead.stage}`}>
            <tr className={`gap-record ${openLead ? "selected" : ""}`} onClick={() => setExpandedAuditLead(openLead ? null : lead.id)}><td><span className="gap-caret">{openLead ? "▾" : "▸"}</span></td><td><strong>{lead.id}</strong></td><td>{lead.name || "Unnamed lead"}</td><td><span>{lead.phone || "—"}</span><small>{lead.email || "—"}</small></td><td>{lead.source}</td><td>{lead.generatedAt || lead.timestamp || dateLabel(lead.date)}</td><td><span className={`gap-reason-chip ${section.key}`}>{auditReasonLabel(lead)}</span><small>{section.key === "unexplained" ? status.detail : section.key === "deleted" ? deleteStatus.detail : lead.reason}</small></td><td><strong className={section.key === "unexplained" ? "gap-age-hot" : ""}>{lead.tat || `${lead.tatMin || 0}m`}</strong></td></tr>
            {openLead && <tr className="gap-trace-row"><td colSpan={8}><div className="gap-stage-track">{auditStages(lead).map((stage, index, stages) => <div className={`gap-stage-node ${stage.reached ? "done" : section.key === "unexplained" ? "stopped" : "pending"} ${stage.reached && stages[index + 1]?.reached ? "linked" : ""}`} key={stage.label}><i/><small>{stage.label}</small><strong>{stage.value}</strong></div>)}</div>
              <div className="gap-contact-detail"><span><small>ACTUAL DUPLICATE MOBILE</small><strong>{lead.phone || "—"}</strong></span><span><small>ACTUAL DUPLICATE EMAIL</small><strong>{lead.email || "—"}</strong></span>{original && <><span><small>PRIMARY LEAD MOBILE</small><strong>{original.phone || "—"}</strong></span><span><small>PRIMARY LEAD EMAIL</small><strong>{original.email || "—"}</strong></span></>}</div>
              {section.key === "deleted" && original ? <div className="gap-evidence"><header><span>PRIMARY TRANSFERRED LEAD ↔ ACTUAL DUPLICATE</span><strong>{deleteStatus.label}</strong><em>Matched by {original.matchBasis || "Mobile / Email / Enquiry ID"} within 24 hours</em></header><div className="gap-evidence-table"><span className="qualified">✓</span><strong>{original.id}</strong><b>PRIMARY · TRANSFERRED</b><span>{original.generatedAt || "—"}</span><span>{original.source}</span><span>Transferred to {original.assignee || "Sales / KServe"}</span><span className="current">×</span><strong>{lead.id}</strong><b>ACTUAL DUPLICATE · DELETED</b><span>{lead.generatedAt || lead.timestamp || "—"}</span><span>{lead.source}</span><span>Deleted · {deleteStatus.label}</span></div></div> : section.key === "deleted" ? <div className="gap-evidence missing"><strong>{deleteStatus.label}</strong><p>{deleteStatus.detail} Primary transferred record is not available in the current payload.</p></div> : section.key === "unexplained" ? <div className="gap-loss-warning"><strong>HIGH ALERT · NO QUALIFIED LEAD</strong><p>No valid duplicate, late transfer or destination record explains this gap. Audit the exact source window and script execution.</p></div> : <div className="gap-late-note"><strong>LATE TRANSFER · NOT LOST</strong><p>This lead reached CRM after its source date and remains anchored to the original intake day.</p></div>}
              <div className="gap-trace-actions">{lead.directUrl && <a href={lead.directUrl} target="_blank" rel="noreferrer">Open source row ↗</a>}{lead.destinationUrl && <a href={lead.destinationUrl} target="_blank" rel="noreferrer">Open Buffer row ↗</a>}{lead.crmUrl && <a href={lead.crmUrl} target="_blank" rel="noreferrer">Open CRM ↗</a>}</div>
            </td></tr>}
          </Fragment>; })}</tbody></table></div> : <div className="gap-section-empty">No {section.title.toLowerCase()} records on this page.</div>)}</div>}
        </section>; }) : <div className="gap-console-empty"><strong>No matching leads</strong><span>Search clear karke dobara dekhein.</span></div>}</div>
        <footer className="gap-console-foot"><span>{detailsLoading ? "Loading exact records…" : `${filteredDrawer.length} rows · Page ${page} of ${pageCount}`}</span><button disabled={detailsLoading} onClick={() => setOpenAuditSections(openAuditSections.size === 3 ? new Set() : new Set(["unexplained", "transient", "deleted"]))}>{openAuditSections.size === 3 ? "Hide all sections" : "Show all sections"}</button><div>{filteredDrawer.length > pageSize && <><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next</button></>}<button onClick={() => setSelected(null)}>Close</button></div></footer>
      </section>
    </div> : selected && <div className="drawer-backdrop" onMouseDown={() => setSelected(null)}><aside className="drawer" onMouseDown={e => e.stopPropagation()}><header><div><p>LEAD DRILL-DOWN</p><h2>{selected.title}</h2><span>{filteredDrawer.length} matching Lead IDs</span>{selected.sheetUrl && <a className="drawer-sheet-link" href={selected.sheetUrl} target="_blank" rel="noreferrer">Open correct data sheet ↗</a>}</div><button onClick={() => setSelected(null)}>×</button></header><div className="drawer-toolbar"><input value={drawerQuery} onChange={e => { setDrawerQuery(e.target.value); setPage(1); }} placeholder="Search Lead ID, company, source, status…"/><button onClick={exportCsv} disabled={!filteredDrawer.length}>Export CSV</button></div><div className="drawer-list">{pagedDrawer.length ? pagedDrawer.map(lead => <article key={`${lead.id}-${lead.stage}`} className={`lead-item ${lead.status.toLowerCase()}`}><div className="lead-head"><span className={`status ${lead.status === "Lost" ? "lost" : lead.status === "Delayed" ? "delayed" : "ok"}`}>● {lead.status}</span><small>{lead.timestamp}</small></div><h3>{lead.name || "Unnamed lead"}</h3><p className="lead-id">Lead ID: {lead.id} · {lead.phone}</p><div className="lead-grid"><span>Date<strong>{dateLabel(lead.date)}</strong></span><span>Company<strong>{lead.company}</strong></span><span>Source<strong>{lead.source}</strong></span><span>Current Status<strong>{lead.currentStatus}</strong></span><span>Buffer Status<strong>{lead.bufferStatus}</strong></span><span>CRM Status<strong>{lead.crmStatus}</strong></span><span>Transfer Status<strong>{lead.transferStatus}</strong></span><span>TAT<strong>{lead.tat}</strong></span></div><div className="reason"><strong>Audit finding</strong><p>{lead.reason}</p></div>{lead.original && <div className="duplicate-proof"><div><small>CURRENT LEAD</small><strong>{lead.source}</strong><span>{lead.generatedAt}</span></div><i>matched within 24h →</i><div><small>ORIGINAL LEAD SENT</small><strong>{lead.original.source}</strong><span>{lead.original.generatedAt} · {lead.original.assignee}</span></div></div>}<div className="lead-actions">{lead.directUrl && <a href={lead.directUrl} target="_blank" rel="noreferrer">Open exact Direct row ↗</a>}{lead.destinationUrl && <a href={lead.destinationUrl} target="_blank" rel="noreferrer">Open exact Buffer row ↗</a>}{lead.crmUrl && <a href={lead.crmUrl} target="_blank" rel="noreferrer">Open CRM ↗</a>}</div></article>) : <div className="empty-drawer"><span>✓</span><h3>No matching leads</h3><p>Search clear karke dobara dekhein.</p></div>}</div>{filteredDrawer.length > pageSize && <footer className="drawer-pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next →</button></footer>}</aside></div>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
