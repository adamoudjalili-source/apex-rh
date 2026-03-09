// ============================================================
// APEX RH — components/communication/ConversationList.jsx
// Session S65 — Liste des canaux / conversations (sidebar interne)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hash, Lock, Users, Plus, ChevronDown, ChevronRight,
  MessageCircle, Search, X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../utils/constants'

const TYPE_ICONS = {
  general:   Hash,
  thematic:  Hash,
  team:      Users,
  division:  Users,
  direct:    MessageCircle,
  private:   Lock,
  direction: Lock,
}

const TYPE_LABELS = {
  general:   'Général',
  thematic:  'Thématique',
  team:      'Équipe',
  division:  'Division',
  direct:    'Messages directs',
  private:   'Privé',
  direction: 'Direction',
}

function UnreadDot({ count }) {
  if (!count) return null
  return (
    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{ background: '#06B6D4', padding: '0 4px' }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ChannelItem({ channel, active, onClick, unreadCount }) {
  const Icon = TYPE_ICONS[channel.type] || Hash
  return (
    <button
      onClick={() => onClick(channel)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all group ${
        active
          ? 'text-white'
          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
      }`}
      style={active ? { background: 'rgba(6,182,212,0.12)', color: '#06B6D4' } : undefined}>
      <Icon size={13} className="flex-shrink-0 opacity-70"/>
      <span className="truncate flex-1 text-left font-medium">{channel.name}</span>
      {unreadCount > 0 && !active && <UnreadDot count={unreadCount}/>}
      {active && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"/>}
    </button>
  )
}

export default function ConversationList({
  channels = [],
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  unreadCounts = {},
}) {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [groupsOpen, setGroupsOpen] = useState({ canaux: true, direct: true })

  const filtered = channels.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  const canaux = filtered.filter(c => !['direct'].includes(c.type))
  const directs = filtered.filter(c => c.type === 'direct')
  const isAdmin = [ROLES.ADMINISTRATEUR, ROLES.DIRECTEUR].includes(profile?.role)

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={14} style={{ color: '#06B6D4' }}/>
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Messagerie
            </span>
            {totalUnread > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: '#06B6D4' }}>
                {totalUnread}
              </span>
            )}
          </div>
          {isAdmin && (
            <button onClick={onCreateChannel}
              className="p-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              title="Nouveau canal">
              <Plus size={14}/>
            </button>
          )}
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-7 pr-7 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X size={11}/>
            </button>
          )}
        </div>
      </div>

      {/* Canaux */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">

        {/* Section Canaux */}
        {canaux.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setGroupsOpen(o => ({ ...o, canaux: !o.canaux }))}
              className="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors rounded">
              {groupsOpen.canaux
                ? <ChevronDown size={10}/>
                : <ChevronRight size={10}/>}
              Canaux
            </button>
            <AnimatePresence>
              {groupsOpen.canaux && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}>
                  {canaux.map(ch => (
                    <ChannelItem
                      key={ch.id}
                      channel={ch}
                      active={ch.id === activeChannelId}
                      onClick={onSelectChannel}
                      unreadCount={unreadCounts[ch.id] || 0}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Section Messages directs */}
        {directs.length > 0 && (
          <div>
            <button
              onClick={() => setGroupsOpen(o => ({ ...o, direct: !o.direct }))}
              className="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors rounded">
              {groupsOpen.direct
                ? <ChevronDown size={10}/>
                : <ChevronRight size={10}/>}
              Messages directs
            </button>
            <AnimatePresence>
              {groupsOpen.direct && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}>
                  {directs.map(ch => (
                    <ChannelItem
                      key={ch.id}
                      channel={ch}
                      active={ch.id === activeChannelId}
                      onClick={onSelectChannel}
                      unreadCount={unreadCounts[ch.id] || 0}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center">
            <MessageCircle size={24} className="mx-auto mb-2 text-white/20"/>
            <p className="text-xs text-white/30">
              {search ? 'Aucun canal trouvé' : 'Aucun canal disponible'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
