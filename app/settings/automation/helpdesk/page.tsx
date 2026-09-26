"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Edit3, Save, X, CheckCircle2, AlertCircle,
  Ticket, Power, PowerOff, Clock, History, Settings, Play,
  ChevronDown, RefreshCw, ToggleLeft, ToggleRight, Info, Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType = "daily_deadline" | "task_incomplete";
type IssueLevel = "LOW" | "MEDIUM" | "HIGH";
type Department =
  | "Sales" | "Marketing" | "Purchase" | "Accounts" | "Dispatch"
  | "Admin" | "IT" | "MDO" | "SG_Collection" | "SG_Costing"
  | "SG_Escalation" | "SG_System" | "Treatment Center"
  | "HR" | "Stores" | "Production" | "Packing" | "Other";

interface HtRule {
  id?: number;
  rule_name: string;
  is_active: number;
  source_page: string;
  source_label: string;
  doer_name: string;
  doer_email: string;
  trigger_type: TriggerType;
  trigger_time: string;
  trigger_days: string;
  form_url: string;
  form_creator_name: string;
  form_creator_email: string;
  form_department: Department;
  form_issue_text: string;
  form_issue_level: IssueLevel;
  form_solution1: string;
  form_solution2: string;
  form_solution3: string;
  entry_creator_name: string;
  entry_creator_email: string;
  entry_department: string;
  entry_issue: string;
  entry_issue_level: string;
  entry_delegated_to: string;
  entry_delegated_email: string;
  entry_solution1: string;
  entry_solution2: string;
  entry_solution3: string;
  cooldown_hours: number;
  created_at?: string;
}

interface HtLog {
  id: number;
  rule_id: number;
  rule_name: string;
  doer_name: string;
  doer_email: string;
  source_page: string;
  form_status: "success" | "failed" | "skipped";
  form_response: string;
  error_message: string;
  triggered_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_PAGES = [
  { key: "booking-pi-review-tracker", label: "Booking PI Review Tracker" },
  { key: "fms-pending-tasks",         label: "FMS Pending Tasks" },
  { key: "fms-enquiry-reverification",label: "Enquiry Reverification" },
  { key: "crr-calling",               label: "CRR Calling" },
  { key: "fms-bookings",              label: "FMS Bookings" },
  { key: "fms-complaints",            label: "FMS Complaints" },
  { key: "custom",                    label: "Custom / Other" },
];

const DEPARTMENTS: Department[] = [
  "Sales","Marketing","Purchase","Accounts","Dispatch","Admin","IT","MDO",
  "SG_Collection","SG_Costing","SG_Escalation","SG_System","Treatment Center",
  "HR","Stores","Production","Packing","Other"
];

const DAY_OPTIONS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const BLANK_RULE: HtRule = {
  rule_name: "", is_active: 1,
  source_page: "booking-pi-review-tracker", source_label: "Booking PI Review Tracker",
  doer_name: "", doer_email: "",
  trigger_type: "daily_deadline", trigger_time: "18:05",
  trigger_days: "mon,tue,wed,thu,fri,sat,sun",
  form_url: "",
  form_creator_name: "System Automation", form_creator_email: "",
  form_department: "Admin",
  form_issue_text: "{doer_name} ne {source_page} ka kaam {trigger_time} tak nahi kiya on {date}",
  form_issue_level: "MEDIUM",
  form_solution1: "Please complete the pending task immediately.",
  form_solution2: "", form_solution3: "",
  entry_creator_name: "", entry_creator_email: "",
  entry_department: "", entry_issue: "", entry_issue_level: "",
  entry_delegated_to: "", entry_delegated_email: "",
  entry_solution1: "", entry_solution2: "", entry_solution3: "",
  cooldown_hours: 20,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function istNow() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
function fmtDT(s: string) {
  return new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ status }: { status: "success" | "failed" | "skipped" }) {
  const map = {
    success: "bg-emerald-100 text-emerald-700",
    failed:  "bg-red-100 text-red-700",
    skipped: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${map[status]}`}>
      {status}
    </span>
  );
}

function LevelBadge({ level }: { level: IssueLevel }) {
  const map = { LOW: "bg-blue-100 text-blue-700", MEDIUM: "bg-amber-100 text-amber-700", HIGH: "bg-red-100 text-red-700" };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${map[level]}`}>{level}</span>;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
  );
}

// ─── Entry Field Row ──────────────────────────────────────────────────────────

