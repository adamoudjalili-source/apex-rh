// ============================================================
// APEX RH — src/hooks/useSuccessionPlanning.js
// Session 51 — Succession Planning & Cartographie Talents
//
// Hooks :
//   useKeyPositions         — liste tous les postes clés
//   useKeyPosition          — un poste + ses candidats
//   useCreateKeyPosition    — création poste
//   useUpdateKeyPosition    — mise à jour
//   useDeleteKeyPosition    — suppression
//   useSuccessionCandidates — candidats d'un poste
//   useNominateCandidate    — nominer un successeur
//   useUpdateCandidate      — changer readiness
//   useRemoveCandidate      — retirer candidature
//   usePositionsAtRisk      — postes sans successeur identifié
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase }  from '../lib/supabase'
import { useAuth }   from '../contexts/AuthContext'

// ─── Constantes ──────────────────────────────────────────────
export const CRITICALITY_CONFIG = {
  critical: { label: 'Critique',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  order: 0 },
  high:     { label: 'Élevé',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', order: 1 },
  medium:   { label: 'Modéré',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', order: 2 },
  low:      { label: 'Faible',    color: '#6B7280', bg: 'rgba(107,114,128,0.1)', order: 3 },
}

export const READINESS_CONFIG = {
  ready_now:        { label: 'Prêt maintenant',  color: '#10B981', bg: 'rgba(16,185,129,0.12)',  order: 0 },
  ready_in_1_year:  { label: 'Prêt dans 1 an',   color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  order: 1 },
  ready_in_2_years: { label: 'Prêt dans 2 ans',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', order: 2 },
  potential:        { label: 'Potentiel à évaluer', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', order: 3 },
}

const POSITION_SELECT = `
  id, title, description,
  criticality_level, vacancy_horizon_months, is_active,
  direction_id, division_id, service_id,
  directions(id, name),
  divisions(id, name),
  services(id, name),
  current_holder:users!key_positions_current_holder_id_fkey(id, first_name, last_name, role),
  succession_plans(
    id, readiness_level, notes, created_at,
    candidate:users!succession_plans_candidate_user_id_fkey(
      id, first_name, last_name, role, division_id,
      divisions(name), services(name)
    ),
    nominated_by_user:users!succession_plans_nominated_by_fkey(id, first_name, last_name)
  )
`

// ─── HOOK 1 : Liste postes clés ──────────────────────────────
export function useKeyPositions(filters = {}) {
  return useQuery({
    queryKey: ['key_positions', filters],
    queryFn: async () => {
      let q = supabase
        .from('key_positions')
        .select(POSITION_SELECT)
        .eq('is_active', true)
        .order('criticality_level', { ascending: true }) // critical first
        .order('title')

      if (filters.criticality) q = q.eq('criticality_level', filters.criticality)
      if (filters.division_id)  q = q.eq('division_id', filters.division_id)

      const { data, error } = await q
      if (error) throw error

      // Trier par ordre criticité
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return (data || []).sort((a, b) =>
        (order[a.criticality_level] ?? 4) - (order[b.criticality_level] ?? 4)
      )
    },
    staleTime: 60_000,
    retry: 1,
  })
}

// ─── HOOK 2 : Poste unique ───────────────────────────────────
export function useKeyPosition(positionId) {
  return useQuery({
    queryKey: ['key_position', positionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('key_positions')
        .select(POSITION_SELECT)
        .eq('id', positionId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!positionId,
    staleTime: 60_000,
  })
}

// ─── HOOK 3 : Postes à risque (sans successeur "ready now/1 year") ──
export function usePositionsAtRisk() {
  const { data: positions = [], ...rest } = useKeyPositions()

  const atRisk = positions.filter(p => {
    const readyCandidates = (p.succession_plans || []).filter(sp =>
      ['ready_now', 'ready_in_1_year'].includes(sp.readiness_level)
    )
    return readyCandidates.length === 0
  })

  return { data: atRisk, total: positions.length, ...rest }
}

// ─── HOOK 4 : Créer poste ────────────────────────────────────
export function useCreateKeyPosition() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('key_positions')
        .insert({
          title:                  payload.title,
          description:            payload.description || null,
          criticality_level:      payload.criticality_level || 'medium',
          vacancy_horizon_months: payload.vacancy_horizon_months || 12,
          direction_id:           payload.direction_id || null,
          division_id:            payload.division_id || null,
          service_id:             payload.service_id || null,
          current_holder_id:      payload.current_holder_id || null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['key_positions'] }),
  })
}

// ─── HOOK 5 : Mettre à jour poste ───────────────────────────
export function useUpdateKeyPosition() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('key_positions')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['key_positions'] })
      qc.invalidateQueries({ queryKey: ['key_position', vars.id] })
    },
  })
}

// ─── HOOK 6 : Archiver poste ────────────────────────────────
export function useArchiveKeyPosition() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('key_positions')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['key_positions'] }),
  })
}

// ─── HOOK 7 : Nominer candidat ───────────────────────────────
export function useNominateCandidate() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ position_id, candidate_user_id, readiness_level, notes }) => {
      const { data, error } = await supabase
        .from('succession_plans')
        .upsert({
          position_id,
          candidate_user_id,
          readiness_level: readiness_level || 'ready_in_2_years',
          notes:           notes || null,
          nominated_by:    profile?.id || null,
        }, { onConflict: 'position_id,candidate_user_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['key_positions'] })
      qc.invalidateQueries({ queryKey: ['key_position', vars.position_id] })
    },
  })
}

// ─── HOOK 8 : Mettre à jour candidature ─────────────────────
export function useUpdateCandidate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, position_id, readiness_level, notes }) => {
      const { data, error } = await supabase
        .from('succession_plans')
        .update({ readiness_level, notes })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['key_positions'] })
      if (vars.position_id) qc.invalidateQueries({ queryKey: ['key_position', vars.position_id] })
    },
  })
}

// ─── HOOK 9 : Retirer candidature ───────────────────────────
export function useRemoveCandidate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, position_id }) => {
      const { error } = await supabase
        .from('succession_plans')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['key_positions'] })
      if (vars.position_id) qc.invalidateQueries({ queryKey: ['key_position', vars.position_id] })
    },
  })
}
