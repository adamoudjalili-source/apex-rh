// ============================================================
// APEX RH — src/hooks/useRecruitmentAI.js
// Session 61 — IA Recrutement : matching + scoring candidats
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── CONSTANTES PUBLIQUES ─────────────────────────────────────

export const AI_RECOMMENDATION_LABELS = {
  strongly_recommend: 'Fortement recommandé',
  recommend:          'Recommandé',
  neutral:            'Neutre',
  not_recommend:      'Non recommandé',
  strong_reject:      'Rejeté',
}

export const AI_RECOMMENDATION_COLORS = {
  strongly_recommend: '#10B981',  // vert émeraude
  recommend:          '#3B82F6',  // bleu
  neutral:            '#F59E0B',  // ambre
  not_recommend:      '#F97316',  // orange
  strong_reject:      '#EF4444',  // rouge
}

export const AI_RECOMMENDATION_BG = {
  strongly_recommend: 'rgba(16, 185, 129, 0.12)',
  recommend:          'rgba(59, 130, 246, 0.12)',
  neutral:            'rgba(245, 158, 11, 0.12)',
  not_recommend:      'rgba(249, 115, 22, 0.12)',
  strong_reject:      'rgba(239, 68, 68, 0.12)',
}

export const SCORE_AXES_LABELS = {
  skills:     'Compétences',
  experience: 'Expérience',
  education:  'Formation',
  motivation: 'Motivation',
}

export const SCORE_AXES_COLORS = {
  skills:     '#6366F1',
  experience: '#3B82F6',
  education:  '#8B5CF6',
  motivation: '#EC4899',
}

// ─── HELPERS PUBLICS ──────────────────────────────────────────

/**
 * Retourne le libellé de la recommandation IA
 * @param {string} rec - clé recommendation
 * @returns {string}
 */
export function getRecommendationLabel(rec) {
  return AI_RECOMMENDATION_LABELS[rec] ?? 'Inconnu'
}

/**
 * Retourne la couleur hex associée au score 0-100
 * @param {number} score
 * @returns {string} couleur hex
 */
export function scoreToColor(score) {
  if (score == null) return '#6B7280'
  if (score >= 85) return '#10B981'  // excellent
  if (score >= 70) return '#3B82F6'  // bon
  if (score >= 55) return '#F59E0B'  // moyen
  if (score >= 40) return '#F97316'  // faible
  return '#EF4444'                   // insuffisant
}

/**
 * Retourne le niveau textuel du score
 * @param {number} score
 * @returns {{ label: string, color: string }}
 */
export function getScoreLevel(score) {
  if (score == null) return { label: 'Non analysé', color: '#6B7280' }
  if (score >= 85) return { label: 'Excellent',     color: '#10B981' }
  if (score >= 70) return { label: 'Bon profil',    color: '#3B82F6' }
  if (score >= 55) return { label: 'Correct',       color: '#F59E0B' }
  if (score >= 40) return { label: 'Faible',        color: '#F97316' }
  return                  { label: 'Insuffisant',   color: '#EF4444' }
}

/**
 * Calcule le score global depuis les axes breakdown
 * Pondération : skills×40 + experience×30 + education×15 + motivation×15
 * @param {{ skills, experience, education, motivation }} breakdown
 * @returns {number}
 */
export function computeOverallScore(breakdown) {
  if (!breakdown) return 0
  const { skills = 0, experience = 0, education = 0, motivation = 0 } = breakdown
  return Math.round(skills * 0.4 + experience * 0.3 + education * 0.15 + motivation * 0.15)
}

/**
 * Trie les candidats par score décroissant
 * @param {Array} candidates - liste avec overall_score
 * @returns {Array}
 */
export function rankCandidates(candidates) {
  if (!Array.isArray(candidates)) return []
  return [...candidates].sort((a, b) => {
    const sa = a.overall_score ?? -1
    const sb = b.overall_score ?? -1
    return sb - sa
  })
}

