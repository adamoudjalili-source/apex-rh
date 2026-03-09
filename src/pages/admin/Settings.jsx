// ============================================================
// APEX RH — Settings.jsx (SettingsHub)
// S122 — Hub paramètres : composants partagés + routeur principal
// Split : SettingsGeneral | SettingsAdmin | SettingsModules
//         SettingsNotifications | SettingsReviews
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, User, Shield, Bell, Palette, Building2, Blocks, Lock,
  FileText, Save, Check, RefreshCw, Activity, BarChart2, MessageSquare,
  Zap, BrainCircuit, ClipboardList, Plug
} from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import IntegrationsPage from './Integrations'
import NotificationRulesAdmin from '../../components/NotificationRulesAdmin'
import { ProfileSection, SecuritySection, AppearanceSection } from './SettingsGeneral'
import { CompanySection, PlatformSecuritySection, AuditLogsSection } from './SettingsAdmin'
import { NotificationsSection, PulseNotificationsSection } from './SettingsNotifications'
import { ModulesSection, PulseSettingsSection, GamificationSettingsSection, IACoachSettingsSection } from './SettingsModules'
import { SurveysEngagementSettingsSection, Feedback360SettingsSection, ReviewCyclesSettingsSection } from './SettingsReviews'

// ─── COMPOSANTS UI PARTAGÉS ──────────────────────────────────

export function SectionCard({ title, description, icon: Icon, children }) {
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

export function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0">
      <div className="flex-1 mr-4">
        <p className="text-white/90 text-sm font-medium">{label}</p>
        {description && <p className="text-white/35 text-xs mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export function Toggle({ checked, onChange, disabled = false }) {
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

export function SaveButton({ onClick, saving, saved, disabled = false }) {
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
      {saving ? <RefreshCw size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
      {saving ? 'Enregistrement...' : saved ? 'Enregistré' : 'Enregistrer'}
    </button>
  )
}

export function InputField({ label, value, onChange, type = 'text', placeholder, disabled = false, readOnly = false }) {
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

export function SelectField({ label, value, onChange, options, disabled = false }) {
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
          <option key={opt.value} value={opt.value} className="bg-[#1a1a3e] text-white">{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 bg-white/[0.03] rounded-lg" />
      ))}
    </div>
  )
}

// ─── NAVIGATION TABS ─────────────────────────────────────────

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
  { id: 'notification-rules', label: 'Règles Notifications', icon: Bell },
  { id: 'feedback360-settings', label: 'Feedback 360°', icon: MessageSquare },
  { id: 'surveys-settings', label: 'Surveys Engagement', icon: BarChart2 },
  { id: 'ia-coach-settings', label: 'IA Coach', icon: BrainCircuit },
  { id: 'gamification-settings', label: 'Gamification', icon: Zap },
  { id: 'review-cycles-settings', label: 'Review Cycles', icon: ClipboardList },
  { id: 'integrations', label: 'Intégrations', icon: Plug },
  { id: 'platform-security', label: 'Sécurité plateforme', icon: Shield },
  { id: 'audit', label: "Journaux d'audit", icon: FileText },
]

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function SettingsPage() {
  const { can: canSettings } = usePermission()
  const isAdmin = canSettings('admin', 'users', 'read')
  const [activeTab, setActiveTab] = useState('profile')

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':               return <ProfileSection />
      case 'security':              return <SecuritySection />
      case 'notifications':         return <NotificationsSection />
      case 'pulse-notifications':   return <PulseNotificationsSection />
      case 'appearance':            return <AppearanceSection />
      case 'company':               return <CompanySection />
      case 'modules':               return <ModulesSection />
      case 'pulse':                 return <PulseSettingsSection />
      case 'notification-rules':    return <NotificationRulesAdmin />
      case 'feedback360-settings':  return <Feedback360SettingsSection />
      case 'surveys-settings':      return <SurveysEngagementSettingsSection />
      case 'ia-coach-settings':     return <IACoachSettingsSection />
      case 'gamification-settings': return <GamificationSettingsSection />
      case 'review-cycles-settings':return <ReviewCyclesSettingsSection />
      case 'integrations':          return <IntegrationsPage />
      case 'platform-security':     return <PlatformSecuritySection />
      case 'audit':                 return <AuditLogsSection />
      default:                      return <ProfileSection />
    }
  }

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings size={24} className="text-indigo-400" />
          Paramètres
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Configurez votre expérience et les paramètres de la plateforme
        </p>
      </motion.div>

      <div className="flex gap-6">
        <motion.nav initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="w-56 flex-shrink-0">
          <div className="sticky top-6 space-y-1">
            <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Personnel</p>
            {TABS_USER.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    isActive ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                  }`}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider px-3">Administration</p>
                </div>
                {TABS_ADMIN.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                        isActive ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                      }`}>
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </motion.nav>

        <div className="flex-1 min-w-0 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
