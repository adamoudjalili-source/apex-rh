import { MANAGER_ROLES } from '../lib/roles'
// ============================================================
// APEX RH — src/hooks/useFeedback360.js
// Session 28 — Module Feedback 360° — Hook TanStack Query
// Exports : campagnes, demandes, soumission, validation, résumé équipe
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, etc.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const FEEDBACK_QUESTIONS = [
  { key: 'quality',        label: 'Qualité du travail',      icon: '⭐' },
  { key: 'deadlines',      label: 'Respect des délais',      icon: '⏱️' },
  { key: 'communication',  label: 'Communication',           icon: '💬' },
  { key: 'teamwork',       label: 'Esprit d\'équipe',        icon: '🤝' },
  { key: 'initiative',     label: 'Initiative & Proactivité', icon: '🚀' },
]

export const FEEDBACK_TYPE_LABELS = {
  self:    'Auto-évaluation',
  peer:    'Feedback pair',
  manager: 'Feedback manager',
}

// ─── CAMPAGNES ───────────────────────────────────────────────

/**
 * Toutes les campagnes actives visibles par l'utilisateur courant
 */
export function useMyCampaigns() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['feedback-campaigns', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_campaigns')
        .select(`
          id, title, description, start_date, end_date, status, created_at,
          created_by,
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
 * Toutes les campagnes (pour les managers : brouillons + actives + fermées)
 */
export function useAllCampaigns() {
  const { profile } = useAuth()
  const isManager = MANAGER_ROLES.includes(profile?.role)

  return useQuery({
    queryKey: ['feedback-campaigns-all', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_campaigns')
        .select(`
          id, title, description, start_date, end_date, status, created_at,
          created_by,
          service:services(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id && isManager,
    staleTime: 60_000,
  })
}

// ─── DEMANDES DE FEEDBACK ────────────────────────────────────

/**
 * Les demandes en attente que l'utilisateur DOIT remplir (rôle évaluateur)
 */
export function useFeedbackToGive() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['feedback-to-give', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id, type, status, created_at,
          campaign:feedback_campaigns(id, title, end_date),
          evaluated:users!feedback_requests_evaluated_id_fkey(id, first_name, last_name, role)
        `)
        .eq('evaluator_id', profile.id)
        .in('status', ['pending'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

/**
 * Toutes mes demandes (en attente + soumises + validées)
 */
export function useMyFeedbackRequests() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['feedback-my-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id, type, status, created_at, submitted_at,
          campaign:feedback_campaigns(id, title, end_date),
          evaluated:users!feedback_requests_evaluated_id_fkey(id, first_name, last_name, role),
          evaluator:users!feedback_requests_evaluator_id_fkey(id, first_name, last_name, role)
        `)
        .eq('evaluator_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/**
 * Feedbacks reçus sur moi (pour voir mes résultats après validation)
 */
export function useFeedbackReceived(userId) {
  const { profile } = useAuth()
  const targetId = userId ?? profile?.id

  return useQuery({
    queryKey: ['feedback-received', targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id, type, status, submitted_at,
          campaign:feedback_campaigns(id, title, award_month:start_date),
          evaluator:users!feedback_requests_evaluator_id_fkey(id, first_name, last_name, role),
          responses:feedback_responses(question_key, score, comment)
        `)
        .eq('evaluated_id', targetId)
        .eq('status', 'validated')
        .order('submitted_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!targetId,
    staleTime: 120_000,
  })
}

/**
 * Résumé des scores moyens par collaborateur pour un service (vue manager)
 */
export function useTeamFeedbackSummary(serviceId) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['feedback-team-summary', serviceId ?? profile?.service_id],
    queryFn: async () => {
      const sid = serviceId ?? profile?.service_id
      if (!sid) return []

      // Récupérer toutes les réponses validées pour les membres du service
      const { data: requests, error } = await supabase
        .from('feedback_requests')
        .select(`
          evaluated_id,
          evaluated:users!feedback_requests_evaluated_id_fkey(id, first_name, last_name, role, service_id),
          responses:feedback_responses(question_key, score)
        `)
        .eq('status', 'validated')

      if (error) throw error

      // Filtrer par service et calculer les moyennes
      const byUser = {}
      ;(requests ?? [])
        .filter(r => r.evaluated?.service_id === sid)
        .forEach(r => {
          const uid = r.evaluated_id
          if (!byUser[uid]) {
            byUser[uid] = {
              user: r.evaluated,
              scores: {},
              counts: {},
            }
          }
          ;(r.responses ?? []).forEach(resp => {
            if (!byUser[uid].scores[resp.question_key]) {
              byUser[uid].scores[resp.question_key] = 0
              byUser[uid].counts[resp.question_key] = 0
            }
            byUser[uid].scores[resp.question_key] += resp.score
            byUser[uid].counts[resp.question_key] += 1
          })
        })

      // Calculer les moyennes
      return Object.values(byUser).map(entry => {
        const avgScores = {}
        let totalAvg = 0
        let totalCount = 0
        FEEDBACK_QUESTIONS.forEach(q => {
          const count = entry.counts[q.key] ?? 0
          const avg = count > 0 ? Math.round(entry.scores[q.key] / count * 10) / 10 : null
          avgScores[q.key] = avg
          if (avg !== null) { totalAvg += avg; totalCount++ }
        })
        return {
          user: entry.user,
          avgScores,
          globalAvg: totalCount > 0 ? Math.round((totalAvg / totalCount) * 10) / 10 : null,
        }
      }).sort((a, b) => (b.globalAvg ?? -1) - (a.globalAvg ?? -1))
    },
    enabled: !!profile?.id,
    staleTime: 120_000,
  })
}

/**
 * Toutes les demandes d'une campagne (vue manager pour validation)
 */
export function useCampaignRequests(campaignId) {
  return useQuery({
    queryKey: ['feedback-campaign-requests', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id, type, status, created_at, submitted_at,
          evaluator:users!feedback_requests_evaluator_id_fkey(id, first_name, last_name, role),
          evaluated:users!feedback_requests_evaluated_id_fkey(id, first_name, last_name, role),
          responses:feedback_responses(question_key, score, comment)
        `)
        .eq('campaign_id', campaignId)
        .order('evaluated_id')

      if (error) throw error
      return data ?? []
    },
    enabled: !!campaignId,
    staleTime: 30_000,
  })
}

