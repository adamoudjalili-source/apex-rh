// ============================================================
// APEX RH — src/hooks/useCalibration.js
// Session 55 — Calibration Multi-niveaux (N/N+1/N+2)
// Workflow : session → overrides → validation N+2 → clôture
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const CALIBRATION_STATUS_LABELS = {
  open:         'Ouverte',
  in_progress:  'En cours',
  pending_n2:   'Validation N+2',
  validated:    'Validée',
  closed:       'Clôturée',
}

export const CALIBRATION_STATUS_COLORS = {
  open:         '#6B7280',
  in_progress:  '#3B82F6',
  pending_n2:   '#F59E0B',
  validated:    '#10B981',
  closed:       '#9CA3AF',
}

export const CALIBRATION_LEVEL_LABELS = {
  n1: 'N+1 (Manager direct)',
  n2: 'N+2 (Direction)',
  hr: 'DRH',
}

export const CALIBRATION_LEVEL_COLORS = {
  n1: '#6366F1',
  n2: '#8B5CF6',
  hr: '#EC4899',
}

export const OVERRIDE_STATUS_LABELS = {
  pending:  'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
}

export const OVERRIDE_STATUS_COLORS = {
  pending:  '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
}

// Ratings disponibles pour le calibrage (identiques à OVERALL_RATING_LABELS)
export const RATING_OPTIONS = [
  { value: 'insuffisant',  label: 'Insuffisant',  color: '#EF4444' },
  { value: 'a_ameliorer',  label: 'À améliorer',  color: '#F97316' },
  { value: 'satisfaisant', label: 'Satisfaisant', color: '#F59E0B' },
  { value: 'bien',         label: 'Bien',         color: '#3B82F6' },
  { value: 'excellent',    label: 'Excellent',    color: '#10B981' },
]

// Benchmark de distribution cible (loi normale)
export const DISTRIBUTION_BENCHMARK = {
  insuffisant:  5,
  a_ameliorer:  15,
  satisfaisant: 45,
  bien:         25,
  excellent:    10,
}

// ─── HOOK 1 : Sessions de calibration par cycle ──────────────

export function useCalibrationSessions(cycleId) {
  return useQuery({
    queryKey: ['calibration_sessions', cycleId],
    queryFn: async () => {
      if (!cycleId) return []
      const { data, error } = await supabase
        .from('calibration_sessions')
        .select(`
          *,
          initiator:initiated_by(first_name, last_name),
          validator_n2:validated_by_n2(first_name, last_name),
          division:division_id(name)
        `)
        .eq('review_cycle_id', cycleId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!cycleId,
    staleTime: 2 * 60_000,
  })
}

// ─── HOOK 2 : Matrice de calibration (évaluations d'une session) ─

export function useCalibrationMatrix(sessionId) {
  return useQuery({
    queryKey: ['calibration_matrix', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('v_calibration_matrix')
        .select('*')
        .eq('calibration_session_id', sessionId)
        .order('collaborateur_name')
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  })
}

// ─── HOOK 3 : Évaluations d'un cycle pour calibration ────────

export function useCycleEvalsForCalibration(cycleId) {
  return useQuery({
    queryKey: ['cycle_evals_calibration', cycleId],
    queryFn: async () => {
      if (!cycleId) return []
      const { data, error } = await supabase
        .from('v_calibration_matrix')
        .select('*')
        .eq('review_cycle_id', cycleId)
        .in('eval_status', ['manager_submitted', 'validated', 'archived'])
        .order('collaborateur_name')
      if (error) throw error
      return data || []
    },
    enabled: !!cycleId,
    staleTime: 60_000,
  })
}

// ─── HOOK 4 : Overrides d'une session ────────────────────────

export function useCalibrationOverrides(sessionId) {
  return useQuery({
    queryKey: ['calibration_overrides', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('calibration_overrides')
        .select(`
          *,
          creator:created_by(first_name, last_name),
          approver:approved_by(first_name, last_name)
        `)
        .eq('calibration_session_id', sessionId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  })
}

// ─── HOOK 5 : Historique d'une session ───────────────────────

export function useCalibrationHistory(sessionId) {
  return useQuery({
    queryKey: ['calibration_history', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('calibration_history')
        .select(`
          *,
          actor:actor_id(first_name, last_name)
        `)
        .eq('calibration_session_id', sessionId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
    staleTime: 30_000,
  })
}

// ─── HOOK 6 : Créer une session de calibration ───────────────

export function useCreateCalibrationSession() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ cycleId, divisionId, title, n2Deadline, notes }) => {
      const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', profile.id)
        .single()

      const { data, error } = await supabase
        .from('calibration_sessions')
        .insert({
          organization_id: orgData.organization_id,
          review_cycle_id: cycleId,
          division_id:     divisionId || null,
          title,
          n2_deadline:     n2Deadline || null,
          notes:           notes || null,
          initiated_by:    profile.id,
          status:          'open',
        })
        .select()
        .single()
      if (error) throw error

      // Log historique
      await supabase.from('calibration_history').insert({
        organization_id:       orgData.organization_id,
        calibration_session_id: data.id,
        actor_id:              profile.id,
        action:                'session_created',
        after_value:           { title, cycle_id: cycleId },
      })

      return data
    },
    onSuccess: (_, { cycleId }) => {
      qc.invalidateQueries({ queryKey: ['calibration_sessions', cycleId] })
    },
  })
}

// ─── HOOK 7 : Proposer un override ───────────────────────────

export function useProposeOverride() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({
      sessionId,
      evaluationId,
      originalRating,
      calibratedRating,
      deltaScore,
      justification,
      level,
    }) => {
      const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', profile.id)
        .single()

      const { data, error } = await supabase
        .from('calibration_overrides')
        .upsert({
          organization_id:       orgData.organization_id,
          calibration_session_id: sessionId,
          review_evaluation_id:  evaluationId,
          level:                 level || 'n1',
          original_rating:       originalRating,
          calibrated_rating:     calibratedRating,
          delta_score:           deltaScore,
          justification,
          created_by:            profile.id,
          status:                'pending',
          updated_at:            new Date().toISOString(),
        }, { onConflict: 'calibration_session_id,review_evaluation_id' })
        .select()
        .single()
      if (error) throw error

      // Log
      await supabase.from('calibration_history').insert({
        organization_id:       orgData.organization_id,
        calibration_session_id: sessionId,
        review_evaluation_id:  evaluationId,
        actor_id:              profile.id,
        action:                'override_proposed',
        level:                 level || 'n1',
        before_value:          { rating: originalRating },
        after_value:           { rating: calibratedRating, justification },
      })

      // Mettre la session en in_progress
      await supabase
        .from('calibration_sessions')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('status', 'open')

      return data
    },
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ['calibration_overrides', sessionId] })
      qc.invalidateQueries({ queryKey: ['calibration_matrix', sessionId] })
      qc.invalidateQueries({ queryKey: ['calibration_history', sessionId] })
    },
  })
}

