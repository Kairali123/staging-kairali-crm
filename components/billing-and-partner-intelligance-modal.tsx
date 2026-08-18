'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Part3Data {
  partnerCompany: string; partnerId: string; firstBookingRef: string; dateTriggered: string;
  takingCare: string; referralCode: string; category: string; taProfileLink: string;
  legalCompanyName: string; gstNo: string; panNo: string; aadharNo: string; vatTaxId: string;
  bizRegNo: string; yearsExperience: string; agencyAddress: string; taxCity: string; state: string;
  pincode: string; taxCountry: string; countryCode: string; officeContact: string;
  accountHolder: string; bankName: string; accountNo: string; ifscSwift: string;
  branchCity: string; accountType: string; intermediaryBank: string;
  commissionType: string; settlementModel: string; billingCycle: string;
  paymentMethod: string[]; billingCurrency: string; billingNotes: string;
  billingCollectedBy: string; billingCollectedDate: string;
  gstCertLink: string; panCardLink: string; cancelledChequeLink: string;
  agreementCopyLink: string; logoLink: string; otherDocLink: string;
  clientTypes: string[]; nationalities: string[]; otherNationalities: string;
  avgGroupSize: string; avgStay: string; leadTime: string; spendPerPerson: string;
  clientReqs: string[]; languagesSpoken: string; clientDistinctive: string;
  programs: string[]; programGaps: string; supportMaterials: string[]; translationLang: string;
  marketProfile: string; segmentProfile: string; aiLeadWith: string; aiAvoid: string;
  aiRespondedWell: string; bestChannel: string; responseSpeed: string; commStyle: string;
  personalNotes: string; remarks: string;
}

interface Part3ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Part3Data) => void;
  partnerName?: string;
  partnerId?: string;
  initialData?: Partial<Part3Data>;
  lockedFields?: boolean | Set<string>;
  showSubmitButton?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Trigger & Identity', hint: 'First booking — link & identity' },
  { num: 2, label: 'Billing Details', hint: 'Company, bank & commission' },
  { num: 3, label: 'Partner Intel', hint: 'Clients, programs & support' },
  { num: 4, label: 'AI Engagement', hint: 'Messaging & comms prefs' },
];

const CATEGORY_OPTS = ['Tour Operator', 'Travel Agent', 'DMC', 'Wellness Specialist', 'Corporate Travel', 'OTA', 'Other'];
const COMM_TYPE_OPTS = ['Net Rate', 'Gross Commission', 'FIT', 'GIT', 'Markup', 'Mixed'];
const SETTLEMENT_OPTS = ['We pay them', 'They invoice us'];
const BILLING_CYCLE_OPTS = ['Per booking', 'Monthly consolidation', 'Quarterly', 'Other'];
const PAYMENT_METHOD_OPTS = ['Bank Transfer / NEFT', 'SWIFT (International)', 'UPI', 'Cheque', 'Payment gateway'];
const CURRENCY_OPTS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'Other'];
const CLIENT_TYPES = ['Solo FIT guests', 'Couples', 'Families', 'Senior / geriatric', 'Corporate executives', 'MICE groups', 'Medical tourists', 'Long-stay retreat (14+ nights)', 'Spiritual seekers', 'First-time Ayurveda guests'];
const NATIONALITY_OPTS = ['German / DACH', 'UK & Ireland', 'France', 'Benelux', 'Scandinavia', 'USA & Canada', 'Australia & NZ', 'Middle East', 'Russia / E. Europe', 'Israel', 'Japan / S. Korea', 'India (domestic)'];
const CLIENT_REQ_OPTS = ['Vegan / plant-based', 'Vegetarian', 'Kosher', 'Halal', 'Gluten-free', 'Gender-separated treatments', 'Private doctor consultations', 'Language support', 'Accessibility needs', 'Multi-destination itinerary'];
const PROGRAM_OPTS = ['Panchakarma & Classical Ayurveda', 'Doctor-Supervised Medical', 'Wellness / Detox / Rejuvenation', 'Yoga & Meditation Retreats', 'Spa & Leisure Stays', 'Monsoon / Seasonal Specials', 'Corporate / Executive Wellness', 'Honeymoon & Romance (Villa Raag)', 'Family Packages', 'Long-stay Programs 21+ days'];
const SUPPORT_MAT_OPTS = ['Digital brochure', 'Program fact sheets', 'Rate card / tariff', 'High-res images', 'Video / reels', 'Doctor bios', 'Guest testimonials', 'FAM trip / site visit', 'Co-branded material', 'Translated content'];
const MARKET_PROFILE_OPTS = ['German/DACH', 'UK/Ireland', 'USA/Canada', 'Middle East', 'Scandinavia', 'Israel', 'Domestic India', 'Other'];
const SEGMENT_OPTS = ['Ayurveda specialist', 'General leisure', 'MICE/corporate', 'Medical/long-stay', 'Luxury travel', 'Budget conscious'];
const CHANNEL_OPTS = ['Email', 'WhatsApp', 'Phone / Video call', 'All equally'];
const RESP_SPEED_OPTS = ['Replies same day', '1–3 days', 'Slow / inconsistent', 'Unknown yet'];
const COMM_STYLE_OPTS = ['Formal', 'Conversational', 'Brief & direct', 'Detail-oriented'];

