// ============================================================
// APEX RH — useObjectives.js
// Session 19 — Fix useLinkTaskToKr / useUnlinkTaskFromKr :
//   invalidation ciblée ['objective', objectiveId] au lieu de ['objective'] (trop large)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAudit } from '../lib/auditLog'

const OBJECTIVE_SELECT = `
  *,
  owner:users!objectives_owner_id_fkey(id, first_name, last_name, role),
  period:okr_periods!objectives_period_id_fkey(id, name, start_date, end_date),
  key_results(
    id, title, description, kr_type, start_value, target_value, current_value,
    score, weight, unit, owner_id, status, created_at,
    task_key_results(id, task_id)
  ),
  directions(id, name),
  divisions(id, name),
  services(id, name)
`

// ─── FETCH OBJECTIVES BY PERIOD ──────────────────────────
export function useObjectives(periodId, filters = {}) {
  return useQuery({
    queryKey: ['objectives', periodId, filters],
    queryFn: async () => {
      let query = supabase
        .from('objectives')
        .select(OBJECTIVE_SELECT)
        .eq('period_id', periodId)
        .order('level', { ascending: true })
        .order('created_at', { ascending: true })

      if (filters.level) query = query.eq('level', filters.level)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.owner_id) query = query.eq('owner_id', filters.owner_id)
      if (filters.search) query = query.ilike('title', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error

      const list = data || []

      const objMap = new Map(list.map((o) => [o.id, o]))
      return list.map((o) => ({
        ...o,
        parent: o.parent_objective_id ? objMap.get(o.parent_objective_id) || null : null,
      }))
    },
    enabled: !!periodId,
    staleTime: 30000,
  })
}

// ─── FETCH SINGLE OBJECTIVE ─────────────────────────────
export function useObjective(objectiveId) {
  return useQuery({
    queryKey: ['objective', objectiveId],
    queryFn: async () => {
      const { data: obj, error } = await supabase
        .from('objectives')
        .select(OBJECTIVE_SELECT)
        .eq('id', objectiveId)
        .single()
      if (error) throw error

      let parent = null
      if (obj.parent_objective_id) {
        const { data: p } = await supabase
          .from('objectives')
          .select('id, title, level')
          .eq('id', obj.parent_objective_id)
          .single()
        parent = p
      }

      const { data: children } = await supabase
        .from('objectives')
        .select(`
          id, title, level, status, progress_score,
          owner:users!objectives_owner_id_fkey(id, first_name, last_name),
          key_results(id, title, score, weight, status)
        `)
        .eq('parent_objective_id', objectiveId)
        .order('created_at', { ascending: true })

      return { ...obj, parent, children: children || [] }
    },
    enabled: !!objectiveId,
  })
}

// ─── CREATE OBJECTIVE ────────────────────────────────────
export function useCreateObjective() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (objData) => {
      const { data, error } = await supabase
        .from('objectives')
        .insert({
          ...objData,
          owner_id: objData.owner_id || profile.id,
          direction_id: objData.direction_id || profile.direction_id,
          division_id: objData.division_id || profile.division_id,
          service_id: objData.service_id || profile.service_id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      logAudit('objective_created', 'objective', data.id, { title: data.title, level: data.level })
      qc.invalidateQueries({ queryKey: ['objectives'] })
    },
  })
}

// ─── UPDATE OBJECTIVE ────────────────────────────────────
export function useUpdateObjective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('objectives')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['objective', id] })
    },
  })
}

// ─── DELETE OBJECTIVE ────────────────────────────────────
export function useDeleteObjective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('objectives').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      logAudit('objective_deleted', 'objective', id)
      qc.invalidateQueries({ queryKey: ['objectives'] })
    },
  })
}

// ─── KEY RESULTS CRUD ────────────────────────────────────
export function useCreateKeyResult() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (krData) => {
      const { data, error } = await supabase
        .from('key_results')
        .insert({ ...krData, owner_id: krData.owner_id || profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['objective', data.objective_id] })
    },
  })
}

