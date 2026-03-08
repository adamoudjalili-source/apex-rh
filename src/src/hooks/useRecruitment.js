// ============================================================
// APEX RH — src/hooks/useRecruitment.js
// Session 59 — Portail Candidats & Recrutement Light
// Hooks : offres, candidatures, entretiens, pipeline, feedback
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── CONSTANTES PUBLIQUES ─────────────────────────────────────

export const CONTRACT_TYPE_LABELS = {
  cdi:          'CDI',
  cdd:          'CDD',
  stage:        'Stage',
  freelance:    'Freelance',
  apprentissage:'Apprentissage',
  autre:        'Autre',
}

export const CONTRACT_TYPE_COLORS = {
  cdi:          '#10B981',
  cdd:          '#3B82F6',
  stage:        '#8B5CF6',
  freelance:    '#F59E0B',
  apprentissage:'#EC4899',
  autre:        '#6B7280',
}

export const APPLICATION_STATUS_LABELS = {
  nouveau:   'Nouveau',
  en_revue:  'En revue',
  telephone: 'Tél. screening',
  entretien: 'Entretien',
  test:      'Test technique',
  offre:     'Offre',
  accepte:   'Accepté',
  refuse:    'Refusé',
  retire:    'Retiré',
}

export const APPLICATION_STATUS_COLORS = {
  nouveau:   '#6B7280',
  en_revue:  '#3B82F6',
  telephone: '#8B5CF6',
  entretien: '#F59E0B',
  test:      '#EC4899',
  offre:     '#10B981',
  accepte:   '#059669',
  refuse:    '#EF4444',
  retire:    '#9CA3AF',
}

export const PIPELINE_STAGES = [
  { status: 'nouveau',   label: 'Nouveau',           color: '#6B7280' },
  { status: 'en_revue',  label: 'En revue',           color: '#3B82F6' },
  { status: 'telephone', label: 'Tél. screening',     color: '#8B5CF6' },
  { status: 'entretien', label: 'Entretien',           color: '#F59E0B' },
  { status: 'test',      label: 'Test technique',      color: '#EC4899' },
  { status: 'offre',     label: 'Offre',               color: '#10B981' },
  { status: 'accepte',   label: 'Accepté',             color: '#059669' },
]

export const INTERVIEW_TYPE_LABELS = {
  telephone:  'Téléphone',
  visio:      'Visioconférence',
  presentiel: 'Présentiel',
  technique:  'Technique',
  rh:         'RH',
  direction:  'Direction',
}

export const INTERVIEW_TYPE_COLORS = {
  telephone:  '#3B82F6',
  visio:      '#8B5CF6',
  presentiel: '#10B981',
  technique:  '#F59E0B',
  rh:         '#EC4899',
  direction:  '#C9A227',
}

export const INTERVIEW_STATUS_LABELS = {
  planifie:  'Planifié',
  confirme:  'Confirmé',
  realise:   'Réalisé',
  annule:    'Annulé',
  reporte:   'Reporté',
}

export const INTERVIEW_STATUS_COLORS = {
  planifie:  '#6B7280',
  confirme:  '#3B82F6',
  realise:   '#10B981',
  annule:    '#EF4444',
  reporte:   '#F59E0B',
}

export const RECOMMENDATION_LABELS = {
  fort_oui: 'Fortement recommandé',
  oui:      'Recommandé',
  neutre:   'Neutre',
  non:      'Non recommandé',
  fort_non: 'Fortement non recommandé',
}

export const RECOMMENDATION_COLORS = {
  fort_oui: '#059669',
  oui:      '#10B981',
  neutre:   '#6B7280',
  non:      '#F97316',
  fort_non: '#EF4444',
}

export const JOB_SOURCE_LABELS = {
  site_web:  'Site web',
  linkedin:  'LinkedIn',
  referral:  'Référence interne',
  jobboard:  'Job board',
  spontanee: 'Candidature spontanée',
  autre:     'Autre',
}

// ─── HELPERS ──────────────────────────────────────────────────

