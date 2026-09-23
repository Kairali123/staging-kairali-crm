"use client";
import React, { useState, useEffect } from 'react';
export default function CreateCampaignPage() {
  const [step, setStep] = useState(1);
  const [providers, setProviders] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState({ name: '', type: 'Newsletter', templateId: '', selectedProviderId: '', providerSelectionMode: 'MANUAL', assignments: [] });

  useEffect(() => {
    fetch('/api/admin/email/providers').then(res => res.json()).then(data => { if (data.providers) setProviders(data.providers); });
  }, []);

  const handleCreate = async () => {
    await fetch('/api/email/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campaignData) });
    alert('Campaign Created!');
    window.location.href = '/email-marketing/campaigns';
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create Email Campaign</h1>
      
      <div className="flex gap-4 border-b pb-4">
        {[1, 2, 3, 4, 5, 6, 7].map(s => (
          <div key={s} className={`flex-1 text-center py-2 ${step === s ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-400'}`}>
            Step {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl">Step 1: Campaign Details</h2>
          <input className="border p-2 w-full rounded" placeholder="Campaign Name" value={campaignData.name} onChange={e => setCampaignData({...campaignData, name: e.target.value})} />
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl">Step 2: Audience (CRM Contacts)</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setStep(3)}>Next</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Step 3: Email Provider & Sender</h2>
          <select className="border p-2 w-full rounded" value={campaignData.providerSelectionMode} onChange={e => setCampaignData({...campaignData, providerSelectionMode: e.target.value})}>
            <option value="MANUAL">MANUAL (Select single provider)</option>
            <option value="AUTOMATIC">AUTOMATIC (Auto Select based on health)</option>
            <option value="HYBRID">HYBRID (Load Balancer)</option>
          </select>
          {campaignData.providerSelectionMode === 'MANUAL' && (
            <div className="mt-4 space-y-2">
              {providers.map(p => (
                <label key={p.id} className="flex items-center gap-2 border p-3 rounded cursor-pointer">
                  <input type="radio" name="provider" value={p.id} onChange={() => setCampaignData({...campaignData, selectedProviderId: p.id})} />
                  <div>
                    <span className="font-bold">{p.name}</span> <span className="text-sm text-gray-500">({p.type})</span>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-between"><button className="border px-4 py-2 rounded" onClick={() => setStep(2)}>Back</button><button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setStep(4)}>Next</button></div>
        </div>
      )}

      {step === 4 && (<div className="space-y-4"><h2 className="text-xl">Step 4: Template</h2><div className="flex justify-between"><button className="border px-4 py-2 rounded" onClick={() => setStep(3)}>Back</button><button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setStep(5)}>Next</button></div></div>)}
      {step === 5 && (<div className="space-y-4"><h2 className="text-xl">Step 5: Preview & Test</h2><div className="flex justify-between"><button className="border px-4 py-2 rounded" onClick={() => setStep(4)}>Back</button><button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setStep(6)}>Next</button></div></div>)}
      {step === 6 && (<div className="space-y-4"><h2 className="text-xl">Step 6: Schedule</h2><div className="flex justify-between"><button className="border px-4 py-2 rounded" onClick={() => setStep(5)}>Back</button><button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setStep(7)}>Next</button></div></div>)}
      {step === 7 && (<div className="space-y-4"><h2 className="text-xl">Step 7: Review & Launch</h2>
          <div className="flex justify-between mt-4"><button className="border px-4 py-2 rounded" onClick={() => setStep(6)}>Back</button><button className="bg-green-600 text-white px-6 py-2 rounded font-bold" onClick={handleCreate}>LAUNCH CAMPAIGN</button></div>
      </div>)}
    </div>
  );
}
