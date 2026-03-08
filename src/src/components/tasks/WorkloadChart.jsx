// ============================================================
// APEX RH — WorkloadChart.jsx
// Barre SVG charge de travail par collaborateur
// Session 77 — Dépendances + récurrence + charge
// ============================================================
import { useTeamWorkload } from '../../hooks/useTasks'

function formatMinutes(min) {
  if (!min) return '0h'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}m`
}

function getScoreColor(score) {
  if (score >= 8) return '#EF4444'
  if (score >= 6) return '#F59E0B'
  if (score >= 3) return '#10B981'
  return '#6B7280'
}

function getScoreLabel(score) {
  if (score >= 8) return { label: 'Surchargé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
  if (score >= 6) return { label: 'Chargé', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
  if (score >= 3) return { label: 'Équilibré', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
  return { label: 'Léger', color: 'text-gray-400', bg: 'bg-white/5 border-white/10' }
}

const BAR_H = 20
const BAR_W = 240
const ROW_H = 52
const LEFT = 130
const RIGHT_GAP = 8

export default function WorkloadChart() {
  const { data: workload = [], isLoading } = useTeamWorkload()

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Chargement charge…</div>
  }

  if (workload.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-2">
        <span className="text-3xl">👥</span>
        <span>Aucune donnée de charge disponible</span>
      </div>
    )
  }

  const maxScore = Math.max(...workload.map(w => Number(w.avg_workload_score) || 0), 1)
  const svgH = workload.length * ROW_H + 40

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Charge d'équipe</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Score charge 0–10</span>
          <div className="flex items-center gap-1.5">
            {[
              { color: '#6B7280', label: 'Léger' },
              { color: '#10B981', label: 'OK' },
              { color: '#F59E0B', label: 'Chargé' },
              { color: '#EF4444', label: 'Surchargé' },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-0.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span>{s.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#0f0c1d] p-2">
        <svg width={LEFT + BAR_W + 120} height={svgH} className="block">
          {/* Titre colonnes */}
          <text x={LEFT + BAR_W / 2} y={18} textAnchor="middle" fontSize={10} fill="#6B7280">Score de charge</text>
          <text x={LEFT + BAR_W + 70} y={18} textAnchor="middle" fontSize={10} fill="#6B7280">Tâches / Temps 30j</text>

          {workload.map((user, i) => {
            const score = Number(user.avg_workload_score) || 0
            const barW = Math.max((score / 10) * BAR_W, 2)
            const barColor = getScoreColor(score)
            const y = 28 + i * ROW_H
            const { label, color: labelColor } = getScoreLabel(score)

            return (
              <g key={user.user_id}>
                {/* Ligne de fond */}
                {i % 2 === 0 && (
                  <rect x={0} y={y - 4} width={LEFT + BAR_W + 120} height={ROW_H} fill="white" fillOpacity={0.015} rx={6} />
                )}

                {/* Nom utilisateur */}
                <text x={LEFT - 8} y={y + 12} textAnchor="end" fontSize={12} fill="#D1D5DB" fontWeight={500}>
                  {user.full_name?.length > 18 ? user.full_name.slice(0, 17) + '…' : user.full_name}
                </text>

                {/* Fond barre */}
                <rect x={LEFT} y={y} width={BAR_W} height={BAR_H} rx={6} fill="white" fillOpacity={0.04} />

                {/* Barre charge */}
                <rect x={LEFT} y={y} width={barW} height={BAR_H} rx={6} fill={barColor} fillOpacity={0.75} />

                {/* Score texte */}
                <text x={LEFT + barW + 6} y={y + 13} fontSize={11} fill={barColor} fontWeight={600}>
                  {score.toFixed(1)}
                </text>

                {/* Label état */}
                <text x={LEFT + barW + 30} y={y + 13} fontSize={10} fill={barColor} opacity={0.8}>
                  {label}
                </text>

                {/* Tâches + temps */}
                <text x={LEFT + BAR_W + 50} y={y + 8} textAnchor="middle" fontSize={10} fill="#9CA3AF">
                  {user.active_tasks} tâches
                </text>
                <text x={LEFT + BAR_W + 50} y={y + 20} textAnchor="middle" fontSize={10} fill="#6B7280">
                  {formatMinutes(user.logged_minutes_30d)} logués
                </text>
              </g>
            )
          })}

          {/* Ligne de jauge à 8 (seuil surcharge) */}
          <line
            x1={LEFT + (8 / 10) * BAR_W} y1={24}
            x2={LEFT + (8 / 10) * BAR_W} y2={svgH - 4}
            stroke="#EF4444" strokeWidth={1} strokeDasharray="3,3" opacity={0.4}
          />
          <text x={LEFT + (8 / 10) * BAR_W + 2} y={svgH - 6} fontSize={9} fill="#EF4444" opacity={0.5}>seuil</text>
        </svg>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: 'Surchargés', value: workload.filter(w => Number(w.avg_workload_score) >= 8).length, color: 'text-red-400' },
          { label: 'Chargés', value: workload.filter(w => Number(w.avg_workload_score) >= 6 && Number(w.avg_workload_score) < 8).length, color: 'text-amber-400' },
          { label: 'Disponibles', value: workload.filter(w => Number(w.avg_workload_score) < 3).length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
