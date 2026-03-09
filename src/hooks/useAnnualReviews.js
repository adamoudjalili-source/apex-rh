// ============================================================
// APEX RH — src/hooks/useAnnualReviews.js
// Session 60 — Entretiens annuels & Évaluation avancée
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import { REVIEW_STATUS } from '../utils/constants'

// ─── CONSTANTES ──────────────────────────────────────────────

export const ANNUAL_REVIEW_STATUS = {
  pending:              'pending',
  self_in_progress:     REVIEW_STATUS.SELF_IN_PROGRESS,
  self_submitted:       REVIEW_STATUS.SELF_SUBMITTED,
  meeting_scheduled:    REVIEW_STATUS.MEETING_SCHEDULED,
  manager_in_progress:  REVIEW_STATUS.MANAGER_IN_PROGRESS,
  completed:            'completed',
  signed:               'signed',
  archived:             'archived',
}

export const ANNUAL_REVIEW_STATUS_LABELS = {
  pending:              'En attente',
  self_in_progress:     'Auto-éval en cours',
  self_submitted:       'Auto-éval soumise',
  meeting_scheduled:    'Entretien planifié',
  manager_in_progress:  'Éval manager en cours',
  completed:            'Complété',
  signed:               'Signé',
  archived:             'Archivé',
}

export const ANNUAL_REVIEW_STATUS_COLORS = {
  pending:              '#6B7280',
  self_in_progress:     '#F59E0B',
  self_submitted:       '#3B82F6',
  meeting_scheduled:    '#8B5CF6',
  manager_in_progress:  '#F97316',
  completed:            '#10B981',
  signed:               '#059669',
  archived:             '#9CA3AF',
}

export const OVERALL_RATING_LABELS = {
  insuffisant:  'Insuffisant',
  a_ameliorer:  'À améliorer',
  satisfaisant: 'Satisfaisant',
  bien:         'Bien',
  excellent:    'Excellent',
}

export const OVERALL_RATING_COLORS = {
  insuffisant:  '#EF4444',
  a_ameliorer:  '#F97316',
  satisfaisant: '#F59E0B',
  bien:         '#3B82F6',
  excellent:    '#10B981',
}

export const OVERALL_RATING_SCORES = {
  insuffisant:  1,
  a_ameliorer:  2,
  satisfaisant: 3,
  bien:         4,
  excellent:    5,
}

export const SALARY_RECOMMENDATION_LABELS = {
  maintien:                'Maintien',
  augmentation_merite:     'Augmentation mérite',
  augmentation_promotion:  'Augmentation promotion',
  revision_exceptionnelle: 'Révision exceptionnelle',
  gel:                     'Gel',
}

export const SALARY_RECOMMENDATION_COLORS = {
  maintien:                '#6B7280',
  augmentation_merite:     '#3B82F6',
  augmentation_promotion:  '#10B981',
  revision_exceptionnelle: '#C9A227',
  gel:                     '#EF4444',
}

export const CAMPAIGN_STATUS_LABELS = {
  draft:       'Brouillon',
  active:      'Active',
  in_progress: 'En cours',
  completed:   'Complétée',
  archived:    'Archivée',
}

