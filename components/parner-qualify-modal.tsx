'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, PhoneCall, ArrowRight, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Part2Data {
  partnerRef: string; callDate: string; conductedBy: string; duration: string;
  noteVolume: string; noteAyurveda: string; noteClients: string; noteImmediacy: string;
  noteExpectations: string; noteRedFlags: string; noteOther: string;
  s_roomnights: string; s_immediacy: string; s_ayurveda: string; s_wellness: string;
  s_market: string; s_source: string; s_convo: string; s_align: string;
  assignedTier: string; commissionCat: string; commissionPct: string;
  decidedBy: string; dateDecided: string; reviewDate: string; commEmailDate: string;
  act_commEmail: boolean; act_rateCard: boolean; act_brochure: boolean;
  act_whatsapp: boolean; act_crmFiled: boolean; act_part3Flag: boolean;
  additionalNotes: string;
}

interface Part2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Part2Data) => void;
  partnerName?: string;
  initialData?: Partial<Part2Data>;
  lockedFields?: boolean | Set<string>;
  showSubmitButton?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Session Details', hint: 'Link to Part 1 record', required: true },
  { num: 2, label: 'Conv. Notes', hint: 'What you heard & observed' },
  { num: 3, label: 'Qualifying Score', hint: 'Volume, wellness & fit', required: true },
  { num: 4, label: 'Tier & Commission', hint: 'Assign tier & comm. rate', required: true },
  { num: 5, label: 'Next Actions', hint: 'Close the Part 2 loop' },
];

const Q_GUIDE = [
  { q: 'Roughly how many guests or room nights do you handle in a year — and what percentage would be wellness or health-motivated?', why: 'Sets volume expectation and wellness depth in one question.', listen: 'Listen for confidence vs vagueness. A serious operator knows this number.' },
  { q: 'Have you sold Ayurveda or wellness retreats before? Which properties, and to which markets?', why: 'Tells you their experience level and who they compete with / complement.', listen: "Names of competitors mean they're active. Vague answers mean exploring." },
  { q: 'Do you have clients actively looking for this right now, or is this more of a future pipeline conversation?', why: 'Separates immediate revenue from long-term potential.', listen: '"I have a group in mind" = prioritise. "We want to build this over time" = nurture.' },
  { q: "What's your typical lead time from enquiry to booking?", why: 'Helps set expectations and identify urgency.', listen: 'Short lead times = reactive booker. Long lead = planner. Both valid.' },
  { q: 'Are you currently working with any other Ayurveda or wellness properties in India?', why: 'Reveals competitive landscape and loyalty.', listen: "Working with competitors isn't bad — it means they're active in the category." },
  { q: 'Who is your typical client — and what does a good trip look like for them?', why: 'Reveals market sophistication and guest profile match.', listen: 'Listen for specificity. Vague = less qualified. Detailed = experienced operator.' },
  { q: 'What would make this partnership work well for you — what do you need from us?', why: 'Surfaces expectations, red flags, and alignment early.', listen: 'Unreasonable demands are signals. Reasonable ones are easy to meet.' },
];

const TIER_OPTIONS = [
  { value: '1', label: 'Tier 1 — Priority', name: 'Priority Partner', range: '75–100', desc: 'Commission: Category A. Immediate welcome kit + rate card. Dedicated contact. Quarterly call.' },
  { value: '2', label: 'Tier 2 — Active', name: 'Active Partner', range: '50–74', desc: 'Commission: Category B. Standard onboarding. Regular updates + seasonal campaigns.' },
  { value: '3', label: 'Tier 3 — Emerging', name: 'Emerging Partner', range: '30–49', desc: 'Commission: Category C. Nurture sequence. FAM trip invite. Re-qualify in 3 months.' },
  { value: '4', label: 'Tier 4 — Watch', name: 'Watch & Wait', range: '< 30', desc: 'Hold. No commission yet. Monthly newsletter only. Re-engage on their initiative.' },
];

const COMM_CATS = ['Category A', 'Category B', 'Category C', 'On Hold'];

// const DECIDED_BY_OPTIONS = [
//   'Abhilash K Ramesh',
//   'Anupam Molpha',
//   'Anoop Vijayaraj',
//   'Astha Kumari',
//   'Harpal Singh',
//   'Sadik Rehman',
//   'Sunaj Sahoo',
// ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const DECIDED_BY_OPTIONS = [
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

const SCORE_FIELDS: (keyof Part2Data)[] = [
  's_roomnights', 's_immediacy', 's_ayurveda', 's_wellness',
  's_market', 's_source', 's_convo', 's_align',
];

function computeTotal(form: Part2Data): number {
  return SCORE_FIELDS.reduce((acc, f) => {
    const v = form[f] as string;
    return acc + (v ? parseInt(v) : 0);
  }, 0);
}

function getAutoTier(total: number): string {
  if (total >= 75) return '1';
  if (total >= 50) return '2';
  if (total >= 30) return '3';
  return '4';
}

function getAutoCommission(tier: string): { cat: string; pct: string } {
  if (tier === '1') return { cat: 'Category A', pct: '40' };
  if (tier === '2') return { cat: 'Category B', pct: '30' };
  if (tier === '3') return { cat: 'Category C', pct: '20' };
  return { cat: 'On Hold', pct: '0' };
}