// ─── MUTATIONS ───────────────────────────────────────────────

/**
 * Créer une campagne de feedback (managers uniquement)
 */
export function useCreateCampaign() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title, description, service_id, start_date, end_date, participants = [] }) => {
      // 1. Créer la campagne
      const { data: campaign, error: campErr } = await supabase
        .from('feedback_campaigns')
        .insert({
          title,
          description,
          created_by: profile.id,
          service_id: service_id ?? profile.service_id,
          start_date,
          end_date,
          status: 'active',
        })
        .select()
        .single()

      if (campErr) throw campErr

      // 2. Créer les demandes de feedback pour chaque participant
      if (participants.length > 0) {
        const requests = []

        participants.forEach(userId => {
          // Auto-évaluation
          requests.push({
            campaign_id: campaign.id,
            evaluator_id: userId,
            evaluated_id: userId,
            type: 'self',
          })

          // Feedback manager → collaborateur
          if (profile.role !== 'collaborateur') {
            requests.push({
              campaign_id: campaign.id,
              evaluator_id: profile.id,
              evaluated_id: userId,
              type: 'manager',
            })
          }
        })

        // Ajouter feedbacks pair (chaque participant évalue les autres)
        if (participants.length > 1) {
          participants.forEach(evaluatorId => {
            participants
              .filter(id => id !== evaluatorId)
              .forEach(evaluatedId => {
                requests.push({
                  campaign_id: campaign.id,
                  evaluator_id: evaluatorId,
                  evaluated_id: evaluatedId,
                  type: 'peer',
                })
              })
          })
        }

        const { error: reqErr } = await supabase
          .from('feedback_requests')
          .insert(requests)

        if (reqErr) throw reqErr
      }

      return campaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-campaigns-all'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-to-give'] })
    },
  })
}

/**
 * Soumettre un feedback (l'évaluateur remplit le formulaire)
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, responses }) => {
      // responses = [{ question_key, score, comment }]

      // 1. Insérer toutes les réponses
      const { error: respErr } = await supabase
        .from('feedback_responses')
        .upsert(
          responses.map(r => ({ ...r, request_id: requestId })),
          { onConflict: 'request_id,question_key' }
        )

      if (respErr) throw respErr

      // 2. Marquer la demande comme soumise
      const { error: reqErr } = await supabase
        .from('feedback_requests')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', requestId)

      if (reqErr) throw reqErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-to-give'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-my-requests'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-campaign-requests'] })
    },
  })
}

/**
 * Valider un feedback (manager uniquement : soumis → validé)
 */
