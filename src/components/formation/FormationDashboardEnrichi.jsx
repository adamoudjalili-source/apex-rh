// ============================================================
// APEX RH — src/components/formation/FormationDashboardEnrichi.jsx
// Session 73 — Dashboard enrichi : taux complétion + budget + obligatoires + satisfaction
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, GraduationCap, AlertTriangle, DollarSign, Star, TrendingUp, CheckCircle2 } from 'lucide-react'
import {
  useOrgTrainingStats, useMyTrainingStats, useTrainingBudgets, useBudgetConsumed,
  useMandatoryCompliance, useGlobalEvaluationStats, useRefreshFormationMVs,
} from '../../hooks/useFormations'
import { usePermission } from '../../hooks/usePermission'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))

// ─── Donut SVG ────────────────────────────────────────────────
function DonutChart({ data, size = 120 }) {
  const r = 42, cx = size / 2, cy = size / 2
  const circumference = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.2)">0</text>
    </svg>
  )

  let offset = 0
  return (
    <svg width={size} height={size}>
      {data.map((d, i) => {
        const pct = d.value / total
        const dash = circumference * pct
        const gap  = circumference * (1 - pct)
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={d.color} strokeWidth="10"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset + circumference * 0.25}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}/>
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.3)">inscriptions</text>
    </svg>
  )
}

// ─── Barre horizontale ────────────────────────────────────────
function HorizBar({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80 font-medium">{value}{suffix}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }}/>
      </div>
    </div>
  )
}

