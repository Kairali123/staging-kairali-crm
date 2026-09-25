"use client";
import React, { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle2, Ticket, Power, PowerOff } from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";

export default function HelpdeskConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    fetch("/api/helpdesk-config")
      .then(res => res.json())
      .then(data => {
        if (data.config) setConfig(data.config);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/helpdesk-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Helpdesk configuration saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setSaving(false);
  };

  if (loading) {
    return <DashboardLayout><div className="p-8 text-slate-500">Loading config...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-blue-600" />
              Automated Help Ticket Configuration
            </h1>
            <p className="text-slate-500 mt-1">Configure Google Form integration for 1-hour lost leads.</p>
          </div>
          
          <button
            onClick={() => setConfig({...config, is_active: !config?.is_active})}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              config?.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {config?.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            {config?.is_active ? "Automation Active" : "Automation Paused"}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Google Form Endpoint</h2>
            <p className="text-sm text-slate-500 mt-1">Paste the Google Form 'formResponse' URL here.</p>
          </div>
          <div className="p-6">
            <input
              type="text"
              value={config?.form_url || ''}
              onChange={e => setConfig({...config, form_url: e.target.value})}
              placeholder="https://docs.google.com/forms/d/e/.../formResponse"
              className="w-full border border-slate-300 rounded-lg p-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Form Fields Mapping (entry.xxxx)</h2>
            <p className="text-sm text-slate-500 mt-1">Map your CRM lead data to the Google Form 'entry' IDs.</p>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'entry_lead_id', label: 'Lead ID', placeholder: 'entry.123456' },
              { key: 'entry_name', label: 'Client Name', placeholder: 'entry.123456' },
              { key: 'entry_phone', label: 'Mobile Number', placeholder: 'entry.123456' },
              { key: 'entry_email', label: 'Email Address', placeholder: 'entry.123456' },
              { key: 'entry_source', label: 'Lead Source', placeholder: 'entry.123456' },
              { key: 'entry_company', label: 'Company Name', placeholder: 'entry.123456' },
              { key: 'entry_issue', label: 'Issue / Description', placeholder: 'entry.123456' },
            ].map(field => (
              <div key={field.key} className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{field.label}</label>
                <input
                  type="text"
                  value={config?.[field.key] || ''}
                  onChange={e => setConfig({...config, [field.key]: e.target.value})}
                  placeholder={field.placeholder}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Configuration
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