/**
 * Filtre les candidats analysés avec score >= seuil
 * @param {Array} candidates
 * @param {number} minScore
 * @returns {Array}
 */
export function filterByMinScore(candidates, minScore = 0) {
  return (candidates ?? []).filter(c => (c.overall_score ?? 0) >= minScore)
}

/**
 * Retourne la recommandation déduite du score si non fournie
 * @param {number} score
 * @returns {string}
 */
export function scoreToRecommendation(score) {
  if (score == null) return 'neutral'
  if (score >= 85) return 'strongly_recommend'
  if (score >= 70) return 'recommend'
  if (score >= 50) return 'neutral'
  if (score >= 35) return 'not_recommend'
  return 'strong_reject'
}

/**
 * Retourne le taux d'analyse d'un ensemble de candidatures
 * @param {Array} applications - avec optional ai_score
 * @returns {number} pourcentage 0-100
 */
export function getAnalysisRate(applications) {
  if (!applications?.length) return 0
  const analyzed = applications.filter(a => a.ai_score?.overall_score != null).length
  return Math.round((analyzed / applications.length) * 100)
}

/**
 * Calcule les statistiques IA d'un ensemble de scores
 * @param {Array<number>} scores
 * @returns {{ avg, min, max, p75, countByLevel }}
 */
export function computeScoreStats(scores) {
  const valid = (scores ?? []).filter(s => s != null && !isNaN(s))
  if (!valid.length) return { avg: null, min: null, max: null, p75: null, countByLevel: {} }

  const sorted = [...valid].sort((a, b) => a - b)
  const avg = Math.round(valid.reduce((s, v) => s + v, 0) / valid.length)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const p75idx = Math.floor(sorted.length * 0.75)
  const p75 = sorted[p75idx]

  const countByLevel = {
    excellent:    valid.filter(s => s >= 85).length,
    bon:          valid.filter(s => s >= 70 && s < 85).length,
    correct:      valid.filter(s => s >= 55 && s < 70).length,
    faible:       valid.filter(s => s >= 40 && s < 55).length,
    insuffisant:  valid.filter(s => s < 40).length,
  }

  return { avg, min, max, p75, countByLevel }
}

// ─── HOOKS QUERIES ────────────────────────────────────────────

/**
 * Score IA d'une candidature
 */
