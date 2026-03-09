// ============================================================
// APEX RH — TaskAnalyticsDashboard.jsx  ·  S131
// Dashboard analytique : task_activity_log enrichi
// Vues : KPIs · Tâches bloquées · Activité users · Tendance
// ============================================================
import { useState } from 'react'
import { useTaskActivityAnalytics } from '../../hooks/useTaskAnalytics'

function fmtHours(h) {
  if (h === null || h === undefined) return '—'
  if (h < 24)  return `${h}h`
  const d = Math.round(h / 24)
  return `${d}j`
}

function getUserInitials(user) {
  if (!user) return '?'
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
}

export default function TaskAnalyticsDashboard() {
  const [period, setPeriod] = useState(30)
  const { data, isLoading } = useTaskActivityAnalytics({ days: period })
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">

      {/* Entête + sélecteur période */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Analytics Tâches</h2>
          <p className="text-xs text-gray-500 mt-0.5">Basé sur le journal d'activité</p>
        </div>
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${period === d ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {d}j
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label:    'Tâches terminées',
                value:    data.completedCount,
                icon:     '✅',
                color:    'text-emerald-400',
                sub:      `sur ${period} jours`,
              },
              {
                label:    'Délai moyen complétion',
                value:    fmtHours(data.avgCompletionHours),
                icon:     '⏱',
                color:    data.avgCompletionHours > 72 ? 'text-amber-400' : 'text-indigo-400',
                sub:      'création → terminée',
              },
              {
                label:    'Délai moyen validation',
                value:    fmtHours(data.avgValidationHours),
                icon:     '✔',
                color:    data.avgValidationHours > 48 ? 'text-red-400' : 'text-violet-400',
                sub:      'en revue → approuvée',
              },
              {
                label:    'Respect des délais',
                value:    data.onTimeRate !== null ? `${data.onTimeRate}%` : '—',
                icon:     '📅',
                color:    data.onTimeRate >= 80 ? 'text-emerald-400' : data.onTimeRate >= 60 ? 'text-amber-400' : 'text-red-400',
                sub:      'tâches terminées dans les temps',
              },
            ].map(k => (
              <div key={k.label} className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{k.icon}</span>
                  <span className="text-xs text-gray-500">{k.label}</span>
                </div>
                <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                <div className="text-[10px] text-gray-600 mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
            {[
              ['overview',  'Tendance'],
              ['blocked',   'Bloquées / Refusées'],
              ['users',     'Activité utilisateurs'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Onglet Tendance */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Tâches terminées — 7 derniers jours</p>
              <DailyChart series={data.dailySeries} />

              {data.completionDelays.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-3">Tâches récemment terminées (délai)</p>
                  <div className="space-y-2">
                    {data.completionDelays.map(d => (
                      <div key={d.taskId} className="flex items-center gap-3 px-4 py-2.5 bg-white/2 border border-white/6 rounded-xl">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          d.priority === 'urgente' ? 'bg-red-400' :
                          d.priority === 'haute'   ? 'bg-amber-400' : 'bg-indigo-400'
                        }`} />
                        <span className="text-sm text-gray-300 flex-1 truncate">{d.title}</span>
                        <span className={`text-xs font-medium shrink-0 ${d.hours > 72 ? 'text-amber-400' : 'text-gray-400'}`}>
                          {fmtHours(Math.round(d.hours))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onglet Tâches bloquées/refusées */}
          {activeTab === 'blocked' && (
            <div>
              {data.topBlocked.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm">Aucune tâche bloquée ou refusée sur la période</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.topBlocked.map((item, idx) => (
                    <div key={item.task?.id || idx}
                      className="flex items-center gap-3 px-4 py-3 bg-white/2 border border-white/6 rounded-xl">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx === 0 ? 'bg-red-500/20 text-red-400' :
                        idx === 1 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{item.task?.title || '—'}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{item.type === 'refus' ? 'Refusée' : 'Bloquée'}</p>
                      </div>
                      <div className="shrink-0 text-center">
                        <div className="text-lg font-bold text-red-400">{item.count}</div>
                        <div className="text-[10px] text-gray-600">fois</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Onglet Activité utilisateurs */}
          {activeTab === 'users' && (
            <div className="space-y-2">
              {data.userActivityList.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucune activité enregistrée</p>
              ) : (
                data.userActivityList.map((item, idx) => {
                  const maxActions = data.userActivityList[0]?.actions || 1
                  const pct = Math.round((item.actions / maxActions) * 100)
                  return (
                    <div key={item.user.id}
                      className="flex items-center gap-3 px-4 py-3 bg-white/2 border border-white/6 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                        {getUserInitials(item.user)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-200">
                            {item.user.first_name} {item.user.last_name}
                          </span>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 shrink-0">
                            <span className="text-emerald-400">{item.completions} ✅</span>
                            {item.blocks > 0 && <span className="text-red-400">{item.blocks} 🚫</span>}
                            <span>{item.actions} actions</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Graphe en barres (7 jours) ───────────────────────────
function DailyChart({ series }) {
  if (!series?.length) return null
  const max = Math.max(...series.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-2 h-32 px-2">
      {series.map(d => {
        const pct = Math.round((d.count / max) * 100)
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 font-medium">{d.count || ''}</span>
            <div className="w-full rounded-t-md transition-all bg-indigo-500/60 hover:bg-indigo-500"
              style={{ height: `${Math.max(pct, 4)}%` }} />
            <span className="text-[9px] text-gray-600 capitalize text-center leading-tight">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
