'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/header'
import {
  ClipboardList, CheckCircle2, Circle, Plus, Upload, BookOpen,
  Users, LayoutGrid, ChevronDown, ChevronRight, Loader2, X,
  Sparkles, Clock, AlertTriangle, FileText,
  UserCheck, GitBranch, Zap, Brain, Lightbulb,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'paths' | 'materials' | 'employees'

type Material = {
  id: string; title: string; description?: string; category: string
  fileUrl?: string; fileType?: string; version: string; status: string
  appliesTo: string; isRequired: boolean; uploadedBy?: string
  createdAt: string; updatedAt: string
}

type Step = {
  id: string; title: string; description?: string; stepOrder: number
  ownerRole: string; dueOffsetDays: number; isRequired: boolean
  materials: { material: Material }[]
}

type Path = {
  id: string; name: string; description?: string; department?: string
  role?: string; employmentType?: string; durationDays: number
  isActive: boolean; createdAt: string; steps: Step[]
  _count: { employeeOnboardings: number }
}

type OTask = {
  id: string; title: string; description?: string; ownerRole: string
  status: string; dueDate?: string; completedAt?: string; notes?: string
}

type EmployeeOnboarding = {
  id: string; status: string; progressPercent: number
  startedAt: string; completedAt?: string; assignmentReason?: string
  employee: { id: string; firstName: string; lastName: string; jobTitle: string; startDate: string; employmentType: string; department?: { name: string } }
  path?: { id: string; name: string; durationDays: number }
  tasks: OTask[]
}

type AISummary = {
  summary: string; bottleneck: string
  hrActions: string[]; employeeActions: string[]; supervisorActions: string[]
  riskLevel: 'low' | 'medium' | 'high'; estimatedCompletion: string
}

type AIRecommendation = {
  recommendedPathId: string; confidence: 'high' | 'medium' | 'low'
  reason: string; alternatives: { pathId: string; reason: string }[]
  tips: string[]
}

type AIStepResult = {
  steps: { title: string; description: string; ownerRole: string; dueOffsetDays: number; isRequired: boolean }[]
  notes: string
}

type AIMaterialSuggestion = {
  suggestions: { title: string; description: string; category: string; isRequired: boolean; reason: string }[]
  note: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['general', 'welcome', 'contract', 'policy', 'it', 'training', 'payroll', 'compliance', 'role_specific', 'orientation']
const OWNER_ROLES = ['employee', 'hr', 'supervisor', 'it', 'finance']
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'CONSULTANT']

const OWNER_COLORS: Record<string, string> = {
  employee: 'bg-blue-100 text-blue-700', hr: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-teal-100 text-teal-700', it: 'bg-orange-100 text-orange-700',
  finance: 'bg-green-100 text-green-700',
}
const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-gray-100 text-gray-600', paused: 'bg-yellow-100 text-yellow-700',
}
const RISK_COLORS = { low: 'text-green-600', medium: 'text-yellow-600', high: 'text-red-600' }
const CONFIDENCE_COLORS = { high: 'text-green-600', medium: 'text-yellow-600', low: 'text-gray-500' }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [paths, setPaths] = useState<Path[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [onboardings, setOnboardings] = useState<EmployeeOnboarding[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, overdueTasks: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedPath, setExpandedPath] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')

  // Modal states
  const [showCreatePath, setShowCreatePath] = useState(false)
  const [showAddStep, setShowAddStep] = useState<string | null>(null)
  const [showUploadMaterial, setShowUploadMaterial] = useState(false)
  const [showAISteps, setShowAISteps] = useState<Path | null>(null)
  const [showSuggestMaterials, setShowSuggestMaterials] = useState<{ pathId: string; pathName: string; department?: string; role?: string } | null>(null)

  // Per-employee AI summaries
  const [aiSummaries, setAiSummaries] = useState<Record<string, AISummary>>({})
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pathsRes, matsRes, empsRes] = await Promise.all([
        fetch('/api/onboarding/paths'),
        fetch('/api/onboarding/materials?status=all'),
        fetch('/api/onboarding/employee'),
      ])
      const [pd, md, ed] = await Promise.all([pathsRes.json(), matsRes.json(), empsRes.json()])
      setPaths(pd.paths ?? [])
      setMaterials(md.materials ?? [])
      setOnboardings(ed.onboardings ?? [])
      setStats(ed.stats ?? { total: 0, completed: 0, inProgress: 0, overdueTasks: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function toggleTask(taskId: string, current: string) {
    const next = current === 'completed' ? 'pending' : 'completed'
    await fetch(`/api/onboarding/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await fetchAll()
  }

  async function getAISummary(onboarding: EmployeeOnboarding) {
    setSummaryLoading(onboarding.id)
    try {
      const res = await fetch('/api/onboarding/ai/progress-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeOnboardingId: onboarding.id }),
      })
      const data = await res.json()
      if (data.summary) setAiSummaries(prev => ({ ...prev, [onboarding.id]: data.summary }))
    } finally {
      setSummaryLoading(null)
    }
  }

  const filteredMaterials = materials.filter((m) => {
    const matchCat = catFilter === 'all' || m.category === catFilter
    const matchQ = !searchQ || m.title.toLowerCase().includes(searchQ.toLowerCase())
    return matchCat && matchQ
  })

  const filteredEmployees = onboardings.filter((o) =>
    !searchQ ||
    `${o.employee.firstName} ${o.employee.lastName}`.toLowerCase().includes(searchQ.toLowerCase()) ||
    o.employee.jobTitle.toLowerCase().includes(searchQ.toLowerCase())
  )

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'paths', label: 'Onboarding Paths', icon: GitBranch },
    { key: 'materials', label: 'Materials Library', icon: BookOpen },
    { key: 'employees', label: 'Employee Progress', icon: Users },
  ]

  return (
    <main className="flex-1">
      <Header title="Onboarding Management" subtitle="Paths, materials, and employee progress" />

      {/* Tab Bar */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        )}

        {!loading && (
          <>
            {/* ── OVERVIEW ────────────────────────────────────────────────── */}
            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Employees', value: stats.total, color: 'bg-blue-50 text-blue-700', icon: Users },
                    { label: 'Completed', value: stats.completed, color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
                    { label: 'In Progress', value: stats.inProgress, color: 'bg-purple-50 text-purple-700', icon: Clock },
                    { label: 'Overdue Tasks', value: stats.overdueTasks, color: 'bg-red-50 text-red-700', icon: AlertTriangle },
                  ].map((s) => (
                    <div key={s.label} className={`card p-5 ${s.color}`}>
                      <s.icon className="w-5 h-5 mb-2 opacity-70" />
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-sm mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{paths.filter(p => p.isActive).length}</p>
                      <p className="text-sm text-gray-500">Active onboarding paths</p>
                    </div>
                  </div>
                  <div className="card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{materials.filter(m => m.status === 'active').length}</p>
                      <p className="text-sm text-gray-500">Active materials</p>
                    </div>
                  </div>
                  <div className="card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </p>
                      <p className="text-sm text-gray-500">Completion rate</p>
                    </div>
                  </div>
                </div>

                {onboardings.length === 0 ? (
                  <div className="card p-12 text-center">
                    <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No employees in onboarding yet</p>
                    <p className="text-sm text-gray-400 mt-1">Onboarding starts when an offer is accepted or HR assigns a path</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onboardings.map((o) => (
                      <EmployeeCard
                        key={o.id} o={o}
                        onToggleTask={toggleTask}
                        aiSummary={aiSummaries[o.id]}
                        summaryLoading={summaryLoading === o.id}
                        onGetSummary={() => getAISummary(o)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PATHS ───────────────────────────────────────────────────── */}
            {tab === 'paths' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{paths.length} path{paths.length !== 1 ? 's' : ''} configured</p>
                  <button onClick={() => setShowCreatePath(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> New Path
                  </button>
                </div>

                {paths.length === 0 ? (
                  <div className="card p-12 text-center">
                    <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No onboarding paths yet</p>
                    <button onClick={() => setShowCreatePath(true)} className="btn-primary mt-4">
                      <Plus className="w-4 h-4" /> Create First Path
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paths.map((p) => (
                      <div key={p.id} className="card overflow-hidden">
                        <button
                          onClick={() => setExpandedPath(expandedPath === p.id ? null : p.id)}
                          className="w-full p-5 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <GitBranch className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{p.name}</p>
                              <span className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {p.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                              {p.department && <span>Dept: {p.department}</span>}
                              {p.role && <span>Role: {p.role}</span>}
                              {p.employmentType && <span>{p.employmentType.replace(/_/g, ' ')}</span>}
                              <span>{p.durationDays} days</span>
                              <span>{p.steps.length} steps</span>
                              <span>{p._count.employeeOnboardings} employee{p._count.employeeOnboardings !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          {expandedPath === p.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </button>

                        {expandedPath === p.id && (
                          <div className="border-t border-gray-100 bg-gray-50">
                            {p.steps.length === 0 ? (
                              <p className="p-5 text-sm text-gray-400">No steps yet. Add steps manually or let AI generate them.</p>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {p.steps.map((s) => (
                                  <div key={s.id} className="px-5 py-3 flex items-start gap-3">
                                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                      {s.stepOrder}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-900">{s.title}</p>
                                        <span className={`badge text-xs ${OWNER_COLORS[s.ownerRole] ?? 'bg-gray-100 text-gray-600'}`}>{s.ownerRole}</span>
                                        {s.isRequired && <span className="badge bg-red-50 text-red-600 text-xs">required</span>}
                                      </div>
                                      {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                                      <p className="text-xs text-gray-400 mt-0.5">Due: Day {s.dueOffsetDays}</p>
                                    </div>
                                    {/* AI suggest materials for this step */}
                                    <button
                                      onClick={() => setShowSuggestMaterials({ pathId: p.id, pathName: p.name, department: p.department, role: p.role })}
                                      title="AI suggest materials for this step"
                                      className="flex-shrink-0 text-purple-400 hover:text-purple-700 transition-colors"
                                    >
                                      <Sparkles className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="p-4 flex gap-2 flex-wrap">
                              <button onClick={() => setShowAddStep(p.id)} className="btn-secondary text-xs">
                                <Plus className="w-3.5 h-3.5" /> Add Step
                              </button>
                              <button
                                onClick={() => setShowAISteps(p)}
                                className="btn-secondary text-xs flex items-center gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> AI Generate Steps
                              </button>
                              <button
                                onClick={async () => {
                                  await fetch(`/api/onboarding/paths/${p.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ isActive: !p.isActive }),
                                  })
                                  fetchAll()
                                }}
                                className="btn-secondary text-xs ml-auto"
                              >
                                {p.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MATERIALS ───────────────────────────────────────────────── */}
            {tab === 'materials' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <input className="input w-52 text-sm" placeholder="Search materials…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
                    <select className="select text-sm" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                      <option value="all">All categories</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSuggestMaterials({ pathId: '', pathName: '', department: undefined, role: undefined })}
                      className="btn-secondary flex items-center gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                    >
                      <Sparkles className="w-4 h-4" /> AI Suggest
                    </button>
                    <button onClick={() => setShowUploadMaterial(true)} className="btn-primary">
                      <Upload className="w-4 h-4" /> Upload Material
                    </button>
                  </div>
                </div>

                {filteredMaterials.length === 0 ? (
                  <div className="card p-12 text-center">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No materials found</p>
                    <button onClick={() => setShowUploadMaterial(true)} className="btn-primary mt-4">
                      <Upload className="w-4 h-4" /> Upload First Material
                    </button>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header">Title</th>
                          <th className="table-header">Category</th>
                          <th className="table-header">Applies To</th>
                          <th className="table-header">Version</th>
                          <th className="table-header">Status</th>
                          <th className="table-header">Required</th>
                          <th className="table-header">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredMaterials.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                                  {m.description && <p className="text-xs text-gray-400 truncate max-w-xs">{m.description}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="table-cell"><span className="badge bg-blue-50 text-blue-700 text-xs capitalize">{m.category.replace(/_/g, ' ')}</span></td>
                            <td className="table-cell text-sm text-gray-600 capitalize">{m.appliesTo.replace(/_/g, ' ')}</td>
                            <td className="table-cell text-sm text-gray-500">v{m.version}</td>
                            <td className="table-cell">
                              <span className={`badge text-xs ${m.status === 'active' ? 'bg-green-100 text-green-700' : m.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{m.status}</span>
                            </td>
                            <td className="table-cell">
                              {m.isRequired ? <span className="badge bg-red-50 text-red-600 text-xs">Required</span> : <span className="text-xs text-gray-400">Optional</span>}
                            </td>
                            <td className="table-cell">
                              <div className="flex gap-2">
                                {m.fileUrl && <a href={m.fileUrl} target="_blank" className="text-xs text-blue-600 hover:underline">Download</a>}
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/onboarding/materials/${m.id}`, {
                                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: m.status === 'archived' ? 'active' : 'archived' }),
                                    })
                                    fetchAll()
                                  }}
                                  className="text-xs text-gray-400 hover:text-gray-700"
                                >
                                  {m.status === 'archived' ? 'Restore' : 'Archive'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── EMPLOYEES ───────────────────────────────────────────────── */}
            {tab === 'employees' && (
              <div className="space-y-4">
                <input className="input w-64 text-sm" placeholder="Search employees…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
                {filteredEmployees.length === 0 ? (
                  <div className="card p-12 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No employee onboarding records found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEmployees.map((o) => (
                      <EmployeeCard
                        key={o.id} o={o}
                        onToggleTask={toggleTask}
                        aiSummary={aiSummaries[o.id]}
                        summaryLoading={summaryLoading === o.id}
                        onGetSummary={() => getAISummary(o)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {showCreatePath && (
        <CreatePathModal paths={paths} onClose={() => setShowCreatePath(false)} onCreated={fetchAll} />
      )}
      {showAddStep && (
        <AddStepModal pathId={showAddStep} onClose={() => setShowAddStep(null)} onCreated={fetchAll} />
      )}
      {showUploadMaterial && (
        <UploadMaterialModal onClose={() => setShowUploadMaterial(false)} onCreated={fetchAll} />
      )}
      {showAISteps && (
        <AIGenerateStepsModal path={showAISteps} onClose={() => setShowAISteps(null)} onCreated={fetchAll} />
      )}
      {showSuggestMaterials && (
        <AISuggestMaterialsModal
          pathId={showSuggestMaterials.pathId}
          pathName={showSuggestMaterials.pathName}
          department={showSuggestMaterials.department}
          role={showSuggestMaterials.role}
          onClose={() => setShowSuggestMaterials(null)}
          onCreated={fetchAll}
        />
      )}
    </main>
  )
}

// ─── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({
  o, onToggleTask, aiSummary, summaryLoading, onGetSummary,
}: {
  o: EmployeeOnboarding
  onToggleTask: (id: string, status: string) => void
  aiSummary?: AISummary
  summaryLoading: boolean
  onGetSummary: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const done = o.tasks.filter(t => t.status === 'completed').length
  const overdueTasks = o.tasks.filter(t => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < new Date())

  function handleGetSummary() {
    setShowSummary(true)
    if (!aiSummary) onGetSummary()
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-5 flex items-center gap-4">
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-teal-700">{o.employee.firstName[0]}{o.employee.lastName[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-gray-900">{o.employee.firstName} {o.employee.lastName}</p>
              <p className="text-sm text-gray-500">{o.employee.jobTitle} · {o.employee.department?.name ?? 'No dept'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-500'}`}>{o.status.replace('_', ' ')}</span>
              {overdueTasks.length > 0 && <span className="badge bg-red-100 text-red-600">{overdueTasks.length} overdue</span>}
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{done}/{o.tasks.length} tasks · {o.path?.name ?? 'Default path'}</span>
              <span className="font-medium">{o.progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-1.5 bg-teal-500 rounded-full transition-all" style={{ width: `${o.progressPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {/* AI Summary button */}
          <button
            onClick={handleGetSummary}
            disabled={summaryLoading}
            title="AI progress summary"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
          >
            {summaryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          </button>
          {/* Expand tasks */}
          <button onClick={() => setOpen(!open)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* AI Summary Panel */}
      {showSummary && (
        <div className="border-t border-purple-100 bg-purple-50 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <Brain className="w-4 h-4" /> AI Progress Analysis
            </p>
            <button onClick={() => setShowSummary(false)} className="text-purple-400 hover:text-purple-700"><X className="w-4 h-4" /></button>
          </div>
          {summaryLoading && !aiSummary ? (
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Analysing onboarding progress…
            </div>
          ) : aiSummary ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold uppercase ${RISK_COLORS[aiSummary.riskLevel]}`}>
                  {aiSummary.riskLevel} risk
                </span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {aiSummary.estimatedCompletion}
                </span>
              </div>
              <p className="text-sm text-gray-700">{aiSummary.summary}</p>
              {aiSummary.bottleneck && (
                <div className="flex items-start gap-2 p-2.5 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">{aiSummary.bottleneck}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {aiSummary.hrActions.length > 0 && (
                  <div>
                    <p className="font-semibold text-purple-700 mb-1">HR to-do</p>
                    <ul className="space-y-0.5">{aiSummary.hrActions.map((a, i) => <li key={i} className="text-gray-600">• {a}</li>)}</ul>
                  </div>
                )}
                {aiSummary.employeeActions.length > 0 && (
                  <div>
                    <p className="font-semibold text-blue-700 mb-1">Employee to-do</p>
                    <ul className="space-y-0.5">{aiSummary.employeeActions.map((a, i) => <li key={i} className="text-gray-600">• {a}</li>)}</ul>
                  </div>
                )}
                {aiSummary.supervisorActions.length > 0 && (
                  <div>
                    <p className="font-semibold text-teal-700 mb-1">Supervisor to-do</p>
                    <ul className="space-y-0.5">{aiSummary.supervisorActions.map((a, i) => <li key={i} className="text-gray-600">• {a}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Task list */}
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {o.tasks.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No tasks assigned</p>
          ) : o.tasks.map((t) => {
            const isOverdue = t.status === 'pending' && t.dueDate && new Date(t.dueDate) < new Date()
            return (
              <div key={t.id} className={`px-5 py-2.5 flex items-center gap-3 ${isOverdue ? 'bg-red-50' : ''}`}>
                <button onClick={() => onToggleTask(t.id, t.status)} className="flex-shrink-0">
                  {t.status === 'completed'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <Circle className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-gray-300'}`} />}
                </button>
                <span className={`text-sm flex-1 ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</span>
                <span className={`badge text-xs ${OWNER_COLORS[t.ownerRole] ?? 'bg-gray-100 text-gray-600'}`}>{t.ownerRole}</span>
                {t.dueDate && (
                  <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {new Date(t.dueDate).toLocaleDateString('en-UG')}{isOverdue ? ' · OVERDUE' : ''}
                  </span>
                )}
                {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Create Path Modal (with AI recommendation) ───────────────────────────────
function CreatePathModal({ paths, onClose, onCreated }: { paths: Path[]; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', department: '', role: '', employmentType: '', durationDays: '30' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    try {
      await fetch('/api/onboarding/paths', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, durationDays: parseInt(form.durationDays) || 30 }),
      })
      onCreated()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Create Onboarding Path" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Path name *</label>
          <input className="input" placeholder="e.g. Engineering Onboarding Path" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="e.g. Engineering" value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Role keyword</label>
            <input className="input" placeholder="e.g. Engineer, Manager" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div>
            <label className="label">Employment type</label>
            <select className="select" value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
              <option value="">Any</option>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input type="number" className="input" value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          After creating, use "AI Generate Steps" to auto-build the full workflow.
        </p>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Path
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── AI Generate Steps Modal ──────────────────────────────────────────────────
function AIGenerateStepsModal({ path, onClose, onCreated }: { path: Path; onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIStepResult | null>(null)
  const [saving, setSaving] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/ai/generate-steps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathName: path.name, department: path.department, role: path.role,
          employmentType: path.employmentType, durationDays: path.durationDays,
        }),
      })
      const data = await res.json()
      if (data.result) setResult(data.result)
    } finally { setLoading(false) }
  }

  async function saveSteps() {
    if (!result) return
    setSaving(true)
    try {
      await fetch('/api/onboarding/ai/generate-steps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathId: path.id, pathName: path.name, department: path.department,
          role: path.role, employmentType: path.employmentType, durationDays: path.durationDays,
        }),
      })
      onCreated()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title={`AI Generate Steps — ${path.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl text-sm text-purple-700">
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Claude will generate a complete, ordered onboarding workflow tailored to <strong>{path.name}</strong> including Uganda-specific compliance steps.</p>
        </div>

        {!result ? (
          <button onClick={generate} disabled={loading} className="btn-primary w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Steps with AI</>}
          </button>
        ) : (
          <>
            {result.notes && (
              <p className="text-xs text-gray-500 italic">{result.notes}</p>
            )}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {result.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.title}</p>
                    {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge text-xs ${OWNER_COLORS[s.ownerRole] ?? 'bg-gray-100 text-gray-600'}`}>{s.ownerRole}</span>
                      <span className="text-xs text-gray-400">Day {s.dueOffsetDays}</span>
                      {s.isRequired && <span className="badge bg-red-50 text-red-600 text-xs">required</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={generate} disabled={loading} className="btn-secondary flex-1 text-sm">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Regenerate
              </button>
              <button onClick={saveSteps} disabled={saving} className="btn-primary flex-1 text-sm">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add to Path
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Add Step Modal ───────────────────────────────────────────────────────────
function AddStepModal({ pathId, onClose, onCreated }: { pathId: string; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', ownerRole: 'employee', dueOffsetDays: '1', isRequired: true })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    try {
      await fetch(`/api/onboarding/paths/${pathId}/steps`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dueOffsetDays: parseInt(form.dueOffsetDays) || 1 }),
      })
      onCreated()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Add Step" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Step title *</label>
          <input className="input" placeholder="e.g. Sign employment contract" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Responsible</label>
            <select className="select" value={form.ownerRole}
              onChange={(e) => setForm({ ...form, ownerRole: e.target.value })}>
              {OWNER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due offset (days)</label>
            <input type="number" className="input" value={form.dueOffsetDays}
              onChange={(e) => setForm({ ...form, dueOffsetDays: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isRequired}
            onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />
          Required step
        </label>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add Step
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── AI Suggest Materials Modal ───────────────────────────────────────────────
function AISuggestMaterialsModal({
  pathId, pathName, department, role, onClose, onCreated,
}: {
  pathId: string; pathName: string; department?: string; role?: string
  onClose: () => void; onCreated: () => void
}) {
  const [stepTitle, setStepTitle] = useState('')
  const [stepDesc, setStepDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIMaterialSuggestion | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<Set<number>>(new Set())

  async function getSuggestions() {
    if (!stepTitle) return
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/ai/suggest-materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepTitle, stepDescription: stepDesc, pathId, pathName, department, role }),
      })
      const data = await res.json()
      if (data.suggestions) setResult(data.suggestions)
    } finally { setLoading(false) }
  }

  async function saveSuggestion(idx: number, s: AIMaterialSuggestion['suggestions'][0]) {
    setSaving(idx)
    try {
      await fetch('/api/onboarding/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: s.title, description: s.description, category: s.category,
          isRequired: s.isRequired, appliesTo: role ? 'role' : department ? 'department' : 'all',
          appliesValue: role || department || undefined, status: 'active',
        }),
      })
      setSaved(prev => new Set([...prev, idx]))
      onCreated()
    } finally { setSaving(null) }
  }

  return (
    <Modal title="AI Suggest Onboarding Materials" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl text-sm text-purple-700">
          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Describe the onboarding step and Claude will recommend the best materials to attach.</p>
        </div>
        <div>
          <label className="label">Step / context *</label>
          <input className="input" placeholder="e.g. Sign employment contract and submit compliance documents"
            value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Additional context (optional)</label>
          <textarea className="input" rows={2} placeholder="e.g. New hire is an engineer joining the Engineering team"
            value={stepDesc} onChange={(e) => setStepDesc(e.target.value)} />
        </div>
        <button onClick={getSuggestions} disabled={loading || !stepTitle} className="btn-primary w-full">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</> : <><Sparkles className="w-4 h-4" /> Get AI Suggestions</>}
        </button>

        {result && (
          <>
            {result.note && <p className="text-xs text-gray-500 italic">{result.note}</p>}
            <div className="space-y-2">
              {result.suggestions.map((s, i) => (
                <div key={i} className={`p-3 border rounded-xl ${saved.has(i) ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{s.title}</p>
                        <span className="badge bg-blue-50 text-blue-700 text-xs">{s.category.replace(/_/g, ' ')}</span>
                        {s.isRequired && <span className="badge bg-red-50 text-red-600 text-xs">required</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                      <p className="text-xs text-purple-600 mt-1 italic">{s.reason}</p>
                    </div>
                    {saved.has(i) ? (
                      <span className="text-green-600 text-xs font-medium flex-shrink-0">✓ Added</span>
                    ) : (
                      <button
                        onClick={() => saveSuggestion(i, s)}
                        disabled={saving === i}
                        className="btn-secondary text-xs flex-shrink-0"
                      >
                        {saving === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-secondary w-full text-sm">Done</button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Upload Material Modal ────────────────────────────────────────────────────
function UploadMaterialModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'general', version: '1.0', appliesTo: 'all', appliesValue: '', isRequired: false, status: 'active' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    try {
      let fileUrl: string | undefined, fileType: string | undefined, storageKey: string | undefined
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('entityType', 'onboarding_material')
        fd.append('entityId', 'library')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          fileUrl = uploadData.url; fileType = file.type; storageKey = uploadData.storageKey
        }
      }
      await fetch('/api/onboarding/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fileUrl, fileType, storageKey }),
      })
      onCreated(); onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Upload Onboarding Material" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" placeholder="e.g. HR Policy Manual v2025" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Version</label>
            <input className="input" placeholder="1.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </div>
          <div>
            <label className="label">Applies to</label>
            <select className="select" value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
              <option value="all">All employees</option>
              <option value="department">Specific department</option>
              <option value="role">Specific role</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        {form.appliesTo !== 'all' && (
          <div>
            <label className="label">Specify value</label>
            <input className="input" placeholder={form.appliesTo === 'department' ? 'e.g. Engineering' : 'e.g. Manager'}
              value={form.appliesValue} onChange={(e) => setForm({ ...form, appliesValue: e.target.value })} />
          </div>
        )}
        <div>
          <label className="label">File (PDF, DOCX, video, etc.)</label>
          <input type="file" className="input text-sm py-1.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />
          Mark as required
        </label>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {saving ? 'Uploading…' : 'Save Material'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