// ─── Conformité obligatoires ──────────────────────────────────
function ComplianceWidget() {
  const { data: compliance = [] } = useMandatoryCompliance()

  // Agréger sur toutes les formations
  let totalConforme = 0, totalNonRealise = 0, totalRenouveler = 0
  compliance.forEach(c => {
    if (c.compliance_status === 'conforme')     totalConforme   += (c.user_count || 0)
    if (c.compliance_status === 'non_realise')  totalNonRealise += (c.user_count || 0)
    if (c.compliance_status === 'a_renouveler') totalRenouveler += (c.user_count || 0)
  })
  const total = totalConforme + totalNonRealise + totalRenouveler
  const pct = total > 0 ? Math.round((totalConforme / total) * 100) : null

  if (!total) return (
    <div className="text-center py-4">
      <p className="text-sm text-white/30">Aucune règle obligatoire configurée</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold text-white">{pct ?? '—'}%</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}
          style={{ background: pct >= 80 ? 'rgba(16,185,129,0.12)' : pct >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)' }}>
          {pct >= 80 ? 'Bon' : pct >= 60 ? 'À surveiller' : 'Critique'}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444' }}/>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Conformes', value: totalConforme, color: '#10B981' },
          { label: 'À renouveler', value: totalRenouveler, color: '#F59E0B' },
          { label: 'Non réalisés', value: totalNonRealise, color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-sm font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-white/30">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard admin ──────────────────────────────────────────
function AdminDashboard() {
  const currentYear = new Date().getFullYear()
  const { data: orgStats }          = useOrgTrainingStats()
  const { data: budgets = [] }      = useTrainingBudgets(currentYear)
  const { data: consumed = 0 }      = useBudgetConsumed(currentYear)
  const { data: evalStats }         = useGlobalEvaluationStats()
  const { mutateAsync: refresh, isPending: refreshing } = useRefreshFormationMVs()

  const globalBudget = budgets.find(b => !b.division_id)
  const budgetPct = globalBudget?.total_amount > 0
    ? Math.min(Math.round((consumed / globalBudget.total_amount) * 100), 100)
    : null

  const completionRate = orgStats?.total_enrollments > 0
    ? Math.round((orgStats.completed / orgStats.total_enrollments) * 100)
    : 0

  const donutData = [
    { label: 'Terminé',   value: orgStats?.completed || 0,   color: '#10B981' },
    { label: 'En cours',  value: orgStats?.in_progress || 0, color: '#3B82F6' },
    { label: 'Inscrit',   value: Math.max(0, (orgStats?.total_enrollments || 0) - (orgStats?.completed || 0) - (orgStats?.in_progress || 0)), color: '#6B7280' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Vue d'ensemble {currentYear}</p>
        <button onClick={() => refresh()} disabled={refreshing}
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition">
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''}/> Actualiser
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Formations actives', value: orgStats?.active_formations ?? '—', color: '#6366F1', icon: GraduationCap },
          { label: 'Inscriptions totales', value: orgStats?.total_enrollments ?? '—', color: '#3B82F6', icon: CheckCircle2 },
          { label: 'Taux complétion', value: `${completionRate}%`, color: '#10B981', icon: TrendingUp },
          { label: 'Heures réalisées', value: `${orgStats?.hours_total ?? 0}h`, color: '#F59E0B', icon: Star },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Icon size={14} className="mb-2" style={{ color }}/>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Grille centrale ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Donut inscriptions */}
        <div className="rounded-2xl p-5 flex flex-col items-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 self-start">Inscriptions</p>
          <DonutChart data={donutData} size={130}/>
          <div className="mt-4 w-full space-y-1.5">
            {donutData.map(d => (
              <div key={d.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-white/50">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }}/>
                  {d.label}
                </span>
                <span className="text-white/70 font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Budget formation</p>
          {globalBudget ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-white">{fmt(consumed)} FCFA</p>
                <p className="text-xs text-white/30">consommés sur {fmt(globalBudget.total_amount)} FCFA</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-white/40">
                  <span>Consommation</span>
                  <span className={budgetPct > 90 ? 'text-red-400' : budgetPct > 70 ? 'text-amber-400' : 'text-green-400'}>
                    {budgetPct}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-2.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${budgetPct}%`,
                      background: budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#F59E0B' : '#10B981'
                    }}/>
                </div>
              </div>
              <p className="text-xs text-white/25">Solde : {fmt((globalBudget.total_amount || 0) - consumed)} FCFA</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <DollarSign size={20} className="mx-auto mb-2 text-white/15"/>
              <p className="text-xs text-white/30">Aucun budget défini</p>
            </div>
          )}
        </div>

        {/* Conformité obligatoires */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Formations obligatoires</p>
          <ComplianceWidget/>
        </div>
      </div>

      {/* ── Satisfaction ── */}
      {evalStats && evalStats.total_completed > 0 && (
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Évaluation des formations</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Note satisfaction moy.', value: evalStats.avg_satisfaction ? `${evalStats.avg_satisfaction}/5` : '—', color: '#F59E0B' },
              { label: 'Note efficacité moy.', value: evalStats.avg_effectiveness ? `${evalStats.avg_effectiveness}/5` : '—', color: '#6366F1' },
              { label: 'Taux réponse sat.', value: `${evalStats.response_rate_sat}%`, color: '#10B981' },
              { label: 'Taux réponse eff.', value: `${evalStats.response_rate_eff}%`, color: '#8B5CF6' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard collaborateur ──────────────────────────────────
function CollabDashboard() {
  const { data: stats } = useMyTrainingStats()
  if (!stats) return <div className="text-center py-6 text-white/20 text-sm">Chargement...</div>

  const items = [
    { label: 'En cours',    value: stats.enrollments_in_progress, color: '#3B82F6', icon: GraduationCap },
    { label: 'Terminées',   value: stats.enrollments_completed,   color: '#10B981', icon: CheckCircle2 },
    { label: 'Heures',      value: `${stats.hours_completed || 0}h`, color: '#8B5CF6', icon: TrendingUp },
    { label: 'Certifications', value: stats.certifications_count, color: '#F59E0B', icon: Star },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Icon size={16} className="mx-auto mb-2" style={{ color }}/>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FormationDashboardEnrichi() {
  const { can } = usePermission()
  const canAdmin = can('developpement', 'budget', 'admin')
  const canManageTeam = can('developpement', 'team', 'read')

  return (
    <div className="space-y-4">
      {(canAdmin || canManageTeam) ? <AdminDashboard/> : <CollabDashboard/>}
    </div>
  )
}
