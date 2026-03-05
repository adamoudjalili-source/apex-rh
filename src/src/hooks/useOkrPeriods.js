// ============================================================
// APEX RH — useOKRPeriods.js — Session 10
// CRUD périodes OKR avec TanStack Query
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── FETCH ALL PERIODS ────────────────────────────────────
export function useOkrPeriods() {
  return useQuery({
    queryKey: ['okr-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_periods')
        .select('*')
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 60000,
  })
}

// ─── FETCH ACTIVE PERIODS ─────────────────────────────────
export function useActiveOKRPeriods() {
  return useQuery({
    queryKey: ['okr-periods-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_periods')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 60000,
  })
}

// ─── CREATE PERIOD ────────────────────────────────────────
export function useCreatePeriod() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (periodData) => {
      const { data, error } = await supabase
        .from('okr_periods')
        .insert({ ...periodData, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-periods'] })
      qc.invalidateQueries({ queryKey: ['okr-periods-active'] })
    },
  })
}

// ─── UPDATE PERIOD ────────────────────────────────────────
export function useUpdatePeriod() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ periodId, updates }) => {
      const { data, error } = await supabase
        .from('okr_periods')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', periodId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-periods'] })
      qc.invalidateQueries({ queryKey: ['okr-periods-active'] })
    },
  })
}

// ─── DELETE PERIOD ────────────────────────────────────────
export function useDeletePeriod() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (periodId) => {
      const { error } = await supabase
        .from('okr_periods')
        .delete()
        .eq('id', periodId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-periods'] })
      qc.invalidateQueries({ queryKey: ['okr-periods-active'] })
    },
  })
}
