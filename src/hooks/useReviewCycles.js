// ============================================================
// APEX RH — src/hooks/useReviewCycles.js
// Session 32 — Module Review Cycles Formels
// Évaluations trimestrielles, semestrielles, annuelles
// Synthèse automatique : PULSE + Feedback 360° + OKRs
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, etc.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const REVIEW_COMPETENCIES = [
  { key: 'quality',       label: 'Qualité du travail',       icon: '⭐', description: 'Précision, soin, absence d\'erreurs' },
  { key: 'deadlines',     label: 'Respect des délais',       icon: '⏱️', description: 'Ponctualité, respect des engagements' },
  { key: 'communication', label: 'Communication',            icon: '💬', description: 'Clarté, écoute, partage d\'information' },
  { key: 'teamwork',      label: 'Esprit d\'équipe',         icon: '🤝', description: 'Collaboration, entraide, cohésion' },
  { key: 'initiative',    label: 'Initiative & Proactivité', icon: '🚀', description: 'Force de proposition, autonomie, créativité' },
]

export const CYCLE_FREQUENCY_LABELS = {
  quarterly: 'Trimestrielle',
  biannual:  'Semestrielle',
  annual:    'Annuelle',
}

export const EVAL_STATUS_LABELS = {
  pending:           'En attente',
  self_submitted:    'Auto-évaluation soumise',
  manager_submitted: 'Évaluation manager soumise',
  validated:         'Validée',
  archived:          'Archivée',
}

export const EVAL_STATUS_COLORS = {
  pending:           '#6B7280',
  self_submitted:    '#F59E0B',
  manager_submitted: '#3B82F6',
  validated:         '#10B981',
  archived:          '#9CA3AF',
}

export const OVERALL_RATING_LABELS = {
  insuffisant:   'Insuffisant',
  a_ameliorer:   'À améliorer',
  satisfaisant:  'Satisfaisant',
  bien:          'Bien',
  excellent:     'Excellent',
}

export const OVERALL_RATING_COLORS = {
  insuffisant:   '#EF4444',
  a_ameliorer:   '#F97316',
  satisfaisant:  '#F59E0B',
  bien:          '#3B82F6',
  excellent:     '#10B981',
}

export const CYCLE_STATUS_LABELS = {
  draft:     'Brouillon',
  active:    'Actif',
  in_review: 'En révision',
  closed:    'Clôturé',
}

// ─── HELPER ──────────────────────────────────────────────────

export function isManagerRole(role) {
  return ['administrateur', 'directeur', 'chef_division', 'chef_service'].includes(role)
}

// ─── TEMPLATES ───────────────────────────────────────────────

/**
 * Tous les templates de grille disponibles
 */
export function useReviewTemplates() {
  return useQuery({
    queryKey: ['review-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_templates')
        .select('id, name, description, frequency, is_default, questions, created_at')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })
}

// ─── CYCLES ──────────────────────────────────────────────────

/**
 * Cycles actifs ou en révision — pour tous les utilisateurs
 */