// const STAFF_OPTIONS = [
//   'Abhilash K Ramesh',
//   'Anupam Molpha',
//   'Anoop Vijayaraj',
//   'Astha Kumari',
//   'Harpal Singh',
//   'Sadik Rehman',
//   'Sunaj Sahoo',
// ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const STAFF_OPTIONS = [
  'Abhilash Sir',
  'Abishek Sir',
  'Ajay',
  'Ambuj',
  'Anuj Kumar Singh',
  'Arham',
  'Arul',
  'Balakrishna',
  'Dr Gokul',
  'Gaurav PPC',
  'Hariharan',
  'Himanshu',
  'KAC Order Taker',
  'Kavita',
  'Krithika',
  'Mahesh',
  'Manonmani',
  'Nagendran',
  'Pawan Kamra',
  'Puneet Endlay',
  'Pushpanshu Kumar',
  'Rajendra Kumar',
  'Rajesh Arora',
  'RAVINDRAN B',
  'Ritu Chawla',
  'Sadik Rehman',
  'SAILESH KUMAR VERMA',
  'Sakthivel S',
  'Sanjay Yadav',
  'SATISH CHANDRA GANGWAR',
  'Sini Nair',
  'Smita Ghai',
  'Sony Cherian',
  'Sunaj Sahoo',
  'S K THAKUR',
  'Thangarasu',
  'Vikash',
  'VINAYAK PANDURANGA AMBIG',
  'Yuvaraj',
  'Rima Sarkar',
  'Shristi Sharma',
  'Sandeep Uniyal',
  'Mamta Kandhari',
  'Samsher Alam',
  'Gaurav Saraswat',
  'Vikesh Kumar',
  'Ravinder Kaur',
  'Bhawna Pokhriya',
  'Priyanka Yadav',
  'Bhuvaneshwari',
  'Vigneshkumar',
  'Krithika(Direct Task Score)',
  'Hariharan(Direct Task Score)',
  'Suriya Prakash',
  'Abhinav Sood',
  'Mathi Sekar',
  'Gita Mam',
  'KV Ramesh Sir',
  'Suresh Kumar c',
  'Karan Pahuja',
  'Yogendra',
  'Ajay Bobby Mathew',
  'Dr.Shari K',
  'Anil Faridabad Centre',
  'Gopesh',
  'Biju Rajakumaran',
  'Saba Khanam',
  'Dr. Jinky Krishnan',
  'Shibu Varghees',
  'Sajeevan K',
  'kiran Raj',
  'Manoj Kumar',
  'Biju.R',
  'Prakasan M',
  'Janardhanan M',
  'Gopi S',
  'Renuka K',
  'Sindhu V A',
  'Usha Kumari R',
  'Anilkumar C B',
  'Abilash A',
  'Sujith S',
  'Sivadas S',
  'Rohit Bafana',
  'Dr Deepu John',
  'Hemant Gaur',
  'Abid Hussain',
  'Sheeba Dieudonne',
  'Muthukumara Raja',
  'N. Santhosh',
  'Jobin Abraham',
  'Manikandan K',
  'Girish Chaturvedi',
  'Ashok Sharma',
  'Sreehari R',
  'Sameer Anand',
  'Vijay Kumar',
  'Neelam',
  'Umesh Kumar',
  'Yukti Arora',
  'Deepak Arya',
  'Silpa Sasi',
  'Vidisha Bahukhandi',
  'Dhaneshwar Chaturvedi',
  'Varun Chauhan',
  'Anju S',
  'Ajitha.C',
  'Devadas',
  'Manju S',
  'Remya M',
  'Sheeja R',
  'Sudhakaran T',
  'Santha C',
  'Deepthish K R',
  'Kaladharan',
  'Radha V',
  'Thangamani',
  'Kumaran.K',
  'Pankajam',
  'Renuka C',
  'Sanju U',
  'Harpal Singh',
  'Satyam Kumar',
  'KEERTHIKA DEVI',
  'Sanoj M',
  'Dr. Rahul R',
  'Rahul Srivastava',
  'Krishnapriya K',
  'Lineesh N',
  'Mahesh K',
  'Kiran Prasad',
  'Kavita Mahawar',
  'Sonu',
  'Sandeep Kumar',
  'Mona Walia',
  'Tapswani Nandan Sharma',
  'Suneel Kumar',
  'Jayan P C',
  'UDHAYANANDHINI A',
  'Kavita (PC)',
  'Chandraprakash Parashar',
  'Karan Pahuja (PC)',
  'Visakh R',
  'Deepratan Bande',
  'Arun',
  'Kamal Sharma',
  'Munisha',
  'AJAY SINGH RAWAT',
  'Poonam',
  'Priyanka Murugeshan',
  'Shristi',
  'Neelam Ishrani',
  'Dharmender',
  'Meena Mathur',
  'Bajrang',
  'Ajay Bobby',
  'Dr. Shari K',
  'Dr Anjana Krishnardra K',
  'Rajesh Kumar',
  'Raj Kumar',
  'Masaba',
  'Naveen',
  'Dr Aiswarya N K Nair',
  'Roshni A John',
  'Nilu',
  'Dr Sachin',
  'Ratheesh K R',
  'Sivasubramaniyam',
  'Saravanakumar',
  'Dhamodharan',
  'Dinesh Kumar',
  'Vijay Kumar V',
  'Jayan',
  'Birender Singh Chauhan',
  'Rahul Kumar Gupta',
  'Kartik Jain',
  'Anjana Sharma',
  'Priya Sharma - AI',
  'Rahul Raj P R',
  'Avnish Kumar Dubey',
  'Ashikha Raj',
  'Santhosh',
  'Arvind Kumar Thakur',
  'Tikam Chand Ashrani',
  'Zaki Ahmed',
  'Sharat',
  'Astha Kumari',
  'Himanshu Kumar',
  'Anupam Singh Molpha',
  'Bonny Thomas',
  'Sajeev K',
  'Shyamdas S',
  'Pradeep Gond',
  'Deepu Sahani',
  'Dr. Akhila Oommen',
  'Vishnudas S',
  'Chithra C',
  'Ravi Shankar Govindu',
  'Kamal',
  'Karthik Kumar',
  'Divya Sharma',
  'Aakash',
  'Vishnu Prasad S',
  'Sunil Gour',
  'Prema Dhuri',
  'Surjeet Kumar',
  'Arundas R',
  'Sevit Dhingra',
  'Shona George',
  'Bharathi',
  'Vinod M',
  'Harish Mishra',
  'Rakesh RajaGopal',
  'ANAGHA S',
  'Rohan Babbar',
  'Vignesh S',
  'Vishnu Prasad N',
  'Achanya B',
  'Nishant',
  'Harpreet Kaur',
  'Amitesh Jha',
  'Abhijeet Chandra',
  'Shailesh Kumar',
  'Sanyam Jain',
  'Rajesh M',
  'Vaishnav A',
  'Levil Kumar',
  'Kiran Chauhan',
  'Drisya M',
  'Shoukath Ali Moosa',
  'Rahul K S',
  'Trusha Lodhi',
  'Geetha G',
  'Sowmya S',
  'Silpa V',
  'Nisha Tripathi',
  'Prerna Pathak',
  'Sudhi R',
  'Devika S',
  'Anurudh K M',
  'Nagaraja Matadh',
  'R SIVADAS',
  'Sivakumar N',
  'Subith S',
  'Balavignesh S',
  'Suryaprabha'
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const COUNTRY_DATA: Record<string, { code: string; states: Record<string, string[]> }> = {
  'India': {
    code: '+91',
    states: {
      'Kerala': ['Palakkad', 'Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur', 'Kollam'],
      'Delhi': ['New Delhi', 'Old Delhi', 'Dwarka'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane'],
      'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi'],
      'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
      'Goa': ['Panaji', 'Margao', 'Vasco da Gama'],
      'Rajasthan': ['Jaipur', 'Udaipur', 'Jodhpur', 'Pushkar'],
      'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
      'Telangana': ['Hyderabad', 'Warangal'],
      'West Bengal': ['Kolkata', 'Darjeeling', 'Siliguri'],
    }
  },
  'United Kingdom': {
    code: '+44',
    states: {
      'England': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Oxford'],
      'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen'],
      'Wales': ['Cardiff', 'Swansea'],
    }
  },
  'United States': {
    code: '+1',
    states: {
      'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
      'New York': ['New York City', 'Buffalo', 'Albany', 'Rochester'],
      'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio'],
      'Florida': ['Miami', 'Orlando', 'Tampa'],
    }
  },
  'Germany': {
    code: '+49',
    states: {
      'Bavaria': ['Munich', 'Nuremberg', 'Augsburg'],
      'Berlin': ['Berlin'],
      'Hamburg': ['Hamburg'],
      'Hesse': ['Frankfurt'],
    }
  },
  'United Arab Emirates': {
    code: '+971',
    states: {
      'Dubai': ['Dubai City'],
      'Abu Dhabi': ['Abu Dhabi City', 'Al Ain'],
      'Sharjah': ['Sharjah City'],
    }
  },
  'Australia': {
    code: '+61',
    states: {
      'New South Wales': ['Sydney', 'Newcastle'],
      'Victoria': ['Melbourne', 'Geelong'],
      'Queensland': ['Brisbane', 'Gold Coast'],
    }
  },
  'Canada': {
    code: '+1',
    states: {
      'Ontario': ['Toronto', 'Ottawa', 'Hamilton'],
      'British Columbia': ['Vancouver', 'Victoria'],
      'Quebec': ['Montreal', 'Quebec City'],
    }
  }
};



const EMPTY: Part3Data = {
  partnerCompany: '', partnerId: '', firstBookingRef: '', dateTriggered: '', takingCare: '', referralCode: '', category: '', taProfileLink: '',
  legalCompanyName: '', gstNo: '', panNo: '', aadharNo: '', vatTaxId: '', bizRegNo: '', yearsExperience: '',
  agencyAddress: '', taxCity: '', state: '', pincode: '', taxCountry: '', countryCode: '', officeContact: '',
  accountHolder: '', bankName: '', accountNo: '', ifscSwift: '', branchCity: '', accountType: '', intermediaryBank: '',
  commissionType: '', settlementModel: '', billingCycle: '', paymentMethod: [], billingCurrency: '', billingNotes: '',
  billingCollectedBy: '', billingCollectedDate: '',
  gstCertLink: '', panCardLink: '', cancelledChequeLink: '', agreementCopyLink: '', logoLink: '', otherDocLink: '',
  clientTypes: [], nationalities: [], otherNationalities: '', avgGroupSize: '', avgStay: '', leadTime: '', spendPerPerson: '',
  clientReqs: [], languagesSpoken: '', clientDistinctive: '',
  programs: [], programGaps: '', supportMaterials: [], translationLang: '',
  marketProfile: '', segmentProfile: '', aiLeadWith: '', aiAvoid: '', aiRespondedWell: '',
  bestChannel: '', responseSpeed: '', commStyle: '', personalNotes: '', remarks: '',
};

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  gold: '#c9a84c', goldTint: 'rgba(201,168,76,0.45)', goldFocus: 'rgba(201,168,76,0.12)',
  goldLabel: '#7b5d1b', pageBg: '#f5f3ee', cardBg: '#ffffff',
  border: 'rgba(30,69,48,0.18)', tx1: '#0d1a10', tx3: '#4d6356', tx4: '#7a9284',
  err: '#b52a1c', errBg: 'rgba(181,42,28,0.08)', hdrBg: '#1B3A2B',
  indigo: '#6366f1', indigoDark: '#4338ca',
};

