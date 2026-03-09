// ============================================================
// APEX RH — TurnoverDashboard.jsx  ·  S82
// Turnover : taux, motifs départ (donut SVG), durée moyenne
// ============================================================
import { useState } from 'react'
import { LogOut, TrendingDown, RefreshCw, UserMinus } from 'lucide-react'
import { useTurnoverStats, useEmployeeDepartures, useRegisterDeparture, useDeleteDeparture } from '../../hooks/useHRIntelligence'
import { useUsersList } from '../../hooks/useSettings'

const REASON_LABELS = {
  resignation:       { label: 'Démission',         color: '#EF4444' },
  dismissal:         { label: 'Licenciement',       color: '#F97316' },
  end_of_contract:   { label: 'Fin de contrat',     color: '#F59E0B' },
  retirement:        { label: 'Retraite',           color: '#6366F1' },
  mutual_agreement:  { label: 'Rupture conventionnelle', color: '#8B5CF6' },
  death:             { label: 'Décès',              color: '#6B7280' },
  other:             { label: 'Autre',              color: '#374151' },
}

function DonutSVG({ data, size = 110 }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  const total   = entries.reduce((s, [, v]) => s + v, 0)
  if (!total) return (
    <div className="flex items-center justify-center text-white/20 text-xs" style={{ width: size, height: size }}>
      Aucun départ
    </div>
  )

  const cx = size / 2, cy = size / 2
  const r  = size / 2 - 12
  const ri = r * 0.58
  let cumul = -Math.PI / 2

  const segs = entries.map(([key, count]) => {
    const angle = (count / total) * 2 * Math.PI
    const x1    = cx + r * Math.cos(cumul)
    const y1    = cy + r * Math.sin(cumul)
    cumul      += angle
    const x2    = cx + r * Math.cos(cumul)
    const y2    = cy + r * Math.sin(cumul)
    const large = angle > Math.PI ? 1 : 0
    const ix1   = cx + ri * Math.cos(cumul - angle)
    const iy1   = cy + ri * Math.sin(cumul - angle)
    const ix2   = cx + ri * Math.cos(cumul)
    const iy2   = cy + ri * Math.sin(cumul)
    const d     = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ri} ${ri} 0 ${large} 0 ${ix1} ${iy1} Z`
    const color = REASON_LABELS[key]?.color || '#6B7280'
    return { d, color, key, count }
  })

  return (
    <svg width={size} height={size}>
      {segs.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1"/>
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="white">{total}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)">départs</text>
    </svg>
  )
}

function AddDepartureModal({ users, onClose, onSave }) {
  const [form, setForm] = useState({
    user_id: '', departure_date: '', reason: 'resignation',
    type: 'voluntary', rehirable: false, notes: ''
  })
  const save = useRegisterDeparture()

  const handleSubmit = async () => {
    if (!form.user_id || !form.departure_date) return
    await save.mutateAsync(form)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 className="text-white font-bold text-lg mb-5">Enregistrer un départ</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 block mb-1">Collaborateur *</label>
            <select value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">-- Sélectionner --</option>
              {(users || []).map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">Date de départ *</label>
              <input type="date" value={form.departure_date}
                onChange={e => setForm(p => ({ ...p, departure_date: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}/>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Motif</label>
              <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {Object.entries(REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} className="w-full rounded-lg px-3 py-2 text-sm text-white resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.rehirable}
              onChange={e => setForm(p => ({ ...p, rehirable: e.target.checked }))}
              className="rounded"/>
            <span className="text-xs text-white/60">Réembauche possible</span>
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-lg py-2 text-sm text-white/60"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={save.isPending}
            className="flex-1 rounded-lg py-2 text-sm text-white font-semibold"
            style={{ background: 'linear-gradient(135deg,#EF4444,#F97316)' }}>
            {save.isPending ? 'Enregistrement…' : 'Confirmer le départ'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TurnoverDashboard({ year }) {
  const { data, isLoading }   = useTurnoverStats(year)
  const { data: departures }  = useEmployeeDepartures()
  const { data: users }       = useUsersList()
  const [showModal, setShowModal] = useState(false)

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-white/30 text-sm">
      Chargement du turnover…
    </div>
  )

  const { total = 0, turnoverRate = 0, byReason = {}, byMonth = [], rehirableCount = 0 } = data || {}

  const maxMonth = Math.max(...byMonth.map(m => m.count), 1)

  return (
    <div className="space-y-6">
      {showModal && (
        <AddDepartureModal users={users} onClose={() => setShowModal(false)} onSave={() => {}}/>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: LogOut,       label: 'Départs',            value: total,               unit: '',   color: '#EF4444' },
          { icon: TrendingDown, label: 'Taux de turnover',   value: turnoverRate,        unit: '%',  color: '#F97316' },
          { icon: RefreshCw,    label: 'Réembauche possible', value: rehirableCount,     unit: '',   color: '#10B981' },
          { icon: UserMinus,    label: 'Démissions',         value: byReason.resignation || 0, unit: '', color: '#8B5CF6' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} style={{ color: k.color }}/>
              <span className="text-xs text-white/40">{k.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{k.value}{k.unit}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Donut motifs */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="text-xs text-white/50 mb-3 font-medium">Motifs de départ {year}</div>
          <div className="flex items-center gap-4">
            <DonutSVG data={byReason}/>
            <div className="flex-1 space-y-1.5">
              {Object.entries(REASON_LABELS).map(([key, cfg]) => {
                const count = byReason[key] || 0
                if (!count) return null
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }}/>
                    <span className="text-xs text-white/60 flex-1">{cfg.label}</span>
                    <span className="text-xs font-semibold text-white">{count}</span>
                  </div>
                )
              })}
              {Object.values(byReason).every(v => !v) && (
                <p className="text-xs text-white/30">Aucun départ enregistré</p>
              )}
            </div>
          </div>
        </div>

        {/* Histogramme mensuel */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/50 mb-3 font-medium">Départs par mois</div>
          <svg width="100%" height="90" viewBox={`0 0 ${byMonth.length * 22} 90`} preserveAspectRatio="none">
            {byMonth.map((m, i) => {
              const x    = i * 22 + 11
              const barH = maxMonth ? (m.count / maxMonth) * 65 : 0
              const y    = 75 - barH
              return (
                <g key={i}>
                  <rect x={x - 7} y={y} width={14} height={barH || 2}
                    rx="3" fill={m.count > 0 ? '#EF4444' : 'rgba(255,255,255,0.06)'}
                    opacity={m.count > 0 ? 0.8 : 1}/>
                  {m.count > 0 && (
                    <text x={x} y={y - 3} textAnchor="middle" fontSize="8" fill="#EF4444" fontWeight="600">{m.count}</text>
                  )}
                  <text x={x} y={85} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">{m.month}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Liste départs récents */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-sm font-semibold text-white">Départs enregistrés</span>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <LogOut size={11}/> Enregistrer un départ
          </button>
        </div>
        {(departures || []).length === 0 ? (
          <div className="px-4 py-6 text-center text-white/30 text-sm">
            Aucun départ enregistré
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {(departures || []).slice(0, 8).map(dep => {
              const cfg   = REASON_LABELS[dep.reason] || REASON_LABELS.other
              const label = dep.users?.email || dep.user_id
              return (
                <div key={dep.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}44` }}>
                    {label[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{label}</div>
                    <div className="text-xs text-white/40">{dep.departure_date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}35` }}>
                      {cfg.label}
                    </span>
                    {dep.rehirable && (
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                        Réembauche OK
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
