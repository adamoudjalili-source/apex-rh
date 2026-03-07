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
