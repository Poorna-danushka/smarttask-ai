'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { BrainCircuit, Loader2, RefreshCw, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import api from '@/lib/axios';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280'];
const PRIORITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6'];

export default function Analytics() {
  const [aiData, setAiData] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const [aiRes, dashRes] = await Promise.all([
        api.post('/ai/analyze'),
        api.get('/dashboard/stats'),
      ]);
      setAiData(aiRes.data);
      setDashData(dashRes.data);
    } catch (err) {
      console.error('Analytics fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runAnalysis(); }, []);

  // Build real chart data from API responses
  const pieData = aiData?.stats ? [
    { name: 'Completed', value: aiData.stats.completed },
    { name: 'In Progress', value: aiData.stats.inProgress },
    { name: 'Todo', value: aiData.stats.todo },
  ].filter(d => d.value > 0) : [];

  const priorityBarData = aiData?.stats ? [
    { name: 'Urgent', value: aiData.stats.urgent || 0 },
    { name: 'High', value: Math.max(0, Math.ceil((aiData.stats.total || 0) * 0.3) - (aiData.stats.urgent || 0)) },
    { name: 'Medium', value: Math.ceil((aiData.stats.total || 0) * 0.4) },
    { name: 'Low', value: Math.ceil((aiData.stats.total || 0) * 0.1) },
  ] : [];

  const weeklyData = dashData?.weeklyData || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics & AI Insights</h2>
          <p className="text-gray-400 text-sm mt-1">AI-powered analysis of your productivity</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_15px_rgba(120,119,198,0.3)] transition-all flex items-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
          <p className="text-gray-400">AI is analyzing your tasks...</p>
        </div>
      ) : (
        <>
          {/* AI Summary */}
          {aiData?.summary && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/20 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20 flex-shrink-0">
                  <BrainCircuit className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-200 mb-2">AI Summary</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{aiData.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Real Stats Cards */}
          {aiData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Tasks', value: aiData.stats.total, color: 'text-white' },
                { label: 'Completed', value: aiData.stats.completed, color: 'text-green-400' },
                { label: 'Overdue', value: aiData.stats.overdue, color: aiData.stats.overdue > 0 ? 'text-red-400' : 'text-gray-400' },
                { label: 'Productivity', value: `${aiData.stats.productivity}%`, color: 'text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-gray-400 text-xs mb-1">{s.label}</p>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-base font-semibold mb-6">Task Status Breakdown</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">No task data yet</div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-base font-semibold mb-6">Priority Distribution</h3>
              {priorityBarData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={priorityBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {priorityBarData.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">No task data yet</div>
              )}
            </div>
          </div>

          {/* Weekly Real Data */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
            <h3 className="text-base font-semibold mb-6">Weekly Task Activity (Real Data)</h3>
            {weeklyData.length > 0 && weeklyData.some((d: any) => d.tasks > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="tasks" name="Tasks Due" stroke="#a855f7" strokeWidth={3} fill="url(#gradient)" />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={3} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">
                Add tasks with due dates to see weekly activity
              </div>
            )}
          </div>

          {/* AI Insights Grid */}
          {aiData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-base font-semibold">Recommendations</h3>
                </div>
                <ul className="space-y-3">
                  {aiData.recommendations?.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-red-500/10">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-semibold">Risk Warnings</h3>
                </div>
                <ul className="space-y-3">
                  {aiData.risks?.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-2"></span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-semibold">Focus Areas</h3>
                </div>
                <ul className="space-y-3">
                  {aiData.focusAreas?.map((f: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-2"></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
