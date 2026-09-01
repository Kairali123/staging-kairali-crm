"use client"

import { Eye, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Lead } from "@/lib/lead-search-types"

interface ResultsTableProps {
  leads: Lead[]
  onViewFollowUp: (leadId: string) => void
}

const statusColors: Record<Lead["leadStatus"], string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Qualified: "bg-purple-100 text-purple-800",
  Converted: "bg-green-100 text-green-800",
}

export function ResultsTable({ leads, onViewFollowUp }: ResultsTableProps) {
  if (leads.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">
          Search Results
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({leads.length} {leads.length === 1 ? "lead" : "leads"} found)
          </span>
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1800px]">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <th className="sticky left-0 bg-blue-100 px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-16">
                S.No
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-28">
                Generate Date
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-28">
                Enquiry Date
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-36">
                Lead ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-36">
                Client Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-28">
                Mobile
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-44">
                Email
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-40">
                Subject
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-48">
                Notes
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-32">
                URL
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-28">
                Website
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-28">
                Data Source
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-32">
                Assigned To
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-48">
                Remarks History
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider w-28">
                Lead Status
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead, index) => (
              <tr
                key={lead.id}
                className={`${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50 transition-colors`}
              >
                <td className="sticky left-0 bg-inherit px-5 py-3 text-sm font-medium text-gray-900">
                  {lead.serialNo}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {new Date(lead.generateDate).toLocaleDateString("en-IN")}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {new Date(lead.enquiryDate).toLocaleDateString("en-IN")}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-blue-600">
                  {lead.leadId}
                </td>
                <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                  {lead.clientName}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">
                  {lead.mobile}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 truncate max-w-44" title={lead.email}>
                  {lead.email}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 truncate max-w-40" title={lead.subject}>
                  {lead.subject}
                </td>
                <td className="px-5 py-3 text-sm text-gray-600 truncate max-w-48" title={lead.notes}>
                  {lead.notes}
                </td>
                <td className="px-5 py-3 text-sm">
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">
                  {lead.website}
                </td>
                <td className="px-5 py-3 text-sm">
                  <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                    {lead.dataSource}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">
                  {lead.assignedTo}
                </td>
                <td className="px-5 py-3 text-sm text-gray-600 truncate max-w-48" title={lead.remarksHistory}>
                  {lead.remarksHistory}
                </td>
                <td className="px-5 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.leadStatus]}`}>
                    {lead.leadStatus}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewFollowUp(lead.leadId)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                    title="View Follow-up History"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
