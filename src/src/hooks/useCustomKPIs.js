// ============================================================
// APEX RH — useCustomKPIs.js
// Session 50 — KPI personnalisés (table custom_kpis)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Constantes ──────────────────────────────────────────────

export const KPI_FREQUENCIES = {
  hebdomadaire: { label: 'Hebdomadaire', short: 'Hebdo' },
  mensuel:      { label: 'Mensuel',      short: 'Mensuel' },
  trimestriel:  { label: 'Trimestriel',  short: 'Trim.' },
  annuel:       { label: 'Annuel',       short: 'Annuel' },
}

export const KPI_STATUS = {
  actif:   { label: 'Actif',   color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  atteint: { label: 'Atteint', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  archive: { label: 'Archivé', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

export const KPI_COLORS = [
  '#4F46E5', '#7C3AED', '#2563EB', '#0891B2',
  '#059669', '#D97706', '#DC2626', '#DB2777',
]

// ─── Helpers ─────────────────────────────────────────────────

export function kpiProgress(kpi) {
  if (!kpi?.target_value || kpi.target_value === 0) return 0
  return Math.min(kpi.current_value / kpi.target_value, 1)
}

export function kpiProgressColor(progress) {
  if (progress >= 1.0)  return '#10B981'
  if (progress >= 0.7)  return '#3B82F6'
  if (progress >= 0.4)  return '#F59E0B'
  return '#EF4444'
}

export function kpiStatusFromProgress(progress) {
  return progress >= 1.0 ? 'atteint' : 'actif'
}

// ─── FETCH mes KPIs ──────────────────────────────────────────
export function useMyCustomKPIs() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['custom-kpis', 'mine', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_kpis')
        .select('*')
        .eq('owner_id', profile.id)
        .neq('status', 'archive')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  })
}

// ─── FETCH KPIs d'un utilisateur (manager) ──────────────────
export function useUserCustomKPIs(userId) {
  return useQuery({
    queryKey: ['custom-kpis', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_kpis')
        .select('*')
        .eq('owner_id', userId)
        .neq('status', 'archive')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 30000,
  })
}

// ─── FETCH KPIs de toute l'équipe (manager) ─────────────────
export function useTeamCustomKPIs(teamUserIds = []) {
  return useQuery({
    queryKey: ['custom-kpis', 'team', teamUserIds.sort().join(',')],
    queryFn: async () => {
      if (!teamUserIds.length) return []
      const { data, error } = await supabase
        .from('custom_kpis')
        .select(`
          *,
          owner:users!custom_kpis_owner_id_fkey(id, first_name, last_name, role)
        `)
        .in('owner_id', teamUserIds)
        .neq('status', 'archive')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: teamUserIds.length > 0,
    staleTime: 30000,
  })
}

// ─── CREATE KPI ──────────────────────────────────────────────
export function useCreateCustomKPI() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (kpiData) => {
      const { data, error } = await supabase
        .from('custom_kpis')
        .insert({
          ...kpiData,
          owner_id: kpiData.owner_id || profile.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-kpis'] })
    },
  })
}

// ─── UPDATE KPI ──────────────────────────────────────────────
export function useUpdateCustomKPI() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      // Auto-update status si target atteint
      const updatesWithStatus = {
        ...updates,
        status: updates.current_value >= updates.target_value ? 'atteint' : 'actif',
      }
      const { data, error } = await supabase
        .from('custom_kpis')
        .update(updatesWithStatus)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-kpis'] })
    },
  })
}

// ─── UPDATE valeur courante uniquement (quick update) ────────
export function useUpdateKPIValue() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, current_value, target_value }) => {
      const newStatus = current_value >= target_value ? 'atteint' : 'actif'
      const { data, error } = await supabase
        .from('custom_kpis')
        .update({ current_value, status: newStatus })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-kpis'] })
    },
  })
}

// ─── ARCHIVE / DELETE KPI ────────────────────────────────────
export function useArchiveCustomKPI() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('custom_kpis')
        .update({ status: 'archive' })
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-kpis'] })
    },
  })
}

export function useDeleteCustomKPI() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('custom_kpis')
        .delete()
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-kpis'] })
    },
  })
}
