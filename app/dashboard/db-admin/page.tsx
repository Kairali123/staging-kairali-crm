"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import DbAccessOtpModal, { DbAction, OtpRequestPayload } from '@/components/dbaccessmodel';

export default function DbAdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // State
  const [query, setQuery] = useState('SELECT * FROM test_employees LIMIT 10;');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [otpRequestId, setOtpRequestId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<DbAction>('Create Table');
  const [verifiedPayload, setVerifiedPayload] = useState<OtpRequestPayload | null>(null);

  // Redirect if not loaded/authenticated
  useEffect(() => {
    if (!isLoading && !user) router.push('/');
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Determine query action type (only for OTP-protected queries)
  const detectAction = (sql: string): DbAction => {
    const cleanSql = sql.trim().toUpperCase();
    if (cleanSql.startsWith('CREATE')) return 'Create Table';
    if (cleanSql.startsWith('DELETE') || cleanSql.startsWith('TRUNCATE') || cleanSql.startsWith('DROP')) return 'Delete Data';
    return 'Create Table';
  };

  // 1. Generate OTP function
  const handleGenerateOtp = async (payload: OtpRequestPayload) => {
    const res = await fetch('/api/db-access/generate-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate OTP');
    
    setOtpRequestId(data.requestId);
    return { expiresInSeconds: data.expiresInSeconds };
  };

  // 2. Verify OTP function
  const handleVerifyOtp = async (otp: string) => {
    if (!otpRequestId) return false;
    const res = await fetch('/api/db-access/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requestId: otpRequestId, otp })
    });
    
    const data = await res.json();
    return data.verified;
  };

  // 3. Execution logic after OTP is verified
  const executeQuery = async (requestIdToken: number) => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/inspect-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          otpRequestId: requestIdToken
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Query failed to execute');
      } else {
        setResult(data.result);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setRunning(false);
      setOtpRequestId(null);
      setVerifiedPayload(null);
    }
  };

  const handleRunQuery = () => {
    setError(null);
    if (!query.trim()) {
      setError('Please enter a SQL query.');
      return;
    }

    const cleanSql = query.trim().toUpperCase();
    
    // OTP protection is required ONLY for CREATE TABLE and DELETE/DROP/TRUNCATE
    const requiresOtp = cleanSql.startsWith('CREATE') ||
                        cleanSql.startsWith('DELETE') ||
                        cleanSql.startsWith('DROP') ||
                        cleanSql.startsWith('TRUNCATE');

    if (requiresOtp) {
      // Open OTP verification modal for table creation and data/table deletion
      setActionType(detectAction(query));
      setIsModalOpen(true);
    } else {
      // Execute directly without OTP (INSERT, UPDATE, SELECT, SHOW, DESCRIBE, etc.)
      executeReadQuery();
    }
  };

  const executeReadQuery = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/inspect-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Query failed to execute');
      } else {
        setResult(data.result);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Administration</h1>
          <p className="text-sm text-gray-500">Secure SQL execution console with OTP protection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Query Input Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">SQL Query Console</h2>
            <div className="text-xs text-slate-300">MySQL Database Mode</div>
          </div>
          
          <div className="p-6">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-48 font-mono text-sm p-4 bg-slate-900 text-teal-400 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 box-border"
              placeholder="Enter your SQL query here (e.g. SELECT * FROM test_employees;)"
            />
            
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleRunQuery}
                disabled={running}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-lg transition shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {running ? 'Running...' : 'Execute Query'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-red-800">Database Query Error</h3>
                <p className="text-sm text-red-700 mt-1 font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Panel */}
        {result && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Query Execution Result</h2>
              <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-0.5 rounded-full">Success</span>
            </div>
            
            <div className="p-6 overflow-x-auto">
              {Array.isArray(result) ? (
                result.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(result[0]).map((key) => (
                          <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 font-mono text-sm">
                      {result.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val: any, colIdx) => (
                            <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-gray-900">
                              {val === null ? <span className="text-gray-400 italic">null</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm font-medium">Query executed successfully, but returned 0 rows.</div>
                )
              ) : (
                <pre className="bg-slate-50 border border-gray-200 p-4 rounded-lg text-sm font-mono text-gray-800">{JSON.stringify(result, null, 2)}</pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OTP Authentication Modal */}
      <DbAccessOtpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        requestedBy={user.name || 'Admin'}
        targetModule="Database Administration"
        defaultAction={actionType}
        onGenerateOtp={handleGenerateOtp}
        onVerifyOtp={handleVerifyOtp}
        onVerified={(payload) => {
          setVerifiedPayload(payload);
          setIsModalOpen(false);
          if (otpRequestId) {
            executeQuery(otpRequestId);
          }
        }}
      />
    </div>
  );
}
