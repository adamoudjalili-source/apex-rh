// ============================================================
// APEX RH — TeamPulseHeatmap.jsx
// Session 76 — Heatmap temporelle PULSE : semaine × collaborateur
// SVG natif — accès manager/rh/admin
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useTeamPulseTrends, usePulseTrends } from '../../hooks/usePulse'
import PulseTrendChart from './PulseTrendChart'

// ─── HELPERS ─────────────────────────────────────────────────

function getScoreColor(score) {
  if (score == null) return 'rgba(255,255,255,0.06)'
  if (score >= 70) return '#10B981'
  if (score >= 50) return '#F59E0B'
  if (score >= 30) return '#EF4444'
  return '#7F1D1D'
}

function getScoreBg(score) {
  if (score == null) return 'rgba(255,255,255,0.04)'
  if (score >= 70) return 'rgba(16,185,129,0.18)'
  if (score >= 50) return 'rgba(245,158,11,0.18)'
  if (score >= 30) return 'rgba(239,68,68,0.18)'
  return 'rgba(127,29,29,0.25)'
}

function getLast30Days() {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function getLast14Days() {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function formatDay(dateStr) {
  const d = new Date(dateStr)
  const days = ['D','L','M','M','J','V','S']
  return days[d.getDay()]
}

function formatDayNum(dateStr) {
  return new Date(dateStr).getDate()
}

// ─── DRAWER DÉTAIL UTILISATEUR ───────────────────────────────

function UserDetailDrawer({ userId, userName, onClose }) {
  const { data: scores = [], isLoading } = usePulseTrends(userId)

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="w-80 bg-[#131720] border-l border-white/10 p-5 flex-shrink-0"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-white">{userName}</h3>
          <p className="text-xs text-gray-400">Tendance 30j</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
          ×
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 rounded-lg bg-white/5 animate-pulse" />
      ) : Array.isArray(scores) && scores.length > 1 ? (
        <PulseTrendChart data={scores} height={140} />
      ) : (
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          Données insuffisantes
        </div>
      )}

      {/* Stats rapides */}
      {Array.isArray(scores) && scores.length > 0 && (() => {
        const vals = scores.map(s => parseFloat(s.total_score) || 0).filter(Boolean)
        if (!vals.length) return null
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
        const latest = vals[vals.length - 1]
        const trend7 = vals.slice(-7)
        const prev7 = vals.slice(-14, -7)
        const t7avg = trend7.reduce((a, b) => a + b, 0) / trend7.length
        const p7avg = prev7.length ? prev7.reduce((a, b) => a + b, 0) / prev7.length : null
        const delta = p7avg !== null ? t7avg - p7avg : null

        return (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: 'Dernière session', value: latest?.toFixed(0), color: getScoreColor(latest) },
              { label: 'Moyenne 30j', value: avg?.toFixed(0), color: getScoreColor(avg) },
              { label: 'Tendance 7j', value: delta != null ? `${delta > 0 ? '+' : ''}${delta?.toFixed(1)}` : '—', color: delta > 0 ? '#10B981' : delta < 0 ? '#EF4444' : '#F59E0B' },
              { label: 'Logs soumis', value: vals.length, color: '#6B7280' },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-lg bg-white/5">
                <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )
      })()}
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

