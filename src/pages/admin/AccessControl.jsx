// ============================================================
// APEX RH — AccessControl.jsx
// Session 91 — Module 9 Administration — Onglet "Contrôle d'accès"
// Matrice rôles × modules (lecture seule) + Journal d'audit RBAC
// RBAC V2 : can('admin','access_control','read') via usePermission()
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, BookOpen, Clock, Search, Filter,
  RefreshCw, ChevronLeft, ChevronRight, User,
  ArrowUpRight, ArrowDownRight, ShieldCheck, ShieldOff,
  AlertTriangle, Key,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { supabase } from '../../lib/supabase'
import AccessControlMatrix from '../../components/admin/AccessControlMatrix'

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4,0,0.2,1] } } }

// ---- Constantes ----
const TABS = [
  { key: 'matrix',  label: 'Matrice des rôles', icon: Shield },
  { key: 'journal', label: 'Journal RBAC',       icon: BookOpen },
]

const CATEGORY_OPTIONS = [
  { value: 'rbac',   label: 'RBAC', color: '#F59E0B' },
  { value: 'admin',  label: 'Admin', color: '#EF4444' },
  { value: 'action', label: 'Action', color: '#6B7280' },
]

const ACTION_ICONS = {
  role_changed:        { icon: Key,          color: '#F59E0B', label: 'Changement de rôle' },
  permission_granted:  { icon: ShieldCheck,  color: '#22C55E', label: 'Permission accordée' },
  permission_revoked:  { icon: ShieldOff,    color: '#EF4444', label: 'Permission révoquée' },
  permission_override: { icon: AlertTriangle, color: '#F97316', label: 'Surcharge individuelle' },
  login:               { icon: ArrowUpRight, color: '#6B7280', label: 'Connexion' },
  logout:              { icon: ArrowDownRight, color: '#6B7280', label: 'Déconnexion' },
}

const PAGE_SIZE = 20