// Sections template par défaut
export const DEFAULT_TEMPLATE_SECTIONS = [
  {
    id: 'bilan',
    title: 'Bilan de l\'année',
    type: 'text',
    description: 'Faites le bilan de vos principales réalisations et des difficultés rencontrées.',
    questions: [
      { key: 'accomplissements', label: 'Vos principales réalisations', type: 'textarea', required: true },
      { key: 'points_forts',     label: 'Vos points forts',            type: 'textarea', required: true },
      { key: 'difficultes',      label: 'Difficultés rencontrées',      type: 'textarea', required: false },
      { key: 'apprentissages',   label: 'Principaux apprentissages',    type: 'textarea', required: false },
    ],
  },
  {
    id: 'competences',
    title: 'Évaluation des compétences',
    type: 'rating',
    description: 'Évaluez vos compétences sur une échelle de 1 (insuffisant) à 5 (excellent).',
    questions: [
      { key: 'qualite',        label: 'Qualité du travail',       type: 'rating', min: 1, max: 5, required: true },
      { key: 'delais',         label: 'Respect des délais',       type: 'rating', min: 1, max: 5, required: true },
      { key: 'communication',  label: 'Communication',            type: 'rating', min: 1, max: 5, required: true },
      { key: 'travail_equipe', label: 'Esprit d\'équipe',         type: 'rating', min: 1, max: 5, required: true },
      { key: 'initiative',     label: 'Initiative & Proactivité', type: 'rating', min: 1, max: 5, required: true },
      { key: 'adaptabilite',   label: 'Adaptabilité',             type: 'rating', min: 1, max: 5, required: false },
    ],
  },
  {
    id: 'objectifs',
    title: 'Objectifs N+1',
    type: 'objectives',
    description: 'Définissez vos objectifs pour la prochaine année.',
    questions: [
      { key: 'objectifs_proposes', label: 'Objectifs proposés', type: 'objectives_list', required: true },
    ],
  },
  {
    id: 'developpement',
    title: 'Plan de développement',
    type: 'development',
    description: 'Identifiez vos besoins de formation et de développement.',
    questions: [
      { key: 'besoins_formation',  label: 'Besoins de formation identifiés',    type: 'textarea', required: false },
      { key: 'souhaits_evolution', label: 'Souhaits d\'évolution professionnelle', type: 'textarea', required: false },
      { key: 'actions_dev',        label: 'Actions de développement prioritaires', type: 'textarea', required: false },
    ],
  },
  {
    id: 'commentaires',
    title: 'Commentaires libres',
    type: 'text',
    description: 'Tout autre commentaire ou suggestion.',
    questions: [
      { key: 'commentaire_libre', label: 'Commentaire libre', type: 'textarea', required: false },
    ],
  },
]

// ─── HELPERS ─────────────────────────────────────────────────

export function getReviewStatusOrder(status) {
  const order = {
    pending: 0,
    self_in_progress: 1,
    self_submitted: 2,
    meeting_scheduled: 3,
    manager_in_progress: 4,
    completed: 5,
    signed: 6,
    archived: 7,
  }
  return order[status] ?? -1
}

export function isReviewEditable(review, userId) {
  if (!review || !userId) return false
  if (review.employee_id === userId) {
    return ['pending', REVIEW_STATUS.SELF_IN_PROGRESS].includes(review.status)
  }
  if (review.manager_id === userId) {
    return [REVIEW_STATUS.SELF_SUBMITTED, REVIEW_STATUS.MEETING_SCHEDULED, REVIEW_STATUS.MANAGER_IN_PROGRESS].includes(review.status)
  }
  return false
}

export function computeSelfScore(selfEval) {
  if (!selfEval) return null
  const compSection = selfEval?.competences
  if (!compSection) return null
  const vals = Object.values(compSection).filter(v => typeof v === 'number' && v >= 1 && v <= 5)
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function computeManagerScore(managerEval) {
  if (!managerEval) return null
  const compSection = managerEval?.competences
  if (!compSection) return null
  const vals = Object.values(compSection).filter(v => typeof v === 'number' && v >= 1 && v <= 5)
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function ratingToScore(rating) {
  return OVERALL_RATING_SCORES[rating] ?? null
}

export function scoreToRating(score) {
  if (score === null || score === undefined) return null
  if (score >= 4.5) return 'excellent'
  if (score >= 3.5) return 'bien'
  if (score >= 2.5) return 'satisfaisant'
  if (score >= 1.5) return 'a_ameliorer'
  return 'insuffisant'
}

export function formatReviewYear(year) {
  return `Entretien ${year}`
}

export function getReviewProgress(review) {
  // Retourne 0-100 pour la barre de progression
  if (!review) return 0
  const statusProgress = {
    pending: 0,
    self_in_progress: 15,
    self_submitted: 35,
    meeting_scheduled: 50,
    manager_in_progress: 65,
    completed: 80,
    signed: 100,
    archived: 100,
  }
  return statusProgress[review.status] ?? 0
}

export function isSignedByEmployee(review) {
  return !!review?.employee_signed_at
}

export function isSignedByManager(review) {
  return !!review?.manager_signed_at
}

export function isFullySigned(review) {
  return isSignedByEmployee(review) && isSignedByManager(review)
}

export function getDaysUntilDeadline(deadline) {
  if (!deadline) return null
  const diff = new Date(deadline) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isDeadlineOverdue(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function isDeadlineSoon(deadline, days = 7) {
  if (!deadline) return false
  const d = getDaysUntilDeadline(deadline)
  return d !== null && d >= 0 && d <= days
}

// ─── CAMPAGNES ────────────────────────────────────────────────

export function useActiveCampaigns() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-campaigns-active', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_review_campaigns')
        .select('id, title, description, year, status, start_date, end_date, self_eval_deadline, manager_eval_deadline, meeting_deadline, require_dual_signature, allow_employee_comment, include_pulse_synthesis, include_okr_synthesis, template_sections, created_at')
        .eq('organization_id', profile.organization_id)
        .in('status', ['active', 'in_progress'])
        .order('year', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

export function useAllCampaigns() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-campaigns-all', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_review_campaigns')
        .select('id, title, description, year, status, start_date, end_date, self_eval_deadline, manager_eval_deadline, meeting_deadline, require_dual_signature, allow_employee_comment, include_pulse_synthesis, include_okr_synthesis, template_sections, created_by, created_at, updated_at')
        .eq('organization_id', profile.organization_id)
        .order('year', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

export function useCampaign(campaignId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-campaign', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_review_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!campaignId && !!profile?.id,
    staleTime: 60_000,
  })
}

export function useCampaignStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-campaign-stats', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_annual_campaign_stats')
        .select('*')
        .order('year', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
  })
}

