"use client";
import React, { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle2, Ticket, Power, PowerOff, Clock, FileText, Settings, History, Send } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function HelpdeskConfigPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');
  const [config, setConfig] = useState<any>({ trigger_hours: 1 });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    fetch("/api/helpdesk-config")
      .then(res => res.json())
      .then(data => {
        if (data.config) setConfig({...data.config, trigger_hours: data.config.trigger_hours || 1});
        setLoading(false);
      })
      .catch(() => setLoading(false));
      
    fetch("/api/helpdesk-history")
      .then(res => res.json())
      .then(data => {
        if (data.success) setHistory(data.history || []);
      });
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
        setMessage({ type: 'success', text: 'Configuration saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return <DashboardLayout><div className="p-8 text-slate-500">Loading config...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-7 h-7 text-blue-600" />
              Automated Helpdesk Triggers
            </h1>
            <p className="text-slate-500 mt-1">Configure automated Google Form tickets for lost and delayed leads.</p>
          </div>
          
          <button
            onClick={() => setConfig({...config, is_active: !config?.is_active})}
            className={`px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              config?.is_active ? "bg-green-100 text-green-700 hover:bg-green-200 shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {config?.is_active ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
            {config?.is_active ? "Automation Active" : "Automation Paused"}
          </button>
        </div>

        {/* TABS */}
        <div className="flex space-x-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'config' ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-t-lg'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'history' ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-t-lg'
            }`}
          >
            <History className="w-4 h-4" />
            Ticket History
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6 animate-in fade-in">
            {/* CONDITION BOX */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Trigger Condition</h2>
                  <p className="text-sm text-slate-500">Kab ticket create hoga?</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-700">Create ticket if lead is lost / unassigned for more than</span>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={config?.trigger_hours || 1}
                    onChange={e => setConfig({...config, trigger_hours: parseInt(e.target.value) || 1})}
                    className="w-20 border border-slate-300 rounded-lg p-2 text-center font-bold text-blue-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">hours.</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <Send className="w-5 h-5 text-slate-400" />
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Google Form Endpoint</h2>
                  <p className="text-sm text-slate-500">Form ka 'formResponse' link dalna hai jahan data post hoga.</p>
                </div>
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
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Compulsory Fields (entry.xxxx)</h2>
                  <p className="text-sm text-slate-500">Google form ke compulsory field names (entry IDs) map karein.</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { key: 'entry_lead_id', label: 'Lead ID' },
                  { key: 'entry_name', label: 'Client Name' },
                  { key: 'entry_phone', label: 'Mobile Number' },
                  { key: 'entry_email', label: 'Email Address' },
                  { key: 'entry_source', label: 'Lead Source' },
                  { key: 'entry_company', label: 'Company Name' },
                  { key: 'entry_issue', label: 'Issue / Description' },
                ].map(field => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex justify-between">
                      {field.label}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config?.[field.key] || ''}
                      onChange={e => setConfig({...config, [field.key]: e.target.value})}
                      placeholder="entry.123456"
                      className="w-full border border-slate-300 bg-slate-50 rounded-lg px-3 py-2 text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 pb-10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
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
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
             <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="font-semibold text-slate-800 text-lg">Recent Tickets Created</h2>
                <p className="text-sm text-slate-500">Last 50 automated tickets submitted to Google Forms.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4 font-bold">Ticket Time</th>
                      <th className="p-4 font-bold">Lead ID</th>
                      <th className="p-4 font-bold">Company</th>
                      <th className="p-4 font-bold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {history.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400">No tickets generated yet.</td></tr>
                    ) : history.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-600">{new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                        <td className="p-4 font-mono font-medium text-slate-900">{h.lead_id}</td>
                        <td className="p-4 text-slate-600">{h.company}</td>
                        <td className="p-4 text-slate-600">{h.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