export function useValidateFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId) => {
      const { error } = await supabase
        .from('feedback_requests')
        .update({ status: 'validated' })
        .eq('id', requestId)
        .eq('status', 'submitted')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-campaign-requests'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-received'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-team-summary'] })
    },
  })
}

/**
 * Fermer une campagne (manager : active → closed)
 */
export function useCloseCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaignId) => {
      const { error } = await supabase
        .from('feedback_campaigns')
        .update({ status: 'closed' })
        .eq('id', campaignId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-campaigns-all'] })
    },
  })
}

// ─── UTILITAIRES ─────────────────────────────────────────────

/**
 * Calcule le score moyen d'un tableau de réponses par clé de question
 */
export function computeAverageScores(responses) {
  const totals = {}
  const counts = {}

  ;(responses ?? []).forEach(r => {
    if (r.score == null) return
    totals[r.question_key] = (totals[r.question_key] ?? 0) + r.score
    counts[r.question_key] = (counts[r.question_key] ?? 0) + 1
  })

  const result = {}
  FEEDBACK_QUESTIONS.forEach(q => {
    const count = counts[q.key] ?? 0
    result[q.key] = count > 0 ? Math.round((totals[q.key] / count) * 10) / 10 : null
  })

  return result
}

// ─── S81 — Cycles planifiés + tendances ──────────────────────────────────────

/** Templates 360° de l'organisation */
export function useFeedback360Templates() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['feedback360-templates', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback360_templates')
        .select('id, name, description, competences, is_default, created_at')
        .order('is_default', { ascending: false })
        .order('name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 120_000,
  })
}

/** Upsert un template 360° */
export function useUpsertFeedback360Template() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (template) => {
      const payload = { ...template, organization_id: profile.organization_id }
      if (template.id) {
        const { error } = await supabase.from('feedback360_templates').update(payload).eq('id', template.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('feedback360_templates').insert({ ...payload, created_by: profile.id })
        if (error) throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback360-templates'] }),
  })
}

