// ============================================================
// APEX RH — Settings.jsx
// Session 14 — Page Paramètres complète (8 sections)
// ✅ Session 24 — Section PULSE (toggle + horaires + pondérations) Phase F
// Accessible à tous (4 sections) + Admin (4 sections supplémentaires)
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, User, Shield, Bell, Palette, Building2, Blocks, Lock,
  FileText, Save, Check, X, Eye, EyeOff, ChevronRight, Clock, Activity,
  Calendar, RefreshCw, AlertTriangle, Search, ChevronLeft, ChevronDown,
  LogIn, LogOut, UserPlus, UserX, UserCheck, Edit2, Trash2, Download,
  Target, FolderKanban, CheckSquare, Info, Globe, Coins, Timer, MessageSquare,
  BarChart2, BrainCircuit, Zap, ClipboardList, TrendingUp, Plug
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '../../hooks/useNotificationSettings'
import { useTheme } from '../../contexts/ThemeContext'
import {
  useAppSettings,
  useUpdateAppSetting,
  useUserProfile,
  useUpdateUserProfile,
  useAuditLogs,
  useLogAudit,
  useUsersList,
} from '../../hooks/useSettings'
import { logAudit } from '../../lib/auditLog'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../hooks/useNotifications'
import IntegrationsPage from './Integrations'
import NotificationRulesAdmin from '../../components/NotificationRulesAdmin' // FIX S88 — S86

// ─── CONSTANTES ──────────────────────────────────────────────
const ROLE_LABELS = {
  administrateur: 'Administrateur',
  directeur: 'Directeur',
  chef_division: 'Chef de Division',
  chef_service: 'Chef de Service',
  collaborateur: 'Collaborateur',
}

const ROLE_COLORS = {
  administrateur: 'bg-red-500/15 text-red-400 border-red-500/30',
  directeur: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  chef_division: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  chef_service: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  collaborateur: 'bg-green-500/15 text-green-400 border-green-500/30',
}

const AUDIT_ACTION_LABELS = {
  login: 'Connexion',
  logout: 'Déconnexion',
  login_failed: 'Tentative échouée',
  password_changed: 'Mot de passe modifié',
  password_reset_requested: 'Réinitialisation demandée',
  user_created: 'Utilisateur créé',
  user_updated: 'Utilisateur modifié',
  user_deactivated: 'Compte désactivé',
  user_reactivated: 'Compte réactivé',
  role_changed: 'Rôle modifié',
  task_created: 'Tâche créée',
  task_deleted: 'Tâche supprimée',
  objective_created: 'Objectif créé',
  objective_deleted: 'Objectif supprimé',
  project_created: 'Projet créé',
  project_deleted: 'Projet supprimé',
  settings_updated: 'Paramètres modifiés',
  export_data: 'Export de données',
}

const AUDIT_ACTION_ICONS = {
  login: LogIn,
  logout: LogOut,
  login_failed: AlertTriangle,
  password_changed: Lock,
  password_reset_requested: RefreshCw,
  user_created: UserPlus,
  user_updated: Edit2,
  user_deactivated: UserX,
  user_reactivated: UserCheck,
  role_changed: Shield,
  task_created: CheckSquare,
  task_deleted: Trash2,
  objective_created: Target,
  objective_deleted: Trash2,
  project_created: FolderKanban,
  project_deleted: Trash2,
  settings_updated: Settings,
  export_data: Download,
}

const AUDIT_ACTION_COLORS = {
  login: 'text-green-400 bg-green-500/10',
  logout: 'text-slate-400 bg-slate-500/10',
  login_failed: 'text-red-400 bg-red-500/10',
  password_changed: 'text-amber-400 bg-amber-500/10',
  password_reset_requested: 'text-amber-400 bg-amber-500/10',
  user_created: 'text-emerald-400 bg-emerald-500/10',
  user_updated: 'text-blue-400 bg-blue-500/10',
  user_deactivated: 'text-red-400 bg-red-500/10',
  user_reactivated: 'text-green-400 bg-green-500/10',
  role_changed: 'text-purple-400 bg-purple-500/10',
  task_created: 'text-indigo-400 bg-indigo-500/10',
  task_deleted: 'text-red-400 bg-red-500/10',
  objective_created: 'text-amber-400 bg-amber-500/10',
  objective_deleted: 'text-red-400 bg-red-500/10',
  project_created: 'text-cyan-400 bg-cyan-500/10',
  project_deleted: 'text-red-400 bg-red-500/10',
  settings_updated: 'text-indigo-400 bg-indigo-500/10',
  export_data: 'text-teal-400 bg-teal-500/10',
}

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