// ─── Responsive CSS ───────────────────────────────────────────────────────────

const CSS = `
@keyframes kccFade  { from{opacity:0}to{opacity:1} }
@keyframes kccSlide { from{opacity:0;transform:translate(-50%,calc(-50% + 20px)) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
@keyframes kccSpin  { to{transform:rotate(360deg)} }

.kcc3-modal  { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:84vw;max-width:1020px;height:84vh;z-index:1000;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.45); }
.kcc3-hdr    { padding:0 28px; }
.kcc3-body   { padding:22px 26px; }
.kcc3-footer { padding:14px 28px; }
.kcc3-g2     { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
.kcc3-card   { background:#fff;border-radius:16px;padding:24px 26px 20px;border:1px solid rgba(30,69,48,0.09);position:relative;overflow:hidden;margin-bottom:16px; }
.kcc3-sb-hint{ display:block; }
.kcc3-tag    { display:inline-block; }

@media (max-width:768px){
  .kcc3-modal  { width:96vw !important;height:92vh !important; }
  .kcc3-hdr    { padding:0 16px !important; }
  .kcc3-body   { padding:16px 14px !important; }
  .kcc3-footer { padding:10px 14px !important; }
  .kcc3-g2     { grid-template-columns:1fr !important; }
  .kcc3-card   { padding:16px 14px 14px !important; }
  .kcc3-sb-hint{ display:none !important; }
  .kcc3-tag    { display:none !important; }
}
@media (max-width:480px){
  .kcc3-modal  { width:100vw !important;height:100vh !important;border-radius:0 !important; }
}
`;

// ─── Primitive Components ─────────────────────────────────────────────────────

function SL({ children, required, indigo }: { children: React.ReactNode; required?: boolean; indigo?: boolean }) {
  return (
    <span style={{
      display: 'block', fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase',
      fontWeight: 700, color: indigo ? T.indigoDark : T.goldLabel, marginBottom: '10px'
    }}>
      {children}{required && <span style={{ color: T.err, marginLeft: '3px', fontSize: '9px' }}>✱</span>}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 0, margin: '18px 0', borderTop: '1px dashed rgba(168,168,168,0.6)' }} />;
}

function TI({ type = 'text', id, value, onChange, placeholder, hasError, label, required, url, readOnly, step }: {
  type?: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hasError?: boolean; label?: string; required?: boolean; url?: boolean; readOnly?: boolean; step?: string;
}) {
  const [f, setF] = useState(false);
  return (
    <div>
      {label && <SL required={required}>{label}</SL>}
      <div style={{ position: 'relative' }}>
        <input type={url ? 'url' : type} id={id} value={value} onChange={e => onChange(e.target.value)}
          placeholder={readOnly ? '—' : (placeholder || 'Fill details here')}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          readOnly={readOnly}
          step={step}
          style={{
            display: 'block', width: '100%', padding: readOnly ? '0 40px 0 14px' : '0 14px', height: '48px',
            border: `1.5px solid ${hasError ? T.err : readOnly ? 'rgba(30,69,48,0.12)' : f ? T.gold : T.border}`, borderRadius: '12px',
            fontFamily: 'inherit', fontSize: '13.5px', color: readOnly ? T.tx4 : T.tx1, background: readOnly ? '#f0f0ee' : '#fff', outline: 'none',
            boxShadow: hasError ? `0 0 0 3px ${T.errBg}` : f ? `0 0 0 3px ${T.goldFocus}` : 'none',
            cursor: readOnly ? 'not-allowed' : 'text',
            transition: 'border-color .2s,box-shadow .2s'
          }} />
        {readOnly && (
          <div style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )}
      </div>
      {hasError && <p style={{ fontSize: '11px', color: T.err, marginTop: '5px', fontWeight: 500 }}>⚠ Required</p>}
    </div>
  );
}

function SelectInput({ id, value, onChange, options, placeholder, hasError, label, required, readOnly }: {
  id: string; value: string; onChange: (v: string) => void; options: string[];
  placeholder?: string; hasError?: boolean; label?: string; required?: boolean; readOnly?: boolean;
}) {
  const [f, setF] = useState(false);
  return (
    <div>
      {label && <SL required={required}>{label}</SL>}
      <div style={{ position: 'relative' }}>
        <select id={id} value={value}
          onChange={e => !readOnly && onChange(e.target.value)}
          disabled={readOnly}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{
            display: 'block', width: '100%', padding: '0 36px 0 14px', height: '48px', appearance: 'none',
            WebkitAppearance: 'none',
            border: `1.5px solid ${hasError ? T.err : readOnly ? 'rgba(30,69,48,0.12)' : f ? T.gold : T.border}`,
            borderRadius: '12px', fontFamily: 'inherit', fontSize: '13.5px',
            color: readOnly ? T.tx4 : (value ? T.tx1 : T.tx4),
            background: readOnly ? '#f0f0ee' : '#fff', outline: 'none', cursor: readOnly ? 'not-allowed' : 'pointer',
            boxShadow: hasError ? `0 0 0 3px ${T.errBg}` : f ? `0 0 0 3px ${T.goldFocus}` : 'none',
            transition: 'border-color .2s,box-shadow .2s'
          }}>
          <option value="" disabled>{placeholder || 'Select…'}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: readOnly ? 0.3 : 0.55 }}>
          {readOnly
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          }
        </div>
      </div>
      {hasError && <p style={{ fontSize: '11px', color: T.err, marginTop: '5px', fontWeight: 500 }}>⚠ Required</p>}
    </div>
  );
}


