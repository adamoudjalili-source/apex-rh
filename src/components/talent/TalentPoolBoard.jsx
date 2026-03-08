// ============================================================
// APEX RH — src/components/talent/TalentPoolBoard.jsx  ·  S83
// Kanban 3 colonnes : ready_now / ready_1y / ready_2y
// Props :
//   positionId  — filtrer par poste (optionnel)
//   onAdd       — callback pour ouvrir modal d'ajout
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, User, ChevronRight, Briefcase, Clock, TrendingUp, AlertCircle, Trash2 } from 'lucide-react'
import {
  useTalentPool,
  useRemoveFromTalentPool,
  useAddToTalentPool,
  READINESS_CONFIG,
  READINESS_ORDER,
} from '../../hooks/useSuccessionVivier'
import { useUsersList } from '../../hooks/useSettings'
import { useKeyPositions } from '../../hooks/useSuccessionPlanning'
import { usePermission } from '../../hooks/usePermission'

// ─── Helpers ─────────────────────────────────────────────────
function Avatar({ user, size = 32 }) {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.35,
        background: 'rgba(139,92,246,0.2)',
        border: '1px solid rgba(139,92,246,0.35)',
        color: '#C4B5FD',
      }}
    >
      {initials || <User size={size * 0.45} />}
    </div>
  )
}

function roleLabel(r) {
  return { collaborateur:'Collaborateur', chef_service:'Chef Service',
           chef_division:'Chef Division', administrateur:'Admin',
           directeur:'Directeur' }[r] || r
}

