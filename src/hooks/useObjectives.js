// ============================================================
// APEX RH — useObjectives.js
// Session 19 — Fix useLinkTaskToKr / useUnlinkTaskFromKr :
//   invalidation ciblée ['objective', objectiveId] au lieu de ['objective'] (trop large)
// 🐛 Session 89 (WARN-3) — queryKey trop large sur toutes les mutations :
//   ['objectives'] → ['objectives', periodId] pour cibler uniquement la période concernée
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
      // ✅ S89 : cibler uniquement la période de l'objectif créé
      qc.invalidateQueries({ queryKey: ['objectives', data.period_id] })
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
    onSuccess: (data, { id }) => {
      // ✅ S89 : cibler uniquement la période concernée
      qc.invalidateQueries({ queryKey: ['objectives', data.period_id] })
      qc.invalidateQueries({ queryKey: ['objective', id] })
    },
  })
}

// ─── DELETE OBJECTIVE ────────────────────────────────────
export function useDeleteObjective() {
  const qc = useQueryClient()
  return useMutation({
    // ✅ S89 : passer { id, periodId } pour invalider uniquement la période
    mutationFn: async ({ id, periodId }) => {
      const { error } = await supabase.from('objectives').delete().eq('id', id)
      if (error) throw error
      return { id, periodId }
    },
    onSuccess: ({ id, periodId }) => {
      logAudit('objective_deleted', 'objective', id)
      if (periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', periodId] })
      } else {
        qc.invalidateQueries({ queryKey: ['objectives'] })
      }
      qc.removeQueries({ queryKey: ['objective', id] })
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
      // ✅ S89 : KR créé → invalider uniquement l'objectif parent (periodId via objectif)
      qc.invalidateQueries({ queryKey: ['objective', data.objective_id] })
      // Invalider la liste de la période si connue (passée dans krData.periodId)
      if (data.periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', data.periodId] })
      }
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
      // ✅ S89 : cibler uniquement l'objectif parent du KR modifié
      qc.invalidateQueries({ queryKey: ['objective', data.objective_id] })
      if (data.periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', data.periodId] })
      }
    },
  })
}

export function useDeleteKeyResult() {
  const qc = useQueryClient()
  return useMutation({
    // ✅ S89 : accepte { id, objectiveId, periodId? }
    mutationFn: async ({ id, objectiveId, periodId }) => {
      const { error } = await supabase.from('key_results').delete().eq('id', id)
      if (error) throw error
      return { objectiveId, periodId }
    },
    onSuccess: (res) => {
      // ✅ S89 : cibler uniquement l'objectif parent
      qc.invalidateQueries({ queryKey: ['objective', res.objectiveId] })
      if (res.periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', res.periodId] })
      }
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
    // ✅ S89 : accepte periodId optionnel pour invalidation ciblée
    mutationFn: async ({ taskId, keyResultId, objectiveId, periodId }) => {
      const { error } = await supabase
        .from('task_key_results')
        .insert({ task_id: taskId, key_result_id: keyResultId })
      if (error) throw error
      return { objectiveId, periodId }
    },
    onSuccess: (res) => {
      // ✅ S89 : cibler uniquement l'objectif + la période si connue
      if (res.objectiveId) {
        qc.invalidateQueries({ queryKey: ['objective', res.objectiveId] })
      }
      if (res.periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', res.periodId] })
      }
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUnlinkTaskFromKr() {
  const qc = useQueryClient()
  return useMutation({
    // ✅ S89 : accepte periodId optionnel
    mutationFn: async ({ taskId, keyResultId, objectiveId, periodId }) => {
      const { error } = await supabase
        .from('task_key_results')
        .delete()
        .eq('task_id', taskId)
        .eq('key_result_id', keyResultId)
      if (error) throw error
      return { objectiveId, periodId }
    },
    onSuccess: (res) => {
      // ✅ S89 : cibler uniquement l'objectif + la période si connue
      if (res.objectiveId) {
        qc.invalidateQueries({ queryKey: ['objective', res.objectiveId] })
      }
      if (res.periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', res.periodId] })
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
    onSuccess: (_, { id, periodId }) => {
      // ✅ S89 : cibler la période si fournie
      if (periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', periodId] })
      }
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
    onSuccess: (_, { id, periodId }) => {
      // ✅ S89 : cibler la période si fournie
      if (periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', periodId] })
      }
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
    onSuccess: (_, { id, periodId }) => {
      // ✅ S89 : cibler la période si fournie
      if (periodId) {
        qc.invalidateQueries({ queryKey: ['objectives', periodId] })
      }
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
// Cycles OKR → voir useOkrCycles.js (S121)
