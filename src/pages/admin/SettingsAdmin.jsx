// ============================================================
// APEX RH — SettingsAdmin.jsx
// S122 — Sections admin : Entreprise, Sécurité plateforme, Audit
// ============================================================
import { useState, useEffect } from 'react'
import {
  Building2, Lock, FileText, Search, Shield, Timer, UserPlus,
  RefreshCw, Check, X, ChevronLeft, ChevronRight, AlertTriangle,
  LogIn, LogOut, Edit2, Trash2, Download, Target, FolderKanban,
  CheckSquare, UserX, UserCheck
} from 'lucide-react'
import {
  useAppSettings,
  useUpdateAppSetting,
  useAuditLogs,
  useUsersList,
} from '../../hooks/useSettings'
import { SectionCard, SettingRow, Toggle, SaveButton, InputField, SelectField, SettingsSkeleton } from './Settings'

const TIMEZONES = [
  { value: 'Africa/Dakar', label: 'Dakar (GMT+0)' },
  { value: 'Africa/Abidjan', label: 'Abidjan (GMT+0)' },
  { value: 'Africa/Lagos', label: 'Lagos (GMT+1)' },
  { value: 'Africa/Douala', label: 'Douala (GMT+1)' },
  { value: 'Africa/Kinshasa', label: 'Kinshasa (GMT+1)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (GMT+3)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
]

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const AUDIT_ACTION_LABELS = {
  login: 'Connexion', logout: 'Déconnexion', login_failed: 'Tentative échouée',
  password_changed: 'Mot de passe modifié', password_reset_requested: 'Réinitialisation demandée',
  user_created: 'Utilisateur créé', user_updated: 'Utilisateur modifié',
  user_deactivated: 'Compte désactivé', user_reactivated: 'Compte réactivé',
  role_changed: 'Rôle modifié', task_created: 'Tâche créée', task_deleted: 'Tâche supprimée',
  objective_created: 'Objectif créé', objective_deleted: 'Objectif supprimé',
  project_created: 'Projet créé', project_deleted: 'Projet supprimé',
  settings_updated: 'Paramètres modifiés', export_data: 'Export de données',
}

const AUDIT_ACTION_ICONS = {
  login: LogIn, logout: LogOut, login_failed: AlertTriangle,
  password_changed: Lock, password_reset_requested: RefreshCw,
  user_created: UserPlus, user_updated: Edit2, user_deactivated: UserX,
  user_reactivated: UserCheck, role_changed: Shield,
  task_created: CheckSquare, task_deleted: Trash2,
  objective_created: Target, objective_deleted: Trash2,
  project_created: FolderKanban, project_deleted: Trash2,
  settings_updated: Lock, export_data: Download,
}

const AUDIT_ACTION_COLORS = {
  login: 'text-green-400 bg-green-500/10',
  logout: 'text-white/40 bg-white/5',
  login_failed: 'text-red-400 bg-red-500/10',
  password_changed: 'text-blue-400 bg-blue-500/10',
  password_reset_requested: 'text-amber-400 bg-amber-500/10',
  user_created: 'text-emerald-400 bg-emerald-500/10',
  user_updated: 'text-blue-400 bg-blue-500/10',
  user_deactivated: 'text-red-400 bg-red-500/10',
  user_reactivated: 'text-emerald-400 bg-emerald-500/10',
  role_changed: 'text-purple-400 bg-purple-500/10',
  settings_updated: 'text-indigo-400 bg-indigo-500/10',
  export_data: 'text-cyan-400 bg-cyan-500/10',
}

// ─── SECTION ENTREPRISE ──────────────────────────────────────

export function CompanySection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings?.company) setForm({ ...settings.company })
  }, [settings])

  const handleSave = async () => {
    if (!form) return
    await updateSetting.mutateAsync({ key: 'company', value: form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading || !form) return <SettingsSkeleton />

  return (
    <div className="space-y-5">
      <SectionCard title="Informations de l'entreprise" description="Identité et paramètres généraux de la société" icon={Building2}>
        <div className="space-y-4">
          <InputField
            label="Nom de l'entreprise"
            value={form.name || ''}
            onChange={(v) => setForm(prev => ({ ...prev, name: v }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Devise"
              value={form.currency || 'FCFA'}
              onChange={(v) => setForm(prev => ({ ...prev, currency: v }))}
            />
            <SelectField
              label="Fuseau horaire"
              value={form.timezone || 'Africa/Dakar'}
              onChange={(v) => setForm(prev => ({ ...prev, timezone: v }))}
              options={TIMEZONES}
            />
          </div>
          <SelectField
            label="Début de l'exercice fiscal"
            value={String(form.fiscal_year_start || 1)}
            onChange={(v) => setForm(prev => ({ ...prev, fiscal_year_start: parseInt(v) }))}
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          />
        </div>
        <div className="flex justify-end mt-5">
          <SaveButton onClick={handleSave} saving={updateSetting.isPending} saved={saved} />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── SECTION SÉCURITÉ PLATEFORME ────────────────────────────

export function PlatformSecuritySection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings?.security) setForm({ ...settings.security })
  }, [settings])

  const handleSave = async () => {
    if (!form) return
    await updateSetting.mutateAsync({ key: 'security', value: form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading || !form) return <SettingsSkeleton />

  return (
    <div className="space-y-5">
      <SectionCard title="Politique de mots de passe" description="Exigences minimales pour tous les utilisateurs" icon={Lock}>
        <div className="mb-4">
          <SelectField
            label="Longueur minimale"
            value={String(form.min_password_length || 8)}
            onChange={(v) => setForm(prev => ({ ...prev, min_password_length: parseInt(v) }))}
            options={[
              { value: '6', label: '6 caractères' },
              { value: '8', label: '8 caractères (recommandé)' },
              { value: '10', label: '10 caractères' },
              { value: '12', label: '12 caractères (fort)' },
            ]}
          />
        </div>
        {[
          { key: 'require_uppercase', label: 'Exiger une majuscule', desc: 'Au moins une lettre majuscule (A-Z)' },
          { key: 'require_lowercase', label: 'Exiger une minuscule', desc: 'Au moins une lettre minuscule (a-z)' },
          { key: 'require_number', label: 'Exiger un chiffre', desc: 'Au moins un chiffre (0-9)' },
          { key: 'require_special_char', label: 'Exiger un caractère spécial', desc: 'Au moins un symbole (!@#$%...)' },
        ].map(({ key, label, desc }) => (
          <SettingRow key={key} label={label} description={desc}>
            <Toggle checked={form[key]} onChange={(v) => setForm(prev => ({ ...prev, [key]: v }))} />
          </SettingRow>
        ))}
      </SectionCard>

      <SectionCard title="Sessions" description="Durée et comportement des sessions utilisateur" icon={Timer}>
        <SelectField
          label="Expiration automatique des sessions"
          value={String(form.session_timeout_hours || 24)}
          onChange={(v) => setForm(prev => ({ ...prev, session_timeout_hours: parseInt(v) }))}
          options={[
            { value: '1', label: '1 heure' },
            { value: '8', label: '8 heures (journée de travail)' },
            { value: '24', label: '24 heures (recommandé)' },
            { value: '72', label: '3 jours' },
            { value: '168', label: '7 jours' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Première connexion" description="Comportement lors du premier accès d'un nouvel utilisateur" icon={UserPlus}>
        <SettingRow
          label="Forcer le changement de mot de passe"
          description="Oblige les nouveaux utilisateurs à changer leur mot de passe dès la première connexion"
        >
          <Toggle
            checked={form.force_change_on_first_login}
            onChange={(v) => setForm(prev => ({ ...prev, force_change_on_first_login: v }))}
          />
        </SettingRow>
        <div className="flex justify-end mt-5">
          <SaveButton onClick={handleSave} saving={updateSetting.isPending} saved={saved} />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── SECTION JOURNAUX D'AUDIT ────────────────────────────────

export function AuditLogsSection() {
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState(null)
  const [userFilter, setUserFilter] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const pageSize = 15

  const { data, isLoading } = useAuditLogs({
    page, pageSize, actionFilter, userFilter,
    dateFrom: dateFrom || null, dateTo: dateTo || null,
  })
  const { data: usersList = [] } = useUsersList()
  const totalPages = Math.ceil((data?.total || 0) / pageSize)

  const formatDate = (d) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const resetFilters = () => { setActionFilter(null); setUserFilter(null); setDateFrom(''); setDateTo(''); setPage(0) }

  return (
    <div className="space-y-5">
      <SectionCard title="Filtres" description="Affinez les résultats du journal" icon={Search}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <SelectField
            label="Action"
            value={actionFilter || ''}
            onChange={(v) => { setActionFilter(v || null); setPage(0) }}
            options={[
              { value: '', label: 'Toutes les actions' },
              ...Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => ({ value: k, label: v })),
            ]}
          />
          <SelectField
            label="Utilisateur"
            value={userFilter || ''}
            onChange={(v) => { setUserFilter(v || null); setPage(0) }}
            options={[
              { value: '', label: 'Tous les utilisateurs' },
              ...usersList.map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
            ]}
          />
          <div>
            <label className="block text-white/60 text-xs font-medium mb-1.5">Du</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
          </div>
          <div>
            <label className="block text-white/60 text-xs font-medium mb-1.5">Au</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
          </div>
        </div>
        {(actionFilter || userFilter || dateFrom || dateTo) && (
          <button onClick={resetFilters} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
            <X size={12} /> Réinitialiser les filtres
          </button>
        )}
      </SectionCard>

      <SectionCard title={`Historique des actions ${data?.total ? `(${data.total})` : ''}`} description="Toutes les actions sensibles sont tracées" icon={FileText}>
        {isLoading ? <SettingsSkeleton /> : data?.logs?.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Aucune entrée dans le journal</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {data?.logs?.map((log) => {
                const ActionIcon = AUDIT_ACTION_ICONS[log.action] || FileText
                const colorClass = AUDIT_ACTION_COLORS[log.action] || 'text-white/40 bg-white/5'
                return (
                  <div key={log.id} className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                      <ActionIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 text-sm font-medium truncate">
                          {AUDIT_ACTION_LABELS[log.action] || log.action}
                        </p>
                        {log.entity_type && <span className="text-white/20 text-xs">{log.entity_type}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-white/40 text-xs">
                          {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Système'}
                        </p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="text-white/20 text-xs truncate max-w-[200px]">
                            — {JSON.stringify(log.details).slice(0, 60)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-white/25 text-xs flex-shrink-0">{formatDate(log.created_at)}</p>
                  </div>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.04]">
                <p className="text-white/30 text-xs">Page {page + 1} sur {totalPages} — {data.total} entrées</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                    className="p-2 rounded-lg bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  )
}
