"use client";

import { useState } from "react";

interface MRDataCheckProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: MRFormData) => void;
    planned?: string;
    actual?: string;
    timeDelay?: string;
    // Pass pre-filled data + true to open in read-only mode
    initialData?: MRFormData;
    readOnly?: boolean;
}

export interface MRFormData {
    status: string;
    assignToMROrASM: string;
    remarks: string;
    assignToTPDate: string;
    partyType: string;
    verifiedArea: string;
}





const EMPTY_FORM: MRFormData = {
    status: "",
    assignToMROrASM: "",
    remarks: "",
    assignToTPDate: "",
    partyType: "",
    verifiedArea: "",
};

export default function MRDataCheck({
    isOpen,
    onClose,
    onSubmit,
    planned = "22/06/2026 04:32:57 AM",
    actual = "22/06/2026 10:33:40 AM",
    timeDelay = "06:00:43",
    initialData,
    readOnly = false,
}: MRDataCheckProps) {
    const [form, setForm] = useState<MRFormData>(initialData ?? EMPTY_FORM);
    const [errors, setErrors] = useState<Partial<MRFormData>>({});
    // Once submitted in this session, lock to read-only
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const isReadOnly = readOnly || submitted;

    const allFilled =
        !!form.status &&
        !!form.assignToMROrASM &&
        !!form.remarks.trim() &&
        !!form.assignToTPDate &&
        !!form.partyType &&
        !!form.verifiedArea;

    const handleChange = (field: keyof MRFormData, value: string) => {
        if (isReadOnly) return;
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<MRFormData> = {};
        if (!form.status) newErrors.status = "Status is required";
        if (!form.assignToMROrASM) newErrors.assignToMROrASM = "Assignee is required";
        if (!form.remarks.trim()) newErrors.remarks = "Remarks are required";
        if (!form.assignToTPDate) newErrors.assignToTPDate = "Date is required";
        if (!form.partyType) newErrors.partyType = "Party type is required";
        if (!form.verifiedArea) newErrors.verifiedArea = "Verified area is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!allFilled || isReadOnly) return;
        if (!validate()) return;
        onSubmit?.(form);
        setSubmitted(true);
    };

    const handleCancel = () => {
        if (!isReadOnly) {
            setForm(EMPTY_FORM);
            setErrors({});
        }
        onClose();
    };

    return (
        <div
            className="mrdc-overlay"
            onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
            <div className="mrdc-modal">

                {/* ── Header ── */}
                <div className="mrdc-header">
                    <div className="mrdc-header-left">
                        <div className="mrdc-header-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 2v6h-6" />
                                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                <path d="M3 22v-6h6" />
                                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="mrdc-header-title">Verify &amp; Assign MR / ASM</h2>
                            <p className="mrdc-header-subtitle">
                                {isReadOnly ? "Submitted — read only" : "All fields are compulsory"}
                            </p>
                        </div>
                    </div>
                    <button className="mrdc-close-btn" onClick={handleCancel} aria-label="Close modal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="mrdc-body">

                    {/* Read-only banner */}
                    {isReadOnly && (
                        <div className="mrdc-readonly-banner mrdc-full-width">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            This lead has already been submitted and cannot be edited.
                        </div>
                    )}

                    {/* Status */}
                    <div className="mrdc-field">
                        <label className="mrdc-label">
                            Status {!isReadOnly && <span className="mrdc-required">*</span>}
                        </label>
                        <div className="mrdc-select-wrapper">
                            <select
                                className={`mrdc-select ${errors.status ? "mrdc-error-input" : ""}`}
                                value={form.status}
                                onChange={(e) => handleChange("status", e.target.value)}
                                disabled={isReadOnly}
                            >
                                <option value="" disabled>Select status</option>
                                <option value="Cold">Cold</option>
                                <option value="Assign To MR">Assign To MR</option>
                                <option value="No MR">No MR</option>
                                <option value="Hold">Hold</option>
                                <option value="Assign To Calling Sheet">Assign To Calling Sheet</option>
                            </select>
                            <span className="mrdc-select-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </span>
                        </div>
                        {errors.status && <span className="mrdc-error-msg">{errors.status}</span>}
                    </div>

                    {/* Assign to MR or ASM */}
                    <div className="mrdc-field">
                        <label className="mrdc-label">
                            Assign to MR or ASM {!isReadOnly && <span className="mrdc-required">*</span>}
                        </label>
                        <div className="mrdc-select-wrapper">
                            <select
                                className={`mrdc-select ${errors.assignToMROrASM ? "mrdc-error-input" : ""}`}
                                value={form.assignToMROrASM}
                                onChange={(e) => handleChange("assignToMROrASM", e.target.value)}
                                disabled={isReadOnly}
                            >
                                <option value="" disabled>Select assignee</option>

                                <option value="Aakash Saini">Aakash Saini</option>
                                <option value="Aakash Saini Self">Aakash Saini Self</option>
                                <option value="Abid Hussain">Abid Hussain</option>
                                <option value="Amit Kumar">Amit Kumar</option>
                                <option value="Anuj Kumar">Anuj Kumar</option>
                                <option value="Anurag Shukla">Anurag Shukla</option>
                                <option value="Arpit Khariwal">Arpit Khariwal</option>
                                <option value="Arvind Maurya Self">Arvind Maurya Self</option>
                                <option value="Ashok Sharma">Ashok Sharma</option>
                                <option value="Ashok Sharma Self">Ashok Sharma Self</option>
                                <option value="Dileep Kumar Sonkar">Dileep Kumar Sonkar</option>
                                <option value="Girish Chaturvedi">Girish Chaturvedi</option>
                                <option value="Hemant Gaur">Hemant Gaur</option>
                                <option value="Kuldeep Verma">Kuldeep Verma</option>
                                <option value="Manish Srivastava">Manish Srivastava</option>
                                <option value="Naveen Kumar">Naveen Kumar</option>
                                <option value="Nirbhay Singh">Nirbhay Singh</option>
                                <option value="Parth Sarthi Roy">Parth Sarthi Roy</option>
                                <option value="Parth Sarthi Roy Self">Parth Sarthi Roy Self</option>
                                <option value="Pavanendra Singh Raghava">Pavanendra Singh Raghava</option>
                                <option value="Rahul Srivastava">Rahul Srivastava</option>
                                <option value="Rajendra Kumar">Rajendra Kumar</option>
                                <option value="Rajesh Arora(SELF)">Rajesh Arora(SELF)</option>
                                <option value="Rakesh Vaheliya">Rakesh Vaheliya</option>
                                <option value="RAVINDRAN B">RAVINDRAN B</option>
                                <option value="RAVINDRAN B SELF">RAVINDRAN B SELF</option>
                                <option value="S K THAKUR SELF">S K THAKUR SELF</option>
                                <option value="Sameer Anand">Sameer Anand</option>
                                <option value="SATISH CHANDRA GANGWAR SELF">SATISH CHANDRA GANGWAR SELF</option>
                                <option value="Saurabh Mehra">Saurabh Mehra</option>
                                <option value="Shubham Sharma">Shubham Sharma</option>
                                <option value="Shwetank Upadhyay">Shwetank Upadhyay</option>
                                <option value="Suneel Kumar">Suneel Kumar</option>
                                <option value="Tarachand chouhan">Tarachand chouhan</option>
                                <option value="Utkarsh Mishra Self">Utkarsh Mishra Self</option>
                                <option value="Vijay Kumar">Vijay Kumar</option>
                                <option value="Vikram Sain">Vikram Sain</option>
                                <option value="VINAYAK PANDURANGA AMBIG">VINAYAK PANDURANGA AMBIG</option>
                                <option value="PRAMOD KUMAR PANCHAL">PRAMOD KUMAR PANCHAL</option>
                                <option value="ALOK KUMAR">ALOK KUMAR</option>
                                <option value="Tej Pratap">Tej Pratap</option>
                                <option value="Rinny Dixit">Rinny Dixit</option>
                                <option value="ARUN NAUTIYAL">ARUN NAUTIYAL</option>
                                <option value="Arvind Maurya">Arvind Maurya</option>
                                <option value="Dhaneshwar MR">Dhaneshwar MR</option>
                                <option value="Puneet">Puneet</option>
                                <option value="Aashish Kumar Awasthi">Aashish Kumar Awasthi</option>
                                <option value="demo Self">demo Self</option>
                                <option value="Avnish Kumar Dubey">Avnish Kumar Dubey</option>
                                <option value="Arvind Kumar Thakur">Arvind Kumar Thakur</option>
                                <option value="Sunaj Sahoo">Sunaj Sahoo</option>
                                <option value="Shubham Sharma#S">Shubham Sharma#S</option>
                                <option value="NIDHISH K">NIDHISH K</option>
                                <option value="HARSHAD N P">HARSHAD N P</option>
                                <option value="Vinod Kumar K V#S">Vinod Kumar K V#S</option>
                                <option value="JAYAKRISHNAN T">JAYAKRISHNAN T</option>
                                <option value="BHARATHRAJ J">BHARATHRAJ J</option>
                                <option value="K Rajesh#S">K Rajesh#S</option>
                                <option value="SADANAND AK#S">SADANAND AK#S</option>
                                <option value="MAHESH K MOHNAN">MAHESH K MOHNAN</option>
                                <option value="SANTHOSH V SELF">SANTHOSH V SELF</option>
                                <option value="KK Ganesh Self#S">KK Ganesh Self#S</option>
                                <option value="DHANUSH S">DHANUSH S</option>
                                <option value="AKHIL MC">AKHIL MC</option>
                                <option value="Anoop CG#S">Anoop CG#S</option>
                                <option value="RAMARAO V Mokasi">RAMARAO V Mokasi</option>
                                <option value="NAVEEN N">NAVEEN N</option>
                                <option value="Sivanand B Aribenchi">Sivanand B Aribenchi</option>
                                <option value="MANJUNATHA P">MANJUNATHA P</option>
                                <option value="RAMESH GOUDA">RAMESH GOUDA</option>
                                <option value="JAGADISH D.K.">JAGADISH D.K.</option>
                                <option value="Jagadeesh K.S">Jagadeesh K.S</option>
                                <option value="Nageshwar A">Nageshwar A</option>
                                <option value="Pramod Kumar">Pramod Kumar</option>
                                <option value="Vijay#S">Vijay#S</option>
                                <option value="CHANDRASHEKAR HR">CHANDRASHEKAR HR</option>
                                <option value="Jagadeesh M Bagwadi#S">Jagadeesh M Bagwadi#S</option>
                                <option value="Jagadeesh M Bagwadi Self#S">Jagadeesh M Bagwadi Self#S</option>
                                <option value="MUTHU KUMAR">MUTHU KUMAR</option>
                                <option value="Subramani M">Subramani M</option>
                                <option value="SIVAKUMAR AK">SIVAKUMAR AK</option>
                                <option value="Ravi Kumar Johnwilson#S">Ravi Kumar Johnwilson#S</option>
                                <option value="KRISHNAKUMAR M">KRISHNAKUMAR M</option>
                                <option value="VETRIVEL S">VETRIVEL S</option>
                                <option value="Sasikumar R">Sasikumar R</option>
                                <option value="Dhanapal M#S">Dhanapal M#S</option>
                                <option value="Paul Sekhar">Paul Sekhar</option>
                                <option value="Harieshwar">Harieshwar</option>
                                <option value="E. Sakthi#S">E. Sakthi#S</option>
                                <option value="Ummer Sherriff#S">Ummer Sherriff#S</option>
                                <option value="Anurag Shukla#S">Anurag Shukla#S</option>
                                <option value="SAILESH KUMAR VERMA">SAILESH KUMAR VERMA</option>
                                <option value="Arvind Kumar Shukla Self">Arvind Kumar Shukla Self</option>
                                <option value="Amit Kumar#S">Amit Kumar#S</option>
                                <option value="Pradeep Kumar#S">Pradeep Kumar#S</option>
                                <option value="Pavanendra Singh Raghava#S">Pavanendra Singh Raghava#S</option>
                                <option value="Suraj Kumar Singh#S">Suraj Kumar Singh#S</option>
                                <option value="Devashish Dubey#S">Devashish Dubey#S</option>
                                <option value="Rahul Kumar Gupta">Rahul Kumar Gupta</option>
                                <option value="Nitesh sharma">Nitesh sharma</option>
                                <option value="RISHI BHUSHAN">RISHI BHUSHAN</option>
                                <option value="Naresh Kumar">Naresh Kumar</option>
                                <option value="Vishal Sharma">Vishal Sharma</option>
                                <option value="Kulwinder Singh">Kulwinder Singh</option>
                                <option value="MUKESH SHARMA">MUKESH SHARMA</option>
                                <option value="Tikam Chand Ashrani">Tikam Chand Ashrani</option>
                                <option value="Lal Singh#S">Lal Singh#S</option>
                                <option value="Chandraprakash Parashar">Chandraprakash Parashar</option>
                                <option value="HITENDRA NAGAR SALF#S">HITENDRA NAGAR SALF#S</option>
                                <option value="Dilip Durale">Dilip Durale</option>
                                <option value="Ram Lakhan Kushwaha#S">Ram Lakhan Kushwaha#S</option>
                                <option value="Shriram Y Moghe">Shriram Y Moghe</option>
                                <option value="Avinash Chavan">Avinash Chavan</option>
                                <option value="Ramdas Nar">Ramdas Nar</option>
                                <option value="Ajay Killekar #S">Ajay Killekar #S</option>
                                <option value="Ashish Mahesh Vidwansa#S">Ashish Mahesh Vidwansa#S</option>
                                <option value="Vijay Narayanrao Joshi">Vijay Narayanrao Joshi</option>
                                <option value="Vijay Narayanrao Joshi Self">Vijay Narayanrao Joshi Self</option>
                                <option value="Vijay JaySing Surve#S">Vijay JaySing Surve#S</option>
                                <option value="Vijay JaySing Surve Self#S">Vijay JaySing Surve Self#S</option>
                                <option value="Nilesh Mukund Rao Bharambe#S">Nilesh Mukund Rao Bharambe#S</option>
                                <option value="Kiran Dinkar Jadkar#S">Kiran Dinkar Jadkar#S</option>
                                <option value="Karthik Sai Kumar B">Karthik Sai Kumar B</option>
                                <option value="Yugandhar G">Yugandhar G</option>
                                <option value="Krishnarao K.S.V.">Krishnarao K.S.V.</option>
                                <option value="Naganna S">Naganna S</option>
                                <option value="SADANANDAIAH M">SADANANDAIAH M</option>
                                <option value="Test">Test</option>
                                <option value="Varahalarao K">Varahalarao K</option>
                                <option value="Sathyanarayana Dhoopam">Sathyanarayana Dhoopam</option>
                                <option value="Aakash Saini#S">Aakash Saini#S</option>
                                <option value="Aakash Saini Self#S">Aakash Saini Self#S</option>
                                <option value="Nand kishor Verma">Nand kishor Verma</option>
                                <option value="Dhanpal#S">Dhanpal#S</option>
                                <option value="Dinesh Singh Rana">Dinesh Singh Rana</option>
                                <option value="Dinesh Singh Rana Self">Dinesh Singh Rana Self</option>
                                <option value="Birender Singh Chauhan">Birender Singh Chauhan</option>
                                <option value="Parth Sarthi Roy#S">Parth Sarthi Roy#S</option>
                                <option value="Parth Sarthi Roy Self#S">Parth Sarthi Roy Self#S</option>
                                <option value="Saurabh Mehra#S">Saurabh Mehra#S</option>
                                <option value="Kamal Sharma">Kamal Sharma</option>
                                <option value="Rajeev Lochan Pandey#S">Rajeev Lochan Pandey#S</option>
                                <option value="Deepratan Bande Self">Deepratan Bande Self</option>
                                <option value="Narayn Nayak">Narayn Nayak</option>
                                <option value="Vishal Dangi#S">Vishal Dangi#S</option>
                                <option value="Shubham Shrivastava#S">Shubham Shrivastava#S</option>
                                <option value="Dharmendra Sharma">Dharmendra Sharma</option>
                                <option value="Saiprasanna Pattanaik#S">Saiprasanna Pattanaik#S</option>
                                <option value="Saiprasanna Pattanaik Self#S">Saiprasanna Pattanaik Self#S</option>
                                <option value="Ashish Singh Chandel Self">Ashish Singh Chandel Self</option>
                                <option value="Jeewan Sharma">Jeewan Sharma</option>
                                <option value="Mayank Shekhar">Mayank Shekhar</option>
                                <option value="Inderpal Chayal Self">Inderpal Chayal Self</option>
                                <option value="Pardeep Kumar">Pardeep Kumar</option>
                                <option value="Pardeep Kumar Self">Pardeep Kumar Self</option>
                                <option value="Rahul Sharma#S">Rahul Sharma#S</option>
                                <option value="Navdeep Kumar#S">Navdeep Kumar#S</option>
                                <option value="Prasant Kumar Singh#S">Prasant Kumar Singh#S</option>
                                <option value="Santu Debnath">Santu Debnath</option>
                                <option value="Santu Debnath Self">Santu Debnath Self</option>
                                <option value="Tapan Mukherjee#S">Tapan Mukherjee#S</option>
                                <option value="Snehal Narendra Mehta">Snehal Narendra Mehta</option>
                                <option value="Himanshu Kumar">Himanshu Kumar</option>
                                <option value="Pradeep Gond">Pradeep Gond</option>
                                <option value="Gagan Prakash">Gagan Prakash</option>
                                <option value="Pradeep Kumar Upadhyay">Pradeep Kumar Upadhyay</option>
                                <option value="Kuldeep Kumar">Kuldeep Kumar</option>
                                <option value="Aditya Kumar">Aditya Kumar</option>
                                <option value="Sujit Gautam">Sujit Gautam</option>
                                <option value="Mukesh Kumar">Mukesh Kumar</option>
                                <option value="Brijesh Kumar Singh">Brijesh Kumar Singh</option>
                                <option value="Amitesh Shukla">Amitesh Shukla</option>
                                <option value="Rakesh Kumar Pandey">Rakesh Kumar Pandey</option>
                                <option value="Jayendra Singh">Jayendra Singh</option>
                                <option value="Bheemsain Swami">Bheemsain Swami</option>
                                <option value="Sandeep Luthra">Sandeep Luthra</option>
                                <option value="Anshuraj Panday">Anshuraj Panday</option>
                                <option value="Pawan Kumar">Pawan Kumar</option>
                                <option value="Pawan Kumar B">Pawan Kumar B</option>

                            </select>
                            <span className="mrdc-select-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </span>
                        </div>
                        {errors.assignToMROrASM && <span className="mrdc-error-msg">{errors.assignToMROrASM}</span>}
                    </div>

                    {/* Remarks */}
                    <div className="mrdc-field mrdc-full-width">
                        <label className="mrdc-label">
                            Remarks {!isReadOnly && <span className="mrdc-required">*</span>}
                        </label>
                        <textarea
                            className={`mrdc-textarea ${errors.remarks ? "mrdc-error-input" : ""}`}
                            placeholder="Enter remarks..."
                            rows={3}
                            value={form.remarks}
                            onChange={(e) => handleChange("remarks", e.target.value)}
                            disabled={isReadOnly}
                        />
                        {errors.remarks && <span className="mrdc-error-msg">{errors.remarks}</span>}
                    </div>

                    {/* Assign to TP Date */}
                    <div className="mrdc-field">
                        <label className="mrdc-label">
                            Assign to TP Date {!isReadOnly && <span className="mrdc-required">*</span>}
                        </label>
                        <input
                            type="date"
                            className={`mrdc-input ${errors.assignToTPDate ? "mrdc-error-input" : ""}`}
                            value={form.assignToTPDate}
                            onChange={(e) => handleChange("assignToTPDate", e.target.value)}
                            disabled={isReadOnly}
                        />
                        {errors.assignToTPDate && <span className="mrdc-error-msg">{errors.assignToTPDate}</span>}
                    </div>

                    {/* Party Type */}
                    <div className="mrdc-field">
                        <label className="mrdc-label">
                            Party Type {!isReadOnly && <span className="mrdc-required">*</span>}
                        </label>
                        <div className="mrdc-select-wrapper">
                            <select
                                className={`mrdc-select ${errors.partyType ? "mrdc-error-input" : ""}`}
                                value={form.partyType}
                                onChange={(e) => handleChange("partyType", e.target.value)}
                                disabled={isReadOnly}
                            >
                                <option value="" disabled>Select party type</option>
                                <option value="Doctor">Doctor</option>
                                <option value="Retailer">Retailer</option>
                                <option value="Stockist">Stockist</option>
                            </select>
                            <span className="mrdc-select-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </span>
                        </div>
                        {errors.partyType && <span className="mrdc-error-msg">{errors.partyType}</span>}
                    </div>

                    {/* Verified Area */}
                    <div className="mrdc-field">
                        <label className="mrdc-label">
                            Verified Area {!isReadOnly && <span className="mrdc-required">*</span>}
                        </label>
                        <div className="mrdc-select-wrapper">
                            <select
                                className={`mrdc-select ${errors.verifiedArea ? "mrdc-error-input" : ""}`}
                                value={form.verifiedArea}
                                onChange={(e) => handleChange("verifiedArea", e.target.value)}
                                disabled={isReadOnly}
                            >
                                <option value="" disabled>Select area</option>
                                <option value="Area 1">Area 1</option>
                                <option value="Area 2">Area 2</option>
                                <option value="Area 3">Area 3</option>
                                <option value="Area 4">Area 4</option>
                                <option value="Area 5">Area 5</option>
                                <option value="Area 6">Area 6</option>
                                <option value="Area 7">Area 7</option>
                                <option value="Area 8">Area 8</option>
                                <option value="Area 9">Area 9</option>
                                <option value="Area 10">Area 10</option>
                                <option value="Area 11">Area 11</option>
                                <option value="Area 12">Area 12</option>
                                <option value="Area 13">Area 13</option>
                                <option value="Area 14">Area 14</option>
                            </select>
                            <span className="mrdc-select-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </span>
                        </div>
                        {errors.verifiedArea && <span className="mrdc-error-msg">{errors.verifiedArea}</span>}
                    </div>

                    {/* Action Buttons */}
                    <div className="mrdc-actions mrdc-full-width">
                        <button className="mrdc-btn-cancel" onClick={handleCancel}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Cancel
                        </button>
                        <button
                            className="mrdc-btn-submit"
                            onClick={handleSubmit}
                            disabled={!allFilled || isReadOnly}
                            aria-disabled={!allFilled || isReadOnly}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            {submitted ? "Submitted" : "Submit"}
                        </button>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="mrdc-footer">
                    <div className="mrdc-footer-col">
                        <span className="mrdc-footer-label">Planned</span>
                        <span className="mrdc-footer-value">{planned}</span>
                    </div>

                    <div className="mrdc-footer-divider" />

                    <div className="mrdc-footer-col">
                        <span className="mrdc-footer-label">Actual</span>
                        <span className="mrdc-footer-value">{actual}</span>
                    </div>

                    <div className="mrdc-footer-divider" />

                    <div className="mrdc-footer-col">
                        <span className="mrdc-footer-label mrdc-footer-label--delay">Time Delay</span>
                        <span className="mrdc-footer-value mrdc-footer-value--delay">{timeDelay}</span>
                    </div>
                </div>
            </div>

            <style>{`
        /* ── Overlay ── */
        .mrdc-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.48);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          box-sizing: border-box;
        }

        /* ── Modal shell ── */
        .mrdc-modal {
          background: #ffffff;
          border-radius: 18px;
          width: 100%;
          max-width: 780px;
          max-height: 92vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(0,0,0,0.06);
        }

        /* ── Header ── */
        .mrdc-header {
          background: #4A3FC4;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 18px 18px 0 0;
          flex-shrink: 0;
        }

        .mrdc-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mrdc-header-icon {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 10px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          flex-shrink: 0;
        }

        .mrdc-header-title {
          color: #ffffff;
          font-size: 15.5px;
          font-weight: 600;
          margin: 0;
          line-height: 1.3;
        }

        .mrdc-header-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          margin: 2px 0 0 0;
        }

        .mrdc-close-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ffffff;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .mrdc-close-btn:hover { background: rgba(255, 255, 255, 0.27); }

        /* ── Body ── */
        .mrdc-body {
          padding: 18px 22px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px 20px;
          overflow-y: auto;
          flex: 1;
          align-content: start;
        }

        /* ── Read-only banner ── */
        .mrdc-readonly-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0f4ff;
          border: 1px solid #d0d8f8;
          border-radius: 9px;
          padding: 9px 13px;
          font-size: 12.5px;
          color: #3b3591;
          font-weight: 500;
        }

        /* ── Fields ── */
        .mrdc-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .mrdc-label {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .mrdc-required { color: #e24b4a; }

        .mrdc-select-wrapper { position: relative; }

        .mrdc-select,
        .mrdc-input {
          width: 100%;
          padding: 9px 36px 9px 12px;
          border: 1px solid #e2e2ea;
          border-radius: 9px;
          background: #f7f7fb;
          color: #1a1a2e;
          font-size: 13.5px;
          appearance: none;
          cursor: pointer;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          font-family: inherit;
        }

        .mrdc-input { padding-right: 12px; }

        .mrdc-select:focus,
        .mrdc-input:focus {
          border-color: #4A3FC4;
          box-shadow: 0 0 0 3px rgba(74, 63, 196, 0.13);
          background: #ffffff;
        }

        .mrdc-select:disabled,
        .mrdc-input:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #f2f2f6;
        }

        .mrdc-select-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #888;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .mrdc-textarea {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #e2e2ea;
          border-radius: 9px;
          background: #f7f7fb;
          color: #1a1a2e;
          font-size: 13.5px;
          resize: vertical;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          min-height: 78px;
        }

        .mrdc-textarea:focus {
          border-color: #4A3FC4;
          box-shadow: 0 0 0 3px rgba(74, 63, 196, 0.13);
          background: #ffffff;
        }

        .mrdc-textarea:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #f2f2f6;
        }

        .mrdc-error-input { border-color: #e24b4a !important; }
        .mrdc-error-msg { font-size: 11.5px; color: #e24b4a; margin-top: 2px; }

        /* ── Buttons ── */
        .mrdc-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 4px;
        }

        .mrdc-btn-cancel {
          padding: 10px;
          border: 1px solid #e2e2ea;
          border-radius: 9px;
          background: #ffffff;
          color: #1a1a2e;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: background 0.15s, border-color 0.15s;
        }
        .mrdc-btn-cancel:hover { background: #f7f7fb; border-color: #c5c5d0; }

        .mrdc-btn-submit {
          padding: 10px;
          border: none;
          border-radius: 9px;
          background: #4A3FC4;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: background 0.15s, opacity 0.2s, transform 0.1s;
        }
        .mrdc-btn-submit:hover:not(:disabled) { background: #3b31a8; }
        .mrdc-btn-submit:active:not(:disabled) { transform: scale(0.98); }
        .mrdc-btn-submit:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        /* ── Footer — grid layout prevents overlap ── */
        .mrdc-footer {
          border-top: 1px solid #ebebf0;
          background: #f7f7fb;
          padding: 11px 22px;
          display: grid;
          grid-template-columns: 1fr auto 1fr auto 1fr;
          align-items: center;
          border-radius: 0 0 18px 18px;
          flex-shrink: 0;
        }

        .mrdc-footer-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .mrdc-footer-label {
          font-size: 10px;
          font-weight: 700;
          color: #999;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .mrdc-footer-label--delay { color: #e24b4a; }

        .mrdc-footer-value {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a2e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mrdc-footer-value--delay { color: #e24b4a; }

        .mrdc-footer-divider {
          width: 1px;
          height: 28px;
          background: #e2e2ea;
          margin: 0 14px;
          flex-shrink: 0;
        }

        /* ── Full-width span in 2-col grid ── */
        .mrdc-full-width {
          grid-column: 1 / -1;
        }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .mrdc-body {
            grid-template-columns: 1fr;
            padding: 16px;
            gap: 12px;
          }
          .mrdc-full-width {
            grid-column: 1;
          }
        }

        @media (max-width: 480px) {
          .mrdc-overlay {
            padding: 0;
            align-items: flex-end;
          }
          .mrdc-modal {
            max-height: 95vh;
            border-radius: 18px 18px 0 0;
            max-width: 100%;
          }
          .mrdc-header { border-radius: 18px 18px 0 0; padding: 16px; }
          .mrdc-footer { padding: 10px 14px; border-radius: 0; }
          .mrdc-footer-divider { margin: 0 10px; }
          .mrdc-footer-value { font-size: 11px; }
          .mrdc-footer-label { font-size: 9px; }
        }

        @media (max-width: 360px) {
          .mrdc-footer-divider { margin: 0 6px; }
          .mrdc-footer-value { font-size: 10px; }
        }
      `}</style>
        </div>
    );
}
