"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink, Mail, Printer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const employees = [
  { id: "DEMO-001", name: "Demo Agent A", calls: 51, good: 14, bad: 37, score: 1.88 },
  { id: "DEMO-002", name: "Demo Agent B", calls: 74, good: 10, bad: 64, score: 0.71 },
  { id: "DEMO-003", name: "Demo Agent C", calls: 51, good: 5, bad: 46, score: 1.38 },
  { id: "DEMO-004", name: "Demo Agent D", calls: 48, good: 3, bad: 45, score: 0.75 },
]

const auditedLeads = employees.reduce((sum, employee) => sum + employee.calls, 0)
const verifiedOutcomes = employees.reduce((sum, employee) => sum + employee.good, 0)
const mismatches = employees.reduce((sum, employee) => sum + employee.bad, 0)
const mismatchRate = auditedLeads ? (mismatches / auditedLeads) * 100 : 0
const teamAverage = employees.reduce((sum, employee) => sum + employee.score, 0) / employees.length
const teamPerformance = auditedLeads ? (verifiedOutcomes / auditedLeads) * 100 : 0

export default function SalesCallAuditEmailTemplatePage() {
  return (
    <div className="pb-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center print:hidden">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-3"><Link href="/sales-call-audit"><ArrowLeft className="mr-2 h-4 w-4" />Back to audit dashboard</Link></Button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Daily HR Email Template</h1>
          <p className="mt-1 text-sm text-slate-500">Linked preview for the Sales Call Audit Report.</p>
        </div>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
      </div>

      <div className="mx-auto max-w-[760px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="bg-[#193a6a] px-7 py-7 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Head Office · Daily Quality Audit</div>
          <h2 className="mt-2 text-2xl font-bold">Agent-wise Call Audit Report</h2>
          <div className="mt-1 text-sm text-blue-100">Audit date: 05 March 2026</div>
        </div>

        <div className="space-y-5 px-7 py-7 text-sm text-slate-600">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Prototype preview:</strong> all employee names, IDs and audit values in this email are synthetic fixtures.</div>
          <div><p className="font-medium text-slate-900">Hi HR Team,</p><p className="mt-3 leading-6">Please find below the daily audit outcome. Employees marked <strong className="text-red-600">FAIL</strong> require a half-day attendance adjustment for the audit date, subject to final HR verification.</p></div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ label: "Audited leads", value: String(auditedLeads), danger: false }, { label: "Verified", value: String(verifiedOutcomes), danger: false }, { label: "Mismatch", value: String(mismatches), danger: true }, { label: "Wrong outcomes", value: `${mismatchRate.toFixed(2)}%`, danger: true }].map(item => <div key={item.label} className={`rounded-lg border p-3 ${item.danger ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}><div className="text-xs text-slate-500">{item.label}</div><div className={`mt-1 text-xl font-bold ${item.danger ? "text-red-700" : "text-[#193a6a]"}`}>{item.value}</div></div>)}
          </div>

          <div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-violet-200 bg-violet-50 p-3"><span className="text-xs text-violet-700">Team average</span><strong className="float-right text-violet-800">{teamAverage.toFixed(2)} / 5</strong></div><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><span className="text-xs text-emerald-700">Verified outcome rate</span><strong className="float-right text-emerald-800">{teamPerformance.toFixed(2)}%</strong></div></div>

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"><strong>HR action:</strong> 4 employees failed. Verify each employee and mark half-day for 05 March 2026 where applicable. Confirm the Pagarbook update from the audit dashboard.</div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[620px] border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Employee</th><th className="p-3 text-center">Calls</th><th className="p-3 text-center">Good / Bad</th><th className="p-3 text-center">Score</th><th className="p-3 text-center">Result</th><th className="p-3 text-right">Report</th></tr></thead>
              <tbody>{employees.map(employee => <tr key={employee.id} className="border-t border-slate-100"><td className="p-3"><div className="font-semibold text-slate-800">{employee.name}</div><div className="text-[10px] text-slate-400">{employee.id}</div></td><td className="p-3 text-center">{employee.calls}</td><td className="p-3 text-center">{employee.good} / {employee.bad}</td><td className="p-3 text-center font-semibold">{employee.score.toFixed(2)}</td><td className="p-3 text-center"><Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">FAIL</Badge></td><td className="p-3 text-right"><Link href={`/sales-call-audit?date=05-03-2026&employee=${employee.id}`} className="inline-flex items-center font-semibold text-blue-600 hover:underline">View details <ExternalLink className="ml-1 h-3 w-3" /></Link></td></tr>)}</tbody>
            </table>
          </div>

          <div className="text-center"><Button asChild className="bg-[#193a6a] hover:bg-[#193a6a]/90"><Link href="/sales-call-audit"><Mail className="mr-2 h-4 w-4" />Open consolidated audit report</Link></Button></div>

          <div className="border-t border-slate-200 pt-5 leading-6"><p>For any questions or corrections, please contact IT before updating attendance.</p><p className="mt-3 text-slate-800">Regards,<br /><strong>IT Audit Team</strong></p></div>
        </div>
      </div>
    </div>
  )
}