export function useUpdateKeyResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('key_results')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['objective', data.objective_id] })
    },
  })
}

export function useDeleteKeyResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, objectiveId }) => {
      const { error } = await supabase.from('key_results').delete().eq('id', id)
      if (error) throw error
      return { objectiveId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['objective', res.objectiveId] })
    },
  })
}

// ─── LINK / UNLINK TASK ↔ KEY RESULT ────────────────────
// ✅ Session 19 — Accepte objectiveId en paramètre optionnel
// Avant : invalidait ['objective'] sans ID → invalidait TOUS les useObjective(id)
// Maintenant : invalide seulement ['objective', objectiveId] si fourni
export function useLinkTaskToKr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, keyResultId, objectiveId }) => {
      const { error } = await supabase
        .from('task_key_results')
        .insert({ task_id: taskId, key_result_id: keyResultId })
      if (error) throw error
      return { objectiveId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      if (res.objectiveId) {
        qc.invalidateQueries({ queryKey: ['objective', res.objectiveId] })
      }
      // Invalider aussi les tâches (pour la section liaisons inter-modules)
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUnlinkTaskFromKr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, keyResultId, objectiveId }) => {
      const { error } = await supabase
        .from('task_key_results')
        .delete()
        .eq('task_id', taskId)
        .eq('key_result_id', keyResultId)
      if (error) throw error
      return { objectiveId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      if (res.objectiveId) {
        qc.invalidateQueries({ queryKey: ['objective', res.objectiveId] })
      }
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ─── ÉVALUATION 3 ÉTAPES ────────────────────────────────

export function useSelfEvaluate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, selfScore, selfComment }) => {
      const { error } = await supabase
        .from('objectives')
        .update({
          self_score: selfScore,
          self_comment: selfComment,
          evaluation_status: 'auto_evaluation',
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['objective', id] })
    },
  })
}

export function useValidateN1() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, managerScore, managerComment }) => {
      const { error } = await supabase
        .from('objectives')
        .update({
          manager_score: managerScore,
          manager_comment: managerComment,
          evaluation_status: 'validation_n1',
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['objective', id] })
    },
  })
}

export function useCalibrateRH() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, finalScore, rhComment }) => {
      const { error } = await supabase
        .from('objectives')
        .update({
          final_score: finalScore,
          rh_comment: rhComment,
          evaluation_status: 'finalise',
          status: 'valide',
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['objective', id] })
    },
  })
}

// ─── FETCH ALL USERS (pour assignation objectifs) ────────
// ✅ Session 16 — Utilise RPC get_assignable_users() au lieu d'un SELECT direct
// Résout le problème RLS où un Chef de Service ne voyait pas les collaborateurs de son service
export function useAllUsersForOkr() {
  return useQuery({
    queryKey: ['all-users-okr'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_assignable_users')
      if (error) throw error
      return data || []
    },
    staleTime: 60000,
  })
}

// ─── FETCH TASKS FOR LINKING ─────────────────────────────
export function useTasksForLinking() {
  return useQuery({
    queryKey: ['tasks-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })
}

// ─── S78 ─────────────────────────────────────────────────────

// useOKRCycles : liste tous les cycles de l'organisation
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

// useCurrentCycle : cycle dont le statut est 'active'
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

// useCreateCycle
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

// useUpdateCycle
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

// useCloseCycle : clôture un cycle + archive les objectifs non validés
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
      qc.invalidateQueries({ queryKey: ['objectives'] })
    },
  })
}

// useOKRCheckins : check-ins d'un Key Result
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

// useCreateCheckin
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
    onSuccess: (_, { key_result_id }) => {
      qc.invalidateQueries({ queryKey: ['okr-checkins', key_result_id] })
      qc.invalidateQueries({ queryKey: ['objectives'] })
    },
  })
}

// useOKRCycleStats : statistiques d'un cycle (RPC)
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

// useOKRAlignmentTree : arbre objectifs du cycle (RPC)
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
