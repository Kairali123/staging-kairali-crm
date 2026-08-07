'use client';

// src/app/partners/[id]/page.tsx
// ?mode=view  → all fields filled, readonly, no submit button
// ?mode=edit  → all fields editable, submit updates same row in sheet

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Pencil,
    Eye,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

// ─── Field definitions (same order / keys as form) ────────────────
const SECTIONS = [
    {
        title: 'How We Met',
        fields: [
            { key: 'dateOfContact', label: 'Date of First Contact', type: 'date' },
            { key: 'capturedBy', label: 'Captured By', type: 'text' },
            { key: 'howConnected', label: 'How We Connected', type: 'text' },
            { key: 'eventPlatformReferrer', label: 'Event / Platform / Referrer', type: 'text' },
            { key: 'propertyInterest', label: 'Property Interest', type: 'text' },
        ],
    },
    {
        title: 'Who They Are',
        fields: [
            { key: 'companyName', label: 'Company / Agency Name', type: 'text' },
            { key: 'contactName', label: 'Contact Person Name', type: 'text' },
            { key: 'designation', label: 'Designation / Role', type: 'text' },
            { key: 'mobile', label: 'Mobile / WhatsApp', type: 'tel' },
            { key: 'email', label: 'Email Address', type: 'email' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'website', label: 'Website', type: 'url' },
            { key: 'companyType', label: 'Type of Company', type: 'text' },
            { key: 'marketServed', label: 'Market They Serve', type: 'text' },
        ],
    },
    {
        title: 'First Impression',
        fields: [
            { key: 'enthusiasmLevel', label: 'Initial Enthusiasm Level', type: 'select', options: ['Hot', 'Warm', 'Cool', 'Cold'] },
            { key: 'businessPotential', label: 'Rough Business Potential', type: 'select', options: ['High', 'Medium', 'Low', 'Unknown'] },
            { key: 'keyThingsSaid', label: 'Key Things Said', type: 'textarea' },
            { key: 'materialsShared', label: 'Materials Shared', type: 'text' },
            { key: 'agreedNextStep', label: 'Agreed Next Step', type: 'text' },
            { key: 'nextStepDate', label: 'Next Step Date', type: 'date' },
            { key: 'whoFollowsUp', label: 'Who Follows Up', type: 'text' },
        ],
    },
    {
        title: 'CRM Entry Log',
        fields: [
            { key: 'crmContactId', label: 'CRM Contact ID', type: 'text' },
            { key: 'dateEnteredCrm', label: 'Date Entered into CRM', type: 'date' },
            { key: 'pipelineStage', label: 'Pipeline Stage', type: 'select', options: ['Lead', 'Prospect', 'Qualified'] },
            { key: 'assignedSalesOwner', label: 'Assigned Sales Owner', type: 'text' },
        ],
    },
];

// ─── Map header names → form keys ────────────────────────────────
const HEADER_TO_KEY: Record<string, string> = {
    'Date of First Contact': 'dateOfContact',
    'Captured By': 'capturedBy',
    'How We Connected': 'howConnected',
    'Event / Platform / Referrer': 'eventPlatformReferrer',
    'Property Interest': 'propertyInterest',
    'Company / Agency Name': 'companyName',
    'Contact Person Name': 'contactName',
    'Designation / Role': 'designation',
    'Mobile / WhatsApp': 'mobile',
    'Email Address': 'email',
    'City': 'city',
    'Country': 'country',
    'Website': 'website',
    'Type of Company': 'companyType',
    'Market They Serve': 'marketServed',
    'Initial Enthusiasm Level': 'enthusiasmLevel',
    'Rough Business Potential': 'businessPotential',
    'Key Things Said': 'keyThingsSaid',
    'Materials Shared': 'materialsShared',
    'Agreed Next Step': 'agreedNextStep',
    'Next Step Date / Deadline': 'nextStepDate',
    'Who Follows Up': 'whoFollowsUp',
    'CRM Contact ID': 'crmContactId',
    'Date Entered into CRM': 'dateEnteredCrm',
    'Pipeline Stage Assigned': 'pipelineStage',
    'Assigned Sales Owner': 'assignedSalesOwner',
};

type FormData = Record<string, string>;

