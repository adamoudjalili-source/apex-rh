// ============================================================
// APEX RH — src/pages/temps/GestionTemps.jsx
// Session 66 — Hub principal Gestion des Temps
// Onglets : Ma Feuille · Mon Équipe · Administration
// ============================================================
import { useState } from 'react'
import { Clock, Users, Settings, BarChart3 } from 'lucide-react'
import { useAuth }              from '../../contexts/AuthContext'
import TimeSheetGrid            from '../../components/temps/TimeSheetGrid'
import TimeClockWidget          from '../../components/temps/TimeClockWidget'
import TimeStatsCard            from '../../components/temps/TimeStatsCard'
import TeamTimeSheetDashboard   from '../../components/temps/TeamTimeSheetDashboard'
import TimeSheetExport          from '../../components/temps/TimeSheetExport'
import { useTimeSettings, useUpdateTimeSettings } from '../../hooks/useTemps'

// ─── Onglet Ma Feuille ────────────────────────────────────────
function MonOnglet() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Colonne gauche : pointage + stats */}
      <div className="space-y-4">
        <TimeClockWidget/>
        <TimeStatsCard period="month"/>
      </div>

      {/* Colonne droite : grille semaine */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-white/[0.08] p-5"
          style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))' }}>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Feuille de temps</h2>
          <TimeSheetGrid/>
        </div>
      </div>
    </div>
  )
}

// ─── Onglet Mon Équipe ────────────────────────────────────────
function EquipeOnglet() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/[0.08] p-5"
        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))' }}>
        <h2 className="text-sm font-semibold text-white/80 mb-4">Validation des feuilles — Équipe</h2>
        <TeamTimeSheetDashboard/>
      </div>

      <div className="max-w-sm">
        <TimeSheetExport/>
      </div>
    </div>
  )
}

// ─── Onglet Administration ────────────────────────────────────
function AdminOnglet() {
  const { data: settings, isLoading } = useTimeSettings()
  const updateSettings = useUpdateTimeSettings()

  const [hours,     setHours]     = useState('')
  const [week,      setWeek]      = useState('')
  const [threshold, setThreshold] = useState('')
  const [saved,     setSaved]     = useState(false)

  const current = settings || {}

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      hours_per_day:      Number(hours || current.hours_per_day),
      hours_per_week:     Number(week  || current.hours_per_week),
      overtime_threshold: Number(threshold || current.overtime_threshold),
      work_days:          current.work_days || [1,2,3,4,5],
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-indigo-400 animate-spin"/>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Paramètres */}
      <div className="rounded-2xl border border-white/[0.08] p-5"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <h2 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
          <Settings size={14} className="text-white/40"/>
          Paramètres de temps
        </h2>

        <div className="space-y-4">
          {[
            { label: 'Heures par jour (standard)', key: 'hours_per_day', val: hours, set: setHours, min: 1, max: 24 },
            { label: 'Heures par semaine (standard)', key: 'hours_per_week', val: week, set: setWeek, min: 1, max: 80 },
            { label: 'Seuil heures supplémentaires / semaine', key: 'overtime_threshold', val: threshold, set: setThreshold, min: 1, max: 80 },
          ].map(({ label, key, val, set, min, max }) => (
            <div key={key}>
              <label className="block text-xs text-white/40 mb-1">{label}</label>
              <input type="number" min={min} max={max} step="0.5"
                value={val || current[key] || ''}
                onChange={e => set(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          ))}

          <button onClick={handleSave} disabled={updateSettings.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: saved ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
            {updateSettings.isPending
              ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
              : saved ? '✓ Sauvegardé' : 'Enregistrer'
            }
          </button>
        </div>
      </div>

      {/* Export global */}
      <div className="space-y-4">
        <TimeSheetExport showUserFilter/>

        <div className="rounded-2xl border border-white/[0.08] p-5"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-white/40"/>
            Vue organisation (toutes semaines)
          </h3>
          <TeamTimeSheetDashboard orgView/>
        </div>
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function GestionTemps() {
  const { profile, canAdmin, canManageTeam } = useAuth()
  const role = profile?.role

  const TABS = [
    { key: 'moi',    label: 'Ma Feuille',    icon: Clock,     always: true },
    { key: 'equipe', label: 'Mon Équipe',    icon: Users,     show: canManageTeam },
    { key: 'admin',  label: 'Administration', icon: Settings, show: canAdmin },
  ].filter(t => t.always || t.show)

  const [activeTab, setActiveTab] = useState(TABS[0].key)

  return (
    <div className="min-h-screen p-6" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Clock size={17} className="text-indigo-400"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Temps</h1>
            <p className="text-xs text-white/40">Feuilles de temps, pointage et validation</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === key ? 'rgba(99,102,241,0.2)' : 'transparent',
              color:      activeTab === key ? '#A5B4FC' : 'rgba(255,255,255,0.4)',
              border:     activeTab === key ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            }}>
            <Icon size={14}/>
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'moi'    && <MonOnglet/>}
      {activeTab === 'equipe' && canManageTeam && <EquipeOnglet/>}
      {activeTab === 'admin'  && canAdmin      && <AdminOnglet/>}
    </div>
  )
}
