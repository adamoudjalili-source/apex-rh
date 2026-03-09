// ============================================================
// APEX RH — src/hooks/useTransparency.js
// Session 42 — Conduite du Changement
//   • useMyPerformanceComments()   — commentaires de l'employé
//   • useUpsertComment()           — créer/modifier un commentaire
//   • useDeleteComment()           — supprimer
//   • useEmployeeComments(userId)  — commentaires d'un employé (managers)
//   • useManagerNotes(employeeId)  — notes du manager sur un employé
//   • useUpsertManagerNote()       — créer/modifier une note
//   • useDeleteManagerNote()       — supprimer une note
//   • useSharedManagerNotes(uid)   — notes partagées visibles par l'employé
//   • DIMENSION_LABELS             — libellés des dimensions commentables
//   • currentPeriodKey()           — helper YYYY-MM
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import { NOTE_TYPE_LABELS } from './useCompetencyFramework'

// ─── CONSTANTES ──────────────────────────────────────────────

export const DIMENSION_LABELS = {
  delivery:         { label: 'Exécution',         icon: '⚡', color: '#4F46E5' },
  quality:          { label: 'Qualité',            icon: '⭐', color: '#10B981' },
  regularity:       { label: 'Régularité',         icon: '📅', color: '#F59E0B' },
  bonus:            { label: 'Bonus',              icon: '🎁', color: '#EC4899' },
  nita_resilience:  { label: 'Résilience NITA',   icon: '🛡️', color: '#4F46E5' },
  nita_reliability: { label: 'Fiabilité NITA',    icon: '✅', color: '#10B981' },
  nita_endurance:   { label: 'Endurance NITA',    icon: '⏳', color: '#F59E0B' },
  okr:              { label: 'Objectifs OKR',      icon: '🎯', color: '#8B5CF6' },
  f360:             { label: 'Feedback 360°',      icon: '💬', color: '#3B82F6' },
  review:           { label: 'Évaluation formelle',icon: '📋', color: '#6B7280' },
}

export const NOTE_TYPE_LABELS = {
  general:     { label: 'Note générale',       icon: '📝', color: '#6B7280' },
  positive:    { label: 'Point fort',          icon: '✅', color: '#10B981' },
  concern:     { label: 'Point d\'attention',  icon: '⚠️', color: '#F59E0B' },
  action_plan: { label: 'Plan d\'action',      icon: '🎯', color: '#4F46E5' },
}

// YYYY-MM du mois courant
export const currentPeriodKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

// ─── COMMENTAIRES EMPLOYÉ ─────────────────────────────────────

export function useMyPerformanceComments(periodKey = null) {
  const { profile } = useAuth()
  const pk = periodKey || currentPeriodKey()
  return useQuery({
    queryKey: ['my-perf-comments', profile?.id, pk],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_comments')
        .select('*')
        .eq('user_id', profile.id)
        .eq('period_key', pk)
        .order('dimension_key')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

export function useAllMyComments() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['all-my-perf-comments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_comments')
        .select('*')
        .eq('user_id', profile.id)
        .order('period_key', { ascending: false })
        .order('dimension_key')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

export function useEmployeeComments(userId) {
  return useQuery({
    queryKey: ['employee-perf-comments', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('performance_comments')
        .select('*')
        .eq('user_id', userId)
        .order('period_key', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useUpsertComment() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ dimension_key, period_key, comment, visibility = 'manager_only' }) => {
      const { data, error } = await supabase
        .from('performance_comments')
        .upsert({
          user_id: profile.id,
          dimension_key,
          period_key: period_key || currentPeriodKey(),
          comment,
          visibility,
        }, { onConflict: 'user_id,dimension_key,period_key' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-perf-comments'] })
      qc.invalidateQueries({ queryKey: ['all-my-perf-comments'] })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('performance_comments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-perf-comments'] })
      qc.invalidateQueries({ queryKey: ['all-my-perf-comments'] })
    },
  })
}

// ─── NOTES MANAGER ────────────────────────────────────────────

export function useManagerNotes(employeeId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['manager-notes', profile?.id, employeeId],
    queryFn: async () => {
      if (!profile?.id || !employeeId) return []
      const { data, error } = await supabase
        .from('manager_notes')
        .select('*')
        .eq('manager_id', profile.id)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id && !!employeeId,
    staleTime: 60_000,
  })
}

export function useSharedManagerNotes() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['shared-manager-notes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('manager_notes')
        .select(`
          *,
          manager:users!manager_notes_manager_id_fkey (id, first_name, last_name)
        `)
        .eq('employee_id', profile.id)
        .eq('is_shared', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

export function useUpsertManagerNote() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, employee_id, period_key, note_text, note_type = 'general', is_shared = false, review_id }) => {
      const payload = {
        manager_id: profile.id,
        employee_id,
        period_key: period_key || currentPeriodKey(),
        note_text,
        note_type,
        is_shared,
        review_id,
      }
      let q = id
        ? supabase.from('manager_notes').update(payload).eq('id', id).select().single()
        : supabase.from('manager_notes').insert(payload).select().single()
      const { data, error } = await q
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['manager-notes', profile.id, vars.employee_id] })
      qc.invalidateQueries({ queryKey: ['shared-manager-notes'] })
    },
  })
}

export function useDeleteManagerNote() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, employee_id }) => {
      const { error } = await supabase.from('manager_notes').delete().eq('id', id)
      if (error) throw error
      return employee_id
    },
    onSuccess: (empId) => {
      qc.invalidateQueries({ queryKey: ['manager-notes', profile.id, empId] })
    },
  })
}

// ─── HELPER TRANSPARENCY ─────────────────────────────────────

export function isTransparencyEnabled(settings) {
  const v = settings?.transparency_mode
  if (v === true || v === 'true') return true
  return false
}
