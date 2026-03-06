// ============================================================
// APEX RH — src/hooks/useCompetencyFramework.js
// Session 42 — Référentiel Compétences
//   • useJobFamilies()          — liste des familles de métiers
//   • useJobFamily(id)          — une famille avec ses compétences
//   • useAllFrameworks()        — tous les référentiels (admin)
//   • useUserJobFamily(userId)  — famille d'un utilisateur
//   • useCreateJobFamily()      — créer une famille (admin)
//   • useUpdateJobFamily()      — modifier une famille (admin)
//   • useDeleteJobFamily()      — supprimer une famille (admin)
//   • useUpsertFrameworkItem()  — créer/modifier une compétence
//   • useDeleteFrameworkItem()  — supprimer une compétence
//   • useAssignJobFamily()      — assigner une famille à un user
//   • DEFAULT_COMPETENCIES      — 5 compétences standard
//   • FRAMEWORK_LEVEL_LABELS    — libellés des 5 niveaux
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, etc.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const DEFAULT_COMPETENCIES = [
  { key: 'quality',       label: 'Qualité du travail',       icon: '⭐', color: '#4F46E5' },
  { key: 'deadlines',     label: 'Respect des délais',       icon: '⏱️', color: '#3B82F6' },
  { key: 'communication', label: 'Communication',            icon: '💬', color: '#10B981' },
  { key: 'teamwork',      label: 'Esprit d\'équipe',         icon: '🤝', color: '#F59E0B' },
  { key: 'initiative',    label: 'Initiative & Proactivité', icon: '🚀', color: '#EC4899' },
]

export const FRAMEWORK_LEVEL_LABELS = {
  1: { label: 'Insuffisant',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  2: { label: 'À améliorer',   color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  3: { label: 'Satisfaisant',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  4: { label: 'Bien',          color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  5: { label: 'Excellent',     color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
}

export const NOTE_TYPE_LABELS = {
  general:     { label: 'Note générale',   icon: '📝', color: '#6B7280' },
  positive:    { label: 'Point fort',      icon: '✅', color: '#10B981' },
  concern:     { label: 'Point d\'attention', icon: '⚠️', color: '#F59E0B' },
  action_plan: { label: 'Plan d\'action',  icon: '🎯', color: '#4F46E5' },
}

// ─── FAMILLES DE MÉTIERS ──────────────────────────────────────

export function useJobFamilies() {
  return useQuery({
    queryKey: ['job-families'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_families')
        .select('id, name, description, code, color, icon, is_active')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllJobFamilies() {
  return useQuery({
    queryKey: ['job-families-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_families')
        .select('id, name, description, code, color, icon, is_active, created_at')
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useJobFamilyWithFramework(familyId) {
  return useQuery({
    queryKey: ['job-family-framework', familyId],
    queryFn: async () => {
      if (!familyId) return null
      const { data: family, error: e1 } = await supabase
        .from('job_families')
        .select('*')
        .eq('id', familyId)
        .single()
      if (e1) throw e1

      const { data: items, error: e2 } = await supabase
        .from('competency_frameworks')
        .select('*')
        .eq('job_family_id', familyId)
        .eq('is_active', true)
        .order('sort_order')
      if (e2) throw e2

      return { ...family, competencies: items || [] }
    },
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllFrameworks() {
  return useQuery({
    queryKey: ['all-competency-frameworks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competency_frameworks')
        .select(`
          *,
          job_families (id, name, code, color, icon)
        `)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserJobFamily(userId) {
  return useQuery({
    queryKey: ['user-job-family', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('users')
        .select(`
          job_family_id,
          job_families (id, name, code, color, icon,
            competency_frameworks (*)
          )
        `)
        .eq('id', userId)
        .single()
      if (error) return null
      return data?.job_families || null
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── MUTATIONS FAMILLES ───────────────────────────────────────

export function useCreateJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('job_families')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-families'] }),
  })
}

export function useUpdateJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('job_families')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['job-families'] })
      qc.invalidateQueries({ queryKey: ['job-family-framework', vars.id] })
    },
  })
}

export function useDeleteJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('job_families')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-families'] }),
  })
}

// ─── MUTATIONS COMPÉTENCES ────────────────────────────────────

export function useUpsertFrameworkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('competency_frameworks')
        .upsert(payload, { onConflict: 'job_family_id,competency_key' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['job-family-framework', vars.job_family_id] })
      qc.invalidateQueries({ queryKey: ['all-competency-frameworks'] })
    },
  })
}

export function useDeleteFrameworkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, job_family_id }) => {
      const { error } = await supabase
        .from('competency_frameworks')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
      return job_family_id
    },
    onSuccess: (familyId) => {
      qc.invalidateQueries({ queryKey: ['job-family-framework', familyId] })
    },
  })
}

// ─── ASSIGNATION FAMILLE ──────────────────────────────────────

export function useAssignJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, jobFamilyId }) => {
      const { error } = await supabase
        .from('users')
        .update({ job_family_id: jobFamilyId })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['user-job-family', vars.userId] })
    },
  })
}
