// ============================================================
// APEX RH — TaskTagPicker.jsx  ·  S125-A
// Sélecteur de tags colorés pour les tâches
// Création inline + multi-sélection
// ============================================================
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const TAG_PALETTE = [
  '#EF4444','#F97316','#F59E0B','#EAB308',
  '#22C55E','#10B981','#06B6D4','#3B82F6',
  '#8B5CF6','#EC4899','#6B7280','#1D4ED8',
]

// ─── Hooks tags ──────────────────────────────────────────────
export function useTaskTags() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['task_tags', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_tags')
        .select('id, name, color')
        .eq('organization_id', profile.organization_id)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 60000,
  })
}

export function useTaskTagLinks(taskId) {
  return useQuery({
    queryKey: ['task_tag_links', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_tag_links')
        .select('tag_id, task_tags(id, name, color)')
        .eq('task_id', taskId)
      if (error) throw error
      return (data || []).map(l => l.task_tags).filter(Boolean)
    },
    enabled: !!taskId,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ name, color }) => {
      const { data, error } = await supabase
        .from('task_tags')
        .insert({ organization_id: profile.organization_id, name: name.trim(), color, created_by: profile.id })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_tags'] }),
  })
}

export function useLinkTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, tagId }) => {
      const { error } = await supabase
        .from('task_tag_links').insert({ task_id: taskId, tag_id: tagId })
      if (error && !error.message.includes('duplicate')) throw error
    },
    onSuccess: (_, { taskId }) => qc.invalidateQueries({ queryKey: ['task_tag_links', taskId] }),
  })
}

export function useUnlinkTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, tagId }) => {
      const { error } = await supabase
        .from('task_tag_links').delete().eq('task_id', taskId).eq('tag_id', tagId)
      if (error) throw error
    },
    onSuccess: (_, { taskId }) => qc.invalidateQueries({ queryKey: ['task_tag_links', taskId] }),
  })
}

// ─── Composant principal ────────────────────────────────────
export default function TaskTagPicker({ taskId, readOnly = false }) {
  const [open, setOpen]           = useState(false)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newColor, setNewColor]   = useState(TAG_PALETTE[5])
  const ref                       = useRef(null)

  const { data: allTags  = [] }  = useTaskTags()
  const { data: linked   = [] }  = useTaskTagLinks(taskId)
  const createTag                 = useCreateTag()
  const linkTag                   = useLinkTag()
  const unlinkTag                 = useUnlinkTag()

  const linkedIds = new Set(linked.map(t => t.id))

  // Ferme le dropdown si clic extérieur
  useEffect(() => {
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function handleToggleTag(tag) {
    if (!taskId) return
    if (linkedIds.has(tag.id)) await unlinkTag.mutateAsync({ taskId, tagId: tag.id })
    else                       await linkTag.mutateAsync({ taskId, tagId: tag.id })
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const tag = await createTag.mutateAsync({ name: newName, color: newColor })
    if (taskId) await linkTag.mutateAsync({ taskId, tagId: tag.id })
    setNewName(''); setCreating(false)
  }

  return (
    <div ref={ref} className="relative">
      {/* Tags actifs */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {linked.map(tag => (
          <span key={tag.id}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}44` }}>
            {tag.name}
            {!readOnly && (
              <button onClick={() => handleToggleTag(tag)} className="opacity-50 hover:opacity-100 ml-0.5">×</button>
            )}
          </span>
        ))}
        {!readOnly && (
          <button onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-gray-500 border border-white/10 hover:border-white/20 hover:text-gray-300 transition-colors">
            + Tag
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 w-56 bg-[#1a1a35] border border-white/10 rounded-xl shadow-xl p-2">
          {allTags.length === 0 && !creating && (
            <p className="text-xs text-gray-500 px-2 py-1">Aucun tag. Créez-en un.</p>
          )}
          {allTags.map(tag => (
            <button key={tag.id} onClick={() => handleToggleTag(tag)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${linkedIds.has(tag.id) ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tag.color }} />
              <span className="text-gray-200 flex-1 truncate">{tag.name}</span>
              {linkedIds.has(tag.id) && <span className="text-[10px] text-indigo-400">✓</span>}
            </button>
          ))}

          <div className="border-t border-white/8 mt-1 pt-1">
            {creating ? (
              <div className="p-1 space-y-2">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nom du tag..."
                  className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
                <div className="flex flex-wrap gap-1">
                  {TAG_PALETTE.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className="w-4 h-4 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={handleCreate} disabled={!newName.trim()}
                    className="flex-1 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-40">Créer</button>
                  <button onClick={() => { setCreating(false); setNewName('') }}
                    className="px-2 py-1 text-[11px] text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">✕</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                + Nouveau tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
