import { BillingRow } from '../types/billing';

const API_URL =
  'https://script.google.com/macros/s/AKfycbxjuQRZgaP7DD7YAd4q4hzzS_OyI2AN58nAsthubCKDN6ik8JIXC0yP2Cvg7mSk1ZdT/exec';

/**
 * Fetches billing data from the Google Apps Script API.
 * The API returns an object keyed by taskId:
 * { [taskId]: { number, destinationNumber, callStartTime, ... } }
 */
export async function getBillingData(): Promise<BillingRow[]> {
  // no-store: this is a live audit dashboard, don't let Next.js's default
  // fetch caching serve stale billing/audit-status data across requests.
  const response = await fetch(API_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const json = await response.json();

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('Unexpected API response shape — expected an object keyed by taskId');
  }

  // Transform the keyed object into an array of BillingRow
  const rows: BillingRow[] = Object.entries(json).map(([taskId, data]: [string, any]) => ({
    taskId,
    number: data?.number ?? null,
    destinationNumber: data?.destinationNumber ?? null,
    callStartTime: data?.callStartTime ?? null,
    category: data?.category ?? null,
    unpodRemarks: data?.unpodRemarks ?? null,
    callConnectedTime: data?.callConnectedTime ?? null,
    callEndTime: data?.callEndTime ?? null,
    durationWithRinging: data?.durationWithRinging ?? null,
    durationWithoutRinging: data?.durationWithoutRinging ?? null,
    durationMinutes: data?.durationMinutes ?? null,
    remarks: data?.remarks ?? null,
    timeDurationInSecond: data?.timeDurationInSecond ?? null,
    auditorName: data?.auditorName ?? null,
    timeGapInSecond: data?.timeGapInSecond ?? null,
    recordingUrl: data?.recordingUrl ?? null,
    transcript: data?.transcript ?? null,
    actualAudioDuration: data?.actualAudioDuration ?? null,
    fileSize: data?.fileSize ?? null,
    durationMismatch: data?.durationMismatch ?? null,
    aiCategory: data?.aiCategory ?? null,
    aiRemarks: data?.aiRemarks ?? null,
    aiConfidence: data?.aiConfidence ?? null,
    auditStatus: data?.auditStatus ?? null,
  }));

  return rows;
}
