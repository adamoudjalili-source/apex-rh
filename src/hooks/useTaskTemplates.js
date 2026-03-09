// ============================================================
// APEX RH — useTaskTemplates.js  ·  S128
// CRUD templates de tâches + items
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

const QK = (orgId) => ['task_templates', orgId]

// ─── Lecture ───────────────────────────────────────────────

export function useTaskTemplates({ category = null } = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: [...QK(profile?.organization_id), category],
    queryFn: async () => {
      let q = supabase
        .from('task_templates')
        .select(`
          id, name, description, category, priority,
          estimated_hours, color, is_active, created_by, created_at,
          task_template_items(id, title, description, priority, delay_days, checklist_items, order_index)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('category')
        .order('name')

      if (category) q = q.eq('category', category)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Création template ─────────────────────────────────────

export function useCreateTemplate() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ template, items = [] }) => {
      // 1. Créer le template
      const { data: tmpl, error: tErr } = await supabase
        .from('task_templates')
        .insert({
          organization_id: profile.organization_id,
          name:            template.name,
          description:     template.description || null,
          category:        template.category    || 'general',
          priority:        template.priority    || 'normale',
          estimated_hours: template.estimated_hours || null,
          color:           template.color       || '#4F46E5',
          created_by:      profile.id,
        })
        .select()
        .single()
      if (tErr) throw tErr

      // 2. Créer les items si fournis
      if (items.length > 0) {
        const rows = items.map((item, idx) => ({
          template_id:     tmpl.id,
          title:           item.title,
          description:     item.description || null,
          priority:        item.priority    || 'normale',
          delay_days:      item.delay_days  || 0,
          checklist_items: item.checklist_items || [],
          order_index:     idx,
        }))
        const { error: iErr } = await supabase.from('task_template_items').insert(rows)
        if (iErr) throw iErr
      }
      return tmpl
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(profile?.organization_id) }),
  })
}

// ─── Mise à jour template ──────────────────────────────────

export function useUpdateTemplate() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, updates, items }) => {
      // Mettre à jour le template
      const { error: tErr } = await supabase
        .from('task_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (tErr) throw tErr

      // Remplacer les items si fournis
      if (items !== undefined) {
        await supabase.from('task_template_items').delete().eq('template_id', id)
        if (items.length > 0) {
          const rows = items.map((item, idx) => ({
            template_id:     id,
            title:           item.title,
            description:     item.description || null,
            priority:        item.priority    || 'normale',
            delay_days:      item.delay_days  || 0,
            checklist_items: item.checklist_items || [],
            order_index:     idx,
          }))
          const { error: iErr } = await supabase.from('task_template_items').insert(rows)
          if (iErr) throw iErr
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(profile?.organization_id) }),
  })
}

// ─── Suppression (soft delete) ─────────────────────────────

export function useDeleteTemplate() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(profile?.organization_id) }),
  })
}

// ─── CATÉGORIES disponibles ────────────────────────────────

export const TEMPLATE_CATEGORIES = [
  { id: 'general',    label: 'Général',      icon: '📋', color: '#4F46E5' },
  { id: 'onboarding', label: 'Onboarding',   icon: '🚀', color: '#10B981' },
  { id: 'audit',      label: 'Audit',        icon: '🔍', color: '#F59E0B' },
  { id: 'rh',         label: 'RH',           icon: '👥', color: '#8B5CF6' },
  { id: 'projet',     label: 'Projet',       icon: '🗂',  color: '#3B82F6' },
  { id: 'formation',  label: 'Formation',    icon: '📚', color: '#EC4899' },
]

export function getCategoryInfo(categoryId) {
  return TEMPLATE_CATEGORIES.find(c => c.id === categoryId) || TEMPLATE_CATEGORIES[0]
}