export default function TeamPulseHeatmap() {
  const { canManageTeam } = useAuth()
  const { data: rawScores = [], isLoading } = useTeamPulseTrends()
  const [period, setPeriod] = useState(14)
  const [selectedUser, setSelectedUser] = useState(null)
  const [sortBy, setSortBy] = useState('avg') // 'avg' | 'name' | 'trend'
  const [minScore, setMinScore] = useState(0)

  const days = useMemo(() => period === 14 ? getLast14Days() : getLast30Days(), [period])

  // Grouper scores par user
  const userMap = useMemo(() => {
    const map = {}
    rawScores.forEach(s => {
      const uid = s.user_id
      if (!map[uid]) {
        map[uid] = {
          id: uid,
          name: s.user?.full_name || 'Inconnu',
          scores: {},
        }
      }
      map[uid].scores[s.score_date] = parseFloat(s.total_score) || null
    })
    return map
  }, [rawScores])

  const users = useMemo(() => {
    const list = Object.values(userMap).map(u => {
      const vals = days.map(d => u.scores[d]).filter(v => v != null)
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      const last7 = days.slice(-7).map(d => u.scores[d]).filter(v => v != null)
      const prev7 = days.slice(-14, -7).map(d => u.scores[d]).filter(v => v != null)
      const t7 = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : null
      const p7 = prev7.length ? prev7.reduce((a, b) => a + b, 0) / prev7.length : null
      const trend = t7 != null && p7 != null ? t7 - p7 : null
      return { ...u, avg, trend, logCount: vals.length }
    })

    return list
      .filter(u => u.avg == null || u.avg >= minScore)
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'trend') return (b.trend ?? -999) - (a.trend ?? -999)
        return (b.avg ?? -1) - (a.avg ?? -1)
      })
  }, [userMap, days, sortBy, minScore])

  const CELL_W = period === 14 ? 32 : 18
  const CELL_H = 28
  const NAME_W = 130
  const HEADER_H = 36
  const ROW_GAP = 4
  const svgW = NAME_W + days.length * (CELL_W + 2) + 60
  const svgH = HEADER_H + users.length * (CELL_H + ROW_GAP) + 10

  if (!canManageTeam) {
    return <div className="p-6 text-center text-gray-500">Accès réservé aux managers et RH.</div>
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🗓️</span> Heatmap équipe PULSE
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} collaborateurs</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Période */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {[14, 30].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: period === p ? 'rgba(79,70,229,0.3)' : 'transparent',
                  color: period === p ? '#818CF8' : '#9CA3AF',
                }}>
                {p}j
              </button>
            ))}
          </div>
          {/* Tri */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="avg">Trier par score moyen</option>
            <option value="trend">Trier par tendance</option>
            <option value="name">Trier par nom</option>
          </select>
          {/* Filtre score min */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Score min</span>
            <input type="range" min="0" max="70" step="10" value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-20 accent-indigo-500" />
            <span className="text-xs text-indigo-400 w-5">{minScore}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-hidden">
        {/* Heatmap SVG */}
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">📊</div>
              <p>Aucune donnée PULSE disponible</p>
            </div>
          ) : (
            <svg
              width={svgW}
              height={svgH}
              style={{ fontFamily: 'inherit', overflow: 'visible' }}
            >
              {/* Entêtes colonnes (jours) */}
              {days.map((day, i) => {
                const x = NAME_W + i * (CELL_W + 2)
                return (
                  <g key={day}>
                    <text x={x + CELL_W / 2} y={16} fontSize="9" fill="#6B7280" textAnchor="middle">
                      {formatDay(day)}
                    </text>
                    <text x={x + CELL_W / 2} y={30} fontSize="9" fill="#4B5563" textAnchor="middle">
                      {formatDayNum(day)}
                    </text>
                  </g>
                )
              })}

              {/* Lignes */}
              {users.map((user, rowIdx) => {
                const y = HEADER_H + rowIdx * (CELL_H + ROW_GAP)
                const isSelected = selectedUser?.id === user.id
                return (
                  <g key={user.id}
                    onClick={() => setSelectedUser(isSelected ? null : user)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Fond hover */}
                    {isSelected && (
                      <rect x={0} y={y - 2} width={svgW} height={CELL_H + 4}
                        fill="rgba(79,70,229,0.08)" rx="4" />
                    )}

                    {/* Nom */}
                    <text x={NAME_W - 6} y={y + CELL_H / 2 + 4} fontSize="11" fill={isSelected ? '#818CF8' : '#D1D5DB'} textAnchor="end">
                      {user.name.split(' ').map((w, i) => i === 0 ? w : w[0] + '.').join(' ').substring(0, 18)}
                    </text>

                    {/* Cellules scores */}
                    {days.map((day, ci) => {
                      const score = user.scores[day]
                      const cx = NAME_W + ci * (CELL_W + 2)
                      return (
                        <g key={day}>
                          <rect x={cx} y={y} width={CELL_W} height={CELL_H}
                            rx="4"
                            fill={getScoreBg(score)}
                            stroke={score != null ? getScoreColor(score) + '30' : 'transparent'}
                            strokeWidth="1"
                          />
                          {score != null && CELL_W >= 24 && (
                            <text x={cx + CELL_W / 2} y={y + CELL_H / 2 + 4}
                              fontSize="10" fill={getScoreColor(score)} textAnchor="middle" fontWeight="600">
                              {Math.round(score)}
                            </text>
                          )}
                          {score == null && (
                            <text x={cx + CELL_W / 2} y={y + CELL_H / 2 + 4}
                              fontSize="9" fill="rgba(255,255,255,0.15)" textAnchor="middle">
                              —
                            </text>
                          )}
                        </g>
                      )
                    })}

                    {/* Avg colonne */}
                    {user.avg != null && (
                      <text
                        x={NAME_W + days.length * (CELL_W + 2) + 8}
                        y={y + CELL_H / 2 + 4}
                        fontSize="11"
                        fontWeight="600"
                        fill={getScoreColor(user.avg)}
                      >
                        {user.avg.toFixed(0)}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Légende */}
              <g transform={`translate(${NAME_W}, ${svgH - 8})`}>
                {[
                  { label: '≥70', color: '#10B981' },
                  { label: '50–70', color: '#F59E0B' },
                  { label: '30–50', color: '#EF4444' },
                  { label: '<30', color: '#7F1D1D' },
                  { label: 'N/A', color: 'rgba(255,255,255,0.06)' },
                ].map((l, i) => (
                  <g key={l.label} transform={`translate(${i * 70}, 0)`}>
                    <rect width="12" height="12" rx="2" fill={l.label === 'N/A' ? 'rgba(255,255,255,0.08)' : l.color + '40'}
                      stroke={l.color + '60'} y={-12} />
                    <text x="16" y={-3} fontSize="9" fill="#6B7280">{l.label}</text>
                  </g>
                ))}
              </g>
            </svg>
          )}
        </div>

        {/* Drawer détail */}
        {selectedUser && (
          <UserDetailDrawer
            userId={selectedUser.id}
            userName={selectedUser.name}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </div>

      {/* Note */}
      <p className="text-xs text-gray-500 mt-3">
        Cliquez sur un collaborateur pour voir sa tendance détaillée. Chaque cellule = score journalier PULSE.
      </p>
    </div>
  )
}
