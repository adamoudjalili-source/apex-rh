// ============================================================
// APEX RH — MobileHome.jsx  ·  Session 39
// Vue home mobile optimisée — actions rapides + brief + pulse snapshot
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sun, Moon, Activity, CheckSquare, MessageSquare, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { useTodayMorningPlan, useTodayLog, useTodayScore } from '../../hooks/usePulse'
import { useFeedbackToGive } from '../../hooks/useFeedback360'
import { useTasks } from '../../hooks/useTasks'
import { isPulseEnabled, getScoreColor, getScoreLabel, getDayStatus } from '../../lib/pulseHelpers'
import MobileBriefForm from './MobileBriefForm'

export default function MobileHome() {
  const { profile } = useAuth()
  const { data: settings } = useAppSettings()
  const { data: morningPlan } = useTodayMorningPlan()
  const { data: dailyLog } = useTodayLog()
  const { data: todayScore } = useTodayScore()
  const { data: pendingFeedbacks = [] } = useFeedbackToGive?.() || { data: [] }
  const { data: tasks = [] } = useTasks({ status: 'en_cours' })

  const pulseOn = isPulseEnabled(settings)
  const dayStatus = getDayStatus(morningPlan, dailyLog)
  const briefDone = morningPlan?.status === 'submitted' || morningPlan?.status === 'acknowledged'
  const journalDone = dailyLog?.status === 'submitted' || dailyLog?.status === 'validated'

  const [showBrief, setShowBrief] = useState(false)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const prenom = profile?.first_name || 'Vous'

  const score = todayScore?.score_total
  const scoreColor = getScoreColor(score)

  const urgentTasks = tasks.filter(t => t.priority === 'urgente').slice(0, 3)
  const inProgressTasks = tasks.filter(t => t.status === 'en_cours').slice(0, 3)

  return (
    <div className="px-4 py-5 space-y-5 pb-24 md:hidden">
      {/* Greeting */}
      <div>
        <p className="text-sm text-white/40 font-medium">
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-2xl font-black text-white mt-1" style={{ fontFamily: "'Syne', sans-serif" }}>
          {greeting}, {prenom} 👋
        </h1>
      </div>

      {/* PULSE Score Card */}
      {pulseOn && (
        <motion.div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{
            background: score != null
              ? `linear-gradient(135deg, ${scoreColor}18, ${scoreColor}08)`
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${score != null ? scoreColor + '30' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${scoreColor}20` }}
            >
              <Activity size={24} style={{ color: scoreColor }} />
            </div>
            <div>
              <p className="text-xs text-white/40 font-medium">Score PULSE</p>
              <p className="text-xl font-black text-white">
                {score != null ? score : '—'}
                {score != null && <span className="text-sm text-white/30 font-medium">/100</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: scoreColor }}>
              {score != null ? getScoreLabel(score) : 'En attente'}
            </p>
            <Link
              to="/ma-performance"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Voir détails →
            </Link>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Actions rapides</p>
        <div className="grid grid-cols-2 gap-3">

          {/* Brief */}
          {pulseOn && (
            <button
              type="button"
              onClick={() => !briefDone && setShowBrief(true)}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                background: briefDone ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${briefDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <div className="flex items-center justify-between w-full">
                <Sun size={20} style={{ color: briefDone ? '#10B981' : '#F59E0B' }} />
                {briefDone && <span className="text-green-400 text-xs">✓</span>}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Brief matinal</p>
                <p className="text-xs text-white/40">{briefDone ? 'Complété' : '3 taps'}</p>
              </div>
            </button>
          )}

          {/* Journal */}
          {pulseOn && (
            <Link
              to="/travail/taches"
              className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                background: journalDone ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${journalDone ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <div className="flex items-center justify-between w-full">
                <Moon size={20} style={{ color: journalDone ? '#6366F1' : 'rgba(255,255,255,0.4)' }} />
                {journalDone && <span className="text-indigo-400 text-xs">✓</span>}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Journal du soir</p>
                <p className="text-xs text-white/40">{journalDone ? 'Soumis' : 'Remplir'}</p>
              </div>
            </Link>
          )}

          {/* Tâches urgentes */}
          <Link
            to="/travail/taches"
            className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between w-full">
              <CheckSquare size={20} className="text-blue-400" />
              {urgentTasks.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#EF4444', color: '#fff' }}>
                  {urgentTasks.length}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">Mes tâches</p>
              <p className="text-xs text-white/40">{urgentTasks.length > 0 ? `${urgentTasks.length} urgente(s)` : 'En cours'}</p>
            </div>
          </Link>

          {/* Feedbacks */}
          <Link
            to="/travail/taches"
            className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left active:scale-[0.97]"
            style={{
              background: pendingFeedbacks.length > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${pendingFeedbacks.length > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div className="flex items-center justify-between w-full">
              <MessageSquare size={20} style={{ color: pendingFeedbacks.length > 0 ? '#F59E0B' : 'rgba(255,255,255,0.4)' }} />
              {pendingFeedbacks.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#F59E0B', color: '#fff' }}>
                  {pendingFeedbacks.length}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">Feedbacks</p>
              <p className="text-xs text-white/40">
                {pendingFeedbacks.length > 0 ? `${pendingFeedbacks.length} à remplir` : 'À jour'}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Tâches en cours */}
      {inProgressTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">En cours</p>
            <Link to="/travail/taches" className="text-xs text-indigo-400">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {inProgressTasks.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: t.priority === 'urgente' ? '#EF4444' : '#3B82F6' }}
                />
                <p className="text-sm text-white flex-1 truncate">{t.title}</p>
                {t.due_date && (
                  <span className="text-xs text-white/30 shrink-0">{t.due_date}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brief Sheet */}
      <AnimatePresence>
        {showBrief && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowBrief(false)}
          >
            <motion.div
              className="w-full rounded-t-3xl flex flex-col"
              style={{ background: '#1A1A35', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>
              <div className="flex items-center justify-between px-4 mb-2">
                <h3 className="text-base font-bold text-white">Brief matinal</h3>
                <button type="button" onClick={() => setShowBrief(false)}>
                  <X size={20} className="text-white/40" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MobileBriefForm
                  onSuccess={() => setShowBrief(false)}
                  onCancel={() => setShowBrief(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
