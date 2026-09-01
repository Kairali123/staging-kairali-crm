export interface BookingDetails {
  arrivalDate: string;
  departureDate: string;
  nights: number;
  repeatGuest: 'Yes' | 'No' | '';
  packageType: 'rack' | 'net' | '';
  programme: string;
  roomType: string;
  roomNumber: string;
  occupancy: 'Single' | 'Double' | '';
}

export interface GuestData {
  guestNumber: number;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  countryCode: string;
  contact: string;
  email: string;
  anniversary: string;
  nationality: string;
  country: string;
  state: string;
  zip: string;
  address: string;
  bookingDetails?: BookingDetails;
}

export interface GroupGuestData extends GuestData {
  editId?: string;
  patientId?: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  repeatGuest: 'Yes' | 'No' | '';
  packageType: string;
  programme: string;
  roomType: string;
  roomNumber: string;
  occupancy: string;
}

export interface RoomData {
  roomNumber: string;
  roomType: string;
  guests: GroupGuestData[];
}

export interface ChildData {
  childNumber: number;
  name: string;
  age: string;
}

export interface GroupInfo {
  pax: string;
  name: string;
  referenceBy: string;
  country: string;
  phone: string;
  email: string;
}

export interface TravelAgentInfo {
  hasAgent: boolean;
  name: string;
  countryCode?: string;
  mobile: string;
  email: string;
  category: string;
  commission: string;
  remarks: string;
}

export interface ServiceCharge {
  description: string;
  amount: string;
  discount: string;
  total: string;
}

export interface PaymentBreakdown {
  currency: string;
  roomRate: string;
  roomDiscountType: 'fixed' | 'percentage' | '';
  roomDiscount: string;
  roomAfterDiscount: string;
  roomTotal: string;

  foodRate: string;
  foodDiscountType: 'fixed' | 'percentage' | '';
  foodDiscount: string;
  foodAfterDiscount: string;
  foodTotal: string;

  treatmentRate: string;
  treatmentDiscountType: 'fixed' | 'percentage' | '';
  treatmentDiscount: string;
  treatmentAfterDiscount: string;
  treatmentTotal: string;

  transportationCost: string;
  transportationDiscountType: 'fixed' | 'percentage' | '';
  transportationDiscount: string;
  transportationTotal: string;

  // Tax (CGST/SGST) rates per component (%)
  treatmentTaxRate: string;
  roomTaxRate: string;
  foodTaxRate: string;
  transportationTaxRate: string;

  // Payment Collection Reminder date
  paymentCollectionReminder: string;

  // Child amount (ages 5-12 x nights) — needed on the invoice as its own line
  childRate?: string;

  // Notes fields — must reach the backend so they appear on the invoice
  transportationNotes?: string;
  otherAmountNotes?: string;
  grandTotalNotes?: string;

  // Flat "Other Amount" fields for the invoice (single-row bridge)
  otherAmountDescription?: string;
  otherAmountRate?: string;
  otherAmountDiscount?: string;
  otherAmountDiscountType?: string;
  otherAmountTotal?: string;

  otherCharges: ServiceCharge[];

  subTotalRate: string;
  subTotalDiscountType: 'fixed' | 'percentage' | '';
  subTotalDiscount: string;
  subTotalAfterDiscount: string;
  subtotal: string;
  grandTotalBeforeDiscount: string;
  grandTotalDiscountType: 'fixed' | 'percentage' | '';
  grandTotalDiscount: string;
  finalTotal: string;
  grandTotal: string;
  discountPercentage: string;
}

export interface PaxAmount {
  paxNumber: number;
  roomAmount: number;
  treatmentAmount: number;
  totalPerPax: number;
}

export interface PaxAmountBreakdown {
  count: number;
  breakdown: PaxAmount[];
}

export interface AdvancePayment {
  isAdvancePayment: boolean;
  isComplementary: boolean;
  isVoucher: boolean;
  currency?: string;
  paymentMode: string;
  transactionNo: string;
  screenshotName: string;
  screenshotBase64: string;
  screenshotType: string;
  amount: string;
  totalReceived?: string;
  totalAmount?: string;
  percentage?: string;
  pending?: string;
  remarks: string;
  paymentReceivedDate?: string;
  paymentLocation?: string;
  paymentCollectionBy?: string;
}

export interface ApprovalInfo {
  isApprovalRequired: boolean;
  approvedBy: string;
  screenshotName: string;
  screenshotBase64: string;
  screenshotType: string;
  remarks: string;
  approvalGivenDate?: string;
  approvalValidTillDate?: string;
}

export interface FullBookingPayload {
  bookingId: string;
  submissionDate: string;
  bookingType: 'individual' | 'group';
  bookingEditStatus: string;
  bookingTakenBy: string;

  // Individual Booking details
  primaryGuest?: GuestData;
  bookingDetails?: BookingDetails;
  secondaryGuests?: GuestData[];
  children?: {
    count: number;
    details: ChildData[];
  };

  // Group Booking details
  groupInfo?: GroupInfo;
  groupGuests?: GroupGuestData[];

  // Shared sections
  additionalInfo?: {
    clientCategory: string;
    clientType: string;
    paymentTerms: string;
    dataSource: string;
    referredBy: string;
    transportation: string;
  };
  travelAgent?: TravelAgentInfo;
  payment?: PaymentBreakdown;
  paxAmounts?: PaxAmountBreakdown;
  advancePayment?: AdvancePayment;
  approval?: ApprovalInfo;
}

export interface DropdownOptions {
  countries: string[];
  states: Record<string, string[]>;
  programmes: string[];
  dataSources: string[];
  paymentTerms: string[];
  clientTypes: string[];
  clientCategories: string[];
  travelAgents: { name: string; email: string; contact: string; commission: string; category: string }[];
}
