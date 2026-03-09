// ============================================================
// APEX RH — components/communication/MessageReadReceipts.jsx
// Session S87 — Accusés de lecture d'une annonce (adminOnly)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, X, Users, CheckCircle2, Download } from 'lucide-react'
import { useReadReceipts } from '../../hooks/useCommunication'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../utils/constants'

const ROLE_LABELS = {
  collaborateur:  'Collaborateur',
  chef_service:   'Chef de service',
  chef_division:  'Chef de division',
  directeur:      'Directeur',
  administrateur: 'Administrateur',
}

const ROLE_COLORS = {
  collaborateur:  '#06B6D4',
  chef_service:   '#10B981',
  chef_division:  '#8B5CF6',
  directeur:      '#C9A227',
  administrateur: '#EF4444',
}

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function exportCsv(receipts, title) {
  const rows = [
    ['Nom', 'Prénom', 'Rôle', 'Lu', 'Date de lecture'],
    ...receipts.map(r => [
      r.last_name, r.first_name,
      ROLE_LABELS[r.role] || r.role,
      r.has_read ? 'Oui' : 'Non',
      r.read_at ? formatDate(r.read_at) : '',
    ]),
  ]
  const csv = rows.map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `accusés_lecture_${title?.slice(0, 30) || 'annonce'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function MessageReadReceipts({ announcementId, announcementTitle, onClose }) {
  const { profile } = useAuth()
  const isAdmin = [ROLES.ADMINISTRATEUR, ROLES.DIRECTEUR].includes(profile?.role)
  const [filter, setFilter] = useState('all') // all | read | unread

  const { data: receipts = [], isLoading, error } = useReadReceipts(announcementId)

  if (!isAdmin) return null

  const filtered = receipts.filter(r => {
    if (filter === 'read')   return r.has_read
    if (filter === 'unread') return !r.has_read
    return true
  })

  const readCount   = receipts.filter(r => r.has_read).length
  const totalCount  = receipts.length
  const readPct     = totalCount > 0 ? Math.round(readCount / totalCount * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex flex-col h-full"
      style={{
        background: '#090920',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        overflow: 'hidden',
        minWidth: 360,
        maxWidth: 440,
      }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.06),transparent)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Eye size={14} style={{ color: '#10B981' }}/>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
              Accusés de lecture
            </h3>
            {announcementTitle && (
              <p className="text-[10px] text-white/35 truncate max-w-[180px]">{announcementTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {receipts.length > 0 && (
            <button
              onClick={() => exportCsv(receipts, announcementTitle)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
              title="Exporter CSV">
              <Download size={13}/>
            </button>
          )}
          {onClose && (
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
              <X size={14}/>
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && receipts.length > 0 && (
        <div className="px-5 py-3 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/40">
              <span className="font-semibold text-emerald-400">{readCount}</span> / {totalCount} ont lu
            </span>
            <span className="text-xs font-bold text-white/60">{readPct}%</span>
          </div>
          {/* Barre de progression */}
          <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg,#10B981,#059669)' }}
            />
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="px-5 py-2.5 flex gap-2 border-b border-white/[0.04] flex-shrink-0">
        {[
          { v: 'all',    label: 'Tous',     count: totalCount },
          { v: 'read',   label: 'Lu',       count: readCount },
          { v: 'unread', label: 'Non lu',   count: totalCount - readCount },
        ].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              filter === f.v
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-white/[0.07] text-white/35 hover:text-white/55 hover:border-white/12'
            }`}>
            {f.label}
            <span className="px-1 py-0 rounded-md text-[10px]"
              style={{ background: filter === f.v ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)' }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-white/25"/>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <p className="text-xs text-red-400">Impossible de charger les accusés de lecture.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Users size={28} className="text-white/15 mb-3"/>
            <p className="text-xs text-white/30">
              {filter === 'unread' ? 'Tout le monde a lu cette annonce ✓' : 'Aucun destinataire trouvé'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence initial={false}>
              {filtered.map((r, i) => (
                <motion.div
                  key={r.user_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.03 }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">

                  {/* Avatar initiales */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: `${ROLE_COLORS[r.role] || '#06B6D4'}20` }}>
                    {r.first_name?.[0]}{r.last_name?.[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">
                      {r.first_name} {r.last_name}
                    </p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-lg"
                      style={{
                        background: `${ROLE_COLORS[r.role] || '#06B6D4'}15`,
                        color: ROLE_COLORS[r.role] || '#06B6D4',
                      }}>
                      {ROLE_LABELS[r.role] || r.role}
                    </span>
                  </div>

                  {/* Statut lecture */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                    {r.has_read ? (
                      <>
                        <CheckCircle2 size={14} style={{ color: '#10B981' }}/>
                        {r.read_at && (
                          <span className="text-[9px] text-white/25">{formatDate(r.read_at)}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <EyeOff size={13} style={{ color: 'rgba(255,255,255,0.2)' }}/>
                        <span className="text-[9px] text-white/20">Non lu</span>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
