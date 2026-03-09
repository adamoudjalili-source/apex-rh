// ============================================================
// APEX RH — SettingsReviews.jsx
// S122 — Sections : Surveys Engagement, Feedback 360°, Review Cycles
// ============================================================
import { useState, useEffect } from 'react'
import { BarChart2, MessageSquare, ClipboardList, Check, Save } from 'lucide-react'
import { useAppSettings, useUpdateAppSetting } from '../../hooks/useSettings'
import { SectionCard, SettingRow, Toggle, SaveButton, SettingsSkeleton } from './Settings'

// ─── SECTION SURVEYS D'ENGAGEMENT ────────────────────────────

export function SurveysEngagementSettingsSection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState({ surveys_frequency: 'quarterly', surveys_reminder_days: 2 })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        surveys_frequency: settings.surveys_frequency ?? 'quarterly',
        surveys_reminder_days: settings.surveys_reminder_days ?? 2,
      })
    }
  }, [settings])

  const handleSave = async () => {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'surveys_frequency', value: form.surveys_frequency }),
      updateSetting.mutateAsync({ key: 'surveys_reminder_days', value: form.surveys_reminder_days }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <SettingsSkeleton />

  return (
    <div className="space-y-5">
      <SectionCard title="Configuration Surveys d'Engagement" description="Paramètres des questionnaires d'engagement périodiques" icon={BarChart2}>
        <SettingRow label="Fréquence recommandée" description="Cadence suggérée lors de la création d'un nouveau survey">
          <select
            value={form.surveys_frequency}
            onChange={e => setForm(prev => ({ ...prev, surveys_frequency: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"
          >
            {[
              { value: 'monthly', label: 'Mensuel' },
              { value: 'quarterly', label: 'Trimestriel (recommandé)' },
              { value: 'biannual', label: 'Semestriel' },
              { value: 'annual', label: 'Annuel' },
            ].map(o => <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>)}
          </select>
        </SettingRow>
        <SettingRow label="Rappel avant clôture (jours)" description="Nombre de jours avant la date de fin pour envoyer un rappel aux non-répondants">
          <input type="number" min={1} max={14} value={form.surveys_reminder_days}
            onChange={e => setForm(prev => ({ ...prev, surveys_reminder_days: parseInt(e.target.value) || 2 }))}
            className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 text-center"
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Dimensions évaluées" description="Les 5 dimensions d'engagement incluses dans chaque survey (non modifiables)" icon={BarChart2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
          {[
            { icon: '😊', label: 'Satisfaction générale', desc: 'Satisfaction globale au travail' },
            { icon: '⚡', label: 'Motivation & Énergie', desc: 'Niveau de motivation quotidienne' },
            { icon: '🤝', label: 'Relation Manager', desc: 'Qualité du soutien managérial' },
            { icon: '🏢', label: 'Environnement', desc: 'Qualité du cadre de travail' },
            { icon: '⚖️', label: 'Équilibre vie pro/perso', desc: 'Équilibre entre vie pro et perso' },
          ].map(d => (
            <div key={d.label} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl p-3">
              <span className="text-xl flex-shrink-0">{d.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-300">{d.label}</div>
                <div className="text-xs text-gray-600">{d.desc}</div>
              </div>
              <span className="ml-auto text-xs text-gray-600 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">Échelle 1–5</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={updateSetting.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all">
          {saved ? <><Check className="w-4 h-4" /> Enregistré</> : <><Save className="w-4 h-4" /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

// ─── SECTION FEEDBACK 360° ────────────────────────────────────

export function Feedback360SettingsSection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState({ feedback360_anonymous: false, feedback360_scores_visible: false })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        feedback360_anonymous: settings.feedback360_anonymous ?? false,
        feedback360_scores_visible: settings.feedback360_scores_visible ?? false,
      })
    }
  }, [settings])

  const handleSave = async () => {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'feedback360_anonymous', value: form.feedback360_anonymous }),
      updateSetting.mutateAsync({ key: 'feedback360_scores_visible', value: form.feedback360_scores_visible }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <SettingsSkeleton />

  return (
    <div className="space-y-5">
      <SectionCard title="Paramètres Feedback 360°" description="Configuration du module d'évaluation à 360 degrés" icon={MessageSquare}>
        <SettingRow label="Feedbacks anonymes" description="L'évalué ne voit pas le nom de son évaluateur (pair) — le manager reste identifié">
          <Toggle checked={form.feedback360_anonymous} onChange={(v) => setForm(prev => ({ ...prev, feedback360_anonymous: v }))} />
        </SettingRow>
        <SettingRow label="Scores visibles par l'évalué" description="L'évalué peut consulter ses scores détaillés (sans les commentaires si anonyme)">
          <Toggle checked={form.feedback360_scores_visible} onChange={(v) => setForm(prev => ({ ...prev, feedback360_scores_visible: v }))} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Questions évaluées" description="Les 5 compétences mesurées dans chaque feedback (non modifiables pour l'instant)" icon={MessageSquare}>
        {[
          { key: 'quality', label: 'Qualité du travail', icon: '⭐' },
          { key: 'deadlines', label: 'Respect des délais', icon: '⏱️' },
          { key: 'communication', label: 'Communication', icon: '💬' },
          { key: 'teamwork', label: "Esprit d'équipe", icon: '🤝' },
          { key: 'initiative', label: 'Initiative & Proactivité', icon: '🚀' },
        ].map(q => (
          <SettingRow key={q.key} label={`${q.icon} ${q.label}`} description="Score de 0 à 10">
            <span className="text-xs text-gray-500 bg-white/5 border border-white/10 rounded-lg px-2 py-1">0 – 10</span>
          </SettingRow>
        ))}
        <p className="text-xs text-gray-600 mt-3">+ Commentaire libre ajouté automatiquement à chaque formulaire</p>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={updateSetting.isPending}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
            saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
          }`}>
          {saved ? <><Check size={16} /> Enregistré</> : <><Save size={16} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

// ─── SECTION REVIEW CYCLES ───────────────────────────────────

export function ReviewCyclesSettingsSection() {
  const { data: settings } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState({
    review_cycles_default_frequency: 'annual',
    review_cycles_self_eval_days: 7,
    review_cycles_manager_eval_days: 14,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        review_cycles_default_frequency: settings.review_cycles_default_frequency ?? 'annual',
        review_cycles_self_eval_days: settings.review_cycles_self_eval_days ?? 7,
        review_cycles_manager_eval_days: settings.review_cycles_manager_eval_days ?? 14,
      })
    }
  }, [settings])

  async function handleSave() {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'review_cycles_default_frequency', value: form.review_cycles_default_frequency }),
      updateSetting.mutateAsync({ key: 'review_cycles_self_eval_days', value: form.review_cycles_self_eval_days }),
      updateSetting.mutateAsync({ key: 'review_cycles_manager_eval_days', value: form.review_cycles_manager_eval_days }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <SectionCard title="Configuration Review Cycles" description="Paramètres des cycles d'évaluation formels (trimestriel, semestriel, annuel)" icon={ClipboardList}>
      <SettingRow label="Fréquence par défaut" description="Fréquence pré-sélectionnée lors de la création d'un nouveau cycle">
        <select value={form.review_cycles_default_frequency}
          onChange={e => setForm(p => ({ ...p, review_cycles_default_frequency: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 text-sm text-white px-3 py-1.5 focus:outline-none focus:border-indigo-500/50">
          <option value="quarterly">Trimestrielle</option>
          <option value="biannual">Semestrielle</option>
          <option value="annual">Annuelle</option>
        </select>
      </SettingRow>
      <SettingRow label="Délai auto-évaluation (jours)" description="Nombre de jours accordés au collaborateur pour soumettre son auto-évaluation">
        <input type="number" min="1" max="30" value={form.review_cycles_self_eval_days}
          onChange={e => setForm(p => ({ ...p, review_cycles_self_eval_days: parseInt(e.target.value) || 7 }))}
          className="w-20 rounded-lg border border-white/10 bg-white/5 text-sm text-white px-3 py-1.5 text-center focus:outline-none focus:border-indigo-500/50" />
      </SettingRow>
      <SettingRow label="Délai évaluation manager (jours)" description="Nombre de jours accordés au manager après soumission de l'auto-évaluation">
        <input type="number" min="1" max="30" value={form.review_cycles_manager_eval_days}
          onChange={e => setForm(p => ({ ...p, review_cycles_manager_eval_days: parseInt(e.target.value) || 14 }))}
          className="w-20 rounded-lg border border-white/10 bg-white/5 text-sm text-white px-3 py-1.5 text-center focus:outline-none focus:border-indigo-500/50" />
      </SettingRow>

      <div className="mt-4 pt-4 border-t border-white/8">
        <p className="text-xs text-gray-500 mb-3">Compétences évaluées (grille standard)</p>
        <div className="space-y-1.5">
          {[
            { icon: '⭐', label: 'Qualité du travail', weight: '25%' },
            { icon: '⏱️', label: 'Respect des délais', weight: '20%' },
            { icon: '💬', label: 'Communication', weight: '20%' },
            { icon: '🤝', label: "Esprit d'équipe", weight: '20%' },
            { icon: '🚀', label: 'Initiative & Proactivité', weight: '15%' },
          ].map(c => (
            <div key={c.label} className="flex items-center justify-between rounded-lg bg-white/3 border border-white/8 px-3 py-2">
              <span className="text-sm text-gray-400">{c.icon} {c.label}</span>
              <span className="text-xs text-indigo-400 font-medium">{c.weight}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-2">La grille peut être personnalisée par cycle lors de la création.</p>
      </div>

      <div className="flex justify-end mt-4">
        <button onClick={handleSave} disabled={updateSetting.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
          {saved ? <><Check size={14} /> Enregistré</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </SectionCard>
  )
}
