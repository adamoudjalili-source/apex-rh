// ============================================================
// APEX RH — src/hooks/useEngagementSurveys.js
// Session 29 — Module Surveys d'Engagement — Hook TanStack Query
// Exports : surveys, questions, réponses, score équipe, tendance 6 mois
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, useFeedback360.js
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

/**
 * 5 dimensions d'engagement — utilisées comme template de questions
 */
export const SURVEY_DIMENSIONS = [
  {
    key:   'satisfaction',
    label: 'Satisfaction générale',
    desc:  'Dans quelle mesure êtes-vous satisfait(e) de votre travail en général ?',
    icon:  '😊',
    color: '#6366f1',
  },
  {
    key:   'motivation',
    label: 'Motivation & Énergie',
    desc:  'Vous sentez-vous motivé(e) et énergique dans votre rôle quotidien ?',
    icon:  '⚡',
    color: '#8b5cf6',
  },
  {
    key:   'management',
    label: 'Relation Manager',
    desc:  'Votre manager vous soutient-il(elle) dans votre développement professionnel ?',
    icon:  '🤝',
    color: '#06b6d4',
  },
  {
    key:   'environment',
    label: 'Environnement de travail',
    desc:  'Votre environnement de travail favorise-t-il votre efficacité et votre bien-être ?',
    icon:  '🏢',
    color: '#10b981',
  },
  {
    key:   'balance',
    label: 'Équilibre vie pro/perso',
    desc:  'Parvenez-vous à maintenir un bon équilibre entre vie professionnelle et personnelle ?',
    icon:  '⚖️',
    color: '#f59e0b',
  },
]

/** Labels de statut */
export const SURVEY_STATUS_LABELS = {
  draft:  'Brouillon',
  active: 'En cours',
  closed: 'Terminé',
}

export const SURVEY_STATUS_COLORS = {
  draft:  'text-gray-400 bg-gray-500/10',
  active: 'text-emerald-400 bg-emerald-500/10',
  closed: 'text-violet-400 bg-violet-500/10',
}

// ─── UTILITAIRES ─────────────────────────────────────────────

/**
 * Calcule le score d'engagement moyen (0–100) à partir d'un tableau de réponses
 * Chaque réponse contient un objet scores { key: 1–5 }
 * Résultat : { overall: number, byDimension: { key: number } }
 */
export function computeEngagementScore(responses) {
  if (!responses || responses.length === 0) {
    return { overall: null, byDimension: {}, count: 0 }
  }

  const totals = {}
  const counts = {}

  SURVEY_DIMENSIONS.forEach(d => {
    totals[d.key] = 0
    counts[d.key] = 0
  })

  responses.forEach(r => {
    const scores = r.scores || {}
    SURVEY_DIMENSIONS.forEach(d => {
      const val = scores[d.key]
      if (typeof val === 'number' && val >= 1 && val <= 5) {
        totals[d.key] += val
        counts[d.key]++
      }
    })
  })

  const byDimension = {}
  let overallSum = 0
  let overallCount = 0

  SURVEY_DIMENSIONS.forEach(d => {
    if (counts[d.key] > 0) {
      // Convertir l'échelle 1–5 en 0–100
      const avg = totals[d.key] / counts[d.key]
      byDimension[d.key] = Math.round((avg - 1) / 4 * 100)
      overallSum += byDimension[d.key]
      overallCount++
    }
  })

  const overall = overallCount > 0 ? Math.round(overallSum / overallCount) : null

  return { overall, byDimension, count: responses.length }
}

/**
 * Couleur du score d'engagement
 */