// ─── HOOK 8 : Approuver / Rejeter un override (niveau N+2) ───

export function useApproveOverride() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ overrideId, sessionId, approved, comment }) => {
      const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', profile.id)
        .single()

      const { error } = await supabase
        .from('calibration_overrides')
        .update({
          status:      approved ? 'approved' : 'rejected',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        })
        .eq('id', overrideId)
      if (error) throw error

      // Log
      await supabase.from('calibration_history').insert({
        organization_id:       orgData.organization_id,
        calibration_session_id: sessionId,
        actor_id:              profile.id,
        action:                approved ? 'override_approved' : 'override_rejected',
        level:                 'n2',
        comment,
      })
    },
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ['calibration_overrides', sessionId] })
      qc.invalidateQueries({ queryKey: ['calibration_history', sessionId] })
    },
  })
}

// ─── HOOK 9 : Soumettre pour validation N+2 ──────────────────

export function useSubmitForN2Validation() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ sessionId, cycleId }) => {
      const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', profile.id)
        .single()

      const { error } = await supabase
        .from('calibration_sessions')
        .update({ status: 'pending_n2', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (error) throw error

      await supabase.from('calibration_history').insert({
        organization_id:       orgData.organization_id,
        calibration_session_id: sessionId,
        actor_id:              profile.id,
        action:                'submitted_for_n2',
        level:                 'n1',
      })
    },
    onSuccess: (_, { cycleId }) => {
      qc.invalidateQueries({ queryKey: ['calibration_sessions', cycleId] })
    },
  })
}

// ─── HOOK 10 : Valider la session (N+2 ou DRH) ───────────────

export function useValidateCalibrationSession() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ sessionId, cycleId, comment }) => {
      const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', profile.id)
        .single()

      const { error } = await supabase
        .from('calibration_sessions')
        .update({
          status:          'validated',
          validated_by_n2: profile.id,
          updated_at:      new Date().toISOString(),
        })
        .eq('id', sessionId)
      if (error) throw error

      await supabase.from('calibration_history').insert({
        organization_id:       orgData.organization_id,
        calibration_session_id: sessionId,
        actor_id:              profile.id,
        action:                'session_validated',
        level:                 'n2',
        comment,
      })
    },
    onSuccess: (_, { cycleId }) => {
      qc.invalidateQueries({ queryKey: ['calibration_sessions', cycleId] })
    },
  })
}

// ─── HOOK 11 : Clôturer une session ──────────────────────────

export function useCloseCalibrationSession() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ sessionId, cycleId }) => {
      const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', profile.id)
        .single()

      const { error } = await supabase
        .from('calibration_sessions')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (error) throw error

      await supabase.from('calibration_history').insert({
        organization_id:       orgData.organization_id,
        calibration_session_id: sessionId,
        actor_id:              profile.id,
        action:                'session_closed',
        level:                 'hr',
      })
    },
    onSuccess: (_, { cycleId }) => {
      qc.invalidateQueries({ queryKey: ['calibration_sessions', cycleId] })
    },
  })
}

// ─── HOOK 12 : Stats de distribution pour une session ────────

export function useDistributionStats(evals) {
  const distribution = {}
  const benchmark = DISTRIBUTION_BENCHMARK

  if (!evals || evals.length === 0) return { distribution, benchmark, delta: {}, total: 0 }

  const total = evals.length

  // Distribution actuelle (rating calibré ou manager)
  evals.forEach(ev => {
    const rating = ev.calibrated_rating || ev.overall_rating
    if (rating) {
      distribution[rating] = (distribution[rating] || 0) + 1
    }
  })

  // Delta vs benchmark
  const delta = {}
  Object.keys(benchmark).forEach(key => {
    const actual = distribution[key] ? (distribution[key] / total * 100) : 0
    delta[key] = Math.round(actual - benchmark[key])
  })

  return { distribution, benchmark, delta, total }
}
