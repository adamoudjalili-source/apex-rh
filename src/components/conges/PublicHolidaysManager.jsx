// ============================================================
// APEX RH — src/components/conges/PublicHolidaysManager.jsx
// Session 70 — Gestionnaire jours fériés sénégalais
// Configurable par admin : ajout / suppression / activation
// ============================================================
import { useState } from 'react'
import { CalendarDays, Plus, Trash2, Check, Lock } from 'lucide-react'
import { useLeaveSettings, useUpdateLeaveSettings, SENEGAL_PUBLIC_HOLIDAYS_DEFAULT } from '../../hooks/useConges'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function formatHolidayDate(h, year = new Date().getFullYear()) {
  if (h.is_fixed) {
    const [mm, dd] = h.date.split('-')
    return new Date(year, parseInt(mm)-1, parseInt(dd)).toLocaleDateString('fr-FR', { day:'2-digit', month:'long' })
  }
  return new Date(h.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
}

export default function PublicHolidaysManager() {
  const { data: settings, isLoading } = useLeaveSettings()
  const updateSettings = useUpdateLeaveSettings()
  const [showAddForm, setShowAddForm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newHoliday, setNewHoliday] = useState({ date:'', name:'', is_fixed: false })
  const [initConfirm, setInitConfirm] = useState(false)

  const holidays = settings?.public_holidays || []

  async function saveHolidays(updated) {
    await updateSettings.mutateAsync({ ...settings, public_holidays: updated })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleActive(idx) {
    const updated = [...holidays]
    updated[idx] = { ...updated[idx], is_active: !(updated[idx].is_active ?? true) }
    await saveHolidays(updated)
  }

  async function removeHoliday(idx) {
    const updated = holidays.filter((_, i) => i !== idx)
    await saveHolidays(updated)
  }

  async function addHoliday() {
    if (!newHoliday.date || !newHoliday.name) return
    const entry = { ...newHoliday, is_active: true }
    await saveHolidays([...holidays, entry])
    setNewHoliday({ date:'', name:'', is_fixed: false })
    setShowAddForm(false)
  }

  async function initDefaults() {
    await saveHolidays(SENEGAL_PUBLIC_HOLIDAYS_DEFAULT)
    setInitConfirm(false)
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border p-5 animate-pulse" style={{ background:'rgba(255,255,255,0.025)', borderColor:'rgba(255,255,255,0.08)' }}>
        <div className="h-4 w-40 rounded mb-4" style={{ background:'rgba(255,255,255,0.08)' }}/>
        {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl mb-2" style={{ background:'rgba(255,255,255,0.05)' }}/>)}
      </div>
    )
  }

  const active   = holidays.filter(h => h.is_active !== false)
  const inactive = holidays.filter(h => h.is_active === false)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-400"/>
            Jours fériés sénégalais
          </h3>
          <p className="text-[11px] text-white/30 mt-0.5">
            {active.length} actif{active.length>1?'s':''} · Ces jours sont exclus du décompte des congés
          </p>
        </div>
        <div className="flex items-center gap-2">
          {holidays.length === 0 && (
            <button
              onClick={() => setInitConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 transition-colors">
              ✨ Importer liste Niger
            </button>
          )}
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white border border-white/10 hover:bg-white/5 transition-colors">
            <Plus size={13}/> Ajouter
          </button>
        </div>
      </div>

      {/* Confirm import */}
      {initConfirm && (
        <div className="rounded-2xl border p-4 flex items-center justify-between gap-3"
          style={{ background:'rgba(245,158,11,0.07)', borderColor:'rgba(245,158,11,0.2)' }}>
          <p className="text-sm text-amber-300/80">
            Importer les {SENEGAL_PUBLIC_HOLIDAYS_DEFAULT.length} jours fériés nigériens (2026) ?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setInitConfirm(false)} className="px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors">Annuler</button>
            <button onClick={initDefaults} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)' }}>
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* Formulaire ajout */}
      {showAddForm && (
        <div className="rounded-2xl border p-4 space-y-3"
          style={{ background:'rgba(255,255,255,0.025)', borderColor:'rgba(255,255,255,0.1)' }}>
          <p className="text-xs font-medium text-white/60">Nouveau jour férié</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/30 mb-1 block">Date</label>
              <input type="date" value={newHoliday.date}
                onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-amber-500"
                style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="text-[11px] text-white/30 mb-1 block">Nom</label>
              <input type="text" value={newHoliday.name} placeholder="ex : Fête Nationale"
                onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-white/20"
                style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-white/50 hover:text-white/70">
            <input type="checkbox" checked={newHoliday.is_fixed}
              onChange={e => setNewHoliday(h => ({ ...h, is_fixed: e.target.checked }))}
              className="rounded"/>
            Date fixe chaque année (MM-JJ)
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors">Annuler</button>
            <button onClick={addHoliday} disabled={!newHoliday.date || !newHoliday.name}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Liste jours fériés */}
      {holidays.length === 0 ? (
        <div className="rounded-2xl py-10 text-center"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.07)' }}>
          <CalendarDays size={28} className="mx-auto text-white/15 mb-2"/>
          <p className="text-white/30 text-sm">Aucun jour férié configuré</p>
          <p className="text-white/20 text-xs mt-1">Importez la liste sénégalaise ou ajoutez manuellement</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {holidays.map((h, idx) => {
            const isActive = h.is_active !== false
            return (
              <div key={idx}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${isActive ? '' : 'opacity-40'}`}
                style={{ background: isActive ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)', borderColor: isActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-amber-400' : 'bg-white/20'}`}/>
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{h.name}</p>
                    <p className="text-[11px] text-white/35">{formatHolidayDate(h)} {h.is_fixed ? <Lock size={9} className="inline mb-0.5"/> : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(idx)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isActive ? 'text-amber-400 hover:bg-amber-500/10' : 'text-white/20 hover:text-white/40'}`}
                    title={isActive ? 'Désactiver' : 'Activer'}>
                    <Check size={13}/>
                  </button>
                  <button onClick={() => removeHoliday(idx)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 transition-all">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-emerald-400 text-xs">
          <Check size={13}/> Jours fériés sauvegardés
        </div>
      )}
    </div>
  )
}