// ─── COMPOSANTS UI RÉUTILISABLES ─────────────────────────────

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6"
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-white font-semibold text-base">{title}</h3>
          {description && <p className="text-white/40 text-sm mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0">
      <div className="flex-1 mr-4">
        <p className="text-white/90 text-sm font-medium">{label}</p>
        {description && <p className="text-white/35 text-xs mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-indigo-500' : 'bg-white/10'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

function SaveButton({ onClick, saving, saved, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || saving}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        saved
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-indigo-500 hover:bg-indigo-400 text-white'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {saving ? (
        <RefreshCw size={15} className="animate-spin" />
      ) : saved ? (
        <Check size={15} />
      ) : (
        <Save size={15} />
      )}
      {saving ? 'Enregistrement...' : saved ? 'Enregistré' : 'Enregistrer'}
    </button>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder, disabled = false, readOnly = false }) {
  return (
    <div>
      {label && <label className="block text-white/60 text-xs font-medium mb-1.5">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-colors ${
          (disabled || readOnly) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, disabled = false }) {
  return (
    <div>
      {label && <label className="block text-white/60 text-xs font-medium mb-1.5">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='rgba(255,255,255,0.4)' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a1a3e] text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── SECTION 1 : MON PROFIL ─────────────────────────────────

function ProfileSection() {
  const { data: userProfile, isLoading } = useUserProfile()
  const updateProfile = useUpdateUserProfile()
  const [form, setForm] = useState({ first_name: '', last_name: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (userProfile) {
      setForm({ first_name: userProfile.first_name, last_name: userProfile.last_name })
    }
  }, [userProfile])

  const handleSave = async () => {
    await updateProfile.mutateAsync({ first_name: form.first_name, last_name: form.last_name })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <SettingsSkeleton />

  const initials = `${userProfile?.first_name?.[0] || ''}${userProfile?.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="space-y-5">
      <SectionCard title="Informations personnelles" description="Vos informations visibles sur la plateforme" icon={User}>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/[0.04]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
            {initials}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{userProfile?.first_name} {userProfile?.last_name}</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium mt-1 ${ROLE_COLORS[userProfile?.role] || ''}`}>
              <Shield size={10} />
              {ROLE_LABELS[userProfile?.role] || userProfile?.role}
            </span>
          </div>
        </div>

        {/* Formulaire */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <InputField
            label="Prénom"
            value={form.first_name}
            onChange={(v) => setForm(prev => ({ ...prev, first_name: v }))}
          />
          <InputField
            label="Nom"
            value={form.last_name}
            onChange={(v) => setForm(prev => ({ ...prev, last_name: v }))}
          />
        </div>

        <InputField label="Email" value={userProfile?.email || ''} onChange={() => {}} readOnly />

        <div className="flex justify-end mt-5">
          <SaveButton
            onClick={handleSave}
            saving={updateProfile.isPending}
            saved={saved}
            disabled={form.first_name === userProfile?.first_name && form.last_name === userProfile?.last_name}
          />
        </div>
      </SectionCard>

      <SectionCard title="Rattachement organisationnel" description="Votre position dans la hiérarchie NITA" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.04]">
            <p className="text-white/40 text-xs font-medium mb-1">Direction</p>
            <p className="text-white text-sm font-medium">{userProfile?.directions?.name || '—'}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.04]">
            <p className="text-white/40 text-xs font-medium mb-1">Division</p>
            <p className="text-white text-sm font-medium">{userProfile?.divisions?.name || '—'}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.04]">
            <p className="text-white/40 text-xs font-medium mb-1">Service</p>
            <p className="text-white text-sm font-medium">{userProfile?.services?.name || '—'}</p>
          </div>
        </div>
        <p className="text-white/30 text-xs mt-3 flex items-center gap-1.5">
          <Info size={12} />
          Contactez votre administrateur pour modifier votre rattachement.
        </p>
      </SectionCard>

      <SectionCard title="Informations du compte" description="Dates et statut de votre compte" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.04]">
            <p className="text-white/40 text-xs font-medium mb-1">Compte créé le</p>
            <p className="text-white text-sm font-medium">
              {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.04]">
            <p className="text-white/40 text-xs font-medium mb-1">Statut du compte</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${userProfile?.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <p className="text-white text-sm font-medium">{userProfile?.is_active ? 'Actif' : 'Désactivé'}</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── SECTION 2 : SÉCURITÉ ───────────────────────────────────

function SecuritySection() {
  const { updatePassword } = useAuth()
  const [form, setForm] = useState({ current: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const criteria = [
    { label: 'Au moins 8 caractères', met: form.password.length >= 8 },
    { label: 'Une majuscule', met: /[A-Z]/.test(form.password) },
    { label: 'Une minuscule', met: /[a-z]/.test(form.password) },
    { label: 'Un chiffre', met: /\d/.test(form.password) },
  ]

  const allCriteriaMet = criteria.every((c) => c.met)
  const passwordsMatch = form.password === form.confirm && form.confirm.length > 0

  const handleSave = async () => {
    setError('')
    setSaving(true)
    const { error: err } = await updatePassword(form.password)
    setSaving(false)

    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      setForm({ current: '', password: '', confirm: '' })
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Changer mon mot de passe" description="Mettez à jour votre mot de passe de connexion" icon={Lock}>
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
            <Check size={16} />
            Mot de passe modifié avec succès !
          </div>
        )}

        <div className="space-y-4 mb-5">
          <div className="relative">
            <InputField
              label="Nouveau mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(v) => setForm(prev => ({ ...prev, password: v }))}
              placeholder="Saisir le nouveau mot de passe"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <InputField
            label="Confirmer le mot de passe"
            type={showPassword ? 'text' : 'password'}
            value={form.confirm}
            onChange={(v) => setForm(prev => ({ ...prev, confirm: v }))}
            placeholder="Confirmer le nouveau mot de passe"
          />
        </div>

        {/* Critères */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {criteria.map((c) => (
            <div key={c.label} className={`flex items-center gap-2 text-xs ${c.met ? 'text-emerald-400' : 'text-white/30'}`}>
              {c.met ? <Check size={12} /> : <X size={12} />}
              {c.label}
            </div>
          ))}
        </div>

        {form.confirm && !passwordsMatch && (
          <p className="text-red-400 text-xs mb-4">Les mots de passe ne correspondent pas.</p>
        )}

        <div className="flex justify-end">
          <SaveButton
            onClick={handleSave}
            saving={saving}
            saved={saved}
            disabled={!allCriteriaMet || !passwordsMatch}
          />
        </div>
      </SectionCard>

      <SectionCard title="Session active" description="Informations sur votre session en cours" icon={Clock}>
        <SettingRow label="Navigateur" description="Votre session est active tant que l'onglet est ouvert">
          <span className="flex items-center gap-2 text-sm text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Connecté
          </span>
        </SettingRow>
        <SettingRow label="Se souvenir de moi" description="Configuré lors de votre dernière connexion">
          <span className="text-sm text-white/50">
            {localStorage.getItem('apex_forget_session') ? 'Non' : 'Oui'}
          </span>
        </SettingRow>
      </SectionCard>
    </div>
  )
}

// ─── SECTION 3 : NOTIFICATIONS ──────────────────────────────

function NotificationsSection() {
  const { data: prefs, isLoading } = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (prefs) {
      setForm({ ...prefs })
    } else if (!isLoading) {
      setForm({
        email_task_assigned: true,
        email_task_overdue: true,
        email_task_completed: false,
        email_task_comment: true,
        email_objective_evaluation: true,
        email_project_member: true,
        email_project_milestone: true,
      })
    }
  }, [prefs, isLoading])

  const handleToggle = (key) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    if (!form) return
    const { id, user_id, updated_at, ...cleanPrefs } = form
    await updatePrefs.mutateAsync(cleanPrefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <SettingsSkeleton />
  if (!form) return <SettingsSkeleton />

  const NOTIF_TYPES = [
    { key: 'email_task_assigned', label: 'Tâche assignée', description: 'Quand une tâche vous est assignée', icon: CheckSquare },
    { key: 'email_task_overdue', label: 'Tâche en retard', description: 'Quand une tâche dépasse sa date limite', icon: AlertTriangle },
    { key: 'email_task_completed', label: 'Tâche terminée', description: 'Quand une tâche assignée est marquée terminée', icon: Check },
    { key: 'email_task_comment', label: 'Commentaire', description: 'Quand quelqu\'un commente une tâche', icon: FileText },
    { key: 'email_objective_evaluation', label: 'Évaluation OKR', description: 'Changement de statut d\'évaluation d\'un objectif', icon: Target },
    { key: 'email_project_member', label: 'Ajout au projet', description: 'Quand vous êtes ajouté comme membre d\'un projet', icon: FolderKanban },
    { key: 'email_project_milestone', label: 'Jalon atteint', description: 'Quand un jalon de projet est marqué comme atteint', icon: Calendar },
  ]

  return (
    <div className="space-y-5">
      <SectionCard title="Notifications email" description="Choisissez quels événements déclenchent un email" icon={Bell}>
        {NOTIF_TYPES.map(({ key, label, description, icon: ItemIcon }) => (
          <SettingRow key={key} label={label} description={description}>
            <Toggle checked={form[key] ?? true} onChange={() => handleToggle(key)} />
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

// ─── SECTION 4 : APPARENCE ──────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [density, setDensity] = useState('comfortable')
  const [language, setLanguage] = useState('fr')

  return (
    <div className="space-y-5">
      <SectionCard title="Thème" description="Personnalisez l'apparence de l'interface" icon={Palette}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Sombre', colors: 'from-[#0F0F23] to-[#1a1a3e]' },
            { id: 'light', label: 'Clair', colors: 'from-slate-100 to-white' },
            { id: 'auto', label: 'Système', colors: 'from-[#0F0F23] via-slate-300 to-white' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                theme === t.id
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-white/[0.06] hover:border-white/10'
              }`}
            >
              <div className={`w-full h-12 rounded-lg bg-gradient-to-br ${t.colors} mb-3 border border-white/10`} />
              <p className="text-white/80 text-sm font-medium">{t.label}</p>
              {theme === t.id && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-white/30 text-xs mt-3 flex items-center gap-1.5">
          <Info size={12} />
          {theme === 'auto' ? 'Le thème s\'adapte automatiquement aux préférences de votre système.' : 
           theme === 'light' ? 'Mode clair activé.' : 'Mode sombre activé.'}
        </p>
      </SectionCard>

      <SectionCard title="Densité d'affichage" description="Ajustez l'espacement des éléments" icon={Blocks}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'comfortable', label: 'Confortable', desc: 'Espacement large, lisibilité optimale' },
            { id: 'compact', label: 'Compact', desc: 'Plus d\'informations visibles à l\'écran' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDensity(d.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                density === d.id
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-white/[0.06] hover:border-white/10'
              }`}
            >
              <p className="text-white/90 text-sm font-medium">{d.label}</p>
              <p className="text-white/35 text-xs mt-1">{d.desc}</p>
            </button>
          ))}
        </div>
        <p className="text-white/30 text-xs mt-3 flex items-center gap-1.5">
          <Info size={12} />
          La densité sera appliquée dans une mise à jour future.
        </p>
      </SectionCard>

      <SectionCard title="Langue" description="Langue de l'interface" icon={Globe}>
        <SettingRow label="Français" description="Seule langue disponible actuellement">
          <span className="flex items-center gap-2 text-sm text-indigo-400">
            <Check size={14} />
            Activée
          </span>
        </SettingRow>
      </SectionCard>
    </div>
  )
}

// ─── SECTION 5 : ENTREPRISE (Admin) ─────────────────────────

function CompanySection() {
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

// ─── SECTION 6 : MODULES & CYCLES (Admin) ───────────────────

function ModulesSection() {
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

  const WORKFLOW_STEPS = [
    { id: 'auto_evaluation', label: 'Auto-évaluation', desc: 'Le collaborateur évalue ses propres objectifs' },
    { id: 'validation_n1', label: 'Validation N+1', desc: 'Le manager valide l\'évaluation' },
    { id: 'calibration_rh', label: 'Calibration RH', desc: 'L\'administrateur calibre les scores finaux' },
  ]

  return (
    <div className="space-y-5">
      <SectionCard title="Modules actifs" description="Activez ou désactivez les modules de la plateforme" icon={Blocks}>
        <SettingRow label="Gestion des Tâches" description="Kanban, listes, calendrier, Ma Journée">
          <Toggle checked={form.tasks_enabled} onChange={(v) => setForm(prev => ({ ...prev, tasks_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Objectifs OKR" description="Cascade 4 niveaux, évaluation, key results">
          <Toggle checked={form.okr_enabled} onChange={(v) => setForm(prev => ({ ...prev, okr_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Gestion des Projets" description="Gantt, jalons, livrables, risques, équipe">
          <Toggle checked={form.projects_enabled} onChange={(v) => setForm(prev => ({ ...prev, projects_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Feedback 360°" description="Évaluations structurées : auto-évaluation, pairs, manager">
          <Toggle checked={form.feedback360_enabled ?? false} onChange={(v) => setForm(prev => ({ ...prev, feedback360_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Surveys d'Engagement" description="Questionnaires anonymes périodiques — score et tendance d'engagement équipe">
          <Toggle checked={form.surveys_engagement_enabled ?? false} onChange={(v) => setForm(prev => ({ ...prev, surveys_engagement_enabled: v }))} />
        </SettingRow>
        <SettingRow label="IA Coach" description="Analyse IA des journaux PULSE — suggestions personnalisées et résumé équipe (API Anthropic)">
          <Toggle checked={form.ia_coach_enabled ?? false} onChange={(v) => setForm(prev => ({ ...prev, ia_coach_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Gamification Avancée" description="Streaks, badges Bronze/Argent/Or, points rewards et classement inter-équipes">
          <Toggle checked={form.gamification_enabled ?? false} onChange={(v) => setForm(prev => ({ ...prev, gamification_enabled: v }))} />        </SettingRow>
        <SettingRow label="Review Cycles Formels" description="Évaluations trimestrielles, semestrielles et annuelles avec synthèse PULSE + Feedback 360° + OKRs">
          <Toggle checked={form.review_cycles_enabled ?? false} onChange={(v) => setForm(prev => ({ ...prev, review_cycles_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Analytics Avancés & Prédictif" description="Heatmap équipe, corrélation PULSE/OKR, comparatif services et score de risque de départ — réservé managers">
          <Toggle checked={form.analytics_enabled ?? false} onChange={(v) => setForm(prev => ({ ...prev, analytics_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Intégrations Tierces" description="Webhooks Slack, Teams, Zapier + export Google Calendar — réservé administrateurs">
          <Toggle checked={form.integrations_enabled ?? false} onChange={(v) => setForm(prev => ({ ...prev, integrations_enabled: v }))} />
        </SettingRow>

        {/* ─── Modules S57-S60 (Étape 18) ─── */}
        <SettingRow label="Formation & Certifications" description="Catalogue de formations, inscriptions, certifications, suivi d'équipe">
          <Toggle checked={form.formation_enabled ?? true} onChange={(v) => setForm(prev => ({ ...prev, formation_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Compensation & Benchmark" description="Rémunération individuelle, benchmark marché, masse salariale équipe">
          <Toggle checked={form.compensation_enabled ?? true} onChange={(v) => setForm(prev => ({ ...prev, compensation_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Recrutement" description="Pipeline candidats, offres, entretiens, IA matching et parser CV">
          <Toggle checked={form.recrutement_enabled ?? true} onChange={(v) => setForm(prev => ({ ...prev, recrutement_enabled: v }))} />
        </SettingRow>
        <SettingRow label="Entretiens Annuels" description="Campagnes d'évaluation, auto-évaluation collaborateur, calibration RH">
          <Toggle checked={form.entretiens_enabled ?? true} onChange={(v) => setForm(prev => ({ ...prev, entretiens_enabled: v }))} />
        </SettingRow>
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
              <div
                key={step.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  isActive ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/[0.02] border-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/30'
                  }`}>
                    {idx + 1}
                  </span>
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
                      evaluation_workflow: v
                        ? [...wf, step.id]
                        : wf.filter((s) => s !== step.id),
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

// ─── SECTION 7 : SÉCURITÉ PLATEFORME (Admin) ────────────────

function PlatformSecuritySection() {
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

        <SettingRow label="Exiger une majuscule" description="Au moins une lettre majuscule (A-Z)">
          <Toggle checked={form.require_uppercase} onChange={(v) => setForm(prev => ({ ...prev, require_uppercase: v }))} />
        </SettingRow>
        <SettingRow label="Exiger une minuscule" description="Au moins une lettre minuscule (a-z)">
          <Toggle checked={form.require_lowercase} onChange={(v) => setForm(prev => ({ ...prev, require_lowercase: v }))} />
        </SettingRow>
        <SettingRow label="Exiger un chiffre" description="Au moins un chiffre (0-9)">
          <Toggle checked={form.require_number} onChange={(v) => setForm(prev => ({ ...prev, require_number: v }))} />
        </SettingRow>
        <SettingRow label="Exiger un caractère spécial" description="Au moins un symbole (!@#$%...)">
          <Toggle checked={form.require_special_char} onChange={(v) => setForm(prev => ({ ...prev, require_special_char: v }))} />
        </SettingRow>
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

// ─── SECTION 8 : JOURNAUX D'AUDIT (Admin) ───────────────────

function AuditLogsSection() {
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState(null)
  const [userFilter, setUserFilter] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const pageSize = 15

  const { data, isLoading } = useAuditLogs({
    page,
    pageSize,
    actionFilter,
    userFilter,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  })

  const { data: usersList = [] } = useUsersList()

  const totalPages = Math.ceil((data?.total || 0) / pageSize)

  const formatDate = (d) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs font-medium mb-1.5">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
        </div>

        {(actionFilter || userFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setActionFilter(null); setUserFilter(null); setDateFrom(''); setDateTo(''); setPage(0) }}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <X size={12} />
            Réinitialiser les filtres
          </button>
        )}
      </SectionCard>

      <SectionCard title={`Historique des actions ${data?.total ? `(${data.total})` : ''}`} description="Toutes les actions sensibles sont tracées" icon={FileText}>
        {isLoading ? (
          <SettingsSkeleton />
        ) : data?.logs?.length === 0 ? (
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
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0"
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                      <ActionIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 text-sm font-medium truncate">
                          {AUDIT_ACTION_LABELS[log.action] || log.action}
                        </p>
                        {log.entity_type && (
                          <span className="text-white/20 text-xs">
                            {log.entity_type}
                          </span>
                        )}
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
                  </motion.div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.04]">
                <p className="text-white/30 text-xs">
                  Page {page + 1} sur {totalPages} — {data.total} entrées
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
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

// ─── SKELETON ────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 bg-white/[0.03] rounded-lg" />
      ))}
    </div>
  )
}

// ─── NAVIGATION TABS ─────────────────────────────────────────

// ─── SECTION PULSE (Admin) ────────────────────────────────────

function TimeInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-white/40">{label}</label>
      <input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 w-32"
      />
    </div>
  )
}

function WeightInput({ label, value, onChange, color }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: `${color}80` }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 w-20"
        />
        <span className="text-xs text-white/30">%</span>
      </div>
    </div>
  )
}

function PulseSettingsSection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()

  const [horaires, setHoraires] = useState(null)
  const [weights, setWeights]   = useState(null)
  const [savedH, setSavedH]     = useState(false)
  const [savedW, setSavedW]     = useState(false)

  useEffect(() => {
    if (!settings) return
    setHoraires({
      pulse_brief_start:       settings.pulse_brief_start       || '07:00',
      pulse_brief_deadline:    settings.pulse_brief_deadline    || '10:00',
      pulse_journal_start:     settings.pulse_journal_start     || '16:00',
      pulse_journal_deadline:  settings.pulse_journal_deadline  || '18:30',
    })
    const raw = settings.pulse_score_weights || {}
    setWeights({
      delivery:   Number(raw.delivery   ?? 40),
      quality:    Number(raw.quality    ?? 30),
      regularity: Number(raw.regularity ?? 20),
      bonus:      Number(raw.bonus      ?? 10),
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
      {/* Fenêtres horaires */}
      <SectionCard
        title="Fenêtres horaires PULSE"
        description="Créneaux d'ouverture du brief matinal et du journal du soir"
        icon={Clock}
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Brief matinal</p>
            <div className="flex items-center gap-6 flex-wrap">
              <TimeInput
                label="Ouverture"
                value={horaires.pulse_brief_start}
                onChange={(v) => setHoraires(prev => ({ ...prev, pulse_brief_start: v }))}
              />
              <div className="text-white/20 text-sm mt-4">→</div>
              <TimeInput
                label="Limite"
                value={horaires.pulse_brief_deadline}
                onChange={(v) => setHoraires(prev => ({ ...prev, pulse_brief_deadline: v }))}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Journal du soir</p>
            <div className="flex items-center gap-6 flex-wrap">
              <TimeInput
                label="Ouverture"
                value={horaires.pulse_journal_start}
                onChange={(v) => setHoraires(prev => ({ ...prev, pulse_journal_start: v }))}
              />
              <div className="text-white/20 text-sm mt-4">→</div>
              <TimeInput
                label="Limite"
                value={horaires.pulse_journal_deadline}
                onChange={(v) => setHoraires(prev => ({ ...prev, pulse_journal_deadline: v }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <SaveButton onClick={handleSaveHoraires} saving={updateSetting.isPending} saved={savedH} />
          </div>
        </div>
      </SectionCard>

      {/* Pondérations */}
      <SectionCard
        title="Pondérations du score"
        description="Les 4 dimensions du score PULSE. La somme doit être égale à 100%."
        icon={Timer}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <WeightInput label="Delivery" value={weights.delivery} onChange={(v) => setWeights(p => ({ ...p, delivery: v }))} color="#3B82F6" />
            <WeightInput label="Quality" value={weights.quality} onChange={(v) => setWeights(p => ({ ...p, quality: v }))} color="#8B5CF6" />
            <WeightInput label="Régularité" value={weights.regularity} onChange={(v) => setWeights(p => ({ ...p, regularity: v }))} color="#10B981" />
            <WeightInput label="Bonus OKR" value={weights.bonus} onChange={(v) => setWeights(p => ({ ...p, bonus: v }))} color="#C9A227" />
          </div>

          {/* Barre visuelle */}
          <div className="h-2 rounded-full overflow-hidden flex">
            {[
              { v: weights.delivery,   c: '#3B82F6' },
              { v: weights.quality,    c: '#8B5CF6' },
              { v: weights.regularity, c: '#10B981' },
              { v: weights.bonus,      c: '#C9A227' },
            ].map((d, i) => (
              <div key={i} style={{ width: `${d.v}%`, background: d.c }} className="transition-all duration-300" />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${weightValid ? 'text-emerald-400' : 'text-red-400'}`}>
              Total : {totalWeight}% {!weightValid && '— doit être 100%'}
            </p>
            <SaveButton
              onClick={handleSaveWeights}
              saving={updateSetting.isPending}
              saved={savedW}
              disabled={!weightValid}
            />
          </div>
        </div>
      </SectionCard>

      {/* Info */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.12)' }}
      >
        <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/40 leading-relaxed">
          Les modifications de pondérations s'appliquent aux prochains calculs de score.
          Les scores déjà calculés ne sont pas recalculés automatiquement.
        </p>
      </div>
    </div>
  )
}

// ─── SECTION : NOTIFICATIONS PULSE ──────────────────────────

// S69 — MANAGER_ROLES remplacé par canManageTeam

function PulseNotificationsSection() {
  const { profile } = useAuth()
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

      {/* Section "Mes préférences" — tous les utilisateurs */}
      <SectionCard
        title="Mes préférences"
        description="Choisissez les emails automatiques que vous souhaitez recevoir"
        icon={Bell}
      >
        <SettingRow
          label="Rappel brief matinal"
          description="Email chaque matin pour vous rappeler de soumettre votre brief"
        >
          <Toggle checked={form.notif_brief_enabled} onChange={() => handleToggle('notif_brief_enabled')} />
        </SettingRow>

        <SettingRow
          label="Rappel journal du soir"
          description="Email chaque soir si vous n'avez pas encore soumis votre journal"
        >
          <Toggle checked={form.notif_journal_enabled} onChange={() => handleToggle('notif_journal_enabled')} />
        </SettingRow>

        <SettingRow
          label="Notification award reçu"
          description="Email quand votre manager vous attribue un award"
        >
          <Toggle checked={form.notif_award_enabled} onChange={() => handleToggle('notif_award_enabled')} />
        </SettingRow>

        {/* Horaires personnalisés */}
        <div className="mt-5 pt-4 border-t border-white/[0.04]">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
            Horaires de rappel
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Brief matinal</label>
              <input
                type="time"
                value={form.brief_reminder_time || '07:30'}
                onChange={(e) => setForm(prev => ({ ...prev, brief_reminder_time: e.target.value }))}
                disabled={!form.notif_brief_enabled}
                className={`w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors ${!form.notif_brief_enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Journal du soir</label>
              <input
                type="time"
                value={form.journal_reminder_time || '16:30'}
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

      {/* Section manager — visible uniquement pour les managers */}
      {isManager && (
        <SectionCard
          title="Préférences manager"
          description="Paramètres des alertes et résumés d'équipe"
          icon={Activity}
        >
          <SettingRow
            label="Alerte collaborateurs absents"
            description="Email quand des collaborateurs n'ont pas soumis leur journal depuis X jours"
          >
            <Toggle
              checked={form.notif_alert_manager_enabled}
              onChange={() => handleToggle('notif_alert_manager_enabled')}
            />
          </SettingRow>

          {form.notif_alert_manager_enabled && (
            <div className="ml-0 mt-3 mb-1 pb-4 border-b border-white/[0.04]">
              <label className="block text-white/60 text-xs font-medium mb-2">
                Seuil d'absence (jours ouvrés)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.manager_alert_threshold_days || 2}
                  onChange={(e) => setForm(prev => ({ ...prev, manager_alert_threshold_days: parseInt(e.target.value) || 2 }))}
                  className="w-20 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/50"
                />
                <span className="text-white/40 text-sm">jours sans journal pour déclencher l'alerte</span>
              </div>
            </div>
          )}

          <SettingRow
            label="Résumé hebdomadaire équipe"
            description="Email chaque lundi avec les stats de performance de la semaine précédente"
          >
            <Toggle
              checked={form.notif_weekly_summary_enabled}
              onChange={() => handleToggle('notif_weekly_summary_enabled')}
            />
          </SettingRow>
        </SectionCard>
      )}

      {/* Info sur l'architecture */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.12)' }}
      >
        <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white/50 text-xs leading-relaxed">
            Les emails sont envoyés via le service <strong className="text-white/70">Resend</strong>.
            Les rappels automatiques s'exécutent à des horaires fixes définis par l'administrateur.
            Désactiver une option ici ne supprime pas les emails déjà planifiés pour la journée en cours.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={handleSave} saving={updateSettings.isPending} saved={saved} />
      </div>
    </div>
  )
}

// ─── SECTION GAMIFICATION (Admin) ───────────────────────────

const GAMIF_BADGES = [
  { icon: '🌱', label: 'Premier Journal', tier: 'Bronze', pts: 20 },
  { icon: '🔥', label: '3 Jours de Suite', tier: 'Bronze', pts: 30 },
  { icon: '⚡', label: 'Flamme de la Semaine', tier: 'Argent', pts: 100 },
  { icon: '💫', label: 'Sprint du Mois', tier: 'Or', pts: 500 },
  { icon: '🏅', label: 'Performer (score ≥ 60)', tier: 'Bronze', pts: 50 },
  { icon: '⭐', label: 'Haute Performance (≥ 75)', tier: 'Argent', pts: 150 },
  { icon: '🏆', label: 'Excellence (≥ 85)', tier: 'Or', pts: 400 },
  { icon: '🎯', label: 'Semaine Parfaite', tier: 'Argent', pts: 120 },
  { icon: '👑', label: 'Meilleur de l\'Équipe', tier: 'Or', pts: 200 },
]

const TIER_COLORS = { Bronze: '#CD7F32', Argent: '#C0C0C0', Or: '#C9A227' }

function GamificationSettingsSection() {
  return (
    <SectionCard
      title="Configuration Gamification"
      description="Paramètres du module Gamification Avancée"
      icon={Zap}
    >
      {/* Niveaux */}
      <SettingRow
        label="Niveaux de progression"
        description="Les 5 paliers de progression des collaborateurs"
      >
        <div className="flex flex-col gap-1 items-end">
          {[
            { label: 'Recrue',     pts: '0',    color: '#6B7280' },
            { label: 'Actif',      pts: '100',  color: '#3B82F6' },
            { label: 'Engagé',     pts: '300',  color: '#8B5CF6' },
            { label: 'Performant', pts: '700',  color: '#10B981' },
            { label: 'Excellence', pts: '1 500', color: '#C9A227' },
          ].map(l => (
            <div
              key={l.label}
              className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg"
              style={{ background: `${l.color}18`, color: l.color }}
            >
              <span className="font-semibold">{l.label}</span>
              <span style={{ opacity: 0.7 }}>— {l.pts} pts</span>
            </div>
          ))}
        </div>
      </SettingRow>

      {/* Points par action */}
      <SettingRow
        label="Points par action"
        description="Points attribués automatiquement à chaque action"
      >
        <div className="flex flex-col gap-1 items-end text-xs">
          {[
            { label: 'Journal soumis', pts: '+10' },
            { label: 'Brief soumis', pts: '+5' },
            { label: 'Score ≥ 70', pts: '+25' },
            { label: 'Streak 7 jours', pts: '+50' },
            { label: 'Streak 30 jours', pts: '+200' },
          ].map(a => (
            <div key={a.label} className="flex items-center gap-2">
              <span className="text-gray-400">{a.label}</span>
              <span
                className="font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
              >
                {a.pts}
              </span>
            </div>
          ))}
        </div>
      </SettingRow>

      {/* Badges */}
      <SettingRow
        label="Catalogue badges"
        description={`${GAMIF_BADGES.length} badges disponibles (Bronze, Argent, Or)`}
      >
        <div className="flex flex-col gap-1.5 items-end">
          {GAMIF_BADGES.map(b => (
            <div
              key={b.label}
              className="flex items-center gap-2 text-xs px-2 py-0.5 rounded-lg"
              style={{
                background: `${TIER_COLORS[b.tier]}15`,
                color: TIER_COLORS[b.tier],
              }}
            >
              <span>{b.icon}</span>
              <span>{b.label}</span>
              <span style={{ opacity: 0.7 }}>+{b.pts} pts</span>
            </div>
          ))}
        </div>
      </SettingRow>

      {/* Note technique */}
      <div
        className="rounded-xl p-3 mt-1 text-xs text-gray-400 leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        💡 Les badges et points sont calculés automatiquement depuis les données PULSE.
        Les collaborateurs peuvent déclencher une mise à jour depuis l'onglet Gamification → "Mettre à jour mes stats".
      </div>
    </SectionCard>
  )
}

// ─── SECTION IA COACH (Admin) ────────────────────────────────

function IACoachSettingsSection() {
  return (
    <SectionCard
      title="Configuration IA Coach"
      description="Paramètres du module IA Coach (Anthropic Claude)"
      icon={BrainCircuit}
    >

      {/* Modèle utilisé */}
      <SettingRow
        label="Modèle IA utilisé"
        description="Modèle Claude utilisé pour l'analyse des journaux PULSE"
      >
        <div
          className="text-xs font-mono px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(79,70,229,0.1)', color: '#818CF8' }}
        >
          claude-sonnet-4-20250514
        </div>
      </SettingRow>

      {/* Période d'analyse */}
      <SettingRow
        label="Période d'analyse"
        description="Nombre de jours de journaux analysés par l'IA lors d'une demande"
      >
        <div
          className="text-xs font-mono px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(79,70,229,0.1)', color: '#818CF8' }}
        >
          7 jours
        </div>
      </SettingRow>

      {/* Axes analysés */}
      <SettingRow
        label="Axes d'analyse"
        description="Les 3 dimensions analysées pour chaque collaborateur"
      >
        <div className="flex flex-col gap-1.5 items-end">
          {[
            { icon: '🎯', label: 'Performance', color: '#4F46E5' },
            { icon: '💚', label: 'Bien-être',   color: '#10B981' },
            { icon: '🔓', label: 'Blocages',    color: '#F59E0B' },
          ].map(a => (
            <div
              key={a.label}
              className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-lg"
              style={{ background: `${a.color}18`, color: a.color }}
            >
              <span>{a.icon}</span> {a.label}
            </div>
          ))}
        </div>
      </SettingRow>

      {/* Info coût */}
      <div
        className="rounded-xl p-3 mt-2"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
      >
        <p className="text-xs text-amber-400/80">
          ⚠️ Chaque analyse consomme environ 1 000–2 000 tokens (input + output). Avec Claude Sonnet, le coût est estimé à ~0,001–0,003 $ par analyse individuelle.
        </p>
      </div>
    </SectionCard>
  )
}

// ─── SECTION SURVEYS D'ENGAGEMENT (Admin) ─────────────────────

function SurveysEngagementSettingsSection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState({
    surveys_frequency: 'quarterly',
    surveys_reminder_days: 2,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        surveys_frequency:     settings.surveys_frequency     ?? 'quarterly',
        surveys_reminder_days: settings.surveys_reminder_days ?? 2,
      })
    }
  }, [settings])

  const handleSave = async () => {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'surveys_frequency',     value: form.surveys_frequency }),
      updateSetting.mutateAsync({ key: 'surveys_reminder_days', value: form.surveys_reminder_days }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <SettingsSkeleton />

  const FREQUENCY_OPTIONS = [
    { value: 'monthly',   label: 'Mensuel' },
    { value: 'quarterly', label: 'Trimestriel (recommandé)' },
    { value: 'biannual',  label: 'Semestriel' },
    { value: 'annual',    label: 'Annuel' },
  ]

  return (
    <div className="space-y-5">
      <SectionCard
        title="Configuration Surveys d'Engagement"
        description="Paramètres des questionnaires d'engagement périodiques"
        icon={BarChart2}
      >
        <SettingRow label="Fréquence recommandée" description="Cadence suggérée lors de la création d'un nouveau survey">
          <select
            value={form.surveys_frequency}
            onChange={e => setForm(prev => ({ ...prev, surveys_frequency: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"
          >
            {FREQUENCY_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          label="Rappel avant clôture (jours)"
          description="Nombre de jours avant la date de fin pour envoyer un rappel aux non-répondants"
        >
          <input
            type="number"
            min={1}
            max={14}
            value={form.surveys_reminder_days}
            onChange={e => setForm(prev => ({ ...prev, surveys_reminder_days: parseInt(e.target.value) || 2 }))}
            className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 text-center"
          />
        </SettingRow>
      </SectionCard>

      <SectionCard
        title="Dimensions évaluées"
        description="Les 5 dimensions d'engagement incluses dans chaque survey (non modifiables)"
        icon={BarChart2}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
          {[
            { icon: '😊', label: 'Satisfaction générale', desc: 'Satisfaction globale au travail' },
            { icon: '⚡', label: 'Motivation & Énergie',  desc: 'Niveau de motivation quotidienne' },
            { icon: '🤝', label: 'Relation Manager',       desc: 'Qualité du soutien managérial' },
            { icon: '🏢', label: 'Environnement',          desc: 'Qualité du cadre de travail' },
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
        <button
          onClick={handleSave}
          disabled={updateSetting.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all"
        >
          {saved ? (
            <><Check className="w-4 h-4" /> Enregistré</>
          ) : (
            <><Save className="w-4 h-4" /> Enregistrer</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── SECTION FEEDBACK 360° (Admin) ───────────────────────────

function Feedback360SettingsSection() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [form, setForm] = useState({
    feedback360_anonymous: false,
    feedback360_scores_visible: false,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        feedback360_anonymous:       settings.feedback360_anonymous       ?? false,
        feedback360_scores_visible:  settings.feedback360_scores_visible  ?? false,
      })
    }
  }, [settings])

  const handleSave = async () => {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'feedback360_anonymous',      value: form.feedback360_anonymous }),
      updateSetting.mutateAsync({ key: 'feedback360_scores_visible', value: form.feedback360_scores_visible }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <SettingsSkeleton />

  return (
    <div className="space-y-5">
      <SectionCard
        title="Paramètres Feedback 360°"
        description="Configuration du module d'évaluation à 360 degrés"
        icon={MessageSquare}
      >
        <SettingRow
          label="Feedbacks anonymes"
          description="L'évalué ne voit pas le nom de son évaluateur (pair) — le manager reste identifié"
        >
          <Toggle
            checked={form.feedback360_anonymous}
            onChange={(v) => setForm(prev => ({ ...prev, feedback360_anonymous: v }))}
          />
        </SettingRow>

        <SettingRow
          label="Scores visibles par l'évalué"
          description="L'évalué peut consulter ses scores détaillés (sans les commentaires si anonyme)"
        >
          <Toggle
            checked={form.feedback360_scores_visible}
            onChange={(v) => setForm(prev => ({ ...prev, feedback360_scores_visible: v }))}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard
        title="Questions évaluées"
        description="Les 5 compétences mesurées dans chaque feedback (non modifiables pour l'instant)"
        icon={FileText}
      >
        {[
          { key: 'quality',       label: 'Qualité du travail',       icon: '⭐' },
          { key: 'deadlines',     label: 'Respect des délais',       icon: '⏱️' },
          { key: 'communication', label: 'Communication',            icon: '💬' },
          { key: 'teamwork',      label: 'Esprit d\'équipe',         icon: '🤝' },
          { key: 'initiative',    label: 'Initiative & Proactivité', icon: '🚀' },
        ].map(q => (
          <SettingRow key={q.key} label={`${q.icon} ${q.label}`} description="Score de 0 à 10">
            <span className="text-xs text-gray-500 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
              0 – 10
            </span>
          </SettingRow>
        ))}
        <p className="text-xs text-gray-600 mt-3">
          + Commentaire libre ajouté automatiquement à chaque formulaire
        </p>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateSetting.isPending}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
          }`}
        >
          {saved ? <><Check size={16} /> Enregistré</> : <><Save size={16} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

const TABS_USER = [
  { id: 'profile', label: 'Mon profil', icon: User },
  { id: 'security', label: 'Sécurité', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'pulse-notifications', label: 'Notifs PULSE', icon: Activity },
  { id: 'appearance', label: 'Apparence', icon: Palette },
]

const TABS_ADMIN = [
  { id: 'company', label: 'Entreprise', icon: Building2 },
  { id: 'modules', label: 'Modules & Cycles', icon: Blocks },
  { id: 'pulse', label: 'PULSE', icon: Activity },
  { id: 'notification-rules', label: 'Règles Notifications', icon: Bell }, // FIX S88 — S86 NotificationRulesAdmin
  { id: 'feedback360-settings', label: 'Feedback 360°', icon: MessageSquare },
  { id: 'surveys-settings', label: 'Surveys Engagement', icon: BarChart2 },
  { id: 'ia-coach-settings', label: 'IA Coach', icon: BrainCircuit },
  { id: 'gamification-settings', label: 'Gamification', icon: Zap },
  { id: 'review-cycles-settings', label: 'Review Cycles', icon: ClipboardList },
  { id: 'integrations', label: 'Intégrations', icon: Plug },
  { id: 'platform-security', label: 'Sécurité plateforme', icon: Shield },
  { id: 'audit', label: 'Journaux d\'audit', icon: FileText },
]

// ─── SECTION REVIEW CYCLES (Admin) ──────────────────────────

function ReviewCyclesSettingsSection() {
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
        review_cycles_self_eval_days:    settings.review_cycles_self_eval_days    ?? 7,
        review_cycles_manager_eval_days: settings.review_cycles_manager_eval_days ?? 14,
      })
    }
  }, [settings])

  async function handleSave() {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'review_cycles_default_frequency', value: form.review_cycles_default_frequency }),
      updateSetting.mutateAsync({ key: 'review_cycles_self_eval_days',    value: form.review_cycles_self_eval_days }),
      updateSetting.mutateAsync({ key: 'review_cycles_manager_eval_days', value: form.review_cycles_manager_eval_days }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <SectionCard
      title="Configuration Review Cycles"
      description="Paramètres des cycles d'évaluation formels (trimestriel, semestriel, annuel)"
      icon={ClipboardList}
    >
      <SettingRow
        label="Fréquence par défaut"
        description="Fréquence pré-sélectionnée lors de la création d'un nouveau cycle"
      >
        <select
          value={form.review_cycles_default_frequency}
          onChange={e => setForm(p => ({ ...p, review_cycles_default_frequency: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 text-sm text-white px-3 py-1.5 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="quarterly">Trimestrielle</option>
          <option value="biannual">Semestrielle</option>
          <option value="annual">Annuelle</option>
        </select>
      </SettingRow>

      <SettingRow
        label="Délai auto-évaluation (jours)"
        description="Nombre de jours accordés au collaborateur pour soumettre son auto-évaluation"
      >
        <input
          type="number"
          min="1"
          max="30"
          value={form.review_cycles_self_eval_days}
          onChange={e => setForm(p => ({ ...p, review_cycles_self_eval_days: parseInt(e.target.value) || 7 }))}
          className="w-20 rounded-lg border border-white/10 bg-white/5 text-sm text-white px-3 py-1.5 text-center focus:outline-none focus:border-indigo-500/50"
        />
      </SettingRow>

      <SettingRow
        label="Délai évaluation manager (jours)"
        description="Nombre de jours accordés au manager après soumission de l'auto-évaluation"
      >
        <input
          type="number"
          min="1"
          max="30"
          value={form.review_cycles_manager_eval_days}
          onChange={e => setForm(p => ({ ...p, review_cycles_manager_eval_days: parseInt(e.target.value) || 14 }))}
          className="w-20 rounded-lg border border-white/10 bg-white/5 text-sm text-white px-3 py-1.5 text-center focus:outline-none focus:border-indigo-500/50"
        />
      </SettingRow>

      {/* Grille compétences */}
      <div className="mt-4 pt-4 border-t border-white/8">
        <p className="text-xs text-gray-500 mb-3">Compétences évaluées (grille standard)</p>
        <div className="space-y-1.5">
          {[
            { icon: '⭐', label: 'Qualité du travail', weight: '25%' },
            { icon: '⏱️', label: 'Respect des délais', weight: '20%' },
            { icon: '💬', label: 'Communication', weight: '20%' },
            { icon: '🤝', label: 'Esprit d\'équipe', weight: '20%' },
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
        <button
          onClick={handleSave}
          disabled={updateSetting.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
        >
          {saved ? <><Check size={14} /> Enregistré</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </SectionCard>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function SettingsPage() {
  const { can: canSettings } = usePermission()
  const isAdmin = canSettings('admin', 'users', 'read')
  const [activeTab, setActiveTab] = useState('profile')

  const allTabs = isAdmin ? [...TABS_USER, ...TABS_ADMIN] : TABS_USER

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileSection />
      case 'security': return <SecuritySection />
      case 'notifications': return <NotificationsSection />
      case 'pulse-notifications': return <PulseNotificationsSection />
      case 'appearance': return <AppearanceSection />
      case 'company': return <CompanySection />
      case 'modules': return <ModulesSection />
      case 'pulse': return <PulseSettingsSection />
      // FIX S88 — S86 NotificationRulesAdmin
      case 'notification-rules': return <NotificationRulesAdmin />
      case 'feedback360-settings': return <Feedback360SettingsSection />
      case 'surveys-settings': return <SurveysEngagementSettingsSection />
      case 'ia-coach-settings': return <IACoachSettingsSection />
      case 'gamification-settings': return <GamificationSettingsSection />
      case 'review-cycles-settings': return <ReviewCyclesSettingsSection />
      case 'integrations': return <IntegrationsPage />
      case 'platform-security': return <PlatformSecuritySection />
      case 'audit': return <AuditLogsSection />
      default: return <ProfileSection />
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings size={24} className="text-indigo-400" />
          Paramètres
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Configurez votre expérience et les paramètres de la plateforme
        </p>
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar navigation */}
        <motion.nav
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-56 flex-shrink-0"
        >
          <div className="sticky top-6 space-y-1">
            {/* Onglets utilisateur */}
            <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">
              Personnel
            </p>
            {TABS_USER.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}

            {/* Onglets admin */}
            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider px-3">
                    Administration
                  </p>
                </div>
                {TABS_ADMIN.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </motion.nav>

        {/* Contenu */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}