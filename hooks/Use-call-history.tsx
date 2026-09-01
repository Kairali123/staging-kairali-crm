import { useState, useEffect } from 'react'

// Types matching the API response
interface APICallHistoryResponse {
    error?: string
    sheet: string
    data: {
        "SQV Lead Intent": string
        "Campaign NAME": string
        "call_Count": number
        "agent_Id": string | number  // Can be string ("VDAD") or number (8061)
        "latest_called_at": string
        "customer_Name": string
        "Alt_Phone": string
        "Address": string
        "City": string
        "State": string
        "Postal_Code": string
        "Province": string
        "date_Of_Birth": string
        "latest_recording_url": string
        "Disposition": string
        "Lead Id From Dialer": number
        "list_id": number
        "Lead_Priority": string
        "Campaign Id": number
        "Lead_Category": string
        "Lead_Conversion": string
        "Conversion_Amount": string
        "Comment": string
        "Call Notes": string
        "HangUp Reason": string
        "Full Disposition": string
        "Doer": string
        "Send To Remarks Sheet || TimeStamp": string
        "send lead Date&Time": string
        "SentTo Next Step||TimeStamp": string
        "sent status || call ReAudit": string
        "Call Type": string
        "Call Recording Duration": number
        "Drop Leads Recycle Status": string
    }
}

// Type for the transformed follow-up data
export interface FollowUp {
    id: string
    plannedDate: string
    actualDate: string
    time: string
    callStatus: string
    callDuration?: string
    enquiryStatus: string
    agent: string
    agentId: string
    campaignName: string
    callType: string
    agentRemarks: string
    recordingUrl?: string
    nextFollowUpDate?: string
    nextAction?: string
    followUpDoneIn: string
    potentialValue: number
}

const API_URL = 'https://script.google.com/macros/s/AKfycbzSgSgfw_hzsQK9K7HsEMemRB_6NatFryjoLZSMeEi-8_QzxkFGtjj4zmHlbkqoo9KJ4Q/exec'

/**
 * Transform API response to FollowUp format
 */
function transformAPIDataToFollowUp(apiData: APICallHistoryResponse, index: number): FollowUp {
    const data = apiData.data
    
    // Map Full Disposition directly to enquiry status
    const mapDispositionToStatus = (disposition: string): string => {
        if (!disposition) return 'Cold'

        const lowerDisp = disposition.toLowerCase()

        // Exact mapping based on API response patterns
        // if (lowerDisp === 'busy auto' || lowerDisp === 'busy') return 'First Followup'
        // if (lowerDisp === 'not connected') return 'Not Connected'
        // if (lowerDisp === 'cold') return 'Cold'
        // if (lowerDisp.includes('converted')) return 'Converted'
        // if (lowerDisp.includes('hot') || lowerDisp.includes('interested')) return 'Hot'
        // if (lowerDisp.includes('warm') || lowerDisp.includes('callback')) return 'Warm'
        // if (lowerDisp.includes('no answer')) return 'First Followup'

        // return 'Cold'
        return lowerDisp;
    }

    // Map enquiry status to call status
    const mapEnquiryStatusToCallStatus = (enquiryStatus: string): string => {
        // switch (enquiryStatus) {
        //     case 'Converted':
        //     case 'Hot':
        //     case 'Warm':
        //         return 'Connected'
        //     case 'First Followup':
        //         return 'Busy'
        //     case 'Cold':
        //     default:
        //         return 'Not Connected'
        // }
        return enquiryStatus;
    }

    // Format duration from seconds to minutes
    const formatDuration = (seconds: number): string | undefined => {
        if (!seconds || seconds === 0) return undefined
        const minutes = Math.floor(seconds / 60)
        return minutes > 0 ? `${minutes}` : '< 1'
    }

    // Get the enquiry status from Full Disposition
    const enquiryStatus = mapEnquiryStatusToCallStatus(data["Full Disposition"] || data["Disposition"])
    const disposition = mapDispositionToStatus(data["Full Disposition"] || data["Disposition"])


    // Extract agent ID - can be string or number
    const agentId = data["agent_Id"] ? String(data["agent_Id"]) : "N/A"

    // Agent name from Doer, fallback to Agent ID
    const agentName = data["Doer"] && data["Doer"] !== "No Doer"
        ? data["Doer"]
        : `Agent ${agentId}`

    // Handle Call Type - show "AppSheet" when blank or "unknown"
    const callType = data["Call Type"] && data["Call Type"].toLowerCase() !== "unknown"
        ? data["Call Type"]
        : "AppSheet"

    return {
        id: `${data["Lead Id From Dialer"]}-${index}`,
        plannedDate: data["send lead Date&Time"],
        actualDate: data["latest_called_at"],
        time: new Date(data["latest_called_at"]).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }),
        callStatus: mapEnquiryStatusToCallStatus(enquiryStatus),
        callDuration: formatDuration(data["Call Recording Duration"]),
        enquiryStatus: enquiryStatus,
        agent: agentName,
        agentId: agentId,
        campaignName: data["Campaign NAME"] || "Unknown Campaign",
        callType: callType,
        agentRemarks: data["Call Notes"] || data["Comment"] || "No remarks available",
        recordingUrl: data["latest_recording_url"] || undefined,
        nextFollowUpDate: undefined, // API doesn't provide this
        nextAction: data["Doer"] !== "No Doer" ? data["Doer"] : undefined,
        followUpDoneIn: callType,
        potentialValue: data["Conversion_Amount"] ? parseFloat(data["Conversion_Amount"]) : 0
    }
}

/**
 * Custom hook to fetch call history for a specific lead
 */
export function useCallHistory(leadId: string | number | null | undefined) {
    const [followUps, setFollowUps] = useState<FollowUp[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Don't fetch if no leadId
        if (!leadId) {
            setFollowUps([])
            return
        }

        const fetchCallHistory = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const url = `${API_URL}?id=${leadId}`

                const response = await fetch(url)

                if (!response.ok) {
                    await response.text()
                    throw new Error(`API error: ${response.status}`)
                }

                const data = await response.json()

                // Check if API returned an error
                if (data.error) {
                    throw new Error(data.error)
                }

                // Transform data
                var transformedData = []
                if (data.length > 0) {
                    for (let i = 0; i < data.length; i++) {
                        var transformArr = transformAPIDataToFollowUp(data[i], i)
                        transformedData.push(transformArr)
                    }
                }

                setFollowUps(transformedData)
            } catch (err) {
                console.error('❌ Error fetching call history:', err)

                // More detailed error message
                let errorMessage = 'Failed to fetch call history'

                if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                    errorMessage = 'Network error: Check CORS settings in Google Apps Script. Make sure the script is deployed with "Anyone" access.'
                } else if (err instanceof Error) {
                    errorMessage = err.message
                }

                setError(errorMessage)
                setFollowUps([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchCallHistory()
    }, [leadId])

    return { followUps, isLoading, error }
}

/**
 * Alternative: Fetch call history manually (not with useEffect)
 * Use this if you want to fetch only when modal opens
 */
export async function fetchCallHistoryManually(leadId: string | number): Promise<FollowUp[]> {
    try {
        const url = `${API_URL}?id=${leadId}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data: APICallHistoryResponse = await response.json()

        // Check if API returned an error
        if (data.error) {
            throw new Error(data.error)
        }

        const transformedData = transformAPIDataToFollowUp(data, 0)

        return [transformedData]
    } catch (err) {
        console.error('Error fetching call history:', err)
        return []
    }
}
