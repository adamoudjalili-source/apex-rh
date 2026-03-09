// ============================================================
// APEX RH — components/recrutement/InterviewPanel.jsx
// Session 59 — Entretiens planifiés (vue manager/admin)
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, Video, Phone, MapPin, User,
  Plus, CheckCircle, X, AlertCircle, ChevronRight,
} from 'lucide-react'
import {
  useMyUpcomingInterviews, useInterviews, useCreateInterview, useUpdateInterview,
  INTERVIEW_TYPE_LABELS, INTERVIEW_TYPE_COLORS,
  INTERVIEW_STATUS_LABELS, INTERVIEW_STATUS_COLORS,
} from '../../hooks/useRecruitment'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_ICONS = {
  telephone: Phone,
  visio: Video,
  presentiel: MapPin,
  technique: AlertCircle,
  rh: User,
  direction: User,
}

// ─── Carte entretien ──────────────────────────────────────────
function InterviewCard({ iv, onUpdateStatus }) {
  const typeColor = INTERVIEW_TYPE_COLORS[iv.type] || '#6B7280'
  const statusColor = INTERVIEW_STATUS_COLORS[iv.status] || '#6B7280'
  const Icon = TYPE_ICONS[iv.type] || Calendar
  const scheduled = new Date(iv.scheduled_at)
  const isToday = scheduled.toDateString() === new Date().toDateString()
  const isPast = scheduled < new Date()

  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: typeColor + '20' }}>
            <Icon size={15} style={{ color: typeColor }}/>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-semibold text-white">
                {iv.application?.candidate_name || 'Candidat'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{ background: typeColor + '20', color: typeColor }}>
                {INTERVIEW_TYPE_LABELS[iv.type]}
              </span>
            </div>
            {iv.application?.job?.title && (
              <p className="text-xs text-white/30">{iv.application.job.title}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <Calendar size={11}/>
                {isToday ? (
                  <span className="text-amber-400 font-semibold">
                    Aujourd'hui {scheduled.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  scheduled.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                )}
              </span>
              {iv.duration_min && (
                <span className="flex items-center gap-1">
                  <Clock size={11}/>{iv.duration_min}min
                </span>
              )}
            </div>
            {iv.location && (
              <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                <MapPin size={10}/>{iv.location}
              </p>
            )}
            {iv.meeting_link && (
              <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-0.5 flex items-center gap-1">
                <Video size={10}/> Lien réunion
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30` }}>
            {INTERVIEW_STATUS_LABELS[iv.status]}
          </span>
          {!isPast && iv.status === 'planifie' && onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(iv.id, 'confirme')}
              className="text-[10px] text-white/30 hover:text-white transition-colors">
              Confirmer
            </button>
          )}
          {isPast && iv.status === 'confirme' && onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(iv.id, 'realise')}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
              Marquer réalisé
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mes prochains entretiens ─────────────────────────────────
export function MyUpcomingInterviews() {
  const { data: interviews = [], isLoading } = useMyUpcomingInterviews()
  const updateInterview = useUpdateInterview()

  if (isLoading) return <div className="text-sm text-white/30 text-center py-6">Chargement...</div>

  if (interviews.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <Calendar size={28} className="mx-auto text-white/10"/>
        <p className="text-sm text-white/25">Aucun entretien prévu</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {interviews.map(iv => (
        <InterviewCard
          key={iv.id}
          iv={iv}
          onUpdateStatus={(id, status) => updateInterview.mutate({ id, status })}
        />
      ))}
    </div>
  )
}

// ─── Panel entretiens pour une candidature ────────────────────
export function ApplicationInterviews({ applicationId}) {
  const { profile } = useAuth()
  const { data: interviews = [], isLoading } = useInterviews(applicationId)
  const createInterview = useCreateInterview()
  const updateInterview = useUpdateInterview()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'presentiel',
    scheduled_at: '',
    duration_min: 60,
    location: '',
    meeting_link: '',
    notes_prep: '',
    interviewer_id: profile?.id || '',
    status: 'planifie',
  })

  const handleCreate = async () => {
    if (!form.scheduled_at) return
    await createInterview.mutateAsync({
      application_id: applicationId,
      ...form,
    })
    setShowForm(false)
    setForm(f => ({ ...f, scheduled_at: '', location: '', meeting_link: '', notes_prep: '' }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
          Entretiens ({interviews.length})
        </p>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-white/60 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Plus size={11}/> Planifier
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-3 rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {Object.entries(INTERVIEW_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Durée (min)</label>
              <input type="number" value={form.duration_min}
                onChange={e => setForm(f => ({ ...f, duration_min: +e.target.value }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                min={15} max={240}/>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-white/30 mb-1">Date & heure *</label>
            <input type="datetime-local" value={form.scheduled_at}
              onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              className="w-full rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}/>
          </div>
          {['telephone', 'presentiel'].includes(form.type) && (
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Lieu</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Salle de réunion / Adresse"/>
            </div>
          )}
          {form.type === 'visio' && (
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Lien visio</label>
              <input value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="https://meet.google.com/..."/>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-1.5 rounded-lg text-xs text-white/40"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              Annuler
            </button>
            <button onClick={handleCreate} disabled={createInterview.isPending || !form.scheduled_at}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              {createInterview.isPending ? '...' : 'Créer'}
            </button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="text-xs text-white/25 text-center py-4">Chargement...</div>
      ) : interviews.length === 0 ? (
        <div className="text-xs text-white/20 text-center py-4">Aucun entretien planifié</div>
      ) : (
        <div className="space-y-2">
          {interviews.map(iv => (
            <InterviewCard
              key={iv.id}
              iv={iv}
              onUpdateStatus={(id, status) => updateInterview.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Default export : widget mes entretiens ───────────────────
export default function InterviewPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-indigo-400"/>
          Mes prochains entretiens
        </h3>
        <MyUpcomingInterviews/>
      </div>
    </div>
  )
}