const SCORE_GROUPS = {
  volume: {
    heading: 'Volume & Commercial Potential', maxPts: 40, icon: 'star',
    rows: [
      { label: 'Est. annual room nights to us', field: 's_roomnights', opts: [{ v: '0', l: '< 25', p: '+0' }, { v: '5', l: '25–75', p: '+5' }, { v: '15', l: '76–200', p: '+15' }, { v: '25', l: '200+', p: '+25' }] },
      { label: 'Immediacy of business', field: 's_immediacy', opts: [{ v: '0', l: 'Exploratory', p: '+0' }, { v: '3', l: '3–6 months', p: '+3' }, { v: '8', l: '1–3 months', p: '+8' }, { v: '15', l: 'Active now', p: '+15' }] },
    ]
  },
  wellness: {
    heading: 'Wellness & Ayurveda Depth', maxPts: 30, icon: 'shield',
    rows: [
      { label: 'Ayurveda experience', field: 's_ayurveda', opts: [{ v: '0', l: 'None', p: '+0' }, { v: '5', l: 'Basic awareness', p: '+5' }, { v: '10', l: 'Has sold it', p: '+10' }, { v: '15', l: 'Expert / specialist', p: '+15' }] },
      { label: 'Client wellness readiness', field: 's_wellness', opts: [{ v: '0', l: 'Mass market', p: '+0' }, { v: '3', l: 'Wellness-curious', p: '+3' }, { v: '7', l: 'Wellness-ready', p: '+7' }, { v: '10', l: 'Health tourists', p: '+10' }] },
      { label: 'Market quality', field: 's_market', opts: [{ v: '0', l: 'Domestic budget', p: '+0' }, { v: '2', l: 'Domestic premium', p: '+2' }, { v: '3', l: 'Intl. mid', p: '+3' }, { v: '5', l: 'Intl. premium', p: '+5' }] },
    ]
  },
  relationship: {
    heading: 'Relationship & Fit', maxPts: 30, icon: 'users',
    rows: [
      { label: 'How they came to us', field: 's_source', opts: [{ v: '0', l: 'Cold / unknown', p: '+0' }, { v: '3', l: 'Online / event', p: '+3' }, { v: '8', l: 'Network referral', p: '+8' }, { v: '12', l: 'Warm referral', p: '+12' }] },
      { label: 'Conversation quality', field: 's_convo', opts: [{ v: '0', l: 'Vague / disengaged', p: '+0' }, { v: '3', l: 'Polite but cautious', p: '+3' }, { v: '8', l: 'Clear & engaged', p: '+8' }, { v: '12', l: 'Sharp & specific', p: '+12' }] },
      { label: 'Alignment with our guest profile', field: 's_align', opts: [{ v: '0', l: 'Poor fit', p: '+0' }, { v: '1', l: 'Partial fit', p: '+1' }, { v: '3', l: 'Good fit', p: '+3' }, { v: '6', l: 'Strong fit', p: '+6' }] },
    ]
  },
};

const ACTION_ITEMS: { field: keyof Part2Data; label: string }[] = [
  { field: 'act_commEmail', label: 'Commission confirmation email sent' },
  { field: 'act_rateCard', label: 'Rate card shared' },
  { field: 'act_brochure', label: 'Property brochure / fact sheets shared' },
  { field: 'act_whatsapp', label: 'Added to partner WhatsApp broadcast / group' },
  { field: 'act_crmFiled', label: 'Part 2 filed — CRM updated' },
  { field: 'act_part3Flag', label: 'Part 3 (billing + intelligence) flagged for when first booking comes in' },
];

const EMPTY: Part2Data = {
  partnerRef: '', callDate: '', conductedBy: '', duration: '',
  noteVolume: '', noteAyurveda: '', noteClients: '', noteImmediacy: '',
  noteExpectations: '', noteRedFlags: '', noteOther: '',
  s_roomnights: '', s_immediacy: '', s_ayurveda: '', s_wellness: '',
  s_market: '', s_source: '', s_convo: '', s_align: '',
  assignedTier: '', commissionCat: '', commissionPct: '',
  decidedBy: '', dateDecided: '', reviewDate: '', commEmailDate: '',
  act_commEmail: false, act_rateCard: false, act_brochure: false,
  act_whatsapp: false, act_crmFiled: false, act_part3Flag: false,
  additionalNotes: '',
};

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  gold: '#c9a84c', goldTint: 'rgba(201,168,76,0.45)', goldFocus: 'rgba(201,168,76,0.12)',
  goldLabel: '#7b5d1b', pageBg: '#f5f3ee', cardBg: '#ffffff',
  border: 'rgba(30,69,48,0.18)', tx1: '#0d1a10', tx3: '#4d6356', tx4: '#7a9284',
  err: '#b52a1c', errBg: 'rgba(181,42,28,0.08)', hdrBg: '#1B3A2B',
  g1: '#0f2318', g3: '#1e4530',
};

// ─── Responsive CSS (injected once) ──────────────────────────────────────────