/** Tous les cycles 360° de l'organisation */
export function useFeedback360Cycles() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['feedback360-cycles', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback360_cycles')
        .select(`
          id, title, description, start_date, end_date, status, scope,
          launched_at, closed_at, created_at,
          template:feedback360_templates(id, name),
          creator:users!feedback360_cycles_created_by_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

/** Cycle 360° actif */
export function useActiveFeedback360Cycle() {
  const { data: cycles = [], ...rest } = useFeedback360Cycles()
  return { data: cycles.find(c => c.status === 'active') ?? null, ...rest }
}

/** Créer un cycle 360° */
export function useCreateFeedback360Cycle() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (cycle) => {
      const { error } = await supabase
        .from('feedback360_cycles')
        .insert({ ...cycle, organization_id: profile.organization_id, created_by: profile.id, status: 'draft' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback360-cycles'] }),
  })
}

/** Mettre à jour le statut d'un cycle */
export function useUpdateFeedback360CycleStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cycleId, status }) => {
      const patch = { status }
      if (status === 'active') patch.launched_at = new Date().toISOString()
      if (status === 'closed') patch.closed_at   = new Date().toISOString()
      const { error } = await supabase.from('feedback360_cycles').update(patch).eq('id', cycleId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback360-cycles'] }),
  })
}

/** Évaluations à compléter pour moi */
export function useMyFeedback360ToComplete(cycleId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['feedback360-to-complete', cycleId, profile?.id],
    queryFn: async () => {
      let q = supabase
        .from('feedback360_requests')
        .select(`
          id, cycle_id, relationship, status, submitted_at, answers, is_anonymous, created_at,
          evaluatee:users!feedback360_requests_evaluatee_id_fkey(id, first_name, last_name, role),
          cycle:feedback360_cycles(id, title, end_date, template_id,
            template:feedback360_templates(competences))
        `)
        .eq('evaluator_id', profile.id)
        .neq('status', 'declined')
        .order('created_at', { ascending: false })
      if (cycleId) q = q.eq('cycle_id', cycleId)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

/** Demandes reçues sur moi */
export function useMyFeedback360Requests(cycleId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['feedback360-my-requests', cycleId, profile?.id],
    queryFn: async () => {
      let q = supabase
        .from('feedback360_requests')
        .select('id, cycle_id, relationship, status, submitted_at, is_anonymous, evaluator:users!feedback360_requests_evaluator_id_fkey(id, first_name, last_name)')
        .eq('evaluatee_id', profile.id)
        .order('created_at', { ascending: false })
      if (cycleId) q = q.eq('cycle_id', cycleId)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

/** Soumettre une évaluation 360° */
export function useSubmitFeedback360Advanced() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId, answers }) => {
      const { error } = await supabase
        .from('feedback360_requests')
        .update({ answers, status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', requestId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback360-to-complete'] })
      queryClient.invalidateQueries({ queryKey: ['feedback360-summary'] })
      queryClient.invalidateQueries({ queryKey: ['feedback360-cycle-stats'] })
    },
  })
}

/** Sauvegarder un brouillon */
export function useSaveFeedback360Draft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId, answers }) => {
      const { error } = await supabase
        .from('feedback360_requests')
        .update({ answers, status: 'in_progress' })
        .eq('id', requestId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback360-to-complete'] }),
  })
}

/** Créer les demandes pour un cycle (bulk) */
export function useCreateFeedback360Requests() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ cycleId, assignments }) => {
      const rows = assignments.map(a => ({
        cycle_id: cycleId, evaluatee_id: a.evaluatee_id, evaluator_id: a.evaluator_id,
        relationship: a.relationship ?? 'peer', is_anonymous: a.is_anonymous ?? true,
        status: 'pending', organization_id: profile.organization_id,
      }))
      const { error } = await supabase.from('feedback360_requests')
        .upsert(rows, { onConflict: 'cycle_id,evaluatee_id,evaluator_id', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback360-cycle-stats'] })
      queryClient.invalidateQueries({ queryKey: ['feedback360-to-complete'] })
    },
  })
}

/** Stats d'un cycle (taux de réponse) */
export function useFeedback360CycleStats(cycleId) {
  return useQuery({
    queryKey: ['feedback360-cycle-stats', cycleId],
    queryFn: async () => {
      if (!cycleId) return null
      const { data, error } = await supabase
        .from('feedback360_requests')
        .select('id, evaluatee_id, status, relationship')
        .eq('cycle_id', cycleId)
      if (error) throw error
      const total     = data.length
      const submitted = data.filter(r => r.status === 'submitted').length
      const pending   = data.filter(r => r.status === 'pending').length
      const declined  = data.filter(r => r.status === 'declined').length
      return {
        total, submitted, pending, declined,
        response_rate: total > 0 ? Math.round((submitted / total) * 100) : 0,
        evaluatee_count: [...new Set(data.map(r => r.evaluatee_id))].length,
      }
    },
    enabled: !!cycleId,
    staleTime: 30_000,
  })
}

/** Synthèse scores 360° (via RPC) */
export function useFeedback360Summary(evaluateeId, cycleId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['feedback360-summary', evaluateeId, cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_feedback360_summary', { p_evaluatee_id: evaluateeId, p_cycle_id: cycleId })
      if (error) throw error
      return data ?? []
    },
    enabled: !!evaluateeId && !!cycleId && !!profile?.id,
    staleTime: 60_000,
  })
}

/** Tendances historiques (depuis MV) */
export function useFeedback360Trends(userId) {
  const { profile } = useAuth()
  const uid = userId ?? profile?.id
  return useQuery({
    queryKey: ['feedback360-trends', uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_feedback360_trends')
        .select('*')
        .eq('evaluatee_id', uid)
        .order('cycle_end_date', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!uid && !!profile?.id,
    staleTime: 120_000,
  })
}

/** Verbatims anonymisés */
export function useFeedback360Verbatims(evaluateeId, cycleId) {
  return useQuery({
    queryKey: ['feedback360-verbatims', evaluateeId, cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback360_requests')
        .select('answers, relationship, submitted_at')
        .eq('evaluatee_id', evaluateeId)
        .eq('cycle_id', cycleId)
        .eq('status', 'submitted')
        .eq('is_anonymous', true)
      if (error) throw error
      return (data ?? [])
        .map(r => ({ relationship: r.relationship, comment: r.answers?.overall_comment ?? '', submitted_at: r.submitted_at }))
        .filter(v => v.comment.trim())
    },
    enabled: !!evaluateeId && !!cycleId,
    staleTime: 60_000,
  })
}