export function useApplicationAIScore(applicationId) {
  return useQuery({
    queryKey: ['ai-candidate-score', applicationId],
    queryFn: async () => {
      if (!applicationId) return null
      const { data, error } = await supabase
        .from('ai_candidate_scores')
        .select('*')
        .eq('job_application_id', applicationId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!applicationId,
    staleTime: 5 * 60_000,
  })
}

/**
 * Scores IA de tous les candidats d'une offre
 */
export function useJobAIScores(jobPostingId) {
  return useQuery({
    queryKey: ['ai-job-scores', jobPostingId],
    queryFn: async () => {
      if (!jobPostingId) return []
      const { data, error } = await supabase
        .from('ai_candidate_scores')
        .select('*, application:job_applications(id, candidate_name, candidate_email, status, is_internal, applied_at)')
        .eq('job_posting_id', jobPostingId)
        .order('overall_score', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!jobPostingId,
    staleTime: 2 * 60_000,
  })
}

/**
 * Classement IA depuis la MV (avec rank_in_posting)
 */
export function useAIRecruitmentRanking(jobPostingId) {
  return useQuery({
    queryKey: ['ai-recruitment-ranking', jobPostingId],
    queryFn: async () => {
      if (!jobPostingId) return []
      const { data, error } = await supabase
        .from('mv_ai_recruitment_ranking')
        .select('*')
        .eq('job_posting_id', jobPostingId)
        .order('rank_in_posting', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!jobPostingId,
    staleTime: 2 * 60_000,
  })
}

/**
 * Requirements IA d'une offre
 */
export function useJobAIRequirements(jobPostingId) {
  return useQuery({
    queryKey: ['ai-job-requirements', jobPostingId],
    queryFn: async () => {
      if (!jobPostingId) return null
      const { data, error } = await supabase
        .from('ai_job_requirements')
        .select('*')
        .eq('job_posting_id', jobPostingId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!jobPostingId,
    staleTime: 10 * 60_000,
  })
}

/**
 * Statistiques globales IA recrutement de l'org
 */
export function useAIRecruitmentStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['ai-recruitment-stats', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_candidate_scores')
        .select('overall_score, recommendation, job_posting_id')
      if (error) throw error

      const scores = (data ?? []).map(d => d.overall_score)
      const stats  = computeScoreStats(scores)

      const byRec = {}
      ;(data ?? []).forEach(d => {
        byRec[d.recommendation] = (byRec[d.recommendation] ?? 0) + 1
      })

      const uniqueJobs = new Set((data ?? []).map(d => d.job_posting_id)).size

      return {
        total_analyzed: data?.length ?? 0,
        unique_postings: uniqueJobs,
        score_stats: stats,
        by_recommendation: byRec,
      }
    },
    staleTime: 5 * 60_000,
  })
}

// ─── HOOKS MUTATIONS ─────────────────────────────────────────

/**
 * Analyser un candidat via Edge Function
 */
export function useAnalyzeCandidate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ applicationId, forceReanalyze = false }) => {
      const { data, error } = await supabase.functions.invoke('ai-recruitment-match', {
        body: {
          job_application_id: applicationId,
          force_reanalyze:    forceReanalyze,
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: (data, { applicationId }) => {
      qc.invalidateQueries({ queryKey: ['ai-candidate-score', applicationId] })
      if (data?.data?.job_posting_id) {
        qc.invalidateQueries({ queryKey: ['ai-job-scores', data.data.job_posting_id] })
        qc.invalidateQueries({ queryKey: ['ai-recruitment-ranking', data.data.job_posting_id] })
      }
    },
  })
}

/**
 * Analyser tous les candidats d'une offre en bulk
 */
export function useAnalyzeAllCandidates() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobPostingId, forceReanalyze = false }) => {
      // Récupérer toutes les candidatures actives
      const { data: apps, error: appsErr } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_id', jobPostingId)
        .not('status', 'in', '("retire","refuse")')

      if (appsErr) throw appsErr
      if (!apps?.length) return { analyzed: 0, errors: 0 }

      // Analyse séquentielle pour éviter le rate limiting
      let analyzed = 0
      let errors   = 0

      for (const app of apps) {
        try {
          await supabase.functions.invoke('ai-recruitment-match', {
            body: { job_application_id: app.id, force_reanalyze: forceReanalyze },
          })
          analyzed++
          // Petite pause entre chaque appel
          await new Promise(r => setTimeout(r, 300))
        } catch {
          errors++
        }
      }

      return { analyzed, errors, total: apps.length }
    },
    onSuccess: (_, { jobPostingId }) => {
      qc.invalidateQueries({ queryKey: ['ai-job-scores', jobPostingId] })
      qc.invalidateQueries({ queryKey: ['ai-recruitment-ranking', jobPostingId] })
      qc.invalidateQueries({ queryKey: ['ai-recruitment-stats'] })
    },
  })
}

/**
 * Sauvegarder les requirements parsés d'une offre
 */
export function useSaveJobRequirements() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobPostingId, organizationId, requirements }) => {
      const { data, error } = await supabase
        .from('ai_job_requirements')
        .upsert(
          { job_posting_id: jobPostingId, organization_id: organizationId, ...requirements },
          { onConflict: 'job_posting_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { jobPostingId }) => {
      qc.invalidateQueries({ queryKey: ['ai-job-requirements', jobPostingId] })
    },
  })
}
