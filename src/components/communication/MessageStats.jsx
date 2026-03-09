// ============================================================
// APEX RH — components/communication/MessageStats.jsx
// Session S87 — Statistiques de lecture d'une annonce
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Users, Clock, ChevronRight } from 'lucide-react'
import { useAnnouncementStats } from '../../hooks/useCommunication'
import { useAuth } from '../../contexts/AuthContext'
import MessageReadReceipts from './MessageReadReceipts'
import { ROLES } from '../../utils/constants'

function formatRelative(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `il y a ${days}j`
}

export default function MessageStats({ announcementId, announcementTitle, compact = false }) {
  const { profile } = useAuth()
  const isAdmin = [ROLES.ADMINISTRATEUR, ROLES.DIRECTEUR].includes(profile?.role)
  const [showReceipts, setShowReceipts] = useState(false)

  const { data: stats, isLoading } = useAnnouncementStats(announcementId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-1.5 w-16 rounded-full bg-white/[0.07]"/>
        <div className="h-3 w-8 rounded bg-white/[0.05]"/>
      </div>
    )
  }

  if (!stats) return null

  const readPct       = parseFloat(stats.read_pct) || 0
  const readCount     = parseInt(stats.read_count) || 0
  const totalRecip    = parseInt(stats.total_recipients) || 0
  const lastReadAt    = stats.last_read_at

  // Couleur de la barre selon le taux
  const barColor =
    readPct >= 80 ? '#10B981' :
    readPct >= 50 ? '#C9A227' :
    readPct >= 20 ? '#F97316' :
    '#EF4444'

  if (compact) {
    // Version compacte : juste la barre + pourcentage
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.06]" style={{ minWidth: 40 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${readPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: barColor }}
          />
        </div>
        <span className="text-[10px] font-semibold" style={{ color: barColor }}>
          {readPct}%
        </span>
        {isAdmin && (
          <button
            onClick={() => setShowReceipts(true)}
            className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/55 transition-colors">
            <Eye size={10}/>
            {readCount}/{totalRecip}
          </button>
        )}

        {/* Panel accusés */}
        {showReceipts && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-end p-6"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowReceipts(false) }}>
            <div style={{ height: '80vh' }}>
              <MessageReadReceipts
                announcementId={announcementId}
                announcementTitle={announcementTitle}
                onClose={() => setShowReceipts(false)}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Version complète (dans l'admin panel)
  return (
    <>
      <div className="rounded-2xl border p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye size={13} style={{ color: '#10B981' }}/>
            <span className="text-xs font-semibold text-white/60">Taux de lecture</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowReceipts(true)}
              className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 transition-colors">
              Détail
              <ChevronRight size={11}/>
            </button>
          )}
        </div>

        {/* Barre principale */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-2xl font-bold" style={{ color: barColor, fontFamily: "'Syne',sans-serif" }}>
              {readPct}%
            </span>
            <span className="text-xs text-white/35">
              {readCount} / {totalRecip} destinataires
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg,${barColor}cc,${barColor})` }}
            />
          </div>
        </div>

        {/* Métriques secondaires */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              icon: <Users size={11}/>,
              value: totalRecip,
              label: 'Destinataires',
              color: '#06B6D4',
            },
            {
              icon: <Eye size={11}/>,
              value: readCount,
              label: 'Ont lu',
              color: '#10B981',
            },
            {
              icon: <Clock size={11}/>,
              value: lastReadAt ? formatRelative(lastReadAt) : '—',
              label: 'Dernière lecture',
              color: '#8B5CF6',
            },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-2.5"
              style={{ background: `${m.color}08`, border: `1px solid ${m.color}15` }}>
              <div className="flex items-center gap-1 mb-1" style={{ color: m.color }}>
                {m.icon}
                <span className="text-[10px] font-semibold">{m.value}</span>
              </div>
              <p className="text-[9px] text-white/30">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel accusés de lecture */}
      {showReceipts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end p-6"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReceipts(false) }}>
          <div style={{ height: '80vh' }}>
            <MessageReadReceipts
              announcementId={announcementId}
              announcementTitle={announcementTitle}
              onClose={() => setShowReceipts(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
