// ============================================================
// APEX RH — src/hooks/useSuccessionVivier.js  ·  S83
// Succession & Talents — Vivier + gap analysis
//
// Hooks :
//   useTalentPool()           — vivier complet par poste
//   useAddToTalentPool()      — ajouter / mettre à jour un talent
//   useRemoveFromTalentPool() — retirer un talent du vivier
//   useSuccessionGaps()       — gaps déclarés par poste
//   useUpsertSuccessionGap()  — créer/MAJ un gap de poste
//   useTalentGapAnalysis()    — analyse RPC gaps agrégés
//   useSuccessionCoverage()   — couverture MV via RPC
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── READINESS config ─────────────────────────────────────────
export const READINESS_CONFIG = {
  ready_now: { label: 'Prêt maintenant', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  order: 0 },
  ready_1y:  { label: 'Prêt dans 1 an',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  order: 1 },
  ready_2y:  { label: 'Prêt dans 2 ans', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', order: 2 },
}

export const READINESS_ORDER = ['ready_now', 'ready_1y', 'ready_2y']

// ─── PRIORITY config pour gap analysis ───────────────────────
export const PRIORITY_CONFIG = {
  critical: { label: 'Critique', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  high:     { label: 'Élevé',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  medium:   { label: 'Modéré',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  low:      { label: 'Faible',   color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

// ─── HOOK 1 : useTalentPool ───────────────────────────────────
export function useTalentPool(positionId = null) {
  const { user } = useAuth()
  const orgId    = user?.organization_id

  return useQuery({
    queryKey: ['talent_pool', orgId, positionId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from('talent_pool_entries')
        .select(`
          id, readiness, skills_gap, notes, target_role, target_position_id, created_at,
          employee:users!talent_pool_entries_user_id_fkey(
            id, first_name, last_name, role,
            divisions(name), services(name)
          ),
          position:key_positions!talent_pool_entries_target_position_id_fkey(
            id, title, criticality_level
          ),
          added_by_user:users!talent_pool_entries_added_by_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (positionId) q = q.eq('target_position_id', positionId)

      const { data, error } = await q
      if (error) throw error

      // Grouper par readiness
      const grouped = {
        ready_now: [],
        ready_1y:  [],
        ready_2y:  [],
      }
      ;(data || []).forEach(entry => {
        if (grouped[entry.readiness]) grouped[entry.readiness].push(entry)
      })

      return { entries: data || [], grouped, total: data?.length || 0 }
    },
  })
}

// ─── HOOK 2 : useAddToTalentPool ─────────────────────────────
export function useAddToTalentPool() {
  const qc           = useQueryClient()
  const { user }     = useAuth()
  const orgId        = user?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const row = {
        organization_id:    orgId,
        user_id:            payload.user_id,
        target_role:        payload.target_role,
        target_position_id: payload.target_position_id || null,
        readiness:          payload.readiness,
        skills_gap:         payload.skills_gap || [],
        notes:              payload.notes || null,
        added_by:           user?.id,
      }

      const { data, error } = await supabase
        .from('talent_pool_entries')
        .upsert(row, {
          onConflict: 'organization_id,user_id,target_position_id',
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['talent_pool', orgId] })
      qc.invalidateQueries({ queryKey: ['succession_coverage', orgId] })
    },
  })
}

// ─── HOOK 3 : useRemoveFromTalentPool ────────────────────────
export function useRemoveFromTalentPool() {
  const qc       = useQueryClient()
  const { user } = useAuth()
  const orgId    = user?.organization_id

  return useMutation({
    mutationFn: async (entryId) => {
      const { error } = await supabase
        .from('talent_pool_entries')
        .delete()
        .eq('id', entryId)
        .eq('organization_id', orgId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['talent_pool', orgId] })
      qc.invalidateQueries({ queryKey: ['succession_coverage', orgId] })
    },
  })
}

// ─── HOOK 4 : useSuccessionGaps ──────────────────────────────
export function useSuccessionGaps(positionId = null) {
  const { user } = useAuth()
  const orgId    = user?.organization_id

  return useQuery({
    queryKey: ['succession_gaps', orgId, positionId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from('succession_gaps')
        .select(`
          id, current_coverage_pct, required_skills, notes, last_assessed_at,
          position:key_positions!succession_gaps_position_id_fkey(
            id, title, criticality_level
          )
        `)
        .eq('organization_id', orgId)

      if (positionId) q = q.eq('position_id', positionId)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

// ─── HOOK 5 : useUpsertSuccessionGap ─────────────────────────
export function useUpsertSuccessionGap() {
  const qc       = useQueryClient()
  const { user } = useAuth()
  const orgId    = user?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const row = {
        organization_id:      orgId,
        position_id:          payload.position_id,
        required_skills:      payload.required_skills || [],
        current_coverage_pct: payload.current_coverage_pct ?? 0,
        notes:                payload.notes || null,
        last_assessed_at:     new Date().toISOString(),
        assessed_by:          user?.id,
      }

      const { data, error } = await supabase
        .from('succession_gaps')
        .upsert(row, { onConflict: 'organization_id,position_id' })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['succession_gaps', orgId] })
    },
  })
}

// ─── HOOK 6 : useTalentGapAnalysis ───────────────────────────
export function useTalentGapAnalysis() {
  const { user } = useAuth()
  const orgId    = user?.organization_id

  return useQuery({
    queryKey: ['talent_gap_analysis', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_talent_gap_analysis', {
        p_org_id: orgId,
      })
      if (error) throw error
      return data || []
    },
  })
}

// ─── HOOK 7 : useSuccessionCoverage ──────────────────────────
// ✅ Fix S89 (BUG-M4) : v_succession_coverage_secure (RLS-safe) au lieu de RPC get_succession_coverage
export function useSuccessionCoverage() {
  const { user } = useAuth()
  const orgId    = user?.organization_id

  return useQuery({
    queryKey: ['succession_coverage', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_succession_coverage_secure')
        .select('position_id, position_title, criticality_level, is_active, pool_count, ready_now_count, ready_1y_count, ready_2y_count, coverage_pct, is_at_risk')
        .order('criticality_level', { ascending: false })
      if (error) throw error

      const rows    = data || []
      const atRisk  = rows.filter(r => r.is_at_risk)
      const covered = rows.filter(r => Number(r.coverage_pct) >= 50)

      return {
        positions:      rows,
        atRisk,
        covered,
        totalPositions: rows.length,
        atRiskCount:    atRisk.length,
        coveredCount:   covered.length,
        avgCoverage:    rows.length
          ? Math.round(rows.reduce((s, r) => s + Number(r.coverage_pct), 0) / rows.length)
          : 0,
      }
    },
  })
}