// ============================================================
// APEX RH — SettingsModules.jsx
// S122 — Sections : Modules & Cycles, PULSE, Gamification, IA Coach
// ============================================================
import { useState, useEffect } from 'react'
import {
  Blocks, Target, RefreshCw, Clock, Timer, Zap, BrainCircuit, Info
} from 'lucide-react'
import { useAppSettings, useUpdateAppSetting } from '../../hooks/useSettings'
import { SectionCard, SettingRow, Toggle, SaveButton, SelectField, SettingsSkeleton } from './Settings'

// ─── SECTION MODULES & CYCLES ────────────────────────────────

export function ModulesSection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings?.modules) setForm({ ...settings.modules })
  }, [settings])

  const handleSave = async () => {
    if (!form) return
    await updateSetting.mutateAsync({ key: 'modules', value: form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading || !form) return <SettingsSkeleton />

  const MODULE_ROWS = [
    { key: 'tasks_enabled', label: 'Gestion des Tâches', desc: 'Kanban, listes, calendrier, Ma Journée' },
    { key: 'okr_enabled', label: 'Objectifs OKR', desc: 'Cascade 4 niveaux, évaluation, key results' },
    { key: 'projects_enabled', label: 'Gestion des Projets', desc: 'Gantt, jalons, livrables, risques, équipe' },
    { key: 'feedback360_enabled', label: 'Feedback 360°', desc: 'Évaluations structurées : auto-évaluation, pairs, manager' },
    { key: 'surveys_engagement_enabled', label: "Surveys d'Engagement", desc: "Questionnaires anonymes périodiques — score et tendance d'engagement équipe" },
    { key: 'ia_coach_enabled', label: 'IA Coach', desc: "Analyse IA des journaux PULSE — suggestions personnalisées et résumé équipe (API Anthropic)" },
    { key: 'gamification_enabled', label: 'Gamification Avancée', desc: 'Streaks, badges Bronze/Argent/Or, points rewards et classement inter-équipes' },
    { key: 'review_cycles_enabled', label: 'Review Cycles Formels', desc: 'Évaluations trimestrielles, semestrielles et annuelles avec synthèse PULSE + Feedback 360° + OKRs' },
    { key: 'analytics_enabled', label: 'Analytics Avancés & Prédictif', desc: 'Heatmap équipe, corrélation PULSE/OKR, comparatif services et score de risque de départ — réservé managers' },
    { key: 'integrations_enabled', label: 'Intégrations Tierces', desc: 'Webhooks Slack, Teams, Zapier + export Google Calendar — réservé administrateurs' },
    { key: 'formation_enabled', label: 'Formation & Certifications', desc: 'Catalogue de formations, inscriptions, certifications, suivi d\'équipe', defaultVal: true },
    { key: 'compensation_enabled', label: 'Compensation & Benchmark', desc: 'Rémunération individuelle, benchmark marché, masse salariale équipe', defaultVal: true },
    { key: 'recrutement_enabled', label: 'Recrutement', desc: 'Pipeline candidats, offres, entretiens, IA matching et parser CV', defaultVal: true },
    { key: 'entretiens_enabled', label: 'Entretiens Annuels', desc: 'Campagnes d\'évaluation, auto-évaluation collaborateur, calibration RH', defaultVal: true },
  ]

  const WORKFLOW_STEPS = [
    { id: 'auto_evaluation', label: 'Auto-évaluation', desc: 'Le collaborateur évalue ses propres objectifs' },
    { id: 'validation_n1', label: 'Validation N+1', desc: "Le manager valide l'évaluation" },
    { id: 'calibration_rh', label: 'Calibration RH', desc: 'L\'administrateur calibre les scores finaux' },
  ]

  return (
    <div className="space-y-5">
      <SectionCard title="Modules actifs" description="Activez ou désactivez les modules de la plateforme" icon={Blocks}>
        {MODULE_ROWS.map(({ key, label, desc, defaultVal }) => (
          <SettingRow key={key} label={label} description={desc}>
            <Toggle
              checked={form[key] ?? (defaultVal || false)}
              onChange={(v) => setForm(prev => ({ ...prev, [key]: v }))}
            />
          </SettingRow>
        ))}
      </SectionCard>

      <SectionCard title="Configuration OKR" description="Paramètres des cycles d'objectifs" icon={Target}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <SelectField
            label="Durée par défaut des cycles"
            value={String(form.okr_default_cycle_months || 3)}
            onChange={(v) => setForm(prev => ({ ...prev, okr_default_cycle_months: parseInt(v) }))}
            options={[
              { value: '1', label: '1 mois' },
              { value: '3', label: '3 mois (trimestriel)' },
              { value: '6', label: '6 mois (semestriel)' },
              { value: '12', label: '12 mois (annuel)' },
            ]}
          />
          <SelectField
            label="Barème de notation"
            value={form.okr_scoring_scale || 'google'}
            onChange={(v) => setForm(prev => ({ ...prev, okr_scoring_scale: v }))}
            options={[
              { value: 'google', label: 'Google OKR (0 → 1.0)' },
              { value: 'percentage', label: 'Pourcentage (0% → 100%)' },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Workflow d'évaluation" description="Étapes du processus d'évaluation OKR" icon={RefreshCw}>
        <div className="space-y-3">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isActive = form.evaluation_workflow?.includes(step.id)
            return (
              <div key={step.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                isActive ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/[0.02] border-white/[0.04]'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/30'
                  }`}>{idx + 1}</span>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/40'}`}>{step.label}</p>
                    <p className="text-white/30 text-xs">{step.desc}</p>
                  </div>
                </div>
                <Toggle
                  checked={isActive}
                  onChange={(v) => {
                    const wf = form.evaluation_workflow || []
                    setForm(prev => ({
                      ...prev,
                      evaluation_workflow: v ? [...wf, step.id] : wf.filter((s) => s !== step.id),
                    }))
                  }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-end mt-5">
          <SaveButton onClick={handleSave} saving={updateSetting.isPending} saved={saved} />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── SECTION PULSE SETTINGS ──────────────────────────────────

function TimeInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-white/40">{label}</label>
      <input type="time" value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 w-32" />
    </div>
  )
}

function WeightInput({ label, value, onChange, color }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: `${color}80` }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" min="0" max="100" step="5" value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 w-20" />
        <span className="text-xs text-white/30">%</span>
      </div>
    </div>
  )
}

export function PulseSettingsSection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [horaires, setHoraires] = useState(null)
  const [weights, setWeights] = useState(null)
  const [savedH, setSavedH] = useState(false)
  const [savedW, setSavedW] = useState(false)

  useEffect(() => {
    if (!settings) return
    setHoraires({
      pulse_brief_start: settings.pulse_brief_start || '07:00',
      pulse_brief_deadline: settings.pulse_brief_deadline || '10:00',
      pulse_journal_start: settings.pulse_journal_start || '16:00',
      pulse_journal_deadline: settings.pulse_journal_deadline || '18:30',
    })
    const raw = settings.pulse_score_weights || {}
    setWeights({
      delivery: Number(raw.delivery ?? 40),
      quality: Number(raw.quality ?? 30),
      regularity: Number(raw.regularity ?? 20),
      bonus: Number(raw.bonus ?? 10),
    })
  }, [settings])

  if (isLoading || !horaires || !weights) return <SettingsSkeleton />

  const totalWeight = weights.delivery + weights.quality + weights.regularity + weights.bonus
  const weightValid = totalWeight === 100

  const handleSaveHoraires = async () => {
    for (const [key, val] of Object.entries(horaires)) {
      await updateSetting.mutateAsync({ key, value: val })
    }
    setSavedH(true)
    setTimeout(() => setSavedH(false), 2000)
  }

  const handleSaveWeights = async () => {
    if (!weightValid) return
    await updateSetting.mutateAsync({ key: 'pulse_score_weights', value: weights })
    setSavedW(true)
    setTimeout(() => setSavedW(false), 2000)
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Fenêtres horaires PULSE" description="Créneaux d'ouverture du brief matinal et du journal du soir" icon={Clock}>
        <div className="space-y-5">
          {[
            { label: 'Brief matinal', startKey: 'pulse_brief_start', endKey: 'pulse_brief_deadline' },
            { label: 'Journal du soir', startKey: 'pulse_journal_start', endKey: 'pulse_journal_deadline' },
          ].map(({ label, startKey, endKey }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{label}</p>
              <div className="flex items-center gap-6 flex-wrap">
                <TimeInput label="Ouverture" value={horaires[startKey]} onChange={(v) => setHoraires(prev => ({ ...prev, [startKey]: v }))} />
                <div className="text-white/20 text-sm mt-4">→</div>
                <TimeInput label="Limite" value={horaires[endKey]} onChange={(v) => setHoraires(prev => ({ ...prev, [endKey]: v }))} />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <SaveButton onClick={handleSaveHoraires} saving={updateSetting.isPending} saved={savedH} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pondérations du score" description="Les 4 dimensions du score PULSE. La somme doit être égale à 100%." icon={Timer}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <WeightInput label="Delivery" value={weights.delivery} onChange={(v) => setWeights(p => ({ ...p, delivery: v }))} color="#3B82F6" />
            <WeightInput label="Quality" value={weights.quality} onChange={(v) => setWeights(p => ({ ...p, quality: v }))} color="#8B5CF6" />
            <WeightInput label="Régularité" value={weights.regularity} onChange={(v) => setWeights(p => ({ ...p, regularity: v }))} color="#10B981" />
            <WeightInput label="Bonus OKR" value={weights.bonus} onChange={(v) => setWeights(p => ({ ...p, bonus: v }))} color="#C9A227" />
          </div>
          <div className="h-2 rounded-full overflow-hidden flex">
            {[
              { v: weights.delivery, c: '#3B82F6' }, { v: weights.quality, c: '#8B5CF6' },
              { v: weights.regularity, c: '#10B981' }, { v: weights.bonus, c: '#C9A227' },
            ].map((d, i) => (
              <div key={i} style={{ width: `${d.v}%`, background: d.c }} className="transition-all duration-300" />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${weightValid ? 'text-emerald-400' : 'text-red-400'}`}>
              Total : {totalWeight}% {!weightValid && '— doit être 100%'}
            </p>
            <SaveButton onClick={handleSaveWeights} saving={updateSetting.isPending} saved={savedW} disabled={!weightValid} />
          </div>
        </div>
      </SectionCard>

      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.12)' }}>
        <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/40 leading-relaxed">
          Les modifications de pondérations s'appliquent aux prochains calculs de score. Les scores déjà calculés ne sont pas recalculés automatiquement.
        </p>
      </div>
    </div>
  )
}

// ─── SECTION GAMIFICATION ────────────────────────────────────

const GAMIF_BADGES = [
  { icon: '🌱', label: 'Premier Journal', tier: 'Bronze', pts: 20 },
  { icon: '🔥', label: '3 Jours de Suite', tier: 'Bronze', pts: 30 },
  { icon: '⚡', label: 'Flamme de la Semaine', tier: 'Argent', pts: 100 },
  { icon: '💫', label: 'Sprint du Mois', tier: 'Or', pts: 500 },
  { icon: '🏅', label: 'Performer (score ≥ 60)', tier: 'Bronze', pts: 50 },
  { icon: '⭐', label: 'Haute Performance (≥ 75)', tier: 'Argent', pts: 150 },
  { icon: '🏆', label: 'Excellence (≥ 85)', tier: 'Or', pts: 400 },
  { icon: '🎯', label: 'Semaine Parfaite', tier: 'Argent', pts: 120 },
  { icon: '👑', label: "Meilleur de l'Équipe", tier: 'Or', pts: 200 },
]

const TIER_COLORS = { Bronze: '#CD7F32', Argent: '#C0C0C0', Or: '#C9A227' }

export function GamificationSettingsSection() {
  return (
    <SectionCard title="Configuration Gamification" description="Paramètres du module Gamification Avancée" icon={Zap}>
      <SettingRow label="Niveaux de progression" description="Les 5 paliers de progression des collaborateurs">
        <div className="flex flex-col gap-1 items-end">
          {[
            { label: 'Recrue', pts: '0', color: '#6B7280' },
            { label: 'Actif', pts: '100', color: '#3B82F6' },
            { label: 'Engagé', pts: '300', color: '#8B5CF6' },
            { label: 'Performant', pts: '700', color: '#10B981' },
            { label: 'Excellence', pts: '1 500', color: '#C9A227' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg"
              style={{ background: `${l.color}18`, color: l.color }}>
              <span className="font-semibold">{l.label}</span>
              <span style={{ opacity: 0.7 }}>— {l.pts} pts</span>
            </div>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="Points par action" description="Points attribués automatiquement à chaque action">
        <div className="flex flex-col gap-1 items-end text-xs">
          {[
            { label: 'Journal soumis', pts: '+10' }, { label: 'Brief soumis', pts: '+5' },
            { label: 'Score ≥ 70', pts: '+25' }, { label: 'Streak 7 jours', pts: '+50' },
            { label: 'Streak 30 jours', pts: '+200' },
          ].map(a => (
            <div key={a.label} className="flex items-center gap-2">
              <span className="text-gray-400">{a.label}</span>
              <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                {a.pts}
              </span>
            </div>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="Catalogue badges" description={`${GAMIF_BADGES.length} badges disponibles (Bronze, Argent, Or)`}>
        <div className="flex flex-col gap-1.5 items-end">
          {GAMIF_BADGES.map(b => (
            <div key={b.label} className="flex items-center gap-2 text-xs px-2 py-0.5 rounded-lg"
              style={{ background: `${TIER_COLORS[b.tier]}15`, color: TIER_COLORS[b.tier] }}>
              <span>{b.icon}</span>
              <span>{b.label}</span>
              <span style={{ opacity: 0.7 }}>+{b.pts} pts</span>
            </div>
          ))}
        </div>
      </SettingRow>

      <div className="rounded-xl p-3 mt-1 text-xs text-gray-400 leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        💡 Les badges et points sont calculés automatiquement depuis les données PULSE.
        Les collaborateurs peuvent déclencher une mise à jour depuis l'onglet Gamification → "Mettre à jour mes stats".
      </div>
    </SectionCard>
  )
}

// ─── SECTION IA COACH ────────────────────────────────────────

export function IACoachSettingsSection() {
  return (
    <SectionCard title="Configuration IA Coach" description="Paramètres du module IA Coach (Anthropic Claude)" icon={BrainCircuit}>
      <SettingRow label="Modèle IA utilisé" description="Modèle Claude utilisé pour l'analyse des journaux PULSE">
        <div className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'rgba(79,70,229,0.1)', color: '#818CF8' }}>
          claude-sonnet-4-20250514
        </div>
      </SettingRow>
      <SettingRow label="Période d'analyse" description="Nombre de jours de journaux analysés par l'IA lors d'une demande">
        <div className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'rgba(79,70,229,0.1)', color: '#818CF8' }}>
          7 jours
        </div>
      </SettingRow>
      <SettingRow label="Axes d'analyse" description="Les 3 dimensions analysées pour chaque collaborateur">
        <div className="flex flex-col gap-1.5 items-end">
          {[
            { icon: '🎯', label: 'Performance', color: '#4F46E5' },
            { icon: '💚', label: 'Bien-être', color: '#10B981' },
            { icon: '🔓', label: 'Blocages', color: '#F59E0B' },
          ].map(a => (
            <div key={a.label} className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-lg"
              style={{ background: `${a.color}18`, color: a.color }}>
              <span>{a.icon}</span> {a.label}
            </div>
          ))}
        </div>
      </SettingRow>
      <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <p className="text-xs text-amber-400/80">
          ⚠️ Chaque analyse consomme environ 1 000–2 000 tokens (input + output). Avec Claude Sonnet, le coût est estimé à ~0,001–0,003 $ par analyse individuelle.
        </p>
      </div>
    </SectionCard>
  )
}
