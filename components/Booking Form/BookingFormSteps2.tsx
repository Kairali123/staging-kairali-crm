"use client";

import React, { useEffect } from "react";
import type { TravelAgentInfo, AdvancePayment, ApprovalInfo, ServiceCharge } from "./types";
import { Field, KInput, KSelect, KTextarea, CardHeader, COUNTRY_CODES, getPhoneLengthRange, MAX_REFERRED_BY_LEN, MAX_HEALTH_INFO_LEN, sanitizeHealthInformation, MAX_AGENT_REMARKS_LEN, sanitizeAgentRemarks, MAX_APPROVAL_REMARKS_LEN, sanitizeApprovalRemarks } from "./BookingFormBase";

const CATEGORY_TO_TYPE_MAP: Record<string, string> = {
  "FIT": "INDIVIDUAL",
  "J": "JOURNALIST",
  "G": "GOVERNMENT",
  "H": "HOTEL",
  "HC": "HOTEL COMPETITOR",
  "NETT": "ON AUTHORISED",
  "M": "MISCELLANEOUS"
};

// Returns current local date-time as "YYYY-MM-DDTHH:mm" for use as datetime-local max/clamp value.
function getNowLocalDateTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Returns current local date as "YYYY-MM-DD" for use as date-input max/clamp value.
function getTodayLocalDate(): string {
  return getNowLocalDateTime().slice(0, 10);
}

export const CONVERSION_RATES: Record<string, number> = {
  INR: 1,
  USD: 85.74,
  EUR: 89.26,
  EURO: 89.26
};

export function convertCurrency(amount: number, from: string, to: string): number {
  const fromRate = CONVERSION_RATES[(from || "INR").toUpperCase()] ?? 1;
  const toRate = CONVERSION_RATES[(to || "INR").toUpperCase()] ?? 1;
  return (amount * fromRate) / toRate;
}

