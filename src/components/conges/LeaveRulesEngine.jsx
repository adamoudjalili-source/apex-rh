// ============================================================
// APEX RH — src/components/conges/LeaveRulesEngine.jsx
// Session 70 — Moteur de règles : acquisition + report par type de congé
// ============================================================
import { useState } from 'react'
import { Settings2, TrendingUp, RotateCcw, ChevronDown, ChevronUp, Check, RefreshCw } from 'lucide-react'
import { useLeaveTypes, useUpdateLeaveType, useRecalculateBalances, useApplyCarryOver } from '../../hooks/useConges'

const CARRY_OVER_OPTIONS = [
  { value: 'none',   label: 'Pas de report',     desc: 'Les jours non pris sont perdus en fin d\'année', color: '#EF4444' },
  { value: 'capped', label: 'Report plafonné',    desc: 'Report jusqu\'au maximum configuré',             color: '#F59E0B' },
  { value: 'full',   label: 'Report intégral',    desc: 'Tous les jours non pris sont reportés',          color: '#10B981' },
]

const CONTRACT_TYPES_ALL = ['CDI', 'CDD', 'essai']

function LeaveTypeRuleCard({ type }) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm]         = useState(null)
  const [saved, setSaved]       = useState(false)
  const updateType = useUpdateLeaveType()

  const current = form || {
    accrual_enabled:     type.accrual_enabled     || false,
    accrual_rate:        type.accrual_rate         ?? 2.08,
    contract_types:      type.contract_types       || ['CDI','CDD','essai'],
    carry_over_policy:   type.carry_over_policy    || 'none',
    carry_over_max_days: type.carry_over_max_days  ?? 5,
  }

  function set(key, val) {
    setForm(f => ({ ...(f || current), [key]: val }))
  }

  function toggleContract(ct) {
    const list = current.contract_types || []
    const updated = list.includes(ct) ? list.filter(c => c !== ct) : [...list, ct]
    set('contract_types', updated)
  }

  async function handleSave() {
    await updateType.mutateAsync({ id: type.id, ...current })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setForm(null)
  }

  const color = type.color || '#6366F1'
  const selectedPolicy = CARRY_OVER_OPTIONS.find(o => o.value === current.carry_over_policy)

  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{ background:'rgba(255,255,255,0.025)', borderColor: expanded ? `${color}30` : 'rgba(255,255,255,0.08)' }}>

      {/* Header */}
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: color }}/>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/85">{type.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background:`${color}20`, color }}>{type.code}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {current.accrual_enabled ? (
                <span className="text-[11px] text-emerald-400/70 flex items-center gap-1"><TrendingUp size={9}/> {current.accrual_rate}j/mois</span>
              ) : (
                <span className="text-[11px] text-white/25">Acquisition manuelle</span>
              )}
              <span className="text-[11px]" style={{ color: selectedPolicy?.color || '#6B7280' }}>
                {selectedPolicy?.label || 'No report'}
              </span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={15} className="text-white/30"/> : <ChevronDown size={15} className="text-white/30"/>}
      </button>

      {/* Panel */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>

          {/* Acquisition automatique */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                <TrendingUp size={13}/> Acquisition automatique
              </label>
              <button
                onClick={() => set('accrual_enabled', !current.accrual_enabled)}
                className={`relative w-10 h-5 rounded-full transition-all ${current.accrual_enabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${current.accrual_enabled ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`}
                  style={{ transform: current.accrual_enabled ? 'translateX(20px)' : 'translateX(0)' }}/>
              </button>
            </div>
            {current.accrual_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/30 mb-1 block">Jours acquis / mois</label>
                  <input type="number" min={0} max={10} step={0.01}
                    value={current.accrual_rate}
                    onChange={e => set('accrual_rate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-indigo-500"
                    style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}
                  />
                  <p className="text-[10px] text-white/25 mt-1">= {(current.accrual_rate * 12).toFixed(1)} j/an</p>
                </div>
                <div>
                  <label className="text-[11px] text-white/30 mb-1 block">Contrats éligibles</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {CONTRACT_TYPES_ALL.map(ct => (
                      <button key={ct} onClick={() => toggleContract(ct)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${current.contract_types?.includes(ct) ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                        style={{ background: current.contract_types?.includes(ct) ? `${color}30` : 'rgba(255,255,255,0.04)', border: `1px solid ${current.contract_types?.includes(ct) ? `${color}40` : 'rgba(255,255,255,0.06)'}` }}>
                        {ct}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Politique de report */}
          <div>
            <label className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-3">
              <RotateCcw size={13}/> Report N+1
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CARRY_OVER_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => set('carry_over_policy', opt.value)}
                  className={`rounded-xl p-3 text-left border transition-all ${current.carry_over_policy === opt.value ? 'border-2' : 'border'}`}
                  style={{
                    background: current.carry_over_policy === opt.value ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
                    borderColor: current.carry_over_policy === opt.value ? `${opt.color}50` : 'rgba(255,255,255,0.07)',
                  }}>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: current.carry_over_policy === opt.value ? opt.color : 'rgba(255,255,255,0.5)' }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-white/25 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>

            {current.carry_over_policy === 'capped' && (
              <div className="mt-3 flex items-center gap-3">
                <label className="text-[11px] text-white/40 flex-shrink-0">Maximum reportable :</label>
                <input type="number" min={0} max={30}
                  value={current.carry_over_max_days}
                  onChange={e => set('carry_over_max_days', parseInt(e.target.value) || 0)}
                  className="w-20 rounded-xl px-3 py-1.5 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-amber-500"
                  style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}
                />
                <span className="text-[11px] text-white/30">jours</span>
              </div>
            )}
          </div>

          {/* Save */}
          {form && (
            <button onClick={handleSave} disabled={updateType.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: saved ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              {saved ? <><Check size={14}/> Enregistré</> : 'Sauvegarder les règles'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function LeaveRulesEngine() {
  const { data: types = [], isLoading } = useLeaveTypes()
  const recalculate = useRecalculateBalances()
  const applyCarryOver = useApplyCarryOver()
  const [recalcDone, setRecalcDone] = useState(false)
  const [carryDone, setCarryDone]   = useState(false)
  const [carryYear, setCarryYear]   = useState(new Date().getFullYear() - 1)

  const activeTypes = types.filter(t => t.is_active)

  async function handleRecalculate() {
    await recalculate.mutateAsync({})
    setRecalcDone(true)
    setTimeout(() => setRecalcDone(false), 3000)
  }

  async function handleCarryOver() {
    await applyCarryOver.mutateAsync({ fromYear: carryYear })
    setCarryDone(true)
    setTimeout(() => setCarryDone(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background:'rgba(255,255,255,0.04)' }}/>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Types de congés */}
      <div>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Settings2 size={13}/> Règles par type de congé
        </h3>
        {activeTypes.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">Aucun type de congé actif</p>
        ) : (
          <div className="space-y-2">
            {activeTypes.map(type => (
              <LeaveTypeRuleCard key={type.id} type={type}/>
            ))}
          </div>
        )}
      </div>

      {/* Actions moteur */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recalcul acquisition */}
        <div className="rounded-2xl border p-5 space-y-3"
          style={{ background:'rgba(99,102,241,0.05)', borderColor:'rgba(99,102,241,0.15)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400"/>
            <h4 className="text-sm font-semibold text-white/70">Recalculer soldes</h4>
          </div>
          <p className="text-[11px] text-white/30">
            Recalcule les jours acquis pour toute l'organisation selon les règles définies.
          </p>
          <button onClick={handleRecalculate} disabled={recalculate.isPending}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: recalcDone ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)', border:'1px solid rgba(99,102,241,0.3)' }}>
            {recalculate.isPending ? <><RefreshCw size={12} className="animate-spin"/> Calcul...</> :
             recalcDone ? <><Check size={12}/> Terminé</> :
             <><RefreshCw size={12}/> Lancer le calcul</>}
          </button>
        </div>

        {/* Appliquer report N+1 */}
        <div className="rounded-2xl border p-5 space-y-3"
          style={{ background:'rgba(245,158,11,0.05)', borderColor:'rgba(245,158,11,0.15)' }}>
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-amber-400"/>
            <h4 className="text-sm font-semibold text-white/70">Appliquer report N+1</h4>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-white/30">Année source :</label>
            <select value={carryYear} onChange={e => setCarryYear(Number(e.target.value))}
              className="flex-1 rounded-lg px-2 py-1 text-xs text-white/70 border outline-none"
              style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}>
              {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y} → {y+1}</option>)}
            </select>
          </div>
          <button onClick={handleCarryOver} disabled={applyCarryOver.isPending}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: carryDone ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)', border:'1px solid rgba(245,158,11,0.3)' }}>
            {applyCarryOver.isPending ? <><RefreshCw size={12} className="animate-spin"/> Calcul...</> :
             carryDone ? <><Check size={12}/> Reports appliqués</> :
             <><RotateCcw size={12}/> Appliquer les reports</>}
          </button>
        </div>
      </div>
    </div>
  )
}