export function useActiveCycles() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['review-cycles-active', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_cycles')
        .select(`
          id, title, frequency, period_start, period_end, status, created_at,
          service:services(id, name),
          template:review_templates(id, name, questions)
        `)
        .in('status', ['active', 'in_review'])
        .order('period_start', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/**
 * Tous les cycles (managers uniquement)
 */
export function useAllCycles() {
  const { profile } = useAuth()
  const isManager = isManagerRole(profile?.role)
  return useQuery({
    queryKey: ['review-cycles-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_cycles')
        .select(`
          id, title, frequency, period_start, period_end, status, created_at, closed_at,
          service:services(id, name),
          template:review_templates(id, name, questions),
          created_by_user:users!review_cycles_created_by_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id && isManager,
    staleTime: 60_000,
  })
}

// ─── ÉVALUATIONS ─────────────────────────────────────────────

/**
 * Mes évaluations (en tant que collaborateur évalué)
 */
export function useMyEvaluations() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['review-evals-mine', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_evaluations')
        .select(`
          id, status, self_answers, manager_answers, synthesis,
          overall_rating, final_comment,
          self_submitted_at, manager_submitted_at, validated_at, created_at,
          cycle:review_cycles(id, title, frequency, period_start, period_end, status),
          evaluator:users!review_evaluations_evaluator_id_fkey(id, first_name, last_name, role)
        `)
        .eq('evaluatee_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/**
 * Évaluations d'un cycle (vue manager)
 */
export function useCycleEvaluations(cycleId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['review-evals-cycle', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_evaluations')
        .select(`
          id, status, self_answers, manager_answers, synthesis,
          overall_rating, final_comment,
          self_submitted_at, manager_submitted_at, validated_at, created_at,
          evaluatee:users!review_evaluations_evaluatee_id_fkey(id, first_name, last_name, role, service_id),
          evaluator:users!review_evaluations_evaluator_id_fkey(id, first_name, last_name, role)
        `)
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!cycleId && !!profile?.id,
    staleTime: 60_000,
  })
}

/**
 * Évaluations à traiter par le manager (self_submitted → en attente de notation manager)
 */
export function useManagerPendingEvals() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['review-evals-pending-manager', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_evaluations')
        .select(`
          id, status, self_answers, self_submitted_at, created_at,
          cycle:review_cycles(id, title, frequency, period_start, period_end),
          evaluatee:users!review_evaluations_evaluatee_id_fkey(id, first_name, last_name, role)
        `)
        .eq('evaluator_id', profile.id)
        .eq('status', 'self_submitted')
        .order('self_submitted_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id && isManagerRole(profile?.role),
    staleTime: 60_000,
  })
}

// ─── SYNTHÈSE AUTOMATIQUE ────────────────────────────────────

/**
 * Synthèse PULSE + Feedback 360° + OKRs pour un collaborateur sur une période
 */
export function useCollaboratorSynthesis(userId, periodStart, periodEnd) {
  return useQuery({
    queryKey: ['review-synthesis', userId, periodStart, periodEnd],
    queryFn: async () => {
      if (!userId || !periodStart || !periodEnd) return null

      const synthesis = {}

      // ── PULSE : score moyen sur la période ────────────────
      try {
        const { data: pulseLogs } = await supabase
          .from('pulse_daily_logs')
          .select('total_score, log_date')
          .eq('user_id', userId)
          .gte('log_date', periodStart)
          .lte('log_date', periodEnd)
          .not('total_score', 'is', null)

        if (pulseLogs && pulseLogs.length > 0) {
          const scores = pulseLogs.map(l => l.total_score)
          synthesis.pulse_avg_score    = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          synthesis.pulse_period_days  = pulseLogs.length
          synthesis.pulse_min_score    = Math.min(...scores)
          synthesis.pulse_max_score    = Math.max(...scores)
        } else {
          synthesis.pulse_avg_score   = null
          synthesis.pulse_period_days = 0
        }
      } catch { synthesis.pulse_avg_score = null }

      // ── FEEDBACK 360° : scores reçus validés ─────────────
      try {
        const { data: f360Requests } = await supabase
          .from('feedback_requests')
          .select(`
            id, type,
            campaign:feedback_campaigns!inner(id, start_date, end_date, status)
          `)
          .eq('evaluated_id', userId)
          .eq('status', 'validated')
          .gte('campaign.start_date', periodStart)
          .lte('campaign.end_date', periodEnd)

        if (f360Requests && f360Requests.length > 0) {
          const requestIds = f360Requests.map(r => r.id)
          const { data: responses } = await supabase
            .from('feedback_responses')
            .select('question_key, score, request_id')
            .in('request_id', requestIds)
            .not('score', 'is', null)

          if (responses && responses.length > 0) {
            const allScores = responses.map(r => r.score)
            synthesis.feedback360_avg             = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
            synthesis.feedback360_response_count  = responses.length
            synthesis.feedback360_campaign_count  = f360Requests.length

            // Moyennes par compétence
            const byKey = {}
            responses.forEach(r => {
              if (!byKey[r.question_key]) byKey[r.question_key] = []
              byKey[r.question_key].push(r.score)
            })
            synthesis.feedback360_by_competency = Object.entries(byKey).reduce((acc, [k, vals]) => {
              acc[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
              return acc
            }, {})
          } else {
            synthesis.feedback360_avg = null
          }
        } else {
          synthesis.feedback360_avg = null
        }
      } catch { synthesis.feedback360_avg = null }

      // ── OKRs : taux de complétion des objectifs ────────────
      try {
        const { data: objectives } = await supabase
          .from('objectives')
          .select('id, title, progress, status')
          .eq('owner_id', userId)
          .gte('created_at', `${periodStart}T00:00:00Z`)
          .lte('created_at', `${periodEnd}T23:59:59Z`)

        if (objectives && objectives.length > 0) {
          const completed  = objectives.filter(o => o.status === 'termine' || o.progress >= 100)
          const avgProgress = Math.round(objectives.reduce((a, o) => a + (o.progress ?? 0), 0) / objectives.length)
          synthesis.okr_count            = objectives.length
          synthesis.okr_completed_count  = completed.length
          synthesis.okr_completion_rate  = Math.round((completed.length / objectives.length) * 100)
          synthesis.okr_avg_progress     = avgProgress
        } else {
          synthesis.okr_count           = 0
          synthesis.okr_completion_rate = null
        }
      } catch { synthesis.okr_count = 0 }

      synthesis.generated_at = new Date().toISOString()
      return synthesis
    },
    enabled: !!userId && !!periodStart && !!periodEnd,
    staleTime: 300_000,
  })
}

// ─── MUTATIONS ───────────────────────────────────────────────

/**
 * Créer un nouveau cycle (managers)
 */
export function useCreateCycle() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ title, frequency, period_start, period_end, template_id, service_id, collaborator_ids }) => {
      // 1. Créer le cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('review_cycles')
        .insert({
          title,
          frequency,
          period_start,
          period_end,
          template_id: template_id || null,
          service_id: service_id || null,
          created_by: profile.id,
          status: 'draft',
        })
        .select()
        .single()

      if (cycleError) throw cycleError

      // 2. Créer les évaluations pour chaque collaborateur
      if (collaborator_ids?.length > 0) {
        const evals = collaborator_ids.map(uid => ({
          cycle_id: cycle.id,
          evaluatee_id: uid,
          evaluator_id: profile.id,
          status: 'pending',
        }))
        const { error: evalError } = await supabase
          .from('review_evaluations')
          .insert(evals)
        if (evalError) throw evalError
      }

      return cycle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles-all'] })
      queryClient.invalidateQueries({ queryKey: ['review-cycles-active'] })
    },
  })
}

/**
 * Activer un cycle (changer status: draft → active)
 */
export function useActivateCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cycleId) => {
      const { error } = await supabase
        .from('review_cycles')
        .update({ status: 'active' })
        .eq('id', cycleId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles-all'] })
      queryClient.invalidateQueries({ queryKey: ['review-cycles-active'] })
    },
  })
}

/**
 * Passer un cycle en révision (active → in_review)
 */
export function useStartReviewPhase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cycleId) => {
      const { error } = await supabase
        .from('review_cycles')
        .update({ status: 'in_review' })
        .eq('id', cycleId)
      if (error) throw error
    },
    onSuccess: (_, cycleId) => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles-all'] })
      queryClient.invalidateQueries({ queryKey: ['review-cycles-active'] })
      queryClient.invalidateQueries({ queryKey: ['review-evals-cycle', cycleId] })
    },
  })
}

/**
 * Clôturer un cycle (in_review → closed)
 */
export function useCloseCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cycleId) => {
      const { error } = await supabase
        .from('review_cycles')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', cycleId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles-all'] })
      queryClient.invalidateQueries({ queryKey: ['review-cycles-active'] })
    },
  })
}

/**
 * Soumettre l'auto-évaluation (collaborateur)
 */
export function useSubmitSelfEvaluation() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ evaluation_id, self_answers }) => {
      const { error } = await supabase
        .from('review_evaluations')
        .update({
          self_answers,
          status: 'self_submitted',
          self_submitted_at: new Date().toISOString(),
        })
        .eq('id', evaluation_id)
        .eq('evaluatee_id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-evals-mine'] })
      queryClient.invalidateQueries({ queryKey: ['review-evals-pending-manager'] })
    },
  })
}

/**
 * Soumettre l'évaluation manager + synthèse calculée
 */
export function useSubmitManagerEvaluation() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ evaluation_id, manager_answers, synthesis, overall_rating, final_comment }) => {
      const { error } = await supabase
        .from('review_evaluations')
        .update({
          manager_answers,
          synthesis,
          overall_rating,
          final_comment,
          status: 'manager_submitted',
          manager_submitted_at: new Date().toISOString(),
        })
        .eq('id', evaluation_id)
        .eq('evaluator_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['review-evals-pending-manager'] })
      queryClient.invalidateQueries({ queryKey: ['review-evals-mine'] })
      queryClient.invalidateQueries({ queryKey: ['review-evals-cycle'] })
    },
  })
}

/**
 * Valider une évaluation manager_submitted → validated
 */
export function useValidateEvaluation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (evaluation_id) => {
      const { error } = await supabase
        .from('review_evaluations')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
        })
        .eq('id', evaluation_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-evals-mine'] })
      queryClient.invalidateQueries({ queryKey: ['review-evals-cycle'] })
      queryClient.invalidateQueries({ queryKey: ['review-evals-pending-manager'] })
    },
  })
}

/**
 * Archiver une évaluation validée
 */
export function useArchiveEvaluation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (evaluation_id) => {
      const { error } = await supabase
        .from('review_evaluations')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
        })
        .eq('id', evaluation_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-evals-mine'] })
      queryClient.invalidateQueries({ queryKey: ['review-evals-cycle'] })
    },
  })
}

/**
 * Ajouter des collaborateurs à un cycle existant
 */
export function useAddCollaboratorsToCycle() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ cycle_id, collaborator_ids }) => {
      const evals = collaborator_ids.map(uid => ({
        cycle_id,
        evaluatee_id: uid,
        evaluator_id: profile.id,
        status: 'pending',
      }))
      const { error } = await supabase
        .from('review_evaluations')
        .insert(evals)
        .onConflict('cycle_id,evaluatee_id')
        .ignore()
      if (error) throw error
    },
    onSuccess: (_, { cycle_id }) => {
      queryClient.invalidateQueries({ queryKey: ['review-evals-cycle', cycle_id] })
    },
  })
}

// ─── UTILITAIRES ─────────────────────────────────────────────

/**
 * Calcule le score moyen d'une réponse d'évaluation (objet clé→score)
 */
export function computeAverageScore(answers) {
  if (!answers || typeof answers !== 'object') return null
  const scores = Object.values(answers).filter(v => typeof v === 'number' && !isNaN(v))
  if (scores.length === 0) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
}

/**
 * Génère un label de période lisible
 */
export function formatCyclePeriod(start, end) {
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
  if (s.getFullYear() === e.getFullYear()) {
    return `${months[s.getMonth()]} – ${months[e.getMonth()]} ${e.getFullYear()}`
  }
  return `${months[s.getMonth()]} ${s.getFullYear()} – ${months[e.getMonth()]} ${e.getFullYear()}`
}

/**
 * Compte les statuts d'un ensemble d'évaluations
 */
export function countEvalStatuses(evaluations) {
  const counts = { pending: 0, self_submitted: 0, manager_submitted: 0, validated: 0, archived: 0 }
  evaluations.forEach(e => { if (counts[e.status] !== undefined) counts[e.status]++ })
  counts.total = evaluations.length
  counts.completion_rate = evaluations.length > 0
    ? Math.round(((counts.validated + counts.archived) / evaluations.length) * 100)
    : 0
  return counts
}