// ─── Step 3: Additional Info ─────────────────────────────────────────────────
export function StepAdditionalInfo({
  prefix = "", data, onChange, apiData, errors = {},
}: {
  prefix?: string; data: any; onChange: (d: any) => void; apiData: any; errors?: Record<string, string>;
}) {
  const set = (k: string, v: string) => onChange({ ...data, [k]: v });
  const clientTypes = (apiData?.ClientType ? Object.keys(apiData.ClientType) : ["Individual", "Group", "Corporate", "Family"])
    .filter((c: string) => {
      if (!c) return false;
      const s = String(c).trim();
      return s !== "" && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined";
    });
  const clientCategories = apiData?.ClientCategory ? Object.keys(apiData.ClientCategory) : ["VIP", "Premium", "Standard"];
  const paymentTerms = apiData?.PaymentTerms ? Object.keys(apiData.PaymentTerms) : ["Full Advance", "50% Advance", "Pay on Arrival", "Credit"];
  const dataSources = apiData?.DataSource ? Object.keys(apiData.DataSource) : ["Website", "Phone", "Walk-in", "Referral", "Travel Agent", "OTA"];

  // When clientCategory is prefilled (edit booking load) but clientType is empty or
  // not in the master list, auto-derive it from CATEGORY_TO_TYPE_MAP.
  useEffect(() => {
    if (!data.clientCategory) return;
    const mapped = CATEGORY_TO_TYPE_MAP[data.clientCategory.toUpperCase()];
    if (mapped && (!data.clientType || data.clientType === "")) {
      onChange({ ...data, clientType: mapped });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.clientCategory]);

  return (
    <div className="kbf-card">
      <CardHeader stepNo={3} icon="fa-info-circle" title="Additional Info" />
      <div className="kbf-card-body">
        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <Field label="Client Category" required error={errors.clientCategory}>
            <KSelect value={data.clientCategory || ""} error={!!errors.clientCategory} onChange={e => {
              const val = e.target.value;
              const mappedType = CATEGORY_TO_TYPE_MAP[val.toUpperCase()] || val;
              onChange({ ...data, clientCategory: val, clientType: mappedType });
            }}>
              <option value="">-- Select --</option>
              {/* If a prefilled value isn't in the current master list (renamed/retired
                  category, casing drift, etc.), inject it so the select still shows it
                  instead of silently reverting to the placeholder. */}
              {clientCategories.includes(data.clientCategory) ? null : data.clientCategory ? <option value={data.clientCategory}>{data.clientCategory}</option> : null}
              {clientCategories.map((c: string) => <option key={c}>{c}</option>)}
            </KSelect>
          </Field>
          <Field label="Client Type" required error={errors.clientType}>
            <KSelect value={data.clientType || ""} disabled style={{ backgroundColor: "#f0f0f0", pointerEvents: "none" }} error={!!errors.clientType}>
              <option value="">-- Select --</option>
              {clientTypes.includes(data.clientType) ? null : data.clientType ? <option value={data.clientType}>{data.clientType}</option> : null}
              {clientTypes.map((c: string) => <option key={c}>{c}</option>)}
            </KSelect>
          </Field>
          <Field label="Payment Terms" required error={errors.paymentTerms}>
            <KSelect value={data.paymentTerms || ""} error={!!errors.paymentTerms} onChange={e => set("paymentTerms", e.target.value)}>
              <option value="">-- Select --</option>
              {paymentTerms.includes(data.paymentTerms) ? null : data.paymentTerms ? <option value={data.paymentTerms}>{data.paymentTerms}</option> : null}
              {paymentTerms.map((p: string) => <option key={p}>{p}</option>)}
            </KSelect>
          </Field>
        </div>
        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <Field label="Data Source" required error={errors.dataSource}>
            <KSelect value={data.dataSource || ""} error={!!errors.dataSource} onChange={e => set("dataSource", e.target.value)}>
              <option value="">-- Select --</option>
              {dataSources.includes(data.dataSource) ? null : data.dataSource ? <option value={data.dataSource}>{data.dataSource}</option> : null}
              {dataSources.map((s: string) => <option key={s}>{s}</option>)}
            </KSelect>
          </Field>
          <Field label="Transportation" required error={errors.transportationDetails}>
            <KSelect value={data.transportationDetails || ""} error={!!errors.transportationDetails} onChange={e => set("transportationDetails", e.target.value)}>
              <option value="">Select</option>
              {["No Transportation Needed", "Airport Pickup", "Airport Roundtrip", "Custom Transportation"].includes(data.transportationDetails) ? null : data.transportationDetails ? <option value={data.transportationDetails}>{data.transportationDetails}</option> : null}
              {["No Transportation Needed", "Airport Pickup", "Airport Roundtrip", "Custom Transportation"].map(t => <option key={t}>{t}</option>)}
            </KSelect>
          </Field>
          <Field label="Referred By (Optional)" error={errors.referredBy}>
            <KInput value={data.referredBy || ""} onChange={e => set("referredBy", e.target.value)} maxLength={MAX_REFERRED_BY_LEN} error={!!errors.referredBy} placeholder="Enter name of person or organization who referred you" />
          </Field>
        </div>
        <div className="kbf-row">
          <Field label="Health Information" className="kbf-col-full" error={errors.healthInformation}>
            <KTextarea value={data.healthInformation || ""} onChange={e => set("healthInformation", sanitizeHealthInformation(e.target.value))} maxLength={MAX_HEALTH_INFO_LEN} placeholder="Please provide any relevant health information, medical conditions, or allergies" />
          </Field>
        </div>
        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Field label="Upload Test Reports (Optional)" error={errors.testReports}>
            <KInput type="url" value={data.testReports || ""} onChange={e => set("testReports", e.target.value)} error={!!errors.testReports} placeholder="Enter Google Drive link" />
            <span style={{ fontSize: 12, color: "#666" }}>Give link of Google Drive (e.g. https://drive.google.com/file/d/&lt;id&gt;/view)</span>
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Travel Agents ────────────────────────────────────────────────────
export function StepTravelAgent({
  data, onChange, apiData, prefix = "", errors = {},
}: {
  data: TravelAgentInfo; onChange: (d: TravelAgentInfo) => void; apiData: any; prefix?: string; errors?: Record<string, string>;
}) {
  const rawAgents: any[] = apiData?.ActiveTravelAgents || [];
  // API rows can be objects ({name, email, ...}) or arrays, and email/contact
  // columns are sometimes swapped (email holding "9818943301"). Normalize to
  // strings, detect email vs phone by pattern, then sort A→Z for the dropdown.
  const agents = React.useMemo(() => {
    const isEmail = (v: any) => typeof v === "string" && v.includes("@");
    const isPhone = (v: any) => /^\+?[\d\s()-]{7,}$/.test(String(v ?? "").trim());
    return Object.values(rawAgents)
      .map((a: any) => {
        const rec = Array.isArray(a)
          ? { name: a[0], email: a[1], contact: a[2], commission: a[3], category: a[4] }
          : { name: a?.name, email: a?.email, contact: a?.contact, commission: a?.commission, category: a?.category };
        const name = String(rec.name ?? "").trim();
        let email = String(rec.email ?? "").trim();
        let contact = String(rec.contact ?? "").trim();
        // Swap defense: email slot holds a phone while contact slot holds an email (or is empty)
        if (!isEmail(email) && isPhone(email) && (isEmail(contact) || !isPhone(contact))) {
          const t = contact;
          contact = email;
          email = isEmail(t) ? t : "";
        }
        // Last resort for array rows: locate email/phone anywhere in the row
        if (Array.isArray(a)) {
          if (!email) { const f = a.find(isEmail); if (f) email = String(f).trim(); }
          if (!contact) { const f = a.find((v: any) => isPhone(v) && !isEmail(v)); if (f) contact = String(f).trim(); }
        }
        return {
          name, email, contact,
          commission: String(rec.commission ?? "").replace(/%/g, "").trim(),
          category: String(rec.category ?? "").trim(),
        };
      })
      .filter(a => a.name)
      .sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: "base" }));
  }, [rawAgents]);
  const set = (k: keyof TravelAgentInfo, v: any) => onChange({ ...data, [k]: v });

  const handleAgentSelect = (agentName: string) => {
    const found = agents.find((a: any) => a.name === agentName);
    if (found) {
      let parsedMobile = found.contact || "";
      let parsedCode = "+91";
      if (parsedMobile.startsWith("+")) {
        const matched = COUNTRY_CODES.find(c => parsedMobile.startsWith(c.code));
        if (matched) {
          parsedCode = matched.code;
          parsedMobile = parsedMobile.substring(matched.code.length).trim();
        }
      }
      onChange({
        ...data,
        hasAgent: true,
        name: agentName,
        countryCode: parsedCode,
        mobile: parsedMobile,
        email: found.email || "",
        category: found.category || "",
        commission: found.commission || "",
        remarks: data.remarks
      });
    } else {
      set("name", agentName);
    }
  };

  const isLocked = !data.hasAgent;

  return (
    <div className="kbf-card">
      <CardHeader stepNo={4} icon="fa-briefcase" title="Travel Agent Information" />
      <div className="kbf-card-body">
        <label className="kbf-lock-row" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 24px 0", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
          <input type="checkbox" checked={isLocked} onChange={e => set("hasAgent", !e.target.checked)} style={{ width: "16px", height: "16px" }} />
          No Travel Agent Involved ( uncheck and fill details )
        </label>

        <div className="kbf-row cols-3">
          <Field label="Agent Name" required={!isLocked} error={!isLocked ? errors.name : undefined}>
            <KSelect value={data.name} onChange={e => handleAgentSelect(e.target.value)} error={!isLocked && !!errors.name} disabled={isLocked}>
              <option value="">-- Select Agent --</option>
              {data.name && !agents.some((a: any) => a.name === data.name) ? <option value={data.name}>{data.name}</option> : null}
              {agents.map((a: any) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </KSelect>
          </Field>
          <div className="kbf-group">
            <label className={`kbf-label${!isLocked ? " required" : ""}`}>Agent Mobile</label>
            <div className="kbf-phone-row">
              {/* View-only — populated from the Agent Name selection, never hand-typed */}
              <KSelect value={data.countryCode || ""} disabled>
                {COUNTRY_CODES.map(c => (
                  <option key={`${c.code}-${c.name}`} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </KSelect>
              <KInput type="text" value={data.mobile} placeholder="Mobile number" error={!isLocked && !!errors.mobile} disabled readOnly />
            </div>
            {!isLocked && errors.mobile && <span className="kbf-error-text">{errors.mobile}</span>}
          </div>
          <Field label="Agent Email" required={!isLocked} error={!isLocked ? errors.email : undefined}>
            <KInput type="email" value={data.email} error={!isLocked && !!errors.email} disabled readOnly />
          </Field>
        </div>

        <div className="kbf-row cols-2">
          <Field label="Agent Category" required={!isLocked} error={!isLocked ? errors.category : undefined}>
            <KInput value={data.category} error={!isLocked && !!errors.category} disabled readOnly />
          </Field>
          <Field label="Commission %" required={!isLocked} error={!isLocked ? errors.commission : undefined}>
            <KInput type="text" value={data.commission} error={!isLocked && !!errors.commission} disabled readOnly />
          </Field>
        </div>

        <div className="kbf-row">
          <Field label="Remarks" className="kbf-col-full">
            <KTextarea
              value={data.remarks}
              onChange={e => set("remarks", sanitizeAgentRemarks(e.target.value))}
              placeholder="Enter remarks..."
              maxLength={MAX_AGENT_REMARKS_LEN}
              style={{ minHeight: 80 }}
            />
            <span className="kbf-char-count" style={{ fontSize: 12, color: "#888" }}>
              {(data.remarks || "").length}/{MAX_AGENT_REMARKS_LEN}
            </span>
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Payment Breakdown ────────────────────────────────────────────────
interface PaymentProps {
  pricing: any;
  discounts: any;
  onDiscountChange: (d: any) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
  otherCharges: ServiceCharge[];
  onOtherChargesChange: (c: ServiceCharge[]) => void;
  isComplementary: boolean;
  onComplementaryChange: (val: boolean) => void;
  isVoucher: boolean;
  onVoucherChange: (val: boolean) => void;
  errors?: Record<string, string>;
}

// Styles matching Image 2 exactly
const pb2Styles = {
  labelCell: {
    color: "#1e3a5f",
    fontWeight: 600,
    fontSize: 14,
    padding: "10px 12px",
    whiteSpace: "nowrap" as const,
    minWidth: 160,
  },
  inputReadonly: {
    background: "#d4d4d4",
    border: "1px solid #bbb",
    borderRadius: 3,
    padding: "5px 8px",
    width: "100%",
    fontSize: 13,
    color: "#444",
    cursor: "not-allowed",
  } as React.CSSProperties,
  inputEditable: {
    background: "#fff",
    border: "1px solid #bbb",
    borderRadius: 3,
    padding: "5px 8px",
    width: "100%",
    fontSize: 13,
    color: "#222",
  } as React.CSSProperties,
  select: {
    background: "#fff",
    border: "1px solid #bbb",
    borderRadius: 3,
    padding: "5px 4px",
    fontSize: 13,
    width: "100%",
  } as React.CSSProperties,
  td: {
    padding: "8px 6px",
    verticalAlign: "middle" as const,
    borderBottom: "1px solid #e8e8e8",
  },
};

function isPercentDiscountType(type?: string) {
  return type === "%" || type === "percentage";
}

function clampPercentDiscountInput(type: string | undefined, value: string) {
  if (!isPercentDiscountType(type)) return value;
  if (value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return String(Math.min(100, Math.max(0, numeric)));
}

// Single payment breakdown row matching Image 2 layout:
// Label (green) | Rate (readonly-grey) | Discount% type+input | Rate after Discount (readonly-grey) | Tax % + Tax amt (readonly-grey) | Total (readonly-grey)
function DiscountRow({
  label, rate, discountType, discount, afterDiscount,
  dtKey, dvKey, onChange,
  taxRate, taxKey, onTaxChange,
  isRateEditable = false, rateKey,
  // FIX 4: forceDiscount — when complimentary/voucher active, override to 100%
  forceDiscount = false,
  // disabled — entire row is locked (Consultation, Yoga, Classes)
  disabled = false,
  // lockDiscount — complimentary/voucher active: clear + disable this row's discount inputs
  lockDiscount = false,
  // discountEditable — set false to make the Discount % column permanently read-only
  // (matches old booking form behavior for Room/Food/Treatment), independent of
  // complimentary/voucher state.
  discountEditable = true,
}: any) {
  // FIX 4: if forceDiscount, treat discount as 100%
  const effectiveDiscount = forceDiscount ? "100" : (discount ?? "");
  const effectiveDiscountType = forceDiscount ? "%" : (discountType || "%");

  // When forced 100%, afterDiscount = 0; else use backend value
  const effectiveAfterDiscount = forceDiscount
    ? "0.00"
    : (afterDiscount !== undefined && afterDiscount !== "" ? String(afterDiscount) : "");

  const computedTaxAmt = parseFloat(effectiveAfterDiscount || "0") * (parseFloat(taxRate || "0") / 100);
  const total = (parseFloat(effectiveAfterDiscount || "0") + computedTaxAmt).toFixed(2);
  const canEditDiscount = discountEditable && !forceDiscount && !disabled && !lockDiscount;

  return (
    <>
      <tr>
        {/* Label */}
        <td style={pb2Styles.td}>
          <span style={pb2Styles.labelCell}>{label}</span>
        </td>

        {/* Rate */}
        <td style={pb2Styles.td}>
          <input
            type="number"
            style={(isRateEditable && !disabled) ? { ...pb2Styles.inputEditable, minWidth: 100 } : { ...pb2Styles.inputReadonly, minWidth: 100 }}
            value={rate}
            readOnly={!isRateEditable || disabled}
            onChange={(isRateEditable && !disabled) ? e => onChange(rateKey, e.target.value) : undefined}
          />
        </td>

        {/* Discount % — "%" and "Cash" labels. Locked on complimentary/voucher, or permanently read-only when discountEditable=false. */}
        <td style={pb2Styles.td}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <select
              style={{ ...pb2Styles.select, width: 62 }}
              value={effectiveDiscountType}
              disabled={!canEditDiscount}
              onChange={e => onChange(dtKey, e.target.value)}
            >
              <option value="%">%</option>
              <option value="cash">Cash</option>
            </select>
            {/* show effective value (100 when forced, empty when locked, user value otherwise) */}
            <input
              type="number"
              min="0"
              max={isPercentDiscountType(effectiveDiscountType) ? "100" : undefined}
              step="any"
              style={{ ...pb2Styles.inputEditable, minWidth: 70, ...(!canEditDiscount ? { background: "#f0f0f0" } : {}) }}
              value={lockDiscount ? "" : effectiveDiscount}
              readOnly={!canEditDiscount}
              onChange={canEditDiscount ? e => onChange(dvKey, e.target.value) : undefined}
              placeholder="0"
            />
          </div>
        </td>

        {/* Rate after Discount (readonly) */}
        <td style={pb2Styles.td}>
          <input
            type="number"
            style={{ ...pb2Styles.inputReadonly, minWidth: 100 }}
            value={effectiveAfterDiscount}
            readOnly
          />
        </td>

        {/* Tax (CGST/SGST) — read-only/disabled (no effect on total), like old form */}
        <td style={pb2Styles.td}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {/* readonly "%" indicator */}
            <input
              type="text"
              style={{ ...pb2Styles.inputReadonly, width: 56, textAlign: "center", padding: "5px 4px" }}
              value="%"
              readOnly
              disabled
            />
            {/* readonly computed tax amount (0 — tax disabled) */}
            <input
              type="number"
              style={{ ...pb2Styles.inputReadonly, width: 90 }}
              value={computedTaxAmt > 0 ? computedTaxAmt.toFixed(2) : ""}
              readOnly
              disabled
            />
          </div>
        </td>

        {/* Total (readonly) */}
        <td style={pb2Styles.td}>
          <input
            type="number"
            style={{ ...pb2Styles.inputReadonly, minWidth: 100 }}
            value={total}
            readOnly
          />
        </td>
      </tr>
    </>
  );
}


// Subtotal "Total" row — editable subtotal-level discount (point 4), tax read-only.
function SummaryRow({
  label,
  rateTotal,
  afterDiscTotal,
  highlight = false,
  discountType,
  discount,
  onChange,
  dtKey,
  dvKey,
  lockDiscount = false,
  editableDiscount = false,
}: {
  label: string;
  rateTotal: string;
  afterDiscTotal: string;
  highlight?: boolean;
  discountType?: string;
  discount?: string;
  onChange?: (k: string, v: string) => void;
  dtKey?: string;
  dvKey?: string;
  lockDiscount?: boolean;
  editableDiscount?: boolean;
}) {
  const discDisabled = !editableDiscount || lockDiscount;
  return (
    <tr style={{ background: highlight ? "#f5f5e8" : "transparent" }}>
      <td style={{ ...pb2Styles.td, color: "#1e3a5f", fontWeight: 600, fontSize: 14 }}>{label}</td>
      {/* Rate column — original sum (no discount applied) */}
      <td style={pb2Styles.td}>
        <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={rateTotal} readOnly />
      </td>
      {/* Discount % — editable for subtotal, locked on complimentary/voucher */}
      <td style={pb2Styles.td}>
        <div style={{ display: "flex", gap: 4 }}>
          <select
            style={{ ...pb2Styles.select, width: 62 }}
            value={discountType || "%"}
            disabled={discDisabled}
            onChange={(!discDisabled && onChange && dtKey) ? e => onChange(dtKey, e.target.value) : undefined}
          >
            <option value="%">%</option>
            <option value="cash">Cash</option>
          </select>
          <input
            type="number" min="0" step="any"
            max={isPercentDiscountType(discountType || "%") ? "100" : undefined}
            style={{ ...pb2Styles.inputEditable, minWidth: 70, ...(discDisabled ? { background: "#f0f0f0" } : {}) }}
            value={lockDiscount ? "" : (discount ?? "")}
            readOnly={discDisabled}
            onChange={(!discDisabled && onChange && dvKey) ? e => onChange(dvKey, e.target.value) : undefined}
            placeholder="0"
          />
        </div>
      </td>
      {/* Rate after Discount column — sum after subtotal discount */}
      <td style={pb2Styles.td}>
        <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={afterDiscTotal} readOnly />
      </td>
      {/* Tax — read-only (no effect) */}
      <td style={pb2Styles.td}>
        <div style={{ display: "flex", gap: 4 }}>
          <input type="text" style={{ ...pb2Styles.inputReadonly, width: 56, textAlign: "center" }} value="%" readOnly disabled />
          <input type="number" style={{ ...pb2Styles.inputReadonly, width: 90 }} readOnly disabled value="" />
        </div>
      </td>
      {/* Total column */}
      <td style={pb2Styles.td}>
        <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={afterDiscTotal} readOnly />
      </td>
    </tr>
  );
}

export function StepPaymentBreakdown({
  pricing, discounts, onDiscountChange, currency, onCurrencyChange,
  otherCharges, onOtherChargesChange, isComplementary, onComplementaryChange,
  isVoucher, onVoucherChange, errors = {}
}: PaymentProps) {
  const pb = pricing?.paymentBreakdown;
  const set = (k: string, v: string) => {
    const next = { ...discounts, [k]: v };
    if (k.endsWith("Discount")) {
      next[k] = clampPercentDiscountInput(next[`${k}Type`] || "%", v);
    }
    if (k.endsWith("DiscountType")) {
      const discountKey = k.replace(/Type$/, "");
      next[discountKey] = clampPercentDiscountInput(v, next[discountKey] ?? "");
    }
    onDiscountChange(next);
  };

  // Frontend-computed after-discount values (don't rely on backend pb?.xxxAfterDiscount)
  const computeAfter = (rate: string | number, discType: string, disc: string) => {
    const r = parseFloat(String(rate) || "0");
    const rawDiscount = parseFloat(disc || "0");
    const d = isPercentDiscountType(discType) ? Math.min(100, Math.max(0, rawDiscount || 0)) : (rawDiscount || 0);
    if (discType === "cash") return Math.max(0, r - d);
    return Math.max(0, r - (r * d / 100));
  };

  const roomAfter = computeAfter(pb?.roomRate ?? 0, discounts.roomDiscountType || "%", discounts.roomDiscount || "0");
  const foodAfter = computeAfter(pb?.foodRate ?? 0, discounts.foodDiscountType || "%", discounts.foodDiscount || "0");
  const treatAfter = computeAfter(pb?.treatmentRate ?? 0, discounts.treatmentDiscountType || "%", discounts.treatmentDiscount || "0");
  const transAfter = parseFloat(pb?.transportationTotal ?? "0");
  // Other charge after its own discount (also bridged into pricing via buildOtherCharges)
  const otherAfter = computeAfter(discounts.otherAmountRate ?? 0, discounts.otherAmountDiscountType || "%", discounts.otherAmountDiscount || "0");

  // Child amount from the pricing hook (ages 5-12 × nights) — was previously
  // included in the hook's grand total but missing from this displayed subtotal,
  // so the invoice/summary never showed it.
  const childAmt = parseFloat(pb?.childRate ?? "0") || 0;

  // Subtotal after component discounts (before subtotal-level discount)
  const coreSubtotal = roomAfter + foodAfter + treatAfter + childAmt;
  // Subtotal after the editable subtotal-level discount (display)
  const subtotalAfter = computeAfter(coreSubtotal, discounts.subTotalDiscountType || "%", discounts.subTotalDiscount || "0");

  const locked = !!(isComplementary || isVoucher);

  // Grand total is the SINGLE source of truth from the pricing hook (incl. child price,
  // other charges, subtotal discount; tax excluded). Advance Payment & Review use the same value.
  const grandTotalFinal = pb?.grandTotal ?? "0.00";
  const grandTotalInInr = currency !== "INR"
    ? convertCurrency(parseFloat(String(grandTotalFinal)) || 0, currency, "INR")
    : 0;
  // Pre grand-discount figure shown in the Grand Total "Rate" cell
  const grandPreDiscount = (parseFloat(pb?.subtotal ?? "0") + transAfter + otherAfter).toFixed(2);
  const displayedGrandTotalBeforeDiscount = parseFloat(String(pb?.grandTotalBeforeDiscount ?? grandPreDiscount)) || 0;
  const displayedGrandTotalAfterDiscount = parseFloat(String(grandTotalFinal)) || 0;
  const autoGrandTotalDiscount = displayedGrandTotalBeforeDiscount > 0
    ? Math.min(100, Math.max(0, ((displayedGrandTotalBeforeDiscount - displayedGrandTotalAfterDiscount) / displayedGrandTotalBeforeDiscount) * 100)).toFixed(2)
    : "0.00";

  const thStyle: React.CSSProperties = {
    padding: "10px 8px",
    fontWeight: 600,
    fontSize: 13,
    color: "#444",
    borderBottom: "2px solid #ddd",
    textAlign: "left",
    background: "transparent",
    whiteSpace: "nowrap",
  };

  return (
    <div className="kbf-card">
      <CardHeader stepNo={5} icon="fa-calculator" title="Payment Breakdown Section" />
      <div className="kbf-card-body">

        {/* Complimentary + Voucher — top, above currency row, matching Image 2 */}
        <div style={{ display: "flex", gap: "20px", marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
            <input type="checkbox" checked={isComplementary} onChange={e => onComplementaryChange(e.target.checked)} style={{ width: 14, height: 14 }} />
            Complimentary
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
            <input type="checkbox" checked={isVoucher} onChange={e => onVoucherChange(e.target.checked)} style={{ width: 14, height: 14 }} />
            Voucher
          </label>
        </div>

        {/* Currency + Payment Collection Reminder row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", marginBottom: 24, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Currency</div>
            <select
              style={{ ...pb2Styles.select, minWidth: 200, padding: "7px 10px" }}
              value={currency}
              onChange={e => onCurrencyChange(e.target.value)}
            >
              <option value="INR">Indian Rupee (INR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EURO">Euro (EURO)</option>
            </select>
          </div>
          {currency !== "INR" && (
            <div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Grand Total in INR</div>
              <input
                type="text"
                style={{ ...pb2Styles.inputReadonly, minWidth: 180 }}
                value={grandTotalInInr.toFixed(2)}
                readOnly
              />
            </div>
          )}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 13, color: "#555", marginBottom: 4, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!discounts.paymentCollectionReminderEnabled}
                onChange={e => set("paymentCollectionReminderEnabled", e.target.checked ? "1" : "")}
                style={{ width: 13, height: 13 }}
              />
              Payment Collection Reminder
            </label>
            <input
              type="date"
              style={{ ...pb2Styles.inputEditable, minWidth: 180 }}
              value={discounts.paymentCollectionReminder || ""}
              onChange={e => set("paymentCollectionReminder", e.target.value)}
              disabled={!discounts.paymentCollectionReminderEnabled}
            />
          </div>
        </div>

        {/* Payment Breakdown Table */}
        <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid #e0e0d0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ ...thStyle, minWidth: 160 }}>Label</th>
                <th style={{ ...thStyle, minWidth: 110 }}>Rate</th>
                <th style={{ ...thStyle, minWidth: 150 }}>Discount %</th>
                <th style={{ ...thStyle, minWidth: 110 }}>Rate after Discount</th>
                <th style={{ ...thStyle, minWidth: 220 }}>Tax(CGST/SGST)</th>
                <th style={{ ...thStyle, minWidth: 110 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Room */}
              <DiscountRow
                label="Room"
                rate={pb?.roomRate || 0}
                discountType={discounts.roomDiscountType || "%"}
                discount={discounts.roomDiscount ?? ""}
                afterDiscount={pb?.roomAfterDiscount ?? 0}
                dtKey="roomDiscountType" dvKey="roomDiscount"
                taxRate={discounts.roomTaxRate || ""} taxKey="roomTaxRate" lockDiscount={locked}
                discountEditable={false}
                onChange={set} onTaxChange={set}
              />

              {/* Food */}
              <DiscountRow
                label="Food"
                rate={pb?.foodRate || 0}
                discountType={discounts.foodDiscountType || "%"}
                discount={discounts.foodDiscount ?? ""}
                afterDiscount={pb?.foodAfterDiscount ?? 0}
                dtKey="foodDiscountType" dvKey="foodDiscount"
                taxRate={discounts.foodTaxRate || ""} taxKey="foodTaxRate" lockDiscount={locked}
                discountEditable={false}
                onChange={set} onTaxChange={set}
              />

              {/* Treatment */}
              <DiscountRow
                label="Treatment"
                rate={pb?.treatmentRate || 0}
                discountType={discounts.treatmentDiscountType || "%"}
                discount={discounts.treatmentDiscount ?? ""}
                afterDiscount={pb?.treatmentAfterDiscount ?? 0}
                dtKey="treatmentDiscountType" dvKey="treatmentDiscount"
                taxRate={discounts.treatmentTaxRate || ""} taxKey="treatmentTaxRate" lockDiscount={locked}
                discountEditable={false}
                onChange={set} onTaxChange={set}
              />

              {/* Child Amount — read-only, auto-calculated (ages 5-12 × nights) */}
              {childAmt > 0 && (
                <tr>
                  <td style={pb2Styles.td}>
                    <span style={pb2Styles.labelCell}>Child Amount</span>
                  </td>
                  <td style={pb2Styles.td}>
                    <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={childAmt.toFixed(2)} readOnly />
                  </td>
                  <td style={pb2Styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <select style={{ ...pb2Styles.select, width: 62 }} value="%" disabled><option value="%">%</option></select>
                      <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 70 }} value="" readOnly disabled placeholder="0" />
                    </div>
                  </td>
                  <td style={pb2Styles.td}>
                    <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={childAmt.toFixed(2)} readOnly />
                  </td>
                  <td style={pb2Styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input type="text" style={{ ...pb2Styles.inputReadonly, width: 56, textAlign: "center", padding: "5px 4px" }} value="%" readOnly disabled />
                      <input type="number" style={{ ...pb2Styles.inputReadonly, width: 90 }} readOnly disabled value="" />
                    </div>
                  </td>
                  <td style={pb2Styles.td}>
                    <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={childAmt.toFixed(2)} readOnly />
                  </td>
                </tr>
              )}

              {/* Consultation — disabled, not included in total */}
              <DiscountRow
                label="Consultation"
                rate={discounts.consultationRate ?? ""}
                isRateEditable={false}
                discountType={discounts.consultationDiscountType || "%"}
                discount={discounts.consultationDiscount ?? ""}
                afterDiscount={discounts.consultationAfterDiscount ?? ""}
                dtKey="consultationDiscountType" dvKey="consultationDiscount"
                taxRate={discounts.consultationTaxRate || ""} taxKey="consultationTaxRate"
                onChange={set} onTaxChange={set}
                disabled={true}
              />

              {/* Yoga/Meditation — disabled, not included in total */}
              <DiscountRow
                label="Yoga/Meditation"
                rate={discounts.yogaRate ?? ""}
                isRateEditable={false}
                discountType={discounts.yogaDiscountType || "%"}
                discount={discounts.yogaDiscount ?? ""}
                afterDiscount={discounts.yogaAfterDiscount ?? ""}
                dtKey="yogaDiscountType" dvKey="yogaDiscount"
                taxRate={discounts.yogaTaxRate || ""} taxKey="yogaTaxRate"
                onChange={set} onTaxChange={set}
                disabled={true}
              />

              {/* Classes — disabled, not included in total */}
              <DiscountRow
                label="Classes"
                rate={discounts.classesRate ?? ""}
                isRateEditable={false}
                discountType={discounts.classesDiscountType || "%"}
                discount={discounts.classesDiscount ?? ""}
                afterDiscount={discounts.classesAfterDiscount ?? ""}
                dtKey="classesDiscountType" dvKey="classesDiscount"
                taxRate={discounts.classesTaxRate || ""} taxKey="classesTaxRate"
                onChange={set} onTaxChange={set}
                disabled={true}
              />

              {/* Divider line before Total */}
              <tr><td colSpan={6} style={{ borderTop: "2px solid #ddd", padding: 0 }} /></tr>

              {/* Total (Subtotal) row — Rate = after component-discount sum, editable subtotal discount */}
              <SummaryRow
                label="Total"
                rateTotal={coreSubtotal.toFixed(2)}
                afterDiscTotal={subtotalAfter.toFixed(2)}
                discountType={discounts.subTotalDiscountType || "%"}
                discount={discounts.subTotalDiscount ?? ""}
                onChange={set}
                dtKey="subTotalDiscountType"
                dvKey="subTotalDiscount"
                editableDiscount={true}
                lockDiscount={locked}
              />

              {/* Divider line before Transportation */}
              <tr><td colSpan={6} style={{ borderTop: "1px solid #ddd", padding: 0 }} /></tr>

              {/* Transportation — with Notes row below */}
              <tr>
                <td style={pb2Styles.td}>
                  <span style={pb2Styles.labelCell}>Transportation</span>
                </td>
                {/* FIX 3: Rate cell = dropdown (Amount Chargeable / Complimentary) + amount input */}
                <td style={pb2Styles.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <select
                      style={{ ...pb2Styles.select, width: "100%", marginBottom: 2 }}
                      value={discounts.transportationType || "Amount Chargeable"}
                      onChange={e => set("transportationType", e.target.value)}
                    >
                      <option value="Amount Chargeable">Amount Chargeable</option>
                      <option value="Complimentary">Complimentary</option>
                    </select>
                    <input
                      type="number"
                      style={{ ...pb2Styles.inputEditable, minWidth: 100 }}
                      value={discounts.transportationCost ?? ""}
                      onChange={e => set("transportationCost", e.target.value)}
                    />
                  </div>
                </td>
                <td style={pb2Styles.td}>
                  {/* Cash label not ₹. Locked on complimentary/voucher. */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <select
                      style={{ ...pb2Styles.select, width: 62 }}
                      value={discounts.transportationDiscountType || "%"}
                      disabled={locked}
                      onChange={!locked ? e => set("transportationDiscountType", e.target.value) : undefined}
                    >
                      <option value="%">%</option>
                      <option value="cash">Cash</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      max={isPercentDiscountType(discounts.transportationDiscountType || "%") ? "100" : undefined}
                      style={{ ...pb2Styles.inputEditable, minWidth: 70, ...(locked ? { background: "#f0f0f0" } : {}) }}
                      value={locked ? "" : (discounts.transportationDiscount ?? "")}
                      readOnly={locked}
                      onChange={!locked ? e => set("transportationDiscount", e.target.value) : undefined}
                      placeholder="0"
                    />
                  </div>
                </td>
                <td style={pb2Styles.td}>
                  <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={pb?.transportationTotal ?? "0.00"} readOnly />
                </td>
                {/* Tax col — read-only (no effect) */}
                <td style={pb2Styles.td}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="text" style={{ ...pb2Styles.inputReadonly, width: 56, textAlign: "center", padding: "5px 4px" }} value="%" readOnly disabled />
                    <input type="number" style={{ ...pb2Styles.inputReadonly, width: 90 }} readOnly disabled value="" />
                  </div>
                </td>
                <td style={pb2Styles.td}>
                  <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }}
                    value={pb?.transportationTotal ?? "0.00"}
                    readOnly />
                </td>
              </tr>
              {/* Transportation Notes */}
              <tr>
                <td style={{ ...pb2Styles.td, paddingTop: 2, paddingBottom: 8 }} />
                <td colSpan={5} style={{ ...pb2Styles.td, paddingTop: 2, paddingBottom: 8 }}>
                  <input
                    type="text"
                    maxLength={160}
                    style={{ ...pb2Styles.inputEditable, width: "100%", ...(errors.transportationNotes ? { border: "1px solid #dc3545", background: "#fff5f5" } : {}) }}
                    value={discounts.transportationNotes || ""}
                    onChange={e => set("transportationNotes", e.target.value.slice(0, 160))}
                    placeholder="Notes (max 160 characters)"
                    disabled={locked}
                  />
                  <span style={{ fontSize: 11, color: (discounts.transportationNotes || "").length >= 160 ? "#dc3545" : "#888" }}>
                    {(discounts.transportationNotes || "").length}/160
                  </span>
                  {errors.transportationNotes && (
                    <span style={{ fontSize: 11, color: "#dc3545", display: "block" }}>{errors.transportationNotes}</span>
                  )}
                </td>
              </tr>

              {/* Divider before Other Amount */}
              <tr><td colSpan={6} style={{ borderTop: "1px solid #ddd", padding: 0 }} /></tr>

              {/* Other Amount */}
              <tr>
                <td style={pb2Styles.td}>
                  <span style={pb2Styles.labelCell}>Other Amount</span>
                </td>
                <td style={pb2Styles.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Service description — what the charge is for (point 6) */}
                    <input
                      type="text"
                      maxLength={40}
                      style={{
                        ...pb2Styles.inputEditable, minWidth: 100,
                        ...(errors.otherAmountDescription ? { border: "1px solid #dc3545", background: "#fff5f5" } : {}),
                      }}
                      value={discounts.otherAmountDescription || ""}
                      onChange={e => set("otherAmountDescription", e.target.value.slice(0, 40))}
                      placeholder="Other Service Used (max 40)"
                      disabled={locked}
                    />
                    {errors.otherAmountDescription && (
                      <span style={{ fontSize: 11, color: "#dc3545", display: "block" }}>
                        {errors.otherAmountDescription}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: (discounts.otherAmountDescription || "").length >= 40 ? "#dc3545" : "#888" }}>
                      {(discounts.otherAmountDescription || "").length}/40
                    </span>
                    <input
                      type="number"
                      style={{ ...pb2Styles.inputEditable, minWidth: 100, ...(locked ? { background: "#f0f0f0" } : {}) }}
                      value={locked ? "" : (discounts.otherAmountRate || "")}
                      readOnly={locked}
                      onChange={!locked ? e => set("otherAmountRate", e.target.value) : undefined}
                      placeholder="Amount"
                    />
                  </div>
                </td>
                <td style={pb2Styles.td}>
                  {/* Cash label. Locked on complimentary/voucher. */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <select
                      style={{ ...pb2Styles.select, width: 62 }}
                      value={discounts.otherAmountDiscountType || "%"}
                      disabled={locked}
                      onChange={!locked ? e => set("otherAmountDiscountType", e.target.value) : undefined}
                    >
                      <option value="%">%</option>
                      <option value="cash">Cash</option>
                    </select>
                    <input
                      type="number" min="0"
                      max={isPercentDiscountType(discounts.otherAmountDiscountType || "%") ? "100" : undefined}
                      style={{ ...pb2Styles.inputEditable, minWidth: 70, ...(locked ? { background: "#f0f0f0" } : {}) }}
                      value={locked ? "" : (discounts.otherAmountDiscount ?? "")}
                      readOnly={locked}
                      onChange={!locked ? e => set("otherAmountDiscount", e.target.value) : undefined}
                      placeholder="0"
                    />
                  </div>
                </td>
                <td style={pb2Styles.td}>
                  <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={otherAfter.toFixed(2)} readOnly />
                </td>
                {/* Tax col — read-only (no effect) */}
                <td style={pb2Styles.td}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="text" style={{ ...pb2Styles.inputReadonly, width: 56, textAlign: "center", padding: "5px 4px" }} value="%" readOnly disabled />
                    <input type="number" style={{ ...pb2Styles.inputReadonly, width: 90 }} readOnly disabled value="" />
                  </div>
                </td>
                <td style={pb2Styles.td}>
                  <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={otherAfter.toFixed(2)} readOnly />
                </td>
              </tr>
              {/* Other Amount Notes */}
              <tr>
                <td style={{ ...pb2Styles.td, paddingTop: 2, paddingBottom: 8 }} />
                <td colSpan={5} style={{ ...pb2Styles.td, paddingTop: 2, paddingBottom: 8 }}>
                  <input
                    type="text"
                    maxLength={160}
                    style={{ ...pb2Styles.inputEditable, width: "100%", ...(errors.otherAmountNotes ? { border: "1px solid #dc3545", background: "#fff5f5" } : {}) }}
                    value={discounts.otherAmountNotes || ""}
                    onChange={e => set("otherAmountNotes", e.target.value.slice(0, 160))}
                    placeholder="Notes (max 160 characters)"
                    disabled={locked}
                  />
                  <span style={{ fontSize: 11, color: (discounts.otherAmountNotes || "").length >= 160 ? "#dc3545" : "#888" }}>
                    {(discounts.otherAmountNotes || "").length}/160
                  </span>
                  {errors.otherAmountNotes && (
                    <span style={{ fontSize: 11, color: "#dc3545", display: "block" }}>{errors.otherAmountNotes}</span>
                  )}
                </td>
              </tr>

              {/* Divider before Grand Total */}
              <tr><td colSpan={6} style={{ borderTop: "2px solid #ddd", padding: 0 }} /></tr>

              {/* Grand Total */}
              <tr>
                <td style={pb2Styles.td}>
                  <span style={{ ...pb2Styles.labelCell, fontSize: 15 }}>Grand Total</span>
                </td>
                {/* Rate = pre grand-discount total (subtotal + transport + other) */}
                <td style={pb2Styles.td}>
                  <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }} value={displayedGrandTotalBeforeDiscount.toFixed(2)} readOnly />
                </td>
                {/* Discount % — DISABLED/read-only (only auto-100% on complimentary/voucher) */}
                <td style={pb2Styles.td}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <select
                      style={{ ...pb2Styles.select, width: 62 }}
                      value="%"
                      disabled={true}
                    >
                      <option value="%">%</option>
                    </select>
                    <input
                      type="number" min="0" step="any"
                      style={{ ...pb2Styles.inputReadonly, minWidth: 70, background: "#f0f0f0" }}
                      value={locked ? "100.00" : autoGrandTotalDiscount}
                      readOnly
                      disabled
                      placeholder="0.00"
                    />
                  </div>
                </td>
                {/* Rate after Discount — hook grand total (single source of truth) */}
                <td style={pb2Styles.td}>
                  <input type="number" style={{ ...pb2Styles.inputReadonly, minWidth: 100 }}
                    value={grandTotalFinal}
                    readOnly />
                </td>
                {/* Tax col — read-only (no effect) */}
                <td style={pb2Styles.td}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="text" style={{ ...pb2Styles.inputReadonly, width: 56, textAlign: "center", padding: "5px 4px" }} value="%" readOnly disabled />
                    <input type="number" style={{ ...pb2Styles.inputReadonly, width: 90 }} readOnly disabled value="" />
                  </div>
                </td>
                {/* Final Total — hook grand total (0 when complimentary/voucher) */}
                <td style={pb2Styles.td}>
                  <input
                    type="number"
                    style={{ ...pb2Styles.inputReadonly, minWidth: 100 }}
                    value={grandTotalFinal}
                    readOnly
                  />
                </td>
              </tr>
              {/* Grand Total Notes */}
              <tr>
                <td style={{ ...pb2Styles.td, paddingTop: 2, paddingBottom: 12 }} />
                <td colSpan={5} style={{ ...pb2Styles.td, paddingTop: 2, paddingBottom: 12 }}>
                  <input
                    type="text"
                    maxLength={160}
                    style={{ ...pb2Styles.inputEditable, width: "100%", ...(errors.grandTotalNotes ? { border: "1px solid #dc3545", background: "#fff5f5" } : {}) }}
                    value={discounts.grandTotalNotes || ""}
                    onChange={e => set("grandTotalNotes", e.target.value.slice(0, 160))}
                    placeholder="Notes (max 160 characters)"
                    disabled={locked}
                  />
                  <span style={{ fontSize: 11, color: (discounts.grandTotalNotes || "").length >= 160 ? "#dc3545" : "#888" }}>
                    {(discounts.grandTotalNotes || "").length}/160
                  </span>
                  {errors.grandTotalNotes && (
                    <span style={{ fontSize: 11, color: "#dc3545", display: "block" }}>{errors.grandTotalNotes}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// ─── Step 6: Advance Payment ─────────────────────────────────────────────────
export function StepAdvancePayment({
  data, onChange, errors = {}, currency = "INR", pricing
}: {
  data: AdvancePayment; onChange: (d: AdvancePayment) => void; errors?: Record<string, string>; currency?: string; pricing?: any;
}) {
  const set = (k: keyof AdvancePayment, v: any) => onChange({ ...data, [k]: v });

  const blurTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = React.useRef(false);

  React.useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Logged-in user — "Payment Collection By" is fixed to this (point 10)
  const collectedByName = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const u = JSON.parse(sessionStorage.getItem("kairali_user") || localStorage.getItem("kairali_user") || "null") || {};
      return u.name || u.userName || u.fullName || u.displayName || u.username || u.email || "";
    } catch { return ""; }
  }, []);

  // Keep the field's stored value in sync with the logged-in user
  React.useEffect(() => {
    if (collectedByName && data.paymentCollectionBy !== collectedByName) {
      onChange({ ...data, paymentCollectionBy: collectedByName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectedByName]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = (ev.target?.result as string).split(",")[1];
      onChange({ ...data, screenshotName: file.name, screenshotBase64: b64, screenshotType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const isLocked = !data.isAdvancePayment;
  const bookingCurrency = currency || "INR";
  const advCurrency = data.currency || bookingCurrency;

  const grandTotal = parseFloat(pricing?.paymentBreakdown?.grandTotal) || 0;
  const receivedAmount = parseFloat(data.amount) || 0;
  const historicalReceivedAmount = parseFloat(data.totalReceived || "0") || 0;
  const displayedReceivedAmount = data.isAdvancePayment ? receivedAmount : historicalReceivedAmount;
  const savedTotal = parseFloat(data.totalAmount || "0") || 0;

  // Convert grand total (in booking currency) to the selected advance payment currency
  const grandTotalInAdvCurrency = convertCurrency(grandTotal, bookingCurrency, advCurrency);
  const effectiveGrandTotal = grandTotalInAdvCurrency > 0 ? grandTotalInAdvCurrency : savedTotal;

  const percentReceived = effectiveGrandTotal > 0
    ? ((displayedReceivedAmount / effectiveGrandTotal) * 100).toFixed(2)
    : (data.percentage || "0.00");
  const pendingAmount = effectiveGrandTotal > 0
    ? Math.max(0, effectiveGrandTotal - displayedReceivedAmount).toFixed(2)
    : (data.pending || "0.00");

  const currencyLabelMap: Record<string, string> = {
    INR: "Indian Rupee (INR)",
    USD: "US Dollar (USD)",
    EURO: "Euro (EURO)"
  };

  return (
    <div className="kbf-card">
      <CardHeader stepNo={6} icon="fa-credit-card" title="Advance Payment Collection Section" />
      <div className="kbf-card-body">
        <label className="kbf-lock-row" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 24px 0", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
          <input type="checkbox" checked={isLocked} onChange={e => set("isAdvancePayment", !e.target.checked)} style={{ width: "16px", height: "16px" }} />
          Uncheck and fill details
        </label>

        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
          <Field label="Payment Received Date & Time" required={!isLocked} error={!isLocked ? errors.paymentReceivedDate : undefined}>
            <KInput
              type="datetime-local"
              value={data.paymentReceivedDate || ""}
              max={getNowLocalDateTime()}
              onKeyDown={() => {
                isTypingRef.current = true;
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
              }}
              onBlur={() => {
                isTypingRef.current = false;
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
              }}
              onChange={e => {
                const val = e.target.value;
                const nowLocal = getNowLocalDateTime();
                // Prevent selecting/typing a future date-time; clamp to now instead.
                const finalVal = val > nowLocal ? nowLocal : val;
                set("paymentReceivedDate", finalVal);

                if (finalVal && finalVal.length === 16 && !isTypingRef.current) {
                  if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                  const target = e.target;
                  blurTimeoutRef.current = setTimeout(() => {
                    if (document.activeElement === target) {
                      target.blur();
                    }
                  }, 600);
                }
              }}
              disabled={isLocked}
              error={!isLocked && !!errors.paymentReceivedDate}
            />
          </Field>
          <Field label="Currency">
            <KSelect value={data.currency || currency} onChange={e => set("currency", e.target.value)} disabled={isLocked}>
              {Object.entries(currencyLabelMap).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </KSelect>
          </Field>
          <Field label="Received Amount" required={!isLocked} error={!isLocked ? errors.amount : undefined}>
            <KInput type="number" value={data.amount} onChange={e => set("amount", e.target.value)} disabled={isLocked} error={!isLocked && !!errors.amount} placeholder="Received Amount" min="0" />
          </Field>
          <Field label="Payment Mode" required={!isLocked} error={!isLocked ? errors.paymentMode : undefined}>
            <KSelect value={data.paymentMode} onChange={e => set("paymentMode", e.target.value)} disabled={isLocked} error={!isLocked && !!errors.paymentMode}>
              <option value="">Select</option>
              {["Cash", "UPI", "Bank Transfer", "Credit Card", "Debit Card"].map(m => <option key={m} value={m}>{m}</option>)}
            </KSelect>
          </Field>
        </div>

        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginTop: "16px" }}>
          <Field label="Receipt/Transaction No." required={!isLocked} error={!isLocked ? errors.transactionNo : undefined}>
            <KInput value={data.transactionNo} onChange={e => set("transactionNo", e.target.value)} disabled={isLocked} error={!isLocked && !!errors.transactionNo} placeholder="Receipt/Transaction No." />
          </Field>
          <Field label="Payment Collection Location" required={!isLocked} error={!isLocked ? errors.paymentLocation : undefined}>
            <KInput value={data.paymentLocation || ""} onChange={e => set("paymentLocation", e.target.value)} disabled={isLocked} error={!isLocked && !!errors.paymentLocation} placeholder="Collection Location" />
          </Field>
          <Field label="Payment Collection By" required={!isLocked} error={!isLocked ? errors.paymentCollectionBy : undefined}>
            <KInput value={data.paymentCollectionBy || collectedByName} readOnly disabled style={{ backgroundColor: "#f0f0f0" }} placeholder="Collection By" />
          </Field>
          <Field label="Uploaded Screenshot" required={!isLocked} error={!isLocked ? errors.screenshotName : undefined}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <input type="file" accept="image/*" onChange={handleFile} disabled={isLocked} style={{ display: "none" }} id="advance-screenshot-file" />
              <label htmlFor="advance-screenshot-file" className="kbf-btn" style={{
                backgroundColor: isLocked ? "#ccc" : "#7b8a56",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: isLocked ? "not-allowed" : "pointer",
                display: "inline-block",
                fontWeight: "600"
              }}>
                Choose File
              </label>
              <span style={{ fontSize: "13px", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{data.screenshotName || "No file chosen"}</span>
            </div>
          </Field>
        </div>

        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "24px" }}>
          <Field label="Total Received Amount" required={!isLocked}>
            <KInput value={displayedReceivedAmount} disabled style={{ backgroundColor: "#f0f0f0" }} />
          </Field>
          <Field label="Ref Received Amount %" required={!isLocked}>
            <KInput value={percentReceived} disabled style={{ backgroundColor: "#f0f0f0" }} />
          </Field>
          <Field label="Pending Amount" required={!isLocked}>
            <KInput value={pendingAmount} disabled style={{ backgroundColor: "#f0f0f0" }} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─── Step 7: Approval Upload ──────────────────────────────────────────────────
export function StepApproval({
  data, onChange, errors = {},
}: {
  data: ApprovalInfo; onChange: (d: ApprovalInfo) => void; errors?: Record<string, string>;
}) {
  const set = (k: keyof ApprovalInfo, v: any) => onChange({ ...data, [k]: v });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = (ev.target?.result as string).split(",")[1];
      onChange({ ...data, screenshotName: file.name, screenshotBase64: b64, screenshotType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const isLocked = !data.isApprovalRequired;

  return (
    <div className="kbf-card">
      <CardHeader stepNo={7} icon="fa-file-upload" title="Approval Upload (If Advance Not Taken)" />
      <div className="kbf-card-body">
        <label className="kbf-lock-row" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 24px 0", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
          <input type="checkbox" checked={isLocked} onChange={e => set("isApprovalRequired", !e.target.checked)} style={{ width: "16px", height: "16px" }} />
          Uncheck and fill details
        </label>

        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <Field label="Approval Given Date" required={!isLocked} error={!isLocked ? errors.approvalGivenDate : undefined}>
            <KInput
              type="date"
              value={data.approvalGivenDate || ""}
              max={getTodayLocalDate()}
              onChange={e => {
                const val = e.target.value;
                const today = getTodayLocalDate();
                // Prevent selecting/typing a future date; clamp to today instead.
                set("approvalGivenDate", val > today ? today : val);
              }}
              disabled={isLocked}
              error={!isLocked && !!errors.approvalGivenDate}
            />
          </Field>
          <Field label="Approval Valid Till Date" required={!isLocked} error={!isLocked ? errors.approvalValidTillDate : undefined}>
            <KInput type="date" value={data.approvalValidTillDate || ""} onChange={e => set("approvalValidTillDate", e.target.value)} disabled={isLocked} error={!isLocked && !!errors.approvalValidTillDate} min={data.approvalGivenDate || undefined} />
          </Field>
          <Field label="Approved By" required={!isLocked} error={!isLocked ? errors.approvedBy : undefined}>
            <KSelect value={data.approvedBy} onChange={e => set("approvedBy", e.target.value)} disabled={isLocked} error={!isLocked && !!errors.approvedBy}>
              <option value="">Select Approver</option>
              <option value="By GM">By GM</option>
              <option value="By Sir">By Sir</option>
            </KSelect>
          </Field>
        </div>

        <div className="kbf-row" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
          <Field label="Approval Screenshot" required={!isLocked} error={!isLocked ? errors.screenshotName : undefined}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <input type="file" accept="image/*" onChange={handleFile} disabled={isLocked} style={{ display: "none" }} id="approval-screenshot-file" />
              <label htmlFor="approval-screenshot-file" className="kbf-btn" style={{
                backgroundColor: isLocked ? "#ccc" : "#7b8a56",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: isLocked ? "not-allowed" : "pointer",
                display: "inline-block",
                fontWeight: "600"
              }}>
                Choose File
              </label>
              <span style={{ fontSize: "13px", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{data.screenshotName || "No file chosen"}</span>
            </div>
          </Field>
          <Field label="Remarks" error={!isLocked ? errors.remarks : undefined}>
            <KTextarea
              value={data.remarks}
              onChange={e => set("remarks", sanitizeApprovalRemarks(e.target.value))}
              disabled={isLocked}
              placeholder="Enter remarks..."
              maxLength={MAX_APPROVAL_REMARKS_LEN}
              style={{ height: "80px" }}
              error={!isLocked && !!errors.remarks}
            />
            <span className="kbf-char-count" style={{ fontSize: 12, color: "#888" }}>
              {(data.remarks || "").length}/{MAX_APPROVAL_REMARKS_LEN}
            </span>
          </Field>
        </div>
      </div>
    </div>
  );
}