export function formatSalaryRange(min, max, currency = 'XOF') {
  if (!min && !max) return 'Non communiqué'
  const fmt = (v) => {
    if (currency === 'XOF') return `${(v / 1000).toFixed(0)}k FCFA`
    if (currency === 'EUR') return `${v.toLocaleString('fr-FR')} €`
    return `${v.toLocaleString()} ${currency}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `À partir de ${fmt(min)}`
  return `Jusqu'à ${fmt(max)}`
}

export function getStatusBadgeClass(status) {
  const colors = APPLICATION_STATUS_COLORS
  return colors[status] || '#6B7280'
}

export function computeConversionRate(total, hired) {
  if (!total || total === 0) return 0
  return Math.round((hired / total) * 100)
}

export function getDaysOpen(publishedAt, closedAt) {
  if (!publishedAt) return null
  const end = closedAt ? new Date(closedAt) : new Date()
  const start = new Date(publishedAt)
  return Math.floor((end - start) / (1000 * 60 * 60 * 24))
}

export function isDeadlinePassed(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function isDeadlineSoon(deadline, days = 7) {
  if (!deadline) return false
  const d = new Date(deadline)
  const now = new Date()
  return d > now && d < new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

// ─── OFFRES D'EMPLOI ──────────────────────────────────────────

export function useJobPostings(filters = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['job_postings', filters],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from('job_postings')
        .select(`
          *,
          division:divisions(id, name),
          service:services(id, name),
          hiring_manager:users!job_postings_hiring_manager_id_fkey(id, first_name, last_name, role)
        `)
        .order('created_at', { ascending: false })

      if (filters.is_published !== undefined) q = q.eq('is_published', filters.is_published)
      if (filters.contract_type) q = q.eq('contract_type', filters.contract_type)
      if (filters.division_id) q = q.eq('division_id', filters.division_id)
      if (filters.hiring_manager_id) q = q.eq('hiring_manager_id', filters.hiring_manager_id)
      if (filters.search) {
        q = q.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      if (filters.active_only) {
        q = q.eq('is_published', true)
          .or('deadline.is.null,deadline.gte.' + new Date().toISOString().split('T')[0])
      }

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

export function useJobPosting(id) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['job_posting', id],
    enabled: !!profile && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_postings')
        .select(`
          *,
          division:divisions(id, name),
          service:services(id, name),
          hiring_manager:users!job_postings_hiring_manager_id_fkey(id, first_name, last_name, role)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useMyManagedJobs() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my_managed_jobs', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('hiring_manager_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function useCreateJobPosting() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('job_postings')
        .insert({ ...payload, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job_postings'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
    },
  })
}

export function useUpdateJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('job_postings')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job_postings'] })
      qc.invalidateQueries({ queryKey: ['job_posting', data.id] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_stats'] })
    },
  })
}

export function useDeleteJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('job_postings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job_postings'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
    },
  })
}

export function usePublishJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publish }) => {
      const { data, error } = await supabase
        .from('job_postings')
        .update({
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
          closed_at: !publish ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job_postings'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
    },
  })
}

// ─── CANDIDATURES ─────────────────────────────────────────────

export function useJobApplications(filters = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['job_applications', filters],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from('job_applications')
        .select(`
          *,
          job:job_postings(id, title, contract_type, division_id, hiring_manager_id),
          applicant:users!job_applications_applicant_user_id_fkey(id, first_name, last_name, role),
          referrer:users!job_applications_referrer_id_fkey(id, first_name, last_name),
          assigned:users!job_applications_assigned_to_fkey(id, first_name, last_name)
        `)
        .order('applied_at', { ascending: false })

      if (filters.job_id) q = q.eq('job_id', filters.job_id)
      if (filters.status) q = q.eq('status', filters.status)
      if (filters.assigned_to) q = q.eq('assigned_to', filters.assigned_to)
      if (filters.search) {
        q = q.or(`candidate_name.ilike.%${filters.search}%,candidate_email.ilike.%${filters.search}%`)
      }

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

export function useMyApplications() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my_applications', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:job_postings(id, title, contract_type, location, published_at, deadline)
        `)
        .eq('applicant_user_id', profile.id)
        .order('applied_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function useApplicationsByManager() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['applications_by_manager', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      // candidatures pour les offres dont je suis hiring manager
      const { data: jobs } = await supabase
        .from('job_postings')
        .select('id')
        .eq('hiring_manager_id', profile.id)
      if (!jobs || jobs.length === 0) return []

      const jobIds = jobs.map(j => j.id)
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:job_postings(id, title, contract_type),
          applicant:users!job_applications_applicant_user_id_fkey(id, first_name, last_name)
        `)
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function useApplication(id) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['application', id],
    enabled: !!profile && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:job_postings(*, division:divisions(name), service:services(name)),
          applicant:users!job_applications_applicant_user_id_fkey(id, first_name, last_name, role),
          referrer:users!job_applications_referrer_id_fkey(id, first_name, last_name),
          assigned:users!job_applications_assigned_to_fkey(id, first_name, last_name),
          interviews:interview_schedules(
            *,
            interviewer:users!interview_schedules_interviewer_id_fkey(id, first_name, last_name),
            feedback:interview_feedback(*)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateApplication() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const insert = {
        ...payload,
        applicant_user_id: payload.is_internal ? profile.id : null,
      }
      const { data, error } = await supabase
        .from('job_applications')
        .insert(insert)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job_applications'] })
      qc.invalidateQueries({ queryKey: ['my_applications'] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_stats'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
    },
  })
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, notes, rejection_reason }) => {
      const update = {
        status,
        updated_at: new Date().toISOString(),
      }
      if (notes !== undefined) update.recruiter_notes = notes
      if (rejection_reason !== undefined) update.rejection_reason = rejection_reason
      if (status === 'accepte') update.hired_at = new Date().toISOString()
      if (status === 'en_revue') update.reviewed_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('job_applications')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job_applications'] })
      qc.invalidateQueries({ queryKey: ['application', data.id] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_stats'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
      qc.invalidateQueries({ queryKey: ['applications_by_manager'] })
    },
  })
}

export function useUpdateApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('job_applications')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job_applications'] })
      qc.invalidateQueries({ queryKey: ['application', data.id] })
    },
  })
}

export function useDeleteApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('job_applications').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job_applications'] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_stats'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
    },
  })
}

// ─── ENTRETIENS ───────────────────────────────────────────────

export function useInterviews(applicationId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['interviews', applicationId],
    enabled: !!profile && !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_schedules')
        .select(`
          *,
          interviewer:users!interview_schedules_interviewer_id_fkey(id, first_name, last_name, role),
          application:job_applications(candidate_name, job:job_postings(title)),
          feedback:interview_feedback(*)
        `)
        .eq('application_id', applicationId)
        .order('scheduled_at')
      if (error) throw error
      return data || []
    },
  })
}

export function useMyUpcomingInterviews() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my_upcoming_interviews', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_schedules')
        .select(`
          *,
          application:job_applications(
            id, candidate_name, candidate_email,
            job:job_postings(id, title)
          )
        `)
        .eq('interviewer_id', profile.id)
        .in('status', ['planifie', 'confirme'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(10)
      if (error) throw error
      return data || []
    },
  })
}

export function useCreateInterview() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('interview_schedules')
        .insert({ ...payload, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['interviews', data.application_id] })
      qc.invalidateQueries({ queryKey: ['application', data.application_id] })
      qc.invalidateQueries({ queryKey: ['my_upcoming_interviews'] })
    },
  })
}

export function useUpdateInterview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('interview_schedules')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['interviews', data.application_id] })
      qc.invalidateQueries({ queryKey: ['my_upcoming_interviews'] })
    },
  })
}

// ─── FEEDBACK ENTRETIEN ───────────────────────────────────────

export function useCreateInterviewFeedback() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('interview_feedback')
        .upsert({ ...payload, reviewer_id: profile.id }, { onConflict: 'interview_id,reviewer_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['interviews', vars.application_id] })
    },
  })
}

// ─── STATS & MVs ─────────────────────────────────────────────

export function useRecruitmentStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mv_recruitment_stats'],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_recruitment_stats')
        .select('*')
        .single()
      if (error) return null
      return data
    },
  })
}

export function usePipelineStats(filters = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mv_pipeline_stats', filters],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from('mv_pipeline_stats')
        .select('*')
        .order('total_applications', { ascending: false })

      if (filters.hiring_manager_id) q = q.eq('hiring_manager_id', filters.hiring_manager_id)
      if (filters.is_published !== undefined) q = q.eq('is_published', filters.is_published)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

// ─── ÉTAPES PIPELINE PERSONNALISÉES ──────────────────────────

export function useRecruitmentStages() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['recruitment_stages'],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_stages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

// ============================================================
// SESSION 72 — Pipeline structuré + scoring
// ============================================================

// ─── CONSTANTES S72 ──────────────────────────────────────────

export const SCORE_LABELS = {
  excellent: { label: 'Excellent',  min: 80, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  fort:      { label: 'Fort',       min: 65, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  moyen:     { label: 'Moyen',      min: 45, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  faible:    { label: 'Faible',     min: 0,  color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
}

export const APPLICATION_SOURCE_LABELS = {
  linkedin:  'LinkedIn',
  site_web:  'Site web',
  referral:  'Référence interne',
  jobboard:  'Job board',
  spontanee: 'Candidature spontanée',
  autre:     'Autre',
}

export const APPLICATION_SOURCE_COLORS = {
  linkedin:  '#0077B5',
  site_web:  '#6366F1',
  referral:  '#10B981',
  jobboard:  '#F59E0B',
  spontanee: '#8B5CF6',
  autre:     '#6B7280',
}

export function getScoreLevel(score) {
  if (score == null) return null
  if (score >= 80) return 'excellent'
  if (score >= 65) return 'fort'
  if (score >= 45) return 'moyen'
  return 'faible'
}

export function getScoreInfo(score) {
  const level = getScoreLevel(score)
  if (!level) return null
  return { level, ...SCORE_LABELS[level] }
}

// ─── CANDIDATURES ENRICHIES (toute l'org) ────────────────────

export function useJobApplicationsEnriched(filters = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['job_applications_enriched', filters],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from('job_applications')
        .select(`
          *,
          job:job_postings(id, title, contract_type, division_id, hiring_manager_id, required_skills),
          applicant:users!job_applications_applicant_user_id_fkey(id, first_name, last_name, role),
          interviews:interview_schedules(
            id, status, scheduled_at, interview_type,
            feedback:interview_feedback(overall_score, recommendation)
          )
        `)
        .is('archived_at', null)
        .order('applied_at', { ascending: false })

      if (filters.job_id)    q = q.eq('job_id', filters.job_id)
      if (filters.status)    q = q.eq('status', filters.status)
      if (filters.source)    q = q.eq('source', filters.source)
      if (filters.min_score) q = q.gte('match_score', filters.min_score)
      if (filters.search) {
        q = q.or(`candidate_name.ilike.%${filters.search}%,candidate_email.ilike.%${filters.search}%`)
      }
      if (filters.date_from) q = q.gte('applied_at', filters.date_from)
      if (filters.date_to)   q = q.lte('applied_at', filters.date_to)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

// ─── MV PIPELINE PAR OFFRE ───────────────────────────────────

export function usePipelineByJob(filters = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mv_pipeline_by_job', filters],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from('mv_pipeline_by_job')
        .select('*')
        .order('cnt', { ascending: false })

      if (filters.job_id)    q = q.eq('job_id', filters.job_id)
      if (filters.is_published !== undefined) q = q.eq('is_published', filters.is_published)

      const { data, error } = await q
      if (error) return []
      return data || []
    },
  })
}

// ─── DASHBOARD RECRUTEMENT ENRICHI ───────────────────────────

export function useRecruitmentDashboard(filters = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mv_recruitment_dashboard', filters],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from('mv_recruitment_dashboard')
        .select('*')
        .order('total_applicants', { ascending: false })

      if (filters.job_id)       q = q.eq('job_id', filters.job_id)
      if (filters.is_published !== undefined) q = q.eq('is_published', filters.is_published)
      if (filters.limit)        q = q.limit(filters.limit)

      const { data, error } = await q
      // Si la MV n'existe pas encore, requête directe fallback
      if (error) {
        const { data: fallback } = await supabase
          .from('job_postings')
          .select('id, title, contract_type, published_at, closed_at, organization_id')
          .order('created_at', { ascending: false })
          .limit(20)
        return (fallback || []).map(j => ({ ...j, total_applicants: 0, hired_count: 0 }))
      }
      return data || []
    },
  })
}

// ─── METTRE À JOUR SCORE CANDIDATURE ─────────────────────────

export function useUpdateApplicationScore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, match_score }) => {
      const { data, error } = await supabase
        .from('job_applications')
        .update({ match_score, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job_applications'] })
      qc.invalidateQueries({ queryKey: ['job_applications_enriched'] })
      qc.invalidateQueries({ queryKey: ['application', data.id] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_by_job'] })
    },
  })
}

// ─── DÉPLACER CANDIDAT DANS PIPELINE ─────────────────────────

export function useMoveApplicationStage() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, new_status, from_status, stage_order, pipeline_notes }) => {
      // Mettre à jour le statut
      const update = {
        status: new_status,
        stage_order: stage_order || 0,
        updated_at: new Date().toISOString(),
      }
      if (pipeline_notes !== undefined) update.pipeline_notes = pipeline_notes
      if (new_status === 'accepte') update.hired_at = new Date().toISOString()
      if (new_status === 'en_revue') update.reviewed_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('job_applications')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // Enregistrer l'action dans pipeline_actions
      await supabase.from('pipeline_actions').insert({
        application_id: id,
        action_type: 'stage_move',
        action_data: { from_stage: from_status, to_stage: new_status },
        performed_by: profile?.id,
        organization_id: profile?.organization_id,
      })

      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job_applications'] })
      qc.invalidateQueries({ queryKey: ['job_applications_enriched'] })
      qc.invalidateQueries({ queryKey: ['application', data.id] })
      qc.invalidateQueries({ queryKey: ['applications_by_manager'] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_by_job'] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_stats'] })
      qc.invalidateQueries({ queryKey: ['pipeline_actions'] })
    },
  })
}

// ─── ARCHIVER CANDIDATURE ─────────────────────────────────────

export function useArchiveApplication() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { data, error } = await supabase
        .from('job_applications')
        .update({
          archived_at: new Date().toISOString(),
          archived_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await supabase.from('pipeline_actions').insert({
        application_id: id,
        action_type: 'archived',
        action_data: { reason },
        performed_by: profile?.id,
        organization_id: profile?.organization_id,
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job_applications'] })
      qc.invalidateQueries({ queryKey: ['job_applications_enriched'] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_by_job'] })
    },
  })
}

// ─── AJOUTER NOTE PIPELINE ────────────────────────────────────

export function useAddPipelineNote() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, note }) => {
      const { data, error } = await supabase
        .from('job_applications')
        .update({
          pipeline_notes: note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await supabase.from('pipeline_actions').insert({
        application_id: id,
        action_type: 'note_added',
        action_data: { note: note?.substring(0, 200) },
        performed_by: profile?.id,
        organization_id: profile?.organization_id,
      })

      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job_applications_enriched'] })
      qc.invalidateQueries({ queryKey: ['application', data.id] })
    },
  })
}

// ─── HISTORIQUE ACTIONS PIPELINE ─────────────────────────────

export function usePipelineActions(applicationId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['pipeline_actions', applicationId],
    enabled: !!profile && !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_actions')
        .select(`
          *,
          performer:users!pipeline_actions_performed_by_fkey(id, first_name, last_name)
        `)
        .eq('application_id', applicationId)
        .order('performed_at', { ascending: false })
      if (error) return []
      return data || []
    },
  })
}

// ─── STATS GLOBALES RECRUTEMENT (fallback si MV absente) ─────

export function useRecruitmentGlobalStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['recruitment_global_stats'],
    enabled: !!profile,
    queryFn: async () => {
      // Essayer la MV d'abord
      const { data: mv } = await supabase
        .from('mv_recruitment_stats')
        .select('*')
        .single()

      if (mv) return mv

      // Fallback : calcul direct
      const [{ count: total }, { count: active }, { count: hired }, { count: interviews }] =
        await Promise.all([
          supabase.from('job_applications').select('*', { count: 'exact', head: true }),
          supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('is_published', true),
          supabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('status', 'accepte'),
          supabase.from('interview_schedules').select('*', { count: 'exact', head: true }).in('status', ['planifie', 'confirme']),
        ])

      return {
        total_applications: total ?? 0,
        active_postings:    active ?? 0,
        hired:              hired ?? 0,
        in_interview:       interviews ?? 0,
      }
    },
  })
}

// ─── COMPUTE SCORE DEPUIS API SUPABASE ───────────────────────

export function useComputeApplicationScore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (applicationId) => {
      const { data, error } = await supabase
        .rpc('compute_application_score', { p_application_id: applicationId })
      if (error) throw error

      // Mettre à jour le score dans la table
      if (data != null) {
        await supabase
          .from('job_applications')
          .update({ match_score: data, updated_at: new Date().toISOString() })
          .eq('id', applicationId)
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job_applications_enriched'] })
      qc.invalidateQueries({ queryKey: ['mv_pipeline_by_job'] })
    },
  })
}

// ─── REFRESH MV RECRUTEMENT ───────────────────────────────────

export function useRefreshRecruitmentMVs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await supabase.rpc('refresh_recruitment_mvs')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mv_pipeline_by_job'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_dashboard'] })
      qc.invalidateQueries({ queryKey: ['mv_recruitment_stats'] })
    },
  })
}
