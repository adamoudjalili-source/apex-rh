// ============================================================
// APEX RH — src/components/offboarding/FinalSettlementPanel.jsx
// Session 68 — Solde de tout compte
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Calendar, CheckCircle2, Save, Info } from 'lucide-react'
import { useUpdateOffboardingProcess } from '../../hooks/useOffboarding'

function NumberInput({ label, value, onChange, suffix = '€', disabled, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-white/[0.08] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          step="0.01"
          className="flex-1 px-3 py-2 bg-transparent text-sm text-white outline-none [appearance:textfield]"/>
        <span className="px-3 text-xs text-white/30 border-l border-white/[0.08]">{suffix}</span>
      </div>
      {hint && <p className="text-[10px] text-white/30 mt-1">{hint}</p>}
    </div>
  )
}

export default function FinalSettlementPanel({ process, readOnly = false }) {
  const update = useUpdateOffboardingProcess()
  const [saved, setSaved]   = useState(false)

  const [form, setForm] = useState({
    paid_leave_balance: process?.paid_leave_balance || 0,
    rtt_balance:        process?.rtt_balance || 0,
    salary_advance:     process?.salary_advance || 0,
    final_amount:       process?.final_amount || 0,
    final_amount_paid_at: process?.final_amount_paid_at
      ? new Date(process.final_amount_paid_at).toISOString().slice(0, 10)
      : '',
  })

  useEffect(() => {
    if (process) {
      setForm({
        paid_leave_balance:   process.paid_leave_balance || 0,
        rtt_balance:          process.rtt_balance || 0,
        salary_advance:       process.salary_advance || 0,
        final_amount:         process.final_amount || 0,
        final_amount_paid_at: process.final_amount_paid_at
          ? new Date(process.final_amount_paid_at).toISOString().slice(0, 10)
          : '',
      })
    }
  }, [process])

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    await update.mutateAsync({
      id:                   process.id,
      paid_leave_balance:   form.paid_leave_balance,
      rtt_balance:          form.rtt_balance,
      salary_advance:       form.salary_advance,
      final_amount:         form.final_amount,
      final_amount_paid_at: form.final_amount_paid_at || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const isPaid = !!process?.final_amount_paid_at

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

      {/* Statut paiement */}
      {isPaid && (
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0"/>
          <span className="text-sm text-emerald-400">
            Solde versé le {new Date(process.final_amount_paid_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <Info size={14} className="text-indigo-400 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-indigo-300/70">
          Renseignez les soldes de congés et RTT récupérés depuis le module Congés S67.
          Le montant final est à calculer selon la convention collective applicable.
        </p>
      </div>

      {/* Soldes congés */}
      <div>
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Soldes de congés restants
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberInput
            label="Congés payés"
            value={form.paid_leave_balance}
            onChange={set('paid_leave_balance')}
            suffix="jours"
            disabled={readOnly}
            hint="Jours CP acquis non pris"/>
          <NumberInput
            label="RTT"
            value={form.rtt_balance}
            onChange={set('rtt_balance')}
            suffix="jours"
            disabled={readOnly}
            hint="Jours RTT acquis non pris"/>
        </div>
      </div>

      {/* Avance sur salaire */}
      <div>
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Retenues
        </h4>
        <NumberInput
          label="Avance sur salaire à déduire"
          value={form.salary_advance}
          onChange={set('salary_advance')}
          disabled={readOnly}
          hint="Avances perçues à rembourser"/>
      </div>

      {/* Montant final */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1">
          <DollarSign size={11}/> Solde de tout compte
        </h4>
        <NumberInput
          label="Montant final à verser"
          value={form.final_amount}
          onChange={set('final_amount')}
          disabled={readOnly}
          hint="Montant brut calculé hors charges"/>
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar size={10}/> Date de versement
          </label>
          <input
            type="date"
            value={form.final_amount_paid_at}
            onChange={e => setForm(f => ({ ...f, final_amount_paid_at: e.target.value }))}
            disabled={readOnly}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/[0.08] outline-none focus:border-indigo-500/50"
            style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }}/>
        </div>
      </div>

      {/* Récap */}
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-xs text-white/30 mb-3">Récapitulatif</p>
        <div className="space-y-2">
          {[
            { label: 'CP à indemniser', val: `${form.paid_leave_balance} j` },
            { label: 'RTT à indemniser', val: `${form.rtt_balance} j` },
            { label: 'Avances à déduire', val: `-${form.salary_advance.toFixed(2)} €` },
            { label: 'Montant final', val: `${form.final_amount.toFixed(2)} €`, highlight: true },
          ].map(({ label, val, highlight }) => (
            <div key={label} className="flex justify-between items-center">
              <span className={`text-xs ${highlight ? 'text-white font-semibold' : 'text-white/40'}`}>{label}</span>
              <span className={`text-sm font-medium ${highlight ? 'text-emerald-400' : 'text-white/60'}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={update.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
              color:      saved ? '#10B981' : '#818CF8',
              border:     `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
            }}>
            <Save size={14}/>
            {update.isPending ? 'Sauvegarde...' : saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </button>
        </div>
      )}
    </motion.div>
  )
}
