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

  useEffect(() => {
    loadProviders();
  }, []);

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
                  <button className="text-blue-600 hover:underline" onClick={() => alert('Edit feature coming soon!')}>Edit</button> | <button className="text-red-600 hover:underline" onClick={() => alert('Disable feature coming soon!')}>Disable</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Load Balancing & Routing</h2>
        <div className="p-4 border rounded bg-white">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <span className="font-semibold">Enable Campaign Load Balancing</span>
          </label>
          <p className="text-sm text-gray-500 mt-2">Allows splitting a single campaign across multiple providers based on capacity and percentages.</p>
          <button className="mt-4 bg-gray-100 border px-4 py-2 rounded font-medium text-sm" onClick={() => alert('Settings Saved!')}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
