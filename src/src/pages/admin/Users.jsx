// ============================================================
// APEX RH — Users.jsx
// Session 15 — formKey + toggle_user_status RPC + logAudit
// Session 19 — Fix font-syne → style inline
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserPlus, Search, Filter, Shield, ChevronDown,
  Edit2, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLog'
import Modal from '../../components/ui/Modal'
import UserForm from '../../components/users/UserForm'
import ExportButton from '../../components/ui/ExportButton'
import { exportUsers } from '../../lib/exportExcel'

const ROLE_LABELS = {
  administrateur: 'Administrateur',
  directeur: 'Directeur',
  chef_division: 'Chef de Division',
  chef_service: 'Chef de Service',
  collaborateur: 'Collaborateur',
}

const ROLE_COLORS = {
  administrateur: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  directeur: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  chef_division: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  chef_service: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  collaborateur: 'bg-green-500/15 text-green-400 border-green-500/30',
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${ROLE_COLORS[role] || 'bg-white/10 text-white/50 border-white/10'}`}>
      <Shield size={10} />
      {ROLE_LABELS[role] || role}
    </span>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [formKey, setFormKey] = useState(0)

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, first_name, last_name, email, role, is_active, created_at,
        direction_id, division_id, service_id,
        directions!users_direction_id_fkey (name),
        divisions!users_division_id_fkey (name),
        services!users_service_id_fkey (name)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleStatus = async (user) => {
    const { data: newStatus, error } = await supabase
      .rpc('toggle_user_status', { target_user_id: user.id })

    if (error) {
      console.error('Erreur toggle statut:', error.message)
      return
    }

    const action = newStatus ? 'user_reactivated' : 'user_deactivated'
    logAudit(action, 'user', user.id, { name: `${user.first_name} ${user.last_name}` })
    setUsers((prev) =>
      prev.map((u) => u.id === user.id ? { ...u, is_active: newStatus } : u)
    )
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.first_name + ' ' + u.last_name)?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'tous' || u.role === filterRole
    const matchStatus =
      filterStatus === 'tous' ||
      (filterStatus === 'actif' && u.is_active) ||
      (filterStatus === 'inactif' && !u.is_active)
    return matchSearch && matchRole && matchStatus
  })

  const getOrgLabel = (user) => {
    switch (user.role) {
      case 'directeur':
        return { label: user.directions?.name || '—', color: 'text-purple-400/70' }
      case 'chef_division':
        return { label: user.divisions?.name || '—', color: 'text-blue-400/70' }
      case 'chef_service':
      case 'collaborateur':
        return { label: user.services?.name || '—', color: 'text-cyan-400/70' }
      default:
        return { label: '—', color: 'text-white/30' }
    }
  }

  const openCreate = () => {
    setEditUser(null)
    setFormKey((k) => k + 1)
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditUser(user)
    setFormKey((k) => k + 1)
    setModalOpen(true)
  }

  const handleSuccess = () => { setModalOpen(false); fetchUsers() }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            <Users size={24} className="text-indigo-400" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
            title="Rafraîchir"
          >
            <RefreshCw size={16} />
          </button>
          <ExportButton onExport={() => exportUsers(users)} label="Excel" disabled={users.length === 0} />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/20"
          >
            <UserPlus size={16} />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="tous" className="bg-[#1A1A2E]">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v} className="bg-[#1A1A2E]">{l}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 pr-8 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="tous" className="bg-[#1A1A2E]">Tous les statuts</option>
            <option value="actif" className="bg-[#1A1A2E]">Actifs</option>
            <option value="inactif" className="bg-[#1A1A2E]">Inactifs</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30 text-sm">
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={36} className="text-white/10" />
            <p className="text-white/30 text-sm">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider hidden md:table-cell">Organisation</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider hidden lg:table-cell">Division / Service</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((user, index) => {
                  const org = getOrgLabel(user)
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-sm font-semibold flex-shrink-0">
                            {(user.first_name || user.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-white/40">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-5 py-4 hidden md:table-cell">
                        {user.role === 'directeur' ? (
                          <span className="text-sm text-purple-400/80">{user.directions?.name || '—'}</span>
                        ) : user.role === 'chef_division' ? (
                          <span className="text-sm text-blue-400/80">{user.divisions?.name || '—'}</span>
                        ) : (
                          <span className="text-sm text-white/30">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 hidden lg:table-cell">
                        {['chef_service', 'collaborateur'].includes(user.role) ? (
                          <div>
                            {user.divisions?.name && (
                              <p className="text-xs text-white/40 mb-0.5">{user.divisions.name}</p>
                            )}
                            <span className="text-sm text-cyan-400/80">{user.services?.name || '—'}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-white/30">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                            title="Modifier"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => toggleStatus(user)}
                            className={`p-1.5 rounded-lg transition-all ${
                              user.is_active
                                ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10'
                                : 'text-white/30 hover:text-green-400 hover:bg-green-500/10'
                            }`}
                            title={user.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {user.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-white/30 text-right">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
        </p>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
        size="md"
      >
        <UserForm
          key={formKey}
          user={editUser}
          onSuccess={handleSuccess}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  )
}