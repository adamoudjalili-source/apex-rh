// ============================================================
// APEX RH — TaskDashboardView.jsx  ·  S125-B
// Dashboard Manager : KPIs + score productivité + overdue
// ============================================================
import { useState } from 'react'
import { useTaskDashboard } from '../../hooks/useTaskStats'
import { TASK_STATUS } from '../../lib/taskHelpers'

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(s) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function daysLate(dateStr) {
  const d = Math.floor((new Date() - new Date(dateStr + 'T12:00:00')) / 86400000)
  return d > 0 ? `+${d}j` : null
}

function ScoreBar({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{score}%</span>
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  )
}

function StatusDonut({ byStatus }) {
  const STATUS_COLORS = {
    backlog:    '#6B7280', a_faire: '#3B82F6', en_cours: '#F59E0B',
    en_attente: '#F97316', en_revue: '#8B5CF6', terminee: '#10B981',
    bloquee:    '#EF4444', annule: '#4B5563',
  }
  const entries = Object.entries(byStatus || {}).filter(([, v]) => v > 0)
  const total   = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return null

  let cumPct = 0
  const segments = entries.map(([k, v]) => {
    const pct  = (v / total) * 100
    const seg  = { key: k, pct, start: cumPct }
    cumPct    += pct
    return seg
  })

  const r    = 40
  const cx   = 50
  const cy   = 50
  const circ = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
        {segments.map(seg => (
          <circle key={seg.key} cx={cx} cy={cy} r={r}
            fill="none"
            stroke={STATUS_COLORS[seg.key] || '#6B7280'}
            strokeWidth="20"
            strokeDasharray={`${(seg.pct / 100) * circ} ${circ}`}
            strokeDashoffset={`-${(seg.start / 100) * circ}`}
          />
        ))}
      </svg>
      <div className="space-y-1">
        {segments.slice(0, 6).map(seg => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[seg.key] || '#6B7280' }} />
            <span className="text-[11px] text-gray-400">
              {TASK_STATUS[seg.key]?.label || seg.key}
            </span>
            <span className="text-[11px] text-gray-600 ml-auto pl-2">
              {byStatus[seg.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function TaskDashboardView({ onTaskClick }) {
  const [serviceFilter, setServiceFilter] = useState(null)
  const { data, isLoading } = useTaskDashboard({ serviceId: serviceFilter })

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { summary = {}, leaderboard = [], overdue = [], byStatus = {} } = data || {}

  return (
    <div className="space-y-5 pb-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total tâches"    value={summary.total}     color="text-gray-200"   icon="📋" />
        <KpiCard label="En cours"        value={summary.en_cours}  color="text-amber-400"  icon="⚡"
          sub={`${summary.total ? Math.round((summary.en_cours/summary.total)*100) : 0}% du total`} />
        <KpiCard label="En retard"       value={summary.en_retard} color="text-red-400"    icon="⚠"
          sub={summary.en_retard > 0 ? 'Action requise' : 'Aucune'} />
        <KpiCard label="Terminées"       value={summary.terminee}  color="text-emerald-400" icon="✅"
          sub={`${summary.total ? Math.round((summary.terminee/summary.total)*100) : 0}% taux completion`} />
      </div>

      {/* Corps : leaderboard + overdue + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Leaderboard productivité */}
        <div className="lg:col-span-2 rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Score de productivité</span>
            <span className="text-[10px] text-gray-500 ml-auto">terminées / assignées · −2pts/retard</span>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500 italic p-4">Aucune donnée disponible.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {leaderboard.slice(0, 10).map((entry, i) => (
                <div key={entry.user.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`text-sm font-bold w-5 text-center ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'
                  }`}>#{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {entry.user.first_name?.[0]}{entry.user.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 font-medium truncate">
                      {entry.user.first_name} {entry.user.last_name}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {entry.done}/{entry.assigned} tâches
                      {entry.late > 0 && <span className="text-red-400 ml-1">· {entry.late} en retard</span>}
                    </p>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <ScoreBar score={entry.score} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Répartition par statut */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white mb-3">Répartition</p>
            <StatusDonut byStatus={byStatus} />
          </div>

          {/* Tâches en retard */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8 flex items-center">
              <span className="text-sm font-semibold text-white">Top retards</span>
              {overdue.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full">
                  {overdue.length}
                </span>
              )}
            </div>
            {overdue.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-4">Aucune tâche en retard 🎉</p>
            ) : (
              <div className="divide-y divide-white/5">
                {overdue.slice(0, 6).map(task => (
                  <button key={task.id}
                    onClick={() => onTaskClick?.(task.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-300 truncate flex-1">{task.title}</p>
                      <span className="text-[10px] text-red-400 flex-shrink-0 font-medium">
                        {daysLate(task.due_date)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      Échéance : {formatDate(task.due_date)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
