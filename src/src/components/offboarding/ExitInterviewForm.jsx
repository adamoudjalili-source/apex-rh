// ============================================================
// APEX RH — src/components/offboarding/ExitInterviewForm.jsx
// Session 68 — Formulaire entretien de sortie
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Save, Calendar, User } from 'lucide-react'
import {
  useOffboardingInterview, useCreateInterview, useUpdateInterview,
  EXIT_REASON_LABELS,
} from '../../hooks/useOffboarding'
import { useAuth } from '../../contexts/AuthContext'

const MAIN_REASONS = Object.entries(EXIT_REASON_LABELS)

function ScoreButton({ value, selected, onClick }) {
  const colors = {
    1: '#EF4444', 2: '#F97316', 3: '#F59E0B', 4: '#EAB308',
    5: '#84CC16', 6: '#22C55E', 7: '#10B981', 8: '#06B6D4',
    9: '#3B82F6', 10: '#6366F1',
  }
  const color = colors[value] || '#6B7280'
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className="w-9 h-9 rounded-xl text-xs font-bold transition-all duration-150"
      style={{
        background:   selected ? color : 'rgba(255,255,255,0.04)',
        color:        selected ? 'white' : 'rgba(255,255,255,0.4)',
        border:       `1px solid ${selected ? color : 'rgba(255,255,255,0.08)'}`,
        transform:    selected ? 'scale(1.1)' : 'scale(1)',
        boxShadow:    selected ? `0 0 12px ${color}40` : 'none',
      }}>
      {value}
    </button>
  )
}

export default function ExitInterviewForm({ processId, readOnly = false }) {
  const { profile } = useAuth()
  const { data: interview } = useOffboardingInterview(processId)
  const createInterview     = useCreateInterview()
  const updateInterview     = useUpdateInterview()

  const [form, setForm] = useState({
    interviewer_id:     profile?.id || '',
    scheduled_at:       '',
    conducted_at:       '',
    satisfaction_score: null,
    would_recommend:    null,
    main_reason:        '',
    feedback:           '',
    improvements:       '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (interview) {
      setForm({
        interviewer_id:     interview.interviewer_id || profile?.id || '',
        scheduled_at:       interview.scheduled_at ? interview.scheduled_at.slice(0, 16) : '',
        conducted_at:       interview.conducted_at  ? interview.conducted_at.slice(0, 16) : '',
        satisfaction_score: interview.satisfaction_score,
        would_recommend:    interview.would_recommend,
        main_reason:        interview.main_reason || '',
        feedback:           interview.feedback || '',
        improvements:       interview.improvements || '',
      })
    }
  }, [interview])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      process_id:     processId,
      scheduled_at:   form.scheduled_at || null,
      conducted_at:   form.conducted_at  || null,
    }
    if (interview) {
      await updateInterview.mutateAsync({ id: interview.id, processId, ...payload })
    } else {
      await createInterview.mutateAsync(payload)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const isPending = createInterview.isPending || updateInterview.isPending

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit}
      className="space-y-6">

      {/* Score de satisfaction */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Score de satisfaction (1-10)
        </label>
        <div className="flex flex-wrap gap-2">
          {[1,2,3,4,5,6,7,8,9,10].map(v => (
            <ScoreButton key={v} value={v}
              selected={form.satisfaction_score === v}
              onClick={score => !readOnly && setForm(f => ({ ...f, satisfaction_score: score }))}/>
          ))}
        </div>
        {form.satisfaction_score && (
          <p className="text-xs text-white/40 mt-2">
            Score sélectionné : <span className="text-white/70 font-medium">{form.satisfaction_score}/10</span>
          </p>
        )}
      </div>

      {/* Recommandation */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Recommanderait l'entreprise ?
        </label>
        <div className="flex gap-3">
          {[true, false].map(val => (
            <button key={String(val)} type="button" disabled={readOnly}
              onClick={() => setForm(f => ({ ...f, would_recommend: val }))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all"
              style={{
                background:  form.would_recommend === val ? (val ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.03)',
                borderColor: form.would_recommend === val ? (val ? '#10B981' : '#EF4444') : 'rgba(255,255,255,0.08)',
                color:       form.would_recommend === val ? (val ? '#10B981' : '#EF4444') : 'rgba(255,255,255,0.5)',
              }}>
              {val ? <ThumbsUp size={14}/> : <ThumbsDown size={14}/>}
              {val ? 'Oui' : 'Non'}
            </button>
          ))}
        </div>
      </div>

      {/* Motif principal */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          Motif principal du départ
        </label>
        <select value={form.main_reason}
          onChange={e => setForm(f => ({ ...f, main_reason: e.target.value }))}
          disabled={readOnly}
          className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/[0.08] outline-none focus:border-indigo-500/50"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <option value="">— Sélectionner —</option>
          {MAIN_REASONS.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Feedback */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          Feedback général
        </label>
        <textarea value={form.feedback}
          onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))}
          disabled={readOnly}
          rows={3}
          placeholder="Ce que le collaborateur a apprécié, son ressenti global..."
          className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 border border-white/[0.08] outline-none focus:border-indigo-500/50 resize-none"
          style={{ background: 'rgba(255,255,255,0.04)' }}/>
      </div>

      {/* Améliorations */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          Points d'amélioration suggérés
        </label>
        <textarea value={form.improvements}
          onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))}
          disabled={readOnly}
          rows={3}
          placeholder="Suggestions du collaborateur pour améliorer l'organisation..."
          className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 border border-white/[0.08] outline-none focus:border-indigo-500/50 resize-none"
          style={{ background: 'rgba(255,255,255,0.04)' }}/>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Calendar size={10}/> Entretien planifié le
          </label>
          <input type="datetime-local" value={form.scheduled_at}
            onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
            disabled={readOnly}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/[0.08] outline-none focus:border-indigo-500/50"
            style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }}/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Calendar size={10}/> Entretien conduit le
          </label>
          <input type="datetime-local" value={form.conducted_at}
            onChange={e => setForm(f => ({ ...f, conducted_at: e.target.value }))}
            disabled={readOnly}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/[0.08] outline-none focus:border-indigo-500/50"
            style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }}/>
        </div>
      </div>

      {/* Submit */}
      {!readOnly && (
        <div className="flex justify-end">
          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
              color:      saved ? '#10B981' : '#818CF8',
              border:     `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
            }}>
            <Save size={14}/>
            {isPending ? 'Sauvegarde...' : saved ? 'Sauvegardé ✓' : interview ? 'Mettre à jour' : 'Enregistrer l\'entretien'}
          </button>
        </div>
      )}
    </motion.form>
  )
}
