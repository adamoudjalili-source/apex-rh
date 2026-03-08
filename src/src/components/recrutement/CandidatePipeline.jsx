// ============================================================
// APEX RH — components/recrutement/CandidatePipeline.jsx
// Session 59 — Pipeline Kanban candidatures (vue manager)
// ============================================================
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Phone, Star, ChevronDown, X, Clock,
  CheckCircle, XCircle, ArrowRight, MessageSquare, Briefcase,
  Calendar, Filter,
} from 'lucide-react'
import {
  useApplicationsByManager, useJobPostings, useUpdateApplicationStatus,
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS,
  PIPELINE_STAGES,
} from '../../hooks/useRecruitment'
import { useAuth } from '../../contexts/AuthContext'
import CVParserPanel from './CVParserPanel'  // Étape 13

// ─── Carte candidat ───────────────────────────────────────────
function CandidateCard({ app, onSelect }) {
  const score = app.overall_score
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => onSelect(app)}
      className="rounded-xl p-3 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{app.candidate_name}</p>
          <p className="text-[11px] text-white/30 truncate max-w-[140px]">{app.candidate_email}</p>
        </div>
        {score && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full"
                style={{ background: i <= score ? '#F59E0B' : 'rgba(255,255,255,0.1)' }}/>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/25">
          {new Date(app.applied_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </span>
        {app.is_internal && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>
            Interne
          </span>
        )}
      </div>
      {app.job?.title && (
        <p className="text-[10px] text-white/20 mt-1 truncate">
          <Briefcase size={9} className="inline mr-1"/>
          {app.job.title}
        </p>
      )}
    </motion.div>
  )
}

// ─── Colonne pipeline ─────────────────────────────────────────
function PipelineColumn({ stage, apps, onSelect }) {
  return (
    <div className="flex-shrink-0 w-52">
      {/* ─── Parser CV IA (Étape 13) ─────────────────────────────── */}
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={() => setShowParser(s => !s)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: showParser ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', color: showParser ? '#818CF8' : 'rgba(255,255,255,0.5)' }}>
          <UploadCloud size={13}/>
          Parser CV IA
        </button>
      </div>
      {showParser && (
        <div className="px-4 pb-2">
          <CVParserPanel embedded/>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: stage.color }}/>
        <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">{stage.label}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: stage.color + '20', color: stage.color }}>
          {apps.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[60px]">
        <AnimatePresence>
          {apps.map(app => (
            <motion.div key={app.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}>
              <CandidateCard app={app} onSelect={onSelect}/>
            </motion.div>
          ))}
        </AnimatePresence>
        {apps.length === 0 && (
          <div className="h-12 rounded-xl flex items-center justify-center"
            style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
            <span className="text-[10px] text-white/15">Aucun</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal détail candidature ─────────────────────────────────
function ApplicationDetailModal({ app, onClose }) {
  const updateStatus = useUpdateApplicationStatus()
  const [notes, setNotes] = useState(app.recruiter_notes || '')
  const [rejReason, setRejReason] = useState('')
  const [newStatus, setNewStatus] = useState(app.status)

  const handleSave = async () => {
    await updateStatus.mutateAsync({
      id: app.id,
      status: newStatus,
      notes,
      rejection_reason: newStatus === 'refuse' ? rejReason : undefined,
    })
    onClose()
  }

  const nextStages = PIPELINE_STAGES
    .filter(s => s.status !== app.status)
    .slice(0, 3)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0d0d2b', border: '1px solid rgba(255,255,255,0.1)' }}>

        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-white">{app.candidate_name}</h2>
            <p className="text-xs text-white/40">{app.candidate_email}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Infos */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {app.candidate_phone && (
              <div className="flex items-center gap-1.5 text-white/50">
                <Phone size={11}/>{app.candidate_phone}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-white/50">
              <Calendar size={11}/>
              {new Date(app.applied_at).toLocaleDateString('fr-FR')}
            </div>
            {app.job?.title && (
              <div className="flex items-center gap-1.5 text-white/50 col-span-2">
                <Briefcase size={11}/>{app.job.title}
              </div>
            )}
          </div>

          {/* Lettre */}
          {app.cover_letter && (
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">Lettre</p>
              <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap line-clamp-4">
                {app.cover_letter}
              </p>
            </div>
          )}

          {/* Statut */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Statut</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                <button key={k}
                  onClick={() => setNewStatus(k)}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: newStatus === k ? APPLICATION_STATUS_COLORS[k] + '30' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${newStatus === k ? APPLICATION_STATUS_COLORS[k] : 'transparent'}`,
                    color: newStatus === k ? APPLICATION_STATUS_COLORS[k] : 'rgba(255,255,255,0.4)',
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {newStatus === 'refuse' && (
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">
                Motif de refus
              </label>
              <input
                value={rejReason}
                onChange={e => setRejReason(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Ex: Profil ne correspond pas au poste..."
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">Notes recruteur</p>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Vos observations sur le candidat..."
            />
          </div>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={updateStatus.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              {updateStatus.isPending ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Pipeline principal ───────────────────────────────────────
export default function CandidatePipeline() {
  const { data: applications = [], isLoading } = useApplicationsByManager()
  const { data: jobs = [] } = useJobPostings({ hiring_manager_id: undefined })
  const [filterJob, setFilterJob] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)

  const myJobs = useMemo(() => {
    const jobIds = new Set(applications.map(a => a.job_id))
    return jobs.filter(j => jobIds.has(j.id))
  }, [applications, jobs])

  const filtered = useMemo(() => {
    if (!filterJob) return applications
    return applications.filter(a => a.job_id === filterJob)
  }, [applications, filterJob])

  const byStatus = useMemo(() => {
    const map = {}
    PIPELINE_STAGES.forEach(s => { map[s.status] = [] })
    filtered.forEach(app => {
      if (map[app.status]) map[app.status].push(app)
    })
    return map
  }, [filtered])

  if (isLoading) return <div className="text-center py-16 text-white/30 text-sm">Chargement...</div>

  if (applications.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <User size={36} className="mx-auto text-white/10"/>
        <p className="text-white/30 text-sm">Aucune candidature sur vos postes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-3">
        <select
          value={filterJob}
          onChange={e => setFilterJob(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">Tous les postes ({applications.length})</option>
          {myJobs.map(j => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
        <span className="text-xs text-white/25">
          {filtered.length} candidature{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map(stage => (
            <PipelineColumn
              key={stage.status}
              stage={stage}
              apps={byStatus[stage.status] || []}
              onSelect={setSelectedApp}
            />
          ))}
        </div>
      </div>

      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </div>
  )
}
