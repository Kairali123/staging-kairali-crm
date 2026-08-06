"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./BookingForm.css";
import Loader from "@/components/Loader";
import { BackButton } from "@/components/back-button";
import { CalendarPlus } from "lucide-react";
import { ClipboardPen } from "lucide-react";
import { useBookingPricing } from "./useBookingPricing";
import type { GuestData, GroupGuestData, RoomData, ChildData, GroupInfo, TravelAgentInfo, AdvancePayment, ApprovalInfo, BookingDetails, ServiceCharge } from "./types";
import {
  DATA_API, SUBMIT_API, emptyGuest, emptyGroupGuest, emptyTravelAgent, emptyAdvancePayment, emptyApproval,
  IND_STEPS, GRP_STEPS, ROOM_MAX_PAX, DEFAULT_COUNTRY_STATE_MAP, COUNTRY_CODES, validatePhoneForCountry,
  TODAY_ISO, sanitizeAddress, containsUnsafeInput,
  MAX_NAME_LEN, MAX_NATIONALITY_LEN, MAX_ZIP_LEN, MAX_ADDRESS_LEN,
  MAX_REFERRED_BY_LEN, MAX_HEALTH_INFO_LEN,
  sanitizeHealthInformation, validateReferredBy, validateHealthInformation, validateGoogleDriveLink,
  validateNameField, validateNationality, validateZip, validateAddress,
  validateDOB, validateAnniversary, validateArrivalDate, validateChildName,
  validateApprovalRemarks,
} from "./BookingFormBase";
import { Step0PrimaryGuest, Step1SecondaryGuests, Step2Children } from "./BookingFormSteps1";
import { StepAdditionalInfo, StepTravelAgent, StepPaymentBreakdown, StepAdvancePayment, StepApproval, convertCurrency } from "./BookingFormSteps2";
import {useAuth} from '@/hooks/use-auth'


// Current date/time formatted for the "Last Updated" header badge
function now(): string {
  return new Date().toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function toDateInputValue(value: unknown): string {
  if (!value) return '';

  const pad = (part: string | number) => String(part).padStart(2, '0');
  const s = String(value).trim();
  if (!s) return '';

  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

  const slashDate = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const first = Number(slashDate[1]);
    const second = Number(slashDate[2]);
    const year = slashDate[3];
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const d = value instanceof Date ? value : new Date(s);
  if (isNaN(d.getTime())) return '';

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normalizeCurrencyCode(value: unknown): string {
  const code = String(value ?? '').trim().toUpperCase();
  if (!code) return '';
  return code === 'EUR' ? 'EURO' : code;
}

function validateStep(step: number, state: any, bookingType: string): Record<string, string> {
  //return true
  const errs: Record<string, string> = {};
  const isIndividual = bookingType === "individual";
  // Type-safe "is filled" check — API-prefilled values can be numbers (e.g. commission 0.2),
  // and calling .trim() on a number throws, which silently killed the Next button.
  const filled = (v: any) => String(v ?? "").trim() !== "";

  if (isIndividual) {
    if (step === 0) {
      const g = state.primaryGuest as GuestData;
      if (!g.title) errs.title = "Required";
      { const nerr = validateNameField(g.firstName, "First Name"); if (nerr) errs.firstName = nerr; }
      if (g.middleName?.trim()) { const merr = validateNameField(g.middleName, "Middle Name"); if (merr) errs.middleName = merr; }
      if (g.lastName?.trim()) { const lerr = validateNameField(g.lastName, "Last Name"); if (lerr) errs.lastName = lerr; }
      if (!g.gender) errs.gender = "Required";
      if (!g.countryCode) errs.countryCode = "Required";
      if (!g.contact.trim()) errs.contact = "Required";
      else { const perr = validatePhoneForCountry(g.contact, g.countryCode); if (perr) errs.contact = perr; }
      if (!g.email.trim()) errs.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) errs.email = "Invalid email";
      { const derr = validateDOB(g.dob); if (derr) errs.dob = derr; }
      { const aerr = validateAnniversary(g.anniversary, g.dob); if (aerr) errs.anniversary = aerr; }
      { const naterr = validateNationality(g.nationality); if (naterr) errs.nationality = naterr; }
      if (!g.country) errs.country = "Required";
      if (!g.state) errs.state = "Required";
      { const zerr = validateZip(g.zip); if (zerr) errs.zip = zerr; }
      { const adderr = validateAddress(g.address); if (adderr) errs.address = adderr; }

      // Booking Info is also on step 0 — validate it here
      const d = state.primaryBookingDetails as BookingDetails;
      { const arrErr = validateArrivalDate(d.arrivalDate); if (arrErr) errs.arrivalDate = arrErr; }
      if (!d.departureDate) errs.departureDate = "Required";
      if (d.arrivalDate && d.departureDate && d.departureDate <= d.arrivalDate) errs.departureDate = "Must be after arrival";
      if (!d.programme) errs.programme = "Required";
      if (!d.repeatGuest) errs.repeatGuest = "Required";
      if (!d.roomNumber || !d.roomNumber.trim()) errs.roomNumber = "Required";
    }
    if (step === 1) {
      // Secondary Guests step — validate each added guest's required fields
      const d = state.primaryBookingDetails as BookingDetails;
      const totalPax = 1 + state.secondaryGuests.length;
      const maxPax = ROOM_MAX_PAX[d.roomType] || 0;
      if (maxPax > 0 && totalPax > maxPax) errs.capacity = `Exceeds room max capacity (${maxPax})`;

      (state.secondaryGuests as GuestData[]).forEach((g, idx) => {
        const p = `guest${idx + 2}`;
        if (!g.title) errs[`${p}_title`] = "Required";
        { const nerr = validateNameField(g.firstName, "First Name"); if (nerr) errs[`${p}_firstName`] = nerr; }
        if (g.middleName?.trim()) { const merr = validateNameField(g.middleName, "Middle Name"); if (merr) errs[`${p}_middleName`] = merr; }
        if (g.lastName?.trim()) { const lerr = validateNameField(g.lastName, "Last Name"); if (lerr) errs[`${p}_lastName`] = lerr; }
        if (!g.gender) errs[`${p}_gender`] = "Required";
        if (!g.countryCode) errs[`${p}_countryCode`] = "Required";
        if (!g.contact.trim()) errs[`${p}_contact`] = "Required";
        else { const perr = validatePhoneForCountry(g.contact, g.countryCode); if (perr) errs[`${p}_contact`] = perr; }
        if (!g.email.trim()) errs[`${p}_email`] = "Required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) errs[`${p}_email`] = "Invalid email";
        { const derr = validateDOB(g.dob); if (derr) errs[`${p}_dob`] = derr; }
        { const aerr = validateAnniversary(g.anniversary, g.dob); if (aerr) errs[`${p}_anniversary`] = aerr; }
        { const naterr = validateNationality(g.nationality); if (naterr) errs[`${p}_nationality`] = naterr; }
        if (!g.country) errs[`${p}_country`] = "Required";
        if (!g.state) errs[`${p}_state`] = "Required";
        { const zerr = validateZip(g.zip); if (zerr) errs[`${p}_zip`] = zerr; }
        { const adderr = validateAddress(g.address); if (adderr) errs[`${p}_address`] = adderr; }
        const bd = g.bookingDetails;
        if (bd) {
          { const arrErr = validateArrivalDate(bd.arrivalDate); if (arrErr) errs[`${p}_arrivalDate`] = arrErr; }
          if (!bd.departureDate) errs[`${p}_departureDate`] = "Required";
          if (bd.arrivalDate && bd.departureDate && bd.departureDate <= bd.arrivalDate) errs[`${p}_departureDate`] = "Must be after arrival";
          if (!bd.programme) errs[`${p}_programme`] = "Required";
          if (!bd.repeatGuest) errs[`${p}_repeatGuest`] = "Required";
          if (!bd.roomNumber || !bd.roomNumber.trim()) errs[`${p}_roomNumber`] = "Required";
        }
      });
    }
    if (step === 2) {
      (state.children || []).forEach((c: any, idx: number) => {
        const p = `child${idx + 1}`;
        const nerr = validateChildName(c.name);
        if (nerr) errs[`${p}_name`] = `Child ${idx + 1}: ${nerr}`;
        if (!c.age || !String(c.age).trim()) {
          errs[`${p}_age`] = `Child ${idx + 1} Age is required`;
        }
      });
    }
  } else {
    if (step === 0) {
      const g = state.groupInfo as GroupInfo;
      if (!g.pax) errs.pax = "Required";
      // Group name may be a company/agency name (not a personal name), so only
      // guard against XSS/SQLi payloads and enforce a max length here.
      if (!g.name.trim()) errs.name = "Required";
      else if (containsUnsafeInput(g.name)) errs.name = "Group/Contact Name contains invalid characters";
      else if (g.name.trim().length > 100) errs.name = "Group/Contact Name must be under 100 characters";
      if (!g.country) errs.country = "Required";
      const phoneDigits = (g.phone || "").replace(/\D/g, "");
      if (!g.phone.trim()) errs.phone = "Mobile Number is required";
      else if (phoneDigits.length < 7) errs.phone = "Enter a valid mobile number (at least 7 digits)";
      else if (phoneDigits.length > 15) errs.phone = "Mobile number must not exceed 15 digits";
      if (!g.email.trim()) errs.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) errs.email = "Invalid email";
    }
    if (step === 1) {
      // Validate each guest in each room
      const rooms: RoomData[] = state.groupRooms || [];
      const expectedRoomCount: number = state.apiRoomCount || 0;
      if (rooms.length === 0) {
        errs.rooms = "No rooms assigned. Please go back and set Group Pax.";
      } else {
        // If we loaded from the API, the room count must match exactly
        if (expectedRoomCount > 0 && rooms.length !== expectedRoomCount) {
          errs.rooms = `Room count mismatch: the booking has ${expectedRoomCount} room${expectedRoomCount > 1 ? 's' : ''} on record, but ${rooms.length} room${rooms.length > 1 ? 's' : ''} ${rooms.length > expectedRoomCount ? 'were added' : 'remain'}. Please match the original room count.`;
        }
        for (let ri = 0; ri < rooms.length; ri++) {
          const room = rooms[ri];
          for (let gi = 0; gi < room.guests.length; gi++) {
            const g = room.guests[gi];
            const prefix = `Room ${room.roomNumber} Guest ${gi + 1}`;
            if (!g.title) { errs[`r${ri}_g${gi}_title`] = `${prefix}: Title required`; }
            { const nerr = validateNameField(g.firstName, "First Name"); if (nerr) errs[`r${ri}_g${gi}_firstName`] = `${prefix}: ${nerr}`; }
            if (g.middleName?.trim()) { const merr = validateNameField(g.middleName, "Middle Name"); if (merr) errs[`r${ri}_g${gi}_middleName`] = `${prefix}: ${merr}`; }
            if (g.lastName?.trim()) { const lerr = validateNameField(g.lastName, "Last Name"); if (lerr) errs[`r${ri}_g${gi}_lastName`] = `${prefix}: ${lerr}`; }
            if (!g.gender) { errs[`r${ri}_g${gi}_gender`] = `${prefix}: Gender required`; }
            if (!g.countryCode) { errs[`r${ri}_g${gi}_countryCode`] = `${prefix}: Country Code required`; }
            if (!g.contact?.trim()) { errs[`r${ri}_g${gi}_contact`] = `${prefix}: Contact required`; }
            else { const perr = validatePhoneForCountry(g.contact, g.countryCode); if (perr) { errs[`r${ri}_g${gi}_contact`] = `${prefix}: ${perr}`; } }
            if (!g.email?.trim()) { errs[`r${ri}_g${gi}_email`] = `${prefix}: Email required`; }
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) { errs[`r${ri}_g${gi}_email`] = `${prefix}: Invalid email`; }
            { const derr = validateDOB(g.dob); if (derr) errs[`r${ri}_g${gi}_dob`] = `${prefix}: ${derr}`; }
            { const aerr = validateAnniversary(g.anniversary, g.dob); if (aerr) errs[`r${ri}_g${gi}_anniversary`] = `${prefix}: ${aerr}`; }
            { const naterr = validateNationality(g.nationality); if (naterr) errs[`r${ri}_g${gi}_nationality`] = `${prefix}: ${naterr}`; }
            if (!g.country) { errs[`r${ri}_g${gi}_country`] = `${prefix}: Country required`; }
            if (!g.state) { errs[`r${ri}_g${gi}_state`] = `${prefix}: Province/State required`; }
            { const zerr = validateZip(g.zip); if (zerr) errs[`r${ri}_g${gi}_zip`] = `${prefix}: ${zerr}`; }
            { const adderr = validateAddress(g.address); if (adderr) errs[`r${ri}_g${gi}_address`] = `${prefix}: ${adderr}`; }
            { const arrErr = validateArrivalDate(g.arrivalDate); if (arrErr) errs[`r${ri}_g${gi}_arrivalDate`] = `${prefix}: ${arrErr}`; }
            if (!g.departureDate) { errs[`r${ri}_g${gi}_departureDate`] = `${prefix}: Departure Date required`; }
            if (g.arrivalDate && g.departureDate && g.departureDate <= g.arrivalDate) {
              errs[`r${ri}_g${gi}_departureDate`] = `${prefix}: Departure must be after arrival`;
            }
            if (!g.repeatGuest) { errs[`r${ri}_g${gi}_repeatGuest`] = `${prefix}: Repeat Guest required`; }
            if (!g.programme) { errs[`r${ri}_g${gi}_programme`] = `${prefix}: Programme required`; }
          }
        }
      }
    }
  }

  const addInfoStep = isIndividual ? 3 : 2;
  const taStep = isIndividual ? 4 : 3;
  const payStep = isIndividual ? 5 : 4;
  const advStep = isIndividual ? 6 : 5;
  const appStep = isIndividual ? 7 : 6;

  if (step === addInfoStep) {
    const ai = state.additionalInfo || {};
    if (!ai.clientCategory) errs.clientCategory = "Required";
    if (!ai.clientType) errs.clientType = "Required";
    if (!ai.paymentTerms) errs.paymentTerms = "Required";
    if (!ai.dataSource) errs.dataSource = "Required";
    if (!ai.transportationDetails) errs.transportationDetails = "Required";
    { const rerr = validateReferredBy(ai.referredBy); if (rerr) errs.referredBy = rerr; }
    { const herr = validateHealthInformation(ai.healthInformation); if (herr) errs.healthInformation = herr; }
    { const terr = validateGoogleDriveLink(ai.testReports); if (terr) errs.testReports = terr; }
  }

  if (step === taStep) {
    const ta = state.travelAgent as TravelAgentInfo;
    if (ta && ta.hasAgent) {
      if (!filled(ta.name)) errs.name = "Required";
      if (!filled(ta.mobile)) errs.mobile = "Required";
      else { const perr = validatePhoneForCountry(ta.mobile, ta.countryCode); if (perr) errs.mobile = perr; }
      if (!filled(ta.email)) errs.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(ta.email).trim())) errs.email = "Invalid email";
      if (!filled(ta.category)) errs.category = "Required";
      if (!filled(ta.commission)) errs.commission = "Required";
    }
  }

  if (step === payStep) {
    // If an Other Amount is entered, the service name (description) is mandatory
    const d = state.discounts || {};
    const otherAmt = parseFloat(d.otherAmountRate || "0") || 0;
    if (otherAmt > 0 && !filled(d.otherAmountDescription)) {
      errs.otherAmountDescription = "Service name is required when Other Amount is filled";
    }
    // Notes fields must not exceed 160 characters — block Next if they do
    if ((d.transportationNotes || "").length > 160) {
      errs.transportationNotes = "Transportation notes must not exceed 160 characters";
    }
    if ((d.otherAmountNotes || "").length > 160) {
      errs.otherAmountNotes = "Other amount notes must not exceed 160 characters";
    }
    if ((d.grandTotalNotes || "").length > 160) {
      errs.grandTotalNotes = "Grand total notes must not exceed 160 characters";
    }
  }

  if (step === advStep) {
    const ap = state.advancePayment as AdvancePayment;
    if (ap && ap.isAdvancePayment) {
      if (!filled(ap.paymentReceivedDate)) errs.paymentReceivedDate = "Required";
      if (!filled(ap.amount)) {
        errs.amount = "Required";
      } else if (parseFloat(ap.amount) < 0) {
        errs.amount = "Amount cannot be below 0";
      }
      if (!filled(ap.paymentMode)) errs.paymentMode = "Required";
      if (!filled(ap.transactionNo)) errs.transactionNo = "Required";
      if (!filled(ap.paymentLocation)) errs.paymentLocation = "Required";
      if (!filled(ap.paymentCollectionBy)) errs.paymentCollectionBy = "Required";
      if (!filled(ap.screenshotName)) errs.screenshotName = "Required";
    }
  }

  if (step === appStep) {
    const app = state.approval as ApprovalInfo;
    if (app && app.isApprovalRequired) {
      if (!filled(app.approvalGivenDate)) errs.approvalGivenDate = "Required";
      if (!filled(app.approvalValidTillDate)) {
        errs.approvalValidTillDate = "Required";
      } else if (filled(app.approvalGivenDate) && new Date(app.approvalValidTillDate) < new Date(app.approvalGivenDate)) {
        errs.approvalValidTillDate = "Valid Till Date must not be before Given Date";
      }
      if (!filled(app.approvedBy)) errs.approvedBy = "Required";
      if (!filled(app.screenshotName)) errs.screenshotName = "Required";
      { const reErr = validateApprovalRemarks(app.remarks); if (reErr) errs.remarks = reErr; }
    }
  }

  return errs;
}

