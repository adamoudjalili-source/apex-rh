// ============================================================
// APEX RH — src/components/behavioral/AttritionHeatmap.jsx
// Session 54 — Heatmap risque d'attrition par division (vue DRH)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Users, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { useDivisionAttritionHeatmap, useAttritionStats, RISK_CONFIG, getRiskConfig } from '../../hooks/useBehavioralIntelligence'
import AttritionRiskBadge, { AttritionRiskBar, AttritionRiskCircle } from './AttritionRiskBadge'

function HeatmapCell({ div, onClick, selected }) {
  const level = div.avgScore >= 75 ? 'critical' : div.avgScore >= 55 ? 'high' : div.avgScore >= 30 ? 'medium' : 'low'
  const cfg = getRiskConfig(level)

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(div)}
      className="w-full rounded-2xl p-4 text-left transition-all"
      style={{
        background: selected ? cfg.bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? cfg.border : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white truncate max-w-[140px]">
            {div.division_name}
          </p>
          <p className="text-xs text-white/40 mt-0.5">{div.users.length} collaborateurs</p>
        </div>
        <AttritionRiskCircle score={div.avgScore} size={44} />
      </div>

      {/* Répartition mini barres */}
      <div className="space-y-1 mt-2">
        {['critical', 'high', 'medium', 'low'].map(lvl => {
          const count = div[lvl] || 0
          const pct   = div.users.length ? (count / div.users.length) * 100 : 0
          const c     = RISK_CONFIG[lvl]
          if (count === 0) return null
          return (
            <div key={lvl} className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{ width: 6, height: 6, background: c.color, flexShrink: 0 }}
              />
              <div
                className="flex-1 rounded-full overflow-hidden"
                style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: c.color, opacity: 0.7 }}
                />
              </div>
              <span className="text-[10px] text-white/40 w-3 text-right">{count}</span>
            </div>
          )
        })}
      </div>

      {div.riskRatio > 20 && (
        <div className="flex items-center gap-1 mt-2">
          <AlertTriangle size={10} className="text-orange-400" />
          <span className="text-[10px] text-orange-400">{div.riskRatio}% en risque élevé+</span>
        </div>
      )}
    </motion.button>
  )
}

function DivisionDetail({ div, onClose }) {
  if (!div) return null
  const cfg = getRiskConfig(div.avgScore >= 75 ? 'critical' : div.avgScore >= 55 ? 'high' : div.avgScore >= 30 ? 'medium' : 'low')

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white">{div.division_name}</h3>
          <p className="text-xs text-white/40">{div.users.length} collaborateurs analysés</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {div.users
          .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
          .map(u => (
          <div
            key={u.user_id}
            className="flex items-center gap-3 p-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: `${getRiskConfig(u.risk_level).color}20`, color: getRiskConfig(u.risk_level).text }}
            >
              {u.first_name?.[0]}{u.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {u.first_name} {u.last_name}
              </p>
              <p className="text-[10px] text-white/40">{u.service_name || u.role}</p>
            </div>
            <AttritionRiskBadge level={u.risk_level} score={u.risk_score} showScore size="xs" />
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function AttritionHeatmap() {
  const { divisions, isLoading } = useDivisionAttritionHeatmap()
  const { stats } = useAttritionStats()
  const [selected, setSelected] = useState(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs globaux */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Collaborateurs', value: stats.total,    color: '#8B5CF6', icon: Users },
          { label: 'Risque critique', value: stats.critical, color: '#EF4444', icon: AlertTriangle },
          { label: 'Risque élevé',   value: stats.high,     color: '#F97316', icon: TrendingDown },
          { label: 'En amélioration', value: stats.improving, color: '#10B981', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color }} />
              <p className="text-xs text-white/50">{label}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Heatmap + Détail */}
      <div className="grid grid-cols-3 gap-4">
        {/* Grille divisions */}
        <div
          className="col-span-2 rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-white/70 mb-3">Carte de chaleur par division</h3>
          {divisions.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              Aucune donnée disponible. Exécutez la migration SQL S54 puis
              lancez <code className="text-purple-400">SELECT refresh_behavioral_scores();</code>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {divisions.map(div => (
                <HeatmapCell
                  key={div.division_id}
                  div={div}
                  onClick={d => setSelected(selected?.division_id === d.division_id ? null : d)}
                  selected={selected?.division_id === div.division_id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panneau latéral drill-down */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <AnimatePresence mode="wait">
            {selected ? (
              <DivisionDetail
                key={selected.division_id}
                div={selected}
                onClose={() => setSelected(null)}
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-center py-8"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(139,92,246,0.1)' }}
                >
                  <ChevronRight size={20} className="text-purple-400" />
                </div>
                <p className="text-sm text-white/40">
                  Sélectionnez une division pour voir le détail des collaborateurs
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-6 justify-end">
        {Object.entries(RISK_CONFIG).map(([level, cfg]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: cfg.color }}
            />
            <span className="text-xs text-white/40">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