export function engagementScoreColor(score) {
  if (score === null) return 'text-gray-500'
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export function engagementScoreBg(score) {
  if (score === null) return 'bg-gray-500/10'
  if (score >= 75) return 'bg-emerald-500/10'
  if (score >= 50) return 'bg-amber-500/10'
  return 'bg-red-500/10'
}

export function engagementScoreLabel(score) {
  if (score === null) return '—'
  if (score >= 75) return 'Très engagé'
  if (score >= 60) return 'Engagé'
  if (score >= 40) return 'Neutre'
  return 'Désengagé'
}

// ─── HOOKS LECTURE ────────────────────────────────────────────

/**
 * Tous les surveys actifs + fermés visibles par l'utilisateur courant
 */
export function useMySurveys() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['engagement-surveys', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagement_surveys')
        .select(`
          id, title, description, period_label, start_date, end_date,
          status, is_anonymous, created_at, created_by,
          service:services(id, name)
        `)
        .in('status', ['active', 'closed'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/**
 * Tous les surveys (managers : brouillons inclus)
 */
export function useAllSurveys() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['engagement-surveys-all', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagement_surveys')
        .select(`
          id, title, description, period_label, start_date, end_date,
          status, is_anonymous, created_at, created_by,
          service:services(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/**
 * Questions d'un survey
 */
export function useSurveyQuestions(surveyId) {
  return useQuery({
    queryKey: ['survey-questions', surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, question_key, question_text, scale_min, scale_max, position')
        .eq('survey_id', surveyId)
        .order('position')

      if (error) throw error
      return data ?? []
    },
    enabled: !!surveyId,
    staleTime: 300_000,
  })
}

/**
 * Ma réponse à un survey (si déjà soumise)
 */
export function useMyResponse(surveyId) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['survey-my-response', surveyId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id, scores, comment, submitted_at')
        .eq('survey_id', surveyId)
        .eq('respondent_id', profile.id)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!surveyId && !!profile?.id,
    staleTime: 60_000,
  })
}

/**
 * Toutes les réponses d'un survey (pour les managers — calcul score équipe)
 */
export function useSurveyResponses(surveyId) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['survey-responses', surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id, scores, comment, submitted_at, respondent_id')
        .eq('survey_id', surveyId)

      if (error) throw error
      return data ?? []
    },
    enabled: !!surveyId && !!profile?.id,
    staleTime: 30_000,
  })
}

/**
 * Tendance sur les 6 derniers surveys fermés (pour un service)
 * Retourne un tableau trié par date avec score global + par dimension
 */
export function useSurveyTrend(serviceId) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['survey-trend', serviceId ?? 'all'],
    queryFn: async () => {
      // 1. Récupérer les 6 derniers surveys fermés
      let q = supabase
        .from('engagement_surveys')
        .select('id, title, period_label, end_date, service_id')
        .eq('status', 'closed')
        .order('end_date', { ascending: false })
        .limit(6)

      if (serviceId) q = q.eq('service_id', serviceId)

      const { data: surveys, error: surveyErr } = await q
      if (surveyErr) throw surveyErr
      if (!surveys || surveys.length === 0) return []

      // 2. Récupérer toutes les réponses pour ces surveys
      const surveyIds = surveys.map(s => s.id)
      const { data: responses, error: respErr } = await supabase
        .from('survey_responses')
        .select('survey_id, scores')
        .in('survey_id', surveyIds)

      if (respErr) throw respErr

      // 3. Grouper par survey et calculer les scores
      const byId = {}
      surveys.forEach(s => { byId[s.id] = { ...s, responses: [] } })
      ;(responses ?? []).forEach(r => {
        if (byId[r.survey_id]) byId[r.survey_id].responses.push(r)
      })

      // 4. Calculer et retourner triés chronologiquement
      return surveys
        .map(s => ({
          id:          s.id,
          period:      s.period_label,
          end_date:    s.end_date,
          ...computeEngagementScore(byId[s.id].responses),
        }))
        .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
    },
    enabled: !!profile?.id,
    staleTime: 120_000,
  })
}

/**
 * Résumé équipe : nb réponses / nb attendues pour un survey actif
 */
export function useSurveySummary(surveyId, serviceId) {
  return useQuery({
    queryKey: ['survey-summary', surveyId],
    queryFn: async () => {
      // Compter les utilisateurs actifs du service
      let uq = supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)

      if (serviceId) uq = uq.eq('service_id', serviceId)

      const [{ count: totalUsers }, { data: responses }] = await Promise.all([
        uq,
        supabase
          .from('survey_responses')
          .select('id')
          .eq('survey_id', surveyId),
      ])

      return {
        total:    totalUsers ?? 0,
        answered: responses?.length ?? 0,
        rate:     totalUsers ? Math.round(((responses?.length ?? 0) / totalUsers) * 100) : 0,
      }
    },
    enabled: !!surveyId,
    staleTime: 30_000,
  })
}

// ─── HOOKS MUTATION ───────────────────────────────────────────

/**
 * Créer un survey (managers seulement)
 * Crée automatiquement les 5 questions par défaut
 */
export function useCreateSurvey() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ title, description, periodLabel, startDate, endDate, isAnonymous = true, serviceId }) => {
      // 1. Créer le survey
      const { data: survey, error: surveyErr } = await supabase
        .from('engagement_surveys')
        .insert({
          title,
          description,
          period_label:  periodLabel,
          start_date:    startDate,
          end_date:      endDate,
          is_anonymous:  isAnonymous,
          service_id:    serviceId ?? profile?.service_id ?? null,
          created_by:    profile?.id,
          status:        'draft',
        })
        .select('id')
        .single()

      if (surveyErr) throw surveyErr

      // 2. Insérer les 5 questions par défaut
      const questions = SURVEY_DIMENSIONS.map((d, idx) => ({
        survey_id:     survey.id,
        question_key:  d.key,
        question_text: d.desc,
        scale_min:     1,
        scale_max:     5,
        position:      idx,
      }))

      const { error: qErr } = await supabase
        .from('survey_questions')
        .insert(questions)

      if (qErr) throw qErr

      return survey
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-surveys'] })
      queryClient.invalidateQueries({ queryKey: ['engagement-surveys-all'] })
    },
  })
}

/**
 * Activer un survey (draft → active)
 */
export function useActivateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (surveyId) => {
      const { data, error } = await supabase
        .from('engagement_surveys')
        .update({ status: 'active' })
        .eq('id', surveyId)
        .select('id')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-surveys'] })
      queryClient.invalidateQueries({ queryKey: ['engagement-surveys-all'] })
    },
  })
}

/**
 * Fermer un survey (active → closed)
 */
export function useCloseSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (surveyId) => {
      const { data, error } = await supabase
        .from('engagement_surveys')
        .update({ status: 'closed' })
        .eq('id', surveyId)
        .select('id')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-surveys'] })
      queryClient.invalidateQueries({ queryKey: ['engagement-surveys-all'] })
      queryClient.invalidateQueries({ queryKey: ['survey-trend'] })
    },
  })
}

/**
 * Soumettre sa réponse à un survey
 */
export function useSubmitSurveyResponse() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ surveyId, scores, comment }) => {
      const { data, error } = await supabase
        .from('survey_responses')
        .upsert({
          survey_id:    surveyId,
          respondent_id: profile.id,
          scores,
          comment:      comment ?? null,
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'survey_id,respondent_id' })
        .select('id')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { surveyId }) => {
      queryClient.invalidateQueries({ queryKey: ['survey-my-response', surveyId] })
      queryClient.invalidateQueries({ queryKey: ['survey-responses', surveyId] })
      queryClient.invalidateQueries({ queryKey: ['survey-summary', surveyId] })
    },
  })
}