function TA({ id, value, onChange, label, minH, indigo, readOnly, required, hasError }: {
  id: string; value: string; onChange: (v: string) => void; label?: string; minH?: string; indigo?: boolean; readOnly?: boolean;
  required?: boolean; hasError?: boolean;
}) {
  const [f, setF] = useState(false);
  return (
    <div>
      {label && <SL indigo={indigo} required={required}>{label}</SL>}
      <div style={{ position: 'relative' }}>
        <textarea id={id} value={value} onChange={e => onChange(e.target.value)}
          placeholder={readOnly ? '—' : "Fill details here"}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          readOnly={readOnly}
          style={{
            display: 'block', width: '100%', padding: readOnly ? '12px 40px 12px 14px' : '12px 14px', minHeight: minH || '80px',
            border: `1.5px solid ${hasError ? T.err : readOnly ? 'rgba(30,69,48,0.12)' : f ? T.gold : T.border}`, borderRadius: '12px', fontFamily: 'inherit',
            fontSize: '13px', color: readOnly ? T.tx4 : T.tx1, background: readOnly ? '#f0f0ee' : '#fff', outline: 'none', resize: readOnly ? 'none' : 'vertical', lineHeight: 1.6,
            boxShadow: hasError ? `0 0 0 3px ${T.errBg}` : f ? `0 0 0 3px ${T.goldFocus}` : 'none', cursor: readOnly ? 'not-allowed' : 'text', transition: 'border-color .2s,box-shadow .2s'
          }} />
        {readOnly && (
          <div style={{ position: 'absolute', right: '13px', top: '14px', opacity: 0.5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )}
      </div>
      {hasError && <p style={{ fontSize: '11px', color: T.err, marginTop: '5px', fontWeight: 500 }}>⚠ Required</p>}
    </div>
  );
}

function Pill({ label, checked, onClick, disabled }: { label: string; checked: boolean; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  if (disabled) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '9px 16px',
        background: checked ? '#f0f0ee' : '#fafafa',
        border: `1.5px solid ${checked ? 'rgba(30,69,48,0.2)' : 'rgba(30,69,48,0.08)'}`, borderRadius: '11px',
        opacity: checked ? 1 : 0.6, cursor: 'not-allowed'
      }}>
        <span style={{
          width: '17px', height: '17px', minWidth: '17px', borderRadius: '4px',
          border: `2px solid ${checked ? T.tx4 : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: '#fff', background: checked ? T.tx4 : 'transparent', flexShrink: 0
        }}>{checked && '✔'}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: T.tx4, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '9px 16px',
        background: hov && !checked ? '#fefaef' : '#fff',
        border: `1.5px solid ${checked || hov ? T.gold : T.goldTint}`, borderRadius: '11px',
        cursor: 'pointer', userSelect: 'none' as const, transition: 'all .18s ease',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: hov ? '0 3px 10px rgba(201,168,76,0.18)' : 'none'
      }}>
      <span style={{
        width: '17px', height: '17px', minWidth: '17px', borderRadius: '4px',
        border: `2px solid ${T.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700, color: '#fff', background: checked ? T.gold : 'transparent',
        transition: 'all .18s', flexShrink: 0
      }}>{checked && '✔'}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: T.tx1, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function IndigoPill({ label, checked, onClick, disabled }: { label: string; checked: boolean; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  if (disabled) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '9px 16px',
        background: checked ? 'rgba(99,102,241,0.04)' : '#fafafa',
        border: `1.5px solid ${checked ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)'}`,
        borderRadius: '11px', opacity: checked ? 1 : 0.6, cursor: 'not-allowed'
      }}>
        <span style={{
          width: '17px', height: '17px', minWidth: '17px', borderRadius: '4px',
          border: `2px solid ${checked ? T.indigo : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: '#fff', background: checked ? T.indigo : 'transparent', flexShrink: 0
        }}>{checked && '✔'}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: T.tx4, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '9px 16px',
        background: checked ? 'rgba(99,102,241,0.08)' : hov ? 'rgba(99,102,241,0.04)' : '#fff',
        border: `1.5px solid ${checked ? T.indigo : hov ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)'}`,
        borderRadius: '11px', cursor: 'pointer', userSelect: 'none' as const, transition: 'all .18s',
        transform: hov ? 'translateY(-1px)' : 'none'
      }}>
      <span style={{
        width: '17px', height: '17px', minWidth: '17px', borderRadius: '4px',
        border: `2px solid ${T.indigo}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700, color: '#fff', background: checked ? T.indigo : 'transparent',
        transition: 'all .18s', flexShrink: 0
      }}>{checked && '✔'}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: checked ? T.indigoDark : T.tx1, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>{children}</div>;
}

function ErrHint({ msg }: { msg: string }) {
  return <p style={{ fontSize: '11px', color: T.err, marginTop: '5px', fontWeight: 500 }}>⚠ {msg}</p>;
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(30,69,48,0.06)', borderRadius: '12px', padding: '5px', gap: '4px', marginBottom: '22px' }}>
      {STEPS.map(s => {
        const done = s.num < current, active = s.num === current;
        return (
          <div key={s.num} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
            borderRadius: '9px', overflow: 'hidden', minWidth: 0, transition: 'all .25s',
            background: active ? '#fff' : done ? 'rgba(82,183,136,0.1)' : 'transparent',
            boxShadow: active ? '0 2px 10px rgba(7,22,14,0.10)' : 'none',
            border: active ? '1.5px solid rgba(201,168,76,0.25)' : done ? '1.5px solid rgba(82,183,136,0.25)' : '1.5px solid transparent'
          }}>
            <div style={{
              width: '24px', height: '24px', minWidth: '24px', borderRadius: '7px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800,
              background: active ? T.gold : done ? 'rgba(45,138,78,0.18)' : 'rgba(30,69,48,0.1)',
              color: active ? '#07160e' : done ? '#2d8a4e' : T.tx4
            }}>{done ? '✓' : s.num}</div>
            <div className="kcc3-sb-hint" style={{ overflow: 'hidden', minWidth: 0 }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: active ? '#1e4530' : done ? '#2d8a4e' : T.tx4
              }}>{s.label}</p>
              {active && <p style={{ fontSize: '10px', color: T.tx4, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.hint}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Form Cards ───────────────────────────────────────────────────────────────

function FormCard({ children, indigo }: { children: React.ReactNode; indigo?: boolean }) {
  return (
    <div className="kcc3-card" style={{
      background: indigo ? 'linear-gradient(135deg,#fff,#f5f3ff)' : T.cardBg,
      border: `1px solid ${indigo ? 'rgba(99,102,241,0.2)' : 'rgba(30,69,48,0.09)'}`
    }}>
      {!indigo && <div style={{
        position: 'absolute', top: '18px', left: 0, bottom: '18px', width: '3px',
        background: `linear-gradient(180deg,${T.gold},#edd07a 50%,transparent)`, borderRadius: '0 3px 3px 0'
      }} />}
      {children}
    </div>
  );
}

function CH({ children, indigo, icon }: { children: React.ReactNode; indigo?: boolean; icon: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px',
      borderBottom: `1.5px solid ${indigo ? 'rgba(99,102,241,0.15)' : 'rgba(30,69,48,0.09)'}`
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: indigo ? 'rgba(99,102,241,0.12)' : '#f8edc0'
      }}>{icon}</div>
      <p style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: indigo ? T.indigoDark : T.tx1 }}>{children}</p>
    </div>
  );
}

const I = {
  file: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7b5d1b" strokeWidth="2" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>,
};
// inline SVG factory to keep it concise
function Svg({ d, indigo }: { d: string; indigo?: boolean }) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={indigo ? T.indigo : T.goldLabel} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP PANELS
// ═══════════════════════════════════════════════════════════════════════════════

function Step10Panel({ form, set, errors, locked }: any) {
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '10px 16px', marginBottom: '16px',
        background: '#f8edc0', border: '1px solid rgba(201,168,76,0.38)', borderRadius: '10px'
      }}>
        <Svg d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <span style={{ fontSize: '12px', fontWeight: 600, color: T.goldLabel }}>Triggered by the first confirmed booking — fill billing before processing commission</span>
      </div>
      <FormCard>
        <CH icon={<Svg d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />}>Trigger &amp; Identity</CH>
        <div className="kcc3-g2">
          <TI id="partnerCompany" label="Partner Company Name" required value={form.partnerCompany} onChange={v => set('partnerCompany', v)} hasError={!!errors.partnerCompany} readOnly={locked.has('partnerCompany')} />
          <TI id="partnerId" label="Partner ID (from CRM)" required value={form.partnerId} onChange={v => set('partnerId', v)} hasError={!!errors.partnerId} readOnly={locked.has('partnerId')} />
          <TI id="firstBookingRef" label="First Booking Reference" required value={form.firstBookingRef} onChange={v => set('firstBookingRef', v)} hasError={!!errors.firstBookingRef} readOnly={locked.has('firstBookingRef')} />
          <TI type="date" id="dateTriggered" label="Date Triggered" required value={form.dateTriggered} onChange={v => set('dateTriggered', v)} hasError={!!errors.dateTriggered} readOnly={locked.has('dateTriggered')} />
          <SelectInput id="takingCare" label="Taking Care (Responsible Employee)" required value={form.takingCare} onChange={v => set('takingCare', v)} hasError={!!errors.takingCare} options={STAFF_OPTIONS} placeholder="Select staff member…" readOnly={locked.has('takingCare')} />

          <TI id="referralCode" label="Referral Code" value={form.referralCode} onChange={v => set('referralCode', v)} readOnly={locked.has('referralCode')} />
        </div>
        <div style={{ marginTop: '18px' }}>
          <SL>Category</SL>
          <PillRow>{CATEGORY_OPTS.map(o => <Pill key={o} label={o} checked={form.category === o} disabled={locked.has('category')} onClick={() => set('category', form.category === o ? '' : o)} />)}</PillRow>
        </div>
        <div style={{ marginTop: '16px' }}>
          <TI url id="taProfileLink" label="TA Profile Link" value={form.taProfileLink} onChange={v => set('taProfileLink', v)} placeholder="https://" readOnly={locked.has('taProfileLink')} />
        </div>
      </FormCard>
    </>
  );
}

