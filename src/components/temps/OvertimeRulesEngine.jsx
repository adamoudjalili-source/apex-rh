// ============================================================
// APEX RH — src/components/temps/OvertimeRulesEngine.jsx
// Session 71 — Moteur de règles heures supplémentaires
// Config : seuils journalier/hebdo, taux 25/50/100%, mode calcul
// ============================================================
import { useState, useEffect } from 'react'
import { Settings, Save, RotateCcw, Info, CheckCircle } from 'lucide-react'
import {
  useTimeSettings,
  useUpdateTimeSettings,
  useRecalculateOrgOvertime,
  DEFAULT_OT_SETTINGS,
  OT_MODES,
  formatHours,
} from '../../hooks/useTemps'

// ─── Petit composant champ numérique ──────────────────────────
function NumField({ label, value, onChange, min = 0, max = 200, step = 0.5, suffix = 'h', hint }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-24 px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10
                     focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
        />
        <span className="text-white/40 text-xs">{suffix}</span>
      </div>
      {hint && <p className="text-white/30 text-xs mt-1">{hint}</p>}
    </div>
  )
}

// ─── Aperçu visuel du barème ──────────────────────────────────
function OtBarem({ settings }) {
  const s = { ...DEFAULT_OT_SETTINGS, ...settings }
  const t   = s.weekly_threshold_hours
  const t25 = s.ot_rate_25_after
  const t50 = s.ot_rate_50_after
  const t100 = s.ot_rate_100_after
  const total = t100 ? (t + t100 + 4) : (t + t50 + 4)

  const segments = [
    { label: 'Normal',   hours: t,        color: '#10B981', pct: (t / total) * 100 },
    { label: '+25%',     hours: t50 - t25, color: '#F59E0B', pct: ((t50 - t25) / total) * 100 },
    { label: '+50%',     hours: t100 ? t100 - t50 : 4, color: '#EF4444', pct: ((t100 ? t100 - t50 : 4) / total) * 100 },
  ]
  if (t100) {
    segments.push({ label: '+100%', hours: 4, color: '#7C3AED', pct: (4 / total) * 100 })
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-white/50 mb-2">Aperçu barème hebdomadaire</p>
      <div className="flex rounded-lg overflow-hidden h-8 w-full">
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{ width: `${seg.pct}%`, background: seg.color + '33', borderRight: `2px solid ${seg.color}` }}
            className="flex items-center justify-center"
            title={`${seg.label} — ${formatHours(seg.hours)}`}
          >
            <span className="text-xs font-medium" style={{ color: seg.color }}>
              {seg.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/30 mt-1">
        <span>0h</span>
        <span>{formatHours(t)} (normal)</span>
        <span>{formatHours(t + (t50 - t25))} (+25%)</span>
        <span>{formatHours(total)}+</span>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function OvertimeRulesEngine() {
  const { data: settings, isLoading } = useTimeSettings()
  const updateSettings   = useUpdateTimeSettings()
  const recalcOrg        = useRecalculateOrgOvertime()

  const [form, setForm]   = useState(null)
  const [saved, setSaved] = useState(false)
  const [recalcWeek, setRecalcWeek] = useState('')

  useEffect(() => {
    if (settings && !form) {
      setForm({
        daily_threshold_hours:      settings.daily_threshold_hours      ?? DEFAULT_OT_SETTINGS.daily_threshold_hours,
        weekly_threshold_hours:     settings.weekly_threshold_hours      ?? DEFAULT_OT_SETTINGS.weekly_threshold_hours,
        ot_rate_25_after:           settings.ot_rate_25_after            ?? DEFAULT_OT_SETTINGS.ot_rate_25_after,
        ot_rate_50_after:           settings.ot_rate_50_after            ?? DEFAULT_OT_SETTINGS.ot_rate_50_after,
        ot_rate_100_after:          settings.ot_rate_100_after           ?? DEFAULT_OT_SETTINGS.ot_rate_100_after,
        submission_deadline_days:   settings.submission_deadline_days    ?? DEFAULT_OT_SETTINGS.submission_deadline_days,
        alert_enabled:              settings.alert_enabled               ?? DEFAULT_OT_SETTINGS.alert_enabled,
        overtime_requires_approval: settings.overtime_requires_approval  ?? DEFAULT_OT_SETTINGS.overtime_requires_approval,
        overtime_calc_mode:         settings.overtime_calc_mode          ?? DEFAULT_OT_SETTINGS.overtime_calc_mode,
      })
    }
  }, [settings])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    await updateSettings.mutateAsync(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => setForm({ ...DEFAULT_OT_SETTINGS })

  const handleRecalc = async () => {
    await recalcOrg.mutateAsync({ weekStart: recalcWeek || undefined })
  }

  if (isLoading || !form) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            <Settings className="w-4 h-4 text-white"/>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Moteur de règles — Heures supplémentaires</h3>
            <p className="text-xs text-white/40">Configuration seuils, taux et validation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50
                       hover:text-white/70 border border-white/10 hover:border-white/20 transition-all"
          >
            <RotateCcw className="w-3 h-3"/> Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white
                       transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}
          >
            {saved
              ? <><CheckCircle className="w-3 h-3"/> Enregistré</>
              : <><Save className="w-3 h-3"/> Enregistrer</>
            }
          </button>
        </div>
      </div>

      {/* Grille config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Seuils */}
        <div className="rounded-2xl border border-white/[0.08] p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Seuils déclenchement</h4>

          <div>
            <label className="block text-xs text-white/50 mb-2">Mode de calcul</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(OT_MODES).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => set('overtime_calc_mode', key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={form.overtime_calc_mode === key ? {
                    background: '#7C3AED22',
                    border: '1px solid #7C3AED88',
                    color: '#A78BFA',
                  } : {
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumField
              label="Seuil journalier"
              value={form.daily_threshold_hours}
              onChange={v => set('daily_threshold_hours', v)}
              hint="Au-delà → HS du jour"
              disabled={form.overtime_calc_mode === 'weekly'}
            />
            <NumField
              label="Seuil hebdomadaire"
              value={form.weekly_threshold_hours}
              onChange={v => set('weekly_threshold_hours', v)}
              hint="Au-delà → HS de la semaine"
            />
          </div>
        </div>

        {/* Taux */}
        <div className="rounded-2xl border border-white/[0.08] p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Taux de majoration</h4>
          <div className="grid grid-cols-3 gap-3">
            <NumField
              label="Début taux 25%"
              value={form.ot_rate_25_after}
              onChange={v => set('ot_rate_25_after', v)}
              hint="Après Xh HS"
            />
            <NumField
              label="Début taux 50%"
              value={form.ot_rate_50_after}
              onChange={v => set('ot_rate_50_after', v)}
              hint="Après Xh HS"
            />
            <NumField
              label="Début taux 100%"
              value={form.ot_rate_100_after}
              onChange={v => set('ot_rate_100_after', v)}
              hint="Optionnel — laisser vide"
            />
          </div>
          <OtBarem settings={form}/>
        </div>

        {/* Workflow */}
        <div className="rounded-2xl border border-white/[0.08] p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Workflow & alertes</h4>

          <NumField
            label="Délai soumission (jours après fin semaine)"
            value={form.submission_deadline_days}
            onChange={v => set('submission_deadline_days', v)}
            min={1} max={14} step={1} suffix="j"
            hint="Alerte si feuille non soumise après ce délai"
          />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Validation HS requise</p>
              <p className="text-xs text-white/30">Les HS doivent être approuvées par le manager</p>
            </div>
            <button
              onClick={() => set('overtime_requires_approval', !form.overtime_requires_approval)}
              className="relative inline-flex h-5 w-9 rounded-full transition-colors"
              style={{ background: form.overtime_requires_approval ? '#7C3AED' : 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ left: form.overtime_requires_approval ? '18px' : '2px' }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Alertes proactives</p>
              <p className="text-xs text-white/30">Notifications dépassement seuil et retards</p>
            </div>
            <button
              onClick={() => set('alert_enabled', !form.alert_enabled)}
              className="relative inline-flex h-5 w-9 rounded-full transition-colors"
              style={{ background: form.alert_enabled ? '#7C3AED' : 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ left: form.alert_enabled ? '18px' : '2px' }}
              />
            </button>
          </div>
        </div>

        {/* Actions moteur */}
        <div className="rounded-2xl border border-white/[0.08] p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Actions moteur</h4>

          <div className="rounded-xl p-4 border border-amber-500/20"
            style={{ background: 'rgba(245,158,11,0.05)' }}>
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-amber-300/80">
                Après modification des règles, recalculer les feuilles existantes
                pour appliquer les nouveaux seuils.
              </p>
            </div>
            <div className="flex gap-3">
              <input
                type="date"
                value={recalcWeek}
                onChange={e => setRecalcWeek(e.target.value)}
                placeholder="Semaine spécifique (optionnel)"
                className="flex-1 px-3 py-2 rounded-lg text-xs text-white bg-white/5 border border-white/10
                           focus:outline-none focus:border-amber-500/60"
              />
              <button
                onClick={handleRecalc}
                disabled={recalcOrg.isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2
                           transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#D97706,#B45309)' }}
              >
                {recalcOrg.isPending
                  ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin"/>
                  : <RotateCcw className="w-3 h-3"/>
                }
                Recalculer
              </button>
            </div>
            {recalcOrg.isSuccess && (
              <p className="text-xs text-green-400 mt-2">
                ✓ {recalcOrg.data?.recalculated} feuille(s) recalculée(s)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
