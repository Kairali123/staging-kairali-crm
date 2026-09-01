export interface Booking {
  // Identity & Timing
  id: string
  timestamp: string
  bookingDateTime: string
  reservationId: string
  guestId?: string
  editId?: string
  clientName: string
  dialCountryCode?: string
  mobile: string
  email?: string
  gender?: "MALE" | "FEMALE" | "OTHER"
  arrivalDate: string
  departureDate: string
  daysOfStay: number
  checkinMonth?: string
  planned?: string
  actual?: string
  timeDelayMins?: number

  // Location & Billing
  billingAddress?: string
  country?: string
  state?: string
  district?: string

  // Stay & Package
  programPackageName?: string
  roomNo?: string
  roomType?: string
  roomCategory?: string
  adults?: number
  male?: number
  female?: number
  children?: number
  guestStatus?: string
  guestHistoryNote?: string

  // Commercials & Ownership
  invoiceAmount?: number
  bookingTakenBy?: string
  bookingStatus: "CONFIRMED" | "CANCELLED" | "ON_HOLD"
  companyName?: string
  paymentTerms?: string
  clientCategory?: string
  clientType?: string
  groupBookingPeople?: number
  attendeesBystander?: string
  repeatClient?: boolean
  purposeOfStay?: string
  bookingType?: string
  currency?: string
  inrValue?: number
  dataSource?: string

  // Documents & Links
  uploadTestReportsLink?: string
  piNumber?: string
  piLink?: string
  piHistoryLink?: string
  fullEditHistory?: string[]

  // Payments (Ledger)
  payments: Payment[]
  totalReceivedAmount: number
  percentReceived: number
  pendingAmount: number
  advance?: number
  balance?: number
  totalBookingAmountBeforeDiscount?: number
  discountAmount?: number
  discountPercent?: number

  // Approvals
  approvals: Approval[]
  approvalsMeta?: {
    approvalGivenDate?: string
    approvedTill?: string
    approvedBy?: string
    approvalScreenshot?: string
    remarks?: string
    approvalStatus?: "HOLD" | "APPROVED"
  }

  // ML / Finalization
  ml?: {
    finalBookingStatus?: string
    remarks?: string
    summary?: string
    finalEscalation?: string
    daysTo40Percent?: number
    daysTo100Percent?: number
  }

  // Alerts & Escalations
  alerts: AlertFlags

  // Operational Transfers
  ops?: {
    transferToAccountsVerify?: boolean
    transferToDeleteSheet?: boolean
    nbdCrrStatus?: string
  }

  // Booker Details
  bookerDetails?: {
    nameOfBooker?: string
    bookerEmail?: string
    bookerPhone?: string
  }

  // Stage tracking
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7
  stageUpdatedAt: string
}

export interface Payment {
  id: string
  receivedDateTime: string
  receivedAmount: number
  paymentMode?: string
  receiptTransactionNumber?: string
  uploadedScreenshot?: string
  paymentCollectionLocation?: string
  paymentCollectionBy?: string
  paymentCollectionHistoryLink?: string
}

export interface Approval {
  id: string
  givenDate?: string
  approvedTill?: string
  approvedBy?: string
  approvalScreenshot?: string
  remarks?: string
  status?: "HOLD" | "APPROVED"
}

export interface AlertFlags {
  createHelpTicketBelowThreshold?: boolean
  whatsappBookingReceived?: boolean
  whatsappBelow40?: boolean
  whatsappBelow100?: boolean
  emailBookingReceived?: boolean
  emailBelow40?: boolean
  emailBelow100?: boolean
  autoReleaseStatus?: string
  sentToAutoReleaseStatus?: string
  hsEscalateDiscountOver15?: boolean
  hsCreateStatusBookingCancelled?: boolean
}

export interface HelpTicket {
  id: string
  reason: string
  assignee: string
  slaMins?: number
  status: "OPEN" | "IN_PROGRESS" | "CLOSED"
  createdAt: string
  updatedAt: string
}

// Chart data types
export interface StageCount {
  stage: string
  count: number
  amount: number
}

export interface PaymentPoint {
  dateISO: string
  received: number
  target?: number
}

export interface SourceMix {
  source: string
  count: number
  percentage: number
}

// User roles for the booking system
export type BookingRole =
  | "ADMIN"
  | "RESERVATIONS"
  | "ACCOUNTS"
  | "ML_SALES_LEAD"
  | "FRONT_OFFICE_PMS"
  | "DOCTOR_LIAISON"

export interface BookingUser {
  id: string
  name: string
  email: string
  role: BookingRole
  permissions: string[]
}
