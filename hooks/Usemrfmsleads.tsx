import { useState, useEffect } from "react"
import { MRFMSLead } from "@/types/mrfms"

const GAS_API_URL =
    "https://script.google.com/macros/s/AKfycbwLCFHAEztFb7i9wG3W06vj_YnQeWUuGwq2X9iGsvkgNEFDe9i_4Wq39WCb729SUNmlzA/exec"

/** Map a raw GAS API row object → typed MRFMSLead */
function mapApiRow(row: Record<string, string>): MRFMSLead {
    return {
        timestamp: row["Timestamp"] ?? "",
        verifiedDate: row["Verified Date"] ?? "",
        id: row["ID"] ?? "",
        clientName: row["Client Name"] ?? "",
        mobileNumber: row["Mobile Number"] ?? "",
        email: row["Email"] ?? "",
        address: row["Address"] ?? "",
        pincode: row["Pincode"] ?? "",
        state: row["State"] ?? "",
        city: row["City"] ?? "",
        area: row["Area"] ?? "",
        clientType: row["Client Type"] ?? "",
        speciality: row["Speciality"] ?? "",
        clientCategory: row["Client Category"] ?? "",
        dataSource: row["Data Source"] ?? "",
        notes: row["Notes"] ?? "",
        recordingUrl: row["Recording URL"] ?? "",
        verifiedArea: row["Verified Area"] ?? "",
        verifiedPincode: row["Verified Pincode"] ?? "",
        leadOutcome: row["Lead Outcome"] ?? "",
        remarks: row["Remarks"] ?? "",
        mrNameAsPerPincode: row["MR Name as Per Pincode"] ?? "",
        existingNewAsPerMRData: row["Existing/New as per MR Data"] ?? "",
        altMobileNumber: row["Alt Mobile Number"] ?? "",
        callingSalesPersonName: row["Calling Sales Person Name"] ?? "",
        planned: row["Planned"] ?? "",
        actual: row["Actual"] ?? "",
        col28: row["Time Delay"] ?? "",
        status: row["Status"] ?? "",
        assignToMROrASM: row["Assign to MR Or ASM"] ?? "",
        remarksOps: row["Remarks_2"] ?? "",
        assignToTPDate: row["Assign to TP Date"] ?? "",
        partyType: row["Party Type"] ?? "",
        verifiedAreaTP: row["Verified Area_2"] ?? "",
        helpTicketStatusToAssignPerson: row["Help Ticket Status to Assign Person"] ?? "",
        transferToApiSheetStatus: row["Transfer To API Sheet Status"] ?? "",
        directTransferToTpSheet: row["Direct Transfer to TpSheet"] ?? "",
        col38: row[""] ?? "",
        altMobileNumberTP: row["Alt Mobile Number"] ?? "",
        exceptions: row["Exceptions"] ?? "",
        htStatusFromHtRecordSheet: row["HT Status From HT Record Sheet"] ?? "",
        responseOfAddInApp: row["Response Of Add inAPP"] ?? "",
        responseOfTPUpdate: row["Response Of TP Update"] ?? "",
        transferToDeleteSheet: row["Transfer To Delete Sheet"] ?? "",
        transferToBufferStatusIfNoMRExist: row["Trnsfer to buffer Status if No MR Exist"] ?? "",
    }
}

function formatNow(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    return (
        `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}, ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    )
}

interface UseMRFMSLeadsReturn {
    leads: MRFMSLead[]
    isLoading: boolean
    fetchError: string | null
    lastUpdatedTime: string
    refetch: () => void
}

export function useMRFMSLeads(): UseMRFMSLeadsReturn {
    const [leads, setLeads] = useState<MRFMSLead[]>([])        // no static fallback
    const [isLoading, setIsLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [lastUpdatedTime, setLastUpdatedTime] = useState("")
    const [trigger, setTrigger] = useState(0)

    useEffect(() => {
        let cancelled = false

        const fetchLeads = async () => {
            setIsLoading(true)
            setFetchError(null)

            try {
                const res = await fetch(GAS_API_URL)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)

                const json = await res.json()
                const rows: Record<string, string>[] = json.data ?? json ?? []

                if (!Array.isArray(rows) || rows.length === 0) {
                    throw new Error("API se koi data nahi aaya")
                }

                if (!cancelled) {
                    setLeads(rows.map(mapApiRow))
                    setLastUpdatedTime(formatNow())
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : String(err)
                    setFetchError(msg)
                    setLeads([])                                        // error pe bhi empty
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        fetchLeads()
        return () => { cancelled = true }
    }, [trigger])

    const refetch = () => setTrigger((t) => t + 1)

    return { leads, isLoading, fetchError, lastUpdatedTime, refetch }
}