"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Server, Cpu, Database, Activity, Clock, AlertTriangle, Route } from "lucide-react";

interface TelemetryData {
  timeline: {
    time: string;
    date: string;
    requests: number;
    avgLatency: number;
    errors: number;
  }[];
  slowestRoutes: {
    url: string;
    method: string;
    avgLatency: number;
    maxLatency: number;
    calls: number;
  }[];
  moduleActivity: {
    name: string;
    value: number;
  }[];
  systemHealth: {
    uptimeSeconds: number;
    memoryHeapUsedMB: number;
    memoryHeapTotalMB: number;
  };
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function TelemetryTab() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const res = await fetch("/api/telemetry");
        if (!res.ok) throw new Error("Failed to fetch telemetry data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTelemetry();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Activity className="h-8 w-8 animate-pulse mb-4 text-blue-500" />
        <p>Loading deep system telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <AlertTriangle className="h-5 w-5 mb-2" />
        <p>Error loading telemetry: {error}</p>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Hardware & General Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Server Uptime</p>
            <p className="text-xl font-bold text-slate-800">{formatUptime(data.systemHealth.uptimeSeconds)}</p>
          </div>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Heap Memory Used</p>
            <p className="text-xl font-bold text-slate-800">
              {data.systemHealth.memoryHeapUsedMB} MB <span className="text-sm font-normal text-slate-400">/ {data.systemHealth.memoryHeapTotalMB} MB</span>
            </p>
          </div>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Logged Errors (24h)</p>
            <p className="text-xl font-bold text-slate-800">
              {data.timeline.reduce((sum, t) => sum + t.errors, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" /> API Traffic (Last 24 Hours)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  cursor={{ fill: "#f1f5f9" }}
                />
                <Bar dataKey="requests" name="Total Requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="errors" name="Errors (4xx/5xx)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Chart */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" /> Avg Response Latency (ms)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Line type="monotone" dataKey="avgLatency" name="Avg Latency (ms)" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Drill-down Data ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Distribution */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Module Activity Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.moduleActivity}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.moduleActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Slowest Routes Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Route className="h-4 w-4 text-amber-500" /> Slowest API Routes (Last 24h)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">URL Route</th>
                  <th className="px-5 py-3">Avg Latency</th>
                  <th className="px-5 py-3">Max Latency</th>
                  <th className="px-5 py-3">Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.slowestRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No performance data available</td>
                  </tr>
                ) : (
                  data.slowestRoutes.map((route, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-bold text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {route.method}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">{route.url}</td>
                      <td className="px-5 py-3">
                        <span className={`font-mono ${route.avgLatency > 1000 ? 'text-red-600 font-bold' : route.avgLatency > 500 ? 'text-amber-600 font-bold' : 'text-emerald-600'}`}>
                          {route.avgLatency}ms
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-500">{route.maxLatency}ms</td>
                      <td className="px-5 py-3 font-mono text-slate-500">{route.calls}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
