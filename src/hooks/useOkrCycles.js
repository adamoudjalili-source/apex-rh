// ============================================================
// APEX RH — useOkrCycles.js
// S121 — Extrait de useObjectives.js (S78)
// Gestion des cycles OKR : CRUD cycles, check-ins, stats, arbre
// Tables : okr_cycles · okr_checkins
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── CYCLES ──────────────────────────────────────────────────

export function useOKRCycles() {
  return useQuery({
    queryKey: ['okr-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_cycles')
        .select('*')
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })
}

export function useCurrentCycle() {
  return useQuery({
    queryKey: ['okr-cycle-current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_cycles')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 60000,
  })
}

export function useCreateCycle() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('okr_cycles')
        .insert({ ...payload, organization_id: profile.organization_id, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr-cycles'] }),
  })
}

export function useUpdateCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from('okr_cycles').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-cycles'] })
      qc.invalidateQueries({ queryKey: ['okr-cycle-current'] })
    },
  })
}

export function useCloseCycle() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (cycleId) => {
      const { error } = await supabase
        .from('okr_cycles')
        .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: profile.id })
        .eq('id', cycleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-cycles'] })
      qc.invalidateQueries({ queryKey: ['okr-cycle-current'] })
      // ✅ S89 : clôture d'un cycle → invalide tous les objectifs (justifié ici)
      qc.invalidateQueries({ queryKey: ['objectives'] })
    },
  })
}

// ─── CHECK-INS ────────────────────────────────────────────────

export function useOKRCheckins(keyResultId) {
  return useQuery({
    queryKey: ['okr-checkins', keyResultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('*, user:users!okr_checkins_user_id_fkey(id, first_name, last_name)')
        .eq('key_result_id', keyResultId)
        .order('checked_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!keyResultId,
    staleTime: 15000,
  })
}

export function useCreateCheckin() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ key_result_id, progress_value, confidence, note }) => {
      const { data, error } = await supabase
        .from('okr_checkins')
        .insert({
          key_result_id,
          progress_value,
          confidence: confidence || 'medium',
          note,
          user_id: profile.id,
          organization_id: profile.organization_id,
        })
        .select()
        .single()
      if (error) throw error
      // Mettre à jour current_value sur le KR
      await supabase
        .from('key_results')
        .update({ current_value: progress_value, confidence_level: confidence || 'medium' })
        .eq('id', key_result_id)
      return data
    },
    onSuccess: (_, { key_result_id, objectiveId, periodId }) => {
      qc.invalidateQueries({ queryKey: ['okr-checkins', key_result_id] })
      // ✅ S89 : cibler uniquement l'objectif + la période si fournis
      if (objectiveId) qc.invalidateQueries({ queryKey: ['objective', objectiveId] })
      if (periodId)    qc.invalidateQueries({ queryKey: ['objectives', periodId] })
    },
  })
}

// ─── STATS & ARBRE ────────────────────────────────────────────

export function useOKRCycleStats(cycleId) {
  return useQuery({
    queryKey: ['okr-cycle-stats', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_okr_cycle_stats', { p_cycle_id: cycleId })
      if (error) throw error
      return data
    },
    enabled: !!cycleId,
    staleTime: 30000,
  })
}

export function useOKRAlignmentTree(cycleId) {
  return useQuery({
    queryKey: ['okr-alignment-tree', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_okr_alignment_tree', { p_cycle_id: cycleId })
      if (error) throw error
      return data || []
    },
    enabled: !!cycleId,
    staleTime: 30000,
  })
}
