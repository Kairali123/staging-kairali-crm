// export interface BillingRow {
//   taskId: string;
//   number: string;
//   destinationNumber: string;
//   callStartTime: string;
//   problem: string;
//   category: string;
//   unpodRemarks: string;
//   callConnectedTime: string;
//   callEndTime: string;
//   durationWithRinging: number; // in seconds
//   durationWithoutRinging: number; // in seconds
//   durationMinutes: number;
//   remarks: string;
//   timeDurationInSecond: number;
//   auditorName: string;
//   timeGap: number; // in seconds
//   recordingUrl: string;
//   transcript: string;
//   actualAudioDuration: number; // in seconds
//   fileSize: number; // in KB
//   durationMismatch: 'Match' | 'Mismatch';
//   aiCategory: string;
//   aiRemarks: string;
//   aiConfidence: number; // 0 - 100
//   auditStatus: 'Pending' | 'Reviewed' | 'Approved' | 'Flagged';
// }


export type DurationMismatch = 'YES' | 'NO' | 'N/A' | null;

export interface BillingRow {
  taskId: string;
  number: string | null;
  destinationNumber: string | null;
  /** ISO 8601, e.g. "2026-05-02T22:00:00.000Z" */
  callStartTime: string | null;
  category: string | null;
  unpodRemarks: string | null;
  callConnectedTime: string | null;
  callEndTime: string | null;
  /** seconds */
  durationWithRinging: number | null;
  /** seconds */
  durationWithoutRinging: number | null;
  durationMinutes: number | null;
  remarks: string | null;
  timeDurationInSecond: number | null;
  auditorName: string | null;
  timeGapInSecond: number | null;
  recordingUrl: string | null;
  transcript: string | null;
  /** seconds */
  actualAudioDuration: number | null;
  /** KB */
  fileSize: number | null;
  durationMismatch: DurationMismatch;
  aiCategory: string | null;
  aiRemarks: string | null;
  /** 0-100; frequently null in real data (AI didn't score confidence for that row) */
  aiConfidence: string | null;
  auditStatus: string | null;
}
