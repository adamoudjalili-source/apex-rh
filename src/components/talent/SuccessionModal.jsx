// ============================================================
// APEX RH — src/components/talent/SuccessionModal.jsx
// Session 51 — Modal nomination successeur + profil visuel
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, Search, Check, AlertTriangle, Plus,
  ChevronDown, Trash2, Shield, Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  useNominateCandidate,
  useUpdateCandidate,
  useRemoveCandidate,
  CRITICALITY_CONFIG,
  READINESS_CONFIG,
} from '../../hooks/useSuccessionPlanning'

// ─── Helpers ─────────────────────────────────────────────────
const roleLabel = r => ({
  collaborateur: 'Collaborateur', chef_service: 'Chef Service',
  chef_division: 'Chef Division', directeur: 'Directeur',
  administrateur: 'Admin',
}[r] || r)

function ReadinessBadge({ level }) {
  const cfg = READINESS_CONFIG[level] || READINESS_CONFIG.potential
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function SuccessionModal({ position, onClose }) {
  const [activeTab,     setTab]     = useState('candidates')  // 'candidates' | 'add'
  const [searchQuery,   setSearch]  = useState('')
  const [searchResults, setResults] = useState([])
  const [searching,     setSearching] = useState(false)
  const [editingId,     setEditing]   = useState(null)
  const [editReadiness, setEditRead]  = useState('')
  const [editNotes,     setEditNotes] = useState('')

  const nominate = useNominateCandidate()
  const update   = useUpdateCandidate()
  const remove   = useRemoveCandidate()

  const critCfg = CRITICALITY_CONFIG[position.criticality_level] || CRITICALITY_CONFIG.medium
  const candidates = position.succession_plans || []

  // ─── Recherche utilisateurs ──────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const existingIds = candidates.map(c => c.candidate?.id).filter(Boolean)
        let q = supabase
          .from('users')
          .select('id, first_name, last_name, role, division_id, divisions(name), services(name)')
          .eq('is_active', true)
          .neq('role', 'administrateur')
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .limit(8)

        if (position.current_holder_id) q = q.neq('id', position.current_holder_id)

        const { data } = await q
        setResults((data || []).filter(u => !existingIds.includes(u.id)))
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleNominate = async (user, readiness = 'ready_in_2_years') => {
    await nominate.mutateAsync({
      position_id:       position.id,
      candidate_user_id: user.id,
      readiness_level:   readiness,
    })
    setSearch('')
    setResults([])
    setTab('candidates')
  }

  const handleUpdate = async (candidate) => {
    await update.mutateAsync({
      id:              candidate.id,
      position_id:     position.id,
      readiness_level: editReadiness,
      notes:           editNotes,
    })
    setEditing(null)
  }

  const handleRemove = async (candidate) => {
    if (!confirm('Retirer ce candidat ?')) return
    await remove.mutateAsync({ id: candidate.id, position_id: position.id })
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(145deg, rgba(17,17,34,0.99) 0%, rgba(11,11,22,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '85vh',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Header ── */}
        <div className="p-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={13} style={{ color: critCfg.color }} />
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: critCfg.bg, color: critCfg.color }}
                >
                  {critCfg.label}
                </span>
                {position.vacancy_horizon_months && (
                  <span className="flex items-center gap-1 text-[10px] text-white/30">
                    <Clock size={10} />
                    Vacance : {position.vacancy_horizon_months} mois
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white truncate">{position.title}</h2>
              <p className="text-xs text-white/40 mt-0.5">
                {position.divisions?.name || position.directions?.name || position.services?.name || 'Poste transversal'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all flex-shrink-0"
            >
              <X size={14} className="text-white/50" />
            </button>
          </div>

          {/* Titulaire actuel */}
          {position.current_holder && (
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#FCD34D' }}
              >
                {position.current_holder.first_name?.[0]}{position.current_holder.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white/60">Titulaire actuel : </span>
                <span className="text-xs font-medium text-white">
                  {position.current_holder.first_name} {position.current_holder.last_name}
                </span>
              </div>
            </div>
          )}

          {/* Onglets */}
          <div className="flex gap-1 mt-3">
            {[
              { id: 'candidates', label: `Candidats (${candidates.length})` },
              { id: 'add',        label: '+ Nominer' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeTab === tab.id ? 'rgba(139,92,246,0.2)' : 'transparent',
                  color: activeTab === tab.id ? '#C4B5FD' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${activeTab === tab.id ? 'rgba(139,92,246,0.35)' : 'transparent'}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'candidates' && (
            <div className="p-4 flex flex-col gap-3">
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle size={24} className="text-white/20 mb-3" />
                  <div className="text-sm font-medium text-white/40">Aucun successeur identifié</div>
                  <div className="text-xs text-white/25 mt-1">Ce poste est à risque</div>
                  <button
                    onClick={() => setTab('add')}
                    className="mt-4 px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(139,92,246,0.2)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.3)' }}
                  >
                    Nominer un successeur
                  </button>
                </div>
              ) : (
                candidates
                  .sort((a, b) => {
                    const order = { ready_now: 0, ready_in_1_year: 1, ready_in_2_years: 2, potential: 3 }
                    return (order[a.readiness_level] ?? 4) - (order[b.readiness_level] ?? 4)
                  })
                  .map(plan => (
                    <div
                      key={plan.id}
                      className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="p-3 flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(139,92,246,0.2)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.3)' }}
                        >
                          {plan.candidate?.first_name?.[0]}{plan.candidate?.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {plan.candidate?.first_name} {plan.candidate?.last_name}
                          </div>
                          <div className="text-xs text-white/40">
                            {plan.candidate?.divisions?.name || roleLabel(plan.candidate?.role)}
                          </div>
                        </div>
                        <ReadinessBadge level={plan.readiness_level} />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditing(plan.id)
                              setEditRead(plan.readiness_level)
                              setEditNotes(plan.notes || '')
                            }}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white/70 transition-all text-[10px]"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleRemove(plan)}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Édition inline */}
                      <AnimatePresence>
                        {editingId === plan.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="px-3 pb-3 flex flex-col gap-2"
                              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                            >
                              <select
                                value={editReadiness}
                                onChange={e => setEditRead(e.target.value)}
                                className="mt-2 w-full rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                {Object.entries(READINESS_CONFIG).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <textarea
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Notes (optionnel)"
                                rows={2}
                                className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white resize-none focus:outline-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditing(null)}
                                  className="px-2.5 py-1 rounded-lg text-xs text-white/40 hover:bg-white/5 transition-all"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleUpdate(plan)}
                                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                                  style={{ background: 'rgba(139,92,246,0.2)', color: '#C4B5FD' }}
                                >
                                  <Check size={11} className="inline mr-1" />
                                  Enregistrer
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Notes */}
                      {plan.notes && editingId !== plan.id && (
                        <div className="px-3 pb-2">
                          <p className="text-[10px] text-white/30 italic">{plan.notes}</p>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="p-4 flex flex-col gap-3">
              {/* Barre de recherche */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <Search size={13} className="text-white/30 flex-shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un collaborateur..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none"
                />
                {searching && (
                  <div className="w-3 h-3 border-2 rounded-full animate-spin flex-shrink-0"
                    style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: '#8B5CF6' }} />
                )}
              </div>

              {/* Résultats */}
              <div className="flex flex-col gap-1.5">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:bg-white/[0.04] group"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {user.divisions?.name || roleLabel(user.role)}
                      </div>
                    </div>
                    {/* Actions rapides */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {[
                        { r: 'ready_now',        l: 'Prêt' },
                        { r: 'ready_in_1_year',  l: '1 an' },
                        { r: 'ready_in_2_years', l: '2 ans' },
                      ].map(({ r, l }) => (
                        <button
                          key={r}
                          onClick={() => handleNominate(user, r)}
                          disabled={nominate.isPending}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium transition-all hover:opacity-90"
                          style={{
                            background: READINESS_CONFIG[r].bg,
                            color: READINESS_CONFIG[r].color,
                            border: `1px solid ${READINESS_CONFIG[r].color}40`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="text-center py-6 text-xs text-white/30">
                    Aucun résultat pour « {searchQuery} »
                  </div>
                )}
                {searchQuery.length < 2 && (
                  <div className="text-center py-8 text-xs text-white/25">
                    Tapez au moins 2 caractères pour rechercher
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