const CSS = `
@keyframes kccFade  { from{opacity:0}to{opacity:1} }
@keyframes kccSlide { from{opacity:0;transform:translate(-50%,calc(-50% + 20px)) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
@keyframes kccSpin  { to{transform:rotate(360deg)} }

.kcc2-modal  { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:84vw;max-width:1020px;height:84vh;z-index:1000;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.45);animation:kccSlide .28s cubic-bezier(0.34,1.56,0.64,1) both; }
.kcc2-hdr    { padding:0 28px; }
.kcc2-body   { padding:24px 28px; }
.kcc2-footer { padding:14px 28px; }
.kcc2-grid2  { display:grid;grid-template-columns:1fr 1fr;gap:18px; }
.kcc2-grid2t { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
.kcc2-tier   { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
.kcc2-card   { background:#fff;border-radius:16px;padding:24px 26px 20px;border:1px solid rgba(30,69,48,0.09);position:relative;overflow:hidden;margin-bottom:16px; }
.kcc2-sb-hint{ display:block; }
.kcc2-notes  { display:grid;grid-template-columns:1fr 1fr;gap:16px; }

@media (max-width:768px){
  .kcc2-modal  { width:96vw !important;height:92vh !important; }
  .kcc2-hdr    { padding:0 16px !important; }
  .kcc2-body   { padding:16px 14px !important; }
  .kcc2-footer { padding:10px 14px !important; }
  .kcc2-grid2  { grid-template-columns:1fr !important; }
  .kcc2-grid2t { grid-template-columns:1fr !important; }
  .kcc2-tier   { grid-template-columns:1fr !important; }
  .kcc2-card   { padding:16px 14px 14px !important; }
  .kcc2-sb-hint{ display:none !important; }
  .kcc2-notes  { grid-template-columns:1fr !important; }
}
@media (max-width:480px){
  .kcc2-modal  { width:100vw !important;height:100vh !important;border-radius:0 !important; }
}
`;

// ─── Primitive Components ─────────────────────────────────────────────────────

function SL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span style={{
      display: 'block', fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase',
      fontWeight: 700, color: T.goldLabel, marginBottom: '10px'
    }}>
      {children}{required && <span style={{ color: T.err, marginLeft: '3px', fontSize: '9px' }}>✱</span>}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 0, margin: '20px 0', borderTop: '1px dashed rgba(168,168,168,0.6)' }} />;
}

function TextInput({ type = 'text', id, value, onChange, placeholder, hasError, readOnly, step }: {
  type?: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hasError?: boolean; readOnly?: boolean; step?: string;
}) {

  const [f, setF] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={type} id={id} value={value} readOnly={readOnly}
        onChange={e => !readOnly && onChange(e.target.value)}
        placeholder={readOnly ? '—' : (placeholder || 'Fill details here')}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        step={step}
        style={{
          display: 'block', width: '100%', padding: readOnly ? '0 40px 0 14px' : '0 14px', height: '48px',
          border: `1.5px solid ${hasError ? T.err : readOnly ? 'rgba(30,69,48,0.12)' : f ? T.gold : T.border}`,
          borderRadius: '12px', fontFamily: 'inherit', fontSize: '13.5px', color: readOnly ? T.tx4 : T.tx1,
          background: readOnly ? '#f0f0ee' : '#fff', outline: 'none',
          boxShadow: hasError ? `0 0 0 3px ${T.errBg}` : f ? `0 0 0 3px ${T.goldFocus}` : 'none',
          cursor: readOnly ? 'not-allowed' : 'text', transition: 'border-color .2s,box-shadow .2s'
        }} />
      {readOnly && (
        <div style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}
    </div>
  );
}

function TextArea({ id, value, onChange, placeholder, readOnly }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean;
}) {
  const [f, setF] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <textarea id={id} value={value} onChange={e => onChange(e.target.value)}
        placeholder={readOnly ? '—' : (placeholder || "Fill details here")}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        readOnly={readOnly}
        style={{
          display: 'block', width: '100%', padding: readOnly ? '12px 40px 12px 14px' : '12px 14px', minHeight: '82px',
          border: `1.5px solid ${readOnly ? 'rgba(30,69,48,0.12)' : f ? T.gold : T.border}`, borderRadius: '12px', fontFamily: 'inherit',
          fontSize: '13px', color: readOnly ? T.tx4 : T.tx1, background: readOnly ? '#f0f0ee' : '#fff', outline: 'none', resize: readOnly ? 'none' : 'vertical', lineHeight: 1.6,
          boxShadow: f ? `0 0 0 3px ${T.goldFocus}` : 'none', cursor: readOnly ? 'not-allowed' : 'text', transition: 'border-color .2s,box-shadow .2s'
        }} />
      {readOnly && (
        <div style={{ position: 'absolute', right: '13px', top: '14px', opacity: 0.5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}
    </div>
  );
}

function SelectInput({ id, value, onChange, options, placeholder, hasError, readOnly }: {
  id: string; value: string; onChange: (v: string) => void; options: string[];
  placeholder?: string; hasError?: boolean; readOnly?: boolean;
}) {
  const [f, setF] = useState(false);
  return (
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
  );
}

function Pill({ label, checked, onClick, sub, disabled }: { label: string; checked: boolean; onClick: () => void; sub?: string; disabled?: boolean }) {
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
        {sub && <span style={{ fontSize: '11px', fontWeight: 600, color: T.tx4, marginLeft: '2px' }}>{sub}</span>}
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
      {sub && <span style={{ fontSize: '11px', fontWeight: 600, color: checked ? T.gold : T.tx4, marginLeft: '2px', transition: 'color .18s' }}>{sub}</span>}
    </button>
  );
}

function CheckItem({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  if (disabled) {
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 14px',
        borderRadius: '11px', cursor: 'not-allowed', background: checked ? 'rgba(45,106,79,0.03)' : '#fafafa',
        border: `1px solid ${checked ? 'rgba(45,106,79,0.1)' : 'rgba(30,69,48,0.05)'}`, opacity: 0.7
      }}>
        <span style={{
          width: '20px', height: '20px', minWidth: '20px', borderRadius: '5px', marginTop: '1px',
          border: `2px solid ${checked ? '#52b788' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: '#fff', background: checked ? '#52b788' : 'transparent', flexShrink: 0
        }}>{checked && '✔'}</span>
        <span style={{ fontSize: '13.5px', color: checked ? '#2d6a4f' : T.tx4, fontWeight: checked ? 600 : 400, lineHeight: 1.5 }}>{label}</span>
      </div>
    );
  }
  return (
    <div onClick={() => onChange(!checked)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 14px',
        borderRadius: '11px', cursor: 'pointer', transition: 'all .18s',
        background: checked ? 'rgba(45,106,79,0.06)' : hov ? '#fefaef' : 'transparent',
        border: `1px solid ${checked ? 'rgba(45,106,79,0.25)' : hov ? T.goldTint : 'transparent'}`,
        userSelect: 'none' as const
      }}>
      <span style={{
        width: '20px', height: '20px', minWidth: '20px', borderRadius: '5px', marginTop: '1px',
        border: `2px solid ${checked ? '#2d6a4f' : T.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color: '#fff', background: checked ? '#2d6a4f' : 'transparent',
        transition: 'all .18s', flexShrink: 0
      }}>{checked && '✔'}</span>
      <span style={{ fontSize: '13.5px', color: checked ? '#1e4530' : T.tx1, fontWeight: checked ? 600 : 400, lineHeight: 1.5, transition: 'all .18s' }}>{label}</span>
    </div>
  );
}

function ErrHint({ msg }: { msg: string }) {
  return <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: T.err, marginTop: '5px', fontWeight: 500 }}>⚠ {msg}</p>;
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>{children}</div>;
}

