// ============================================================
// APEX RH — src/components/enps/ENPSSegmentation.jsx
// Session 55 — Segmentation eNPS par division / ancienneté / rôle
// ============================================================
import { useState } from 'react'
import {
  useENPSByDivision,
  useENPSBySeniority,
  useENPSByRole,
  getEnpsZone,
  formatENPS,
  SENIORITY_LABELS,
} from '../../hooks/useENPS'
import { getLastNMonthKeys } from '../../hooks/useAnalytics'

function ENPSBar({ score, maxAbs = 80 }) {
  const zone = getEnpsZone(score)
  if (score === null || score === undefined) {
    return <div className="text-xs text-gray-600">—</div>
  }
  const pct = Math.abs(score) / maxAbs * 100
  return (
    <div className="flex items-center gap-2">
      {/* Barre centrée sur 0 */}
      <div className="flex-1 flex items-center" style={{ height: 8 }}>
        <div className="flex-1 relative" style={{ height: 8 }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-white/10" />
          </div>
          <div
            className="absolute h-full rounded-full"
            style={{
              background: zone?.color || '#6B7280',
              width: `${Math.min(pct, 100)}%`,
              left: score >= 0 ? '50%' : undefined,
              right: score < 0  ? '50%' : undefined,
            }}
          />
        </div>
      </div>
      <span className="text-xs font-bold w-12 text-right" style={{ color: zone?.color }}>
        {formatENPS(score)}
      </span>
    </div>
  )
}

function SegmentCard({ label, score, total, promoters, detractors, color }) {
  const zone = getEnpsZone(score)
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">{total} répondant{total > 1 ? 's' : ''}</div>
        </div>
        <div
          className="text-base font-black"
          style={{ color: zone?.color || '#6B7280' }}
        >
          {formatENPS(score)}
        </div>
      </div>
      <ENPSBar score={score} />
      <div className="flex justify-between mt-2 text-[10px]">
        <span className="text-green-500">{promoters} promo.</span>
        <span className="text-red-500">{detractors} détrac.</span>
      </div>
    </div>
  )
}

export default function ENPSSegmentation() {
  const [activeTab, setActiveTab] = useState('division')
  const currentMonth = getLastNMonthKeys(1)[0]

  const { data: byDivision = [],  isLoading: l1 } = useENPSByDivision(currentMonth)
  const { data: bySeniority = [], isLoading: l2 } = useENPSBySeniority(currentMonth)
  const { data: byRole = [],      isLoading: l3 } = useENPSByRole(currentMonth)

  const tabs = [
    { id: 'division',   label: 'Par division',   data: byDivision,  loading: l1, icon: '🏢' },
    { id: 'seniority',  label: 'Par ancienneté', data: bySeniority, loading: l2, icon: '📅' },
    { id: 'role',       label: 'Par rôle',       data: byRole,      loading: l3, icon: '👤' },
  ]

  const active = tabs.find(t => t.id === activeTab)

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === t.id ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' } : {}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {active?.loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : active?.data.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-center">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm text-gray-500">Aucune donnée de segmentation disponible</div>
          <div className="text-xs text-gray-600 mt-1">
            La segmentation apparaît lorsque les surveys incluent une question eNPS
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {activeTab === 'division' && byDivision.map(d => (
            <SegmentCard
              key={d.division_name}
              label={d.division_name || 'Division inconnue'}
              score={d.enps_score}
              total={d.total}
              promoters={d.promoters}
              detractors={d.detractors}
            />
          ))}

          {activeTab === 'seniority' && bySeniority.map(d => (
            <SegmentCard
              key={d.bracket}
              label={d.bracket}
              score={d.enps}
              total={d.total}
              promoters={d.promoters}
              detractors={d.detractors}
              color={SENIORITY_LABELS[d.bracket]?.color}
            />
          ))}

          {activeTab === 'role' && byRole.map(d => (
            <SegmentCard
              key={d.role}
              label={d.label}
              score={d.enps}
              total={d.total}
              promoters={d.promoters}
              detractors={d.detractors}
              color={d.color}
            />
          ))}
        </div>
      )}

      {/* Note méthodologique */}
      <div className="rounded-xl border border-white/5 bg-white/[0.015] p-3 text-[10px] text-gray-600">
        <strong className="text-gray-500">Méthodologie eNPS :</strong> Question 0–10 « Recommanderiez-vous cette organisation comme lieu de travail ? »
        Promoteurs (9-10) — Passifs (7-8) — Détracteurs (0-6). Score = % Promoteurs − % Détracteurs.
      </div>
    </div>
  )
}