// ─── Carte Talent ────────────────────────────────────────────
function TalentCard({ entry, onRemove, canAdmin }) {
  const [expanded, setExpanded] = useState(false)
  const emp    = entry.employee
  const gaps   = entry.skills_gap || []
  const hasGap = gaps.some(g => g.gap > 0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl p-3 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar user={emp} size={30} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {emp?.first_name} {emp?.last_name}
            </p>
            <p className="text-xs text-white/40 truncate">{roleLabel(emp?.role)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasGap && <AlertCircle size={13} className="text-amber-400" />}
          {canAdmin && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(entry.id) }}
              className="p-1 rounded hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
          <ChevronRight
            size={13}
            className="text-white/25 transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        </div>
      </div>

      {/* Poste cible */}
      {entry.target_role && (
        <div className="mt-2 flex items-center gap-1">
          <Briefcase size={11} className="text-white/30 flex-shrink-0" />
          <span className="text-xs text-white/40 truncate">{entry.target_role}</span>
        </div>
      )}

      {/* Détail gap (expandable) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {gaps.length > 0 ? (
                <>
                  <p className="text-xs text-white/40 mb-2 font-medium">Écarts de compétences</p>
                  <div className="space-y-1.5">
                    {gaps.slice(0, 4).map((g, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/60 truncate flex-1">{g.skill}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (g.current_level / 5) * 100)}%`,
                                background: g.gap > 2 ? '#EF4444' : g.gap > 0 ? '#F59E0B' : '#10B981',
                              }}
                            />
                          </div>
                          <span className="text-xs w-6 text-right" style={{
                            color: g.gap > 2 ? '#EF4444' : g.gap > 0 ? '#F59E0B' : '#10B981',
                          }}>
                            {g.current_level}/{g.required_level}
                          </span>
                        </div>
                      </div>
                    ))}
                    {gaps.length > 4 && (
                      <p className="text-xs text-white/30">+{gaps.length - 4} autres compétences</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-emerald-400/70">Aucun écart identifié</p>
              )}
              {entry.notes && (
                <p className="mt-2 text-xs text-white/40 italic">"{entry.notes}"</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Modal d'ajout talent ────────────────────────────────────
function AddTalentModal({ positionId, positions, onClose }) {
  const { data: users = [] } = useUsersList()
  const addMutation          = useAddToTalentPool()

  const [form, setForm] = useState({
    user_id:            '',
    target_position_id: positionId || '',
    target_role:        '',
    readiness:          'ready_2y',
    notes:              '',
    skills_gap:         [],
  })
  const [gapInput, setGapInput] = useState({ skill: '', required_level: 3, current_level: 1 })

  const addGap = () => {
    if (!gapInput.skill.trim()) return
    const gap = Math.max(0, gapInput.required_level - gapInput.current_level)
    setForm(f => ({
      ...f,
      skills_gap: [...f.skills_gap, {
        skill:          gapInput.skill.trim(),
        required_level: Number(gapInput.required_level),
        current_level:  Number(gapInput.current_level),
        gap,
        priority:       gap >= 3 ? 'critical' : gap >= 2 ? 'high' : gap >= 1 ? 'medium' : 'low',
      }],
    }))
    setGapInput({ skill: '', required_level: 3, current_level: 1 })
  }

  const removeGap = (i) => setForm(f => ({ ...f, skills_gap: f.skills_gap.filter((_, idx) => idx !== i) }))

  const handleSubmit = async () => {
    if (!form.user_id) return
    // Remplir target_role depuis le poste sélectionné
    const posObj    = positions?.find(p => p.id === form.target_position_id)
    const finalRole = form.target_role || posObj?.title || 'Non défini'
    await addMutation.mutateAsync({ ...form, target_role: finalRole })
    onClose()
  }

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:outline-none focus:border-purple-500/50"
  const labelCls = "block text-xs text-white/50 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
              Ajouter au vivier
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Collaborateur */}
            <div>
              <label className={labelCls}>Collaborateur *</label>
              <select className={inputCls} value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                <option value="">Sélectionner…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>

            {/* Poste cible */}
            <div>
              <label className={labelCls}>Poste cible</label>
              <select
                className={inputCls}
                value={form.target_position_id}
                onChange={e => setForm(f => ({ ...f, target_position_id: e.target.value }))}
              >
                <option value="">Aucun poste lié</option>
                {(positions || []).map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Rôle visé (si pas de poste) */}
            {!form.target_position_id && (
              <div>
                <label className={labelCls}>Rôle visé (libellé libre)</label>
                <input
                  className={inputCls}
                  placeholder="ex: Responsable Équipe Technique"
                  value={form.target_role}
                  onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
                />
              </div>
            )}

            {/* Readiness */}
            <div>
              <label className={labelCls}>Niveau de préparation</label>
              <div className="flex gap-2">
                {READINESS_ORDER.map(r => {
                  const cfg    = READINESS_CONFIG[r]
                  const active = form.readiness === r
                  return (
                    <button
                      key={r}
                      onClick={() => setForm(f => ({ ...f, readiness: r }))}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={active
                        ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }
                        : { color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Écarts de compétences */}
            <div>
              <label className={labelCls}>Écarts de compétences</label>
              <div className="flex gap-2 mb-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Compétence"
                  value={gapInput.skill}
                  onChange={e => setGapInput(g => ({ ...g, skill: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addGap()}
                />
                <div className="flex gap-1">
                  {['Actuel', 'Requis'].map((lbl, i) => (
                    <div key={lbl} className="w-16">
                      <input
                        type="number" min={1} max={5}
                        className={`${inputCls} text-center`}
                        placeholder={lbl}
                        value={i === 0 ? gapInput.current_level : gapInput.required_level}
                        onChange={e => setGapInput(g => ({
                          ...g,
                          [i === 0 ? 'current_level' : 'required_level']: Number(e.target.value),
                        }))}
                      />
                    </div>
                  ))}
                  <button
                    onClick={addGap}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' }}
                  >
                    +
                  </button>
                </div>
              </div>
              {form.skills_gap.length > 0 && (
                <div className="space-y-1">
                  {form.skills_gap.map((g, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-xs text-white/70">{g.skill}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: g.gap > 2 ? '#EF4444' : g.gap > 0 ? '#F59E0B' : '#10B981' }}>
                          {g.current_level} → {g.required_level}
                        </span>
                        <button onClick={() => removeGap(i)} className="text-white/30 hover:text-red-400"><X size={11} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Observations…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-white/50 border border-white/[0.08]">Annuler</button>
            <button
              onClick={handleSubmit}
              disabled={!form.user_id || addMutation.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff' }}
            >
              {addMutation.isPending ? 'Ajout…' : 'Ajouter au vivier'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function TalentPoolBoard({ positionId = null }) {
  const { can } = usePermission()
  const canAdmin = can('intelligence', 'talents', 'read')
  const { data, isLoading } = useTalentPool(positionId)
  const { data: positions  } = useKeyPositions()
  const removeMutation       = useRemoveFromTalentPool()
  const [showAdd, setShowAdd]= useState(false)

  const columns = READINESS_ORDER.map(r => ({
    key:   r,
    cfg:   READINESS_CONFIG[r],
    items: data?.grouped?.[r] || [],
  }))

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
            Vivier de talents
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            {data?.total || 0} talent{data?.total !== 1 ? 's' : ''} identifié{data?.total !== 1 ? 's' : ''}
          </p>
        </div>
        {canAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <Plus size={13} /> Ajouter
          </button>
        )}
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex gap-3 flex-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 flex-1 overflow-hidden">
          {columns.map(col => (
            <div key={col.key} className="flex-1 flex flex-col min-h-0">
              {/* En-tête colonne */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-t-xl mb-2"
                style={{ background: `${col.cfg.color}12`, borderBottom: `1px solid ${col.cfg.color}25` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.cfg.color }} />
                  <span className="text-xs font-semibold" style={{ color: col.cfg.color }}>
                    {col.cfg.label}
                  </span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${col.cfg.color}20`, color: col.cfg.color }}
                >
                  {col.items.length}
                </span>
              </div>

              {/* Cartes */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <AnimatePresence>
                  {col.items.map(entry => (
                    <TalentCard
                      key={entry.id}
                      entry={entry}
                      canAdmin={canAdmin}
                      onRemove={id => removeMutation.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
                {col.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <User size={24} className="text-white/10 mb-2" />
                    <p className="text-xs text-white/20">Aucun talent</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showAdd && (
          <AddTalentModal
            positionId={positionId}
            positions={positions?.positions || []}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