function EntryFieldRow({
  label, entryKey, entryVal, valueLabel, valueEl,
  onEntryChange
}: {
  label: string; entryKey: string; entryVal: string;
  valueLabel: string; valueEl: React.ReactNode;
  onEntryChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr_1fr] gap-3 items-start py-2 border-b border-slate-100 last:border-0">
      <div className="text-sm font-medium text-slate-700 pt-2">{label}</div>
      <input
        type="text"
        value={entryVal}
        onChange={e => onEntryChange(e.target.value)}
        placeholder="entry.XXXXXXXXX"
        className="font-mono text-xs border border-slate-200 rounded px-2 py-2 outline-none focus:border-blue-400 bg-slate-50 w-full"
      />
      <div className="w-full">{valueEl}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HelpdeskConfigPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "editor" | "log">("rules");
  const [rules, setRules]   = useState<HtRule[]>([]);
  const [logs,  setLogs]    = useState<HtLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult,  setCronResult]  = useState<any>(null);
  const [editRule, setEditRule] = useState<HtRule>(BLANK_RULE);
  const [editMode, setEditMode] = useState<"new" | "edit">("new");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Load ──
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ht-rules");
      const data = await res.json();
      if (data.success) setRules(data.rules || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/ht-log?limit=100");
      const data = await res.json();
      if (data.success) setLogs(data.logs || []);
    } catch {}
  }, []);

  useEffect(() => { loadRules(); loadLogs(); }, [loadRules, loadLogs]);

  // ── Flash message ──
  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  // ── Open editor ──
  function openNew() {
    setEditRule({ ...BLANK_RULE });
    setEditMode("new");
    setActiveTab("editor");
  }
  function openEdit(r: HtRule) {
    setEditRule({ ...r });
    setEditMode("edit");
    setActiveTab("editor");
  }

  // ── Save rule ──
  async function saveRule() {
    if (!editRule.rule_name.trim()) return flash("error", "Rule name is required");
    if (!editRule.doer_name.trim()) return flash("error", "Doer name is required");
    setSaving(true);
    try {
      const isNew = editMode === "new" || !editRule.id;
      const url = isNew ? "/api/ht-rules" : `/api/ht-rules/${editRule.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRule),
      });
      const data = await res.json();
      if (data.success) {
        flash("success", isNew ? "Rule created!" : "Rule updated!");
        await loadRules();
        setActiveTab("rules");
      } else {
        flash("error", data.error || "Failed to save");
      }
    } catch (e: any) {
      flash("error", e.message);
    }
    setSaving(false);
  }

  // ── Toggle rule ──
  async function toggleRule(r: HtRule) {
    try {
      await fetch(`/api/ht-rules/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...r, is_active: r.is_active ? 0 : 1 }),
      });
      await loadRules();
    } catch {}
  }

  // ── Delete rule ──
  async function deleteRule(id: number) {
    if (!confirm("Delete this rule? This cannot be undone.")) return;
    try {
      await fetch(`/api/ht-rules/${id}`, { method: "DELETE" });
      await loadRules();
      flash("success", "Rule deleted.");
    } catch {}
  }

  // ── Run cron manually ──
  async function runCron() {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/cron/ht-automation-engine");
      const data = await res.json();
      setCronResult(data);
      await loadLogs();
    } catch (e: any) {
      setCronResult({ error: e.message });
    }
    setCronRunning(false);
  }

  // ── Update edit rule field ──
  function er(key: keyof HtRule, val: any) {
    setEditRule(prev => {
      const next = { ...prev, [key]: val };
      if (key === "source_page") {
        const found = SOURCE_PAGES.find(s => s.key === val);
        if (found) next.source_label = found.label;
      }
      return next;
    });
  }

  // ── Day toggle ──
  function toggleDay(day: string) {
    const days = editRule.trigger_days ? editRule.trigger_days.split(",").filter(Boolean) : [];
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    er("trigger_days", next.join(","));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="max-w-6xl mx-auto p-5 space-y-5 bg-slate-50 min-h-screen">

        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-7 h-7 text-blue-600" />
              Help Ticket (HT) Automation
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Condition-based automatic HT triggers for any FMS / Process / Tracker
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runCron}
              disabled={cronRunning}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm transition disabled:opacity-60"
            >
              {cronRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Now
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>
        </div>

        {/* ── Flash ── */}
        {msg && (
          <div className={`flex items-center gap-3 p-4 rounded-lg text-sm font-medium border animate-in fade-in ${
            msg.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>
            {msg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {msg.text}
          </div>
        )}

        {/* ── Cron result ── */}
        {cronResult && (
          <div className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto">
            <div className="text-slate-400 mb-1">Cron Engine Result — {istNow()}</div>
            <pre>{JSON.stringify(cronResult, null, 2)}</pre>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex space-x-1 border-b border-slate-200">
          {[
            { id: "rules",  icon: Settings, label: `Rules (${rules.length})` },
            { id: "editor", icon: Edit3,    label: editMode === "edit" ? "Edit Rule" : "New Rule" },
            { id: "log",    icon: History,  label: "HT Log" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 bg-blue-50/60 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-t-lg"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: RULES LIST
        ══════════════════════════════════════════ */}
        {activeTab === "rules" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading rules…
              </div>
            ) : rules.length === 0 ? (
              <div className="p-12 text-center">
                <Ticket className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No HT rules configured yet.</p>
                <button onClick={openNew} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                  Create First Rule
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Rule Name</th>
                      <th className="p-4 font-bold">Source / Process</th>
                      <th className="p-4 font-bold">Doer</th>
                      <th className="p-4 font-bold">Trigger</th>
                      <th className="p-4 font-bold">Level</th>
                      <th className="p-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rules.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => toggleRule(r)}
                            title={r.is_active ? "Click to pause" : "Click to activate"}
                            className="transition-transform hover:scale-110"
                          >
                            {r.is_active ? (
                              <ToggleRight className="w-8 h-8 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 text-sm">{r.rule_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Cooldown: {r.cooldown_hours}h</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-slate-700">{r.source_label}</div>
                          <div className="text-xs text-slate-400 font-mono">{r.source_page}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-slate-800">{r.doer_name}</div>
                          <div className="text-xs text-slate-400">{r.doer_email}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-sm text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            {r.trigger_time}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {(r.trigger_days || "").split(",").map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}
                          </div>
                        </td>
                        <td className="p-4">
                          <LevelBadge level={r.form_issue_level} />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(r)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => r.id && deleteRule(r.id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: RULE EDITOR
        ══════════════════════════════════════════ */}
        {activeTab === "editor" && (
          <div className="space-y-5">

            {/* ── Section 1: Identity ── */}
            <Section icon={<Settings className="w-5 h-5 text-slate-400" />} title="Rule Identity" sub="Naam aur status">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Rule Name *">
                  <input
                    type="text"
                    value={editRule.rule_name}
                    onChange={e => er("rule_name", e.target.value)}
                    placeholder="e.g. Booking PI Review — Anuj — 6pm"
                    className="input-std"
                  />
                </Field>
                <Field label="Status">
                  <button
                    onClick={() => er("is_active", editRule.is_active ? 0 : 1)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      editRule.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {editRule.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    {editRule.is_active ? "Active" : "Paused"}
                  </button>
                </Field>
              </div>
            </Section>

            {/* ── Section 2: What to Monitor ── */}
            <Section icon={<Ticket className="w-5 h-5 text-slate-400" />} title="Kya Monitor Karna Hai" sub="Source page aur doer">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Source Page / Process *">
                  <select value={editRule.source_page} onChange={e => er("source_page", e.target.value)} className="input-std">
                    {SOURCE_PAGES.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Source Label (auto-filled)">
                  <input type="text" value={editRule.source_label} onChange={e => er("source_label", e.target.value)} className="input-std" />
                </Field>
                <Field label="Doer Name *" hint="Jis insaan ki accountability check karni hai">
                  <input type="text" value={editRule.doer_name} onChange={e => er("doer_name", e.target.value)} placeholder="e.g. Anuj" className="input-std" />
                </Field>
                <Field label="Doer Email *">
                  <input type="email" value={editRule.doer_email} onChange={e => er("doer_email", e.target.value)} placeholder="anuj@example.com" className="input-std" />
                </Field>
              </div>
            </Section>

            {/* ── Section 3: Trigger Timing ── */}
            <Section icon={<Clock className="w-5 h-5 text-slate-400" />} title="Trigger Time" sub="Kab HT create hoga">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Trigger Time *" hint="IST mein time, jis pe HT create hoga (±5 min window)">
                  <input
                    type="time"
                    value={editRule.trigger_time}
                    onChange={e => er("trigger_time", e.target.value)}
                    className="input-std"
                  />
                </Field>
                <Field label="Cooldown (hours)" hint="Ek rule ke liye per day kitni baar HT jayegi">
                  <input
                    type="number" min={1} max={48}
                    value={editRule.cooldown_hours}
                    onChange={e => er("cooldown_hours", parseInt(e.target.value) || 20)}
                    className="input-std"
                  />
                </Field>
              </div>
              <Field label="Active Days">
                <div className="flex gap-2 flex-wrap mt-1">
                  {DAY_OPTIONS.map((d, i) => {
                    const active = (editRule.trigger_days || "").split(",").includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          active ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {DAY_LABELS[i]}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Section>

            {/* ── Section 4: Google Form Setup ── */}
            <Section icon={<Play className="w-5 h-5 text-slate-400" />} title="Google Form Content" sub="HT Ticket me kya data jayega">
              
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="HT Creator Name" hint="Name field mein jaayega">
                  <input type="text" value={editRule.form_creator_name} onChange={e => er("form_creator_name", e.target.value)} className="input-std" />
                </Field>
                <Field label="HT Creator Email">
                  <input type="email" value={editRule.form_creator_email} onChange={e => er("form_creator_email", e.target.value)} placeholder="system@company.com" className="input-std" />
                </Field>
                <Field label="Department">
                  <select value={editRule.form_department} onChange={e => er("form_department", e.target.value as Department)} className="input-std">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Challenge/Issue Text *" hint="Variables: {doer_name} {source_page} {trigger_time} {date}. No special chars (%, &, #, @, $, *, etc.)">
                  <textarea
                    rows={3}
                    value={editRule.form_issue_text}
                    onChange={e => er("form_issue_text", e.target.value)}
                    className="input-std resize-none"
                  />
                </Field>
                <Field label="Challenge/Issue Level">
                  <div className="flex gap-2">
                    {(["LOW","MEDIUM","HIGH"] as IssueLevel[]).map(lv => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => er("form_issue_level", lv)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                          editRule.form_issue_level === lv
                            ? lv === "LOW" ? "bg-blue-600 text-white" : lv === "MEDIUM" ? "bg-amber-500 text-white" : "bg-red-600 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {lv}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4">
                <Field label="Solution 1 (Required) *" hint="No special chars (%, &, #, @, $, *, etc.)">
                  <input type="text" value={editRule.form_solution1} onChange={e => er("form_solution1", e.target.value)} placeholder="Best solution / action" className="input-std" />
                </Field>
                <Field label="Solution 2 (Optional)" hint="No special chars">
                  <input type="text" value={editRule.form_solution2} onChange={e => er("form_solution2", e.target.value)} placeholder="Alternative approach" className="input-std" />
                </Field>
                <Field label="Solution 3 (Optional)" hint="No special chars">
                  <input type="text" value={editRule.form_solution3} onChange={e => er("form_solution3", e.target.value)} placeholder="Fallback option" className="input-std" />
                </Field>
              </div>
            </Section>

            {/* ── Save / Cancel ── */}
            <div className="flex justify-end gap-3 pb-10">
              <button
                onClick={() => setActiveTab("rules")}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={saveRule}
                disabled={saving}
                className="px-8 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-md flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editMode === "new" ? "Create Rule" : "Update Rule"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: LOG
        ══════════════════════════════════════════ */}
        {activeTab === "log" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">HT Automation Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">Last 100 HT trigger events</p>
              </div>
              <button onClick={loadLogs} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="p-10 text-center text-slate-400">No logs yet. Rules ko active karo aur cron chalao.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-4 font-bold">Time (IST)</th>
                      <th className="p-4 font-bold">Rule</th>
                      <th className="p-4 font-bold">Doer</th>
                      <th className="p-4 font-bold">Process</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-500 whitespace-nowrap text-xs">{fmtDT(l.triggered_at)}</td>
                        <td className="p-4 font-medium text-slate-800">{l.rule_name}</td>
                        <td className="p-4 text-slate-600">{l.doer_name}</td>
                        <td className="p-4 text-slate-500 text-xs">{l.source_page}</td>
                        <td className="p-4"><Badge status={l.form_status} /></td>
                        <td className="p-4 text-xs text-slate-400 max-w-xs truncate">
                          {l.error_message || l.form_response || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Tailwind JIT helper classes */}
      <style>{`
        .input-std {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #334155;
          outline: none;
          background: #f8fafc;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-std:focus {
          background: white;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
        }
      `}</style>
    </>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({ icon, title, sub, children }: {
  icon: React.ReactNode; title: string; sub: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
        {icon}
        <div>
          <h2 className="font-semibold text-slate-800 text-base">{title}</h2>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}
