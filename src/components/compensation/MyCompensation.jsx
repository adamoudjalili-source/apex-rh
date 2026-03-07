// ============================================================
// APEX RH — components/compensation/MyCompensation.jsx
// Session 58 — Ma rémunération (vue collaborateur)
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet, TrendingUp, Award, BarChart3, Loader2,
  ChevronRight, Info, DollarSign,
} from 'lucide-react'
import {
  useMyCompensation, useMyCompensationStats,
  formatSalary, formatSalaryShort,
  getCompaRatioColor, getCompaRatioLabel,
  computeRangePosition,
} from '../../hooks/useCompensation'

// ── Gauge compa-ratio ──
function CompaRatioGauge({ ratio }) {
  if (ratio == null) return null
  const clamped = Math.min(Math.max(ratio, 60), 140)
  const pct = ((clamped - 60) / 80) * 100
  const color = getCompaRatioColor(ratio)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>60%</span><span>100%</span><span>140%</span>
      </div>
      <div className="relative h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {/* Zones colorées */}
        <div className="absolute inset-y-0 left-0 w-[25%] rounded-l-full" style={{ background: 'rgba(239,68,68,0.18)' }}/>
        <div className="absolute inset-y-0 left-[25%] w-[18.75%]" style={{ background: 'rgba(245,158,11,0.18)' }}/>
        <div className="absolute inset-y-0 left-[43.75%] w-[18.75%]" style={{ background: 'rgba(16,185,129,0.18)' }}/>
        <div className="absolute inset-y-0 left-[62.5%] w-[37.5%] rounded-r-full" style={{ background: 'rgba(139,92,246,0.18)' }}/>
        {/* Curseur */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg"
          style={{ left: `calc(${pct}% - 8px)`, background: color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/30">Sous le marché</span>
        <span className="text-[11px] font-semibold" style={{ color }}>{ratio.toFixed(1)}% · {getCompaRatioLabel(ratio)}</span>
        <span className="text-[11px] text-white/30">Au-dessus</span>
      </div>
    </div>
  )
}

// ── Barre de position dans la fourchette ──
function RangeBar({ salary, grade }) {
  if (!grade || !salary) return null
  const pos = computeRangePosition(salary, grade)
  if (pos == null) return null
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-white/35">
        <span>{formatSalaryShort(grade.min_salary)}</span>
        <span className="text-white/55">Médian : {formatSalaryShort(grade.mid_salary)}</span>
        <span>{formatSalaryShort(grade.max_salary)}</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {/* Gradient fond */}
        <div className="absolute inset-0 rounded-full" style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.3) 0%, rgba(245,158,11,0.3) 30%, rgba(16,185,129,0.3) 55%, rgba(139,92,246,0.3) 100%)'
        }}/>
        {/* Marqueur médian */}
        <div className="absolute inset-y-0 w-px bg-white/20" style={{ left: `${((grade.mid_salary - grade.min_salary) / (grade.max_salary - grade.min_salary)) * 100}%` }}/>
        {/* Position actuelle */}
        <motion.div
          className="absolute inset-y-0 w-1 rounded-full bg-white shadow-sm"
          style={{ left: `calc(${pos}% - 2px)` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
        />
      </div>
      <p className="text-center text-[11px]" style={{ color: getCompaRatioColor((salary / grade.mid_salary) * 100) }}>
        Position : {pos.toFixed(0)}% de la fourchette
      </p>
    </div>
  )
}

// ── Composants ──────────────────────────────────────────────

function StatBox({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className="rounded-xl p-4 space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color }}/>
        <span className="text-[11px] text-white/40">{label}</span>
      </div>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
      {subtitle && <p className="text-[11px] text-white/30">{subtitle}</p>}
    </div>
  )
}

export default function MyCompensation() {
  const { data: records = [], isLoading: loadingRec } = useMyCompensation()
  const { data: stats, isLoading: loadingStats }      = useMyCompensationStats()

  const current = records.find(r => r.is_current)
  const history = records.filter(r => !r.is_current)

  if (loadingRec || loadingStats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-white/30"/>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <DollarSign size={36} className="text-white/15"/>
        <p className="text-white/35 text-sm">Aucun dossier de rémunération disponible</p>
        <p className="text-white/20 text-xs">Votre responsable RH mettra à jour vos informations.</p>
      </div>
    )
  }

  const grade = current.grade

  return (
    <div className="space-y-5">

      {/* Carte principale */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Salaire de base mensuel brut</p>
            <p className="text-4xl font-bold text-white">
              {formatSalary(current.base_salary, current.currency)}
            </p>
            {grade && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(201,162,39,0.15)', color: '#C9A227', border: '1px solid rgba(201,162,39,0.25)' }}>
                Grille {grade.code} — {grade.label}
              </span>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Wallet size={22} style={{ color: '#6366F1' }}/>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3">
          {current.variable_salary > 0 && (
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <p className="text-[10px] text-white/35 mb-1">Variable annuel</p>
              <p className="text-sm font-bold text-white">{formatSalary(current.variable_salary, current.currency)}</p>
            </div>
          )}
          {current.benefits_value > 0 && (
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <p className="text-[10px] text-white/35 mb-1">Avantages</p>
              <p className="text-sm font-bold text-white">{formatSalary(current.benefits_value, current.currency)}</p>
            </div>
          )}
          {stats?.total_comp > 0 && (
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <p className="text-[10px] text-white/35 mb-1">Rémunération totale</p>
              <p className="text-sm font-bold text-white">{formatSalary(stats.total_comp, current.currency)}</p>
            </div>
          )}
          {stats?.total_bonus_this_year > 0 && (
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <p className="text-[10px] text-white/35 mb-1">Primes cette année</p>
              <p className="text-sm font-bold" style={{ color: '#10B981' }}>{formatSalary(stats.total_bonus_this_year, current.currency)}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Compa-ratio */}
      {stats?.compa_ratio != null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} style={{ color: '#6366F1' }}/>
            <h3 className="text-sm font-semibold text-white/80">Positionnement dans la grille</h3>
            <div className="ml-auto group relative cursor-pointer">
              <Info size={13} className="text-white/25"/>
              <div className="absolute right-0 bottom-5 hidden group-hover:block z-10 w-56 rounded-lg p-2.5 text-[11px] text-white/60"
                style={{ background: 'rgba(10,10,30,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Le compa-ratio compare votre salaire au point médian de votre grille. 100% = exactement au milieu.
              </div>
            </div>
          </div>
          <CompaRatioGauge ratio={Number(stats.compa_ratio)}/>
          {grade && (
            <div className="mt-4">
              <RangeBar salary={Number(current.base_salary)} grade={grade}/>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats supplémentaires */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatBox icon={TrendingUp} label="Révisions appliquées" value={stats.reviews_count ?? 0} color="#6366F1" subtitle="depuis votre arrivée"/>
          <StatBox icon={Award} label="Primes cette année" value={stats.bonuses_this_year ?? 0} color="#C9A227" subtitle={`versements validés`}/>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-sm font-semibold text-white/70">Historique des rémunérations</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {history.slice(0, 5).map((rec) => (
              <div key={rec.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-white/70">{formatSalary(rec.base_salary, rec.currency)}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {new Date(rec.effective_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    {rec.end_date && ` → ${new Date(rec.end_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
                  </p>
                </div>
                <ChevronRight size={14} className="text-white/20"/>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
