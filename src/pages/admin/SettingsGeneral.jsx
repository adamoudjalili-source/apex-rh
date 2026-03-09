// ============================================================
// APEX RH — SettingsGeneral.jsx
// S122 — Sections utilisateur : Profil, Sécurité, Apparence
// ============================================================
import { useState, useEffect } from 'react'
import {
  User, Shield, Lock, Building2, Calendar, Check, X, Eye, EyeOff,
  RefreshCw, Info, Palette, Blocks, Globe
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  useUserProfile,
  useUpdateUserProfile,
} from '../../hooks/useSettings'
import { SectionCard, SettingRow, SaveButton, InputField, SelectField, SettingsSkeleton } from './Settings'

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

// ─── SECTION 1 : MON PROFIL ─────────────────────────────────

export function ProfileSection() {
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
          {[
            { label: 'Direction', value: userProfile?.directions?.name },
            { label: 'Division', value: userProfile?.divisions?.name },
            { label: 'Service', value: userProfile?.services?.name },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.04]">
              <p className="text-white/40 text-xs font-medium mb-1">{label}</p>
              <p className="text-white text-sm font-medium">{value || '—'}</p>
            </div>
          ))}
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

export function SecuritySection() {
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
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
        )}
        {saved && (
          <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
            <Check size={16} /> Mot de passe modifié avec succès !
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
          <SaveButton onClick={handleSave} saving={saving} saved={saved} disabled={!allCriteriaMet || !passwordsMatch} />
        </div>
      </SectionCard>

      <SectionCard title="Session active" description="Informations sur votre session en cours" icon={Lock}>
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

// ─── SECTION 3 : APPARENCE ──────────────────────────────────

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [density, setDensity] = useState('comfortable')

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
                theme === t.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/[0.06] hover:border-white/10'
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
          {theme === 'auto' ? "Le thème s'adapte automatiquement aux préférences de votre système." :
           theme === 'light' ? 'Mode clair activé.' : 'Mode sombre activé.'}
        </p>
      </SectionCard>

      <SectionCard title="Densité d'affichage" description="Ajustez l'espacement des éléments" icon={Blocks}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'comfortable', label: 'Confortable', desc: 'Espacement large, lisibilité optimale' },
            { id: 'compact', label: 'Compact', desc: "Plus d'informations visibles à l'écran" },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDensity(d.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                density === d.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/[0.06] hover:border-white/10'
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
