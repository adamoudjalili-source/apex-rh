// ============================================================
// APEX RH — pages/communication/Annonces.jsx
// Session S65 — Fil d'annonces RH & direction
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, Pin, Loader2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAnnonces } from '../../hooks/useAnnonces'
import AnnouncementCard from '../../components/communication/AnnouncementCard'
import AnnouncementForm from '../../components/communication/AnnouncementForm'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../utils/constants'

const FILTERS = [
  { value: 'all',    label: 'Toutes' },
  { value: 'pinned', label: 'Épinglées' },
  { value: 'recent', label: 'Récentes' },
]

export default function AnnoncesPage() {
  const navigate  = useNavigate()
  const { profile } = useAuth()
  const [filter, setFilter]   = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editAnnonce, setEditAnnonce] = useState(null)

  const { data: annonces = [], isLoading } = useAnnonces({
    pinned: filter === 'pinned' ? true : undefined,
  })

  const isAdmin = [ROLES.ADMINISTRATEUR, ROLES.DIRECTEUR, ROLES.CHEF_DIVISION, ROLES.CHEF_SERVICE].includes(profile?.role)

  const pinnedAnnonces = annonces.filter(a => a.pinned)
  const otherAnnonces  = annonces.filter(a => !a.pinned)

  const handleEdit = (ann) => {
    setEditAnnonce(ann)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditAnnonce(null)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06] flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,rgba(201,162,39,0.05) 0%,transparent 100%)' }}>

        <button onClick={() => navigate('/communication')}
          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 mb-4 transition-colors">
          <ArrowLeft size={12}/> Communication
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.2)' }}>
              <Megaphone size={16} style={{ color: '#C9A227' }}/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                Annonces
              </h1>
              <p className="text-xs text-white/35">Actualités RH et direction</p>
            </div>
          </div>

          {isAdmin && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#B88B1A,#C9A227)' }}>
              <Plus size={14}/> Nouvelle annonce
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mt-4">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                filter === f.value
                  ? 'text-white border-amber-500/40 bg-amber-500/10'
                  : 'text-white/40 border-white/[0.08] hover:text-white/60 hover:border-white/15'
              }`}>
              {f.value === 'pinned' && <Pin size={10}/>}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-6 py-6 max-w-3xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-white/30"/>
          </div>
        ) : annonces.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.15)' }}>
              <Megaphone size={28} style={{ color: '#C9A227', opacity: 0.4 }}/>
            </div>
            <h3 className="text-sm font-semibold text-white/40 mb-2">Aucune annonce</h3>
            <p className="text-xs text-white/25 text-center">
              {isAdmin
                ? 'Créez la première annonce pour votre équipe.'
                : 'Les annonces de votre organisation apparaîtront ici.'}
            </p>
            {isAdmin && (
              <button onClick={() => setShowForm(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.2)' }}>
                <Plus size={14}/> Rédiger une annonce
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-5">
            {/* Épinglées */}
            {pinnedAnnonces.length > 0 && filter !== 'recent' && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Pin size={11} className="text-amber-400"/>
                  <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                    Épinglées
                  </span>
                </div>
                {pinnedAnnonces.map(ann => (
                  <AnnouncementCard key={ann.id} annonce={ann} onEdit={handleEdit}/>
                ))}
                {otherAnnonces.length > 0 && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/[0.06]"/>
                    <span className="text-[10px] text-white/20 uppercase tracking-wider">Récentes</span>
                    <div className="flex-1 h-px bg-white/[0.06]"/>
                  </div>
                )}
              </>
            )}

            {/* Autres */}
            {(filter === 'pinned' ? [] : otherAnnonces).map(ann => (
              <AnnouncementCard key={ann.id} annonce={ann} onEdit={handleEdit}/>
            ))}
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-2xl">
              <AnnouncementForm annonce={editAnnonce} onClose={handleClose}/>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
