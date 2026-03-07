// ============================================================
// APEX RH — components/recrutement/JobBoard.jsx
// Session 59 — Tableau des offres d'emploi internes
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase, MapPin, Clock, ChevronDown, ChevronUp,
  Calendar, Users, Star, Send, Search, Filter, X, Eye,
} from 'lucide-react'
import {
  useJobPostings, useCreateApplication,
  CONTRACT_TYPE_LABELS, CONTRACT_TYPE_COLORS,
  formatSalaryRange, isDeadlineSoon, isDeadlinePassed,
} from '../../hooks/useRecruitment'
import { useAuth } from '../../contexts/AuthContext'

// ─── Card offre ──────────────────────────────────────────────
function JobCard({ job, onApply, onView }) {
  const [expanded, setExpanded] = useState(false)
  const deadlineSoon = isDeadlineSoon(job.deadline)
  const deadlinePassed = isDeadlinePassed(job.deadline)
  const typeColor = CONTRACT_TYPE_COLORS[job.contract_type] || '#6B7280'

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: typeColor + '20', color: typeColor }}>
                {CONTRACT_TYPE_LABELS[job.contract_type]}
              </span>
              {job.is_internal && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                  Mobilité interne
                </span>
              )}
              {deadlineSoon && !deadlinePassed && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                  Urgent
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white">{job.title}</h3>
            {job.reference_code && (
              <p className="text-[11px] text-white/30 mt-0.5">Réf. {job.reference_code}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-white/40 hover:text-white/70 transition-colors mt-1">
            {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-[12px] text-white/40">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11}/>{job.location}
              {job.is_remote && ' (Remote ok)'}
            </span>
          )}
          {job.division?.name && (
            <span className="flex items-center gap-1">
              <Users size={11}/>{job.division.name}
            </span>
          )}
          {job.deadline && (
            <span className="flex items-center gap-1" style={{ color: deadlinePassed ? '#EF4444' : deadlineSoon ? '#F59E0B' : undefined }}>
              <Calendar size={11}/>
              Clôture : {new Date(job.deadline).toLocaleDateString('fr-FR')}
            </span>
          )}
          {(job.salary_min || job.salary_max) && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Star size={11}/>
              {formatSalaryRange(job.salary_min, job.salary_max, job.currency)}
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}>
            <div className="px-5 pb-4 border-t border-white/[0.05] pt-4 space-y-3">
              {job.description && (
                <div>
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
              {job.requirements && (
                <div>
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">Profil recherché</p>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
                </div>
              )}
              {job.skills_required?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">Compétences</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills_required.map(s => (
                      <span key={s} className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.benefits && (
                <div>
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">Avantages</p>
                  <p className="text-sm text-white/70">{job.benefits}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => onView(job)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Eye size={14}/> Détail
                </button>
                {!deadlinePassed && (
                  <button onClick={() => onApply(job)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                    <Send size={14}/> Postuler
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Modal postuler ───────────────────────────────────────────
function ApplyModal({ job, onClose }) {
  const { profile } = useAuth()
  const createApplication = useCreateApplication()
  const [form, setForm] = useState({
    candidate_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    candidate_email: profile?.email || '',
    candidate_phone: '',
    candidate_linkedin: '',
    cover_letter: '',
    source: 'site_web',
    is_internal: !!profile,
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!form.candidate_name || !form.candidate_email) return
    await createApplication.mutateAsync({
      job_id: job.id,
      ...form,
      applicant_user_id: profile?.id || null,
    })
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0d0d2b', border: '1px solid rgba(255,255,255,0.1)' }}>

        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-white">Postuler à ce poste</h2>
            <p className="text-sm text-white/40">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18}/>
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)' }}>
              <Send size={28} className="text-emerald-400"/>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Candidature envoyée !</h3>
            <p className="text-sm text-white/50 mb-5">Votre candidature a bien été transmise. Vous serez contacté(e) prochainement.</p>
            <button onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              Fermer
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-white/40 mb-1">Nom complet *</label>
                <input
                  value={form.candidate_name}
                  onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="Prénom Nom"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/40 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.candidate_email}
                  onChange={e => setForm(f => ({ ...f, candidate_email: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-white/40 mb-1">Téléphone</label>
                <input
                  value={form.candidate_phone}
                  onChange={e => setForm(f => ({ ...f, candidate_phone: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="+221 77 000 00 00"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/40 mb-1">LinkedIn</label>
                <input
                  value={form.candidate_linkedin}
                  onChange={e => setForm(f => ({ ...f, candidate_linkedin: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="linkedin.com/in/..."
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1">Lettre de motivation</label>
              <textarea
                rows={4}
                value={form.cover_letter}
                onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Présentez votre candidature..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Annuler
              </button>
              <button onClick={handleSubmit}
                disabled={createApplication.isPending || !form.candidate_name || !form.candidate_email}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                {createApplication.isPending ? 'Envoi...' : 'Envoyer ma candidature'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Job Board principal ──────────────────────────────────────
export default function JobBoard({ onViewJob }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [applyJob, setApplyJob] = useState(null)

  const { data: jobs = [], isLoading } = useJobPostings({
    active_only: true,
    search: search || undefined,
    contract_type: filterType || undefined,
  })

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un poste..."
            className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">Tous les contrats</option>
          {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-16 text-white/30 text-sm">Chargement des offres...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Briefcase size={36} className="mx-auto text-white/10"/>
          <p className="text-white/30 text-sm">Aucune offre disponible pour le moment</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {jobs.map(job => (
            <JobCard key={job.id} job={job}
              onApply={setApplyJob}
              onView={onViewJob || (() => {})}
            />
          ))}
        </div>
      )}

      {applyJob && <ApplyModal job={applyJob} onClose={() => setApplyJob(null)}/>}
    </div>
  )
}
