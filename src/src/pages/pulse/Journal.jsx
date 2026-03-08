// ============================================================
// APEX RH — Journal.jsx
// ✅ Session 21 — Page Brief Matinal + Journal du Soir (Étape 1 standalone)
// ✅ Session 25 — Phase G : href /pulse → /tasks (fusion UI)
// ✅ Session 101 — Phase C RBAC : migration usePermission V2
// ============================================================
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, Sun, Moon, ChevronRight } from 'lucide-react'
import { useAuth }       from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { useAppSettings } from '../../hooks/useSettings'
import { useTodayMorningPlan, useTodayLog, useTodayScore } from '../../hooks/usePulse'
import MorningPlanForm from '../../components/pulse/MorningPlanForm'
import DailyLogForm from '../../components/pulse/DailyLogForm'
import {
  formatDateFr,
  getTodayString,
  getDayStatus,
  DAY_STATUS_CONFIG,
  getScoreColor,
  isPulseEnabled,
} from '../../lib/pulseHelpers'

export default function Journal() {
  const { profile } = useAuth()
  const { can }     = usePermission()
  const { data: settings, isLoading: settingsLoading } = useAppSettings()
  const { data: morningPlan } = useTodayMorningPlan()
  const { data: dailyLog    } = useTodayLog()
  const { data: todayScore  } = useTodayScore()

  const [activeTab, setActiveTab] = useState('brief')

  // Redirection si PULSE désactivé
  if (!settingsLoading && !isPulseEnabled(settings)) {
    return <Navigate to="/dashboard" replace />
  }
  // Guard RBAC — journal accessible à tous les utilisateurs authentifiés
  if (!can('pulse', 'journal', 'read')) {
    return <Navigate to="/dashboard" replace />
  }

  const today      = getTodayString()
  const dayStatus  = getDayStatus(morningPlan, dailyLog)
  const statusCfg  = DAY_STATUS_CONFIG[dayStatus]

  // Passer automatiquement sur l'onglet journal si le brief est soumis et la fenêtre journal est ouverte
  const briefSubmitted  = morningPlan?.status === 'submitted' || morningPlan?.status === 'acknowledged'
  const journalOpen     = (() => {
    const start = settings?.pulse_journal_start || '16:00'
    const now   = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`
    return now >= start
  })()

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.2)' }}
        >
          <Activity size={22} className="text-indigo-400" />
        </div>
        <div>
          <h1
            className="text-2xl font-black text-white"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Mon Journal PULSE
          </h1>
          <p className="text-sm text-white/30">{formatDateFr(today)}</p>
        </div>
      </div>

      {/* Statut de la journée */}
      <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: statusCfg.bg,
            border: `1px solid ${statusCfg.color}20`,
          }}
        >          <div className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: statusCfg.color }}
            />
            <span className="text-sm font-medium" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          {todayScore && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">Score</span>
              <span
                className="text-sm font-black"
                style={{ color: getScoreColor(todayScore.score_total) }}
              >
                {todayScore.score_total}%
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Onglets Brief / Journal */}
      <>
        <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <TabButton
              active={activeTab === 'brief'}
              onClick={() => setActiveTab('brief')}
              icon={<Sun size={15} />}
              label="Brief matinal"
              done={briefSubmitted}
            />
            <TabButton
              active={activeTab === 'journal'}
              onClick={() => setActiveTab('journal')}
              icon={<Moon size={15} />}
              label="Journal du soir"
              done={dailyLog?.status === 'submitted' || dailyLog?.status === 'validated'}
              locked={!journalOpen}
            />
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'brief' ? (
            <MorningPlanForm settings={settings} />
          ) : (
            <DailyLogForm settings={settings} />
          )}
      </>

      {/* Liens raccourcis */}
      <>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink
            href="/tasks"
            icon="📊"
            label="Hub PULSE"
            desc="Vue d'ensemble"
          />
          <QuickLink
            href="/tasks"
            icon="✓"
            label="Mes Tâches"
            desc="Module Tâches"
          />
        </div>
      </>
    </div>
  )
}

// ─── COMPOSANT TabButton ──────────────────────────────────────
function TabButton({ active, onClick, icon, label, done, locked }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
        text-sm font-medium transition-all duration-200
        ${active
          ? 'bg-indigo-500/20 text-indigo-300'
          : locked
          ? 'text-white/20 cursor-not-allowed'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
        }`}
    >
      {icon}
      <span>{label}</span>
      {done && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
      {locked && <span className="text-[10px] text-white/20">(à partir de {/* filled by parent */}16h)</span>}
    </button>
  )
}

// ─── COMPOSANT QuickLink ──────────────────────────────────────
function QuickLink({ href, icon, label, desc }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150
        hover:-translate-y-0.5 group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
          {label}
        </p>
        <p className="text-[10px] text-white/30">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
    </a>
  )
}
