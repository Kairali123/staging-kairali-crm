"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CampaignsAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Campaigns');

  useEffect(() => {
    fetch('/api/email/campaigns').then(res => res.json()).then(data => {
      if (data.campaigns) setCampaigns(data.campaigns);
    });
  }, []);

  const tabs = ['Campaigns', 'Templates', 'Provider Analytics', 'Scheduled', 'Email Logs'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Campaigns & Analytics</h1>
        <Link href="/email-marketing/campaigns/create">
          <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition">+ Create Campaign</button>
        </Link>
      </div>

      <div className="flex gap-6 border-b">
        {tabs.map(tab => (
          <div 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`py-2 cursor-pointer transition-colors ${activeTab === tab ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {tab}
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        {activeTab === 'Campaigns' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Campaign</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Status</th>
                <th className="p-4">Recipients</th>
                <th className="p-4">Created Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500 py-8">No campaigns found. <Link href="/email-marketing/campaigns/create" className="text-blue-600 hover:underline">Create one</Link>.</td></tr>
              )}
              {campaigns.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => alert(`View details for ${c.name}`)}>
                  <td className="p-4 font-semibold text-blue-600">{c.name}</td>
                  <td className="p-4">{c.provider_name || 'Auto/Load Balanced'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4">{c.total_recipients || 0}</td>
                  <td className="p-4 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab !== 'Campaigns' && (
          <div className="p-8 text-center text-gray-500">
            {activeTab} module is coming soon!
          </div>
        )}
      </div>
    </div>
  );
}
