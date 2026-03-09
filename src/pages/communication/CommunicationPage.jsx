// ============================================================
// APEX RH — pages/communication/CommunicationPage.jsx
// Session S65 — Hub Communication (landing + 3 cards)
// ============================================================
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Megaphone, GitBranch, ArrowRight, Search } from 'lucide-react'
import { useUnreadCount, useSearch, useChannelsRealtime } from '../../hooks/useCommunication'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'
import { ROLES } from '../../utils/constants'

const CARDS = [
  {
    id:          'messages',
    label:       'Messagerie',
    description: 'Conversations 1:1, groupes et canaux thématiques en temps réel',
    icon:        MessageCircle,
    path:        '/communication/messages',
    color:       '#06B6D4',
    badge:       true,
    features:    ['Canaux par équipe & division', 'Messages directs', 'Pièces jointes', 'Réactions emoji', 'Résumé IA'],
  },
  {
    id:          'annonces',
    label:       'Annonces',
    description: 'Actualités RH et direction — épingles, réactions, commentaires',
    icon:        Megaphone,
    path:        '/communication/annonces',
    color:       '#C9A227',
    badge:       false,
    features:    ['Publications RH/direction', 'Ciblage par rôle', 'Réactions & commentaires', 'Épingles', 'Images de couverture'],
  },
  {
    id:          'fils',
    label:       'Fils de discussion',
    description: 'Discussions contextuelles liées à vos projets, objectifs et campagnes',
    icon:        GitBranch,
    path:        '/communication/fils',
    color:       '#8B5CF6',
    badge:       false,
    features:    ['Lié à vos projets', 'Objectifs OKR', 'Campagnes d\'entretiens', 'Temps réel', 'Réactions'],
  },
]

function SearchResults({ query, results = [], loading }) {
  if (!query || query.length < 2) return null

  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="animate-pulse space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-8 bg-white/[0.04] rounded-xl"/>)}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {results.length === 0 ? (
        <p className="p-4 text-sm text-white/30 text-center">Aucun résultat pour "{query}"</p>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: r.result_type === 'message' ? 'rgba(6,182,212,0.12)' : 'rgba(201,162,39,0.12)',
                  border: `1px solid ${r.result_type === 'message' ? 'rgba(6,182,212,0.2)' : 'rgba(201,162,39,0.2)'}`,
                }}>
                {r.result_type === 'message'
                  ? <MessageCircle size={13} style={{ color: '#06B6D4' }}/>
                  : <Megaphone size={13} style={{ color: '#C9A227' }}/>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/70">{r.title}</p>
                <p className="text-xs text-white/35 truncate mt-0.5">{r.excerpt}</p>
              </div>
              <span className="text-[10px] text-white/25 flex-shrink-0">
                {new Date(r.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommunicationPage() {
  const navigate   = useNavigate()
  const { profile } = useAuth()
  const [query, setQuery] = useState('')

  const { data: unreadCount = 0 } = useUnreadCount()
  const { data: searchResults = [], isLoading: searching } = useSearch(query)

  useChannelsRealtime()


  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero header */}
      <div className="px-8 pt-8 pb-0 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,rgba(6,182,212,0.04) 0%,transparent 100%)' }}>

        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg,transparent,#06B6D4,#8B5CF6,transparent)' }}/>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <MessageCircle size={22} style={{ color: '#06B6D4' }}/>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                Communication
              </h1>
              <p className="text-sm text-white/35 mt-0.5">
                Messagerie, annonces et discussions d'équipe
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border"
              style={{ border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)' }}>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"/>
              <span className="text-sm font-semibold text-cyan-300">
                {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </div>

        {/* Recherche globale */}
        <div className="relative max-w-xl mb-8">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"/>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher dans tous les messages et annonces..."
            className="w-full bg-white/[0.05] border border-white/[0.09] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm">
              ✕
            </button>
          )}
        </div>

        <SearchResults query={query} results={searchResults} loading={searching}/>
      </div>

      {/* 3 cards */}
      <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {CARDS.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              onClick={() => navigate(card.path)}
              className="text-left rounded-2xl border overflow-hidden group transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border:     '1px solid rgba(255,255,255,0.07)',
              }}>

              {/* Gradient top */}
              <div className="h-24 flex items-center px-6 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg,${card.color}15,${card.color}06)` }}>
                <div className="absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg,transparent,${card.color},transparent)` }}/>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `${card.color}18`, border: `1px solid ${card.color}30` }}>
                  <Icon size={22} style={{ color: card.color }}/>
                </div>

                {card.badge && unreadCount > 0 && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ background: card.color }}>
                    {unreadCount}
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                    {card.label}
                  </h2>
                  <ArrowRight size={15} className="text-white/20 group-hover:text-white/50 transition-colors group-hover:translate-x-0.5 transition-transform"/>
                </div>
                <p className="text-xs text-white/45 mb-4 leading-relaxed">{card.description}</p>

                <div className="space-y-1.5">
                  {card.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: card.color }}/>
                      <span className="text-xs text-white/35">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Stats rapides */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Non lus',     value: unreadCount, color: '#06B6D4' },
            { label: 'Canaux actifs', value: '—',       color: '#8B5CF6' },
            { label: 'Annonces',      value: '—',       color: '#C9A227' },
          ].map(stat => (
            <div key={stat.label}
              className="rounded-2xl border px-5 py-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-2xl font-bold mb-1" style={{ color: stat.color, fontFamily: "'Syne',sans-serif" }}>
                {stat.value}
              </p>
              <p className="text-xs text-white/35">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
