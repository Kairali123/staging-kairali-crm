"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./BookingForm.css";
import { calculateNights, useBookingPricing } from "./useBookingPricing";
import type {
  GuestData, GroupGuestData, ChildData, GroupInfo,
  TravelAgentInfo, AdvancePayment, ApprovalInfo, BookingDetails, ServiceCharge,
} from "./types";
import {
  Field, KInput, KSelect, KTextarea, CardHeader, COUNTRY_CODES, ROOM_MAX_PAX,
  DATA_API, SUBMIT_API, emptyGuest, emptyGroupGuest, emptyTravelAgent,
  emptyAdvancePayment, emptyApproval, IND_STEPS, GRP_STEPS,
  DEFAULT_COUNTRY_STATE_MAP,
  TODAY_ISO, sanitizeAddress,
  MAX_NAME_LEN, MAX_NATIONALITY_LEN, MAX_ZIP_LEN, MAX_ADDRESS_LEN, MAX_CHILD_NAME_LEN,
} from "./BookingFormBase";

function scopedGuestErrors(errors: Record<string, string> | undefined, prefix: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors ?? {})
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.replace(prefix, ""), value])
  );
}

// ─── Individual Form ─────────────────────────────────────────────────────────

/* Step 0: Primary Guest Personal Info + Booking Info */
function Step0PrimaryGuest({
  guest, onChange, errors, apiData,
  primaryDetails, onPrimaryDetailsChange, programmes, roomMaxPaxMap,
  guestLabel, hideHeader, roomNumberLocked,
}: {
  guest: GuestData; onChange: (g: GuestData) => void;
  errors: Record<string, string>; apiData: any;
  primaryDetails?: any; onPrimaryDetailsChange?: (d: any) => void;
  programmes?: string[]; roomMaxPaxMap?: Record<string, number>;
  guestLabel?: string;
  hideHeader?: boolean; // suppress the CardHeader when used inside a secondary guest panel
  roomNumberLocked?: boolean; // true once a room has been allocated/loaded (e.g. Edit Booking)
}) {
  const set = (k: keyof GuestData, v: any) => onChange({ ...guest, [k]: v });
  const countryStateMap = apiData?.countryStateMap || DEFAULT_COUNTRY_STATE_MAP;
  const countries = Object.keys(countryStateMap);
  const states = guest.country ? (countryStateMap[guest.country] || ["Other"]) : [];
  const totalPax = 1;
  const maxPax = roomMaxPaxMap ? (roomMaxPaxMap[primaryDetails?.roomType] || 0) : 0;

  return (
    <div>
      <div className="kbf-card">
        {!hideHeader && <CardHeader stepNo={1} icon="fa-user" title={guestLabel || "Primary Guest Personal Info"} />}
        <div className="kbf-card-body">
          {/* Row 1: Title, First Name, Middle Name, Last Name — 4 cols */}
          <div className="kbf-row">
            <Field label="Title" required error={errors.title}>
              <KSelect value={guest.title} onChange={e => set("title", e.target.value)} error={!!errors.title}>
                <option value="" disabled>--select--</option>
                {["MR.", "MRS.", "MS.", "MISS.", "DR.", "PROF"].map(t => <option key={t}>{t}</option>)}
              </KSelect>
            </Field>
            <Field label="First Name" required error={errors.firstName}>
              <KInput value={guest.firstName} onChange={e => set("firstName", e.target.value)} pattern="[A-Za-z][A-Za-z '-]*" maxLength={MAX_NAME_LEN} required error={!!errors.firstName} />
            </Field>
            <Field label="Middle Name" error={errors.middleName}>
              <KInput value={guest.middleName} onChange={e => set("middleName", e.target.value)} pattern="[A-Za-z][A-Za-z '-]*" maxLength={MAX_NAME_LEN} error={!!errors.middleName} />
            </Field>
            <Field label="Last Name" error={errors.lastName}>
              <KInput value={guest.lastName} onChange={e => set("lastName", e.target.value)} pattern="[A-Za-z][A-Za-z '-]*" maxLength={MAX_NAME_LEN} error={!!errors.lastName} />
            </Field>
          </div>
          {/* Row 2: DOB, Gender, Contact (span 2) — 4 cols total */}
          <div className="kbf-row">
            <Field label="Date of Birth" error={errors.dob}>
              <KInput type="date" value={guest.dob} max={TODAY_ISO} onChange={e => set("dob", e.target.value)} error={!!errors.dob} />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <KSelect value={guest.gender} onChange={e => set("gender", e.target.value)} error={!!errors.gender}>
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </KSelect>
            </Field>
            <div className="kbf-group kbf-col-2">
              <label className="kbf-label required">Contact No.</label>
              <div className="kbf-phone-row">
                <KSelect value={guest.countryCode} onChange={e => set("countryCode", e.target.value)} error={!!errors.countryCode}>
                  <option value="">-- Select Code --</option>
                  {COUNTRY_CODES.map(c => (
                    <option key={`${c.code}-${c.name}`} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </KSelect>
                <KInput type="number" value={guest.contact} onChange={e => set("contact", e.target.value)} placeholder="Mobile number" error={!!errors.contact} />
              </div>
              {errors.countryCode && <span className="kbf-error-text">{errors.countryCode}</span>}
              {errors.contact && <span className="kbf-error-text">{errors.contact}</span>}
            </div>
          </div>
          {/* Row 3: Email, Anniversary, Nationality — 3 cols */}
          <div className="kbf-row cols-3">
            <Field label="Email" required error={errors.email}>
              <KInput type="email" value={guest.email} onChange={e => set("email", e.target.value)} error={!!errors.email} />
            </Field>
            <Field label="Date of Anniversary" error={errors.anniversary}>
              <KInput type="date" value={guest.anniversary} min={guest.dob || undefined} max={TODAY_ISO} onChange={e => set("anniversary", e.target.value)} error={!!errors.anniversary} />
            </Field>
            <Field label="Nationality" error={errors.nationality}>
              <KInput value={guest.nationality} onChange={e => set("nationality", e.target.value)} pattern="[A-Za-z][A-Za-z ]*" maxLength={MAX_NATIONALITY_LEN} error={!!errors.nationality} />
            </Field>
          </div>
          {/* Row 4: Country, State, Zip — 3 cols */}
          <div className="kbf-row cols-3">
            <Field label="Country" required error={errors.country}>
              <KSelect value={guest.country} onChange={e => onChange({ ...guest, country: e.target.value, state: "" })} error={!!errors.country}>
                <option value="">-- Select Country --</option>
                {countries.map(c => <option key={c}>{c}</option>)}
              </KSelect>
            </Field>
            <Field label="Province/State" required error={errors.state}>
              <KSelect
                value={guest.state}
                onChange={e => set("state", e.target.value)}
                required
                error={!!errors.state}
                disabled={!guest.country}
              >
                <option value="">{guest.country ? "-- Select State --" : "-- Select Country First --"}</option>
                {states.map((s: string) => <option key={s}>{s}</option>)}
              </KSelect>
            </Field>
            <Field label="Zip/Postcode" required error={errors.zip}>
              <KInput value={guest.zip} onChange={e => set("zip", e.target.value)} maxLength={MAX_ZIP_LEN} error={!!errors.zip} />
            </Field>
          </div>
          {/* Row 5: Home Address — full width */}
          <div className="kbf-row">
            <div className="kbf-group kbf-col-full">
              <label className="kbf-label required">Home Address</label>
              <KTextarea value={guest.address} onChange={e => set("address", sanitizeAddress(e.target.value))} maxLength={MAX_ADDRESS_LEN} style={{ width: "100%", minHeight: 70 }} />
              {errors.address && <span className="kbf-error-text">{errors.address}</span>}
            </div>
          </div>
        </div>
      </div>
      {primaryDetails && onPrimaryDetailsChange && (
        <PrimaryBookingInfo
          details={primaryDetails}
          onChange={onPrimaryDetailsChange}
          programmes={programmes || []}
          roomMaxPaxMap={roomMaxPaxMap || {}}
          currentPax={totalPax}
          maxPax={maxPax}
          errors={errors}
          radioNameSuffix={guestLabel ? guestLabel.replace(/\s+/g, "-").toLowerCase() : "primary"}
          roomNumberLocked={roomNumberLocked}
        />
      )}
    </div>
  );
}

function PrimaryBookingInfo({
  details, onChange, programmes, roomMaxPaxMap,
  currentPax, maxPax, errors = {}, radioNameSuffix = "primary", roomNumberLocked = false,
}: {
  details: BookingDetails; onChange: (d: BookingDetails) => void;
  programmes: string[]; roomMaxPaxMap: Record<string, number>;
  currentPax: number; maxPax: number; errors?: Record<string, string>;
  radioNameSuffix?: string; // unique per guest to prevent radio conflicts
  roomNumberLocked?: boolean; // true once a room has been allocated/loaded (e.g. Edit Booking)
}) {
  const set = (k: keyof BookingDetails, v: any) => onChange({ ...details, [k]: v });
  const nights = calculateNights(details.arrivalDate, details.departureDate);
  if (nights !== details.nights) onChange({ ...details, nights });

  return (
    <div className="kbf-card" style={{ marginTop: 16 }}>
      <CardHeader stepNo={2} icon="fa-calendar-check" title="Booking Info" />
      <div className="kbf-card-body">
        {/* Row 1: Arrival, Departure, Nights — 3 cols */}
        <div className="kbf-row cols-3">
          <Field label="Arrival Date" required error={errors.arrivalDate}>
            <KInput type="date" value={details.arrivalDate} min={TODAY_ISO} onChange={e => set("arrivalDate", e.target.value)} error={!!errors.arrivalDate} />
          </Field>
          <Field label="Departure Date" required error={errors.departureDate}>
            <KInput type="date" value={details.departureDate} min={details.arrivalDate || undefined} onChange={e => set("departureDate", e.target.value)} error={!!errors.departureDate} disabled readOnly />
          </Field>
          <Field label="No. of Nights">
            <KInput type="number" value={nights} readOnly />
            <span className="kbf-info-text">Auto-calculated</span>
          </Field>
        </div>
        {/* Row 2: Repeat Guest, Package Type, Programme — 3 cols */}
        <div className="kbf-row cols-3">
          <Field label="Repeat Guest" required error={errors.repeatGuest}>
            <KSelect value={details.repeatGuest} onChange={e => set("repeatGuest", e.target.value as any)} error={!!errors.repeatGuest}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </KSelect>
          </Field>
          <Field label="Package Type" required>
            <div className="kbf-radio-group">
              <label className="kbf-radio-label">
                {/* unique name per guest prevents radio buttons across guests from conflicting */}
                <input type="radio" name={`package-type-${radioNameSuffix}`} value="rack" checked={details.packageType === "rack"} onChange={() => set("packageType", "rack")} />
                Rack Rate
              </label>
              <label className="kbf-radio-label">
                <input type="radio" name={`package-type-${radioNameSuffix}`} value="net" checked={details.packageType === "net"} onChange={() => set("packageType", "net")} disabled />
                Net Rate
              </label>
            </div>
          </Field>
          <Field label="Programme/Package" required error={errors.programme}>
            <KSelect value={details.programme} onChange={e => set("programme", e.target.value)} error={!!errors.programme}>
              <option value="" disabled>-- select --</option>
              {programmes.map(p => <option key={p}>{p}</option>)}
            </KSelect>
          </Field>
        </div>
        {/* Row 3: Room Type, Room No., Occupancy — 3 cols */}
        <div className="kbf-row cols-3">
          <Field label="Room Type" required>
            <KSelect value={details.roomType} disabled style={{ pointerEvents: "none", backgroundColor: "#f0f0f0" }}>
              <option value="">Select</option>
              <option value="DELUXE VILLA">DELUXE VILLA (Max 2 Adults)</option>
              <option value="CLASSIC VILLA">CLASSIC VILLA (Max 2 Adults)</option>
              <option value="ROYAL VILLA">ROYAL VILLA (Max 3 Adults)</option>
              <option value="MAHARAJA SUITE">MAHARAJA SUITE (Max 5 Adults)</option>
            </KSelect>
          </Field>
          <Field label="Room No." required error={errors.roomNumber}>
            <KInput
              value={details.roomNumber}
              onChange={e => set("roomNumber", e.target.value)}
              error={!!errors.roomNumber}
              readOnly={roomNumberLocked}
              disabled={roomNumberLocked}
              style={roomNumberLocked ? { background: "#f0f0f0", cursor: "not-allowed" } : undefined}
            />
          </Field>
          <Field label="Occupancy" required>
            <div className="kbf-radio-group">
              <label className="kbf-radio-label">
                <input type="radio" name={`occupancy-${radioNameSuffix}`} value="Single" checked={details.occupancy === "Single"} onChange={() => set("occupancy", "Single")} />
                Single
              </label>
              <label className="kbf-radio-label">
                <input type="radio" name={`occupancy-${radioNameSuffix}`} value="Double" checked={details.occupancy === "Double"} onChange={() => set("occupancy", "Double")} />
                Double
              </label>
            </div>
          </Field>
        </div>
        {maxPax > 0 && (
          <div className={`kbf-capacity-bar${currentPax >= maxPax ? " danger" : currentPax >= maxPax - 1 ? " warning" : ""}`}>
            <i className="fas fa-users" />
            Room Capacity: {currentPax} / {maxPax} Adults
            {currentPax >= maxPax && <span style={{ marginLeft: 8 }}>⚠ Maximum capacity reached</span>}
            {currentPax < maxPax && <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>({maxPax - currentPax} more guest{maxPax - currentPax > 1 ? "s" : ""} can be added)</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* Step 1: Secondary Guests only */
function Step1SecondaryGuests({
  primaryDetails, onPrimaryDetailsChange,
  secondaryGuests, onSecondaryChange,
  programmes, roomMaxPaxMap, apiData,
  primaryGuest, // pass primary guest data for "Copy from Primary"
  errors, roomNumberLocked,
}: any) {
  const totalPax = 1 + secondaryGuests.length;
  const maxPax = ROOM_MAX_PAX[primaryDetails.roomType] || 0;

  const addGuest = () => {
    if (maxPax > 0 && totalPax >= maxPax) {
      alert(`Maximum capacity for ${primaryDetails.roomType} is ${maxPax} adults.`);
      return;
    }
    onSecondaryChange([...secondaryGuests, emptyGuest(secondaryGuests.length + 2)]);
  };
  const removeGuest = (idx: number) => {
    const updated = secondaryGuests.filter((_: any, i: number) => i !== idx).map((g: GuestData, i: number) => ({ ...g, guestNumber: i + 2 }));
    onSecondaryChange(updated);
  };

  // Tracks whether each secondary guest currently has "Copy from Primary" applied,
  // and preserves the pre-copy guest data so unchecking can restore it.
  const [copiedFlags, setCopiedFlags] = useState<boolean[]>([]);
  const snapshotsRef = useRef<Record<number, GuestData>>({});

  const copyFromPrimary = (idx: number) => {
    if (!primaryGuest) return;
    const arr = [...secondaryGuests];
    // Snapshot the guest's own data (before it gets overwritten) so we can restore it later.
    snapshotsRef.current[idx] = arr[idx];
    const guestNum = arr[idx].guestNumber;
    arr[idx] = {
      ...primaryGuest,
      guestNumber: guestNum,
      bookingDetails: primaryDetails ? { ...primaryDetails } : arr[idx].bookingDetails,
    };
    onSecondaryChange(arr);
    setCopiedFlags(prev => { const next = [...prev]; next[idx] = true; return next; });
  };

  const clearCopiedFromPrimary = (idx: number) => {
    const arr = [...secondaryGuests];
    const guestNum = arr[idx].guestNumber;
    const snapshot = snapshotsRef.current[idx];
    // Restore the previous (pre-copy) values if we have them, otherwise reset to blank.
    arr[idx] = snapshot ? { ...snapshot, guestNumber: guestNum } : emptyGuest(guestNum);
    onSecondaryChange(arr);
    setCopiedFlags(prev => { const next = [...prev]; next[idx] = false; return next; });
    delete snapshotsRef.current[idx];
  };

  return (
    <div className="kbf-card">
      <div className="kbf-card-body">
        <div className="kbf-section-title"><i className="fas fa-users" />Secondary Guests</div>
        {secondaryGuests.length === 0 && (
          <p style={{ color: "#888", fontSize: 14, margin: "8px 0 16px" }}>
            No secondary guests added. Click &quot;Add Guest&quot; to add one, or proceed to next step.
          </p>
        )}
        {secondaryGuests.map((g: GuestData, idx: number) => (
          <div key={idx} className="kbf-guest-panel">
            {/* ── Single green header matching the old booking form ── */}
            <div className="kbf-guest-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="kbf-card-step-no"
                  style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: 14 }}
                >
                  {idx + 1}
                </div>
                <i className="fas fa-users" />
                <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                  Secondary Guest Info - {idx + 1}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="kbf-remove-btn" onClick={() => removeGuest(idx)} type="button">
                  <i className="fas fa-trash" /> Remove
                </button>
              </div>
            </div>
            {/* ── Copy from Primary Guest — directly below header ── */}
            {primaryGuest && (
              <div style={{ padding: "10px 16px 0" }}>
                <label className="kbf-radio-label" style={{ fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!copiedFlags[idx]}
                    onChange={e => { if (e.target.checked) copyFromPrimary(idx); else clearCopiedFromPrimary(idx); }}
                    style={{ accentColor: "#254D3A", width: 15, height: 15 }}
                  />
                  Copy from Primary Guest
                </label>
              </div>
            )}
            <div className="kbf-guest-panel-body">
              {/* hideHeader suppresses the inner "Primary Guest Personal Info" card header */}
              <Step0PrimaryGuest
                guest={g}
                onChange={ng => { const arr = [...secondaryGuests]; arr[idx] = ng; onSecondaryChange(arr); }}
                errors={scopedGuestErrors(errors, `guest${g.guestNumber}_`)}
                apiData={apiData}
                hideHeader
              />
              <PrimaryBookingInfo
                details={g.bookingDetails!}
                onChange={nd => { const arr = [...secondaryGuests]; arr[idx] = { ...arr[idx], bookingDetails: nd }; onSecondaryChange(arr); }}
                programmes={programmes}
                roomMaxPaxMap={roomMaxPaxMap}
                currentPax={totalPax}
                maxPax={maxPax}
                radioNameSuffix={`guest-${g.guestNumber}`}
                roomNumberLocked={roomNumberLocked}
                errors={scopedGuestErrors(errors, `guest${g.guestNumber}_`)}
              />
            </div>
          </div>
        ))}
        <button className="kbf-add-btn" type="button" onClick={addGuest}><i className="fas fa-plus" /> Add Guest</button>
      </div>
    </div>
  );
}

/* Step 2: Children */
// Hotel policy: guests are treated as "children" only up to age 12 (0–4 stay free,
// 5–12 are charged the child rate — see childAmt / "ages 5-12" calc in useBookingPricing
// and BookingFormSteps2's Payment Breakdown). Anyone older must be added as an adult
// (secondary guest), not listed here.
const CHILD_AGE_OPTIONS = Array.from({ length: 13 }, (_, i) => i); // 0..12

function Step2Children({ children, onChange, errors = {} }: { children: ChildData[]; onChange: (c: ChildData[]) => void; errors?: Record<string, string> }) {
  const setCount = (n: number) => {
    const arr: ChildData[] = Array.from({ length: n }, (_, i) => children[i] || { childNumber: i + 1, name: "", age: "" });
    onChange(arr);
  };
  return (
    <div className="kbf-card">
      <CardHeader stepNo={2} icon="fa-child" title="Child Information" />
      <div className="kbf-card-body">
        <div className="kbf-row">
          <Field label="No. of Children" required>
            <KSelect value={children.length} onChange={e => setCount(parseInt(e.target.value))}>
              {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </KSelect>
          </Field>
        </div>
        {children.map((c, i) => (
          <div key={i} className="kbf-row cols-2">
            <Field label={`Child ${i + 1} Name`} required error={errors[`child${i + 1}_name`]}>
              <KInput value={c.name} onChange={e => { const a = [...children]; a[i] = { ...a[i], name: e.target.value }; onChange(a); }} pattern="[A-Za-z][A-Za-z '-]*" maxLength={MAX_CHILD_NAME_LEN} error={!!errors[`child${i + 1}_name`]} />
            </Field>
            <Field label="Age" required error={errors[`child${i + 1}_age`]}>
              <KSelect value={c.age} onChange={e => { const a = [...children]; a[i] = { ...a[i], age: e.target.value }; onChange(a); }} error={!!errors[`child${i + 1}_age`]}>
                <option value="">-- Select Age --</option>
                {CHILD_AGE_OPTIONS.map(age => <option key={age} value={age}>{age}</option>)}
              </KSelect>
            </Field>
          </div>
        ))}
        <div
          className="kbf-note"
          style={{
            marginTop: 12,
            padding: "10px 14px",
            fontSize: 13,
            color: "#7a5b00",
            background: "#fff8e1",
            border: "1px solid #ffe08a",
            borderRadius: 6,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <i className="fa fa-info-circle" style={{ marginTop: 2, color: "#c99700" }} />
          <span>
            <strong>Note:</strong> Child price will be calculated on the invoice only for children aged 5–12 years. Children aged 0–4 years stay free of charge.
          </span>
        </div>
      </div>
    </div>
  );
}

export { Step0PrimaryGuest, Step1SecondaryGuests, Step2Children, PrimaryBookingInfo };
