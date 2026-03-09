// ============================================================
// APEX RH — components/recrutement/RecruitmentPipelineKanban.jsx
// Session 72 — Pipeline Kanban structuré + scoring + actions rapides
// ============================================================
import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Phone, Calendar, Briefcase, X, ChevronRight,
  ChevronLeft, Star, MessageSquare, Archive, Clock, Filter,
  Search, MoreVertical, CheckCircle2, XCircle, StickyNote,
  Zap, RefreshCw, ChevronDown,
} from 'lucide-react'
import {
  useJobApplicationsEnriched, useJobPostings,
  useMoveApplicationStage, useArchiveApplication,
  useAddPipelineNote, useCreateInterview,
  useComputeApplicationScore,
  PIPELINE_STAGES, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS,
  APPLICATION_SOURCE_LABELS, getScoreInfo, SCORE_LABELS,
} from '../../hooks/useRecruitment'
import { useAuth } from '../../contexts/AuthContext'

// ─── Constantes pipeline S72 ─────────────────────────────────
const PIPELINE_STAGES_S72 = [
  { status: 'nouveau',   label: 'Candidature',    color: '#6B7280', icon: '📋' },
  { status: 'en_revue',  label: 'Pré-sélection',  color: '#3B82F6', icon: '🔍' },
  { status: 'telephone', label: 'Screening',       color: '#8B5CF6', icon: '📞' },
  { status: 'entretien', label: 'Entretien RH',    color: '#F59E0B', icon: '💬' },
  { status: 'test',      label: 'Entretien Mgr',   color: '#EC4899', icon: '👔' },
  { status: 'offre',     label: 'Offre',           color: '#10B981', icon: '📄' },
  { status: 'accepte',   label: 'Embauché',        color: '#059669', icon: '✅' },
]

// ─── Badge score ──────────────────────────────────────────────
function ScoreBadge({ score, size = 'sm' }) {
  if (score == null) return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}>
      –
    </span>
  )
  const info = getScoreInfo(score)
  if (!info) return null
  const fontSize = size === 'xs' ? '9px' : '10px'
  return (
    <span className="font-bold rounded-full px-1.5 py-0.5"
      style={{ background: info.bg, color: info.color, fontSize }}>
      {Math.round(score)}%
    </span>
  )
}

