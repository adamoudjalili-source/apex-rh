// ============================================================
// APEX RH — PulseCalibration.jsx
// Session 76 — Calibration poids dimensions PULSE + seuils d'alerte
// Session 101 — Phase C RBAC : migration usePermission V2
// Accès réservé : admin uniquement
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePermission } from '../../hooks/usePermission'
import { usePulseCalibration, useUpdateCalibration } from '../../hooks/usePulse'

// ─── CONSTANTES ───────────────────────────────────────────────

const DIMENSIONS = [
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Tâches livrées, respect des délais, volume de travail',
    color: '#3B82F6',
    icon: '📦',
  },
  {
    key: 'quality',
    label: 'Qualité',
    description: 'Qualité des livrables, retours positifs, niveau d\'exécution',
    color: '#8B5CF6',
    icon: '⭐',
  },
  {
    key: 'regularity',
    label: 'Régularité',
    description: 'Assiduité au brief et journal, ponctualité des soumissions',
    color: '#10B981',
    icon: '🕐',
  },
  {
    key: 'bonus_okr',
    label: 'Bonus OKR',
    description: 'Contribution aux objectifs clés et key results liés',
    color: '#C9A227',
    icon: '🎯',
  },
]

const DEFAULT_CONFIG = {
  delivery:   { weight: 30, min_trigger_score: 40, target_score: 70, recalc_frequency_h: 24 },
  quality:    { weight: 30, min_trigger_score: 40, target_score: 70, recalc_frequency_h: 24 },
  regularity: { weight: 25, min_trigger_score: 40, target_score: 70, recalc_frequency_h: 24 },
  bonus_okr:  { weight: 15, min_trigger_score: 40, target_score: 70, recalc_frequency_h: 24 },
}

// ─── JAUGES SVG ───────────────────────────────────────────────

function WeightGauge({ value, color, total }) {
  const pct = Math.min(100, Math.max(0, value))
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const isOver = total > 100
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="35" cy="35" r={radius}
        fill="none"
        stroke={isOver ? '#EF4444' : color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 35 35)"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="35" y="39" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
        {value}%
      </text>
    </svg>
  )
}

// ─── COMPOSANT DIMENSION ─────────────────────────────────────

