// ============================================================
// APEX RH — components/recrutement/RecruitmentAdminPanel.jsx
// Session 59 — Administration recrutement (vue admin)
// ============================================================
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Briefcase, Users, TrendingUp,
  CheckCircle, Clock, X, Save, ToggleLeft, ToggleRight, AlertTriangle,
  Target, Calendar, BarChart3, ChevronRight, Search, Filter,
} from 'lucide-react'
import {
  useJobPostings, useCreateJobPosting, useUpdateJobPosting,
  useDeleteJobPosting, usePublishJobPosting,
  useJobApplications, useUpdateApplicationStatus,
  useRecruitmentStats, usePipelineStats,
  CONTRACT_TYPE_LABELS, CONTRACT_TYPE_COLORS,
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS,
  PIPELINE_STAGES, formatSalaryRange,
} from '../../hooks/useRecruitment'

// ─── KPI cards (SVG mini-bar) ─────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null
  const items = [
    { label: 'Offres actives',    value: stats.active_postings,   color: '#6366F1' },
    { label: 'Candidatures',      value: stats.total_applications, color: '#3B82F6' },
    { label: 'En entretien',      value: stats.in_interview,       color: '#F59E0B' },
    { label: 'Recrutés',          value: stats.hired,              color: '#10B981' },
    { label: 'Taux conversion',   value: `${stats.conversion_rate || 0}%`, color: '#8B5CF6' },
    { label: 'Délai moyen (j)',   value: stats.avg_days_to_hire ? Math.round(stats.avg_days_to_hire) : '–', color: '#C9A227' },
  ]
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
      {items.map(({ label, value, color }) => (
        <div key={label} className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-lg font-extrabold text-white">{value}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
          <div className="w-full h-0.5 rounded-full mt-2" style={{ background: color + '40' }}>
            <div className="h-full rounded-full" style={{ background: color, width: '70%' }}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Pipeline minibar par offre ───────────────────────────────
function PipelineMiniBar({ ps }) {
  const total = ps.total_applications || 0
  if (total === 0) return <span className="text-xs text-white/20">Aucune candidature</span>

  const stages = [
    { key: 'nb_nouveau',   color: '#6B7280' },
    { key: 'nb_en_revue',  color: '#3B82F6' },
    { key: 'nb_entretien', color: '#F59E0B' },
    { key: 'nb_test',      color: '#EC4899' },
    { key: 'nb_offre',     color: '#10B981' },
    { key: 'nb_accepte',   color: '#059669' },
    { key: 'nb_refuse',    color: '#EF4444' },
  ]

  return (
    <div className="flex items-center gap-1">
      <div className="flex h-2 rounded-full overflow-hidden w-24">
        {stages.map(({ key, color }) => {
          const v = ps[key] || 0
          if (v === 0) return null
          return (
            <div key={key} style={{ width: `${(v / total) * 100}%`, background: color }} title={`${key}: ${v}`}/>
          )
        })}
      </div>
      <span className="text-xs text-white/30">{total}</span>
    </div>
  )
}

// ─── Form offre ───────────────────────────────────────────────
function JobForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    title: '', reference_code: '', contract_type: 'cdi', location: 'Dakar',
    is_remote: false, salary_min: '', salary_max: '', currency: 'XOF',
    description: '', requirements: '', benefits: '',
    skills_required: '', experience_years: '', education_level: '',
    nb_positions: 1, deadline: '', is_internal: false,
  })

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    const payload = {
      ...form,
      salary_min: form.salary_min ? +form.salary_min : null,
      salary_max: form.salary_max ? +form.salary_max : null,
      experience_years: form.experience_years ? +form.experience_years : null,
      nb_positions: +form.nb_positions,
      skills_required: form.skills_required
        ? (typeof form.skills_required === 'string'
            ? form.skills_required.split(',').map(s => s.trim()).filter(Boolean)
            : form.skills_required)
        : [],
      deadline: form.deadline || null,
    }
    onSave(payload)
  }

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-medium text-white/40 mb-1">Intitulé du poste *</label>
          <input value={form.title} onChange={e => handle('title', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="Ex: Développeur Backend Senior"/>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Référence</label>
          <input value={form.reference_code} onChange={e => handle('reference_code', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="RH-2026-001"/>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Type de contrat *</label>
          <select value={form.contract_type} onChange={e => handle('contract_type', e.target.value)}
            className={inputCls} style={inputStyle}>
            {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Lieu</label>
          <input value={form.location} onChange={e => handle('location', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="Dakar"/>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Nb postes</label>
          <input type="number" min={1} value={form.nb_positions} onChange={e => handle('nb_positions', e.target.value)}
            className={inputCls} style={inputStyle}/>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Salaire min (FCFA)</label>
          <input type="number" value={form.salary_min} onChange={e => handle('salary_min', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="500000"/>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Salaire max (FCFA)</label>
          <input type="number" value={form.salary_max} onChange={e => handle('salary_max', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="800000"/>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Date de clôture</label>
          <input type="date" value={form.deadline} onChange={e => handle('deadline', e.target.value)}
            className={inputCls} style={inputStyle}/>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-white/40 mb-1">Expérience requise (ans)</label>
          <input type="number" min={0} value={form.experience_years} onChange={e => handle('experience_years', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="3"/>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-medium text-white/40 mb-1">Description *</label>
        <textarea rows={4} value={form.description} onChange={e => handle('description', e.target.value)}
          className={`${inputCls} resize-none`} style={inputStyle}
          placeholder="Décrivez le poste, les missions, le contexte..."/>
      </div>
      <div>
        <label className="block text-[10px] font-medium text-white/40 mb-1">Profil recherché</label>
        <textarea rows={3} value={form.requirements} onChange={e => handle('requirements', e.target.value)}
          className={`${inputCls} resize-none`} style={inputStyle}
          placeholder="Compétences, formations, qualités attendues..."/>
      </div>
      <div>
        <label className="block text-[10px] font-medium text-white/40 mb-1">
          Compétences clés (séparées par virgule)
        </label>
        <input
          value={typeof form.skills_required === 'string'
            ? form.skills_required
            : (form.skills_required || []).join(', ')}
          onChange={e => handle('skills_required', e.target.value)}
          className={inputCls} style={inputStyle}
          placeholder="Node.js, PostgreSQL, Docker..."/>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_remote} onChange={e => handle('is_remote', e.target.checked)}
            className="rounded accent-indigo-500"/>
          <span className="text-sm text-white/60">Télétravail accepté</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_internal} onChange={e => handle('is_internal', e.target.checked)}
            className="rounded accent-indigo-500"/>
          <span className="text-sm text-white/60">Interne uniquement</span>
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={loading || !form.title || !form.description}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          {loading ? 'Sauvegarde...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ─── Admin Panel principal ────────────────────────────────────
export default function RecruitmentAdminPanel() {
  const { data: stats } = useRecruitmentStats()
  const { data: pipelineStats = [] } = usePipelineStats()
  const { data: jobs = [], isLoading } = useJobPostings()
  const { data: applications = [] } = useJobApplications()

  const createJob = useCreateJobPosting()
  const updateJob = useUpdateJobPosting()
  const deleteJob = useDeleteJobPosting()
  const publishJob = usePublishJobPosting()
  const updateStatus = useUpdateApplicationStatus()

  const [view, setView] = useState('jobs') // 'jobs' | 'applications'
  const [editJob, setEditJob] = useState(null) // null | 'new' | job object
  const [searchApps, setSearchApps] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const filteredApps = useMemo(() => {
    return applications.filter(a => {
      if (filterStatus && a.status !== filterStatus) return false
      if (searchApps) {
        const q = searchApps.toLowerCase()
        return a.candidate_name?.toLowerCase().includes(q) || a.candidate_email?.toLowerCase().includes(q)
      }
      return true
    })
  }, [applications, filterStatus, searchApps])

  const handleSaveJob = async (payload) => {
    if (editJob === 'new') {
      await createJob.mutateAsync(payload)
    } else {
      await updateJob.mutateAsync({ id: editJob.id, ...payload })
    }
    setEditJob(null)
  }

  const handleDelete = async (id) => {
    await deleteJob.mutateAsync(id)
    setDeleteConfirm(null)
  }

  const getPipelineForJob = (jobId) => pipelineStats.find(p => p.job_id === jobId)

  return (
    <div className="space-y-5">
      <StatsBar stats={stats}/>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          {[
            { id: 'jobs', label: `Offres (${jobs.length})`, icon: Briefcase },
            { id: 'applications', label: `Candidatures (${applications.length})`, icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: view === id ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: view === id ? '#818CF8' : 'rgba(255,255,255,0.4)',
              }}>
              <Icon size={13}/>{label}
            </button>
          ))}
        </div>
        {view === 'jobs' && (
          <button onClick={() => setEditJob('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            <Plus size={14}/> Nouvelle offre
          </button>
        )}
      </div>

      {/* Form nouvelle offre */}
      <AnimatePresence>
        {editJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="flex items-center justify-between px-5 pt-5">
              <h3 className="text-sm font-bold text-white">
                {editJob === 'new' ? 'Nouvelle offre d\'emploi' : `Modifier : ${editJob.title}`}
              </h3>
              <button onClick={() => setEditJob(null)} className="text-white/40 hover:text-white"><X size={16}/></button>
            </div>
            <JobForm
              initial={editJob !== 'new' ? {
                ...editJob,
                skills_required: (editJob.skills_required || []).join(', ')
              } : undefined}
              onSave={handleSaveJob}
              onCancel={() => setEditJob(null)}
              loading={createJob.isPending || updateJob.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vue offres */}
      {view === 'jobs' && (
        isLoading ? (
          <div className="text-center py-16 text-white/30 text-sm">Chargement...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Briefcase size={36} className="mx-auto text-white/10"/>
            <p className="text-white/30 text-sm">Aucune offre créée</p>
            <button onClick={() => setEditJob('new')}
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 mx-auto">
              <Plus size={13}/> Créer la première offre
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => {
              const ps = getPipelineForJob(job.id)
              const typeColor = CONTRACT_TYPE_COLORS[job.contract_type] || '#6B7280'
              return (
                <div key={job.id} className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold text-white">{job.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{ background: typeColor + '20', color: typeColor }}>
                        {CONTRACT_TYPE_LABELS[job.contract_type]}
                      </span>
                      {!job.is_published && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                          Brouillon
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {ps && <PipelineMiniBar ps={ps}/>}
                      {job.deadline && (
                        <span className="text-[10px] text-white/25">
                          Clôture : {new Date(job.deadline).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => publishJob.mutate({ id: job.id, publish: !job.is_published })}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                      title={job.is_published ? 'Dépublier' : 'Publier'}>
                      {job.is_published
                        ? <Eye size={13} className="text-emerald-400"/>
                        : <EyeOff size={13} className="text-white/30"/>}
                    </button>
                    <button onClick={() => setEditJob(job)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Edit2 size={13} className="text-white/40 hover:text-white"/>
                    </button>
                    <button onClick={() => setDeleteConfirm(job.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Trash2 size={13} className="text-red-400/60 hover:text-red-400"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Vue candidatures */}
      {view === 'applications' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
              <input value={searchApps} onChange={e => setSearchApps(e.target.value)}
                placeholder="Rechercher un candidat..."
                className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}/>
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="">Tous les statuts</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {filteredApps.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">Aucune candidature</div>
            ) : (
              filteredApps.map(app => {
                const statusColor = APPLICATION_STATUS_COLORS[app.status] || '#6B7280'
                return (
                  <div key={app.id} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{app.candidate_name}</span>
                        {app.is_internal && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                            style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>
                            Interne
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/30">{app.candidate_email} · {app.job?.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={app.status}
                        onChange={e => updateStatus.mutate({ id: app.id, status: e.target.value })}
                        className="text-[11px] px-2 py-1 rounded-lg focus:outline-none"
                        style={{
                          background: statusColor + '20',
                          border: `1px solid ${statusColor}30`,
                          color: statusColor,
                        }}>
                        {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k} style={{ background: '#0d0d2b', color: '#fff' }}>{v}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-white/20 flex-shrink-0">
                        {new Date(app.applied_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl p-6 max-w-sm w-full"
              style={{ background: '#0d0d2b', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={28} className="text-red-400 mx-auto mb-3"/>
              <h3 className="text-sm font-bold text-white text-center mb-1">Supprimer cette offre ?</h3>
              <p className="text-xs text-white/40 text-center mb-5">
                Les candidatures associées seront également supprimées.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 rounded-xl text-sm text-white/50"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  Annuler
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} disabled={deleteJob.isPending}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'rgba(239,68,68,0.8)' }}>
                  {deleteJob.isPending ? '...' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
