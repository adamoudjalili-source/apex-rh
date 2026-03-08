// ============================================================
// APEX RH — src/pages/temps/GestionTemps.jsx
// Session 71 — Hub principal Gestion des Temps (enrichi HS)
// Onglets : Ma Feuille · Mon Équipe · Heures Sup. · Alertes · Administration
// ============================================================
import { useState } from 'react'
import { Clock, Users, Settings, TrendingUp, AlertTriangle } from 'lucide-react'
import { useAuth }               from '../../contexts/AuthContext'
import TimeSheetGrid             from '../../components/temps/TimeSheetGrid'
import TimeClockWidget           from '../../components/temps/TimeClockWidget'
import TimeStatsCard             from '../../components/temps/TimeStatsCard'
import TeamTimeSheetDashboard    from '../../components/temps/TeamTimeSheetDashboard'
import TimeSheetExport           from '../../components/temps/TimeSheetExport'
import OvertimeSummary           from '../../components/temps/OvertimeSummary'
import OvertimeValidation        from '../../components/temps/OvertimeValidation'
import OvertimeAlerts            from '../../components/temps/OvertimeAlerts'
import OvertimePayrollExport     from '../../components/temps/OvertimePayrollExport'
import OvertimeRulesEngine       from '../../components/temps/OvertimeRulesEngine'
import { useTimeSettings, useUpdateTimeSettings, useOvertimeAlerts } from '../../hooks/useTemps'

// ─── Onglet Ma Feuille ────────────────────────────────────────
function MonOnglet() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="space-y-4">
          <TimeClockWidget/>
          <TimeStatsCard period="month"/>
        </div>
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-white/[0.08] p-5"
            style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))' }}>
            <h2 className="text-sm font-semibold text-white/80 mb-4">Feuille de temps</h2>
            <TimeSheetGrid/>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.08] p-5"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <h2 className="text-sm font-semibold text-white/80 mb-5">Mes heures supplémentaires</h2>
        <OvertimeSummary/>
      </div>
    </div>
  )
}

// ─── Onglet Mon Équipe ────────────────────────────────────────
function EquipeOnglet() {
  const [subTab, setSubTab] = useState('feuilles')
  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 rounded-xl w-fit border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        {[{ key: 'feuilles', label: 'Feuilles équipe' }, { key: 'validation', label: 'Validation HS' }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={subTab === t.key ? { background: 'rgba(99,102,241,0.25)', color: '#A5B4FC' } : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {subTab === 'feuilles' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <h2 className="text-sm font-semibold text-white/80 mb-4">Validation des feuilles — Équipe</h2>
            <TeamTimeSheetDashboard/>
          </div>
          <div className="max-w-sm"><TimeSheetExport/></div>
        </div>
      )}
      {subTab === 'validation' && (
        <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <OvertimeValidation/>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Heures Supplémentaires ────────────────────────────
function HeuresSupOnglet() {
  return (
    <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <OvertimeSummary/>
    </div>
  )
}

// ─── Onglet Administration ────────────────────────────────────
function AdminOnglet() {
  const { data: settings, isLoading } = useTimeSettings()
  const updateSettings = useUpdateTimeSettings()
  const [subTab, setSubTab] = useState('general')
  const [hours, setHours]   = useState('')
  const [week,  setWeek]    = useState('')
  const [saved, setSaved]   = useState(false)
  const current = settings || {}

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      hours_per_day:  Number(hours || current.hours_per_day),
      hours_per_week: Number(week  || current.hours_per_week),
      work_days:      current.work_days || [1,2,3,4,5],
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 rounded-xl w-fit border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        {[
          { key: 'general', label: 'Général' },
          { key: 'regles',  label: "Règles heures sup." },
          { key: 'export',  label: 'Export paie' },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={subTab === t.key ? { background: 'rgba(124,58,237,0.25)', color: '#C4B5FD' } : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <h2 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
              <Settings size={14} className="text-white/40"/> Paramètres de temps
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Heures par jour (standard)', key: 'hours_per_day',  val: hours, set: setHours },
                { label: 'Heures par semaine (standard)', key: 'hours_per_week', val: week,  set: setWeek  },
              ].map(({ label, key, val, set }) => (
                <div key={key}>
                  <label className="block text-xs text-white/40 mb-1">{label}</label>
                  <input type="number" min={1} max={80} step="0.5"
                    value={val || current[key] || ''}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm
                               text-white focus:outline-none focus:border-violet-500/50 transition-colors"/>
                </div>
              ))}
              <button onClick={handleSave} disabled={updateSettings.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: saved ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
                {updateSettings.isPending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                  : saved ? '✓ Sauvegardé' : 'Enregistrer'
                }
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <TimeSheetExport showUserFilter/>
            <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Users size={14} className="text-white/40"/> Vue organisation
              </h3>
              <TeamTimeSheetDashboard orgView/>
            </div>
          </div>
        </div>
      )}

      {subTab === 'regles' && (
        <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <OvertimeRulesEngine/>
        </div>
      )}

      {subTab === 'export' && (
        <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <OvertimePayrollExport/>
        </div>
      )}
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function GestionTemps() {
  const { canAdmin, canValidate, canManageTeam } = useAuth()
  const { data: alerts = [] } = useOvertimeAlerts()
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length

  const TABS = [
    { key: 'moi',     label: 'Ma Feuille',    icon: Clock,          always: true },
    { key: 'equipe',  label: 'Mon Équipe',    icon: Users,          show: canManageTeam },
    { key: 'hs',      label: 'Heures Sup.',   icon: TrendingUp,     always: true },
    { key: 'alertes', label: 'Alertes',       icon: AlertTriangle,  show: canValidate, badge: criticalAlerts },
    { key: 'admin',   label: 'Administration',icon: Settings,       show: canAdmin },
  ].filter(t => t.always || t.show)

  const [activeTab, setActiveTab] = useState('moi')

  return (
    <div className="min-h-screen p-6" style={{ background: 'transparent' }}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Clock size={17} className="text-indigo-400"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Temps</h1>
            <p className="text-xs text-white/40">Feuilles de temps · Heures supplémentaires · Export paie</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit flex-wrap"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all relative"
            style={{
              background: activeTab === key ? 'rgba(99,102,241,0.2)' : 'transparent',
              color:      activeTab === key ? '#A5B4FC' : 'rgba(255,255,255,0.4)',
              border:     activeTab === key ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            }}>
            <Icon size={14}/>
            {label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: '#EF4444' }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'moi'     && <MonOnglet/>}
      {activeTab === 'equipe'  && canManageTeam && <EquipeOnglet/>}
      {activeTab === 'hs'      && <HeuresSupOnglet/>}
      {activeTab === 'alertes' && canValidate   && (
        <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <OvertimeAlerts/>
        </div>
      )}
      {activeTab === 'admin'   && canAdmin && <AdminOnglet/>}
    </div>
  )
}
