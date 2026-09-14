'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  userEmail: string | null;
  propertyAddress: string | null;
  triggerSource: string;
  process: string | null;
  ghlRecordId: string | null;
  ghlRecordLink: string | null;
  apiCallCount: number;
  destinationsCount: number;
  clientIP: string;
  duration: number;
  success: boolean;
  error?: string;
}

interface Stats {
  totalCalls: number;
  totalApiCalls: number;
  uniqueUsers: number;
  uniqueAddresses: number;
  byTriggerSource: Record<string, number>;
  byProcess: Record<string, number>;
  byUser: Array<{ userEmail: string; count: number }>;
  recentLogs: LogEntry[];
}

export default function DistanceMatrixDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/distance-matrix/logs?limit=${limit}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/distance-matrix/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [limit]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Distance Matrix API Usage Dashboard</h1>
        
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Requests</div>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total API Calls</div>
              <div className="text-2xl font-bold">{stats.totalApiCalls}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Unique Users</div>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Unique Addresses</div>
              <div className="text-2xl font-bold">{stats.uniqueAddresses}</div>
            </div>
          </div>
        )}

        {/* Breakdown by Trigger Source */}
        {stats && stats.byTriggerSource && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">By Trigger Source</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byTriggerSource).map(([source, count]) => (
                <div key={source}>
                  <div className="text-sm text-gray-600">{source}</div>
                  <div className="text-lg font-semibold">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Users */}
        {stats && stats.byUser && stats.byUser.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Top Users</h2>
            <div className="space-y-2">
              {stats.byUser.slice(0, 10).map((user, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{user.userEmail}</span>
                  <span className="font-semibold">{user.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent Logs</h2>
            <div className="flex gap-4 items-center">
              <label className="text-sm">
                Limit:
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                  className="ml-2 border rounded px-2 py-1 w-20"
                  min="10"
                  max="1000"
                />
              </label>
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Timestamp</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">User</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Address</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Trigger</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Process</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">API Calls</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Destinations</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">GHL Record</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log, idx) => (
                    <tr key={idx} className={log.success ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm">{formatTimestamp(log.timestamp)}</td>
                      <td className="px-4 py-2 text-sm">{log.userEmail || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm max-w-xs truncate">{log.propertyAddress || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {log.triggerSource}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{log.process || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{log.apiCallCount}</td>
                      <td className="px-4 py-2 text-sm">{log.destinationsCount}</td>
                      <td className="px-4 py-2 text-sm">
                        {log.ghlRecordLink ? (
                          <a
                            href={log.ghlRecordLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {log.success ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600" title={log.error}>✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
