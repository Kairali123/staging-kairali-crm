'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactCaptureData {
  dateOfContact: string; capturedBy: string; howConnected: string[];
  eventPlatformReferrer: string; propertyInterest: string[];
  companyName: string; contactName: string; designation: string;
  mobile: string; email: string; city: string; country: string; website: string;
  companyType: string; marketServed: string[];
  enthusiasmLevel: string; businessPotential: string; keyThingsSaid: string;
  materialsShared: string; agreedNextStep: string; nextStepDate: string; whoFollowsUp: string;
  crmContactId: string; dateEnteredCrm: string; pipelineStage: string; assignedSalesOwner: string;
}

interface ContactCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactCaptureData) => void;
  initialData?: Partial<ContactCaptureData>;
  lockedFields?: boolean | Set<keyof ContactCaptureData>;
  showSubmitButton?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'How We Met', hint: 'Date, channel & first spark' },
  { num: 2, label: 'Who They Are', hint: 'Company & contact details' },
  { num: 3, label: 'First Impression', hint: 'Intent, potential & next step' },
  { num: 4, label: 'CRM Entry Log', hint: 'Office use after CRM entry' },
];

const HOW_CONNECTED = ['Trade fair', 'Event', 'Cold email', 'Inbound', 'Referral', 'LinkedIn', 'Social', 'Phone call', 'Other'];
const PROPERTY_INT = ['Kairali-The Ayurvedic Healing Village-Palakkad', 'Villa Raag Goa', 'Kairali Products', 'Kairali Centre', 'Kairali Equipments'];
const COMPANY_TYPES = ['Tour Operator', 'Travel Agent', 'DMC', 'Wellness Specialist', 'Corporate Travel', 'Unknown'];
const MARKETS_SERVED = ['Domestic India', 'Europe', 'USA / Canada', 'Middle East', 'International — Other', 'Mixed'];
const ENTHUSIASM_OPTS = ['Hot — wants to work now', 'Warm — exploring', 'Cold — collecting info', 'Unknown'];
const POTENTIAL_OPTS = ['High volume likely', 'Medium potential', 'Low / unclear', 'Too early to say'];
const NEXT_STEP_OPTS = ['Send brochure / info pack', 'Schedule qualifying call', 'Send rate card', 'Invite to FAM trip', 'No clear next step'];
const PIPELINE_STAGES = ['Lead', 'Prospect', 'Qualified'];

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


const EMPTY: ContactCaptureData = {
  dateOfContact: '', capturedBy: '', howConnected: [], eventPlatformReferrer: '', propertyInterest: [],
  companyName: '', contactName: '', designation: '', mobile: '', email: '', city: '', country: '', website: '',
  companyType: '', marketServed: [],
  enthusiasmLevel: '', businessPotential: '', keyThingsSaid: '', materialsShared: '',
  agreedNextStep: '', nextStepDate: '', whoFollowsUp: '',
  crmContactId: '', dateEnteredCrm: '', pipelineStage: '', assignedSalesOwner: '',
};

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  gold: '#c9a84c',
  goldTint: 'rgba(201,168,76,0.45)',
  goldFocus: 'rgba(201,168,76,0.12)',
  goldLabel: '#7b5d1b',
  pageBg: '#f5f3ee',
  cardBg: '#ffffff',
  border: 'rgba(30,69,48,0.18)',
  tx1: '#0d1a10',
  tx3: '#4d6356',
  tx4: '#7a9284',
  err: '#b52a1c',
  errBg: 'rgba(181,42,28,0.08)',
  hdrBg: '#1B3A2B',
  lockedBg: '#f0f0ee',
  lockedBorder: '#d0cdc8',
  lockedText: '#888880',
};

// ─── Responsive Hook ──────────────────────────────────────────────────────────

function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}

// ─── Primitive Components ─────────────────────────────────────────────────────

function SectionLabel({ children, required, lockedFields }: { children: React.ReactNode; required?: boolean; lockedFields?: boolean }) {
  return (
    <span style={{
      display: 'block', fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase',
      fontWeight: 700, color: T.goldLabel, marginBottom: '11px'
    }}>
      {children}
      {required && !lockedFields && <span style={{ color: T.err, marginLeft: '3px', fontSize: '9px' }}>✱</span>}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 0, margin: '22px 0', borderTop: '1px dashed rgba(168,168,168,0.6)' }} />;
}