// ─── REVIEWS ─────────────────────────────────────────────────

/** Mon entretien en cours */
export function useMyReview(campaignId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-review-mine', campaignId, profile?.id],
    queryFn: async () => {
      const q = supabase
        .from('annual_reviews')
        .select(`
          id, status, self_eval, self_comment, self_submitted_at,
          manager_eval, manager_comment, manager_submitted_at,
          overall_rating, salary_recommendation, salary_increase_pct,
          strengths, improvement_areas, objectives_next_year, development_plan,
          auto_synthesis, meeting_date, meeting_location, meeting_notes,
          employee_signed_at, manager_signed_at, employee_comment_on_review,
          completed_at, archived_at, created_at, updated_at,
          campaign:annual_review_campaigns(id, title, year, status, start_date, end_date, self_eval_deadline, manager_eval_deadline, require_dual_signature, allow_employee_comment, include_pulse_synthesis, include_okr_synthesis, template_sections),
          manager:users!annual_reviews_manager_id_fkey(id, first_name, last_name, role)
        `)
        .eq('employee_id', profile.id)
      if (campaignId) q.eq('campaign_id', campaignId)
      else q.order('created_at', { ascending: false }).limit(1)
      const { data, error } = await q
      if (error) throw error
      return campaignId ? (data?.[0] ?? null) : (data?.[0] ?? null)
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

/** Toutes mes évaluations (historique) */
export function useMyReviews() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-reviews-mine', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_reviews')
        .select(`
          id, status, overall_rating, salary_recommendation,
          self_submitted_at, manager_submitted_at, completed_at,
          employee_signed_at, manager_signed_at, created_at,
          campaign:annual_review_campaigns(id, title, year, status),
          manager:users!annual_reviews_manager_id_fkey(id, first_name, last_name)
        `)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/** Évaluations de mon équipe (manager) */
export function useTeamReviews(campaignId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-reviews-team', campaignId, profile?.id],
    queryFn: async () => {
      let q = supabase
        .from('annual_reviews')
        .select(`
          id, status, overall_rating, salary_recommendation, salary_increase_pct,
          self_submitted_at, manager_submitted_at, completed_at,
          employee_signed_at, manager_signed_at, created_at, updated_at,
          employee:users!annual_reviews_employee_id_fkey(id, first_name, last_name, role, service_id),
          campaign:annual_review_campaigns(id, title, year, status)
        `)
        .eq('manager_id', profile.id)
        .order('created_at', { ascending: false })
      if (campaignId) q = q.eq('campaign_id', campaignId)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

/** Toutes les reviews d'une campagne (admin) */
export function useCampaignReviews(campaignId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-reviews-campaign', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_reviews')
        .select(`
          id, status, overall_rating, salary_recommendation, salary_increase_pct,
          self_submitted_at, manager_submitted_at, completed_at,
          employee_signed_at, manager_signed_at, created_at, updated_at,
          employee:users!annual_reviews_employee_id_fkey(id, first_name, last_name, role, service_id),
          manager:users!annual_reviews_manager_id_fkey(id, first_name, last_name)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!campaignId && !!profile?.id,
    staleTime: 30_000,
  })
}

/** Détail complet d'une review */
export function useReview(reviewId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-review', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_reviews')
        .select(`
          *,
          campaign:annual_review_campaigns(*),
          employee:users!annual_reviews_employee_id_fkey(id, first_name, last_name, role, service_id, direction_id),
          manager:users!annual_reviews_manager_id_fkey(id, first_name, last_name, role)
        `)
        .eq('id', reviewId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!reviewId && !!profile?.id,
    staleTime: 30_000,
  })
}

/** Reviews en attente pour le manager (self_submitted) */
export function useManagerPendingReviews() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-reviews-pending-manager', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_reviews')
        .select(`
          id, status, self_submitted_at, created_at,
          employee:users!annual_reviews_employee_id_fkey(id, first_name, last_name, role),
          campaign:annual_review_campaigns(id, title, year, manager_eval_deadline)
        `)
        .eq('manager_id', profile.id)
        .in('status', [REVIEW_STATUS.SELF_SUBMITTED, REVIEW_STATUS.MEETING_SCHEDULED, REVIEW_STATUS.MANAGER_IN_PROGRESS])
        .order('self_submitted_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

/** Historique employee (MV) */
export function useEmployeeReviewHistory(employeeId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['annual-review-history', employeeId ?? profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_employee_review_history')
        .select('*')
        .eq('employee_id', employeeId ?? profile?.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
  })
}

// ─── MUTATIONS : CAMPAGNES ───────────────────────────────────

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('annual_review_campaigns')
        .insert({
          ...payload,
          template_sections: payload.template_sections ?? DEFAULT_TEMPLATE_SECTIONS,
          organization_id: profile.organization_id,
          created_by: profile.id,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annual-campaigns-all'] })
      queryClient.invalidateQueries({ queryKey: ['annual-campaigns-active'] })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { error } = await supabase
        .from('annual_review_campaigns')
        .update(payload)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-campaigns-all'] })
      queryClient.invalidateQueries({ queryKey: ['annual-campaigns-active'] })
      queryClient.invalidateQueries({ queryKey: ['annual-campaign', id] })
    },
  })
}

export function usePublishCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId) => {
      const { error } = await supabase
        .from('annual_review_campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annual-campaigns-all'] })
      queryClient.invalidateQueries({ queryKey: ['annual-campaigns-active'] })
    },
  })
}

export function useArchiveCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId) => {
      const { error } = await supabase
        .from('annual_review_campaigns')
        .update({ status: 'archived' })
        .eq('id', campaignId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annual-campaigns-all'] })
    },
  })
}

/** Créer les entretiens pour une campagne (admin assign) */
export function useCreateCampaignReviews() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ campaign_id, assignments }) => {
      // assignments = [{employee_id, manager_id}]
      const rows = assignments.map(a => ({
        campaign_id,
        employee_id: a.employee_id,
        manager_id: a.manager_id,
        organization_id: profile.organization_id,
        status: 'pending',
      }))
      const { error } = await supabase
        .from('annual_reviews')
        .insert(rows)
        .onConflict('campaign_id,employee_id')
        .ignore()
      if (error) throw error
    },
    onSuccess: (_, { campaign_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-campaign', campaign_id] })
    },
  })
}

// ─── MUTATIONS : REVIEWS ─────────────────────────────────────

/** Sauvegarder l'auto-évaluation (brouillon) */
export function useSaveAutoEval() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, self_eval, self_comment }) => {
      const { error } = await supabase
        .from('annual_reviews')
        .update({
          self_eval,
          self_comment,
          status: REVIEW_STATUS.SELF_IN_PROGRESS,
        })
        .eq('id', review_id)
        .eq('employee_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-mine'] })
    },
  })
}

/** Soumettre l'auto-évaluation (final) */
export function useSubmitAutoEval() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, self_eval, self_comment, auto_synthesis }) => {
      const { error } = await supabase
        .from('annual_reviews')
        .update({
          self_eval,
          self_comment,
          auto_synthesis: auto_synthesis ?? null,
          status: REVIEW_STATUS.SELF_SUBMITTED,
          self_submitted_at: new Date().toISOString(),
        })
        .eq('id', review_id)
        .eq('employee_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-mine'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-pending-manager'] })
    },
  })
}

/** Planifier la réunion */
export function useScheduleMeeting() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, meeting_date, meeting_location, meeting_notes }) => {
      const { error } = await supabase
        .from('annual_reviews')
        .update({
          meeting_date,
          meeting_location,
          meeting_notes,
          status: REVIEW_STATUS.MEETING_SCHEDULED,
        })
        .eq('id', review_id)
        .eq('manager_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-team'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-pending-manager'] })
    },
  })
}

/** Sauvegarder l'évaluation manager (brouillon) */
export function useSaveManagerEval() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, manager_eval, manager_comment, overall_rating, salary_recommendation, salary_increase_pct, strengths, improvement_areas, objectives_next_year, development_plan }) => {
      const { error } = await supabase
        .from('annual_reviews')
        .update({
          manager_eval,
          manager_comment,
          overall_rating,
          salary_recommendation,
          salary_increase_pct,
          strengths,
          improvement_areas,
          objectives_next_year,
          development_plan,
          status: REVIEW_STATUS.MANAGER_IN_PROGRESS,
        })
        .eq('id', review_id)
        .eq('manager_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-team'] })
    },
  })
}

/** Soumettre l'évaluation manager (final → completed) */
export function useSubmitManagerEval() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, manager_eval, manager_comment, overall_rating, salary_recommendation, salary_increase_pct, strengths, improvement_areas, objectives_next_year, development_plan }) => {
      const { error } = await supabase
        .from('annual_reviews')
        .update({
          manager_eval,
          manager_comment,
          overall_rating,
          salary_recommendation,
          salary_increase_pct,
          strengths,
          improvement_areas,
          objectives_next_year,
          development_plan,
          status: 'completed',
          manager_submitted_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', review_id)
        .eq('manager_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-team'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-pending-manager'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-mine'] })
    },
  })
}

/** Signer l'entretien (employee ou manager) */
export function useSignReview() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, employee_comment_on_review }) => {
      const isEmployee = true // determined by who's calling
      const signedAtField = 'employee_signed_at'

      // Insérer la signature
      const { error: sigErr } = await supabase
        .from('annual_review_signatures')
        .upsert({
          review_id,
          signer_id: profile.id,
          signer_type: 'employee',
          signed_at: new Date().toISOString(),
        }, { onConflict: 'review_id,signer_type' })
      if (sigErr) throw sigErr

      // Mettre à jour la review
      const updateData = {
        employee_signed_at: new Date().toISOString(),
        employee_comment_on_review: employee_comment_on_review ?? null,
      }
      const { error } = await supabase
        .from('annual_reviews')
        .update(updateData)
        .eq('id', review_id)
        .eq('employee_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-mine'] })
    },
  })
}

/** Signature manager */
export function useManagerSignReview() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id }) => {
      const { error: sigErr } = await supabase
        .from('annual_review_signatures')
        .upsert({
          review_id,
          signer_id: profile.id,
          signer_type: 'manager',
          signed_at: new Date().toISOString(),
        }, { onConflict: 'review_id,signer_type' })
      if (sigErr) throw sigErr

      const { error } = await supabase
        .from('annual_reviews')
        .update({
          manager_signed_at: new Date().toISOString(),
          status: 'signed',
        })
        .eq('id', review_id)
        .eq('manager_id', profile.id)
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-team'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-mine'] })
    },
  })
}

/** Archiver une review */
export function useArchiveReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (review_id) => {
      const { error } = await supabase
        .from('annual_reviews')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', review_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-team'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-mine'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-campaign'] })
    },
  })
}

// ─── S80 ──────────────────────────────────────────────────────

/** Auto-évaluation structurée d'un entretien */
export function useReviewSelfAssessment(reviewId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['review-self-assessment', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_self_assessments')
        .select('*')
        .eq('review_id', reviewId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!reviewId && !!profile?.id,
    staleTime: 30_000,
  })
}

/** Soumettre ou sauvegarder l'auto-évaluation structurée */
export function useSubmitSelfAssessment() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, answers, submit = false }) => {
      const { data: existing } = await supabase
        .from('review_self_assessments')
        .select('id')
        .eq('review_id', review_id)
        .maybeSingle()

      const payload = {
        organization_id: profile.organization_id,
        review_id,
        user_id: profile.id,
        answers,
        submitted_at: submit ? new Date().toISOString() : null,
      }

      let error
      if (existing) {
        ;({ error } = await supabase
          .from('review_self_assessments')
          .update(payload)
          .eq('id', existing.id))
      } else {
        ;({ error } = await supabase
          .from('review_self_assessments')
          .insert(payload))
      }
      if (error) throw error

      // Si soumission finale → avancer le statut de la review
      if (submit) {
        const { error: revErr } = await supabase
          .from('annual_reviews')
          .update({ status: REVIEW_STATUS.SELF_SUBMITTED, self_submitted_at: new Date().toISOString() })
          .eq('id', review_id)
          .eq('employee_id', profile.id)
        if (revErr) throw revErr
      }
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['review-self-assessment', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-review', review_id] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-mine'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-pending-manager'] })
    },
  })
}

/** PDI lié à un entretien */
export function useReviewDevelopmentPlan(reviewId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['review-development-plan', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_development_plans')
        .select('*')
        .eq('review_id', reviewId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!reviewId && !!profile?.id,
    staleTime: 30_000,
  })
}

/** Créer ou mettre à jour le PDI */
export function useUpsertDevelopmentPlan() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ review_id, goals, next_check_date, status, manager_comment }) => {
      const payload = {
        organization_id: profile.organization_id,
        review_id,
        user_id: profile.id,
        goals: goals ?? [],
        next_check_date: next_check_date ?? null,
        status: status ?? 'pending',
        manager_comment: manager_comment ?? null,
      }
      const { error } = await supabase
        .from('review_development_plans')
        .upsert(payload, { onConflict: 'review_id,user_id' })
      if (error) throw error
    },
    onSuccess: (_, { review_id }) => {
      queryClient.invalidateQueries({ queryKey: ['review-development-plan', review_id] })
    },
  })
}

/** Stats de complétion pour un manager (via RPC) */
export function useReviewCompletionStats(managerId) {
  const { profile } = useAuth()
  const id = managerId ?? profile?.id
  return useQuery({
    queryKey: ['review-completion-stats', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_review_completion_stats', { p_manager_id: id })
      if (error) throw error
      return data ?? []
    },
    enabled: !!id && !!profile?.id,
    staleTime: 60_000,
  })
}

/** Entretiens mi-année — toutes les reviews de type 'mid_year' actives */
export function useMidYearReviews() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mid-year-reviews', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_reviews')
        .select(`
          id, status, review_type, self_submitted_at, manager_submitted_at,
          completed_at, employee_signed_at, manager_signed_at, created_at,
          campaign:annual_review_campaigns(id, title, year, status, self_eval_deadline, manager_eval_deadline),
          employee:users!annual_reviews_employee_id_fkey(id, first_name, last_name, role),
          manager:users!annual_reviews_manager_id_fkey(id, first_name, last_name)
        `)
        .eq('review_type', 'mid_year')
        .in('status', ['pending',REVIEW_STATUS.SELF_IN_PROGRESS,REVIEW_STATUS.SELF_SUBMITTED,REVIEW_STATUS.MEETING_SCHEDULED,REVIEW_STATUS.MANAGER_IN_PROGRESS])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/** Créer des entretiens mi-année pour une campagne */
export function useCreateMidYearReviews() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ campaign_id, assignments }) => {
      const rows = assignments.map(a => ({
        campaign_id,
        employee_id:     a.employee_id,
        manager_id:      a.manager_id,
        organization_id: profile.organization_id,
        status:          'pending',
        review_type:     'mid_year',
      }))
      const { error } = await supabase
        .from('annual_reviews')
        .insert(rows)
        .onConflict('campaign_id,employee_id')
        .ignore()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mid-year-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['annual-reviews-team'] })
    },
  })
}
