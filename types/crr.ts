export type Role = "user" | "admin";
export type Resp = "GRE" | "Doctor" | "FO" | "GM";
export type StageStatus = "Pending" | "Processing" | "Complete";
export type CallStatus = "Done" | "Not Done - Close" | "Close Follow-up";
export type YesNo = "Yes" | "No";
export type RatingStatus = "Given" | "Not Given" | "Requested";
export type DateRangePreset =
    | "all"
    | "today"
    | "yesterday"
    | "thisWeek"
    | "lastWeek"
    | "thisMonth"
    | "lastMonth"
    | "thisYear"
    | "lastYear"
    | "custom";

export interface Stage {
    no: number;
    name: string;
    resp: Resp;
    trigger: string;
    dateLabel: string;
    remarkLabel: string;
}

// NEW — per-stage lock/planned-date info returned by GAS doGet
export interface StageInfo {
    stage: number;
    available: boolean;   // false for stages not yet configured in GAS (2, 4, 8 pending)
    locked: boolean;      // true if today < plannedDate, or unavailable/unparseable
    plannedDate: string | null;
    completed: boolean;   // true only when that stage's Status column === "Done"
    actualDate?: string | null;      // completion timestamp from actualCol
    toShow?: boolean;                // KTAHV_CRR_Calling_FMS.to_show; only populated for stages 1,5,6,7
    submitted?: boolean;             // true if stage has saved/submitted data in MySQL
    savedData?: Record<string, string | number | null> | null; // saved form values for prefill
}

export interface Guest {
    id: number;
    timestamp: string;
    bookingId: string;
    checkin: string;
    checkout: string;
    name: string;
    mobile: string;
    email: string;
    gender: string;
    country: string;
    days: number;
    programme: string;
    room: string;
    bookingNo: string;
    takenBy: string;
    invoice: string;
    piLink: string;
    mid: string;
    uid: string;
    bookingStatus: string;
    currentStage: number; // 1-8
    allComplete: boolean;
    stageStatus: StageStatus[]; // length 11
    stages: StageInfo[]; // length 11, lock/planned-date status per stage from GAS
    callAfterLanding?: {
        qrCodeViewed: boolean;
    };
    arrivalWelcome?: {
        outcomeRemarks: string;
        status: CallStatus | "";
        notDoneRemarks: string;
        followupDate: string;
        outcomeAchieved: YesNo | "";
    };
    safeReturn?: {
        stayFeedback: string;
        outcomeRemarks: string;
        status: CallStatus | "";
        notDoneRemarks: string;
        followupDate: string;
        outcomeAchieved: YesNo | "";
    };
    guestFeedback?: {
        doerRemarks: string;
    };
    referralCollection?: {
        referralTakenStatus: string;
        doerRemarks: string;
    };
    ratingRequest?: {
        ratingStatus: RatingStatus | "";
        notGivenRemarks: string;
        proofFileName: string;
        outcomeRemarks: string;
        status: CallStatus | "";
        notDoneRemarks: string;
        followupDate: string;
        outcomeAchieved: YesNo | "";
    };
    resultProgress?: {
        outcomeRemarks: string;
        status: CallStatus | "";
        notDoneRemarks: string;
        followupDate: string;
        outcomeAchieved: YesNo | "";
    };
    driverAssignmentArrival?: {
        pickupRequired: string;
        driverName: string;
        driverContact: string;
        pickupFrom: string;
        pickupDate: string;
        pickupTime: string;
        remarks: string;
        assignedBy: string;
    };
    driverAssignmentDeparture?: {
        dropRequired: string;
        driverName: string;
        driverContact: string;
        dropTo: string;
        dropDate: string;
        dropTime: string;
        remarks: string;
        assignedBy: string;
    };
    guestRequirementVerification?: {
        doctorAssignedToClient: string;
        email: string;
        timestamp: string;
        doctorAssignStatus: string;
        changedDoctor: string;
        remarks: string;
    };
}