function DimensionCard({ dim, config, onChange, totalWeight }) {
  const isOver = totalWeight > 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${dim.color}25` }}
    >
      <div className="flex items-start gap-4">
        {/* Jauge poids */}
        <div className="flex-shrink-0 text-center">
          <WeightGauge value={config.weight || 0} color={dim.color} total={totalWeight} />
          <p className="text-xs text-gray-400 mt-1">poids</p>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{dim.icon}</span>
            <span className="font-medium text-white">{dim.label}</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">{dim.description}</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Poids */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Poids (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={config.weight || 0}
                  onChange={e => onChange('weight', Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-sm font-mono w-8 text-right"
                  style={{ color: isOver ? '#EF4444' : dim.color }}>
                  {config.weight}
                </span>
              </div>
            </div>

            {/* Seuil alerte */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Seuil alerte</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="70"
                  step="5"
                  value={config.min_trigger_score || 40}
                  onChange={e => onChange('min_trigger_score', Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-sm font-mono w-8 text-right text-amber-400">
                  {config.min_trigger_score}
                </span>
              </div>
            </div>

            {/* Score cible */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Score cible</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="5"
                  value={config.target_score || 70}
                  onChange={e => onChange('target_score', Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-mono w-8 text-right text-emerald-400">
                  {config.target_score}
                </span>
              </div>
            </div>

            {/* Fréquence recalcul */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Fréquence recalcul</label>
              <select
                value={config.recalc_frequency_h || 24}
                onChange={e => onChange('recalc_frequency_h', Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
              >
                <option value={6}>Toutes les 6h</option>
                <option value={12}>Toutes les 12h</option>
                <option value={24}>Chaque jour</option>
                <option value={48}>Tous les 2j</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

export default function PulseCalibration() {
  const { can } = usePermission()
  const { data: savedConfig = [], isLoading } = usePulseCalibration()
  const updateCalibration = useUpdateCalibration()

  const [configs, setConfigs] = useState(DEFAULT_CONFIG)
  const [isDirty, setIsDirty] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync avec les données en base
  useEffect(() => {
    if (savedConfig.length > 0) {
      const merged = { ...DEFAULT_CONFIG }
      savedConfig.forEach(c => {
        if (c.dimension !== 'global' && merged[c.dimension]) {
          merged[c.dimension] = {
            weight: parseFloat(c.weight) || merged[c.dimension].weight,
            min_trigger_score: parseFloat(c.min_trigger_score) || merged[c.dimension].min_trigger_score,
            target_score: parseFloat(c.target_score) || merged[c.dimension].target_score,
            recalc_frequency_h: c.recalc_frequency_h || merged[c.dimension].recalc_frequency_h,
          }
        }
      })
      setConfigs(merged)
      setIsDirty(false)
    }
  }, [savedConfig])

  const totalWeight = DIMENSIONS.reduce((sum, d) => sum + (configs[d.key]?.weight || 0), 0)
  const isValid = totalWeight === 100

  const handleChange = (dim, field, value) => {
    setConfigs(prev => ({ ...prev, [dim]: { ...prev[dim], [field]: value } }))
    setIsDirty(true)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!isValid) return
    const mutations = DIMENSIONS.map(d =>
      updateCalibration.mutateAsync({ dimension: d.key, ...configs[d.key] })
    )
    try {
      await Promise.all(mutations)
      setIsDirty(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {}
  }

  const handleReset = () => {
    setConfigs(DEFAULT_CONFIG)
    setIsDirty(true)
    setSaveSuccess(false)
  }

  if (!can('pulse', 'calibration', 'admin')) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-4xl mb-3">🔒</div>
        <p>Accès réservé aux administrateurs</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>⚙️</span> Calibration PULSE
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Ajustez les pondérations et seuils de déclenchement des alertes
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || !isValid || updateCalibration.isPending}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: saveSuccess ? '#10B981' : '#4F46E5',
              color: 'white',
            }}
          >
            {updateCalibration.isPending ? 'Enregistrement...' : saveSuccess ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Total poids */}
      <div className={`p-4 rounded-xl flex items-center gap-4 transition-colors ${isValid ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
        {/* Barre de répartition */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Répartition des poids</span>
            <span className={`text-sm font-bold ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
              Total : {totalWeight}%
              {!isValid && ` (${totalWeight > 100 ? `+${totalWeight - 100}` : totalWeight - 100} pts)`}
            </span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {DIMENSIONS.map(d => (
              <div
                key={d.key}
                style={{
                  width: `${configs[d.key]?.weight || 0}%`,
                  background: d.color,
                  transition: 'width 0.3s ease',
                  minWidth: configs[d.key]?.weight > 0 ? '2px' : '0',
                }}
                title={`${d.label} : ${configs[d.key]?.weight}%`}
              />
            ))}
            {totalWeight < 100 && (
              <div style={{ width: `${100 - totalWeight}%`, background: 'rgba(255,255,255,0.1)' }} />
            )}
          </div>
          <div className="flex gap-4 mt-2">
            {DIMENSIONS.map(d => (
              <div key={d.key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-xs text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cards dimensions */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {DIMENSIONS.map(dim => (
            <DimensionCard
              key={dim.key}
              dim={dim}
              config={configs[dim.key] || DEFAULT_CONFIG[dim.key]}
              totalWeight={totalWeight}
              onChange={(field, value) => handleChange(dim.key, field, value)}
            />
          ))}
        </div>
      )}

      {/* Légende seuils */}
      <div className="p-4 rounded-xl bg-white/3 border border-white/8">
        <p className="text-xs font-medium text-gray-400 mb-3">Légende des seuils</p>
        <div className="grid grid-cols-3 gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span><span className="text-white font-medium">Seuil alerte</span> — déclenche une alerte si score {'<'} valeur</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span><span className="text-white font-medium">Score cible</span> — objectif à atteindre pour chaque collaborateur</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span><span className="text-white font-medium">Poids</span> — contribution de la dimension au score global (total = 100%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
