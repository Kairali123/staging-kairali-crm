"use client";
import React, { useState, useEffect } from 'react';

export default function AdminEmailConfigurationPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', type: 'brevo', apiKey: '', apiSecret: '', baseUrl: '', region: '' });

  const loadProviders = () => {
    fetch('/api/admin/email/providers').then(res => res.json()).then(data => {
      if (data.providers) setProviders(data.providers);
    });
  };

  useEffect(() => { loadProviders(); }, []);

  const handleAddSubmit = async (e: any) => {
    e.preventDefault();
    await fetch('/api/admin/email/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProvider)
    });
    setShowAddForm(false);
    setNewProvider({ name: '', type: 'brevo', apiKey: '', apiSecret: '', baseUrl: '', region: '' });
    loadProviders();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Email Providers Configuration</h1>
      <p className="text-gray-600">Configure multiple email vendors, set routing rules, and view global limits.</p>

      {showAddForm && (
        <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4">Add New Provider</h2>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider Name</label>
              <input required className="w-full border p-2 rounded" placeholder="e.g. Marketing Brevo" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provider Type</label>
              <select className="w-full border p-2 rounded" value={newProvider.type} onChange={e => setNewProvider({...newProvider, type: e.target.value})}>
                <option value="brevo">Brevo</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
                <option value="ses">Amazon SES</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input required type="password" className="w-full border p-2 rounded" value={newProvider.apiKey} onChange={e => setNewProvider({...newProvider, apiKey: e.target.value})} />
            </div>
            {(newProvider.type === 'ses' || newProvider.type === 'mailgun') && (
              <div>
                <label className="block text-sm font-medium mb-1">{newProvider.type === 'ses' ? 'API Secret' : 'Domain'}</label>
                <input required type="password" className="w-full border p-2 rounded" value={newProvider.apiSecret} onChange={e => setNewProvider({...newProvider, apiSecret: e.target.value})} />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Provider</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="border px-4 py-2 rounded">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold">Active Providers</h2>
          {!showAddForm && <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">+ Add Provider</button>}
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4">Provider</th>
              <th className="p-4">Status</th>
              <th className="p-4">Monthly Limit</th>
              <th className="p-4">Remaining</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No providers configured.</td></tr>
            )}
            {providers.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-4 font-semibold">{p.name} <span className="text-xs text-gray-400">({p.type})</span></td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4">{p.monthly_limit?.toLocaleString() || 'Unlimited'}</td>
                <td className="p-4">{p.remaining?.toLocaleString() || 'N/A'}</td>
                <td className="p-4">
                  <button className="text-blue-600 hover:underline" onClick={() => alert('Edit feature coming soon!')}>Edit</button> |{' '}
                  <button className="text-red-600 hover:underline" onClick={() => alert('Disable feature coming soon!')}>Disable</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Load Balancing &amp; Routing</h2>
        <div className="p-4 border rounded bg-white">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <span className="font-semibold">Enable Campaign Load Balancing</span>
          </label>
          <p className="text-sm text-gray-500 mt-2">Allows splitting a single campaign across multiple providers based on capacity and percentages.</p>
          <button className="mt-4 bg-gray-100 border px-4 py-2 rounded font-medium text-sm" onClick={() => alert('Settings Saved!')}>Save Settings</button>
        </div>
      </div>

      {/* ── Morning Lead Allocation Emails ─────────────────────────────────── */}
      <div className="mt-10 border-t pt-8">
        <h2 className="text-2xl font-bold mb-1">🌅 Morning Lead Allocation Emails</h2>
        <p className="text-gray-500 text-sm mb-6">
          Two automated emails fire daily at <strong>11:00 IST</strong> from the morning allocation workflow.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 — Daily Snapshot */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Scheduled · 11:00 IST</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">All owners + managers</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Daily Assignment Snapshot</h3>
            <p className="text-sm text-gray-500 mb-4">
              Sent to managers and all owners. Shows total leads assigned, overdue count, per-owner breakdown, and today&apos;s transfer log.
            </p>
            <table className="w-full text-sm mb-4 border-collapse">
              <tbody>
                <tr className="border-b"><td className="py-2 pr-4 text-gray-500 font-medium w-36">Cron path</td><td className="py-2 font-mono text-xs text-gray-700">/api/cron/morning-allocation-snapshot</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500 font-medium">Schedule (UTC)</td><td className="py-2 font-mono text-xs">30 5 * * * (= 11:00 IST)</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500 font-medium">To env var</td><td className="py-2 font-mono text-xs bg-yellow-50 rounded px-1">MORNING_ALLOCATION_TO</td></tr>
                <tr><td className="py-2 text-gray-500 font-medium">CC env var</td><td className="py-2 font-mono text-xs bg-yellow-50 rounded px-1">MORNING_ALLOCATION_CC</td></tr>
              </tbody>
            </table>
            <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600 mb-4 space-y-1">
              <div><strong>Subject:</strong> [Kairali CRM] Morning Allocation Snapshot — DD Mon YYYY</div>
              <div><strong>Body:</strong> Summary cards (Assigned / Unassigned / Overdue / Transfers) + Per-owner table + Transfer log</div>
            </div>
            <AllocationTestButton endpoint="/api/cron/morning-allocation-snapshot" label="Send test snapshot now" />
          </div>

          {/* Card 2 — Per-Owner Notification */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Scheduled · 11:00 IST</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Trigger: All assigned</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Per-Owner Assignment Notification</h3>
            <p className="text-sm text-gray-500 mb-4">
              Each owner receives a personal email listing only their leads: ID, Name, Mobile, Source, Status. Fires at 11:00 IST or when all leads are assigned for the day.
            </p>
            <table className="w-full text-sm mb-4 border-collapse">
              <tbody>
                <tr className="border-b"><td className="py-2 pr-4 text-gray-500 font-medium w-36">Cron path</td><td className="py-2 font-mono text-xs text-gray-700">/api/cron/morning-owner-notify</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500 font-medium">Schedule (UTC)</td><td className="py-2 font-mono text-xs">30 5 * * * (= 11:00 IST)</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-500 font-medium">Owner emails</td><td className="py-2 font-mono text-xs bg-yellow-50 rounded px-1">MORNING_OWNER_NOTIFY_EMAILS</td></tr>
                <tr><td className="py-2 text-gray-500 font-medium">CC env var</td><td className="py-2 font-mono text-xs bg-yellow-50 rounded px-1">MORNING_ALLOCATION_CC</td></tr>
              </tbody>
            </table>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 mb-4">
              <strong>MORNING_OWNER_NOTIFY_EMAILS</strong> — JSON in Vercel env vars:
              <code className="block mt-1 bg-blue-100 p-2 rounded font-mono whitespace-pre">
                {`{"Riya Sharma":"riya@kairali.com",\n "Sam K":"sam@kairali.com"}`}
              </code>
            </div>
            <AllocationTestButton endpoint="/api/cron/morning-owner-notify" label="Send test owner notifications now" />
          </div>
        </div>

        {/* Required env vars */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h4 className="font-bold text-yellow-800 mb-3">📋 Required Environment Variables</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-yellow-700">
            {[
              ['SMTP_HOST', 'e.g. smtp.gmail.com'],
              ['SMTP_PORT', 'e.g. 587'],
              ['SMTP_USER', 'Sender email address'],
              ['SMTP_PASS', 'App password / SMTP password'],
              ['CRON_SECRET', 'Authorizes cron endpoint calls'],
              ['MORNING_ALLOCATION_TO', 'Comma-separated manager/admin emails'],
              ['MORNING_ALLOCATION_CC', 'Optional CC for all allocation emails'],
              ['MORNING_OWNER_NOTIFY_EMAILS', 'JSON map: owner name → email address'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2 py-1 border-b border-yellow-100">
                <code className="bg-yellow-100 px-1.5 rounded text-xs font-mono text-yellow-900 whitespace-nowrap">{k}</code>
                <span className="text-xs text-yellow-600">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-600 mt-3">
            Set these in <strong>Vercel → Project → Settings → Environment Variables</strong> and redeploy.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Test trigger button (client-side) ──────────────────────────────────────
function AllocationTestButton({ endpoint, label }: { endpoint: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function trigger() {
    setStatus('sending'); setMsg('');
    try {
      const res = await fetch(endpoint, { method: 'GET' });
      const data = await res.json();
      if (res.ok && (data.success || data.sent !== undefined)) {
        setStatus('ok');
        setMsg(data.sent !== undefined ? `Sent to ${data.sent} owner(s). ${data.failed ? `${data.failed} failed.` : ''}` : 'Snapshot sent!');
      } else {
        setStatus('error');
        setMsg(data.error || 'Request failed — check CRON_SECRET and SMTP env vars.');
      }
    } catch (e) {
      setStatus('error');
      setMsg(e instanceof Error ? e.message : 'Network error');
    }
  }

  return (
    <div>
      <button
        onClick={trigger}
        disabled={status === 'sending'}
        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50 transition-colors"
      >
        {status === 'sending' ? '⏳ Sending…' : `▶ ${label}`}
      </button>
      {msg && (
        <p className={`mt-2 text-xs font-medium ${status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
          {status === 'ok' ? '✓' : '✗'} {msg}
        </p>
      )}
    </div>
  );
}