// ─── Carte candidat ───────────────────────────────────────────
function CandidateCard({ app, onSelect, stages }) {
  const [showActions, setShowActions] = useState(false)
  const moveApp = useMoveApplicationStage()
  const archiveApp = useArchiveApplication()
  const computeScore = useComputeApplicationScore()

  const currentIdx = stages.findIndex(s => s.status === app.status)
  const prevStage  = currentIdx > 0 ? stages[currentIdx - 1] : null
  const nextStage  = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null

  const handleMove = async (targetStage) => {
    await moveApp.mutateAsync({
      id: app.id,
      new_status: targetStage.status,
      from_status: app.status,
      stage_order: stages.findIndex(s => s.status === targetStage.status),
    })
    setShowActions(false)
  }

  const handleArchive = async () => {
    await archiveApp.mutateAsync({ id: app.id, reason: 'Archivé depuis le pipeline' })
    setShowActions(false)
  }

  const handleRefreshScore = async (e) => {
    e.stopPropagation()
    await computeScore.mutateAsync(app.id)
  }

  const lastInterview = app.interviews?.filter(i => i.status === 'realise')
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))[0]

  const daysInStage = app.updated_at
    ? Math.floor((Date.now() - new Date(app.updated_at)) / 86400000)
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl p-3 relative group cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      onClick={() => !showActions && onSelect(app)}>

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-tight truncate">{app.candidate_name}</p>
          <p className="text-[10px] text-white/30 truncate">{app.candidate_email}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ScoreBadge score={app.match_score} size="xs"/>
          <button
            onClick={e => { e.stopPropagation(); setShowActions(!showActions) }}
            className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <MoreVertical size={10} className="text-white/50"/>
          </button>
        </div>
      </div>

      {/* ─── Meta ─── */}
      <div className="flex items-center gap-2 text-[10px] text-white/25 mb-2">
        {app.job?.title && (
          <span className="flex items-center gap-0.5 truncate max-w-[110px]">
            <Briefcase size={9}/> {app.job.title}
          </span>
        )}
        {daysInStage != null && (
          <span className="flex items-center gap-0.5 ml-auto flex-shrink-0"
            style={{ color: daysInStage > 7 ? '#F97316' : undefined }}>
            <Clock size={9}/> {daysInStage}j
          </span>
        )}
      </div>

      {/* ─── Tags ─── */}
      <div className="flex flex-wrap gap-1">
        {app.is_internal && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>Interne</span>
        )}
        {app.source && app.source !== 'autre' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
            {APPLICATION_SOURCE_LABELS[app.source] || app.source}
          </span>
        )}
        {lastInterview && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>
            Entretien OK
          </span>
        )}
        {app.pipeline_notes && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#FCD34D' }}>
            <StickyNote size={8} className="inline mr-0.5"/>Note
          </span>
        )}
      </div>

      {/* ─── Actions rapides ─── */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            onClick={e => e.stopPropagation()}
            className="absolute top-1 right-1 z-20 rounded-xl py-1.5 min-w-[160px] shadow-2xl"
            style={{ background: '#13133a', border: '1px solid rgba(255,255,255,0.12)' }}>

            {prevStage && (
              <button onClick={() => handleMove(prevStage)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                <ChevronLeft size={11}/> ← {prevStage.label}
              </button>
            )}
            {nextStage && (
              <button onClick={() => handleMove(nextStage)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-white/80 hover:text-white hover:bg-white/5 transition-colors font-medium">
                <ChevronRight size={11}/> {nextStage.label} →
              </button>
            )}

            <div className="border-t border-white/[0.06] my-1"/>

            <button onClick={() => { onSelect(app); setShowActions(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
              <Calendar size={11}/> Planifier entretien
            </button>

            <button onClick={handleRefreshScore}
              disabled={computeScore.isPending}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
              <RefreshCw size={11} className={computeScore.isPending ? 'animate-spin' : ''}/>
              Recalcul score
            </button>

            <div className="border-t border-white/[0.06] my-1"/>

            <button onClick={handleArchive}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors">
              <Archive size={11}/> Archiver
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Colonne Kanban ───────────────────────────────────────────
function KanbanColumn({ stage, apps, onSelect, stages, isCollapsed, onToggleCollapse }) {
  const totalScore = apps.filter(a => a.match_score != null)
  const avgScore = totalScore.length
    ? Math.round(totalScore.reduce((s, a) => s + a.match_score, 0) / totalScore.length)
    : null

  return (
    <div className="flex-shrink-0" style={{ width: isCollapsed ? '48px' : '200px', transition: 'width 0.2s ease' }}>
      {/* ─── Header colonne ─── */}
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <button onClick={onToggleCollapse}
          className="flex items-center gap-1.5 min-w-0 flex-1"
          title={isCollapsed ? 'Développer' : 'Réduire'}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }}/>
          {!isCollapsed && (
            <>
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider truncate">
                {stage.label}
              </span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{ background: stage.color + '20', color: stage.color }}>
                {apps.length}
              </span>
            </>
          )}
          {isCollapsed && (
            <span className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
              style={{ background: stage.color + '20', color: stage.color }}>
              {apps.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── Score moyen ─── */}
      {!isCollapsed && avgScore != null && (
        <div className="flex items-center gap-1 mb-2 px-1">
          <Star size={9} className="text-yellow-400/50"/>
          <span className="text-[9px] text-white/25">Moy. {avgScore}%</span>
        </div>
      )}

      {/* ─── Cartes ─── */}
      {!isCollapsed && (
        <div className="space-y-2 min-h-[80px]">
          <AnimatePresence>
            {apps.map(app => (
              <CandidateCard
                key={app.id}
                app={app}
                stages={stages}
                onSelect={onSelect}
              />
            ))}
          </AnimatePresence>
          {apps.length === 0 && (
            <div className="h-16 rounded-xl flex items-center justify-center"
              style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] text-white/15">Vide</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal détail candidature enrichi ─────────────────────────
function ApplicationDetailModalS72({ app, onClose, stages }) {
  const moveApp     = useMoveApplicationStage()
  const addNote     = useAddPipelineNote()
  const createIntv  = useCreateInterview()
  const archiveApp  = useArchiveApplication()
  const { profile } = useAuth()

  const [tab, setTab]               = useState('info')
  const [note, setNote]             = useState(app.pipeline_notes || '')
  const [showInterview, setShowInterview] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejReason, setRejReason]   = useState(app.rejection_reason || '')
  const [interviewData, setInterviewData] = useState({
    interview_type: 'rh',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    interviewer_id: profile?.id,
  })

  const currentIdx = stages.findIndex(s => s.status === app.status)

  const handleMove = async (stage) => {
    await moveApp.mutateAsync({
      id: app.id,
      new_status: stage.status,
      from_status: app.status,
      stage_order: stages.findIndex(s => s.status === stage.status),
    })
    onClose()
  }

  const handleSaveNote = async () => {
    await addNote.mutateAsync({ id: app.id, note })
    onClose()
  }

  const handleScheduleInterview = async () => {
    if (!interviewData.scheduled_at) return
    await createIntv.mutateAsync({
      application_id: app.id,
      ...interviewData,
    })
    setShowInterview(false)
    onClose()
  }

  const handleReject = async () => {
    await moveApp.mutateAsync({
      id: app.id,
      new_status: 'refuse',
      from_status: app.status,
      stage_order: 99,
      pipeline_notes: rejReason,
    })
    onClose()
  }

  const handleArchive = async () => {
    await archiveApp.mutateAsync({ id: app.id, reason: rejReason || 'Archivé' })
    onClose()
  }

  const avgInterviewScore = useMemo(() => {
    const scores = app.interviews
      ?.flatMap(i => i.feedback || [])
      .map(f => f.overall_score)
      .filter(s => s != null) || []
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) : null
  }, [app.interviews])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0d0d2b', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}>

        {/* ─── Header ─── */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              <User size={18} className="text-white"/>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">{app.candidate_name}</h2>
              <p className="text-xs text-white/40">{app.candidate_email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: APPLICATION_STATUS_COLORS[app.status] + '25', color: APPLICATION_STATUS_COLORS[app.status] }}>
                  {APPLICATION_STATUS_LABELS[app.status]}
                </span>
                <ScoreBadge score={app.match_score}/>
                {avgInterviewScore != null && (
                  <span className="text-[10px] text-yellow-400/70">
                    <Star size={9} className="inline mr-0.5"/>Entretien : {avgInterviewScore}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white mt-1 flex-shrink-0">
            <X size={18}/>
          </button>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 px-5 pt-3">
          {[
            { id: 'info',  label: 'Infos' },
            { id: 'move',  label: 'Déplacer' },
            { id: 'note',  label: 'Note' },
            { id: 'interview', label: 'Entretien' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                color:      tab === t.id ? '#818CF8' : 'rgba(255,255,255,0.35)',
                border: tab === t.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Body ─── */}
        <div className="p-5 overflow-y-auto flex-1">

          {/* ─── TAB INFO ─── */}
          {tab === 'info' && (
            <div className="space-y-4">
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
                {app.source && (
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Zap size={11}/>{APPLICATION_SOURCE_LABELS[app.source] || app.source}
                  </div>
                )}
              </div>

              {app.cover_letter && (
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">Lettre de motivation</p>
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-5">{app.cover_letter}</p>
                </div>
              )}

              {app.pipeline_notes && (
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">Notes pipeline</p>
                  <p className="text-xs text-white/50 bg-white/[0.03] rounded-xl p-3 leading-relaxed">{app.pipeline_notes}</p>
                </div>
              )}

              {/* Entretiens passés */}
              {app.interviews && app.interviews.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                    Entretiens ({app.interviews.length})
                  </p>
                  <div className="space-y-1.5">
                    {app.interviews.slice(0, 4).map(intv => {
                      const fb = intv.feedback?.[0]
                      return (
                        <div key={intv.id} className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                          style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-center gap-2 text-white/50">
                            <span className="capitalize">{intv.interview_type}</span>
                            <span className="text-white/20">
                              {new Date(intv.scheduled_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          {fb?.overall_score && (
                            <span className="text-yellow-400/70">
                              <Star size={10} className="inline mr-0.5"/>
                              {fb.overall_score}/10
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB DÉPLACER ─── */}
          {tab === 'move' && (
            <div className="space-y-3">
              <p className="text-xs text-white/30 mb-3">Déplacer vers :</p>
              <div className="space-y-2">
                {stages.map((stage, idx) => {
                  const isCurrent = stage.status === app.status
                  return (
                    <button key={stage.status}
                      disabled={isCurrent || moveApp.isPending}
                      onClick={() => handleMove(stage)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all disabled:opacity-40"
                      style={{
                        background: isCurrent ? stage.color + '20' : 'rgba(255,255,255,0.04)',
                        border: isCurrent ? `1px solid ${stage.color}40` : '1px solid rgba(255,255,255,0.07)',
                      }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }}/>
                      <span className="text-sm font-medium" style={{ color: isCurrent ? stage.color : 'rgba(255,255,255,0.7)' }}>
                        {stage.label}
                      </span>
                      {isCurrent && <span className="ml-auto text-[10px] text-white/30">Actuel</span>}
                    </button>
                  )
                })}
              </div>

              <div className="border-t border-white/[0.06] pt-3 space-y-2">
                <button onClick={() => setShowReject(!showReject)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <XCircle size={14} className="text-red-400"/>
                  <span className="text-sm font-medium text-red-400">Refuser le candidat</span>
                </button>
                {showReject && (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={rejReason}
                      onChange={e => setRejReason(e.target.value)}
                      placeholder="Motif de refus..."
                      className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}/>
                    <button onClick={handleReject} disabled={moveApp.isPending}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                      {moveApp.isPending ? 'En cours...' : 'Confirmer le refus'}
                    </button>
                  </div>
                )}

                <button onClick={handleArchive} disabled={archiveApp.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)' }}>
                  <Archive size={14} className="text-white/40"/>
                  <span className="text-sm font-medium text-white/40">Archiver (sans refus)</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB NOTE ─── */}
          {tab === 'note' && (
            <div className="space-y-3">
              <p className="text-xs text-white/30">Note pipeline (visible par les recruteurs)</p>
              <textarea
                rows={6}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Observations, points clés, impressions..."
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}/>
              <button onClick={handleSaveNote} disabled={addNote.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                {addNote.isPending ? 'Sauvegarde...' : 'Enregistrer la note'}
              </button>
            </div>
          )}

          {/* ─── TAB ENTRETIEN ─── */}
          {tab === 'interview' && (
            <div className="space-y-3">
              <p className="text-xs text-white/30">Planifier un entretien pour {app.candidate_name}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">Type</label>
                  <select
                    value={interviewData.interview_type}
                    onChange={e => setInterviewData(p => ({ ...p, interview_type: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {[
                      ['telephone','Téléphone'],['visio','Visioconférence'],
                      ['presentiel','Présentiel'],['technique','Technique'],
                      ['rh','RH'],['direction','Direction']
                    ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">Durée (min)</label>
                  <select
                    value={interviewData.duration_minutes}
                    onChange={e => setInterviewData(p => ({ ...p, duration_minutes: +e.target.value }))}
                    className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {[30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">Date et heure</label>
                <input
                  type="datetime-local"
                  value={interviewData.scheduled_at}
                  onChange={e => setInterviewData(p => ({ ...p, scheduled_at: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}/>
              </div>

              <div>
                <label className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">Lieu / Lien</label>
                <input
                  value={interviewData.location}
                  onChange={e => setInterviewData(p => ({ ...p, location: e.target.value }))}
                  placeholder="Salle A / meet.google.com/..."
                  className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}/>
              </div>

              <button onClick={handleScheduleInterview} disabled={!interviewData.scheduled_at || createIntv.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
                {createIntv.isPending ? 'Planification...' : 'Planifier l\'entretien'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── PIPELINE PRINCIPAL ───────────────────────────────────────
export default function RecruitmentPipelineKanban() {
  const { data: applications = [], isLoading } = useJobApplicationsEnriched()
  const { data: jobs = [] } = useJobPostings({ is_published: true })

  const [filterJob,    setFilterJob]    = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterScore,  setFilterScore]  = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [selectedApp,  setSelectedApp]  = useState(null)
  const [collapsed,    setCollapsed]    = useState({})

  const stages = PIPELINE_STAGES_S72

  // Filtrage
  const filtered = useMemo(() => {
    let arr = applications
    if (filterJob)    arr = arr.filter(a => a.job_id === filterJob)
    if (filterSource) arr = arr.filter(a => a.source === filterSource)
    if (filterScore) {
      const minScore = filterScore === 'excellent' ? 80
        : filterScore === 'fort' ? 65
        : filterScore === 'moyen' ? 45
        : 0
      const maxScore = filterScore === 'excellent' ? 100
        : filterScore === 'fort' ? 79
        : filterScore === 'moyen' ? 64
        : 44
      arr = arr.filter(a => a.match_score != null && a.match_score >= minScore && a.match_score <= maxScore)
    }
    if (filterSearch) {
      const s = filterSearch.toLowerCase()
      arr = arr.filter(a =>
        a.candidate_name?.toLowerCase().includes(s) ||
        a.candidate_email?.toLowerCase().includes(s) ||
        a.job?.title?.toLowerCase().includes(s)
      )
    }
    return arr
  }, [applications, filterJob, filterSource, filterScore, filterSearch])

  // Regrouper par statut
  const byStatus = useMemo(() => {
    const map = {}
    stages.forEach(s => { map[s.status] = [] })
    filtered.forEach(app => {
      if (map[app.status] !== undefined) map[app.status].push(app)
    })
    return map
  }, [filtered, stages])

  // Compter les candidats actifs (hors terminal)
  const activeCount = useMemo(() =>
    filtered.filter(a => !['accepte','refuse','retire'].includes(a.status)).length
  , [filtered])

  const handleToggleCollapse = useCallback((status) => {
    setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))
  }, [])

  if (isLoading) {
    return (
      <div className="text-center py-16 text-white/30 text-sm">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        Chargement du pipeline...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ─── Filtres ─── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Recherche */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25"/>
          <input
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-7 pr-3 py-2 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}/>
        </div>

        {/* Filtre offre */}
        <select
          value={filterJob}
          onChange={e => setFilterJob(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[180px]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">Tous les postes</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>

        {/* Filtre source */}
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">Toutes sources</option>
          {Object.entries(APPLICATION_SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Filtre score */}
        <select
          value={filterScore}
          onChange={e => setFilterScore(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">Tous les scores</option>
          <option value="excellent">Excellent (≥80%)</option>
          <option value="fort">Fort (65–79%)</option>
          <option value="moyen">Moyen (45–64%)</option>
          <option value="faible">Faible (&lt;45%)</option>
        </select>

        <span className="text-xs text-white/25 ml-auto">
          {filtered.length} candidature{filtered.length > 1 ? 's' : ''} · {activeCount} actif{activeCount > 1 ? 's' : ''}
        </span>
      </div>

      {/* ─── Kanban ─── */}
      {applications.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <User size={40} className="mx-auto text-white/10"/>
          <p className="text-white/30 text-sm">Aucune candidature dans le pipeline</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-3 min-w-max">
            {stages.map(stage => (
              <KanbanColumn
                key={stage.status}
                stage={stage}
                apps={byStatus[stage.status] || []}
                stages={stages}
                onSelect={setSelectedApp}
                isCollapsed={!!collapsed[stage.status]}
                onToggleCollapse={() => handleToggleCollapse(stage.status)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Modal ─── */}
      <AnimatePresence>
        {selectedApp && (
          <ApplicationDetailModalS72
            app={selectedApp}
            stages={stages}
            onClose={() => setSelectedApp(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
