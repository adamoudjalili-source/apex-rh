// ============================================================
// APEX RH — TimeTrackingPanel.jsx  ·  S132
// Log manuel (task_time_tracking) + Timesheet lié (time_entries)
// ✅ S124 : dual source
// ✅ S132 : labels clarifiés + tooltip explication + total consolidé
//           mis en avant, sources détaillées en secondaire
// ============================================================
import { useState } from 'react'
import { useTimeTracking, useLogTime, useDeleteTimeLog } from '../../hooks/useTasks'
import { useTaskTimeEntries, formatHours }               from '../../hooks/useTemps'
import { useAuth }                                       from '../../contexts/AuthContext'

function fmtMin(min) {
  if (!min) return '0 min'
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}`
}

function Bar({ spent, estimated }) {
  if (!estimated) return null
  const pct  = Math.min((spent / estimated) * 100, 100)
  const over = spent > estimated
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Progression estimée</span>
        <span className={over ? 'text-red-400 font-medium' : 'text-gray-300'}>
          {fmtMin(spent)} / {fmtMin(estimated)}{over && ' ⚠ dépassé'}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const QUICK = [
  { label: '15 min', value: 15 }, { label: '30 min', value: 30 },
  { label: '1h', value: 60 },     { label: '2h', value: 120 },
  { label: '4h', value: 240 },
]

export default function TimeTrackingPanel({ taskId, estimatedMinutes }) {
  const { profile }                     = useAuth()
  const { data: logs = [], isLoading }  = useTimeTracking(taskId)
  const { data: tsEntries = [] }        = useTaskTimeEntries(taskId)
  const logTime   = useLogTime()
  const deleteLog = useDeleteTimeLog()

  const [tab,      setTab]      = useState('manual')
  const [minutes,  setMinutes]  = useState('')
  const [note,     setNote]     = useState('')
  const [showAll,  setShowAll]  = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const totalManual    = logs.reduce((s, l) => s + l.minutes_spent, 0)
  const totalTimesheet = tsEntries.reduce((s, e) => s + (e.hours ?? 0) * 60, 0)
  const totalCombined  = totalManual + totalTimesheet
  const myManual       = logs.filter(l => l.user_id === profile?.id).reduce((s, l) => s + l.minutes_spent, 0)

  async function handleLog() {
    const min = parseInt(minutes)
    if (!min || min <= 0) return
    await logTime.mutateAsync({ taskId, minutesSpent: min, note: note.trim() || null })
    setMinutes(''); setNote('')
  }

  const displayedLogs = showAll ? logs : logs.slice(0, 5)

  return (
    <div className="space-y-4">

      {/* Total consolidé — mis en avant */}
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Temps total passé</span>
            {/* Bouton info — explication dual source */}
            <button onClick={() => setShowInfo(v => !v)}
              className="w-4 h-4 rounded-full bg-white/10 text-gray-500 hover:text-gray-300 text-[10px] flex items-center justify-center transition-colors"
              title="Comment est calculé ce total ?">?</button>
          </div>
          {estimatedMinutes > 0 && (
            <span className="text-xs text-gray-500">Estimé : {fmtMin(estimatedMinutes)}</span>
          )}
        </div>
        <div className="text-3xl font-bold text-white mb-1">{fmtMin(totalCombined)}</div>
        {/* Sources détaillées */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
            <span className="text-gray-500">Log rapide :</span>
            <span className="text-indigo-300">{fmtMin(totalManual)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-gray-500">Feuille de temps :</span>
            <span className="text-emerald-300">{fmtMin(totalTimesheet)}</span>
          </span>
        </div>

        {/* Tooltip explicatif */}
        {showInfo && (
          <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 space-y-1">
            <p><span className="text-indigo-300 font-medium">Log rapide</span> — saisi directement dans cet onglet, depuis la tâche, en quelques clics. Idéal pour noter le temps au fil de l'eau.</p>
            <p><span className="text-emerald-300 font-medium">Feuille de temps</span> — saisi dans le module Suivi du temps (grille hebdomadaire), avec cette tâche associée à la ligne. Source officielle pour la paie et la facturation.</p>
            <p className="text-gray-600 text-[10px] pt-1">Le total affiché est la somme des deux sources. Il n'y a pas de doublon : chaque source est indépendante.</p>
          </div>
        )}
      </div>

      {estimatedMinutes > 0 && <Bar spent={totalCombined} estimated={estimatedMinutes} />}

      {/* Tabs — nommage explicite */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
        {[
          { id: 'manual',    icon: '⚡', label: 'Log rapide' },
          { id: 'timesheet', icon: '📋', label: `Feuille de temps${tsEntries.length > 0 ? ` (${tsEntries.length})` : ''}` },
        ].map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id ? 'bg-indigo-600/60 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Tab : Log rapide */}
      {tab === 'manual' && (
        <div className="space-y-3">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <div className="text-xs font-medium text-gray-400">Enregistrer du temps maintenant</div>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK.map(q => (
                <button key={q.value} onClick={() => setMinutes(q.value.toString())}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    minutes === q.value.toString()
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}>{q.label}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-[#1a1635] border border-white/10 rounded-lg px-2.5 py-1.5 w-28">
                <input type="number" min={1} value={minutes} onChange={e => setMinutes(e.target.value)}
                  placeholder="min" className="bg-transparent text-white text-sm w-full outline-none" />
                <span className="text-gray-500 text-xs">min</span>
              </div>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Note optionnelle…"
                className="flex-1 bg-[#1a1635] border border-white/10 text-white text-sm rounded-lg px-2.5 py-1.5 placeholder:text-gray-600" />
              <button onClick={handleLog} disabled={!minutes || logTime.isPending}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-lg transition-all whitespace-nowrap">
                {logTime.isPending ? '…' : '+ Log'}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-gray-500 text-center py-4">Chargement…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-6">
              <div className="text-2xl mb-2">⏱️</div>Aucun log rapide enregistré
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                {logs.length} entrée{logs.length > 1 ? 's' : ''} · Ma contribution : {fmtMin(myManual)}
              </div>
              {displayedLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                      {log.user?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-gray-300 font-medium">{fmtMin(log.minutes_spent)}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span>{log.user?.full_name}</span>
                        <span>·</span>
                        <span>{new Date(log.logged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                        {log.note && <><span>·</span><em className="truncate max-w-24 inline-block align-bottom">{log.note}</em></>}
                      </div>
                    </div>
                  </div>
                  {log.user_id === profile?.id && (
                    <button onClick={() => deleteLog.mutate({ id: log.id, taskId })}
                      className="text-gray-600 hover:text-red-400 text-xs ml-2 transition-colors" title="Supprimer">×</button>
                  )}
                </div>
              ))}
              {logs.length > 5 && (
                <button onClick={() => setShowAll(v => !v)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  {showAll ? '▲ Voir moins' : `▼ ${logs.length - 5} entrées de plus`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab : Feuille de temps */}
      {tab === 'timesheet' && (
        <div className="space-y-2">
          {tsEntries.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-2xl">📋</div>
              <p className="text-sm text-gray-500">Aucune saisie timesheet liée</p>
              <p className="text-xs text-gray-600">
                Dans <span className="text-indigo-400">Mon Suivi du Temps → Saisie</span>,
                associez cette tâche à une ligne de temps pour la voir apparaître ici.
              </p>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 mb-3">
                {tsEntries.length} saisie{tsEntries.length > 1 ? 's' : ''} ·{' '}
                total {formatHours(tsEntries.reduce((s, e) => s + (e.hours ?? 0), 0))}
              </div>
              {tsEntries.map(e => {
                const name = e.user ? `${e.user.first_name} ${e.user.last_name}` : '—'
                return (
                  <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                        {name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-300 font-medium">{e.description || 'Sans description'}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span>{name}</span>
                          <span>·</span>
                          <span>{new Date(e.entry_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                          {e.time_sheets?.week_start && (
                            <>
                              <span>·</span>
                              <span className="text-gray-600">
                                Sem. {new Date(e.time_sheets.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-emerald-600">📋</span>
                      <span className="text-sm font-bold text-emerald-400">{formatHours(e.hours)}</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