function TextInput({ type = 'text', id, value, onChange, placeholder, hasError, locked }: {
  type?: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hasError?: boolean; locked?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  if (locked) {
    return (
      <div style={{ position: 'relative' }}>
        <input type={type} id={id} value={value} readOnly tabIndex={-1}
          style={{
            display: 'block', width: '100%', padding: '0 40px 0 14px', height: '48px',
            border: `1.5px solid ${T.lockedBorder}`, borderRadius: '12px', fontFamily: 'inherit',
            fontSize: '13.5px', color: T.lockedText, background: T.lockedBg,
            outline: 'none', cursor: 'not-allowed', boxShadow: 'none', boxSizing: 'border-box'
          }} />
        <svg style={{
          position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', width: '14px', height: '14px', color: T.lockedText, opacity: 0.6
        }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    );
  }
  return (
    <input type={type} id={id} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        display: 'block', width: '100%', padding: '0 14px', height: '48px',
        border: `1.5px solid ${hasError ? T.err : focus ? T.gold : T.border}`,
        borderRadius: '12px', fontFamily: 'inherit', fontSize: '13.5px', color: T.tx1,
        background: '#fff', outline: 'none', boxSizing: 'border-box',
        boxShadow: hasError ? `0 0 0 3px ${T.errBg}` : focus ? `0 0 0 3px ${T.goldFocus}` : 'none',
        transition: 'border-color .2s, box-shadow .2s'
      }} />
  );
}

function SelectInput({ id, value, onChange, options, hasError, locked }: {
  id: string; value: string; onChange: (v: string) => void; options: string[]; hasError?: boolean; locked?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  if (locked) {
    return (
      <div style={{ position: 'relative' }}>
        <div id={id} style={{
          display: 'flex', alignItems: 'center', width: '100%', padding: '0 40px 0 14px',
          height: '48px', border: `1.5px solid ${T.lockedBorder}`, borderRadius: '12px',
          fontFamily: 'inherit', fontSize: '13.5px', color: T.lockedText, background: T.lockedBg,
          cursor: 'not-allowed', boxSizing: 'border-box'
        }}>
          {value || '—'}
        </div>
        <svg style={{
          position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', width: '14px', height: '14px', color: T.lockedText, opacity: 0.6
        }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          display: 'block', width: '100%', padding: '0 36px 0 14px', height: '48px',
          border: `1.5px solid ${hasError ? T.err : focus ? T.gold : T.border}`,
          borderRadius: '12px', fontFamily: 'inherit', fontSize: '13.5px',
          color: value ? T.tx1 : T.tx4, background: '#fff', outline: 'none',
          appearance: 'none' as const, cursor: 'pointer', boxSizing: 'border-box',
          boxShadow: focus ? `0 0 0 3px ${T.goldFocus}` : 'none',
          transition: 'border-color .2s, box-shadow .2s'
        }}>
        <option value="" disabled>Select option…</option>

        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg style={{
        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', width: '14px', height: '14px', color: T.tx4
      }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

function PillOption({ label, checked, onClick, locked }: {
  label: string; checked: boolean; onClick: () => void; locked?: boolean;
}) {
  const [hov, setHov] = useState(false);
  if (locked) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '9px 16px',
        background: checked ? T.lockedBg : '#fafafa',
        border: `1.5px solid ${checked ? T.lockedBorder : 'rgba(200,200,200,0.5)'}`,
        borderRadius: '11px', cursor: 'not-allowed', userSelect: 'none' as const, opacity: checked ? 1 : 0.45
      }}>
        <span style={{
          width: '17px', height: '17px', minWidth: '17px', borderRadius: '4px',
          border: `2px solid ${checked ? T.lockedText : '#ccc'}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '11px', fontWeight: 700,
          color: '#fff', background: checked ? T.lockedText : 'transparent', flexShrink: 0
        }}>
          {checked && '✔'}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: T.lockedText, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '9px 16px',
        background: hov && !checked ? '#fefaef' : '#fff',
        border: `1.5px solid ${checked || hov ? T.gold : T.goldTint}`,
        borderRadius: '11px', cursor: 'pointer', userSelect: 'none' as const,
        transition: 'all .18s ease',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: hov ? '0 3px 10px rgba(201,168,76,0.18)' : 'none'
      }}>
      <span style={{
        width: '17px', height: '17px', minWidth: '17px',
        borderRadius: '4px',
        border: `2px solid ${T.gold}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '11px', fontWeight: 700,
        color: '#fff', background: checked ? T.gold : 'transparent',
        transition: 'all .18s ease', flexShrink: 0
      }}>
        {checked && '✔'}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: T.tx1, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  );
}

function ErrorHint({ msg }: { msg: string }) {
  return (
    <p style={{
      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px',
      color: T.err, marginTop: '5px', fontWeight: 500
    }}>⚠ {msg}</p>
  );
}

function Grid2({ children, isMobile }: { children: React.ReactNode; isMobile?: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? '14px' : '18px'
    }}>
      {children}
    </div>
  );
}

function PillGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>{children}</div>;
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepBar({ current, isMobile }: { current: number; isMobile: boolean }) {
  return (
    <div style={{
      display: 'flex',
      background: 'rgba(30,69,48,0.06)',
      borderRadius: '12px',
      padding: '5px',
      gap: '4px',
      marginBottom: '24px',
      overflowX: isMobile ? 'auto' : 'visible',
      WebkitOverflowScrolling: 'touch',
    }}>
      {STEPS.map(s => {
        const done = s.num < current, active = s.num === current;
        return (
          <div key={s.num} style={{
            flex: isMobile ? '0 0 auto' : 1,
            minWidth: isMobile ? (active ? '130px' : '42px') : 0,
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: isMobile ? '8px 10px' : '10px 12px',
            borderRadius: '9px', transition: 'all .25s ease', overflow: 'hidden',
            background: active ? '#fff' : done ? 'rgba(82,183,136,0.1)' : 'transparent',
            boxShadow: active ? '0 2px 10px rgba(7,22,14,0.10)' : 'none',
            border: active ? '1.5px solid rgba(201,168,76,0.25)' : done ? '1.5px solid rgba(82,183,136,0.25)' : '1.5px solid transparent'
          }}>
            <div style={{
              width: '24px', height: '24px', minWidth: '24px', borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 800, flexShrink: 0, transition: 'all .25s ease',
              background: active ? T.gold : done ? 'rgba(45,138,78,0.18)' : 'rgba(30,69,48,0.1)',
              color: active ? '#07160e' : done ? '#2d8a4e' : T.tx4
            }}>
              {done ? '✓' : s.num}
            </div>
            {(active || !isMobile) && (
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <p style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                  lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: active ? '#1e4530' : done ? '#2d8a4e' : T.tx4
                }}>{s.label}</p>
                {active && (
                  <p style={{
                    fontSize: '10px', color: T.tx4, marginTop: '1px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>{s.hint}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Form Card ────────────────────────────────────────────────────────────────

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: T.cardBg, borderRadius: '16px', padding: '28px 28px 24px',
      border: '1px solid rgba(30,69,48,0.09)', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: '20px', left: 0, bottom: '20px', width: '3px',
        background: `linear-gradient(180deg,${T.gold},#edd07a 50%,transparent)`,
        borderRadius: '0 3px 3px 0'
      }} />
      {children}
    </div>
  );
}

// ─── Step Panels ──────────────────────────────────────────────────────────────

function Step1Panel({ form, set, toggleMulti, errors, locked, lockedFields, isMobile }: any) {
  return (
    <FormCard>
      <Grid2 isMobile={isMobile}>
        <div>
          <SectionLabel required lockedFields={lockedFields}>Date of First Contact</SectionLabel>
          <TextInput type="date" id="dateOfContact" value={form.dateOfContact}
            onChange={v => set('dateOfContact', v)} hasError={!!errors.dateOfContact}
            locked={locked.has('dateOfContact')} />
          {errors.dateOfContact && <ErrorHint msg={errors.dateOfContact} />}
        </div>
        <div>
          <SectionLabel required lockedFields={lockedFields}>Captured by (Kairali Staff)</SectionLabel>
          <SelectInput id="capturedBy" value={form.capturedBy} onChange={v => set('capturedBy', v)}
            options={STAFF_OPTIONS} hasError={!!errors.capturedBy}
            locked={locked.has('capturedBy')} />
          {errors.capturedBy && <ErrorHint msg={errors.capturedBy} />}

        </div>
      </Grid2>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>How did we connect?</SectionLabel>
        <PillGroup>
          {HOW_CONNECTED.map(o => (
            <PillOption key={o} label={o} checked={form.howConnected.includes(o)}
              onClick={() => !locked.has('howConnected') && toggleMulti('howConnected', o)}
              locked={locked.has('howConnected')} />
          ))}
        </PillGroup>
        {errors.howConnected && <ErrorHint msg={errors.howConnected} />}
      </div>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>Event / Platform / Referrer Name</SectionLabel>
        <TextInput id="eventPlatformReferrer" value={form.eventPlatformReferrer}
          onChange={v => set('eventPlatformReferrer', v)} placeholder="Enter details here"
          hasError={!!errors.eventPlatformReferrer} locked={locked.has('eventPlatformReferrer')} />
        {errors.eventPlatformReferrer && <ErrorHint msg={errors.eventPlatformReferrer} />}
      </div>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>Property Interest Mentioned</SectionLabel>
        <PillGroup>
          {PROPERTY_INT.map(o => (
            <PillOption key={o} label={o} checked={form.propertyInterest.includes(o)}
              onClick={() => !locked.has('propertyInterest') && toggleMulti('propertyInterest', o)}
              locked={locked.has('propertyInterest')} />
          ))}
        </PillGroup>
        {errors.propertyInterest && <ErrorHint msg={errors.propertyInterest} />}
      </div>
    </FormCard>
  );
}

function Step2Panel({ form, set, toggleMulti, errors, locked, lockedFields, isMobile }: any) {
  return (
    <FormCard>
      <Grid2 isMobile={isMobile}>
        <div>
          <SectionLabel required lockedFields={lockedFields}>Company / Agency Name</SectionLabel>
          <TextInput id="companyName" value={form.companyName} onChange={v => set('companyName', v)}
            placeholder="Enter details here" hasError={!!errors.companyName} locked={locked.has('companyName')} />
          {errors.companyName && <ErrorHint msg={errors.companyName} />}
        </div>
        <div>
          <SectionLabel required lockedFields={lockedFields}>Contact Person Name</SectionLabel>
          <TextInput id="contactName" value={form.contactName} onChange={v => set('contactName', v)}
            placeholder="Enter details here" hasError={!!errors.contactName} locked={locked.has('contactName')} />
          {errors.contactName && <ErrorHint msg={errors.contactName} />}
        </div>
      </Grid2>
      <div style={{ marginTop: '18px' }}>
        <Grid2 isMobile={isMobile}>
          <div>
            <SectionLabel lockedFields={lockedFields}>Designation / Role</SectionLabel>
            <TextInput id="designation" value={form.designation} onChange={v => set('designation', v)}
              placeholder="Enter details here" locked={locked.has('designation')} />
          </div>
          <div>
            <SectionLabel required lockedFields={lockedFields}>Mobile / WhatsApp</SectionLabel>
            <TextInput type="tel" id="mobile" value={form.mobile} onChange={v => set('mobile', v)}
              placeholder="Enter details here" hasError={!!errors.mobile} locked={locked.has('mobile')} />
            {errors.mobile && <ErrorHint msg={errors.mobile} />}
          </div>
        </Grid2>
      </div>
      <div style={{ marginTop: '18px' }}>
        <Grid2 isMobile={isMobile}>
          <div>
            <SectionLabel required lockedFields={lockedFields}>Email Address</SectionLabel>
            <TextInput type="email" id="email" value={form.email} onChange={v => set('email', v)}
              placeholder="Enter details here" hasError={!!errors.email} locked={locked.has('email')} />
            {errors.email && <ErrorHint msg={errors.email} />}
          </div>
          <div>
            <SectionLabel lockedFields={lockedFields}>City</SectionLabel>
            <TextInput id="city" value={form.city} onChange={v => set('city', v)}
              placeholder="Enter details here" locked={locked.has('city')} />
          </div>
        </Grid2>
      </div>
      <div style={{ marginTop: '18px' }}>
        <Grid2 isMobile={isMobile}>
          <div>
            <SectionLabel required lockedFields={lockedFields}>Country</SectionLabel>
            <TextInput id="country" value={form.country} onChange={v => set('country', v)}
              placeholder="Enter details here" hasError={!!errors.country} locked={locked.has('country')} />
            {errors.country && <ErrorHint msg={errors.country} />}
          </div>
          <div>
            <SectionLabel lockedFields={lockedFields}>Website (if known)</SectionLabel>
            <TextInput type="url" id="website" value={form.website} onChange={v => set('website', v)}
              placeholder="Enter details here" locked={locked.has('website')} />
          </div>
        </Grid2>
      </div>
      <Divider />
      <div>
        <SectionLabel lockedFields={lockedFields}>Type of Company (gut feel)</SectionLabel>
        <PillGroup>
          {COMPANY_TYPES.map(o => (
            <PillOption key={o} label={o} checked={form.companyType === o}
              onClick={() => !locked.has('companyType') && set('companyType', form.companyType === o ? '' : o)}
              locked={locked.has('companyType')} />
          ))}
        </PillGroup>
      </div>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>Market they serve</SectionLabel>
        <PillGroup>
          {MARKETS_SERVED.map(o => (
            <PillOption key={o} label={o} checked={form.marketServed.includes(o)}
              onClick={() => !locked.has('marketServed') && toggleMulti('marketServed', o)}
              locked={locked.has('marketServed')} />
          ))}
        </PillGroup>
        {errors.marketServed && <ErrorHint msg={errors.marketServed} />}
      </div>
    </FormCard>
  );
}

function Step3Panel({ form, set, errors, locked, lockedFields, isMobile }: any) {
  return (
    <FormCard>
      <div>
        <SectionLabel required lockedFields={lockedFields}>Initial enthusiasm / intent level</SectionLabel>
        <PillGroup>
          {ENTHUSIASM_OPTS.map(o => (
            <PillOption key={o} label={o} checked={form.enthusiasmLevel === o}
              onClick={() => !locked.has('enthusiasmLevel') && set('enthusiasmLevel', form.enthusiasmLevel === o ? '' : o)}
              locked={locked.has('enthusiasmLevel')} />
          ))}
        </PillGroup>
        {errors.enthusiasmLevel && <ErrorHint msg={errors.enthusiasmLevel} />}
      </div>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>Rough business potential</SectionLabel>
        <PillGroup>
          {POTENTIAL_OPTS.map(o => (
            <PillOption key={o} label={o} checked={form.businessPotential === o}
              onClick={() => !locked.has('businessPotential') && set('businessPotential', form.businessPotential === o ? '' : o)}
              locked={locked.has('businessPotential')} />
          ))}
        </PillGroup>
        {errors.businessPotential && <ErrorHint msg={errors.businessPotential} />}
      </div>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>Key things said / anything notable from the conversation</SectionLabel>
        <TextInput id="keyThingsSaid" value={form.keyThingsSaid} onChange={v => set('keyThingsSaid', v)}
          placeholder="Fill details here" hasError={!!errors.keyThingsSaid} locked={locked.has('keyThingsSaid')} />
        {errors.keyThingsSaid && <ErrorHint msg={errors.keyThingsSaid} />}
      </div>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>Materials shared with them</SectionLabel>
        <TextInput id="materialsShared" value={form.materialsShared} onChange={v => set('materialsShared', v)}
          placeholder="Fill details here" hasError={!!errors.materialsShared} locked={locked.has('materialsShared')} />
        {errors.materialsShared && <ErrorHint msg={errors.materialsShared} />}
      </div>
      <Divider />
      <div>
        <SectionLabel required lockedFields={lockedFields}>Agreed next step</SectionLabel>
        <PillGroup>
          {NEXT_STEP_OPTS.map(o => (
            <PillOption key={o} label={o} checked={form.agreedNextStep === o}
              onClick={() => !locked.has('agreedNextStep') && set('agreedNextStep', form.agreedNextStep === o ? '' : o)}
              locked={locked.has('agreedNextStep')} />
          ))}
        </PillGroup>
        {errors.agreedNextStep && <ErrorHint msg={errors.agreedNextStep} />}
      </div>
      <Divider />
      <Grid2 isMobile={isMobile}>
        <div>
          <SectionLabel required lockedFields={lockedFields}>Next step date / deadline</SectionLabel>
          <TextInput type="date" id="nextStepDate" value={form.nextStepDate}
            onChange={v => set('nextStepDate', v)} hasError={!!errors.nextStepDate}
            locked={locked.has('nextStepDate')} />
          {errors.nextStepDate && <ErrorHint msg={errors.nextStepDate} />}
        </div>
        <div>
          <SectionLabel required lockedFields={lockedFields}>Who follows up (Kairali staff)</SectionLabel>
          <SelectInput id="whoFollowsUp" value={form.whoFollowsUp} onChange={v => set('whoFollowsUp', v)}
            options={STAFF_OPTIONS} hasError={!!errors.whoFollowsUp} locked={locked.has('whoFollowsUp')} />
          {errors.whoFollowsUp && <ErrorHint msg={errors.whoFollowsUp} />}

        </div>
      </Grid2>
    </FormCard>
  );
}

function Step4Panel({ form, set, errors, locked, lockedFields, isMobile }: any) {
  return (
    <>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 18px',
        marginBottom: '18px', background: '#f8edc0', border: '1px solid rgba(201,168,76,0.38)',
        borderRadius: '11px'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldLabel}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
        <span style={{ fontSize: '12px', fontWeight: 600, color: T.goldLabel, letterSpacing: '.04em' }}>
          Office Use Only — complete after CRM entry is done
        </span>
      </div>
      <FormCard>
        <Grid2 isMobile={isMobile}>
          <div>
            <SectionLabel lockedFields={lockedFields}>CRM Contact ID</SectionLabel>
            <TextInput id="crmContactId" value={form.crmContactId} onChange={v => set('crmContactId', v)}
              placeholder="Fill details here" locked={locked.has('crmContactId')} />
          </div>
          <div>
            <SectionLabel lockedFields={lockedFields}>Date Entered into CRM</SectionLabel>
            <TextInput type="date" id="dateEnteredCrm" value={form.dateEnteredCrm}
              onChange={v => set('dateEnteredCrm', v)} locked={locked.has('dateEnteredCrm')} />
          </div>
        </Grid2>
        <div style={{ marginTop: '18px' }}>
          <Grid2 isMobile={isMobile}>
            <div>
              <SectionLabel required lockedFields={lockedFields}>Pipeline Stage Assigned</SectionLabel>
              <SelectInput id="pipelineStage" value={form.pipelineStage} onChange={v => set('pipelineStage', v)}
                options={PIPELINE_STAGES} hasError={!!errors.pipelineStage} locked={locked.has('pipelineStage')} />
              {errors.pipelineStage && <ErrorHint msg={errors.pipelineStage} />}
            </div>
            <div>
              <SectionLabel lockedFields={lockedFields}>Assigned Sales Owner</SectionLabel>
              <TextInput id="assignedSalesOwner" value={form.assignedSalesOwner}
                onChange={v => set('assignedSalesOwner', v)} placeholder="Fill details here"
                locked={locked.has('assignedSalesOwner')} />
            </div>
          </Grid2>
        </div>
      </FormCard>
    </>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(
  step: number,
  form: ContactCaptureData,
  locked: Set<keyof ContactCaptureData>
) {
  const e: Partial<Record<keyof ContactCaptureData, string>> = {};
  const skip = (key: keyof ContactCaptureData) => locked.has(key);

  if (step === 1) {
    if (!skip('dateOfContact') && !form.dateOfContact)
      e.dateOfContact = 'Please select the contact date.';
    if (!skip('capturedBy') && !form.capturedBy.trim())
      e.capturedBy = 'Please enter your name.';
    if (!skip('howConnected') && !form.howConnected.length)
      e.howConnected = 'Please select how you connected.';
    if (!skip('eventPlatformReferrer') && !form.eventPlatformReferrer.trim())
      e.eventPlatformReferrer = 'Please enter event / platform / referrer.';
    if (!skip('propertyInterest') && !form.propertyInterest.length)
      e.propertyInterest = 'Please select at least one property.';
  }
  if (step === 2) {
    if (!skip('companyName') && !form.companyName.trim())
      e.companyName = 'Please enter company name.';
    if (!skip('contactName') && !form.contactName.trim())
      e.contactName = 'Please enter contact person name.';
    if (!skip('mobile') && !form.mobile.trim())
      e.mobile = 'Please enter mobile number.';
    if (!skip('email') && !form.email.trim())
      e.email = 'Please enter email address.';
    if (!skip('country') && !form.country.trim())
      e.country = 'Please enter country.';
    if (!skip('marketServed') && !form.marketServed.length)
      e.marketServed = 'Please select market served.';
  }
  if (step === 3) {
    if (!skip('enthusiasmLevel') && !form.enthusiasmLevel)
      e.enthusiasmLevel = 'Please select enthusiasm level.';
    if (!skip('businessPotential') && !form.businessPotential)
      e.businessPotential = 'Please select business potential.';
    if (!skip('keyThingsSaid') && !form.keyThingsSaid.trim())
      e.keyThingsSaid = 'Please fill in key things said.';
    if (!skip('materialsShared') && !form.materialsShared.trim())
      e.materialsShared = 'Please fill in materials shared.';
    if (!skip('agreedNextStep') && !form.agreedNextStep)
      e.agreedNextStep = 'Please select agreed next step.';
    if (!skip('nextStepDate') && !form.nextStepDate)
      e.nextStepDate = 'Please select a next step date.';
    if (!skip('whoFollowsUp') && !form.whoFollowsUp.trim())
      e.whoFollowsUp = 'Please enter who follows up.';
  }
  if (step === 4) {
    if (!skip('pipelineStage') && !form.pipelineStage)
      e.pipelineStage = 'Please select a pipeline stage.';
  }
  return e;
}
// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ContactCaptureModal({ isOpen, onClose, onSubmit, initialData, lockedFields, showSubmitButton = false }: ContactCaptureModalProps) {
  const [form, setForm] = useState<ContactCaptureData>(EMPTY);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactCaptureData, string>>>({});
  const [saving, setSaving] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();

  const ALWAYS_EDITABLE = new Set<keyof ContactCaptureData>([
    'howConnected', 'propertyInterest', 'companyType', 'enthusiasmLevel',
    'businessPotential', 'whoFollowsUp', 'nextStepDate', 'pipelineStage',
  ]);

  const allKeys = Object.keys(EMPTY) as (keyof ContactCaptureData)[];
  const locked = new Set<keyof ContactCaptureData>(
    lockedFields === true
      ? allKeys
      : lockedFields instanceof Set
        ? [...lockedFields]
        : Object.entries(initialData ?? {})
          .filter(([, v]) => {
            if (Array.isArray(v)) return v.length > 0;
            return v !== '' && v !== null && v !== undefined;
          })
          .map(([k]) => k as keyof ContactCaptureData)
          .filter(k => !ALWAYS_EDITABLE.has(k))
  );

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY, ...initialData });
      setStep(1);
      setErrors({});
      setSaving(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const set = useCallback(<K extends keyof ContactCaptureData>(key: K, val: ContactCaptureData[K]) => {
    if (locked.has(key)) return;
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: undefined }));
  }, [locked]);

  const toggleMulti = useCallback(
    (field: 'howConnected' | 'propertyInterest' | 'marketServed', val: string) => {
      if (locked.has(field)) return;
      setForm(p => {
        const cur = p[field] as string[];
        return { ...p, [field]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
      });
      setErrors(p => ({ ...p, [p.hasOwnProperty(field) ? field : (field as keyof ContactCaptureData)]: undefined }));
    }, [locked]);

  const goNext = () => {
    // ✅ Always validate — pass locked so individually-locked fields are skipped
    const errs = validateStep(step, form, locked);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => Math.min(s + 1, 4));
  };
  const goBack = () => { setErrors({}); setStep(s => Math.max(s - 1, 1)); };
  const handleSave = async () => {
    const errs = validateStep(4, form, locked);  // ← pass locked here too
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSubmit(form);
      setSaving(false);
      onClose();
    } catch (error) {
      console.error("Part 1 Save Error:", error);
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const panelProps = { form, set, toggleMulti, errors, locked, lockedFields, isMobile };

  // Responsive modal dimensions
  const modalWidth = isMobile ? '100vw' : isTablet ? '94vw' : '82vw';
  const modalMaxWidth = isMobile ? '100vw' : isTablet ? '100%' : '1000px';
  const modalHeight = isMobile ? '100dvh' : isTablet ? '95vh' : '82vh';
  const modalTop = isMobile ? '0' : '50%';
  const modalLeft = isMobile ? '0' : '50%';
  const modalTransform = isMobile ? 'none' : 'translate(-50%,-50%)';
  const modalBorderRadius = isMobile ? '0' : '20px';
  const bodyPadding = isMobile ? '16px' : '24px 28px';
  const headerPadding = isMobile ? '0 16px' : '0 28px';
  const footerPadding = isMobile ? '12px 16px' : '14px 28px';

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)', zIndex: 999, animation: 'kccFade .2s ease both'
      }} />

      <div role="dialog" aria-modal="true" aria-label="Contact Capture"
        style={{
          position: 'fixed',
          top: modalTop,
          left: modalLeft,
          transform: modalTransform,
          width: modalWidth,
          maxWidth: modalMaxWidth,
          height: modalHeight,
          zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          borderRadius: modalBorderRadius,
          overflow: 'hidden',
          boxShadow: isMobile ? 'none' : '0 32px 80px rgba(0,0,0,0.45)',
          animation: isMobile
            ? 'kccSlideUp .28s cubic-bezier(0.34,1.2,0.64,1) both'
            : 'kccSlide .28s cubic-bezier(0.34,1.56,0.64,1) both'
        }}>

        {/* Header */}
        <div style={{
          background: T.hdrBg,
          padding: headerPadding,
          height: isMobile ? '56px' : '62px',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid ${T.gold}`
        }}>
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.35)'
            }}>
              <UserPlus size={16} color={T.gold} />
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 700, color: '#f9fafb', lineHeight: 1.2 }}>
                Contact Capture
              </p>
              <p style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px',
                letterSpacing: '.08em', textTransform: 'uppercase'
              }}>
                Step {step} of 4 · {STEPS[step - 1].label}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {!isMobile && ['B2B NBD', 'CRR Follow-up', 'TravelAgentFMS'].map(t => (
              <span key={t} style={{
                fontSize: '10px', padding: '2px 9px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '.04em'
              }}>{t}</span>
            ))}
            <button onClick={onClose}
              style={{
                marginLeft: '6px', width: '30px', height: '30px', borderRadius: '7px',
                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)'
              }}>
              <X size={14} />
            </button>
          </div> */}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.35)'
            }}>
              <UserPlus size={16} color={T.gold} />
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 700, color: '#f9fafb', lineHeight: 1.2 }}>
                Contact Capture
              </p>
              <p style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px',
                letterSpacing: '.08em', textTransform: 'uppercase'
              }}>
                Step {step} of 4 · {STEPS[step - 1].label}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <button onClick={onClose}
              style={{
                marginLeft: '6px', width: '30px', height: '30px', borderRadius: '7px',
                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)'
              }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: 'auto', background: T.pageBg, padding: bodyPadding,
          WebkitOverflowScrolling: 'touch'
        }}>
          <StepBar current={step} isMobile={isMobile} />
          {step === 1 && <Step1Panel {...panelProps} />}
          {step === 2 && <Step2Panel {...panelProps} />}
          {step === 3 && <Step3Panel {...panelProps} />}
          {step === 4 && <Step4Panel {...panelProps} />}
        </div>

        {/* Footer */}
        <div style={{
          background: '#fff', padding: footerPadding, flexShrink: 0,
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', gap: isMobile ? '10px' : '0',
          borderTop: '1px solid rgba(30,69,48,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '11px', color: T.tx4 }}>
              Fields marked <span style={{ color: T.err }}>✱</span> are required
            </p>
            {locked.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '20px', height: '12px', borderRadius: '3px',
                    background: T.lockedBg, border: `1px solid ${T.lockedBorder}`
                  }} />
                  <span style={{ fontSize: '10px', color: T.lockedText, fontWeight: 600, letterSpacing: '.05em' }}>
                    Pre-filled · locked
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '20px', height: '12px', borderRadius: '3px',
                    background: '#fff', border: `1px solid ${T.gold}`
                  }} />
                  <span style={{ fontSize: '10px', color: T.goldLabel, fontWeight: 600, letterSpacing: '.05em' }}>
                    Editable · fill this
                  </span>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            {step > 1 ? (
              <button onClick={goBack}
                style={{
                  height: '40px', padding: '0 20px', borderRadius: '10px',
                  border: `1.5px solid ${T.border}`, background: 'transparent', fontFamily: 'inherit',
                  fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
                  color: T.tx3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
                  flex: isMobile ? 1 : 'none'
                }}>
                <ArrowLeft size={13} /> Back
              </button>
            ) : (
              <button onClick={onClose}
                style={{
                  height: '40px', padding: '0 20px', borderRadius: '10px',
                  border: `1.5px solid ${T.border}`, background: 'transparent', fontFamily: 'inherit',
                  fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
                  color: T.tx3, cursor: 'pointer', flex: isMobile ? 1 : 'none'
                }}>Cancel</button>
            )}
            {step < 4 ? (
              <button onClick={goNext}
                style={{
                  height: '40px', padding: '0 26px', borderRadius: '10px', border: 'none',
                  background: '#1e4530', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '.07em', textTransform: 'uppercase', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  flex: isMobile ? 2 : 'none'
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  flex: isMobile ? 2 : 'none'
                }}>
                {saving ? (
                  <><span style={{
                    width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                    animation: 'kccSpin .7s linear infinite'
                  }} />Saving…</>
                ) : (
                  <>Save Contact <ArrowRight size={13} /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes kccFade    { from{opacity:0}to{opacity:1} }
        @keyframes kccSlide   { from{opacity:0;transform:translate(-50%,calc(-50% + 20px)) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes kccSlideUp { from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)} }
        @keyframes kccSpin    { to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}

// ─── Trigger Button ───────────────────────────────────────────────────────────

export function ContactCaptureButton() {
  const [open, setOpen] = useState(false);
  const handleSubmit = (_data: ContactCaptureData) => {};
  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '0 18px',
          height: '38px', borderRadius: '8px', border: 'none', background: '#1E3A2F',
          color: '#fff', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', letterSpacing: '.03em'
        }}>
        <UserPlus size={14} /> + Add New Contact
      </button>
      <ContactCaptureModal isOpen={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} />
    </>
  );
}
