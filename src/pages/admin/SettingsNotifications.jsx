// ============================================================
// APEX RH — SettingsNotifications.jsx
// S122 — Sections : Notifications email + Notifications PULSE
// ============================================================
import { useState, useEffect } from 'react'
import {
  Bell, Check, AlertTriangle, Target, FolderKanban, Calendar,
  Activity, Info, CheckSquare, FileText
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '../../hooks/useNotificationSettings'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../hooks/useNotifications'
import { SectionCard, SettingRow, Toggle, SaveButton, SettingsSkeleton } from './Settings'

// ─── SECTION NOTIFICATIONS EMAIL ────────────────────────────

export function NotificationsSection() {
  const { data: prefs, isLoading } = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (prefs) {
      setForm({ ...prefs })
    } else if (!isLoading) {
      setForm({
        email_task_assigned: true, email_task_overdue: true,
        email_task_completed: false, email_task_comment: true,
        email_objective_evaluation: true, email_project_member: true,
        email_project_milestone: true,
      })
    }
  }, [prefs, isLoading])

  const handleSave = async () => {
    if (!form) return
    const { id, user_id, updated_at, ...cleanPrefs } = form
    await updatePrefs.mutateAsync(cleanPrefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading || !form) return <SettingsSkeleton />

  const NOTIF_TYPES = [
    { key: 'email_task_assigned', label: 'Tâche assignée', description: 'Quand une tâche vous est assignée', icon: CheckSquare },
    { key: 'email_task_overdue', label: 'Tâche en retard', description: 'Quand une tâche dépasse sa date limite', icon: AlertTriangle },
    { key: 'email_task_completed', label: 'Tâche terminée', description: "Quand une tâche assignée est marquée terminée", icon: Check },
    { key: 'email_task_comment', label: 'Commentaire', description: "Quand quelqu'un commente une tâche", icon: FileText },
    { key: 'email_objective_evaluation', label: 'Évaluation OKR', description: "Changement de statut d'évaluation d'un objectif", icon: Target },
    { key: 'email_project_member', label: 'Ajout au projet', description: "Quand vous êtes ajouté comme membre d'un projet", icon: FolderKanban },
    { key: 'email_project_milestone', label: 'Jalon atteint', description: "Quand un jalon de projet est marqué comme atteint", icon: Calendar },
  ]

  return (
    <div className="space-y-5">
      <SectionCard title="Notifications email" description="Choisissez quels événements déclenchent un email" icon={Bell}>
        {NOTIF_TYPES.map(({ key, label, description }) => (
          <SettingRow key={key} label={label} description={description}>
            <Toggle checked={form[key] ?? true} onChange={() => setForm(prev => ({ ...prev, [key]: !prev[key] }))} />
          </SettingRow>
        ))}
        <div className="flex justify-end mt-5">
          <SaveButton onClick={handleSave} saving={updatePrefs.isPending} saved={saved} />
        </div>
      </SectionCard>

      <SectionCard title="Notifications in-app" description="Les notifications dans l'application sont toujours actives" icon={Bell}>
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
          <Info size={16} className="text-indigo-400 flex-shrink-0" />
          <p className="text-white/50 text-sm">
            Les notifications in-app (cloche dans l'en-tête) sont toujours activées et ne peuvent pas être désactivées.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── SECTION NOTIFICATIONS PULSE ────────────────────────────

export function PulseNotificationsSection() {
  const { can } = usePermission()
  const isManager = can('evaluations', 'entretiens_team', 'read')
  const { data: settings, isLoading } = useNotificationSettings()
  const updateSettings = useUpdateNotificationSettings()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings])

  const handleToggle = (key) => setForm(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    if (!form) return
    const { id, user_id, created_at, updated_at, ...cleanForm } = form
    await updateSettings.mutateAsync(cleanForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading || !form) return <SettingsSkeleton />

  return (
    <div className="space-y-5">
      <SectionCard title="Mes préférences" description="Choisissez les emails automatiques que vous souhaitez recevoir" icon={Bell}>
        <SettingRow label="Rappel brief matinal" description="Email chaque matin pour vous rappeler de soumettre votre brief">
          <Toggle checked={form.notif_brief_enabled} onChange={() => handleToggle('notif_brief_enabled')} />
        </SettingRow>
        <SettingRow label="Rappel journal du soir" description="Email chaque soir si vous n'avez pas encore soumis votre journal">
          <Toggle checked={form.notif_journal_enabled} onChange={() => handleToggle('notif_journal_enabled')} />
        </SettingRow>
        <SettingRow label="Notification award reçu" description="Email quand votre manager vous attribue un award">
          <Toggle checked={form.notif_award_enabled} onChange={() => handleToggle('notif_award_enabled')} />
        </SettingRow>

        <div className="mt-5 pt-4 border-t border-white/[0.04]">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Horaires de rappel</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Brief matinal</label>
              <input type="time" value={form.brief_reminder_time || '07:30'}
                onChange={(e) => setForm(prev => ({ ...prev, brief_reminder_time: e.target.value }))}
                disabled={!form.notif_brief_enabled}
                className={`w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors ${!form.notif_brief_enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Journal du soir</label>
              <input type="time" value={form.journal_reminder_time || '16:30'}
                onChange={(e) => setForm(prev => ({ ...prev, journal_reminder_time: e.target.value }))}
                disabled={!form.notif_journal_enabled}
                className={`w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors ${!form.notif_journal_enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
          <p className="text-white/25 text-xs mt-2 flex items-center gap-1.5">
            <Info size={11} />
            Ces horaires sont indicatifs — les cron jobs s'exécutent à heures fixes côté serveur.
          </p>
        </div>
      </SectionCard>

      {isManager && (
        <SectionCard title="Préférences manager" description="Paramètres des alertes et résumés d'équipe" icon={Activity}>
          <SettingRow label="Alerte collaborateurs absents" description="Email quand des collaborateurs n'ont pas soumis leur journal depuis X jours">
            <Toggle checked={form.notif_alert_manager_enabled} onChange={() => handleToggle('notif_alert_manager_enabled')} />
          </SettingRow>
          {form.notif_alert_manager_enabled && (
            <div className="ml-0 mt-3 mb-1 pb-4 border-b border-white/[0.04]">
              <label className="block text-white/60 text-xs font-medium mb-2">Seuil d'absence (jours ouvrés)</label>
              <div className="flex items-center gap-3">
                <input type="number" min="1" max="10"
                  value={form.manager_alert_threshold_days || 2}
                  onChange={(e) => setForm(prev => ({ ...prev, manager_alert_threshold_days: parseInt(e.target.value) || 2 }))}
                  className="w-20 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50"
                />
                <span className="text-white/40 text-sm">jours sans journal pour déclencher l'alerte</span>
              </div>
            </div>
          )}
          <SettingRow label="Résumé hebdomadaire équipe" description="Email chaque lundi avec les stats de performance de la semaine précédente">
            <Toggle checked={form.notif_weekly_summary_enabled} onChange={() => handleToggle('notif_weekly_summary_enabled')} />
          </SettingRow>
        </SectionCard>
      )}

      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.12)' }}>
        <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-white/50 text-xs leading-relaxed">
          Les emails sont envoyés via le service <strong className="text-white/70">Resend</strong>.
          Les rappels automatiques s'exécutent à des horaires fixes définis par l'administrateur.
          Désactiver une option ici ne supprime pas les emails déjà planifiés pour la journée en cours.
        </p>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={handleSave} saving={updateSettings.isPending} saved={saved} />
      </div>
    </div>
  )
}
