// ============================================================
// APEX RH — ProjectMembers.jsx
// Session 11 — Gestion des membres du projet
// ============================================================
import { useState } from 'react'
import { Plus, Trash2, Users, Crown, Eye, UserCircle } from 'lucide-react'
import { useAddMember, useUpdateMemberRole, useRemoveMember, useAllUsersForProject } from '../../hooks/useProjects'
import { getMemberRoleInfo, getUserFullName } from '../../lib/projectHelpers'

const ROLE_ICONS = {
  chef_projet: Crown,
  membre: UserCircle,
  observateur: Eye,
}

export default function ProjectMembers({ members = [], projectId, canManage }) {
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState('membre')

  const { data: allUsers = [] } = useAllUsersForProject()
  const addMember = useAddMember()
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()

  // Exclure les utilisateurs déjà membres
  const memberIds = new Set(members.map((m) => m.user_id))
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id))

  const handleAdd = async () => {
    if (!selectedUser) return
    try {
      await addMember.mutateAsync({
        projectId,
        userId: selectedUser,
        role: selectedRole,
      })
      setSelectedUser('')
      setSelectedRole('membre')
      setShowAdd(false)
    } catch (err) { }
  }

  const handleRoleChange = async (member, newRole) => {
    try {
      await updateRole.mutateAsync({ id: member.id, role: newRole, projectId })
    } catch (err) { }
  }

  const handleRemove = async (member) => {
    const name = getUserFullName(member.user)
    if (!confirm(`Retirer ${name} du projet ?`)) return
    try {
      await removeMember.mutateAsync({ id: member.id, projectId })
    } catch (err) { }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          Équipe ({members.length})
        </h3>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <Plus size={12} /> Ajouter
          </button>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {showAdd && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex gap-2">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1a1a35]">Sélectionner un utilisateur…</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#1a1a35]">
                  {`${u.first_name} ${u.last_name}`.trim()} — {u.role}
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="chef_projet" className="bg-[#1a1a35]">Chef de projet</option>
              <option value="membre" className="bg-[#1a1a35]">Membre</option>
              <option value="observateur" className="bg-[#1a1a35]">Observateur</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedUser || addMember.isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-40 transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Liste des membres */}
      {members.length === 0 && (
        <p className="text-xs text-white/20 text-center py-6">Aucun membre</p>
      )}

      <div className="space-y-1">
        {members.map((m) => {
          const roleInfo = getMemberRoleInfo(m.role)
          const RoleIcon = ROLE_ICONS[m.role] || UserCircle
          const initiale = m.user?.first_name?.charAt(0) || '?'

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 uppercase"
                style={{ background: `${roleInfo.color}25`, color: roleInfo.color }}
              >
                {initiale}
              </div>

              {/* Nom */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">
                  {getUserFullName(m.user)}
                </p>
                <p className="text-[10px] text-white/20">{m.user?.role}</p>
              </div>

              {/* Rôle */}
              {canManage ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m, e.target.value)}
                  className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-medium focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                  style={{ color: roleInfo.color }}
                >
                  <option value="chef_projet" className="bg-[#1a1a35]">Chef de projet</option>
                  <option value="membre" className="bg-[#1a1a35]">Membre</option>
                  <option value="observateur" className="bg-[#1a1a35]">Observateur</option>
                </select>
              ) : (
                <span className={`flex items-center gap-1 text-[10px] font-medium ${roleInfo.text}`}>
                  <RoleIcon size={10} />
                  {roleInfo.label}
                </span>
              )}

              {/* Supprimer */}
              {canManage && (
                <button
                  onClick={() => handleRemove(m)}
                  className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
