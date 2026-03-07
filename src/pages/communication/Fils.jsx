// ============================================================
// APEX RH — pages/communication/Fils.jsx
// Session S65 — Fils de discussion contextuels
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, ArrowLeft, Loader2, MessageSquare, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFils, ENTITY_TYPE_LABELS, ENTITY_TYPE_COLORS } from '../../hooks/useFils'
import ThreadPanel from '../../components/communication/ThreadPanel'

const ENTITY_TYPES = ['all', 'project', 'objective', 'campaign', 'review', 'task']

function FilCard({ fil, onOpen }) {
  const color    = ENTITY_TYPE_COLORS[fil.entity_type] || '#06B6D4'
  const label    = ENTITY_TYPE_LABELS[fil.entity_type] || fil.entity_type
  const msgCount = fil.messages?.[0]?.count || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden group transition-all hover:border-white/15 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      onClick={() => onOpen(fil)}>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <GitBranch size={16} style={{ color }}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color }}>
                {label}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white/80 truncate">
              {fil.title || `Fil #${fil.id.slice(0,8)}`}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[11px] text-white/30">
                <MessageSquare size={10}/> {msgCount} message{msgCount !== 1 ? 's' : ''}
              </span>
              {fil.creator && (
                <span className="text-[11px] text-white/25">
                  par {fil.creator.first_name} {fil.creator.last_name}
                </span>
              )}
              <span className="text-[11px] text-white/25 ml-auto">
                {new Date(fil.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function FilsPage() {
  const navigate = useNavigate()
  const [typeFilter, setTypeFilter] = useState('all')
  const [openFil, setOpenFil] = useState(null)

  const { data: fils = [], isLoading } = useFils({
    entityType: typeFilter !== 'all' ? typeFilter : undefined,
  })

  return (
    <div className="flex h-full overflow-hidden">
      {/* Liste fils */}
      <div className={`flex flex-col ${openFil ? 'hidden md:flex md:w-80 md:flex-shrink-0' : 'flex-1'} border-r border-white/[0.06] overflow-hidden`}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0"
          style={{ background: 'linear-gradient(180deg,rgba(139,92,246,0.05) 0%,transparent 100%)' }}>

          <button onClick={() => navigate('/communication')}
            className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 mb-4 transition-colors">
            <ArrowLeft size={12}/> Communication
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <GitBranch size={16} style={{ color: '#8B5CF6' }}/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                Fils de discussion
              </h1>
              <p className="text-xs text-white/35">Discussions contextuelles</p>
            </div>
          </div>

          {/* Filtres type */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {ENTITY_TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  typeFilter === t
                    ? 'text-white border-purple-500/40 bg-purple-500/10'
                    : 'text-white/40 border-white/[0.08] hover:text-white/60'
                }`}>
                {t === 'all' ? 'Tous' : ENTITY_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-white/30"/>
            </div>
          ) : fils.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <GitBranch size={32} className="mb-3 text-white/15"/>
              <p className="text-sm text-white/35 font-medium mb-1">Aucun fil de discussion</p>
              <p className="text-xs text-white/25 text-center max-w-48">
                Les fils s'ouvrent depuis vos projets, objectifs et campagnes d'entretiens.
              </p>
            </div>
          ) : (
            fils.map(fil => (
              <FilCard key={fil.id} fil={fil} onOpen={setOpenFil}/>
            ))
          )}
        </div>
      </div>

      {/* Panel fil ouvert */}
      <AnimatePresence>
        {openFil && (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex-1 min-w-0 p-4">
            <ThreadPanel
              entityType={openFil.entity_type}
              entityId={openFil.entity_id}
              entityTitle={openFil.title}
              onClose={() => setOpenFil(null)}
              className="h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder si rien d'ouvert sur desktop */}
      {!openFil && fils.length > 0 && (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <GitBranch size={32} className="mx-auto mb-3 text-white/15"/>
            <p className="text-sm text-white/35">Sélectionnez un fil pour l'ouvrir</p>
          </div>
        </div>
      )}
    </div>
  )
}