// ─── Group Info Step ──────────────────────────────────────────────────────────
function StepGroupInfo({ info, onChange, errors, apiData, apiRoomCount = 0 }: { info: GroupInfo; onChange: (g: GroupInfo) => void; errors: Record<string, string>; apiData: any; apiRoomCount?: number; }) {
  const set = (k: keyof GroupInfo, v: string) => onChange({ ...info, [k]: v });
  return (
    <div className="kbf-card">
      <div className="kbf-card-header"><div className="kbf-card-step-no">1</div><i className="fas fa-users" /><h2>Group Booking — Group Details</h2>
        {apiRoomCount > 0 && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg,#0f4c81,#1a6daf)', color: '#fff',
            borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(15,76,129,0.25)', whiteSpace: 'nowrap',
          }}>
            <i className="fas fa-door-open" style={{ fontSize: 12 }} />
            {apiRoomCount} Room{apiRoomCount > 1 ? 's' : ''} on Record
          </div>
        )}
      </div>
      <div className="kbf-card-body">
        <div className="kbf-row1">
          <div className="kbf-group">
            <label className="kbf-label required">Group Pax</label>
            <select className={`kbf-select${errors.pax ? " error" : ""}`} value={info.pax} onChange={e => set("pax", e.target.value)}>
              <option value="">Select</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
            </select>
            {errors.pax && <span className="kbf-error-text">{errors.pax}</span>}
          </div>
          <div className="kbf-group">
            <label className="kbf-label required">Group Name</label>
            <input className={`kbf-input${errors.name ? " error" : ""}`} value={info.name} onChange={e => set("name", e.target.value)} />
            {errors.name && <span className="kbf-error-text">{errors.name}</span>}
          </div>
          <div className="kbf-group">
            <label className="kbf-label">Reference By</label>
            <input className="kbf-input" value={info.referenceBy} onChange={e => set("referenceBy", e.target.value)} />
          </div>
        </div>
        <div className="kbf-row1">
          <div className="kbf-group">
            <label className="kbf-label required">Country</label>
            <select className={`kbf-select${errors.country ? " error" : ""}`} value={info.country} onChange={e => set("country", e.target.value)}>
              <option value="">Select country</option>
              {Object.keys(apiData?.countryStateMap || DEFAULT_COUNTRY_STATE_MAP).map((c: string) => <option key={c}>{c}</option>)}
            </select>
            {errors.country && <span className="kbf-error-text">{errors.country}</span>}
          </div>
          <div className="kbf-group">
            <label className="kbf-label required">Mobile Number</label>
            <input className={`kbf-input${errors.phone ? " error" : ""}`} type="tel" inputMode="numeric" pattern="[0-9 +\-()]*" value={info.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. 9876543210" />
            {errors.phone && <span className="kbf-error-text">{errors.phone}</span>}
          </div>
          <div className="kbf-group">
            <label className="kbf-label required">Email</label>
            <input className={`kbf-input${errors.email ? " error" : ""}`} type="email" value={info.email} onChange={e => set("email", e.target.value)} />
            {errors.email && <span className="kbf-error-text">{errors.email}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Bridge the single "Other" charge row (stored in `discounts.otherAmount*`)
// into the ServiceCharge[] shape the pricing hook + payload expect.
function buildOtherCharges(d: any): ServiceCharge[] {
  const amt = parseFloat(d?.otherAmountRate || "0") || 0;
  const desc = String(d?.otherAmountDescription || "").trim().slice(0, 40);
  const notes = String(d?.otherAmountNotes || "").trim().slice(0, 160);
  // Previously the row was dropped whenever amount was 0/empty, which is why the
  // "Other Services" text never reached the invoice. Keep the row if EITHER the
  // amount or the description/notes has been filled in.
  if (!amt && !desc && !notes) return [];
  const discType = d.otherAmountDiscountType || "%";
  const rawDiscVal = parseFloat(d.otherAmountDiscount || "0") || 0;
  const discVal = discType === "%" || discType === "percentage"
    ? Math.min(100, Math.max(0, rawDiscVal))
    : Math.max(0, rawDiscVal);
  const after = discType === "cash"
    ? Math.max(0, amt - discVal)
    : Math.max(0, amt - (amt * discVal / 100));
  return [{
    description: desc || notes || "Other",
    amount: amt.toFixed(2),
    discount: discVal.toFixed(2),
    total: after.toFixed(2),
  }];
}

function emptyGroupGuestForRoom(num: number, roomNumber: string, roomType: string): GroupGuestData {
  return {
    guestNumber: num, title: "", firstName: "", middleName: "", lastName: "",
    dob: "", gender: "", countryCode: "", contact: "", email: "",
    anniversary: "", nationality: "", country: "", state: "", zip: "", address: "",
    arrivalDate: "", departureDate: "", nights: 0, repeatGuest: "", packageType: "rack",
    programme: "", roomType, roomNumber, occupancy: "Single",
  };
}

function GroupGuestForm({
  guest, onChange, roomNumber, programmes, apiData, errors = {},
}: {
  guest: GroupGuestData; onChange: (g: GroupGuestData) => void;
  roomNumber: string; programmes: string[]; apiData: any; errors?: Record<string, string>;
}) {
  const set = (k: keyof GroupGuestData, v: any) => onChange({ ...guest, [k]: v });
  const countryStateMap = apiData?.countryStateMap || DEFAULT_COUNTRY_STATE_MAP;
  const countries = Object.keys(countryStateMap);
  const states = guest.country ? (countryStateMap[guest.country] || ["Other"]) : [];

  // auto-calculate nights
  const calcNights = (a: string, d: string) => {
    if (!a || !d) return 0;
    const diff = (new Date(d).getTime() - new Date(a).getTime()) / 86400000;
    return Math.max(0, Math.round(diff));
  };

  const err = (k: string) => errors[k] ? " error" : "";

  return (
    <div style={{ border: `1px solid ${Object.keys(errors).length ? "#dc3545" : "#e0e0e0"}`, borderRadius: 8, padding: 16, marginBottom: 12, backgroundColor: "#fafafa" }}>
      {Object.keys(errors).length > 0 && (
        <div style={{ background: "#fff3f3", border: "1px solid #dc3545", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#dc3545" }}>
          <i className="fas fa-exclamation-triangle" /> Please fill all required fields for this guest.
        </div>
      )}
      <div className="kbf-row">
        <div className="kbf-group">
          <label className="kbf-label required">Title</label>
          <select className={`kbf-select${err("title")}`} value={guest.title} onChange={e => set("title", e.target.value)}>
            <option value="" disabled>-- Select --</option>
            {["MR.", "MRS.", "MS.", "MISS.", "DR.", "PROF"].map(t => <option key={t}>{t}</option>)}
          </select>
          {errors.title && <span className="kbf-error-text">{errors.title}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">First Name</label>
          <input className={`kbf-input${err("firstName")}`} value={guest.firstName} maxLength={MAX_NAME_LEN} pattern="[A-Za-z][A-Za-z '-]*" onChange={e => set("firstName", e.target.value)} />
          {errors.firstName && <span className="kbf-error-text">{errors.firstName}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label">Middle Name</label>
          <input className="kbf-input" value={guest.middleName} maxLength={MAX_NAME_LEN} pattern="[A-Za-z][A-Za-z '-]*" onChange={e => set("middleName", e.target.value)} />
        </div>
        <div className="kbf-group">
          <label className="kbf-label">Last Name</label>
          <input className="kbf-input" value={guest.lastName} maxLength={MAX_NAME_LEN} pattern="[A-Za-z][A-Za-z '-]*" onChange={e => set("lastName", e.target.value)} />
        </div>
      </div>
      {/* Row 2: DOB | Gender | Contact (span 2) — 4 cols */}
      <div className="kbf-row">
        <div className="kbf-group">
          <label className="kbf-label">Date of Birth</label>
          <input className={`kbf-input${err("dob")}`} type="date" value={guest.dob} max={TODAY_ISO} onChange={e => set("dob", e.target.value)} />
          {errors.dob && <span className="kbf-error-text">{errors.dob}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">Gender</label>
          <select className={`kbf-select${err("gender")}`} value={guest.gender} onChange={e => set("gender", e.target.value)}>
            <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
          </select>
          {errors.gender && <span className="kbf-error-text">{errors.gender}</span>}
        </div>
        <div className="kbf-group kbf-col-2">
          <label className="kbf-label required">Contact No.</label>
          <div className="kbf-phone-row">
            <select className={`kbf-select${err("countryCode")}`} value={guest.countryCode} onChange={e => set("countryCode", e.target.value)}>
              <option value="">-- Select Code --</option>
              {COUNTRY_CODES.map(c => (
                <option key={`${c.code}-${c.name}`} value={c.code}>{c.name}</option>
              ))}
            </select>
            <input className={`kbf-input${err("contact")}`} type="number" value={guest.contact} onChange={e => set("contact", e.target.value)} placeholder="Mobile number" />
          </div>
          {errors.countryCode && <span className="kbf-error-text">{errors.countryCode}</span>}
          {errors.contact && <span className="kbf-error-text">{errors.contact}</span>}
        </div>
      </div>
      {/* Row 3: Email | Anniversary | Nationality — 3 cols */}
      <div className="kbf-row cols-3">
        <div className="kbf-group">
          <label className="kbf-label required">Email</label>
          <input className={`kbf-input${err("email")}`} type="email" value={guest.email} onChange={e => set("email", e.target.value)} />
          {errors.email && <span className="kbf-error-text">{errors.email}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label">Date of Anniversary</label>
          <input className={`kbf-input${err("anniversary")}`} type="date" value={guest.anniversary} min={guest.dob || undefined} max={TODAY_ISO} onChange={e => set("anniversary", e.target.value)} />
          {errors.anniversary && <span className="kbf-error-text">{errors.anniversary}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label">Nationality</label>
          <input className={`kbf-input${err("nationality")}`} value={guest.nationality} maxLength={MAX_NATIONALITY_LEN} pattern="[A-Za-z][A-Za-z ]*" onChange={e => set("nationality", e.target.value)} />
          {errors.nationality && <span className="kbf-error-text">{errors.nationality}</span>}
        </div>
      </div>
      {/* Row 4: Country | State | Zip — 3 cols */}
      <div className="kbf-row cols-3">
        <div className="kbf-group">
          <label className="kbf-label required">Country</label>
          <select className={`kbf-select${err("country")}`} value={guest.country} onChange={e => onChange({ ...guest, country: e.target.value, state: "" })}>
            <option value="">-- Select Country --</option>
            {countries.map(c => <option key={c}>{c}</option>)}
          </select>
          {errors.country && <span className="kbf-error-text">{errors.country}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">Province/State</label>
          <select
            className={`kbf-select${err("state")}`}
            value={guest.state}
            onChange={e => set("state", e.target.value)}
            required
            disabled={!guest.country}
          >
            <option value="">{guest.country ? "Select State" : "Select Country First"}</option>
            {states.map((s: string) => <option key={s}>{s}</option>)}
          </select>
          {errors.state && <span className="kbf-error-text">{errors.state}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">Zip/Postcode</label>
          <input className={`kbf-input${err("zip")}`} value={guest.zip} maxLength={MAX_ZIP_LEN} onChange={e => set("zip", e.target.value)} />
          {errors.zip && <span className="kbf-error-text">{errors.zip}</span>}
        </div>
      </div>
      <div className="kbf-row">
        <div className="kbf-group" style={{ gridColumn: "1 / -1" }}>
          <label className="kbf-label required">Home Address</label>
          <textarea className={`kbf-textarea${err("address")}`} value={guest.address} maxLength={MAX_ADDRESS_LEN} onChange={e => set("address", sanitizeAddress(e.target.value))} rows={2} style={{ width: "100%" }} />
          {errors.address && <span className="kbf-error-text">{errors.address}</span>}
        </div>
      </div>
      {/* Row 5: Arrival | Departure | Nights — 3 cols */}
      <div className="kbf-row cols-3">
        <div className="kbf-group">
          <label className="kbf-label required">Arrival Date</label>
          <input className={`kbf-input${err("arrivalDate")}`} type="date" value={guest.arrivalDate} min={TODAY_ISO}
            onChange={e => onChange({ ...guest, arrivalDate: e.target.value, nights: calcNights(e.target.value, guest.departureDate) })} />
          {errors.arrivalDate && <span className="kbf-error-text">{errors.arrivalDate}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">Departure Date</label>
          <input className={`kbf-input${err("departureDate")}`} type="date" value={guest.departureDate} min={guest.arrivalDate || undefined}
            onChange={e => onChange({ ...guest, departureDate: e.target.value, nights: calcNights(guest.arrivalDate, e.target.value) })} />
          {errors.departureDate && <span className="kbf-error-text">{errors.departureDate}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label">No. of Nights</label>
          <input className="kbf-input" value={guest.nights || 0} readOnly style={{ backgroundColor: "#f0f0f0" }} />
          <span style={{ fontSize: 11, color: "#888" }}>Auto-calculated</span>
        </div>
      </div>
      {/* Row 6: Repeat Guest | Package Type | Programme/Package — 3 cols */}
      <div className="kbf-row cols-3">
        <div className="kbf-group">
          <label className="kbf-label required">Repeat Guest</label>
          <select className={`kbf-select${err("repeatGuest")}`} value={guest.repeatGuest} onChange={e => set("repeatGuest", e.target.value as any)}>
            <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
          </select>
          {errors.repeatGuest && <span className="kbf-error-text">{errors.repeatGuest}</span>}
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">Package Type</label>
          <div className="kbf-radio-group">
            <label className="kbf-radio-label">
              <input type="radio" name={`pkg-${roomNumber}-${guest.guestNumber}`} value="rack" checked={guest.packageType === "rack"} onChange={() => set("packageType", "rack")} />
              Rack Rate
            </label>
            <label className="kbf-radio-label">
              <input type="radio" name={`pkg-${roomNumber}-${guest.guestNumber}`} value="net" checked={guest.packageType === "net"} onChange={() => set("packageType", "net")} disabled />
              Net Rate
            </label>
          </div>
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">Programme/Package</label>
          <select className={`kbf-select${err("programme")}`} value={guest.programme} onChange={e => set("programme", e.target.value)}>
            <option value="">-- select --</option>
            {programmes.map(p => <option key={p}>{p}</option>)}
          </select>
          {errors.programme && <span className="kbf-error-text">{errors.programme}</span>}
        </div>
      </div>
      {/* Row 7: Room Type | Room No. | Occupancy — 3 cols */}
      <div className="kbf-row cols-3">
        <div className="kbf-group">
          <label className="kbf-label">Room Type</label>
          <input className="kbf-input" value={guest.roomType} readOnly style={{ backgroundColor: "#f0f0f0" }} />
        </div>
        <div className="kbf-group">
          <label className="kbf-label">Room No.</label>
          <input className="kbf-input" value={guest.roomNumber} readOnly style={{ backgroundColor: "#f0f0f0" }} />
        </div>
        <div className="kbf-group">
          <label className="kbf-label required">Occupancy</label>
          <div className="kbf-radio-group">
            <label className="kbf-radio-label">
              <input type="radio" name={`occ-${roomNumber}-${guest.guestNumber}`} value="Single" checked={guest.occupancy === "Single"} onChange={() => set("occupancy", "Single")} />
              Single
            </label>
            <label className="kbf-radio-label">
              <input type="radio" name={`occ-${roomNumber}-${guest.guestNumber}`} value="Double" checked={guest.occupancy === "Double"} onChange={() => set("occupancy", "Double")} />
              Double
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepGroupGuests({
  rooms, onChange, programmes, apiData, errors = {}, roomMaxPaxMap = {},
}: {
  rooms: RoomData[]; onChange: (rooms: RoomData[]) => void;
  programmes: string[]; apiData: any; errors?: Record<string, string>; roomMaxPaxMap?: Record<string, number>;
}) {
  const [copyFromFirstRoomFlags, setCopyFromFirstRoomFlags] = useState<Record<number, boolean>>({});
  const snapshotsRef = useRef<Record<number, GroupGuestData>>({});

  const updateRoom = (ri: number, r: RoomData) => { const arr = [...rooms]; arr[ri] = r; onChange(arr); };

  const handleCopyFromFirstRoomChange = (ri: number, checked: boolean) => {
    const room = rooms[ri];
    if (!room || !room.guests || room.guests.length === 0) return;

    if (checked) {
      const source = rooms[0]?.guests[0];
      if (!source) return;

      const target = room.guests[0];
      snapshotsRef.current[ri] = { ...target };

      const updatedGuests = [...room.guests];
      updatedGuests[0] = {
        ...source,
        guestNumber: target.guestNumber,
        roomNumber: target.roomNumber,
        roomType: target.roomType,
        patientId: target.patientId,
        editId: target.editId,
      };

      updateRoom(ri, { ...room, guests: updatedGuests });
      setCopyFromFirstRoomFlags(prev => ({ ...prev, [ri]: true }));
    } else {
      const snapshot = snapshotsRef.current[ri];
      const target = room.guests[0];
      if (snapshot) {
        const updatedGuests = [...room.guests];
        updatedGuests[0] = {
          ...snapshot,
          guestNumber: target.guestNumber,
          roomNumber: target.roomNumber,
          roomType: target.roomType,
          patientId: target.patientId,
          editId: target.editId,
        };
        updateRoom(ri, { ...room, guests: updatedGuests });
      }
      setCopyFromFirstRoomFlags(prev => ({ ...prev, [ri]: false }));
      delete snapshotsRef.current[ri];
    }
  };
  const addGuest = (ri: number) => {
    const room = rooms[ri];
    const newGuestNum = room.guests.length + 1;
    const newGuest = emptyGroupGuestForRoom(newGuestNum, room.roomNumber, room.roomType);

    // Auto-generate unique Patient ID and Edit ID for secondary guests based on destination room's primary guest
    const primaryGuest = room.guests[0];
    if (primaryGuest) {
      const counter = newGuestNum - 1; // secondary guest counter (1, 2, 3...)
      const basePatientId = primaryGuest.patientId || primaryGuest.editId || "";
      const baseEditId = primaryGuest.editId || primaryGuest.patientId || "";

      if (basePatientId) {
        newGuest.patientId = `S${counter}${basePatientId}`;
      }
      if (baseEditId) {
        newGuest.editId = `S${counter}${baseEditId}`;
      }
    }

    updateRoom(ri, { ...room, guests: [...room.guests, newGuest] });
  };
  const removeGuest = (ri: number, gi: number) => {
    const room = rooms[ri];
    const updated = room.guests.filter((_, i) => i !== gi).map((g, i) => ({ ...g, guestNumber: i + 1 }));
    updateRoom(ri, { ...room, guests: updated });
  };
  // Copy Guest-1 (first guest of the room) data into another guest of the same room
  const copyFromFirstGuest = (ri: number, gi: number) => {
    const room = rooms[ri];
    const source = room.guests[0];
    if (!source) return;
    const target = room.guests[gi];
    const updated = [...room.guests];
    updated[gi] = {
      ...source,
      guestNumber: target.guestNumber, // keep own guest number
      roomNumber: target.roomNumber,   // keep own room assignment
      roomType: target.roomType,       // keep own room type
      patientId: target.patientId,     // keep own patient ID
      editId: target.editId,           // keep own edit ID
    };
    updateRoom(ri, { ...room, guests: updated });
  };

  if (rooms.length === 0) {
    return (
      <div className="kbf-card">
        <div className="kbf-card-header"><div className="kbf-card-step-no">2</div><i className="fas fa-users" /><h2>Guest Info (Per Room)</h2></div>
        <div className="kbf-card-body" style={{ textAlign: "center", color: "#888", padding: 40 }}>
          <i className="fas fa-bed" style={{ fontSize: 40, marginBottom: 12, display: "block" }} />
          No rooms assigned. Please go back and set Group Pax first, then rooms will be auto-assigned from API.
        </div>
      </div>
    );
  }

  return (
    <div>
      {rooms.map((room, ri) => (
        <div key={ri} className="kbf-card" style={{ marginBottom: 20 }}>
          {/* Room Header */}
          <div className="kbf-card-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="kbf-card-step-no">2</div>
              <i className="fas fa-bed" />
              <h2>Room {ri + 1} (Room No: {room.roomNumber})</h2>
            </div>
            <span style={{
              backgroundColor: "#1e3a5f", color: "#fff", borderRadius: 20,
              padding: "3px 12px", fontSize: 12, fontWeight: 700
            }}>
              {room.guests.length} / {roomMaxPaxMap[room.roomType] || 3} Guests
            </span>
          </div>
          <div className="kbf-card-body">
            {ri > 0 && (
              <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #e0e0e0" }}>
                <label className="kbf-radio-label" style={{ fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!copyFromFirstRoomFlags[ri]}
                    onChange={e => handleCopyFromFirstRoomChange(ri, e.target.checked)}
                    style={{ accentColor: "#254D3A", width: 15, height: 15 }}
                  />
                  Copy details from Room 1 Guest 1
                </label>
              </div>
            )}
            {/* Guests inside this room */}
            {room.guests.map((guest, gi) => (
              <div key={gi}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#3a4a1e", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="fas fa-user" />
                    Guest - {gi + 1}
                  </div>
                  {room.guests.length > 1 && (
                    <button type="button" onClick={() => removeGuest(ri, gi)} className="kbf-remove-btn">
                      <i className="fas fa-trash" /> Remove
                    </button>
                  )}
                </div>
                {/* Copy from Guest 1 — only shown for guests after the first in this room */}
                {gi > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <label className="kbf-radio-label" style={{ fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        onChange={e => { if (e.target.checked) copyFromFirstGuest(ri, gi); }}
                        style={{ accentColor: "#254D3A", width: 15, height: 15 }}
                      />
                      Copy from Guest 1
                    </label>
                  </div>
                )}
                <GroupGuestForm
                  guest={guest}
                  onChange={ng => {
                    const updated = [...room.guests];
                    updated[gi] = ng;
                    updateRoom(ri, { ...room, guests: updated });
                  }}
                  roomNumber={room.roomNumber}
                  programmes={programmes}
                  apiData={apiData}
                  errors={Object.fromEntries(
                    Object.entries(errors)
                      .filter(([k]) => k.startsWith(`r${ri}_g${gi}_`))
                      .map(([k, v]) => [k.replace(`r${ri}_g${gi}_`, ""), v])
                  )}
                />
              </div>
            ))}
            {/* Add Guest Button */}
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                type="button"
                className="kbf-add-btn"
                onClick={() => addGuest(ri)}
                style={{ padding: "8px 24px" }}
              >
                <i className="fas fa-plus" /> Add Guest to Room {room.roomNumber}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Review Step ──────────────────────────────────────────────────────────────
function StepReview({ bookingType, primaryGuest, primaryBookingDetails, groupInfo, pricing, advancePayment }: any) {
  const pb = pricing?.paymentBreakdown;
  const bookingCurrency = pb?.currency || "INR";
  const advCurrency = advancePayment?.currency || bookingCurrency;

  const grandTotalNum = parseFloat(pb?.grandTotal || "0");
  const receivedNum = advancePayment?.isAdvancePayment
    ? (parseFloat(advancePayment?.amount || "0") || 0)
    : (parseFloat(advancePayment?.totalReceived || "0") || 0);
  
  // Convert received amount from advance currency to booking currency for subtraction
  const receivedNumInBookingCurrency = convertCurrency(receivedNum, advCurrency, bookingCurrency);
  const balanceDue = Math.max(0, grandTotalNum - receivedNumInBookingCurrency).toFixed(2);

  return (
    <div className="kbf-card">
      <div className="kbf-card-header"><div className="kbf-card-step-no"><i className="fas fa-check" /></div><h2>Review & Submit</h2></div>
      <div className="kbf-card-body">
        {bookingType === "individual" && primaryGuest && (
          <table className="kbf-review-table" style={{ marginBottom: 16 }}>
            <thead><tr><th colSpan={2}>Guest Summary</th></tr></thead>
            <tbody>
              <tr><td>Name</td><td>{primaryGuest.title} {primaryGuest.firstName} {primaryGuest.lastName}</td></tr>
              <tr><td>Email</td><td>{primaryGuest.email}</td></tr>
              <tr><td>Contact</td><td>{primaryGuest.countryCode} {primaryGuest.contact}</td></tr>
              <tr><td>Arrival</td><td>{primaryBookingDetails?.arrivalDate}</td></tr>
              <tr><td>Departure</td><td>{primaryBookingDetails?.departureDate}</td></tr>
              <tr><td>Nights</td><td>{primaryBookingDetails?.nights}</td></tr>
              <tr><td>Programme</td><td>{primaryBookingDetails?.programme}</td></tr>
            </tbody>
          </table>
        )}
        {bookingType === "group" && groupInfo && (
          <table className="kbf-review-table" style={{ marginBottom: 16 }}>
            <thead><tr><th colSpan={2}>Group Summary</th></tr></thead>
            <tbody>
              <tr><td>Group Name</td><td>{groupInfo.name}</td></tr>
              <tr><td>Pax</td><td>{groupInfo.pax}</td></tr>
              <tr><td>Email</td><td>{groupInfo.email}</td></tr>
            </tbody>
          </table>
        )}
        {pb && (
          <table className="kbf-review-table">
            <thead><tr><th colSpan={2}>Payment Summary</th></tr></thead>
            <tbody>
              <tr><td>Treatment Total</td><td>{pb.treatmentTotal} {bookingCurrency}</td></tr>
              <tr><td>Room Total</td><td>{pb.roomTotal} {bookingCurrency}</td></tr>
              <tr><td>Food Total</td><td>{pb.foodTotal} {bookingCurrency}</td></tr>
              {parseFloat(pb.childRate || "0") > 0 && (
                <tr><td>Child Amount</td><td>{pb.childRate} {bookingCurrency}</td></tr>
              )}
              <tr><td>Transportation</td><td>{pb.transportationTotal} {bookingCurrency}</td></tr>
              {(pb.otherCharges || []).map((c: any, i: number) => (
                <tr key={`oc-${i}`}><td>Other — {c.description}</td><td>{c.total} {bookingCurrency}</td></tr>
              ))}
              <tr><td><strong>Grand Total</strong></td><td><strong>{pb.grandTotal} {bookingCurrency}</strong></td></tr>
              <tr><td>Discount %</td><td>{pb.discountPercentage}%</td></tr>
              <tr>
                <td>Advance Received</td>
                <td>
                  {receivedNum.toFixed(2)} {advCurrency}
                  {advCurrency !== bookingCurrency && (
                    <span style={{ fontSize: "12px", color: "#666", marginLeft: "8px" }}>
                      ({receivedNumInBookingCurrency.toFixed(2)} {bookingCurrency})
                    </span>
                  )}
                </td>
              </tr>
              <tr><td><strong>Balance Due</strong></td><td><strong>{balanceDue} {bookingCurrency}</strong></td></tr>
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10, padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px", backgroundColor: "#fafafa" }}>
          <input type="checkbox" id="final-review" defaultChecked required style={{ width: 18, height: 18, cursor: "pointer" }} />
          <label htmlFor="final-review" style={{ fontSize: 14, fontWeight: "600", cursor: "pointer", color: "#333" }}>
            I confirm all information is accurate and ready to submit <span style={{ color: "#d9534f" }}>*</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Main BookingForm Component ───────────────────────────────────────────────
interface BookingFormProps {
  bookingId?: string;
  formType?: "individual" | "group";
  onSuccess?: (bookingId: string) => void;
}

export default function BookingForm({ bookingId, formType = "individual", onSuccess }: BookingFormProps) {
  const [bookingType, setBookingType] = useState<"individual" | "group">(formType);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouCountdown, setThankYouCountdown] = useState(3);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiData, setApiData] = useState<any>(null);
  const [lastUpd] = useState(now());

  const { user, hasActionPermission } = useAuth()

  // Individual form state
  const [primaryGuest, setPrimaryGuest] = useState<GuestData>(emptyGuest(1));
  const [primaryBookingDetails, setPrimaryBookingDetails] = useState<BookingDetails>({ arrivalDate: "", departureDate: "", nights: 0, repeatGuest: "", packageType: "rack", programme: "", roomType: "", roomNumber: "", occupancy: "Single" });
  const [secondaryGuests, setSecondaryGuests] = useState<GuestData[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Group form state
  const [groupInfo, setGroupInfo] = useState<GroupInfo>({ pax: "", name: "", referenceBy: "", country: "", phone: "", email: "" });
  const [groupGuests, setGroupGuests] = useState<GroupGuestData[]>([]);
  const [groupRooms, setGroupRooms] = useState<RoomData[]>([]);
  const [resId, setResId] = useState<string>("");

  const hasIndividualData = !!bookingId ||
    (primaryGuest.firstName || "").trim() !== "" ||
    (primaryGuest.lastName || "").trim() !== "" ||
    (primaryGuest.contact || "").trim() !== "" ||
    (primaryGuest.email || "").trim() !== "" ||
    secondaryGuests.length > 0 ||
    children.length > 0;

  const hasGroupData = !!bookingId ||
    (groupInfo.name || "").trim() !== "" ||
    (groupInfo.pax || "").trim() !== "" ||
    (groupInfo.phone || "").trim() !== "" ||
    (groupInfo.email || "").trim() !== "";

  // Shared
  const [additionalInfo, setAdditionalInfo] = useState<any>({});
  const [travelAgent, setTravelAgent] = useState<TravelAgentInfo>(emptyTravelAgent());
  const [discounts, setDiscounts] = useState<any>({ roomDiscountType: "%", roomDiscount: "0", foodDiscountType: "%", foodDiscount: "0", treatmentDiscountType: "%", treatmentDiscount: "0", transportationCost: "0", transportationDiscountType: "%", transportationDiscount: "0", subTotalDiscountType: "%", subTotalDiscount: "0", grandTotalDiscountType: "%", grandTotalDiscount: "0" });
  const [currency, setCurrency] = useState("INR");
  const [otherCharges, setOtherCharges] = useState<ServiceCharge[]>([]);
  const [advancePayment, setAdvancePayment] = useState<AdvancePayment>(emptyAdvancePayment());
  const [approval, setApproval] = useState<ApprovalInfo>(emptyApproval());
  const hasLoadedData = useRef(false);
  const hasLoadedBooking = useRef(false);
  const groupPrefillDone = useRef(false);
  const apiRoomCount = useRef<number>(0); // rooms count as loaded from API (edit mode only)

  // Alphabetical ascending order for the Treatment/Programme/Package dropdown
  const programmes = apiData?.AllRackPackages
    ? Object.keys(apiData.AllRackPackages).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    : [];
  const steps = bookingType === "individual" ? IND_STEPS : GRP_STEPS;

  // Pricing hook
  const pricing = useBookingPricing({
    bookingType, currency, packageType: primaryBookingDetails.packageType,
    taName: travelAgent.name, bookingDetails: primaryBookingDetails,
    secondaryGuests, children, groupInfo, groupGuests, groupRooms, apiData,
    ...discounts, otherCharges: buildOtherCharges(discounts),
    isComplementary: advancePayment.isComplementary,
    isVoucher: advancePayment.isVoucher,
  });

  // Prevent the browser default where scrolling the mouse wheel over a
  // focused <input type="number"> silently increments/decrements its value.
  // This was causing discount/rate fields to change without the user
  // knowingly editing them (e.g. scrolling past a focused field), which then
  // made totals differ between the Payment Breakdown and Review screens even
  // though the underlying calculation logic was correct.
  useEffect(() => {
    const blurNumberInputOnWheel = (e: WheelEvent) => {
      const el = document.activeElement as HTMLInputElement | null;
      if (el && el.tagName === "INPUT" && el.type === "number") {
        el.blur();
      }
    };
    document.addEventListener("wheel", blurNumberInputOnWheel, { passive: true });
    return () => document.removeEventListener("wheel", blurNumberInputOnWheel);
  }, []);

  // Fetch API data on mount
  useEffect(() => {
    if (hasLoadedData.current) return;
    hasLoadedData.current = true;

    const userInfo = typeof window !== "undefined" ? user : null;//typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("kairali_user") || "null") : null;
    const authToken = typeof window !== "undefined" ? sessionStorage.getItem("authToken") : null;

    async function loadData() {
      try {
        const res = await fetch(DATA_API);
        const json = await res.json();
        setApiData(json.data || json);
      } catch { /* silent fallback */ }
      setLoading(false);
    }
    loadData();
  }, []);

  // Thank-you modal: auto-redirect countdown (3s), then close + call onSuccess
  useEffect(() => {
    if (!showThankYou) return;
    setThankYouCountdown(3);
    const interval = setInterval(() => {
      setThankYouCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowThankYou(false);
          if (onSuccess) onSuccess(bookingId || "");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showThankYou]);


  // Prefill from API when bookingId is provided
  useEffect(() => {
    if (!bookingId || !apiData || hasLoadedBooking.current) return;
    hasLoadedBooking.current = true;

    async function loadBookingById() {
      try {
        setLoading(true);
        const res = await fetch(`${DATA_API}?id=${bookingId}&formType=${formType}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const raw = await res.json();

        // The API returns an object whose first key is the booking key
        const bookingKey = Object.keys(raw)[0];
        const bd = raw[bookingKey];
        if (!bd) return;

        // ── Shared normalizers for TouchQ/API prefill ────────────────────────
        // <input type="date"> only accepts yyyy-mm-dd. TouchQ returns full date
        // strings, so DOB/Anniversary must be normalized or the input shows empty.
        const toDateInput = (v: any): string => {
          return toDateInputValue(v);
        };
        // Country code select options are "+91" style. TouchQ may send "91",
        // "0091" or "+91 " — normalize so the <select> value actually matches.
        const toCountryCode = (v: any): string => {
          if (!v) return '';
          let s = String(v).trim().replace(/\s+/g, '');
          if (!s) return '';
          s = s.replace(/^00/, '+');
          if (!s.startsWith('+')) s = '+' + s;
          const matched = COUNTRY_CODES.find(c => c.code === s);
          return matched ? matched.code : s;
        };

        const countryStateMap = apiData?.countryStateMap || DEFAULT_COUNTRY_STATE_MAP;
        const toNormalizedState = (country: string, stateStr: string): string => {
          if (!stateStr) return '';
          const trimmedState = String(stateStr).trim();
          if (!trimmedState) return '';
          const countryKey = Object.keys(countryStateMap).find(
            c => c.toLowerCase() === String(country || '').trim().toLowerCase()
          );
          if (!countryKey) return trimmedState;
          const stateList = countryStateMap[countryKey] || [];
          const matchedState = stateList.find(
            s => s.toLowerCase() === trimmedState.toLowerCase()
          );
          return matchedState || trimmedState;
        };

        // ── 1. Primary Guest ─────────────────────────────────────────────────
        if (bd.primaryGuest) {
          const pg = bd.primaryGuest;
          setPrimaryGuest(prev => ({
            ...prev,
            title: pg['g1-title'] || prev.title,
            firstName: pg['g1-firstname'] || prev.firstName,
            middleName: pg['g1-middlename'] || prev.middleName,
            lastName: pg['g1-lastname'] || prev.lastName,
            dob: toDateInput(pg['g1-dob']) || prev.dob,
            gender: pg['g1-gender'] || prev.gender,
            countryCode: toCountryCode(pg['g1-country-code']) || prev.countryCode,
            contact: pg['g1-contact'] || prev.contact,
            email: pg['g1-email'] || prev.email,
            anniversary: toDateInput(pg['g1-anniversary']) || prev.anniversary,
            nationality: pg['g1-nationality'] || prev.nationality,
            country: pg['g1-country'] || prev.country,
            state: toNormalizedState(pg['g1-country'], pg['g1-province']) || prev.state,
            zip: pg['g1-zip'] || prev.zip,
            address: pg['g1-address'] || prev.address,
          }));
        }

        // ── 2. Primary Booking Details ────────────────────────────────────────
        if (bd.primaryBooking) {
          const pb = bd.primaryBooking;
          const arrival = toDateInputValue(pb['g1-arrival-date']);
          const departure = toDateInputValue(pb['g1-departure-date']);
          const nights = pb['g1-nights'] ? Number(pb['g1-nights']) : 0;
          setPrimaryBookingDetails(prev => ({
            ...prev,
            arrivalDate: arrival || prev.arrivalDate,
            departureDate: departure || prev.departureDate,
            nights: nights || prev.nights,
            repeatGuest: (pb['g1-repeat-guest'] as any) || prev.repeatGuest,
            packageType: (pb['g1-package-type'] as any) || prev.packageType,
            programme: pb['g1-programme'] || prev.programme,
            roomType: pb['g1-room-type'] || prev.roomType,
            roomNumber: pb['g1-room-no'] || prev.roomNumber,
            occupancy: (pb['g1-room-cat'] as any) || prev.occupancy,
          }));
        }

        // ── 3. Secondary Guests (individual only; group uses the same key below) ─
        if (formType !== 'group' && bd.secondaryGuestPattern) {
          const sgKeys = Object.keys(bd.secondaryGuestPattern)
            .filter(k => k.startsWith('secondaryguest'))
            .sort((a, b) => {
              const na = parseInt(a.replace('secondaryguest', ''));
              const nb = parseInt(b.replace('secondaryguest', ''));
              return na - nb;
            });

          const sgList: GuestData[] = sgKeys.map((key, idx) => {
            const gn = idx + 2; // secondary guests are numbered 2, 3, 4... for display/UI purposes only
            const sg = bd.secondaryGuestPattern[key];
            // NOTE: the backend keeps the field-group prefix fixed at "g1-" for every
            // secondary guest (it is NOT the overall guest number) and instead increments
            // only the trailing suffix, 1-based, matching the "secondaryguestN" key itself
            // (secondaryguest1 -> _1, secondaryguest2 -> _2, ...). gn (2,3,4...) must NOT
            // be used to build the lookup keys — only for the guestNumber field below.
            const pfx = `g1`;
            const sfx = `_${idx + 1}`;
            const bdSg = {
              arrivalDate: toDateInputValue(sg[`${pfx}-arrival-date${sfx}`]) || '',
              departureDate: toDateInputValue(sg[`${pfx}-departure-date${sfx}`]) || '',
              nights: Number(sg[`${pfx}-nights${sfx}`]) || 0,
              repeatGuest: (sg[`${pfx}-repeat-guest${sfx}`] as any) || '',
              packageType: (sg[`${pfx}-package-type${sfx}`] as any) || 'rack',
              programme: sg[`${pfx}-programme${sfx}`] || '',
              roomType: sg[`${pfx}-room-type${sfx}`] || '',
              roomNumber: sg[`${pfx}-room-no${sfx}`] || '',
              occupancy: (sg[`${pfx}-room-cat${sfx}`] as any) || 'Single',
            };
            return {
              guestNumber: gn,
              title: sg[`${pfx}-title${sfx}`] || '',
              firstName: sg[`${pfx}-firstname${sfx}`] || '',
              middleName: sg[`${pfx}-middlename${sfx}`] || '',
              lastName: sg[`${pfx}-lastname${sfx}`] || '',
              dob: toDateInput(sg[`${pfx}-dob${sfx}`]) || '',
              gender: sg[`${pfx}-gender${sfx}`] || '',
              countryCode: toCountryCode(sg[`${pfx}-country-code${sfx}`]) || '',
              contact: sg[`${pfx}-contact${sfx}`] || '',
              email: sg[`${pfx}-email${sfx}`] || '',
              anniversary: toDateInput(sg[`${pfx}-anniversary${sfx}`]) || '',
              nationality: sg[`${pfx}-nationality${sfx}`] || '',
              country: sg[`${pfx}-country${sfx}`] || '',
              state: toNormalizedState(sg[`${pfx}-country${sfx}`], sg[`${pfx}-province${sfx}`]) || '',
              zip: sg[`${pfx}-zip${sfx}`] || '',
              address: sg[`${pfx}-address${sfx}`] || '',
              bookingDetails: bdSg,
            };
          });
          setSecondaryGuests(sgList);
        }

        // ── 4. Children ───────────────────────────────────────────────────────
        if (bd.children) {
          const chData = bd.children;
          const count = parseInt(chData['children-count']) || 0;
          const chList = Array.from({ length: count }, (_, i) => ({
            childNumber: i + 1,
            name: chData[`child${i + 1}-name`] || '',
            age: chData[`child${i + 1}-age`] || '',
          }));
          setChildren(chList);
        }

        // ── 5. Additional Info ────────────────────────────────────────────────
        if (bd.additionalInfo) {
          const ai = bd.additionalInfo;
          // Backend key names have drifted before (e.g. camelCase vs kebab-case),
          // so try a couple of likely variants rather than a single hard-coded key.
          const pick = (...keys: string[]) => {
            for (const k of keys) { if (ai[k] !== undefined && ai[k] !== null && String(ai[k]).trim() !== '') return ai[k]; }
            return '';
          };
          setAdditionalInfo((prev: any) => ({
            ...prev,
            clientCategory: pick('client-category', 'clientCategory', 'ClientCategory') || prev.clientCategory,
            clientType: pick('client-type', 'clientType', 'ClientType') || prev.clientType,
            paymentTerms: pick('payment-terms', 'paymentTerms') || prev.paymentTerms,
            dataSource: pick('data-source', 'dataSource') || prev.dataSource,
            transportationDetails: pick('transportation-details', 'transportationDetails') || prev.transportationDetails,
            referredBy: pick('referred-by', 'referredBy') || prev.referredBy,
            healthInformation: pick('health-information', 'healthInformation') || prev.healthInformation,
            testReports: pick('uploadTestReport', 'test-reports', 'testReports') || prev.testReports,
          }));
          if (!pick('client-category', 'clientCategory', 'ClientCategory') || !pick('client-type', 'clientType', 'ClientType')) {
            console.warn('[BookingForm] Additional Info prefill: clientCategory/clientType not found.');
          }
        }

        // ── 6. Travel Agent ───────────────────────────────────────────────────
        if (bd.travelAgent) {
          const ta = bd.travelAgent;
          // Backend/sheet sends this as a string ("TRUE"/"FALSE"), and any
          // non-empty string is truthy in JS — so `!ta['no-agent']` was
          // evaluating `!"FALSE"` as false, locking the whole section even
          // when an agent WAS involved. Parse the actual boolean value.
          const noAgentRaw = String(ta['no-agent'] ?? '').trim().toLowerCase();
          const hasAgent = !(noAgentRaw === 'true' || noAgentRaw === '1' || noAgentRaw === 'yes');

          const isEmail = (v: string) => v.includes('@');
          const isPhone = (v: string) => /^\+?[\d\s()-]{7,}$/.test(v);

          let taMobile = String(ta['agent-mobile'] ?? '').trim();
          let taEmail = String(ta['agent-email'] ?? '').trim();
          // Defensive swap — API/sheet sometimes has these two reversed
          // (email field holding "9818943301" while mobile is blank).
          if (!isEmail(taEmail) && isPhone(taEmail) && (!taMobile || isEmail(taMobile))) {
            const t = taMobile;
            taMobile = taEmail;
            taEmail = isEmail(t) ? t : '';
          }
          // If the mobile carries the country code (e.g. "+91 98..."), split it out
          let taCode = toCountryCode(ta['agent-country-code']) || '';
          if (taMobile.startsWith('+')) {
            const matched = COUNTRY_CODES.find(c => taMobile.startsWith(c.code));
            if (matched) {
              taCode = matched.code;
              taMobile = taMobile.slice(matched.code.length).trim();
            }
          }

          setTravelAgent({
            hasAgent,
            name: String(ta['agent-name'] ?? '').trim(),
            countryCode: taCode,
            mobile: taMobile,
            email: taEmail,
            category: String(ta['agent-category'] ?? '').trim(),
            commission: String(ta['agent-commission'] ?? '').replace(/%/g, '').trim(),
            remarks: String(ta['agent-remarks'] ?? ''),
          });
        }

        // ── 7. Advance Payment ────────────────────────────────────────────────
        if (bd.advancePayment) {
          const ap = bd.advancePayment;
          const savedCurrency = normalizeCurrencyCode(ap['currency'] || ap['currencyType'] || ap['currency-type']);
          const savedTotalReceived = ap['total-received-amount'] ?? ap['totalReceived'] ?? '';
          const savedTotal = ap['total-amount'] ?? ap['totalAmount'] ?? '';
          const savedPercentage = ap['percentage-amount'] ?? ap['percentage'] ?? '';
          const savedPending = ap['pending-amount'] ?? ap['pending'] ?? '';
          const hasAdvance = !!(ap['received-amount'] && ap['received-amount'] !== '');
          if (savedCurrency) setCurrency(savedCurrency);
          setAdvancePayment(prev => ({
            ...prev,
            isAdvancePayment: hasAdvance,
            currency: savedCurrency || prev.currency || currency,
            paymentReceivedDate: ap['payment-datetime'] || prev.paymentReceivedDate || '',
            amount: ap['received-amount'] || prev.amount,
            totalReceived: savedTotalReceived !== '' ? String(savedTotalReceived) : prev.totalReceived,
            totalAmount: savedTotal !== '' ? String(savedTotal) : prev.totalAmount,
            percentage: savedPercentage !== '' ? String(savedPercentage) : prev.percentage,
            pending: savedPending !== '' ? String(savedPending) : prev.pending,
            paymentMode: ap['payment-mode'] || prev.paymentMode,
            transactionNo: ap['transaction-no'] || prev.transactionNo,
            paymentLocation: ap['payment-location'] || prev.paymentLocation || '',
            paymentCollectionBy: ap['payment-by'] || prev.paymentCollectionBy || 'Admin',
            remarks: ap['payment-remarks'] || prev.remarks,
          }));
        }

        // ── 8. Approval ───────────────────────────────────────────────────────
        if (bd.approval) {
          const ap = bd.approval;
          const hasApproval = !!(ap['approval-date'] && ap['approval-date'] !== '');
          setApproval(prev => ({
            ...prev,
            isApprovalRequired: hasApproval,
            approvalGivenDate: ap['approval-date'] || prev.approvalGivenDate || '',
            approvalValidTillDate: ap['approved-till-date'] || prev.approvalValidTillDate || '',
            approvedBy: ap['approved-by'] || prev.approvedBy,
            remarks: ap['approval-remarks'] || prev.remarks,
          }));
        }

        // ── 9. Group Info + Guests (group bookings) ───────────────────────────
        // NOTE: detect group strictly by formType / explicit group marker.
        // Do NOT use secondaryGuestPattern — it also holds INDIVIDUAL secondary guests.
        const isGroup = formType === 'group' || !!bd['grp'];
        if (isGroup) {
          setBookingType('group');
          setGroupInfo({
            pax: String(bd['group-pax'] || ''),
            name: bd['group-name'] || '',
            referenceBy: bd['grp-ref-name'] || '',
            country: bd['grp-country'] || '',
            phone: bd['grp-phone'] || '',
            email: bd['grp-email'] || '',
          });
          setResId(bd['res_id'] || bd['resId'] || bookingId || '');

          if (bd.secondaryGuestPattern) {
            const paxCount = parseInt(bd['group-pax']) || 0;
            const guests: GroupGuestData[] = [];
            for (let i = 1; i <= paxCount; i++) {
              const sg = bd.secondaryGuestPattern[`secondaryguest${i}`];
              if (!sg) continue;
              const s = `_${i}`;
              guests.push({
                guestNumber: i,
                editId: sg[`grp_editID${s}`] || '',
                patientId: sg[`grp_patientID${s}`] || '',
                title: sg[`grp-title${s}`] || '',
                firstName: sg[`grp-firstname${s}`] || '',
                middleName: sg[`grp-middlename${s}`] || '',
                lastName: sg[`grp-lastname${s}`] || '',
                dob: toDateInput(sg[`grp-dob${s}`]) || '',
                gender: sg[`grp-gender${s}`] || sg[`g1-gender${s}`] || '',
                countryCode: toCountryCode(sg[`grp-country-code${s}`]) || '',
                contact: sg[`grp-contact${s}`] || '',
                email: sg[`grp-email${s}`] || sg[`grp-mail${s}`] || '',
                anniversary: toDateInput(sg[`grp-anniversary${s}`]) || '',
                nationality: sg[`grp-nationality${s}`] || '',
                country: sg[`grp-country${s}`] || '',
                state: toNormalizedState(sg[`grp-country${s}`], sg[`grp-province${s}`]) || '',
                zip: sg[`grp-zip${s}`] || '',
                address: sg[`grp-address${s}`] || '',
                arrivalDate: toDateInputValue(sg[`grp-arrival-date${s}`]),
                departureDate: toDateInputValue(sg[`grp-departure-date${s}`]),
                nights: Number(sg[`grp-nights${s}`]) || 0,
                repeatGuest: (sg[`grp-repeat-guest${s}`] as any) || '',
                packageType: sg[`grp-package-type${s}`] || 'rack',
                programme: sg[`grp-programme${s}`] || '',
                roomType: sg[`grp-room-type${s}`] || '',
                roomNumber: sg[`grp-room-no${s}`] || '',
                occupancy: sg[`grp-room-cat${s}`] || 'Single',
              });
            }
            // Group guests into rooms by room number
            const roomMap = new Map<string, RoomData>();
            guests.forEach(g => {
              const key = g.roomNumber || `R${g.guestNumber}`;
              if (!roomMap.has(key)) roomMap.set(key, { roomNumber: key, roomType: g.roomType, guests: [] });
              const room = roomMap.get(key)!;
              room.guests.push({ ...g, guestNumber: room.guests.length + 1 });
            });
            const rooms = Array.from(roomMap.values());
            groupPrefillDone.current = true; // prevent pax-sync effect from clobbering
            apiRoomCount.current = rooms.length; // remember how many rooms came from the API
            setGroupRooms(rooms);
            setGroupGuests(rooms.flatMap(r => r.guests));
          }
        } else {
          setBookingType('individual');
        }

      } catch (err: any) {
        console.error('loadBookingById failed:', err);
        alert('Failed to load booking. Please try again.\n' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBookingById();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, apiData]);
  // Sync group rooms from API data when pax changes
  useEffect(() => {
    const n = parseInt(groupInfo.pax) || 0;
    if (n === 0) { setGroupRooms([]); return; }
    if (groupPrefillDone.current) { groupPrefillDone.current = false; return; }

    // If the new pax count matches the current total number of guests in groupRooms,
    // do not rebuild/restructure the rooms as this was an internal guest add/remove update.
    const currentTotalGuests = groupRooms.reduce((sum, r) => sum + (r.guests ? r.guests.length : 0), 0);
    if (n === currentTotalGuests) {
      return;
    }

    // Build rooms from API RoomData or generate placeholders
    const apiRooms: { roomNumber: string; roomType: string }[] = apiData?.RoomData
      ? Object.entries(apiData.RoomData as Record<string, string>)
        .map(([num, type]) => ({ roomNumber: num, roomType: type as string }))
        .slice(0, n)
      : Array.from({ length: n }, (_, i) => ({ roomNumber: `R${i + 1}`, roomType: "CLASSIC VILLA" }));
    setGroupRooms(prev => {
      if (prev.length === apiRooms.length) return prev; // no change
      return apiRooms.map((r, i) => ({
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        guests: prev[i]?.guests || [emptyGroupGuestForRoom(1, r.roomNumber, r.roomType)],
      }));
    });
    // Flatten rooms -> groupGuests for backward compat with pricing/submit
    setGroupGuests(groupRooms.flatMap(r => r.guests));
  }, [groupInfo.pax, apiData]);

  // Keep groupGuests in sync with groupRooms for pricing hook and update groupInfo.pax
  useEffect(() => {
    setGroupGuests(groupRooms.flatMap(r => r.guests));
    // Auto-update pax = total guest count across all rooms
    const totalPax = groupRooms.reduce((sum, r) => sum + (r.guests ? r.guests.length : 0), 0);
    if (totalPax > 0) {
      setGroupInfo(prev => {
        if (prev.pax === String(totalPax)) return prev;
        return { ...prev, pax: String(totalPax) };
      });
    }
  }, [groupRooms]);

  const handleNext = useCallback(() => {
    const errs = validateStep(step, {
      primaryGuest,
      primaryBookingDetails,
      secondaryGuests,
      children,
      groupInfo,
      groupRooms,
      apiRoomCount: apiRoomCount.current,
      additionalInfo,
      travelAgent,
      advancePayment,
      approval,
      discounts
    }, bookingType);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Show a toast-like alert summarising the first error
      const firstErr = Object.values(errs)[0];
      alert(`⚠️ Please fill all required fields before proceeding.\n\n${firstErr}`);
      return;
    }
    setErrors({});
    setStep(s => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, primaryGuest, primaryBookingDetails, secondaryGuests, children, groupInfo, groupRooms, bookingType, steps.length, additionalInfo, travelAgent, advancePayment, approval, discounts]);

  const handlePrev = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleSubmit = async () => {
    const finalReviewCheckbox = document.getElementById("final-review") as HTMLInputElement;
    if (finalReviewCheckbox && !finalReviewCheckbox.checked) {
      alert("⚠️ Please check the box to confirm that all information is accurate and ready to submit.");
      return;
    }
    setSubmitting(true);
    const userInfo = typeof window !== "undefined" ? user : null;//typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("kairali_user") || "null") : null;

    const todayStr = new Date().toISOString().split("T")[0];

    // ── Map advance payment to original backend contract ──
    const advGrandTotal = parseFloat(String(pricing?.paymentBreakdown?.grandTotal ?? "0")) || 0;
    const advReceived = parseFloat(advancePayment.amount) || 0;
    const adv = advancePayment.isAdvancePayment;
    const bookingCurrency = currency || "INR";
    const advCurrency = advancePayment.currency || bookingCurrency;
    const advGrandTotalInAdvCurrency = convertCurrency(advGrandTotal, bookingCurrency, advCurrency);

    const advancePaymentPayload = {
      received: adv,
      date: adv && advancePayment.paymentReceivedDate ? advancePayment.paymentReceivedDate : todayStr,
      mode: adv ? advancePayment.paymentMode : "",
      transactionNo: adv ? advancePayment.transactionNo : "",
      location: adv ? (advancePayment.paymentLocation || "") : "",
      collectedBy: adv ? (advancePayment.paymentCollectionBy || "") : "",
      amount: adv ? advancePayment.amount : "",
      totalAmount: advGrandTotalInAdvCurrency.toFixed(2),
      percentage: advGrandTotalInAdvCurrency > 0 ? ((advReceived / advGrandTotalInAdvCurrency) * 100).toFixed(2) : "0.00",
      pending: Math.max(0, advGrandTotalInAdvCurrency - advReceived).toFixed(2),
      currency: advCurrency,
      screenshot: {
        fileName: adv ? (advancePayment.screenshotName || "") : "",
        mimeType: adv ? (advancePayment.screenshotType || "") : "",
        data: adv ? (advancePayment.screenshotBase64 || "") : "",
      },
    };

    // ── Map approval to original backend contract ──
    const appReq = approval.isApprovalRequired;
    const approvalPayload = {
      required: appReq,
      date: appReq ? (approval.approvalGivenDate || "") : "",
      approvedTill: appReq ? (approval.approvalValidTillDate || "") : "",
      approvedBy: appReq ? approval.approvedBy : "",
      remarks: appReq ? approval.remarks : "",
      approvalTakenBy: appReq ? (userInfo?.name || "") : "",
      screenshot: {
        fileName: appReq ? (approval.screenshotName || "") : "",
        mimeType: appReq ? (approval.screenshotType || "") : "",
        data: appReq ? (approval.screenshotBase64 || "") : "",
      },
    };

    // Format groupGuests to guarantee 1-based guestNumbers matching paxAmounts, uppercase gender ("MALE"/"FEMALE"), valid patientId, valid dates, and numeric age
    // Format groupGuests to guarantee 1-based guestNumbers matching paxAmounts, uppercase gender ("MALE"/"FEMALE"), valid patientId, valid dates, and numeric age
    const currentGroupGuests = groupRooms.length > 0 ? groupRooms.flatMap(r => r.guests) : groupGuests;
    const defaultArrival = primaryBookingDetails.arrivalDate || todayStr;
    const defaultDeparture = primaryBookingDetails.departureDate || todayStr;

    const roomPrimaryMap = new Map<string, { patientId: string, editId: string }>();
    const roomGuestCounter = new Map<string, number>();

    const formattedGroupGuests = currentGroupGuests.map((g, idx) => {
      let ageNum = "";
      if (g.dob) {
        const trimmedDob = String(g.dob).trim();
        if (/^\d+$/.test(trimmedDob)) {
          ageNum = trimmedDob;
        } else {
          const birthDate = new Date(trimmedDob);
          if (!isNaN(birthDate.getTime())) {
            const age = new Date().getFullYear() - birthDate.getFullYear();
            ageNum = String(Math.max(0, age));
          }
        }
      }

      const arrDate = g.arrivalDate && !isNaN(new Date(g.arrivalDate).getTime()) ? g.arrivalDate : defaultArrival;
      const depDate = g.departureDate && !isNaN(new Date(g.departureDate).getTime()) ? g.departureDate : defaultDeparture;

      const roomKey = g.roomNumber || `R${g.guestNumber}`;
      let pId = g.patientId || g.editId || bookingId || `GUEST-${idx + 1}`;
      let eId = g.editId || g.patientId || `${bookingId}|1` || `GUEST-${idx + 1}|1`;

      if (!roomPrimaryMap.has(roomKey)) {
        // Save primary guest's resolved IDs
        roomPrimaryMap.set(roomKey, { patientId: pId, editId: eId });
        roomGuestCounter.set(roomKey, 1);
      } else {
        // Resolve secondary guest's IDs uniquely if they are duplicates or null
        const primary = roomPrimaryMap.get(roomKey)!;
        const count = roomGuestCounter.get(roomKey)!;
        roomGuestCounter.set(roomKey, count + 1);

        const primaryPatientId = primary.patientId;
        const primaryEditId = primary.editId;

        if (!g.patientId || g.patientId === primaryPatientId || g.patientId === bookingId) {
          pId = `S${count}${primaryPatientId}`;
        }
        if (!g.editId || g.editId === primaryEditId || g.editId === `${bookingId}|1` || g.editId === `${primaryPatientId}|1`) {
          eId = `S${count}${primaryEditId}`;
        }
      }

      return {
        ...g,
        guestNumber: idx + 1,
        patientId: pId,
        editId: eId,
        gender: (g.gender || "").trim().toUpperCase(),
        arrivalDate: arrDate,
        departureDate: depDate,
        dob: ageNum,
        nights: g.nights || (primaryBookingDetails.nights ? Number(primaryBookingDetails.nights) : 1),
        packageType: g.packageType || primaryBookingDetails.packageType || "rack",
        programme: g.programme || primaryBookingDetails.programme || "",
        roomType: g.roomType || primaryBookingDetails.roomType || "",
        roomNumber: g.roomNumber || primaryBookingDetails.roomNumber || "",
        occupancy: g.occupancy || primaryBookingDetails.occupancy || "Single",
        country: g.country || groupInfo.country || primaryGuest.country || "",
        contact: g.contact || groupInfo.phone || primaryGuest.contact || "",
        email: g.email || groupInfo.email || primaryGuest.email || "",
      };
    });

    const finalResId = resId || bookingId || "";

    const payload = {
      bookingId: bookingId,
      res_id: finalResId,
      submissionDate: new Date().toISOString(),
      bookingType,
      bookingEditStatus: getBookingEditStatus(),
      bookingTakenBy: userInfo?.name || "",
      ...(bookingType === "individual" ? {
        primaryGuest,
        bookingDetails: primaryBookingDetails,
        secondaryGuests,
        children: { count: children.length, details: children },
      } : {
        res_id: finalResId,
        groupInfo,
        groupGuests: formattedGroupGuests,
        
      }),
      additionalInfo,
      travelAgent,
      payment: pricing.paymentBreakdown,
      paxAmounts: { count: pricing.paxAmounts.length, breakdown: pricing.paxAmounts },
      advancePayment: advancePaymentPayload,
      approval: approvalPayload,
    };
    
    try {
      const payloadStr = JSON.stringify(payload);
      // console.log(payloadStr);
      // debugger
      const isSmallPayload = payloadStr.length < 60000;
      let res: Response | null = null;
      let timedOut = false;
      console.log(payloadStr);
      debugger;
      if (isSmallPayload) {
        // Use keepalive so the request finishes in the background even if the page redirects
        const fetchPromise = fetch(SUBMIT_API, {
          method: "POST",
          body: payloadStr,
          keepalive: true,
        });

        // 6-second timeout for optimistic redirect
        const timeoutPromise = new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), 6000)
        );

        const raceResult = await Promise.race([fetchPromise, timeoutPromise]);
        if (raceResult === "timeout") {
          timedOut = true;
        } else {
          res = raceResult;
        }
      } else {
        res = await fetch(SUBMIT_API, { method: "POST", body: payloadStr });
      }

      if (timedOut) {
        console.log("[BookingForm] Submission taking longer than 6s, proceeding optimistically in background.");
        setSubmitting(false);
        setSubmitted(true);
        setShowThankYou(true);
      } else if (res) {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
        }
        const resData = await res.json().catch(() => null);

        const isSuccess = resData && (
          resData.success === true ||
          resData.success === "true" ||
          String(resData.status).toLowerCase() === "success" ||
          String(resData.status).toLowerCase() === "ok"
        );

        if (!isSuccess) {
          throw new Error(resData?.message || resData?.error || "Backend failed to process the booking.");
        }

        setSubmitting(false);
        setSubmitted(true);
        setShowThankYou(true);
      }
    } catch (e: any) {
      setSubmitting(false);
      alert("❌ Failed to submit. Please try again.\n" + (e as any).message);
    }
  };

  function getBookingEditStatus() {
    if (advancePayment.isComplementary) {
      return 'Complimentary';
    }
    if (advancePayment.isVoucher) {
      return 'Voucher';
    }
    return bookingId ? 'Edit Required' : 'New';
  }

  const isLastStep = step === steps.length - 1;

  function renderStep() {
    if (bookingType === "individual") {
      switch (step) {
        case 0: return <Step0PrimaryGuest
          guest={primaryGuest}
          onChange={setPrimaryGuest}
          errors={errors}
          apiData={apiData}
          primaryDetails={primaryBookingDetails}
          onPrimaryDetailsChange={setPrimaryBookingDetails}
          programmes={programmes}
          roomMaxPaxMap={ROOM_MAX_PAX}
          roomNumberLocked={!!bookingId || !!primaryBookingDetails?.roomNumber}
        />;
        case 1: return <Step1SecondaryGuests primaryDetails={primaryBookingDetails} onPrimaryDetailsChange={setPrimaryBookingDetails} secondaryGuests={secondaryGuests} onSecondaryChange={setSecondaryGuests} programmes={programmes} roomMaxPaxMap={ROOM_MAX_PAX} apiData={apiData} primaryGuest={primaryGuest} errors={errors} roomNumberLocked={!!bookingId || !!primaryBookingDetails?.roomNumber} />;
        case 2: return <Step2Children children={children} onChange={setChildren} errors={errors} />;
        case 3: return <StepAdditionalInfo data={additionalInfo} onChange={setAdditionalInfo} apiData={apiData} errors={errors} />;
        case 4: return <StepTravelAgent data={travelAgent} onChange={setTravelAgent} apiData={apiData} errors={errors} />;
        case 5: return (
          <StepPaymentBreakdown
            pricing={pricing}
            discounts={discounts}
            errors={errors}
            onDiscountChange={setDiscounts}
            currency={currency}
            onCurrencyChange={setCurrency}
            otherCharges={otherCharges}
            onOtherChargesChange={setOtherCharges}
            isComplementary={advancePayment.isComplementary}
            onComplementaryChange={val => setAdvancePayment(prev => ({ ...prev, isComplementary: val, isVoucher: val ? false : prev.isVoucher }))}
            isVoucher={advancePayment.isVoucher}
            onVoucherChange={val => setAdvancePayment(prev => ({ ...prev, isVoucher: val, isComplementary: val ? false : prev.isComplementary }))}
          />
        );
        case 6: return <StepAdvancePayment data={advancePayment} onChange={setAdvancePayment} errors={errors} currency={currency} pricing={pricing} />;
        case 7: return <StepApproval data={approval} onChange={setApproval} errors={errors} />;
        case 8: return <StepReview bookingType={bookingType} primaryGuest={primaryGuest} primaryBookingDetails={primaryBookingDetails} pricing={pricing} advancePayment={advancePayment} />;
      }
    } else {
      switch (step) {
        case 0: return <StepGroupInfo info={groupInfo} onChange={setGroupInfo} errors={errors} apiData={apiData} apiRoomCount={bookingId ? apiRoomCount.current : 0} />;
        case 1: return <StepGroupGuests rooms={groupRooms} onChange={setGroupRooms} programmes={programmes} apiData={apiData} errors={errors} roomMaxPaxMap={ROOM_MAX_PAX} />;
        case 2: return <StepAdditionalInfo data={additionalInfo} onChange={setAdditionalInfo} apiData={apiData} prefix="grp" errors={errors} />;
        case 3: return <StepTravelAgent data={travelAgent} onChange={setTravelAgent} apiData={apiData} prefix="grp" errors={errors} />;
        case 4: return (
          <StepPaymentBreakdown
            pricing={pricing}
            discounts={discounts}
            errors={errors}
            onDiscountChange={setDiscounts}
            currency={currency}
            onCurrencyChange={setCurrency}
            otherCharges={otherCharges}
            onOtherChargesChange={setOtherCharges}
            isComplementary={advancePayment.isComplementary}
            onComplementaryChange={val => setAdvancePayment(prev => ({ ...prev, isComplementary: val, isVoucher: val ? false : prev.isVoucher }))}
            isVoucher={advancePayment.isVoucher}
            onVoucherChange={val => setAdvancePayment(prev => ({ ...prev, isVoucher: val, isComplementary: val ? false : prev.isComplementary }))}
          />
        );
        case 5: return <StepAdvancePayment data={advancePayment} onChange={setAdvancePayment} errors={errors} currency={currency} pricing={pricing} />;
        case 6: return <StepApproval data={approval} onChange={setApproval} errors={errors} />;
        case 7: return <StepReview bookingType={bookingType} groupInfo={groupInfo} pricing={pricing} advancePayment={advancePayment} />;
      }
    }
  }

  if (loading) {
    return (
      <div className="kairali-booking-form">
        <Loader isLoading={true} contentOnly={true} />
      </div>
    );
  }

  return (

    <div className="kairali-booking-form">
      {/* ── Hero Banner ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 mb-6"
        style={{
          background: 'linear-gradient(135deg,#0f1f45 0%,#162d6b 45%,#1a3080 100%)',
          borderBottom: '1px solid rgba(29,78,216,0.2)',
          boxShadow: '0 4px 24px rgba(15,31,69,0.3)',
        }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right,rgba(29,78,216,0.05),transparent,rgba(99,102,241,0.08))' }} />
        <div className="absolute -top-10 left-1/4 w-96 h-28 rounded-full pointer-events-none"
          style={{ background: 'rgba(59,130,246,0.08)', filter: 'blur(48px)' }} />
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-6">
          <BackButton className="mb-4" />
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg,rgba(59,130,246,0.3) 0%,rgba(99,102,241,0.2) 100%)',
                  border: '1px solid rgba(147,197,253,0.2)',
                  boxShadow: '0 0 24px rgba(59,130,246,0.2)',
                }}>
              <ClipboardPen className="h-7 w-7" style={{ color: "#bfdbfe" }} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
                  style={{ color: '#f0f7ff' }}>
                  {bookingId ? "Edit Booking" : "New Booking Form"}
                </h1>
                <p className="text-sm mt-1.5"
                  style={{ color: 'rgba(147,197,253,0.55)' }}>
                  {bookingId ? `Updating booking ${bookingId}` : "Fill in the guest details to create a reservation"}
                </p>
              </div>
            </div>
            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
              <div className="rounded-xl px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(147,197,253,0.15)',
                }}>
                <p className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(147,197,253,0.55)' }}>Last Updated</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(240,247,255,0.85)' }}>
                  {lastUpd}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="kbf-content">
        {/* Form Type Toggle */}
      

        {/* Step Tabs */}
        <div className="kbf-step-tabs">
          {steps.map((s, i) => (
            <div key={i} className={`kbf-step-tab${i <= step ? " enabled" : ""}${i === step ? " active" : ""}`}
              onClick={() => { if (i < step) setStep(i); }}>
              <i className={`fas ${s.icon}`} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Active Step */}
        {renderStep()}

        {/* Navigation */}
        <div className="kbf-nav-row">
          {step > 0 && (
            <button className="kbf-btn-prev" type="button" onClick={handlePrev}>
              <i className="fas fa-arrow-left" style={{ marginRight: 6 }} /> Previous
            </button>
          )}
          {!isLastStep ? (
            <button className="kbf-btn-next" type="button" onClick={handleNext}>
              Next <i className="fas fa-arrow-right" style={{ marginLeft: 6 }} />
            </button>
          ) : (
            <button className="kbf-btn-submit" type="button" onClick={handleSubmit} disabled={submitting || submitted}>
              {submitting ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Submitting…</> : submitted ? <><i className="fas fa-check-double" style={{ marginRight: 6 }} />Submitted</> : <><i className="fas fa-check" style={{ marginRight: 6 }} />Submit Booking</>}
            </button>
          )}
        </div>
      </div>

      {/* ── Thank You Modal ─────────────────────────────────────────────────── */}
      {showThankYou && (
        <div className="kbf-thankyou-overlay" onClick={() => { setShowThankYou(false); if (onSuccess) onSuccess(bookingId || ""); }}>
          <div className="kbf-thankyou-modal" onClick={e => e.stopPropagation()}>
            <div className="kbf-thankyou-icon">
              <i className="fas fa-check" />
            </div>
            <h2 className="kbf-thankyou-title">Thank you!</h2>
            <p className="kbf-thankyou-msg">
              Your booking has been submitted successfully.
            </p>
            <button
              className="kbf-thankyou-btn"
              onClick={() => { setShowThankYou(false); if (onSuccess) onSuccess(bookingId || ""); }}
            >
              Continue
            </button>
            <p className="kbf-thankyou-countdown">
              Redirecting automatically in {thankYouCountdown}s…
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


// "use client";

// import React, { useState, useEffect, useCallback, useRef } from "react";
// import "./BookingForm.css";
// import Loader from "@/components/Loader";
// import { useBookingPricing } from "./useBookingPricing";
// import type { GuestData, GroupGuestData, ChildData, GroupInfo, TravelAgentInfo, AdvancePayment, ApprovalInfo, BookingDetails, ServiceCharge } from "./types";
// import { DATA_API, SUBMIT_API, emptyGuest, emptyGroupGuest, emptyTravelAgent, emptyAdvancePayment, emptyApproval, IND_STEPS, GRP_STEPS, ROOM_MAX_PAX, DEFAULT_COUNTRY_STATE_MAP, COUNTRY_CODES } from "./BookingFormBase";
// import { Step0PrimaryGuest, Step1SecondaryGuests, Step2Children } from "./BookingFormSteps1";
// import { StepAdditionalInfo, StepTravelAgent, StepPaymentBreakdown, StepAdvancePayment, StepApproval } from "./BookingFormSteps2";

// function validateStep(step: number, state: any, bookingType: string): Record<string, string> {
//   const errs: Record<string, string> = {};
//   const isIndividual = bookingType === "individual";

//   if (isIndividual) {
//     if (step === 0) {
//       const g = state.primaryGuest as GuestData;
//       if (!g.title) errs.title = "Required";
//       if (!g.firstName.trim()) errs.firstName = "Required";
//       if (!g.gender) errs.gender = "Required";
//       if (!g.contact.trim()) errs.contact = "Required";
//       if (!g.email.trim()) errs.email = "Required";
//       else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) errs.email = "Invalid email";
//       if (!g.country) errs.country = "Required";
//       if (!g.state) errs.state = "Required";
//       if (!g.zip.trim()) errs.zip = "Required";
//       if (!g.address.trim()) errs.address = "Required";

//       // Booking Info is also on step 0 — validate it here
//       const d = state.primaryBookingDetails as BookingDetails;
//       if (!d.arrivalDate) errs.arrivalDate = "Required";
//       if (!d.departureDate) errs.departureDate = "Required";
//       if (d.arrivalDate && d.departureDate && d.departureDate <= d.arrivalDate) errs.departureDate = "Must be after arrival";
//       if (!d.programme) errs.programme = "Required";
//       if (!d.repeatGuest) errs.repeatGuest = "Required";
//     }
//     if (step === 1) {
//       // Secondary Guests step — validate each added guest's required fields
//       const d = state.primaryBookingDetails as BookingDetails;
//       const totalPax = 1 + state.secondaryGuests.length;
//       const maxPax = ROOM_MAX_PAX[d.roomType] || 0;
//       if (maxPax > 0 && totalPax > maxPax) errs.capacity = `Exceeds room max capacity (${maxPax})`;

//       (state.secondaryGuests as GuestData[]).forEach((g, idx) => {
//         const p = `guest${idx + 2}`;
//         if (!g.title) errs[`${p}_title`] = "Required";
//         if (!g.firstName.trim()) errs[`${p}_firstName`] = "Required";
//         if (!g.gender) errs[`${p}_gender`] = "Required";
//         if (!g.contact.trim()) errs[`${p}_contact`] = "Required";
//         if (!g.email.trim()) errs[`${p}_email`] = "Required";
//         else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) errs[`${p}_email`] = "Invalid email";
//         if (!g.country) errs[`${p}_country`] = "Required";
//         if (!g.state) errs[`${p}_state`] = "Required";
//         if (!g.zip.trim()) errs[`${p}_zip`] = "Required";
//         if (!g.address.trim()) errs[`${p}_address`] = "Required";
//         const bd = g.bookingDetails;
//         if (bd) {
//           if (!bd.arrivalDate) errs[`${p}_arrivalDate`] = "Required";
//           if (!bd.departureDate) errs[`${p}_departureDate`] = "Required";
//           if (bd.arrivalDate && bd.departureDate && bd.departureDate <= bd.arrivalDate) errs[`${p}_departureDate`] = "Must be after arrival";
//           if (!bd.programme) errs[`${p}_programme`] = "Required";
//           if (!bd.repeatGuest) errs[`${p}_repeatGuest`] = "Required";
//         }
//       });
//     }
//     if (step === 2) {
//       (state.children || []).forEach((c: any, idx: number) => {
//         const p = `child${idx + 1}`;
//         if (!c.name || !c.name.trim()) {
//           errs[`${p}_name`] = `Child ${idx + 1} Name is required`;
//         }
//         if (!c.age || !String(c.age).trim()) {
//           errs[`${p}_age`] = `Child ${idx + 1} Age is required`;
//         }
//       });
//     }
//   } else {
//     if (step === 0) {
//       const g = state.groupInfo as GroupInfo;
//       if (!g.pax) errs.pax = "Required";
//       if (!g.name.trim()) errs.name = "Required";
//       if (!g.phone.trim()) errs.phone = "Required";
//       if (!g.email.trim()) errs.email = "Required";
//       else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) errs.email = "Invalid email";
//     }
//     if (step === 1) {
//       // Validate each guest in each room
//       const rooms: RoomData[] = state.groupRooms || [];
//       if (rooms.length === 0) {
//         errs.rooms = "No rooms assigned. Please go back and set Group Pax.";
//       } else {
//         for (let ri = 0; ri < rooms.length; ri++) {
//           const room = rooms[ri];
//           for (let gi = 0; gi < room.guests.length; gi++) {
//             const g = room.guests[gi];
//             const prefix = `Room ${room.roomNumber} Guest ${gi + 1}`;
//             if (!g.title) { errs[`r${ri}_g${gi}_title`] = `${prefix}: Title required`; }
//             if (!g.firstName?.trim()) { errs[`r${ri}_g${gi}_firstName`] = `${prefix}: First Name required`; }
//             if (!g.gender) { errs[`r${ri}_g${gi}_gender`] = `${prefix}: Gender required`; }
//             if (!g.contact?.trim()) { errs[`r${ri}_g${gi}_contact`] = `${prefix}: Contact required`; }
//             if (!g.email?.trim()) { errs[`r${ri}_g${gi}_email`] = `${prefix}: Email required`; }
//             else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) { errs[`r${ri}_g${gi}_email`] = `${prefix}: Invalid email`; }
//             if (!g.country) { errs[`r${ri}_g${gi}_country`] = `${prefix}: Country required`; }
//             if (!g.state) { errs[`r${ri}_g${gi}_state`] = `${prefix}: Province/State required`; }
//             if (!g.zip?.trim()) { errs[`r${ri}_g${gi}_zip`] = `${prefix}: Zip required`; }
//             if (!g.address?.trim()) { errs[`r${ri}_g${gi}_address`] = `${prefix}: Home Address required`; }
//             if (!g.arrivalDate) { errs[`r${ri}_g${gi}_arrivalDate`] = `${prefix}: Arrival Date required`; }
//             if (!g.departureDate) { errs[`r${ri}_g${gi}_departureDate`] = `${prefix}: Departure Date required`; }
//             if (g.arrivalDate && g.departureDate && g.departureDate <= g.arrivalDate) {
//               errs[`r${ri}_g${gi}_departureDate`] = `${prefix}: Departure must be after arrival`;
//             }
//             if (!g.repeatGuest) { errs[`r${ri}_g${gi}_repeatGuest`] = `${prefix}: Repeat Guest required`; }
//             if (!g.programme) { errs[`r${ri}_g${gi}_programme`] = `${prefix}: Programme required`; }
//           }
//         }
//       }
//     }
//   }

//   const addInfoStep = isIndividual ? 3 : 2;
//   const taStep = isIndividual ? 4 : 3;
//   const advStep = isIndividual ? 6 : 5;
//   const appStep = isIndividual ? 7 : 6;

//   if (step === addInfoStep) {
//     const ai = state.additionalInfo || {};
//     if (!ai.clientCategory) errs.clientCategory = "Required";
//     if (!ai.clientType) errs.clientType = "Required";
//     if (!ai.paymentTerms) errs.paymentTerms = "Required";
//     if (!ai.dataSource) errs.dataSource = "Required";
//     if (!ai.transportationDetails) errs.transportationDetails = "Required";
//   }

//   if (step === taStep) {
//     const ta = state.travelAgent as TravelAgentInfo;
//     if (ta && ta.hasAgent) {
//       if (!ta.name) errs.name = "Required";
//       if (!ta.mobile || !ta.mobile.trim()) errs.mobile = "Required";
//       if (!ta.email || !ta.email.trim()) errs.email = "Required";
//       if (!ta.category || !ta.category.trim()) errs.category = "Required";
//       if (!ta.commission || !ta.commission.trim()) errs.commission = "Required";
//     }
//   }

//   if (step === advStep) {
//     const ap = state.advancePayment as AdvancePayment;
//     if (ap && ap.isAdvancePayment) {
//       if (!ap.paymentReceivedDate || !ap.paymentReceivedDate.trim()) errs.paymentReceivedDate = "Required";
//       if (!ap.amount || !ap.amount.trim()) errs.amount = "Required";
//       if (!ap.paymentMode) errs.paymentMode = "Required";
//       if (!ap.transactionNo || !ap.transactionNo.trim()) errs.transactionNo = "Required";
//       if (!ap.paymentLocation || !ap.paymentLocation.trim()) errs.paymentLocation = "Required";
//       if (!ap.paymentCollectionBy || !ap.paymentCollectionBy.trim()) errs.paymentCollectionBy = "Required";
//       if (!ap.screenshotName) errs.screenshotName = "Required";
//     }
//   }

//   if (step === appStep) {
//     const app = state.approval as ApprovalInfo;
//     if (app && app.isApprovalRequired) {
//       if (!app.approvalGivenDate || !app.approvalGivenDate.trim()) errs.approvalGivenDate = "Required";
//       if (!app.approvalValidTillDate || !app.approvalValidTillDate.trim()) errs.approvalValidTillDate = "Required";
//       if (!app.approvedBy) errs.approvedBy = "Required";
//       if (!app.screenshotName) errs.screenshotName = "Required";
//     }
//   }

//   return errs;
// }

// // ─── Group Info Step ──────────────────────────────────────────────────────────
// function StepGroupInfo({ info, onChange, errors, apiData }: { info: GroupInfo; onChange: (g: GroupInfo) => void; errors: Record<string, string>; apiData: any; }) {
//   const set = (k: keyof GroupInfo, v: string) => onChange({ ...info, [k]: v });
//   return (
//     <div className="kbf-card">
//       <div className="kbf-card-header"><div className="kbf-card-step-no">1</div><i className="fas fa-users" /><h2>Group Booking — Group Details</h2></div>
//       <div className="kbf-card-body">
//         <div className="kbf-row">
//           <div className="kbf-group">
//             <label className="kbf-label required">Group Pax</label>
//             <select className={`kbf-select${errors.pax ? " error" : ""}`} value={info.pax} onChange={e => set("pax", e.target.value)}>
//               <option value="">Select</option>
//               {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
//             </select>
//             {errors.pax && <span className="kbf-error-text">{errors.pax}</span>}
//           </div>
//           <div className="kbf-group">
//             <label className="kbf-label required">Group Name</label>
//             <input className={`kbf-input${errors.name ? " error" : ""}`} value={info.name} onChange={e => set("name", e.target.value)} />
//             {errors.name && <span className="kbf-error-text">{errors.name}</span>}
//           </div>
//           <div className="kbf-group">
//             <label className="kbf-label">Reference By</label>
//             <input className="kbf-input" value={info.referenceBy} onChange={e => set("referenceBy", e.target.value)} />
//           </div>
//         </div>
//         <div className="kbf-row">
//           <div className="kbf-group">
//             <label className="kbf-label required">Country</label>
//             <select className="kbf-select" value={info.country} onChange={e => set("country", e.target.value)}>
//               <option value="">Select country</option>
//               {Object.keys(apiData?.countryStateMap || DEFAULT_COUNTRY_STATE_MAP).map((c: string) => <option key={c}>{c}</option>)}
//             </select>
//           </div>
//           <div className="kbf-group">
//             <label className="kbf-label required">Mobile Number</label>
//             <input className={`kbf-input${errors.phone ? " error" : ""}`} type="number" value={info.phone} onChange={e => set("phone", e.target.value)} />
//             {errors.phone && <span className="kbf-error-text">{errors.phone}</span>}
//           </div>
//           <div className="kbf-group">
//             <label className="kbf-label required">Email</label>
//             <input className={`kbf-input${errors.email ? " error" : ""}`} type="email" value={info.email} onChange={e => set("email", e.target.value)} />
//             {errors.email && <span className="kbf-error-text">{errors.email}</span>}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Room-based Group Guests Step ────────────────────────────────────────────
// interface RoomData {
//   roomNumber: string;
//   roomType: string;
//   guests: GroupGuestData[];
// }

// // Bridge the single "Other" charge row (stored in `discounts.otherAmount*`)
// // into the ServiceCharge[] shape the pricing hook + payload expect.
// function buildOtherCharges(d: any): ServiceCharge[] {
//   const amt = parseFloat(d?.otherAmountRate || "0");
//   if (!amt) return [];
//   const discType = d.otherAmountDiscountType || "%";
//   const discVal = parseFloat(d.otherAmountDiscount || "0");
//   const after = discType === "cash"
//     ? Math.max(0, amt - discVal)
//     : Math.max(0, amt - (amt * discVal / 100));
//   return [{
//     description: d.otherAmountDescription || d.otherAmountNotes || "Other",
//     amount: amt.toFixed(2),
//     discount: discVal.toFixed(2),
//     total: after.toFixed(2),
//   }];
// }

// function emptyGroupGuestForRoom(num: number, roomNumber: string, roomType: string): GroupGuestData {
//   return {
//     guestNumber: num, title: "", firstName: "", middleName: "", lastName: "",
//     dob: "", gender: "", countryCode: "", contact: "", email: "",
//     anniversary: "", nationality: "", country: "", state: "", zip: "", address: "",
//     arrivalDate: "", departureDate: "", nights: 0, repeatGuest: "", packageType: "rack",
//     programme: "", roomType, roomNumber, occupancy: "Single",
//   };
// }

// function GroupGuestForm({
//   guest, onChange, roomNumber, programmes, apiData, errors = {},
// }: {
//   guest: GroupGuestData; onChange: (g: GroupGuestData) => void;
//   roomNumber: string; programmes: string[]; apiData: any; errors?: Record<string, string>;
// }) {
//   const set = (k: keyof GroupGuestData, v: any) => onChange({ ...guest, [k]: v });
//   const countryStateMap = apiData?.countryStateMap || DEFAULT_COUNTRY_STATE_MAP;
//   const countries = Object.keys(countryStateMap);
//   const states = guest.country ? (countryStateMap[guest.country] || ["Other"]) : [];

//   // auto-calculate nights
//   const calcNights = (a: string, d: string) => {
//     if (!a || !d) return 0;
//     const diff = (new Date(d).getTime() - new Date(a).getTime()) / 86400000;
//     return Math.max(0, Math.round(diff));
//   };

//   const err = (k: string) => errors[k] ? " error" : "";

//   return (
//     <div style={{ border: `1px solid ${Object.keys(errors).length ? "#dc3545" : "#e0e0e0"}`, borderRadius: 8, padding: 16, marginBottom: 12, backgroundColor: "#fafafa" }}>
//       {Object.keys(errors).length > 0 && (
//         <div style={{ background: "#fff3f3", border: "1px solid #dc3545", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#dc3545" }}>
//           <i className="fas fa-exclamation-triangle" /> Please fill all required fields for this guest.
//         </div>
//       )}
//       <div className="kbf-row">
//         <div className="kbf-group">
//           <label className="kbf-label required">Title</label>
//           <select className={`kbf-select${err("title")}`} value={guest.title} onChange={e => set("title", e.target.value)}>
//             <option value="" disabled>-- Select --</option>
//             {["MR.", "MRS.", "MS.", "MISS.", "DR.", "PROF"].map(t => <option key={t}>{t}</option>)}
//           </select>
//           {errors.title && <span className="kbf-error-text">{errors.title}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">First Name</label>
//           <input className={`kbf-input${err("firstName")}`} value={guest.firstName} onChange={e => set("firstName", e.target.value)} />
//           {errors.firstName && <span className="kbf-error-text">{errors.firstName}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label">Middle Name</label>
//           <input className="kbf-input" value={guest.middleName} onChange={e => set("middleName", e.target.value)} />
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label">Last Name</label>
//           <input className="kbf-input" value={guest.lastName} onChange={e => set("lastName", e.target.value)} />
//         </div>
//       </div>
//       {/* Row 2: DOB | Gender | Contact (span 2) — 4 cols */}
//       <div className="kbf-row">
//         <div className="kbf-group">
//           <label className="kbf-label">Date of Birth</label>
//           <input className="kbf-input" type="date" value={guest.dob} onChange={e => set("dob", e.target.value)} />
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">Gender</label>
//           <select className={`kbf-select${err("gender")}`} value={guest.gender} onChange={e => set("gender", e.target.value)}>
//             <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
//           </select>
//           {errors.gender && <span className="kbf-error-text">{errors.gender}</span>}
//         </div>
//         <div className="kbf-group kbf-col-2">
//           <label className="kbf-label required">Contact No.</label>
//           <div className="kbf-phone-row">
//             <select className="kbf-select" value={guest.countryCode} onChange={e => set("countryCode", e.target.value)}>
//               {COUNTRY_CODES.map(c => (
//                 <option key={`${c.code}-${c.name}`} value={c.code}>{c.name}</option>
//               ))}
//             </select>
//             <input className={`kbf-input${err("contact")}`} type="number" value={guest.contact} onChange={e => set("contact", e.target.value)} placeholder="Mobile number" />
//           </div>
//           {errors.contact && <span className="kbf-error-text">{errors.contact}</span>}
//         </div>
//       </div>
//       {/* Row 3: Email | Anniversary | Nationality — 3 cols */}
//       <div className="kbf-row cols-3">
//         <div className="kbf-group">
//           <label className="kbf-label required">Email</label>
//           <input className={`kbf-input${err("email")}`} type="email" value={guest.email} onChange={e => set("email", e.target.value)} />
//           {errors.email && <span className="kbf-error-text">{errors.email}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label">Date of Anniversary</label>
//           <input className="kbf-input" type="date" value={guest.anniversary} onChange={e => set("anniversary", e.target.value)} />
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label">Nationality</label>
//           <input className="kbf-input" value={guest.nationality} onChange={e => set("nationality", e.target.value)} />
//         </div>
//       </div>
//       {/* Row 4: Country | State | Zip — 3 cols */}
//       <div className="kbf-row cols-3">
//         <div className="kbf-group">
//           <label className="kbf-label required">Country</label>
//           <select className={`kbf-select${err("country")}`} value={guest.country} onChange={e => onChange({ ...guest, country: e.target.value, state: "" })}>
//             <option value="">-- Select Country --</option>
//             {countries.map(c => <option key={c}>{c}</option>)}
//           </select>
//           {errors.country && <span className="kbf-error-text">{errors.country}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">Province/State</label>
//           <select className={`kbf-select${err("state")}`} value={guest.state} onChange={e => set("state", e.target.value)}>
//             <option value="">Select State</option>
//             {states.map((s: string) => <option key={s}>{s}</option>)}
//           </select>
//           {errors.state && <span className="kbf-error-text">{errors.state}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">Zip/Postcode</label>
//           <input className={`kbf-input${err("zip")}`} value={guest.zip} onChange={e => set("zip", e.target.value)} />
//           {errors.zip && <span className="kbf-error-text">{errors.zip}</span>}
//         </div>
//       </div>
//       <div className="kbf-row">
//         <div className="kbf-group" style={{ gridColumn: "1 / -1" }}>
//           <label className="kbf-label required">Home Address</label>
//           <textarea className={`kbf-textarea${err("address")}`} value={guest.address} onChange={e => set("address", e.target.value)} rows={2} style={{ width: "100%" }} />
//           {errors.address && <span className="kbf-error-text">{errors.address}</span>}
//         </div>
//       </div>
//       {/* Row 5: Arrival | Departure | Nights — 3 cols */}
//       <div className="kbf-row cols-3">
//         <div className="kbf-group">
//           <label className="kbf-label required">Arrival Date</label>
//           <input className={`kbf-input${err("arrivalDate")}`} type="date" value={guest.arrivalDate}
//             onChange={e => onChange({ ...guest, arrivalDate: e.target.value, nights: calcNights(e.target.value, guest.departureDate) })} />
//           {errors.arrivalDate && <span className="kbf-error-text">{errors.arrivalDate}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">Departure Date</label>
//           <input className={`kbf-input${err("departureDate")}`} type="date" value={guest.departureDate} min={guest.arrivalDate || undefined}
//             onChange={e => onChange({ ...guest, departureDate: e.target.value, nights: calcNights(guest.arrivalDate, e.target.value) })} />
//           {errors.departureDate && <span className="kbf-error-text">{errors.departureDate}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label">No. of Nights</label>
//           <input className="kbf-input" value={guest.nights || 0} readOnly style={{ backgroundColor: "#f0f0f0" }} />
//           <span style={{ fontSize: 11, color: "#888" }}>Auto-calculated</span>
//         </div>
//       </div>
//       {/* Row 6: Repeat Guest | Package Type | Programme/Package — 3 cols */}
//       <div className="kbf-row cols-3">
//         <div className="kbf-group">
//           <label className="kbf-label required">Repeat Guest</label>
//           <select className={`kbf-select${err("repeatGuest")}`} value={guest.repeatGuest} onChange={e => set("repeatGuest", e.target.value as any)}>
//             <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
//           </select>
//           {errors.repeatGuest && <span className="kbf-error-text">{errors.repeatGuest}</span>}
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">Package Type</label>
//           <div className="kbf-radio-group">
//             <label className="kbf-radio-label">
//               <input type="radio" name={`pkg-${roomNumber}-${guest.guestNumber}`} value="rack" checked={guest.packageType === "rack"} onChange={() => set("packageType", "rack")} />
//               Rack Rate
//             </label>
//             <label className="kbf-radio-label">
//               <input type="radio" name={`pkg-${roomNumber}-${guest.guestNumber}`} value="net" checked={guest.packageType === "net"} onChange={() => set("packageType", "net")} disabled />
//               Net Rate
//             </label>
//           </div>
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">Programme/Package</label>
//           <select className={`kbf-select${err("programme")}`} value={guest.programme} onChange={e => set("programme", e.target.value)}>
//             <option value="">-- select --</option>
//             {programmes.map(p => <option key={p}>{p}</option>)}
//           </select>
//           {errors.programme && <span className="kbf-error-text">{errors.programme}</span>}
//         </div>
//       </div>
//       {/* Row 7: Room Type | Room No. | Occupancy — 3 cols */}
//       <div className="kbf-row cols-3">
//         <div className="kbf-group">
//           <label className="kbf-label">Room Type</label>
//           <input className="kbf-input" value={guest.roomType} readOnly style={{ backgroundColor: "#f0f0f0" }} />
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label">Room No.</label>
//           <input className="kbf-input" value={guest.roomNumber} readOnly style={{ backgroundColor: "#f0f0f0" }} />
//         </div>
//         <div className="kbf-group">
//           <label className="kbf-label required">Occupancy</label>
//           <div className="kbf-radio-group">
//             <label className="kbf-radio-label">
//               <input type="radio" name={`occ-${roomNumber}-${guest.guestNumber}`} value="Single" checked={guest.occupancy === "Single"} onChange={() => set("occupancy", "Single")} />
//               Single
//             </label>
//             <label className="kbf-radio-label">
//               <input type="radio" name={`occ-${roomNumber}-${guest.guestNumber}`} value="Double" checked={guest.occupancy === "Double"} onChange={() => set("occupancy", "Double")} />
//               Double
//             </label>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function StepGroupGuests({
//   rooms, onChange, programmes, apiData, errors = {}, roomMaxPaxMap = {},
// }: {
//   rooms: RoomData[]; onChange: (rooms: RoomData[]) => void;
//   programmes: string[]; apiData: any; errors?: Record<string, string>; roomMaxPaxMap?: Record<string, number>;
// }) {
//   const updateRoom = (ri: number, r: RoomData) => { const arr = [...rooms]; arr[ri] = r; onChange(arr); };
//   const addGuest = (ri: number) => {
//     const room = rooms[ri];
//     const newGuest = emptyGroupGuestForRoom(room.guests.length + 1, room.roomNumber, room.roomType);
//     updateRoom(ri, { ...room, guests: [...room.guests, newGuest] });
//   };
//   const removeGuest = (ri: number, gi: number) => {
//     const room = rooms[ri];
//     const updated = room.guests.filter((_, i) => i !== gi).map((g, i) => ({ ...g, guestNumber: i + 1 }));
//     updateRoom(ri, { ...room, guests: updated });
//   };

//   if (rooms.length === 0) {
//     return (
//       <div className="kbf-card">
//         <div className="kbf-card-header"><div className="kbf-card-step-no">2</div><i className="fas fa-users" /><h2>Guest Info (Per Room)</h2></div>
//         <div className="kbf-card-body" style={{ textAlign: "center", color: "#888", padding: 40 }}>
//           <i className="fas fa-bed" style={{ fontSize: 40, marginBottom: 12, display: "block" }} />
//           No rooms assigned. Please go back and set Group Pax first, then rooms will be auto-assigned from API.
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div>
//       {rooms.map((room, ri) => (
//         <div key={ri} className="kbf-card" style={{ marginBottom: 20 }}>
//           {/* Room Header */}
//           <div className="kbf-card-header" style={{ justifyContent: "space-between" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//               <div className="kbf-card-step-no"><i className="fas fa-bed" /></div>
//               <i className="fas fa-bed" />
//               <h2>Room {ri + 1} (Room No: {room.roomNumber})</h2>
//             </div>
//             <span style={{
//               backgroundColor: "#7b8a56", color: "#fff", borderRadius: 20,
//               padding: "3px 12px", fontSize: 12, fontWeight: 700
//             }}>
//               {room.guests.length} / {roomMaxPaxMap[room.roomType] || 3} Guests
//             </span>
//           </div>
//           <div className="kbf-card-body">
//             {/* Guests inside this room */}
//             {room.guests.map((guest, gi) => (
//               <div key={gi}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
//                   <div style={{ fontWeight: 600, fontSize: 14, color: "#3a4a1e", display: "flex", alignItems: "center", gap: 6 }}>
//                     <i className="fas fa-user" />
//                     Guest - {gi + 1}
//                   </div>
//                   {room.guests.length > 1 && (
//                     <button type="button" onClick={() => removeGuest(ri, gi)} className="kbf-remove-btn">
//                       <i className="fas fa-trash" /> Remove
//                     </button>
//                   )}
//                 </div>
//                 <GroupGuestForm
//                   guest={guest}
//                   onChange={ng => {
//                     const updated = [...room.guests];
//                     updated[gi] = ng;
//                     updateRoom(ri, { ...room, guests: updated });
//                   }}
//                   roomNumber={room.roomNumber}
//                   programmes={programmes}
//                   apiData={apiData}
//                   errors={Object.fromEntries(
//                     Object.entries(errors)
//                       .filter(([k]) => k.startsWith(`r${ri}_g${gi}_`))
//                       .map(([k, v]) => [k.replace(`r${ri}_g${gi}_`, ""), v])
//                   )}
//                 />
//               </div>
//             ))}
//             {/* Add Guest Button */}
//             <div style={{ textAlign: "center", marginTop: 12 }}>
//               <button
//                 type="button"
//                 className="kbf-add-btn"
//                 onClick={() => addGuest(ri)}
//                 style={{ padding: "8px 24px" }}
//               >
//                 <i className="fas fa-plus" /> Add Guest to Room {room.roomNumber}
//               </button>
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ─── Review Step ──────────────────────────────────────────────────────────────
// function StepReview({ bookingType, primaryGuest, primaryBookingDetails, groupInfo, pricing, advancePayment }: any) {
//   const pb = pricing?.paymentBreakdown;
//   const grandTotalNum = parseFloat(pb?.grandTotal || "0");
//   const receivedNum = advancePayment?.isAdvancePayment ? (parseFloat(advancePayment?.amount || "0") || 0) : 0;
//   const balanceDue = Math.max(0, grandTotalNum - receivedNum).toFixed(2);
//   return (
//     <div className="kbf-card">
//       <div className="kbf-card-header"><div className="kbf-card-step-no"><i className="fas fa-check" /></div><i className="fas fa-check-circle" /><h2>Review & Submit</h2></div>
//       <div className="kbf-card-body">
//         {bookingType === "individual" && primaryGuest && (
//           <table className="kbf-review-table" style={{ marginBottom: 16 }}>
//             <thead><tr><th colSpan={2}>Guest Summary</th></tr></thead>
//             <tbody>
//               <tr><td>Name</td><td>{primaryGuest.title} {primaryGuest.firstName} {primaryGuest.lastName}</td></tr>
//               <tr><td>Email</td><td>{primaryGuest.email}</td></tr>
//               <tr><td>Contact</td><td>{primaryGuest.countryCode} {primaryGuest.contact}</td></tr>
//               <tr><td>Arrival</td><td>{primaryBookingDetails?.arrivalDate}</td></tr>
//               <tr><td>Departure</td><td>{primaryBookingDetails?.departureDate}</td></tr>
//               <tr><td>Nights</td><td>{primaryBookingDetails?.nights}</td></tr>
//               <tr><td>Programme</td><td>{primaryBookingDetails?.programme}</td></tr>
//             </tbody>
//           </table>
//         )}
//         {bookingType === "group" && groupInfo && (
//           <table className="kbf-review-table" style={{ marginBottom: 16 }}>
//             <thead><tr><th colSpan={2}>Group Summary</th></tr></thead>
//             <tbody>
//               <tr><td>Group Name</td><td>{groupInfo.name}</td></tr>
//               <tr><td>Pax</td><td>{groupInfo.pax}</td></tr>
//               <tr><td>Email</td><td>{groupInfo.email}</td></tr>
//             </tbody>
//           </table>
//         )}
//         {pb && (
//           <table className="kbf-review-table">
//             <thead><tr><th colSpan={2}>Payment Summary</th></tr></thead>
//             <tbody>
//               <tr><td>Treatment Total</td><td>{pb.treatmentTotal}</td></tr>
//               <tr><td>Room Total</td><td>{pb.roomTotal}</td></tr>
//               <tr><td>Food Total</td><td>{pb.foodTotal}</td></tr>
//               <tr><td>Transportation</td><td>{pb.transportationTotal}</td></tr>
//               <tr><td><strong>Grand Total</strong></td><td><strong>{pb.grandTotal}</strong></td></tr>
//               <tr><td>Discount %</td><td>{pb.discountPercentage}%</td></tr>
//               <tr><td>Advance Received</td><td>{receivedNum.toFixed(2)}</td></tr>
//               <tr><td><strong>Balance Due</strong></td><td><strong>{balanceDue}</strong></td></tr>
//             </tbody>
//           </table>
//         )}
//         <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10, padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px", backgroundColor: "#fafafa" }}>
//           <input type="checkbox" id="final-review" defaultChecked required style={{ width: 18, height: 18, cursor: "pointer" }} />
//           <label htmlFor="final-review" style={{ fontSize: 14, fontWeight: "600", cursor: "pointer", color: "#333" }}>
//             I confirm all information is accurate and ready to submit <span style={{ color: "#d9534f" }}>*</span>
//           </label>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Main BookingForm Component ───────────────────────────────────────────────
// interface BookingFormProps {
//   bookingId?: string;
//   formType?: "individual" | "group";
//   onSuccess?: (bookingId: string) => void;
// }

// export default function BookingForm({ bookingId, formType = "individual", onSuccess }: BookingFormProps) {
//   const [bookingType, setBookingType] = useState<"individual" | "group">(formType);
//   const [step, setStep] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [apiData, setApiData] = useState<any>(null);

//   // Individual form state
//   const [primaryGuest, setPrimaryGuest] = useState<GuestData>(emptyGuest(1));
//   const [primaryBookingDetails, setPrimaryBookingDetails] = useState<BookingDetails>({ arrivalDate: "", departureDate: "", nights: 0, repeatGuest: "", packageType: "rack", programme: "", roomType: "", roomNumber: "", occupancy: "Single" });
//   const [secondaryGuests, setSecondaryGuests] = useState<GuestData[]>([]);
//   const [children, setChildren] = useState<any[]>([]);

//   // Group form state
//   const [groupInfo, setGroupInfo] = useState<GroupInfo>({ pax: "", name: "", referenceBy: "", country: "", phone: "", email: "" });
//   const [groupGuests, setGroupGuests] = useState<GroupGuestData[]>([]);
//   const [groupRooms, setGroupRooms] = useState<RoomData[]>([]);

//   const hasIndividualData = !!bookingId ||
//     (primaryGuest.firstName || "").trim() !== "" ||
//     (primaryGuest.lastName || "").trim() !== "" ||
//     (primaryGuest.contact || "").trim() !== "" ||
//     (primaryGuest.email || "").trim() !== "" ||
//     secondaryGuests.length > 0 ||
//     children.length > 0;

//   const hasGroupData = !!bookingId ||
//     (groupInfo.name || "").trim() !== "" ||
//     (groupInfo.pax || "").trim() !== "" ||
//     (groupInfo.phone || "").trim() !== "" ||
//     (groupInfo.email || "").trim() !== "";

//   // Shared
//   const [additionalInfo, setAdditionalInfo] = useState<any>({});
//   const [travelAgent, setTravelAgent] = useState<TravelAgentInfo>(emptyTravelAgent());
//   const [discounts, setDiscounts] = useState<any>({ roomDiscountType: "%", roomDiscount: "0", foodDiscountType: "%", foodDiscount: "0", treatmentDiscountType: "%", treatmentDiscount: "0", transportationCost: "0", transportationDiscountType: "%", transportationDiscount: "0", subTotalDiscountType: "%", subTotalDiscount: "0", grandTotalDiscountType: "%", grandTotalDiscount: "0" });
//   const [currency, setCurrency] = useState("INR");
//   const [otherCharges, setOtherCharges] = useState<ServiceCharge[]>([]);
//   const [advancePayment, setAdvancePayment] = useState<AdvancePayment>(emptyAdvancePayment());
//   const [approval, setApproval] = useState<ApprovalInfo>(emptyApproval());
//   const hasLoadedData = useRef(false);
//   const hasLoadedBooking = useRef(false);
//   const groupPrefillDone = useRef(false);

//   const programmes = apiData?.AllRackPackages ? Object.keys(apiData.AllRackPackages) : [];
//   const steps = bookingType === "individual" ? IND_STEPS : GRP_STEPS;

//   // Pricing hook
//   const pricing = useBookingPricing({
//     bookingType, currency, packageType: primaryBookingDetails.packageType,
//     taName: travelAgent.name, bookingDetails: primaryBookingDetails,
//     secondaryGuests, children, groupInfo, groupGuests, apiData,
//     ...discounts, otherCharges: buildOtherCharges(discounts),
//     isComplementary: advancePayment.isComplementary,
//     isVoucher: advancePayment.isVoucher,
//   });

//   // Fetch API data on mount
//   useEffect(() => {
//     if (hasLoadedData.current) return;
//     hasLoadedData.current = true;

//     const userInfo = typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("kairali_user") || "null") : null;
//     const authToken = typeof window !== "undefined" ? sessionStorage.getItem("authToken") : null;

//     async function loadData() {
//       try {
//         const res = await fetch(DATA_API);
//         const json = await res.json();
//         setApiData(json.data || json);
//       } catch { /* silent fallback */ }
//       setLoading(false);
//     }
//     loadData();
//   }, []);

//   // Prefill from API when bookingId is provided
//   useEffect(() => {
//     if (!bookingId || !apiData || hasLoadedBooking.current) return;
//     hasLoadedBooking.current = true;

//     async function loadBookingById() {
//       try {
//         setLoading(true);
//         const res = await fetch(`${DATA_API}?id=${bookingId}&formType=${formType}`);
//         if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//         const raw = await res.json();

//         // The API returns an object whose first key is the booking key
//         const bookingKey = Object.keys(raw)[0];
//         const bd = raw[bookingKey];
//         if (!bd) return;

//         // ── 1. Primary Guest ─────────────────────────────────────────────────
//         if (bd.primaryGuest) {
//           const pg = bd.primaryGuest;
//           setPrimaryGuest(prev => ({
//             ...prev,
//             title: pg['g1-title'] || prev.title,
//             firstName: pg['g1-firstname'] || prev.firstName,
//             middleName: pg['g1-middlename'] || prev.middleName,
//             lastName: pg['g1-lastname'] || prev.lastName,
//             dob: pg['g1-dob'] || prev.dob,
//             gender: pg['g1-gender'] || prev.gender,
//             countryCode: pg['g1-country-code'] || prev.countryCode,
//             contact: pg['g1-contact'] || prev.contact,
//             email: pg['g1-email'] || prev.email,
//             anniversary: pg['g1-anniversary'] || prev.anniversary,
//             nationality: pg['g1-nationality'] || prev.nationality,
//             country: pg['g1-country'] || prev.country,
//             state: pg['g1-province'] || prev.state,
//             zip: pg['g1-zip'] || prev.zip,
//             address: pg['g1-address'] || prev.address,
//           }));
//         }

//         // ── 2. Primary Booking Details ────────────────────────────────────────
//         if (bd.primaryBooking) {
//           const pb = bd.primaryBooking;
//           const fmt = (v: string) => {
//             if (!v) return '';
//             const d = new Date(v);
//             if (isNaN(d.getTime())) return v;
//             return d.toISOString().split('T')[0];
//           };
//           const arrival = fmt(pb['g1-arrival-date']);
//           const departure = fmt(pb['g1-departure-date']);
//           const nights = pb['g1-nights'] ? Number(pb['g1-nights']) : 0;
//           setPrimaryBookingDetails(prev => ({
//             ...prev,
//             arrivalDate: arrival || prev.arrivalDate,
//             departureDate: departure || prev.departureDate,
//             nights: nights || prev.nights,
//             repeatGuest: (pb['g1-repeat-guest'] as any) || prev.repeatGuest,
//             packageType: (pb['g1-package-type'] as any) || prev.packageType,
//             programme: pb['g1-programme'] || prev.programme,
//             roomType: pb['g1-room-type'] || prev.roomType,
//             roomNumber: pb['g1-room-no'] || prev.roomNumber,
//             occupancy: (pb['g1-room-cat'] as any) || prev.occupancy,
//           }));
//         }

//         // ── 3. Secondary Guests (individual only; group uses the same key below) ─
//         if (formType !== 'group' && bd.secondaryGuestPattern) {
//           const fmt = (v: string) => {
//             if (!v) return '';
//             const d = new Date(v);
//             if (isNaN(d.getTime())) return v;
//             return d.toISOString().split('T')[0];
//           };
//           const sgKeys = Object.keys(bd.secondaryGuestPattern)
//             .filter(k => k.startsWith('secondaryguest'))
//             .sort((a, b) => {
//               const na = parseInt(a.replace('secondaryguest', ''));
//               const nb = parseInt(b.replace('secondaryguest', ''));
//               return na - nb;
//             });

//           const sgList: GuestData[] = sgKeys.map((key, idx) => {
//             const gn = idx + 2; // secondary guests start at 2
//             const sg = bd.secondaryGuestPattern[key];
//             const pfx = `g${gn}`;
//             const sfx = `_${gn}`;
//             const bdSg = {
//               arrivalDate: fmt(sg[`${pfx}-arrival-date${sfx}`]) || '',
//               departureDate: fmt(sg[`${pfx}-departure-date${sfx}`]) || '',
//               nights: Number(sg[`${pfx}-nights${sfx}`]) || 0,
//               repeatGuest: (sg[`${pfx}-repeat-guest${sfx}`] as any) || '',
//               packageType: (sg[`${pfx}-package-type${sfx}`] as any) || 'rack',
//               programme: sg[`${pfx}-programme${sfx}`] || '',
//               roomType: sg[`${pfx}-room-type${sfx}`] || '',
//               roomNumber: sg[`${pfx}-room-no${sfx}`] || '',
//               occupancy: (sg[`${pfx}-room-cat${sfx}`] as any) || 'Single',
//             };
//             return {
//               guestNumber: gn,
//               title: sg[`${pfx}-title${sfx}`] || '',
//               firstName: sg[`${pfx}-firstname${sfx}`] || '',
//               middleName: sg[`${pfx}-middlename${sfx}`] || '',
//               lastName: sg[`${pfx}-lastname${sfx}`] || '',
//               dob: sg[`${pfx}-dob${sfx}`] || '',
//               gender: sg[`${pfx}-gender${sfx}`] || '',
//               countryCode: sg[`${pfx}-country-code${sfx}`] || '',
//               contact: sg[`${pfx}-contact${sfx}`] || '',
//               email: sg[`${pfx}-email${sfx}`] || '',
//               anniversary: sg[`${pfx}-anniversary${sfx}`] || '',
//               nationality: sg[`${pfx}-nationality${sfx}`] || '',
//               country: sg[`${pfx}-country${sfx}`] || '',
//               state: sg[`${pfx}-province${sfx}`] || '',
//               zip: sg[`${pfx}-zip${sfx}`] || '',
//               address: sg[`${pfx}-address${sfx}`] || '',
//               bookingDetails: bdSg,
//             };
//           });
//           setSecondaryGuests(sgList);
//         }

//         // ── 4. Children ───────────────────────────────────────────────────────
//         if (bd.children) {
//           const chData = bd.children;
//           const count = parseInt(chData['children-count']) || 0;
//           const chList = Array.from({ length: count }, (_, i) => ({
//             childNumber: i + 1,
//             name: chData[`child${i + 1}-name`] || '',
//             age: chData[`child${i + 1}-age`] || '',
//           }));
//           setChildren(chList);
//         }

//         // ── 5. Additional Info ────────────────────────────────────────────────
//         if (bd.additionalInfo) {
//           const ai = bd.additionalInfo;
//           setAdditionalInfo({
//             clientCategory: ai['client-category'] || '',
//             clientType: ai['client-type'] || '',
//             paymentTerms: ai['payment-terms'] || '',
//             dataSource: ai['data-source'] || '',
//             transportationDetails: ai['transportation-details'] || '',
//             referredBy: ai['referred-by'] || '',
//             healthInformation: ai['health-information'] || '',
//             testReports: ai['uploadTestReport'] || ai['test-reports'] || '',
//           });
//         }

//         // ── 6. Travel Agent ───────────────────────────────────────────────────
//         if (bd.travelAgent) {
//           const ta = bd.travelAgent;
//           const hasAgent = !ta['no-agent'];
//           setTravelAgent({
//             hasAgent,
//             name: ta['agent-name'] || '',
//             countryCode: ta['agent-country-code'] || '',
//             mobile: ta['agent-mobile'] || '',
//             email: ta['agent-email'] || '',
//             category: ta['agent-category'] || '',
//             commission: ta['agent-commission'] || '',
//             remarks: ta['agent-remarks'] || '',
//           });
//         }

//         // ── 7. Advance Payment ────────────────────────────────────────────────
//         if (bd.advancePayment) {
//           const ap = bd.advancePayment;
//           const hasAdvance = !!(ap['received-amount'] && ap['received-amount'] !== '');
//           setAdvancePayment(prev => ({
//             ...prev,
//             isAdvancePayment: hasAdvance,
//             paymentReceivedDate: ap['payment-datetime'] || prev.paymentReceivedDate || '',
//             amount: ap['received-amount'] || prev.amount,
//             paymentMode: ap['payment-mode'] || prev.paymentMode,
//             transactionNo: ap['transaction-no'] || prev.transactionNo,
//             paymentLocation: ap['payment-location'] || prev.paymentLocation || '',
//             paymentCollectionBy: ap['payment-by'] || prev.paymentCollectionBy || 'Admin',
//             remarks: ap['payment-remarks'] || prev.remarks,
//           }));
//         }

//         // ── 8. Approval ───────────────────────────────────────────────────────
//         if (bd.approval) {
//           const ap = bd.approval;
//           const hasApproval = !!(ap['approval-date'] && ap['approval-date'] !== '');
//           setApproval(prev => ({
//             ...prev,
//             isApprovalRequired: hasApproval,
//             approvalGivenDate: ap['approval-date'] || prev.approvalGivenDate || '',
//             approvalValidTillDate: ap['approved-till-date'] || prev.approvalValidTillDate || '',
//             approvedBy: ap['approved-by'] || prev.approvedBy,
//             remarks: ap['approval-remarks'] || prev.remarks,
//           }));
//         }

//         // ── 9. Group Info + Guests (group bookings) ───────────────────────────
//         // NOTE: detect group strictly by formType / explicit group marker.
//         // Do NOT use secondaryGuestPattern — it also holds INDIVIDUAL secondary guests.
//         const isGroup = formType === 'group' || !!bd['grp'];
//         if (isGroup) {
//           setBookingType('group');
//           setGroupInfo({
//             pax: String(bd['group-pax'] || ''),
//             name: bd['group-name'] || '',
//             referenceBy: bd['grp-ref-name'] || '',
//             country: bd['grp-country'] || '',
//             phone: bd['grp-phone'] || '',
//             email: bd['grp-email'] || '',
//           });

//           if (bd.secondaryGuestPattern) {
//             const fmtDate = (v: string) => {
//               if (!v) return '';
//               const d = new Date(v);
//               return isNaN(d.getTime()) ? v : d.toISOString().split('T')[0];
//             };
//             const paxCount = parseInt(bd['group-pax']) || 0;
//             const guests: GroupGuestData[] = [];
//             for (let i = 1; i <= paxCount; i++) {
//               const sg = bd.secondaryGuestPattern[`secondaryguest${i}`];
//               if (!sg) continue;
//               const s = `_${i}`;
//               guests.push({
//                 guestNumber: i,
//                 editId: sg[`grp_editID${s}`] || '',
//                 patientId: sg[`grp_patientID${s}`] || '',
//                 title: sg[`grp-title${s}`] || '',
//                 firstName: sg[`grp-firstname${s}`] || '',
//                 middleName: sg[`grp-middlename${s}`] || '',
//                 lastName: sg[`grp-lastname${s}`] || '',
//                 dob: sg[`grp-dob${s}`] || '',
//                 gender: sg[`grp-gender${s}`] || sg[`g1-gender${s}`] || '',
//                 countryCode: sg[`grp-country-code${s}`] || '',
//                 contact: sg[`grp-contact${s}`] || '',
//                 email: sg[`grp-email${s}`] || sg[`grp-mail${s}`] || '',
//                 anniversary: sg[`grp-anniversary${s}`] || '',
//                 nationality: sg[`grp-nationality${s}`] || '',
//                 country: sg[`grp-country${s}`] || '',
//                 state: sg[`grp-province${s}`] || '',
//                 zip: sg[`grp-zip${s}`] || '',
//                 address: sg[`grp-address${s}`] || '',
//                 arrivalDate: fmtDate(sg[`grp-arrival-date${s}`]),
//                 departureDate: fmtDate(sg[`grp-departure-date${s}`]),
//                 nights: Number(sg[`grp-nights${s}`]) || 0,
//                 repeatGuest: (sg[`grp-repeat-guest${s}`] as any) || '',
//                 packageType: sg[`grp-package-type${s}`] || 'rack',
//                 programme: sg[`grp-programme${s}`] || '',
//                 roomType: sg[`grp-room-type${s}`] || '',
//                 roomNumber: sg[`grp-room-no${s}`] || '',
//                 occupancy: sg[`grp-room-cat${s}`] || 'Single',
//               });
//             }
//             // Group guests into rooms by room number
//             const roomMap = new Map<string, RoomData>();
//             guests.forEach(g => {
//               const key = g.roomNumber || `R${g.guestNumber}`;
//               if (!roomMap.has(key)) roomMap.set(key, { roomNumber: key, roomType: g.roomType, guests: [] });
//               const room = roomMap.get(key)!;
//               room.guests.push({ ...g, guestNumber: room.guests.length + 1 });
//             });
//             const rooms = Array.from(roomMap.values());
//             groupPrefillDone.current = true; // prevent pax-sync effect from clobbering
//             setGroupRooms(rooms);
//             setGroupGuests(rooms.flatMap(r => r.guests));
//           }
//         } else {
//           setBookingType('individual');
//         }

//       } catch (err: any) {
//         console.error('loadBookingById failed:', err);
//         alert('Failed to load booking. Please try again.\n' + err.message);
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadBookingById();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [bookingId, apiData]);
//   // Sync group rooms from API data when pax changes
//   useEffect(() => {
//     const n = parseInt(groupInfo.pax) || 0;
//     if (n === 0) { setGroupRooms([]); return; }
//     if (groupPrefillDone.current) { groupPrefillDone.current = false; return; }
//     // Build rooms from API RoomData or generate placeholders
//     const apiRooms: { roomNumber: string; roomType: string }[] = apiData?.RoomData
//       ? Object.entries(apiData.RoomData as Record<string, string>)
//         .map(([num, type]) => ({ roomNumber: num, roomType: type as string }))
//         .slice(0, n)
//       : Array.from({ length: n }, (_, i) => ({ roomNumber: `R${i + 1}`, roomType: "CLASSIC VILLA" }));
//     setGroupRooms(prev => {
//       if (prev.length === apiRooms.length) return prev; // no change
//       return apiRooms.map((r, i) => ({
//         roomNumber: r.roomNumber,
//         roomType: r.roomType,
//         guests: prev[i]?.guests || [emptyGroupGuestForRoom(1, r.roomNumber, r.roomType)],
//       }));
//     });
//     // Flatten rooms -> groupGuests for backward compat with pricing/submit
//     setGroupGuests(groupRooms.flatMap(r => r.guests));
//   }, [groupInfo.pax, apiData]);

//   // Keep groupGuests in sync with groupRooms for pricing hook
//   useEffect(() => {
//     setGroupGuests(groupRooms.flatMap(r => r.guests));
//   }, [groupRooms]);

//   const handleNext = useCallback(() => {
//     const errs = validateStep(step, {
//       primaryGuest,
//       primaryBookingDetails,
//       secondaryGuests,
//       children,
//       groupInfo,
//       groupRooms,
//       additionalInfo,
//       travelAgent,
//       advancePayment,
//       approval
//     }, bookingType);
//     if (Object.keys(errs).length > 0) {
//       setErrors(errs);
//       // Show a toast-like alert summarising the first error
//       const firstErr = Object.values(errs)[0];
//       alert(`⚠️ Please fill all required fields before proceeding.\n\n${firstErr}`);
//       return;
//     }
//     setErrors({});
//     setStep(s => Math.min(s + 1, steps.length - 1));
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   }, [step, primaryGuest, primaryBookingDetails, secondaryGuests, children, groupInfo, groupRooms, bookingType, steps.length, additionalInfo, travelAgent, advancePayment, approval]);

//   const handlePrev = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); };

//   const handleSubmit = async () => {
//     const finalReviewCheckbox = document.getElementById("final-review") as HTMLInputElement;
//     if (finalReviewCheckbox && !finalReviewCheckbox.checked) {
//       alert("⚠️ Please check the box to confirm that all information is accurate and ready to submit.");
//       return;
//     }
//     setSubmitting(true);
//     const userInfo = typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("kairali_user") || "null") : null;

//     // ── Map advance payment to original backend contract ──
//     const advGrandTotal = parseFloat(pricing?.paymentBreakdown?.grandTotal) || 0;
//     const advReceived = parseFloat(advancePayment.amount) || 0;
//     const adv = advancePayment.isAdvancePayment;
//     const advancePaymentPayload = {
//       received: adv,
//       date: adv ? (advancePayment.paymentReceivedDate || "") : "",
//       mode: adv ? advancePayment.paymentMode : "",
//       transactionNo: adv ? advancePayment.transactionNo : "",
//       location: adv ? (advancePayment.paymentLocation || "") : "",
//       collectedBy: adv ? (advancePayment.paymentCollectionBy || "") : "",
//       amount: adv ? advancePayment.amount : "",
//       totalAmount: advGrandTotal.toFixed(2),
//       percentage: advGrandTotal > 0 ? ((advReceived / advGrandTotal) * 100).toFixed(2) : "0.00",
//       pending: Math.max(0, advGrandTotal - advReceived).toFixed(2),
//       currency: currency,
//       screenshot: {
//         fileName: adv ? (advancePayment.screenshotName || "") : "",
//         mimeType: adv ? (advancePayment.screenshotType || "") : "",
//         data: adv ? (advancePayment.screenshotBase64 || "") : "",
//       },
//     };

//     // ── Map approval to original backend contract ──
//     const appReq = approval.isApprovalRequired;
//     const approvalPayload = {
//       required: appReq,
//       date: appReq ? (approval.approvalGivenDate || "") : "",
//       approvedTill: appReq ? (approval.approvalValidTillDate || "") : "",
//       approvedBy: appReq ? approval.approvedBy : "",
//       remarks: appReq ? approval.remarks : "",
//       approvalTakenBy: appReq ? (userInfo?.name || "") : "",
//       screenshot: {
//         fileName: appReq ? (approval.screenshotName || "") : "",
//         mimeType: appReq ? (approval.screenshotType || "") : "",
//         data: appReq ? (approval.screenshotBase64 || "") : "",
//       },
//     };

//     const payload = {
//       bookingId: bookingId,//document.getElementById("guest-id") ? ((document.getElementById("guest-id") as any)?.value || "") : "",//bookingId || document.getElementById("guest-id") ? (document.getElementById("guest-id") as any)?.value || "" : "",
//       submissionDate: new Date().toISOString(),
//       bookingType,
//       bookingEditStatus: getBookingEditStatus(),//bookingId ? "edit" : "new",
//       bookingTakenBy: userInfo?.name || "",
//       ...(bookingType === "individual" ? {
//         primaryGuest,
//         bookingDetails: primaryBookingDetails,
//         secondaryGuests,
//         children: { count: children.length, details: children },
//       } : {
//         groupInfo,
//         groupGuests,
//       }),
//       additionalInfo,
//       travelAgent,
//       payment: pricing.paymentBreakdown,
//       paxAmounts: { count: pricing.paxAmounts.length, breakdown: pricing.paxAmounts },
//       advancePayment: advancePaymentPayload,
//       approval: approvalPayload,
//     };
//     try {
//       await fetch(SUBMIT_API, { method: "POST", body: JSON.stringify(payload) });
//       setSubmitting(false);
//       if (onSuccess) onSuccess(payload.bookingId);
//       else alert("✅ Booking submitted successfully!");
//     } catch (e: any) {
//       setSubmitting(false);
//       alert("❌ Failed to submit. Please try again.\n" + e.message);
//     }
//   };

//   function getBookingEditStatus() {
//     if (advancePayment.isComplementary) {
//       return 'Complimentary';
//     }
//     if (advancePayment.isVoucher) {
//       return 'Voucher';
//     }
//     return bookingId ? 'Edit Required' : 'New';
//   }

//   const isLastStep = step === steps.length - 1;

//   function renderStep() {
//     if (bookingType === "individual") {
//       switch (step) {
//         case 0: return <Step0PrimaryGuest
//           guest={primaryGuest}
//           onChange={setPrimaryGuest}
//           errors={errors}
//           apiData={apiData}
//           primaryDetails={primaryBookingDetails}
//           onPrimaryDetailsChange={setPrimaryBookingDetails}
//           programmes={programmes}
//           roomMaxPaxMap={ROOM_MAX_PAX}
//         />;
//         case 1: return <Step1SecondaryGuests primaryDetails={primaryBookingDetails} onPrimaryDetailsChange={setPrimaryBookingDetails} secondaryGuests={secondaryGuests} onSecondaryChange={setSecondaryGuests} programmes={programmes} roomMaxPaxMap={ROOM_MAX_PAX} apiData={apiData} primaryGuest={primaryGuest} errors={errors} />;
//         case 2: return <Step2Children children={children} onChange={setChildren} errors={errors} />;
//         case 3: return <StepAdditionalInfo data={additionalInfo} onChange={setAdditionalInfo} apiData={apiData} errors={errors} />;
//         case 4: return <StepTravelAgent data={travelAgent} onChange={setTravelAgent} apiData={apiData} errors={errors} />;
//         case 5: return (
//           <StepPaymentBreakdown
//             pricing={pricing}
//             discounts={discounts}
//             onDiscountChange={setDiscounts}
//             currency={currency}
//             onCurrencyChange={setCurrency}
//             otherCharges={otherCharges}
//             onOtherChargesChange={setOtherCharges}
//             isComplementary={advancePayment.isComplementary}
//             onComplementaryChange={val => setAdvancePayment(prev => ({ ...prev, isComplementary: val, isVoucher: val ? false : prev.isVoucher }))}
//             isVoucher={advancePayment.isVoucher}
//             onVoucherChange={val => setAdvancePayment(prev => ({ ...prev, isVoucher: val, isComplementary: val ? false : prev.isComplementary }))}
//           />
//         );
//         case 6: return <StepAdvancePayment data={advancePayment} onChange={setAdvancePayment} errors={errors} currency={currency} pricing={pricing} />;
//         case 7: return <StepApproval data={approval} onChange={setApproval} errors={errors} />;
//         case 8: return <StepReview bookingType={bookingType} primaryGuest={primaryGuest} primaryBookingDetails={primaryBookingDetails} pricing={pricing} advancePayment={advancePayment} />;
//       }
//     } else {
//       switch (step) {
//         case 0: return <StepGroupInfo info={groupInfo} onChange={setGroupInfo} errors={errors} apiData={apiData} />;
//         case 1: return <StepGroupGuests rooms={groupRooms} onChange={setGroupRooms} programmes={programmes} apiData={apiData} errors={errors} roomMaxPaxMap={ROOM_MAX_PAX} />;
//         case 2: return <StepAdditionalInfo data={additionalInfo} onChange={setAdditionalInfo} apiData={apiData} prefix="grp" errors={errors} />;
//         case 3: return <StepTravelAgent data={travelAgent} onChange={setTravelAgent} apiData={apiData} prefix="grp" errors={errors} />;
//         case 4: return (
//           <StepPaymentBreakdown
//             pricing={pricing}
//             discounts={discounts}
//             onDiscountChange={setDiscounts}
//             currency={currency}
//             onCurrencyChange={setCurrency}
//             otherCharges={otherCharges}
//             onOtherChargesChange={setOtherCharges}
//             isComplementary={advancePayment.isComplementary}
//             onComplementaryChange={val => setAdvancePayment(prev => ({ ...prev, isComplementary: val, isVoucher: val ? false : prev.isVoucher }))}
//             isVoucher={advancePayment.isVoucher}
//             onVoucherChange={val => setAdvancePayment(prev => ({ ...prev, isVoucher: val, isComplementary: val ? false : prev.isComplementary }))}
//           />
//         );
//         case 5: return <StepAdvancePayment data={advancePayment} onChange={setAdvancePayment} errors={errors} currency={currency} pricing={pricing} />;
//         case 6: return <StepApproval data={approval} onChange={setApproval} errors={errors} />;
//         case 7: return <StepReview bookingType={bookingType} groupInfo={groupInfo} pricing={pricing} advancePayment={advancePayment} />;
//       }
//     }
//   }

//   if (loading) {
//     return (
//       <div className="kairali-booking-form">
//         <Loader isLoading={true} contentOnly={true} />
//       </div>
//     );
//   }

//   return (

//     <div className="kairali-booking-form">
//       {/* <div className="relative overflow-hidden -mt-6 sm:-mt-10 -mx-4 sm:-mx-6 lg:-mx-8 mb-6"
//         style={{
//           background: 'linear-gradient(135deg,#0f1f45 0%,#162d6b 45%,#1a3080 100%)',
//           borderBottom: '1px solid rgba(29,78,216,0.2)',
//           boxShadow: '0 4px 24px rgba(15,31,69,0.3)',
//         }}>
//         <div className="absolute inset-0 pointer-events-none"
//           style={{ background: 'linear-gradient(to right,rgba(29,78,216,0.05),transparent,rgba(99,102,241,0.08))' }} />
//         <div className="absolute -top-10 left-1/4 w-96 h-28 rounded-full pointer-events-none"
//           style={{ background: 'rgba(59,130,246,0.08)', filter: 'blur(48px)' }} />
//         <div className="relative w-full px-4 sm:px-6 lg:px-8 py-6">
          
//           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
//             <div className="flex items-center gap-5">
//               <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
//                 style={{
//                   background: 'linear-gradient(135deg,rgba(59,130,246,0.3) 0%,rgba(99,102,241,0.2) 100%)',
//                   border: '1px solid rgba(147,197,253,0.2)',
//                   boxShadow: '0 0 24px rgba(59,130,246,0.2)',
//                 }}>
                
//               </div>
//               <div className="min-w-0 flex-1">
//                 <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
//                   style={{ color: '#f0f7ff' }}>
//                   New Booking Form
//                 </h1>
//                 <p className="text-sm mt-1.5"
//                   style={{ color: 'rgba(147,197,253,0.55)' }}>
//                   New Booking Form
//                 </p>
//               </div>
//             </div>
//             <div className="flex w-full lg:w-auto justify-start lg:justify-end">
//               <div className="rounded-xl px-4 py-3"
//                 style={{
//                   background: 'rgba(255,255,255,0.04)',
//                   border: '1px solid rgba(147,197,253,0.15)',
//                 }}>
//                 <p className="text-xs font-semibold uppercase tracking-widest"
//                   style={{ color: 'rgba(147,197,253,0.55)' }}>Last Updated</p>
//                 <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(240,247,255,0.85)' }}>
//                   {''}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div> */}
//       <div className="kbf-wrapper">
//         {/* Form Type Toggle */}
//         <div className="kbf-type-toggle">
//           <button
//             className={`kbf-type-btn${bookingType === "individual" ? " active" : ""}`}
//             type="button"
//             disabled={bookingType === "group" && hasGroupData}
//             onClick={() => {
//               if (bookingId) { alert("Cannot switch booking type when editing."); return; }
//               setBookingType("individual");
//               setStep(0);
//             }}
//           >
//             Individual Booking
//           </button>
//           <button
//             className={`kbf-type-btn${bookingType === "group" ? " active" : ""}`}
//             type="button"
//             disabled={bookingType === "individual" && hasIndividualData}
//             onClick={() => {
//               if (bookingId) { alert("Cannot switch booking type when editing."); return; }
//               setBookingType("group");
//               setStep(0);
//             }}
//           >
//             Group Booking
//           </button>
//         </div>

//         {/* Step Tabs */}
//         <div className="kbf-step-tabs">
//           {steps.map((s, i) => (
//             <div key={i} className={`kbf-step-tab${i <= step ? " enabled" : ""}${i === step ? " active" : ""}`}
//               onClick={() => { if (i < step) setStep(i); }}>
//               <i className={`fas ${s.icon}`} />
//               <span>{s.label}</span>
//             </div>
//           ))}
//         </div>

//         {/* Active Step */}
//         {renderStep()}

//         {/* Navigation */}
//         <div className="kbf-nav-row">
//           {step > 0 && (
//             <button className="kbf-btn-prev" type="button" onClick={handlePrev}>
//               <i className="fas fa-arrow-left" style={{ marginRight: 6 }} /> Previous
//             </button>
//           )}
//           {!isLastStep ? (
//             <button className="kbf-btn-next" type="button" onClick={handleNext}>
//               Next <i className="fas fa-arrow-right" style={{ marginLeft: 6 }} />
//             </button>
//           ) : (
//             <button className="kbf-btn-submit" type="button" onClick={handleSubmit} disabled={submitting}>
//               {submitting ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Submitting…</> : <><i className="fas fa-check" style={{ marginRight: 6 }} />Submit Booking</>}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
