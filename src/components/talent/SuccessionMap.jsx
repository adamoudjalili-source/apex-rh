// ============================================================
// APEX RH — src/components/talent/SuccessionMap.jsx  ·  S83
// Cartographie SVG : qui peut remplacer qui (couverture postes)
// Props : aucune (lit useSuccessionCoverage + useTalentPool)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, AlertTriangle, Users, TrendingUp, CheckCircle } from 'lucide-react'
import { useSuccessionCoverage, useTalentPool, READINESS_CONFIG } from '../../hooks/useSuccessionVivier'

// ─── Helpers ─────────────────────────────────────────────────
function critColor(level) {
  return { critical: '#EF4444', high: '#F59E0B', medium: '#8B5CF6', low: '#6B7280' }[level] || '#6B7280'
}

function critLabel(level) {
  return { critical: 'Critique', high: 'Élevé', medium: 'Modéré', low: 'Faible' }[level] || level
}

function Avatar({ initials, size = 28, color = '#8B5CF6' }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.32,
        background: `${color}22`,
        border: `1.5px solid ${color}50`,
        color,
      }}
    >
      {initials}
    </div>
  )
}

// ─── Carte Poste (nœud principal) ────────────────────────────
function PositionNode({ pos, isSelected, onClick }) {
  const color   = critColor(pos.criticality_level)
  const covered = pos.coverage_pct >= 50
  const atRisk  = pos.is_at_risk

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="cursor-pointer rounded-xl p-3 transition-all"
      style={{
        background: isSelected ? `${color}12` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isSelected ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
        minWidth: 200,
      }}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <p className="text-xs font-semibold text-white truncate">{pos.position_title}</p>
        </div>
        {atRisk && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
        {!atRisk && covered && <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />}
      </div>

      {/* Criticité */}
      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: `${color}15`, color }}
      >
        {critLabel(pos.criticality_level)}
      </span>

      {/* Coverage bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/35">Couverture</span>
          <span className="text-xs font-semibold" style={{ color: covered ? '#10B981' : atRisk ? '#EF4444' : '#F59E0B' }}>
            {Math.round(pos.coverage_pct)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, pos.coverage_pct)}%`,
              background: covered ? '#10B981' : atRisk ? '#EF4444' : '#F59E0B',
            }}
          />
        </div>
      </div>

      {/* Compteurs readiness */}
      <div className="flex gap-2 mt-2">
        {[
          { key: 'ready_now_count', r: 'ready_now' },
          { key: 'ready_1y_count',  r: 'ready_1y'  },
          { key: 'ready_2y_count',  r: 'ready_2y'  },
        ].map(({ key, r }) => {
          const count = pos[key] || 0
          const cfg   = READINESS_CONFIG[r]
          return count > 0 ? (
            <span
              key={r}
              className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: `${cfg.color}15`, color: cfg.color }}
            >
              {count}
            </span>
          ) : null
        })}
        {pos.pool_count === 0 && (
          <span className="text-xs text-white/25">Aucun successeur</span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Panneau détail successeurs ──────────────────────────────
function SuccessorPanel({ positionId, positionTitle, onClose }) {
  const { data } = useTalentPool(positionId)
  const entries  = data?.entries || []

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        width: 260,
        background: 'rgba(15,15,26,0.97)',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: 480,
      }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-xs text-white/40 mb-0.5">Successeurs identifiés</p>
          <p className="text-sm font-bold text-white truncate" style={{ maxWidth: 180 }}>{positionTitle}</p>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xs">✕</button>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <Users size={24} className="text-white/10 mx-auto mb-2" />
            <p className="text-xs text-white/25">Aucun successeur dans le vivier</p>
          </div>
        ) : (
          READINESS_CONFIG && Object.keys(READINESS_CONFIG).map(r => {
            const group = entries.filter(e => e.readiness === r)
            if (!group.length) return null
            const cfg = READINESS_CONFIG[r]
            return (
              <div key={r}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: cfg.color }}>{cfg.label}</p>
                {group.map(entry => {
                  const emp      = entry.employee
                  const initials = `${emp?.first_name?.[0] || ''}${emp?.last_name?.[0] || ''}`.toUpperCase()
                  const gaps     = (entry.skills_gap || []).filter(g => g.gap > 0)
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 p-2 rounded-lg mb-1"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <Avatar initials={initials} size={28} color={cfg.color} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">
                          {emp?.first_name} {emp?.last_name}
                        </p>
                        {gaps.length > 0 && (
                          <p className="text-xs text-amber-400/60">{gaps.length} écart{gaps.length > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

// ─── KPI bar ─────────────────────────────────────────────────
function KPIBar({ label, value, color, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function SuccessionMap() {
  const { data, isLoading } = useSuccessionCoverage()
  const [selectedPos, setSelectedPos] = useState(null)
  const [filterRisk, setFilterRisk]   = useState('all') // 'all' | 'at_risk' | 'covered'

  const positions = data?.positions || []

  const filtered = positions.filter(p => {
    if (filterRisk === 'at_risk') return p.is_at_risk
    if (filterRisk === 'covered') return p.coverage_pct >= 50
    return true
  })

  const selectedPosition = positions.find(p => p.position_id === selectedPos)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Shield size={40} className="text-white/10 mb-3" />
        <p className="text-sm text-white/40">Aucun poste clé actif</p>
        <p className="text-xs text-white/25 mt-1">Créez des postes clés dans la section Talents → Postes Clés</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPIs globaux */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Postes clés',  value: data?.totalPositions, color: '#8B5CF6', icon: Shield },
          { label: 'À risque',     value: data?.atRiskCount,    color: '#EF4444', icon: AlertTriangle },
          { label: 'Couverts',     value: data?.coveredCount,   color: '#10B981', icon: CheckCircle },
          { label: 'Couv. moy.',   value: `${data?.avgCoverage}%`, color: '#3B82F6', icon: TrendingUp },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="p-3 rounded-xl text-center"
              style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20` }}
            >
              <Icon size={15} className="mx-auto mb-1" style={{ color: kpi.color }} />
              <p className="text-lg font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-white/35 mt-0.5">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {[
          { key: 'all',      label: 'Tous les postes', color: '#8B5CF6' },
          { key: 'at_risk',  label: 'À risque',        color: '#EF4444' },
          { key: 'covered',  label: 'Bien couverts',   color: '#10B981' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterRisk(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filterRisk === f.key
              ? { background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}30` }
              : { color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grille + panneau */}
      <div className="flex gap-4 items-start">
        {/* Grille postes */}
        <div className="flex-1 grid grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map(pos => (
              <PositionNode
                key={pos.position_id}
                pos={pos}
                isSelected={selectedPos === pos.position_id}
                onClick={() => setSelectedPos(s => s === pos.position_id ? null : pos.position_id)}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-3 py-8 text-center text-xs text-white/25">
              Aucun poste dans ce filtre
            </div>
          )}
        </div>

        {/* Panneau détail */}
        <AnimatePresence>
          {selectedPos && selectedPosition && (
            <SuccessorPanel
              positionId={selectedPos}
              positionTitle={selectedPosition.position_title}
              onClose={() => setSelectedPos(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Légende readiness */}
      <div className="flex items-center gap-4 pt-1">
        <span className="text-xs text-white/25">Compteurs :</span>
        {Object.entries(READINESS_CONFIG).map(([r, cfg]) => (
          <div key={r} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
            <span className="text-xs text-white/35">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