function Step11Panel({ form, set, errors, locked }: any) {
  const handleCountryChange = (country: string) => {
    const data = COUNTRY_DATA[country];
    set('taxCountry', country);
    if (data) {
      set('countryCode', data.code);
    } else {
      set('countryCode', '');
    }
    set('state', '');
    set('taxCity', '');
  };

  const handleStateChange = (state: string) => {
    set('state', state);
    set('taxCity', '');
  };

  const handleCityChange = (city: string) => {
    set('taxCity', city);
  };

  const baseCountryOptions = Object.keys(COUNTRY_DATA);
  const isCustomCountry = form.taxCountry === 'Others' || (form.taxCountry !== '' && !baseCountryOptions.includes(form.taxCountry));
  const countryOptions = [...baseCountryOptions, 'Others'];

  const selectedCountryData = COUNTRY_DATA[form.taxCountry];
  
  const baseStateOptions = selectedCountryData ? Object.keys(selectedCountryData.states) : [];
  const isCustomState = form.state === 'Others' || (form.state !== '' && !baseStateOptions.includes(form.state));
  const stateOptions = [...baseStateOptions, 'Others'];

  const baseCityOptions = (selectedCountryData && form.state && selectedCountryData.states[form.state]) ? selectedCountryData.states[form.state] : [];
  const isCustomCity = form.taxCity === 'Others' || (form.taxCity !== '' && !baseCityOptions.includes(form.taxCity));
  const cityOptions = [...baseCityOptions, 'Others'];

  return (
    <div>
      {/* A1 */}
      <FormCard>
        <CH icon={<Svg d="M2 7h20M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z M10 7v12" />}>A1 · Company &amp; Tax Details</CH>
        <div style={{ marginBottom: '14px' }}><TI id="legalCompanyName" label="Legal Company Name (as per bank / tax registration)" required value={form.legalCompanyName} onChange={v => set('legalCompanyName', v)} hasError={!!errors.legalCompanyName} readOnly={locked.has('legalCompanyName')} /></div>
        <div className="kcc3-g2">
          <TI id="gstNo" label="GST No. (India)" value={form.gstNo} onChange={v => set('gstNo', v)} readOnly={locked.has('gstNo')} />
          <TI id="panNo" label="PAN No. (India)" value={form.panNo} onChange={v => set('panNo', v)} readOnly={locked.has('panNo')} />
          <TI id="aadharNo" label="Aadhar No." value={form.aadharNo} onChange={v => set('aadharNo', v)} readOnly={locked.has('aadharNo')} />
          <TI id="vatTaxId" label="VAT / Tax ID (International)" value={form.vatTaxId} onChange={v => set('vatTaxId', v)} readOnly={locked.has('vatTaxId')} />
          <TI id="bizRegNo" label="Business Registration No." value={form.bizRegNo} onChange={v => set('bizRegNo', v)} readOnly={locked.has('bizRegNo')} />
          <TI id="yearsExperience" label="Years of Experience" required value={form.yearsExperience} onChange={v => set('yearsExperience', v)} hasError={!!errors.yearsExperience} readOnly={locked.has('yearsExperience')} />
        </div>
        <div style={{ marginTop: '14px', marginBottom: '14px' }}><TA id="agencyAddress" label="Agency / Office Address (full)" required value={form.agencyAddress} onChange={v => set('agencyAddress', v)} hasError={!!errors.agencyAddress} readOnly={locked.has('agencyAddress')} /></div>

        <div className="kcc3-g2">
          {isCustomCountry ? (
            <div style={{ position: 'relative' }}>
              <TI id="taxCountry" label="Country" required value={form.taxCountry === 'Others' ? '' : form.taxCountry} onChange={v => set('taxCountry', v)} hasError={!!errors.taxCountry} readOnly={locked.has('taxCountry')} />
              {!locked.has('taxCountry') && (
                 <button type="button" onClick={() => { set('taxCountry', ''); set('countryCode', ''); set('state', ''); set('taxCity', ''); }} style={{ position: 'absolute', right: 12, top: '48px', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 'bold', color: T.indigo, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              )}
            </div>
          ) : (
            <SelectInput id="taxCountry" label="Country" required value={form.taxCountry} onChange={handleCountryChange} options={countryOptions} placeholder="Select country…" hasError={!!errors.taxCountry} readOnly={locked.has('taxCountry')} />
          )}
          <TI id="countryCode" label="Country Code (e.g. +91)" value={form.countryCode} onChange={v => set('countryCode', v)} readOnly={locked.has('countryCode')} />
        </div>
        <div className="kcc3-g2">
          {isCustomState ? (
            <div style={{ position: 'relative' }}>
              <TI id="state" label="State" required value={form.state === 'Others' ? '' : form.state} onChange={v => set('state', v)} hasError={!!errors.state} readOnly={locked.has('state')} />
              {!locked.has('state') && (
                 <button type="button" onClick={() => { set('state', ''); set('taxCity', ''); }} style={{ position: 'absolute', right: 12, top: '48px', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 'bold', color: T.indigo, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              )}
            </div>
          ) : (
            <SelectInput id="state" label="State" required value={form.state} onChange={handleStateChange} options={stateOptions} placeholder="Select state…" hasError={!!errors.state} readOnly={locked.has('state') || !form.taxCountry} />
          )}

          {isCustomCity ? (
            <div style={{ position: 'relative' }}>
              <TI id="taxCity" label="City" required value={form.taxCity === 'Others' ? '' : form.taxCity} onChange={v => set('taxCity', v)} hasError={!!errors.taxCity} readOnly={locked.has('taxCity')} />
              {!locked.has('taxCity') && (
                 <button type="button" onClick={() => set('taxCity', '')} style={{ position: 'absolute', right: 12, top: '48px', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 'bold', color: T.indigo, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              )}
            </div>
          ) : (
            <SelectInput id="taxCity" label="City" required value={form.taxCity} onChange={handleCityChange} options={cityOptions} placeholder="Select city…" hasError={!!errors.taxCity} readOnly={locked.has('taxCity') || !form.state} />
          )}
        </div>
        <div className="kcc3-g2">
          <TI id="pincode" label="Pincode / ZIP" value={form.pincode} onChange={v => set('pincode', v)} readOnly={locked.has('pincode')} />
          <TI type="tel" id="officeContact" label="Office Contact Number" required value={form.officeContact} onChange={v => set('officeContact', v)} hasError={!!errors.officeContact} readOnly={locked.has('officeContact')} />
        </div>
      </FormCard>


      {/* A2 */}
      <FormCard>
        <CH icon={<Svg d="M1 4h22v16H1z M1 10h22" />}>A2 · Bank Details</CH>
        <div className="kcc3-g2">
          <TI id="accountHolder" label="Account Holder Name" required value={form.accountHolder} onChange={v => set('accountHolder', v)} hasError={!!errors.accountHolder} readOnly={locked.has('accountHolder')} />
          <TI id="bankName" label="Bank Name" required value={form.bankName} onChange={v => set('bankName', v)} hasError={!!errors.bankName} readOnly={locked.has('bankName')} />
          <TI id="accountNo" label="Account Number / IBAN" required value={form.accountNo} onChange={v => set('accountNo', v)} hasError={!!errors.accountNo} readOnly={locked.has('accountNo')} />
          <TI id="ifscSwift" label="IFSC (India) / SWIFT (International)" required value={form.ifscSwift} onChange={v => set('ifscSwift', v)} hasError={!!errors.ifscSwift} readOnly={locked.has('ifscSwift')} />
          <TI id="branchCity" label="Branch Name & City" required value={form.branchCity} onChange={v => set('branchCity', v)} hasError={!!errors.branchCity} readOnly={locked.has('branchCity')} />
          <SelectInput id="accountType" label="Account Type (Current / Savings)" value={form.accountType} onChange={v => set('accountType', v)} options={['Curent', 'Saving']} readOnly={locked.has('accountType')} />
        </div>
        <div style={{ marginTop: '14px' }}><TI id="intermediaryBank" label="Intermediary / Correspondent Bank (international only)" value={form.intermediaryBank} onChange={v => set('intermediaryBank', v)} readOnly={locked.has('intermediaryBank')} /></div>
      </FormCard>

      {/* A3 */}
      <FormCard>
        <CH icon={<Svg d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}>A3 · How Commission is Settled</CH>
        <div style={{ marginBottom: '16px' }}>
          <SL required>Commission Type</SL>
          <PillRow>{COMM_TYPE_OPTS.map(o => <Pill key={o} label={o} checked={form.commissionType === o} disabled={locked.has('commissionType')} onClick={() => set('commissionType', form.commissionType === o ? '' : o)} />)}</PillRow>
          {errors.commissionType && <ErrHint msg={errors.commissionType} />}
        </div>
        <div style={{ marginBottom: '16px' }}>
          <SL required>Settlement Model</SL>
          <PillRow>{SETTLEMENT_OPTS.map(o => <Pill key={o} label={o} checked={form.settlementModel === o} disabled={locked.has('settlementModel')} onClick={() => set('settlementModel', form.settlementModel === o ? '' : o)} />)}</PillRow>
          {errors.settlementModel && <ErrHint msg={errors.settlementModel} />}
        </div>
        <div style={{ marginBottom: '16px' }}><SL>Billing Cycle</SL><PillRow>{BILLING_CYCLE_OPTS.map(o => <Pill key={o} label={o} checked={form.billingCycle === o} disabled={locked.has('billingCycle')} onClick={() => set('billingCycle', form.billingCycle === o ? '' : o)} />)}</PillRow></div>
        <div style={{ marginBottom: '16px' }}><SL>Preferred Payment Method</SL><PillRow>{PAYMENT_METHOD_OPTS.map(o => <Pill key={o} label={o} checked={form.paymentMethod.includes(o)} disabled={locked.has('paymentMethod')} onClick={() => { const cur = form.paymentMethod; set('paymentMethod', cur.includes(o) ? cur.filter((v: string) => v !== o) : [...cur, o]); }} />)}</PillRow></div>
        <div style={{ marginBottom: '16px' }}><SL>Billing Currency</SL><PillRow>{CURRENCY_OPTS.map(o => <Pill key={o} label={o} checked={form.billingCurrency === o} disabled={locked.has('billingCurrency')} onClick={() => set('billingCurrency', form.billingCurrency === o ? '' : o)} />)}</PillRow></div>
        <div style={{ marginBottom: '14px' }}><TA id="billingNotes" label="Any specific billing notes or instructions from the partner" value={form.billingNotes} onChange={v => set('billingNotes', v)} readOnly={locked.has('billingNotes')} /></div>
        <div className="kcc3-g2">
          <SelectInput id="billingCollectedBy" label="Billing section collected by" value={form.billingCollectedBy} onChange={v => set('billingCollectedBy', v)} options={STAFF_OPTIONS} placeholder="Select staff member…" readOnly={locked.has('billingCollectedBy')} />

          <TI type="date" id="billingCollectedDate" label="Date collected" value={form.billingCollectedDate} onChange={v => set('billingCollectedDate', v)} readOnly={locked.has('billingCollectedDate')} />
        </div>
      </FormCard>

      {/* A4 */}
      <FormCard>
        <CH icon={<Svg d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />}>A4 · Documents &amp; Uploads</CH>
        <div style={{ padding: '10px 14px', background: '#f8edc0', borderRadius: '9px', fontSize: '12px', color: T.goldLabel, marginBottom: '16px', fontStyle: 'italic' }}>
          Paste Google Drive share links. Sharing must be set to "Anyone with link can view".
        </div>
        <div className="kcc3-g2">
          <TI url id="gstCertLink" label="GST Certificate (Drive link)" required value={form.gstCertLink} onChange={v => set('gstCertLink', v)} hasError={!!errors.gstCertLink} placeholder="https://drive.google.com/..." readOnly={locked.has('gstCertLink')} />
          <TI url id="panCardLink" label="PAN Card (Drive link)" required value={form.panCardLink} onChange={v => set('panCardLink', v)} hasError={!!errors.panCardLink} placeholder="https://drive.google.com/..." readOnly={locked.has('panCardLink')} />
          <TI url id="cancelledChequeLink" label="Cancelled Cheque (Drive link)" value={form.cancelledChequeLink} onChange={v => set('cancelledChequeLink', v)} placeholder="https://drive.google.com/..." readOnly={locked.has('cancelledChequeLink')} />
          <TI url id="agreementCopyLink" label="Agreement Copy (Drive link)" value={form.agreementCopyLink} onChange={v => set('agreementCopyLink', v)} placeholder="https://drive.google.com/..." readOnly={locked.has('agreementCopyLink')} />
          <TI url id="logoLink" label="Agency Logo (Drive link)" value={form.logoLink} onChange={v => set('logoLink', v)} placeholder="https://drive.google.com/..." readOnly={locked.has('logoLink')} />
          <TI url id="otherDocLink" label="Other Document (Drive link)" value={form.otherDocLink} onChange={v => set('otherDocLink', v)} placeholder="https://drive.google.com/..." readOnly={locked.has('otherDocLink')} />
        </div>
      </FormCard>
    </div>
  );
}

function Step12Panel({ form, set, locked }: any) {
  const tm = (field: 'clientTypes' | 'nationalities' | 'clientReqs' | 'programs' | 'supportMaterials', val: string) => {
    const cur = form[field] as string[];
    set(field, cur.includes(val) ? cur.filter((v: string) => v !== val) : [...cur, val]);
  };
  return (
    <div>
      <FormCard>
        <CH icon={<Svg d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />}>B1 · Their Clients — Who Do They Actually Send?</CH>
        <div style={{ marginBottom: '16px' }}><SL>Client types</SL><PillRow>{CLIENT_TYPES.map(o => <Pill key={o} label={o} checked={form.clientTypes.includes(o)} disabled={locked.has('clientTypes')} onClick={() => tm('clientTypes', o)} />)}</PillRow></div>
        <div style={{ marginBottom: '16px' }}><SL>Primary source nationalities</SL><PillRow>{NATIONALITY_OPTS.map(o => <Pill key={o} label={o} checked={form.nationalities.includes(o)} disabled={locked.has('nationalities')} onClick={() => tm('nationalities', o)} />)}</PillRow></div>
        <div style={{ marginBottom: '14px' }}><TI id="otherNationalities" label="Other nationalities" value={form.otherNationalities} onChange={v => set('otherNationalities', v)} readOnly={locked.has('otherNationalities')} /></div>
        <div className="kcc3-g2">
          <TI id="avgGroupSize" label="Avg. group / party size" value={form.avgGroupSize} onChange={v => set('avgGroupSize', v)} readOnly={locked.has('avgGroupSize')} />
          <TI id="avgStay" label="Avg. stay duration (nights)" value={form.avgStay} onChange={v => set('avgStay', v)} readOnly={locked.has('avgStay')} />
          <TI id="leadTime" label="Typical lead time before arrival" value={form.leadTime} onChange={v => set('leadTime', v)} readOnly={locked.has('leadTime')} />
          <TI id="spendPerPerson" label="Typical spend per person (approx.)" value={form.spendPerPerson} onChange={v => set('spendPerPerson', v)} readOnly={locked.has('spendPerPerson')} />
        </div>
        <div style={{ marginTop: '16px', marginBottom: '16px' }}><SL>Common client requirements</SL><PillRow>{CLIENT_REQ_OPTS.map(o => <Pill key={o} label={o} checked={form.clientReqs.includes(o)} disabled={locked.has('clientReqs')} onClick={() => tm('clientReqs', o)} />)}</PillRow></div>
        <div style={{ marginBottom: '14px' }}><TI id="languagesSpoken" label="Languages their team speaks (besides English)" value={form.languagesSpoken} onChange={v => set('languagesSpoken', v)} readOnly={locked.has('languagesSpoken')} /></div>
        <TA id="clientDistinctive" label="Anything distinctive about their client base worth knowing" value={form.clientDistinctive} onChange={v => set('clientDistinctive', v)} readOnly={locked.has('clientDistinctive')} />
      </FormCard>

      <FormCard>
        <CH icon={<Svg d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}>B2 · Programs They Want to Sell</CH>
        <div style={{ marginBottom: '16px' }}><SL>Programs</SL><PillRow>{PROGRAM_OPTS.map(o => <Pill key={o} label={o} checked={form.programs.includes(o)} disabled={locked.has('programs')} onClick={() => tm('programs', o)} />)}</PillRow></div>
        <div style={{ marginBottom: '16px' }}><TA id="programGaps" label="Specific program needs or gaps they've mentioned" value={form.programGaps} onChange={v => set('programGaps', v)} minH="70px" readOnly={locked.has('programGaps')} /></div>
        <div style={{ marginBottom: '16px' }}><SL>Support materials they need</SL><PillRow>{SUPPORT_MAT_OPTS.map(o => <Pill key={o} label={o} checked={form.supportMaterials.includes(o)} disabled={locked.has('supportMaterials')} onClick={() => tm('supportMaterials', o)} />)}</PillRow></div>
        <TI id="translationLang" label="Language for translated content (if needed)" value={form.translationLang} onChange={v => set('translationLang', v)} readOnly={locked.has('translationLang')} />
      </FormCard>
    </div>
  );
}

function Step13Panel({ form, set, locked }: any) {
  return (
    <div>
      <FormCard indigo>
        <CH indigo icon={<Svg d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" indigo />}>C1 · Messaging Angle for This Partner</CH>
        <div style={{ marginBottom: '16px' }}><SL indigo>Primary market profile</SL><PillRow>{MARKET_PROFILE_OPTS.map(o => <IndigoPill key={o} label={o} checked={form.marketProfile === o} disabled={locked.has('marketProfile')} onClick={() => set('marketProfile', form.marketProfile === o ? '' : o)} />)}</PillRow></div>
        <div style={{ marginBottom: '16px' }}><SL indigo>Segment profile</SL><PillRow>{SEGMENT_OPTS.map(o => <IndigoPill key={o} label={o} checked={form.segmentProfile === o} disabled={locked.has('segmentProfile')} onClick={() => set('segmentProfile', form.segmentProfile === o ? '' : o)} />)}</PillRow></div>
        <div style={{ marginBottom: '14px' }}><TA indigo id="aiLeadWith" label="AI messaging notes — what to lead with for this partner" value={form.aiLeadWith} onChange={v => set('aiLeadWith', v)} readOnly={locked.has('aiLeadWith')} /></div>
        <div style={{ marginBottom: '14px' }}><TA indigo id="aiAvoid" label="What NOT to emphasise with this partner" value={form.aiAvoid} onChange={v => set('aiAvoid', v)} minH="70px" readOnly={locked.has('aiAvoid')} /></div>
        <TA indigo id="aiRespondedWell" label="Programs or offers this partner has responded well to" value={form.aiRespondedWell} onChange={v => set('aiRespondedWell', v)} minH="70px" readOnly={locked.has('aiRespondedWell')} />
      </FormCard>

      <FormCard indigo>
        <CH indigo icon={<Svg d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" indigo />}>C2 · Communication Preferences Observed</CH>
        <div style={{ marginBottom: '16px' }}><SL indigo>Best channel</SL><PillRow>{CHANNEL_OPTS.map(o => <IndigoPill key={o} label={o} checked={form.bestChannel === o} disabled={locked.has('bestChannel')} onClick={() => set('bestChannel', form.bestChannel === o ? '' : o)} />)}</PillRow></div>
        <div style={{ marginBottom: '16px' }}><SL indigo>Response speed (observed)</SL><PillRow>{RESP_SPEED_OPTS.map(o => <IndigoPill key={o} label={o} checked={form.responseSpeed === o} disabled={locked.has('responseSpeed')} onClick={() => set('responseSpeed', form.responseSpeed === o ? '' : o)} />)}</PillRow></div>
        <div style={{ marginBottom: '16px' }}><SL indigo>Communication style</SL><PillRow>{COMM_STYLE_OPTS.map(o => <IndigoPill key={o} label={o} checked={form.commStyle === o} disabled={locked.has('commStyle')} onClick={() => set('commStyle', form.commStyle === o ? '' : o)} />)}</PillRow></div>
        <TA indigo id="personalNotes" label="Personal notes — names, preferences, things to remember" value={form.personalNotes} onChange={v => set('personalNotes', v)} readOnly={locked.has('personalNotes')} />
      </FormCard>

      <FormCard indigo>
        <CH indigo icon={<Svg d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" indigo />}>Remarks</CH>
        <TA indigo id="remarks" label="Any additional remarks, observations or internal notes" value={form.remarks} onChange={v => set('remarks', v)} minH="110px" readOnly={locked.has('remarks')} />
      </FormCard>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

// function validateStep(step: number, form: Part3Data) {
//   const e: Partial<Record<keyof Part3Data, string>> = {};
//   if (step === 1) {
//     if (!form.partnerCompany.trim()) e.partnerCompany = 'Required';
//     if (!form.partnerId.trim()) e.partnerId = 'Required';
//     if (!form.firstBookingRef.trim()) e.firstBookingRef = 'Required';
//     if (!form.dateTriggered) e.dateTriggered = 'Required';
//   }
//   if (step === 2) {
//     if (!form.legalCompanyName.trim()) e.legalCompanyName = 'Required';
//     if (!form.taxCountry.trim()) e.taxCountry = 'Required';
//     if (!form.accountHolder.trim()) e.accountHolder = 'Required';
//     if (!form.bankName.trim()) e.bankName = 'Required';
//     if (!form.accountNo.trim()) e.accountNo = 'Required';
//     if (!form.ifscSwift.trim()) e.ifscSwift = 'Required';
//     if (!form.settlementModel) e.settlementModel = 'Please select a settlement model.';
//   }
//   return e;
// }

function validateStep(step: number, form: Part3Data, locked: Set<string>) {
  const e: Partial<Record<keyof Part3Data, string>> = {};

  const isLocked = (key: keyof Part3Data) => locked.has(key as string);

  if (step === 1) {
    if (!isLocked('partnerCompany') && !form.partnerCompany.trim()) e.partnerCompany = 'Required';
    if (!isLocked('partnerId') && !form.partnerId.trim()) e.partnerId = 'Required';
    if (!isLocked('firstBookingRef') && !form.firstBookingRef.trim()) e.firstBookingRef = 'Required';
    if (!isLocked('dateTriggered') && !form.dateTriggered) e.dateTriggered = 'Required';
    if (!isLocked('takingCare') && !form.takingCare) e.takingCare = 'Required';
  }

  if (step === 2) {
    if (!isLocked('legalCompanyName') && !form.legalCompanyName.trim()) e.legalCompanyName = 'Required';
    if (!isLocked('taxCountry') && !form.taxCountry.trim()) e.taxCountry = 'Required';
    if (!isLocked('state') && !form.state.trim()) e.state = 'Required';
    if (!isLocked('taxCity') && !form.taxCity.trim()) e.taxCity = 'Required';
    if (!isLocked('accountHolder') && !form.accountHolder.trim()) e.accountHolder = 'Required';
    if (!isLocked('bankName') && !form.bankName.trim()) e.bankName = 'Required';
    if (!isLocked('accountNo') && !form.accountNo.trim()) e.accountNo = 'Required';
    if (!isLocked('ifscSwift') && !form.ifscSwift.trim()) e.ifscSwift = 'Required';
    if (!isLocked('branchCity') && !form.branchCity.trim()) e.branchCity = 'Required';

    if (!isLocked('yearsExperience') && !form.yearsExperience.trim()) e.yearsExperience = 'Required';
    if (!isLocked('agencyAddress') && !form.agencyAddress.trim()) e.agencyAddress = 'Required';
    if (!isLocked('officeContact') && !form.officeContact.trim()) e.officeContact = 'Required';
    if (!isLocked('gstCertLink') && !form.gstCertLink.trim()) e.gstCertLink = 'Required';
    if (!isLocked('panCardLink') && !form.panCardLink.trim()) e.panCardLink = 'Required';

    if (!isLocked('commissionType') && !form.commissionType) {
      e.commissionType = 'Please select a commission type.';
    }
    if (!isLocked('settlementModel') && !form.settlementModel) {
      e.settlementModel = 'Please select a settlement model.';
    }
  }

  return e;
}
// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function Part3Modal({ isOpen, onClose, onSubmit, partnerName = '', partnerId = '', initialData = {}, lockedFields = false, showSubmitButton = false }: Part3ModalProps) {
  const [form, setForm] = useState<Part3Data>(EMPTY);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Partial<Record<keyof Part3Data, string>>>({});
  const [saving, setSaving] = useState(false);

  // Locking logic for prefilled fields and passed lockedFields
  const locked = useMemo(() => {
    const s = new Set<string>();

    // 1. Add fields from lockedFields prop
    if (lockedFields === true) {
      // Lock EVERYTHING
      Object.keys(EMPTY).forEach(k => s.add(k));
    } else if (lockedFields instanceof Set) {
      lockedFields.forEach(f => s.add(f));
    }

    // 2. Always lock identity fields if they came from CRM
    if (partnerName) s.add('partnerCompany');
    if (partnerId) s.add('partnerId');

    return s;
  }, [partnerName, partnerId, lockedFields]);

  useEffect(() => {
    if (isOpen) {
      // Merge EMPTY + initialData + prefilled CRM values
      setForm({
        ...EMPTY,
        ...initialData,
        partnerCompany: partnerName || (initialData as any)?.partnerCompany || '',
        partnerId: partnerId || (initialData as any)?.partnerId || ''
      });
      setStep(1);
      setErrors({});
      setSaving(false);
    }
  }, [isOpen, partnerName, partnerId, initialData]);

  useEffect(() => { if (!isOpen) return; const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [isOpen, onClose]);
  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);

  const set = useCallback(<K extends keyof Part3Data>(key: K, val: Part3Data[K]) => {
    if (locked.has(key as string)) return;
    setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: undefined }));
  }, [locked]);

  const goBack = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
  };

  const goNext = () => {
    const errs = validateStep(step, form, locked);

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setStep(s => Math.min(s + 1, 4));
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
      setSaving(false);
      onClose();
    } catch (error) {
      console.error("Part 3 Save Error:", error);
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  const pp = { form, set, errors, locked };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 999, animation: 'kccFade .2s ease both' }} />

      <div role="dialog" aria-modal="true" className="kcc3-modal"
        style={{ animation: 'kccSlide .28s cubic-bezier(0.34,1.56,0.64,1) both' }}>

        {/* Header */}
        <div className="kcc3-hdr" style={{
          background: T.hdrBg, height: '62px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid ${T.gold}`
        }}>
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={16} color={T.gold} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#f9fafb', lineHeight: 1.2 }}>Billing &amp; Partner Intelligence</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Part 3 · Step {step} of 4 · {STEPS[step - 1].label}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {['Part 3 of 3', 'First Booking', 'TravelAgentFMS'].map(t => (
              <span key={t} className="kcc3-tag" style={{
                fontSize: '10px', padding: '2px 9px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '.04em'
              }}>{t}</span>
            ))}
            <button onClick={onClose} style={{
              marginLeft: '6px', width: '30px', height: '30px', borderRadius: '7px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)'
            }}>
              <X size={14} />
            </button>
          </div> */}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'rgba(201,168,76,0.18)',
              border: '1px solid rgba(201,168,76,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BookOpen size={16} color={T.gold} />
            </div>

            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#f9fafb',
                lineHeight: 1.2
              }}>
                Billing &amp; Partner Intelligence
              </p>

              <p style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '1px',
                letterSpacing: '.08em',
                textTransform: 'uppercase'
              }}>
                Part 3 · Step {step} of 4 · {STEPS[step - 1].label}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {['Part 3 of 3'].map(t => (
              <span key={t} className="kcc3-tag" style={{
                fontSize: '10px',
                padding: '2px 9px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                letterSpacing: '.04em'
              }}>
                {t}
              </span>
            ))}

            <button onClick={onClose} style={{
              marginLeft: '6px',
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)'
            }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="kcc3-body" style={{ flex: 1, overflowY: 'auto', background: T.pageBg }}>
          <StepBar current={step} />
          {step === 1 && <Step10Panel {...pp} />}
          {step === 2 && <Step11Panel {...pp} />}
          {step === 3 && <Step12Panel {...pp} />}
          {step === 4 && <Step13Panel {...pp} />}
        </div>

        {/* Footer */}
        <div className="kcc3-footer" style={{
          background: '#fff', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
          borderTop: '1px solid rgba(30,69,48,0.1)'
        }}>
          <p style={{ fontSize: '11px', color: T.tx4 }}>Fields marked <span style={{ color: T.err }}>✱</span> are required</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 1 ? (
              <button onClick={goBack} style={{
                height: '40px', padding: '0 20px', borderRadius: '10px',
                border: `1.5px solid ${T.border}`, background: 'transparent', fontFamily: 'inherit',
                fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
                color: T.tx3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px'
              }}>
                <ArrowLeft size={13} /> Back
              </button>
            ) : (
              <button onClick={onClose} style={{
                height: '40px', padding: '0 20px', borderRadius: '10px',
                border: `1.5px solid ${T.border}`, background: 'transparent', fontFamily: 'inherit',
                fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
                color: T.tx3, cursor: 'pointer'
              }}>Cancel</button>
            )}
            {step < 4 ? (
              <button onClick={goNext} style={{
                height: '40px', padding: '0 26px', borderRadius: '10px',
                border: 'none', background: '#1e4530', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700,
                letterSpacing: '.07em', textTransform: 'uppercase', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px'
              }}>
                Continue <ArrowRight size={13} />
              </button>
            ) : (showSubmitButton || !lockedFields) && (
              <button onClick={handleSave} disabled={saving}
                style={{
                  height: '40px', padding: '0 28px', borderRadius: '10px', border: 'none',
                  background: saving ? 'rgba(30,69,48,0.5)' : '#1e4530', fontFamily: 'inherit',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
                  color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '7px'
                }}>
                {saving ? (<><span style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'kccSpin .7s linear infinite' }} />Saving…</>) : (<>Submit Part 3 <ArrowRight size={13} /></>)}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{CSS}</style>
    </>
  );
}

// ─── Trigger Button ───────────────────────────────────────────────────────────

export function Part3Button({ partnerName, partnerId }: { partnerName?: string; partnerId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        padding: '0 18px', height: '38px', borderRadius: '8px', border: 'none', background: '#1E3A2F',
        color: '#fff', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
      }}>
        <BookOpen size={14} /> Open Part 3
      </button>
      <Part3Modal isOpen={open} onClose={() => setOpen(false)}
        onSubmit={async () => {}} partnerName={partnerName} partnerId={partnerId} />
    </>
  );
}