// ---- Sous-composant : Journal RBAC ----
function RbacJournal({ orgId }) {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('rbac')
  const [page, setPage]         = useState(0)
  const [total, setTotal]       = useState(0)
  const [users, setUsers]       = useState({})

  const fetchUsers = useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('organization_id', orgId)
    if (data) {
      const map = {}
      data.forEach(u => { map[u.id] = u })
      setUsers(map)
    }
  }, [orgId])

  const fetchLogs = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (category !== 'all') {
        query = query.eq('category', category)
      }
      if (search.trim()) {
        query = query.ilike('action', `%${search.trim()}%`)
      }

      const { data, error, count } = await query
      if (!error) {
        setLogs(data || [])
        setTotal(count || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId, category, page, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { setPage(0) }, [category, search])

  function getUserLabel(userId) {
    if (!userId) return '—'
    const u = users[userId]
    if (!u) return userId.slice(0, 8) + '…'
    return `${u.first_name} ${u.last_name}`
  }

  function formatDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function getActionMeta(action) {
    return ACTION_ICONS[action] || { icon: Shield, color: '#6B7280', label: action }
  }

  function getCategoryBadge(cat) {
    const opt = CATEGORY_OPTIONS.find(o => o.value === cat)
    if (!opt) return null
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
        style={{ color: opt.color, background: `${opt.color}15`, borderColor: `${opt.color}30` }}>
        {opt.label}
      </span>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une action…"
            className="w-full h-9 bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:border-white/20"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-white/3">
          <button
            onClick={() => setCategory('rbac')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${category === 'rbac' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}>
            RBAC
          </button>
          <button
            onClick={() => setCategory('admin')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${category === 'admin' ? 'bg-red-500/20 text-red-400' : 'text-white/40 hover:text-white/60'}`}>
            Admin
          </button>
          <button
            onClick={() => setCategory('all')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${category === 'all' ? 'bg-white/10 text-white/80' : 'text-white/40 hover:text-white/60'}`}>
            Tout
          </button>
        </div>
        <button
          onClick={fetchLogs}
          className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="text-xs text-white/30">
        {loading ? 'Chargement…' : `${total.toLocaleString('fr-FR')} entrée${total > 1 ? 's' : ''} • Page ${page + 1} / ${Math.max(1, totalPages)}`}
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {/* Header */}
        <div className="grid text-[10px] text-white/30 font-semibold uppercase tracking-wider px-4 py-2.5 border-b border-white/8 bg-white/2"
          style={{ gridTemplateColumns: '180px 1fr 160px 140px 80px' }}>
          <span>Date</span>
          <span>Détails</span>
          <span>Utilisateur concerné</span>
          <span>Action par</span>
          <span>Catégorie</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={18} className="animate-spin text-white/20" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Shield size={28} className="text-white/15" />
            <p className="text-sm text-white/30">Aucune entrée d'audit pour ce filtre</p>
          </div>
        ) : (
          logs.map((log, i) => {
            const meta = getActionMeta(log.action)
            const ActionIcon = meta.icon
            const details = log.details || {}
            return (
              <div
                key={log.id || i}
                className="grid items-start px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors text-[11px]"
                style={{ gridTemplateColumns: '180px 1fr 160px 140px 80px' }}>
                <span className="text-white/40 leading-relaxed">{formatDate(log.created_at)}</span>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${meta.color}15` }}>
                    <ActionIcon size={10} style={{ color: meta.color }} />
                  </div>
                  <div>
                    <p className="text-white/70 font-medium">{meta.label}</p>
                    {details.old_role && details.new_role && (
                      <p className="text-white/35 text-[10px] mt-0.5">
                        <span className="text-white/45">{details.old_role}</span>
                        {' → '}
                        <span className="text-white/65">{details.new_role}</span>
                      </p>
                    )}
                    {details.module && details.resource && (
                      <p className="text-white/35 text-[10px] mt-0.5">
                        {details.module} / {details.resource}
                        {details.action && ` / ${details.action}`}
                      </p>
                    )}
                    {details.reason && (
                      <p className="text-white/30 text-[10px] mt-0.5 italic">{details.reason}</p>
                    )}
                  </div>
                </div>
                <span className="text-white/45">
                  {getUserLabel(log.target_user_id || (details && details.target_user_id))}
                </span>
                <span className="text-white/45">
                  {getUserLabel(log.user_id)}
                </span>
                <div>{getCategoryBadge(log.category || 'action')}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs text-white/40">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Composant principal ----
export default function AccessControl() {
  const { organization_id: orgId } = useAuth()
  const { can } = usePermission()
  const [activeTab, setActiveTab] = useState('matrix')

  // Guard RBAC — admin uniquement
  if (!can('admin', 'access_control', 'read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-sm text-white/40">Accès restreint — administrateur requis</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.03) 0%, transparent 200px)' }}>

      <div className="px-6 pt-8 pb-10 space-y-6">

        {/* Header */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Shield size={16} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}>
                Contrôle d'accès
              </h1>
              <p className="text-sm text-white/35">
                Matrice des permissions par rôle · Journal d'audit RBAC
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full border"
              style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }}>
              Phase A — RBAC Wrapper
            </span>
            <span className="text-[11px] text-white/30">
              Les surcharges individuelles sont gérées dans la fiche employé (onglet Accès &amp; Droits)
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-1 p-1 rounded-xl border border-white/8 w-fit"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: isActive ? 'rgba(239,68,68,0.12)' : 'transparent',
                    color: isActive ? '#EF4444' : 'rgba(255,255,255,0.4)',
                    border: isActive ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
                  }}>
                  <Icon size={13} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Tab content */}
        <motion.div variants={fadeUp}>
          <AnimatePresence mode="wait">
            {activeTab === 'matrix' && (
              <motion.div key="matrix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AccessControlMatrix />
              </motion.div>
            )}
            {activeTab === 'journal' && (
              <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RbacJournal orgId={orgId} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </motion.div>
  )
}