export default function PartnerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get('mode') === 'edit' ? 'edit' : 'view';
    const isEdit = mode === 'edit';

    const [formData, setFormData] = useState<FormData>({});
    const [rowIndex, setRowIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    // ── Fetch row data ─────────────────────────────────────────────
    useEffect(() => {
        const fetchRow = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/partners?row=${id}`, { cache: 'no-store' });
                const json = await res.json();
                if (json.status === 'success') {
                    // Convert header keys → form keys
                    const raw = json.data as Record<string, string>;
                    const mapped: FormData = {};
                    Object.entries(raw).forEach(([header, value]) => {
                        const formKey = HEADER_TO_KEY[header];
                        if (formKey) mapped[formKey] = value ?? '';
                    });
                    setFormData(mapped);
                    const parsedRowIndex = raw._rowIndex === undefined || raw._rowIndex === null || raw._rowIndex === ""
                        ? null
                        : Number(raw._rowIndex);
                    setRowIndex(Number.isFinite(parsedRowIndex) ? parsedRowIndex : null);
                } else {
                    setError(json.message || 'Could not load contact');
                }
            } catch {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        fetchRow();
    }, [id]);

    // ── Handle field change ────────────────────────────────────────
    const handleChange = (key: string, value: string) => {
        if (!isEdit) return;
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // ── Submit update ──────────────────────────────────────────────
    const handleSave = async () => {
        if (rowIndex === null || rowIndex === undefined) return;
        setSaving(true);
        setSaveStatus('idle');
        try {
            const res = await fetch('/api/partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, _rowIndex: rowIndex }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                setSaveStatus('success');
                // Redirect back to table after 1.5s
                setTimeout(() => router.push('/partners'), 1500);
            } else {
                setSaveStatus('error');
            }
        } catch {
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    // ── Render field ───────────────────────────────────────────────
    const renderField = (field: { key: string; label: string; type: string; options?: string[] }) => {
        const value = formData[field.key] ?? '';
        const baseInput = "bg-[#07160e] border-[#c9a84c]/20 text-white placeholder:text-white/25 focus-visible:ring-[#c9a84c]/40";
        const readonlyInput = "bg-[#0f2318]/50 border-[#c9a84c]/10 text-white/70 cursor-default select-none";

        if (field.type === 'textarea') {
            return (
                <Textarea
                    key={field.key}
                    value={value}
                    onChange={e => handleChange(field.key, e.target.value)}
                    readOnly={!isEdit}
                    rows={3}
                    className={`resize-none ${isEdit ? baseInput : readonlyInput}`}
                />
            );
        }

        if (field.type === 'select' && field.options) {
            if (!isEdit) {
                return (
                    <div className={`flex h-10 w-full items-center rounded-md border px-3 text-sm ${readonlyInput}`}>
                        {value || '—'}
                    </div>
                );
            }
            return (
                <Select value={value} onValueChange={v => handleChange(field.key, v)}>
                    <SelectTrigger className={baseInput}>
                        <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f2318] border-[#c9a84c]/20 text-white">
                        {field.options.map(opt => (
                            <SelectItem
                                key={opt}
                                value={opt}
                                className="focus:bg-[#1e4530] focus:text-white"
                            >
                                {opt}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        return (
            <Input
                key={field.key}
                type={field.type}
                value={value}
                onChange={e => handleChange(field.key, e.target.value)}
                readOnly={!isEdit}
                className={isEdit ? baseInput : readonlyInput}
            />
        );
    };

    // ── Loading state ──────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#07160e] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[#c9a84c]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#07160e] flex flex-col items-center justify-center gap-4 text-red-400">
                <AlertCircle size={32} />
                <p>{error}</p>
                <Link href="/partners">
                    <Button variant="outline" className="border-white/20 text-white/70">
                        Back to list
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#07160e] text-white">

            {/* ── Top bar ───────────────────────────────────────────────── */}
            <div className="border-b border-[#c9a84c]/20 bg-[#0f2318]/80 backdrop-blur px-6 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/partners">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/50 hover:text-white hover:bg-[#1e4530]"
                            >
                                <ArrowLeft size={18} />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold text-white">
                                    {formData.contactName || 'Contact Detail'}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className={`text-xs border gap-1 ${isEdit
                                        ? 'bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/30'
                                        : 'bg-[#52b788]/15 text-[#52b788] border-[#52b788]/30'
                                        }`}
                                >
                                    {isEdit ? <Pencil size={10} /> : <Eye size={10} />}
                                    {isEdit ? 'Editing' : 'View only'}
                                </Badge>
                            </div>
                            <p className="text-xs text-white/40 mt-0.5">
                                {formData.companyName || '—'} · Row #{id}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle between view/edit */}
                        {!isEdit ? (
                            <Link href={`/partners/${id}?mode=edit`}>
                                <Button
                                    size="sm"
                                    className="bg-[#c9a84c] hover:bg-[#ddb85a] text-[#07160e] font-semibold gap-1.5"
                                >
                                    <Pencil size={14} />
                                    Edit
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link href={`/partners/${id}?mode=view`}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white/50 hover:text-white hover:bg-[#1e4530]"
                                    >
                                        Cancel
                                    </Button>
                                </Link>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={saving || saveStatus === 'success'}
                                    className="bg-[#c9a84c] hover:bg-[#ddb85a] text-[#07160e] font-semibold gap-1.5 min-w-[100px]"
                                >
                                    {saving ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : saveStatus === 'success' ? (
                                        <><CheckCircle2 size={14} /> Saved!</>
                                    ) : saveStatus === 'error' ? (
                                        <><AlertCircle size={14} /> Retry</>
                                    ) : (
                                        <><Save size={14} /> Save Changes</>
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Form body ─────────────────────────────────────────────── */}
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {SECTIONS.map(section => (
                    <div
                        key={section.title}
                        className="bg-[#0f2318] border border-[#c9a84c]/15 rounded-xl overflow-hidden"
                    >
                        {/* Section header */}
                        <div className="px-6 py-4 border-b border-[#c9a84c]/10 bg-[#07160e]/40">
                            <h2 className="text-sm font-semibold text-[#c9a84c]/80 uppercase tracking-wider">
                                {section.title}
                            </h2>
                        </div>

                        {/* Fields grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {section.fields.map(field => (
                                <div
                                    key={field.key}
                                    className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                                >
                                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                                        {field.label}
                                    </label>
                                    {renderField(field)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Save at bottom too (edit mode only) */}
                {isEdit && (
                    <div className="flex justify-end pb-8">
                        <Button
                            onClick={handleSave}
                            disabled={saving || saveStatus === 'success'}
                            className="bg-[#c9a84c] hover:bg-[#ddb85a] text-[#07160e] font-semibold gap-2 px-8"
                        >
                            {saving ? (
                                <><Loader2 size={16} className="animate-spin" /> Saving…</>
                            ) : saveStatus === 'success' ? (
                                <><CheckCircle2 size={16} /> Saved! Redirecting…</>
                            ) : (
                                <><Save size={16} /> Save Changes</>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