// ─── Collapsible Question Guide ───────────────────────────────────────────────

function QuestionGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: '14px', border: `1px solid ${T.goldTint}`, background: '#fff', marginBottom: '16px', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', gap: '12px'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f8edc0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: T.tx1, lineHeight: 1.2 }}>Question Guide</p>
            <p style={{ fontSize: '10px', color: T.tx4, marginTop: '2px' }}>{open ? 'Click to collapse' : '7 questions — tap to expand before the call'}</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.tx4} strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: 'transform .25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${T.goldTint}` }}>
          <div style={{ margin: '14px 20px 0', padding: '10px 14px', background: '#f8edc0', borderRadius: '9px', fontSize: '12px', color: T.goldLabel, fontStyle: 'italic', lineHeight: 1.6 }}>
            Listen for what they reveal — not just what they say. Notes column is for your read on the answer, not a transcript.
          </div>
          <div style={{ overflowX: 'auto', padding: '14px 20px 18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '520px' }}>
              <thead>
                <tr style={{ background: '#1B3A2B' }}>
                  {['Question to ask', 'Why it matters', 'What to listen for'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: '10.5px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#d1fae5', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Q_GUIDE.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(30,69,48,0.08)', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={{ padding: '10px 12px', color: T.tx1, lineHeight: 1.55, verticalAlign: 'top', maxWidth: '220px' }}>{row.q}</td>
                    <td style={{ padding: '10px 12px', color: T.tx3, lineHeight: 1.55, verticalAlign: 'top', maxWidth: '170px' }}>{row.why}</td>
                    <td style={{ padding: '10px 12px', color: T.tx4, lineHeight: 1.55, verticalAlign: 'top', maxWidth: '190px', fontStyle: 'italic' }}>{row.listen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(30,69,48,0.06)', borderRadius: '12px', padding: '5px', gap: '4px', marginBottom: '24px' }}>
      {STEPS.map(s => {
        const done = s.num < current, active = s.num === current;
        return (
          <div key={s.num} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '9px',
            overflow: 'hidden', minWidth: 0, transition: 'all .25s',
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
            <div className="kcc2-sb-hint" style={{ overflow: 'hidden', minWidth: 0 }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: active ? '#1e4530' : done ? '#2d8a4e' : T.tx4
              }}>{(s as any).label}{(s as any).required && <span style={{ color: T.err, marginLeft: '3px', fontSize: '10px' }}>✱</span>}</p>
              {active && <p style={{ fontSize: '10px', color: T.tx4, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.hint}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Form Card ────────────────────────────────────────────────────────────────

function FormCard({ children, dark, mb }: { children: React.ReactNode; dark?: boolean; mb?: string }) {
  return (
    <div className="kcc2-card" style={{
      background: dark ? `linear-gradient(135deg,${T.g1},${T.g3})` : T.cardBg,
      border: `1px solid ${dark ? 'rgba(201,168,76,0.2)' : 'rgba(30,69,48,0.09)'}`,
      marginBottom: mb || '16px'
    }}>
      {!dark && <div style={{
        position: 'absolute', top: '20px', left: 0, bottom: '20px', width: '3px',
        background: `linear-gradient(180deg,${T.gold},#edd07a 50%,transparent)`, borderRadius: '0 3px 3px 0'
      }} />}
      {children}
    </div>
  );
}

function CardHeading({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.5px solid rgba(30,69,48,0.09)' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: '#f8edc0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon === 'check' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          : icon === 'notes' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            : icon === 'star' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              : icon === 'shield' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                : icon === 'users' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  : icon === 'coin' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-5.82 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
      </div>
      <div>
        <p style={{ fontSize: '11.5px', letterSpacing: '.13em', textTransform: 'uppercase', fontWeight: 700, color: T.tx1, lineHeight: 1.2 }}>{title}</p>
        {sub && <p style={{ fontSize: '10px', color: T.tx4, marginTop: '2px' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Score Section ────────────────────────────────────────────────────────────

function ScoreSection({ groupKey, form, set, locked, errors = {} }: { groupKey: keyof typeof SCORE_GROUPS; form: Part2Data; set: (k: any, v: any) => void; locked: Set<string>; errors?: Partial<Record<keyof Part2Data, string>> }) {
  const grp = SCORE_GROUPS[groupKey];
  const subTotal = grp.rows.reduce((acc, row) => {
    const v = form[row.field as keyof Part2Data] as string;
    return acc + (v ? parseInt(v) : 0);
  }, 0);
  return (
    <FormCard>
      <CardHeading icon={grp.icon} title={grp.heading} sub={`max ${grp.maxPts} pts`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {grp.rows.map(row => {
          const fieldErr = errors[row.field as keyof Part2Data];
          return (
            <div key={row.field}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <SL required>{row.label}</SL>
                {fieldErr && !form[row.field as keyof Part2Data] && (
                  <span style={{ fontSize: '9px', color: T.err, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>✱ Required</span>
                )}
              </div>
              <PillRow>
                {row.opts.map(opt => (
                  <Pill key={opt.v} label={opt.l} sub={opt.p}
                    checked={form[row.field as keyof Part2Data] === opt.v}
                    disabled={locked.has(row.field)}
                    onClick={() => set(row.field, form[row.field as keyof Part2Data] === opt.v ? '' : opt.v)} />
                ))}
              </PillRow>
              {fieldErr && !form[row.field as keyof Part2Data] && (
                <div style={{ marginTop: '6px', padding: '6px 10px', background: T.errBg, borderRadius: '8px', border: `1px solid rgba(181,42,28,0.15)` }}>
                  <ErrHint msg={fieldErr} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'right', marginTop: '14px', fontSize: '12px', fontWeight: 600, color: T.goldLabel }}>
        Sub-total: <span style={{ fontSize: '15px' }}>{subTotal}</span> / {grp.maxPts}
      </div>
    </FormCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP PANELS
// ═══════════════════════════════════════════════════════════════════════════════

function Step5Panel({ form, set, errors, locked }: any) {
  return (
    <FormCard>
      <div className="kcc2-grid2">
        <div>
          <SL>Partner (auto-filled from Part 1)</SL>
          <TextInput id="partnerRef" value={form.partnerRef} onChange={v => set('partnerRef', v)}
            placeholder="Auto-filled" readOnly />
        </div>
        <div>
          <SL required>Call Date</SL>
          <TextInput type="date" id="callDate" value={form.callDate} onChange={v => set('callDate', v)}
            hasError={!!errors.callDate} readOnly={locked.has('callDate')} />
          {errors.callDate && <ErrHint msg={errors.callDate} />}
        </div>
      </div>
      <Divider />
      <div className="kcc2-grid2">
        <div>
          <SL required>Conducted by (Kairali Staff)</SL>
          <SelectInput id="conductedBy" value={form.conductedBy} onChange={v => set('conductedBy', v)}
            options={DECIDED_BY_OPTIONS} placeholder="Select staff member…" hasError={!!errors.conductedBy} readOnly={locked.has('conductedBy')} />
          {errors.conductedBy && <ErrHint msg={errors.conductedBy} />}

        </div>
        <div>
          <SL>Duration (H:M:S)</SL>
          <TextInput type="time" id="duration" value={form.duration} onChange={v => set('duration', v)} placeholder="00:00:00" step="1" readOnly={locked.has('duration')} />
        </div>
      </div>
    </FormCard>
  );
}

function Step6Panel({ form, set, locked }: any) {
  const fields = [
    { id: 'noteVolume', label: 'Volume mentioned (room nights / guests / groups per year)' },
    { id: 'noteAyurveda', label: 'Ayurveda / wellness experience — what have they sold before' },
    { id: 'noteClients', label: 'Clients described — nationalities, type, typical stay' },
    { id: 'noteImmediacy', label: 'Immediacy — do they have business right now or is this pipeline' },
    { id: 'noteExpectations', label: 'Expectations raised — what they said they need from us' },
    { id: 'noteRedFlags', label: 'Red flags or concerns (if any)' },
    { id: 'noteOther', label: 'Other observations — anything that stood out' },
  ];
  return (
    <div>
      <QuestionGuide />
      <FormCard>
        <div className="kcc2-notes">
          {fields.map(f => (
            <div key={f.id}>
              <SL>{f.label}</SL>
              <TextArea id={f.id} value={form[f.id as keyof Part2Data] as string}
                onChange={v => set(f.id, v)} placeholder="Fill details here" readOnly={locked.has(f.id)} />
            </div>
          ))}
        </div>
      </FormCard>
    </div>
  );
}

function Step7Panel({ form, set, errors, locked }: any) {
  const total = useMemo(() => computeTotal(form), [form]);
  const hasScoreErrors = SCORE_FIELDS.some(f => errors?.[f]);
  return (
    <div>
      {hasScoreErrors && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', marginBottom: '16px',
          background: T.errBg, border: `1px solid rgba(181,42,28,0.25)`, borderRadius: '11px'
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.err} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span style={{ fontSize: '12px', fontWeight: 600, color: T.err, lineHeight: 1.5 }}>
            Please score <strong>all criteria</strong> before proceeding. Incomplete rows are highlighted below.
          </span>
        </div>
      )}
      <ScoreSection groupKey="volume" form={form} set={set} locked={locked} errors={errors} />
      <ScoreSection groupKey="wellness" form={form} set={set} locked={locked} errors={errors} />
      <ScoreSection groupKey="relationship" form={form} set={set} locked={locked} errors={errors} />
      <div style={{
        background: `linear-gradient(135deg,${T.g1},${T.g3})`, borderRadius: '16px',
        padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', border: '1px solid rgba(201,168,76,0.2)'
      }}>
        <div>
          <p style={{ fontSize: '10px', letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Total Qualifying Score</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Updates as you score above</p>
        </div>
        <div>
          <span style={{ fontFamily: 'serif', fontSize: '52px', fontWeight: 600, color: '#edd07a', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}> / 100</span>
        </div>
      </div>
    </div>
  );
}

function Step8Panel({ form, set, errors, locked }: any) {
  const total = useMemo(() => computeTotal(form), [form]);
  const suggestedTier = getAutoTier(total);
  const suggestedComm = getAutoCommission(suggestedTier);
  return (
    <div>
      {/* Score summary + auto-suggestion banner */}
      <FormCard dark>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Qualifying Score</p>
            <p style={{ fontFamily: 'serif', fontSize: '52px', fontWeight: 600, color: '#edd07a', lineHeight: 1 }}>
              {total}<span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}> / 100</span>
            </p>
          </div>
          <div style={{
            padding: '12px 20px', borderRadius: '12px',
            background: total >= 75 ? 'rgba(45,138,78,0.25)' : total >= 50 ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.14)', fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '.05em', textTransform: 'uppercase'
          }}>
            {total >= 75 ? 'Tier 1 — Priority' : total >= 50 ? 'Tier 2 — Active' : total >= 30 ? 'Tier 3 — Emerging' : total > 0 ? 'Tier 4 — Watch' : '— not yet scored —'}
          </div>
        </div>
      </FormCard>

      {/* Auto-suggestion notice */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 18px', marginBottom: '16px',
        background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: '11px'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round" style={{ marginTop: '2px', flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
        <span style={{ fontSize: '12px', fontWeight: 600, color: T.goldLabel, lineHeight: 1.6 }}>
          Tier and commission have been <strong>auto-suggested</strong> based on your qualifying score of <strong>{total}/100</strong> → <strong>{TIER_OPTIONS.find(t => t.value === suggestedTier)?.label}</strong> · <strong>{suggestedComm.cat}</strong> · <strong>{suggestedComm.pct}%</strong>. You can override below if needed.
        </span>
      </div>

      <FormCard>
        <CardHeading icon="tier" title="Assign Tier" />
        <div className="kcc2-tier" style={{ marginBottom: '6px' }}>
          {TIER_OPTIONS.map(t => {
            const checked = form.assignedTier === t.value;
            const isSuggested = t.value === suggestedTier && !locked.has('assignedTier');
            const isDisabled = locked.has('assignedTier');
            return (
              <div key={t.value} onClick={() => !isDisabled && set('assignedTier', form.assignedTier === t.value ? '' : t.value)}
                style={{
                  padding: '16px', borderRadius: '12px', cursor: isDisabled ? 'not-allowed' : 'pointer',
                  border: `1.5px solid ${checked ? T.gold : isSuggested ? 'rgba(201,168,76,0.45)' : T.goldTint}`,
                  background: checked ? '#fefaef' : isSuggested ? 'rgba(201,168,76,0.04)' : isDisabled ? '#f8f8f8' : '#fff',
                  transition: 'all .18s', opacity: isDisabled && !checked ? 0.6 : 1, position: 'relative' as const
                }}>
                {isSuggested && !checked && (
                  <span style={{
                    position: 'absolute', top: '8px', right: '10px', fontSize: '9px', fontWeight: 700,
                    letterSpacing: '.08em', textTransform: 'uppercase', color: T.goldLabel,
                    background: '#f8edc0', padding: '2px 7px', borderRadius: '20px', border: `1px solid rgba(201,168,76,0.4)`
                  }}>Suggested</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
                  <span style={{
                    width: '17px', height: '17px', minWidth: '17px', borderRadius: '4px',
                    border: `2px solid ${checked ? T.gold : isDisabled ? '#ccc' : T.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#fff', background: checked ? T.gold : 'transparent', transition: 'all .18s', flexShrink: 0
                  }}>
                    {checked && '✔'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: checked ? '#1e4530' : T.tx4 }}>{t.label}</span>
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: checked ? T.tx1 : T.tx4, marginBottom: '4px' }}>{t.name}</p>
                <p style={{ fontSize: '11px', color: T.goldLabel, fontWeight: 600, marginBottom: '6px' }}>Score: {t.range}</p>
                <p style={{ fontSize: '11.5px', color: T.tx3, lineHeight: 1.5 }}>{t.desc}</p>
              </div>
            );
          })}
        </div>
        {errors.assignedTier && <ErrHint msg={errors.assignedTier} />}
      </FormCard>
      <FormCard>
        <CardHeading icon="coin" title="Commission Category & Rate" />
        <SL required>Commission category assigned</SL>
        <PillRow>
          {COMM_CATS.map(c => {
            const isSuggestedCat = c === suggestedComm.cat && !locked.has('commissionCat');
            return (
              <div key={c} style={{ position: 'relative' as const, display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px' }}>
                {isSuggestedCat && form.commissionCat !== c && (
                  <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: T.goldLabel, background: '#f8edc0', padding: '1px 6px', borderRadius: '20px', border: `1px solid rgba(201,168,76,0.4)` }}>Suggested</span>
                )}
                <Pill label={c} checked={form.commissionCat === c}
                  disabled={locked.has('commissionCat')}
                  onClick={() => {
                    const nextVal = form.commissionCat === c ? '' : c;
                    set('commissionCat', nextVal);
                    if (nextVal === 'Category A') set('commissionPct', '40');
                    else if (nextVal === 'Category B') set('commissionPct', '30');
                    else if (nextVal === 'Category C') set('commissionPct', '20');
                    else if (nextVal === 'On Hold') set('commissionPct', '0');
                    else set('commissionPct', '');
                  }} />
              </div>
            );
          })}
        </PillRow>
        {errors.commissionCat && <ErrHint msg={errors.commissionCat} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: '18px 0' }}>
          <div style={{ position: 'relative' }}>
            <input type="number" value={form.commissionPct} onChange={e => set('commissionPct', e.target.value)}
              placeholder="%" min={0} max={100} step={0.5}
              readOnly={locked.has('commissionPct') || !!form.commissionCat}
              style={{
                width: '90px', height: '48px', padding: '0 14px', textAlign: 'center',
                border: `1.5px solid ${(locked.has('commissionPct') || !!form.commissionCat) ? 'rgba(30,69,48,0.12)' : T.border}`, borderRadius: '12px', fontFamily: 'inherit',
                fontSize: '18px', fontWeight: 700,
                color: (locked.has('commissionPct') || !!form.commissionCat) ? T.tx4 : T.goldLabel, outline: 'none',
                background: (locked.has('commissionPct') || !!form.commissionCat) ? '#f0f0ee' : '#fff',
                cursor: (locked.has('commissionPct') || !!form.commissionCat) ? 'not-allowed' : 'text'
              }} />
            {(locked.has('commissionPct') || !!form.commissionCat) && (
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
            )}
          </div>
          <span style={{ fontSize: '12px', color: form.commissionCat === 'On Hold' ? T.err : !!form.commissionCat ? T.tx3 : T.tx4, fontStyle: 'italic', fontWeight: !!form.commissionCat ? 600 : 400 }}>
            {form.commissionCat === 'On Hold' ? '0% — no commission while on hold' : !!form.commissionCat ? `% rate — standard for ${form.commissionCat}` : '% rate — provisional, reviewed after 6 months'}
          </span>
        </div>
        <Divider />
        <div className="kcc2-grid2">
          <div>
            <SL required>Decided by (staff name)</SL>
            <SelectInput id="decidedBy" value={form.decidedBy}
              onChange={v => set('decidedBy', v)}
              options={DECIDED_BY_OPTIONS}
              placeholder="Select staff member…"
              hasError={!!errors.decidedBy}
              readOnly={locked.has('decidedBy')} />
            {errors.decidedBy && <ErrHint msg={errors.decidedBy} />}
          </div>
          <div>
            <SL required>Date decided</SL>
            <TextInput type="date" id="dateDecided" value={form.dateDecided} onChange={v => set('dateDecided', v)}
              hasError={!!errors.dateDecided} readOnly={locked.has('dateDecided')} />
            {errors.dateDecided && <ErrHint msg={errors.dateDecided} />}
          </div>
        </div>
        <div className="kcc2-grid2" style={{ marginTop: '18px' }}>
          <div>
            <SL>Review date (default: 6 months)</SL>
            <TextInput type="date" id="reviewDate" value={form.reviewDate} onChange={v => set('reviewDate', v)} readOnly={locked.has('reviewDate')} />
          </div>
          <div>
            <SL>Commission email sent on</SL>
            <TextInput type="date" id="commEmailDate" value={form.commEmailDate} onChange={v => set('commEmailDate', v)} readOnly={locked.has('commEmailDate')} />
          </div>
        </div>
      </FormCard>
    </div>
  );
}

function Step9Panel({ form, set, locked }: any) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 18px', marginBottom: '18px',
        background: '#f8edc0', border: '1px solid rgba(201,168,76,0.38)', borderRadius: '11px'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel} strokeWidth="2" strokeLinecap="round" style={{ marginTop: '2px', flexShrink: 0 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
        <span style={{ fontSize: '12px', fontWeight: 600, color: T.goldLabel, lineHeight: 1.6 }}>
          Send the commission confirmation email within 24 hours — state tier, %, properties covered, and 6-month review date. Attach rate card.
        </span>
      </div>
      <FormCard>
        <CardHeading icon="check" title="Actions Checklist" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ACTION_ITEMS.map(item => (
            <CheckItem key={item.field} label={item.label}
              checked={form[item.field] as boolean}
              disabled={locked.has(item.field)}
              onChange={v => set(item.field, v)} />
          ))}
        </div>
      </FormCard>
      <FormCard>
        <CardHeading icon="notes" title="Additional Notes" />
        <TextArea id="additionalNotes" value={form.additionalNotes}
          onChange={v => set('additionalNotes', v)} placeholder="Any other actions or notes" readOnly={locked.has('additionalNotes')} />
      </FormCard>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, form: Part2Data) {
  const e: Partial<Record<keyof Part2Data, string>> = {};
  if (step === 1) {
    if (!form.callDate) e.callDate = 'Please select the call date.';
    if (!form.conductedBy.trim()) e.conductedBy = 'Please enter staff name.';
  }
  if (step === 3) {
    SCORE_FIELDS.forEach(f => {
      if (!form[f]) e[f] = 'Please select a score for this criterion.';
    });
  }
  if (step === 4) {
    if (!form.assignedTier) e.assignedTier = 'Please assign a tier.';
    if (!form.commissionCat) e.commissionCat = 'Please select a commission category.';
    if (!form.decidedBy.trim()) e.decidedBy = 'Please select the deciding staff name.';
    if (!form.dateDecided) e.dateDecided = 'Please select the decision date.';
  }
  return e;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function Part2Modal({ isOpen, onClose, onSubmit, partnerName = '', initialData = {}, lockedFields = false, showSubmitButton = false }: Part2ModalProps) {
  const [form, setForm] = useState<Part2Data>({ ...EMPTY, partnerRef: partnerName });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Partial<Record<keyof Part2Data, string>>>({});
  const [saving, setSaving] = useState(false);

  // Locking logic
  const locked = useMemo(() => {
    const s = new Set<string>();
    if (lockedFields === true) {
      Object.keys(EMPTY).forEach(k => s.add(k));
    } else if (lockedFields instanceof Set) {
      lockedFields.forEach(f => s.add(f));
    }
    // Always lock partnerRef
    s.add('partnerRef');
    return s;
  }, [lockedFields]);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY,
        ...initialData,
        partnerRef: partnerName || (initialData as any)?.partnerRef || ''
      });
      setStep(1);
      setErrors({});
      setSaving(false);
    }
  }, [isOpen, partnerName, initialData]);

  useEffect(() => { if (!isOpen) return; const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [isOpen, onClose]);
  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);

  const set = useCallback(<K extends keyof Part2Data>(key: K, val: Part2Data[K]) => {
    if (locked.has(key as string)) return;
    setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: undefined }));
  }, [locked]);

  const goNext = () => {
    if (!lockedFields) {
      const errs = validateStep(step, form);
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    setErrors({});
    // Auto-suggest tier & commission when advancing from scoring step
    if (step === 3 && !lockedFields) {
      const total = computeTotal(form);
      const tier = getAutoTier(total);
      const comm = getAutoCommission(tier);
      setForm(p => ({
        ...p,
        assignedTier: p.assignedTier || tier,
        commissionCat: p.commissionCat || comm.cat,
        commissionPct: p.commissionPct || comm.pct,
      }));
    }
    setStep(s => Math.min(s + 1, 5));
  };
  const goBack = () => { setErrors({}); setStep(s => Math.max(s - 1, 1)); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
      setSaving(false);
      onClose();
    } catch (error) {
      console.error("Part 2 Save Error:", error);
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  const pp = { form, set, errors, locked };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 999, animation: 'kccFade .2s ease both' }} />

      <div role="dialog" aria-modal="true" className="kcc2-modal"
        style={{ animation: 'kccSlide .28s cubic-bezier(0.34,1.56,0.64,1) both' }}>

        {/* Header */}
        {/* <div className="kcc2-hdr" style={{
          background: T.hdrBg, height: '62px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid ${T.gold}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PhoneCall size={16} color={T.gold} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#f9fafb', lineHeight: 1.2 }}>Qualifying Conversation</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Part 2 · Step {step} of 5 · {STEPS[step - 1].label}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {['B2B NBD', 'Qualifying', 'TravelAgentFMS'].map(t => (
              <span key={t} style={{
                fontSize: '10px', padding: '2px 9px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '.04em'
              }} className="kcc2-tag">{t}</span>
            ))}
            <button onClick={onClose} style={{
              marginLeft: '6px', width: '30px', height: '30px', borderRadius: '7px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)'
            }}>
              <X size={14} />
            </button>
          </div>
        </div> */}

        <div className="kcc2-hdr" style={{
          background: T.hdrBg,
          height: '62px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `2px solid ${T.gold}`
        }}>
          {/* LEFT SIDE */}
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
              <PhoneCall size={16} color={T.gold} />
            </div>

            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#f9fafb',
                lineHeight: 1.2
              }}>
                Qualifying Conversation
              </p>

              <p style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '1px',
                letterSpacing: '.08em',
                textTransform: 'uppercase'
              }}>
                Part 2 · Step {step} of 5 · {STEPS[step - 1].label}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE (ONLY CLOSE BUTTON) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <button
              onClick={onClose}
              style={{
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
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="kcc2-body" style={{ flex: 1, overflowY: 'auto', background: T.pageBg }}>
          <StepBar current={step} />
          {step === 1 && <Step5Panel {...pp} />}
          {step === 2 && <Step6Panel {...pp} />}
          {step === 3 && <Step7Panel {...pp} />}
          {step === 4 && <Step8Panel {...pp} />}
          {step === 5 && <Step9Panel {...pp} />}
        </div>

        {/* Footer */}
        <div className="kcc2-footer" style={{
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
            {step < 5 ? (
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
                {saving ? (<><span style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'kccSpin .7s linear infinite' }} />Saving…</>) : (<>Submit Part 2 <ArrowRight size={13} /></>)}
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

export function Part2Button({ partnerName }: { partnerName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        padding: '0 18px', height: '38px', borderRadius: '8px', border: 'none', background: '#1E3A2F',
        color: '#fff', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
      }}>
        <PhoneCall size={14} /> Start Qualifying Call
      </button>
      <Part2Modal isOpen={open} onClose={() => setOpen(false)}
        onSubmit={() => {}} partnerName={partnerName} />
    </>
  );
}
