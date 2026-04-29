'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { Users, Briefcase, TrendingUp, Clock, UserCheck, BarChart3 } from 'lucide-react'

type AnalyticsData = {
  totalEmployees: number
  activeJobs: number
  totalCandidates: number
  avgTimeToHire: number
  turnoverCount: number
  headcountByDept: { department: string; count: number }[]
  hiringFunnel: { stage: string; count: number }[]
  reviewScores: { period: string; avg: number }[]
  candidatesByMonth: { month: string; count: number }[]
  statusBreakdown: { status: string; count: number }[]
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => { setData(d.analytics); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <main className="flex-1">
      <Header title="People Analytics" />
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    </main>
  )

  if (!data) return <main className="flex-1 p-6"><p className="text-gray-400">No data available</p></main>

  return (
    <main className="flex-1">
      <Header title="People Analytics" subtitle="Workforce insights and HR metrics" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Total Employees', value: data.totalEmployees, color: 'bg-blue-50 text-blue-600' },
            { icon: Briefcase, label: 'Open Positions', value: data.activeJobs, color: 'bg-purple-50 text-purple-600' },
            { icon: Clock, label: 'Avg Days to Hire', value: data.avgTimeToHire || '—', color: 'bg-orange-50 text-orange-600' },
            { icon: UserCheck, label: 'Active Candidates', value: data.totalCandidates, color: 'bg-green-50 text-green-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hiring Funnel */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Hiring Funnel</h3>
            {data.hiringFunnel.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No pipeline data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.hiringFunnel} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Headcount by Department */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-green-600" /> Headcount by Department</h3>
            {data.headcountByDept.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No department data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.headcountByDept} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={80} label={({ department, count }) => `${department}: ${count}`} labelLine={false}>
                    {data.headcountByDept.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Candidates by Month */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-600" /> Applications per Month</h3>
            {data.candidatesByMonth.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No application data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.candidatesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Performance Scores */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-600" /> Avg Performance Score</h3>
            {data.reviewScores.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No review data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.reviewScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status breakdown */}
        {data.statusBreakdown.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Candidate Pipeline Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.statusBreakdown.map((s, i) => (
                <div key={s.status} className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{s.count}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize leading-tight">{s.status.replace(/_/g, ' ').toLowerCase()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
