// ============================================================
// APEX RH — src/hooks/useFormations.js
// Session 57 — Module Formation & Certifications
// Hooks : catalogue, inscriptions, certifications, plans
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── CONSTANTES PUBLIQUES ─────────────────────────────────────

export const TRAINING_TYPE_LABELS = {
  presentiel:  'Présentiel',
  'e-learning': 'E-Learning',
  blended:     'Blended',
  webinar:     'Webinaire',
  coaching:    'Coaching',
  conference:  'Conférence',
}

export const TRAINING_TYPE_COLORS = {
  presentiel:  '#3B82F6',
  'e-learning': '#10B981',
  blended:     '#8B5CF6',
  webinar:     '#F59E0B',
  coaching:    '#EC4899',
  conference:  '#6366F1',
}

export const ENROLLMENT_STATUS_LABELS = {
  inscrit:   'Inscrit',
  en_cours:  'En cours',
  termine:   'Terminé',
  annule:    'Annulé',
  abandonne: 'Abandonné',
}

export const ENROLLMENT_STATUS_COLORS = {
  inscrit:   '#6B7280',
  en_cours:  '#3B82F6',
  termine:   '#10B981',
  annule:    '#EF4444',
  abandonne: '#F97316',
}

export const LEVEL_LABELS = {
  debutant:      'Débutant',
  intermediaire: 'Intermédiaire',
  avance:        'Avancé',
}

export const LEVEL_COLORS = {
  debutant:      '#10B981',
  intermediaire: '#F59E0B',
  avance:        '#EF4444',
}

export const PLAN_PRIORITY_LABELS = {
  haute:   'Haute',
  moyenne: 'Moyenne',
  basse:   'Basse',
}

export const PLAN_PRIORITY_COLORS = {
  haute:   '#EF4444',
  moyenne: '#F59E0B',
  basse:   '#6B7280',
}

export const PLAN_ITEM_STATUS_LABELS = {
  planifie:  'Planifié',
  inscrit:   'Inscrit',
  en_cours:  'En cours',
  termine:   'Terminé',
  reporte:   'Reporté',
  annule:    'Annulé',
}

// ─── CATALOGUE ────────────────────────────────────────────────

export function useTrainingCatalog({ type, level, tags, search, activeOnly = true } = {}) {
  return useQuery({
    queryKey: ['training-catalog', { type, level, tags, search, activeOnly }],
    queryFn: async () => {
      let q = supabase
        .from('training_catalog')
        .select(`
          *,
          mv_training_popularity!training_id (
            total_enrollments, completions, completion_rate, avg_rating
          )
        `)
        .order('created_at', { ascending: false })

      if (activeOnly) q = q.eq('is_active', true)
      if (type)       q = q.eq('type', type)
      if (level)      q = q.eq('level', level)
      if (tags?.length) q = q.overlaps('tags', tags)
      if (search)     q = q.ilike('title', `%${search}%`)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useTrainingById(id) {
  return useQuery({
    queryKey: ['training', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_catalog')
        .select(`
          *,
          mv_training_popularity!training_id (
            total_enrollments, completions, completion_rate, avg_rating, avg_score
          ),
          training_enrollments (
            id, user_id, status, progress_pct, score, feedback_rating,
            feedback_comment, enrolled_at, completed_at,
            users!user_id ( first_name, last_name, role )
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// ─── MUTATIONS CATALOGUE (admin) ──────────────────────────────

export function useCreateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('training_catalog')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-catalog'] }),
  })
}

export function useUpdateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('training_catalog')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['training-catalog'] })
      qc.invalidateQueries({ queryKey: ['training', id] })
    },
  })
}

export function useDeleteTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('training_catalog')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-catalog'] }),
  })
}

// ─── INSCRIPTIONS ─────────────────────────────────────────────

export function useMyEnrollments({ status } = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['enrollments', 'me', profile?.id, { status }],
    queryFn: async () => {
      let q = supabase
        .from('training_enrollments')
        .select(`
          *,
          training_catalog!training_id (
            id, title, type, provider, duration_hours, cover_image_url, level, tags
          )
        `)
        .eq('user_id', profile.id)
        .order('enrolled_at', { ascending: false })

      if (status) q = q.eq('status', status)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
  })
}

export function useTeamEnrollments(managerId) {
  return useQuery({
    queryKey: ['enrollments', 'team', managerId],
    queryFn: async () => {
      const { data: teamMembers, error: err1 } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('manager_id', managerId)
        .eq('is_active', true)

      if (err1) throw err1
      if (!teamMembers?.length) return []

      const memberIds = teamMembers.map(u => u.id)
      const { data, error } = await supabase
        .from('training_enrollments')
        .select(`
          *,
          training_catalog!training_id (id, title, type, duration_hours),
          users!user_id (id, first_name, last_name, role)
        `)
        .in('user_id', memberIds)
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!managerId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useEnrollUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, trainingId, enrolledBy, notes } = {}) => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .upsert({
          user_id:    userId,
          training_id: trainingId,
          enrolled_by: enrolledBy,
          notes,
          status:     'inscrit',
          enrolled_at: new Date().toISOString(),
        }, { onConflict: 'user_id,training_id', ignoreDuplicates: false })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['training'] })
    },
  })
}

export function useUpdateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      if (payload.status === 'en_cours' && !payload.started_at) {
        payload.started_at = new Date().toISOString()
      }
      if (payload.status === 'termine' && !payload.completed_at) {
        payload.completed_at = new Date().toISOString()
        payload.progress_pct = 100
      }
      const { data, error } = await supabase
        .from('training_enrollments')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  })
}

export function useSubmitFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ enrollmentId, rating, comment }) => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .update({ feedback_rating: rating, feedback_comment: comment })
        .eq('id', enrollmentId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  })
}

// ─── CERTIFICATIONS ───────────────────────────────────────────

export function useMyCertifications() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['certifications', 'me', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certifications')
        .select(`
          *,
          training_catalog!training_id (id, title, type)
        `)
        .eq('user_id', profile.id)
        .order('obtained_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
  })
}

export function useTeamCertifications(managerId) {
  return useQuery({
    queryKey: ['certifications', 'team', managerId],
    queryFn: async () => {
      const { data: team } = await supabase
        .from('users')
        .select('id')
        .eq('manager_id', managerId)
        .eq('is_active', true)

      if (!team?.length) return []
      const ids = team.map(u => u.id)

      const { data, error } = await supabase
        .from('certifications')
        .select(`
          *,
          users!user_id (id, first_name, last_name)
        `)
        .in('user_id', ids)
        .order('expires_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!managerId,
  })
}

export function useAddCertification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('certifications')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  })
}

export function useDeleteCertification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('certifications')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  })
}

// ─── STATS USER ───────────────────────────────────────────────

export function useMyTrainingStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['training-stats', 'me', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_user_training_stats')
        .select('*')
        .eq('user_id', profile.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || {
        enrollments_pending: 0, enrollments_in_progress: 0,
        enrollments_completed: 0, hours_completed: 0,
        avg_rating: null, certifications_count: 0,
      }
    },
    enabled: !!profile?.id,
  })
}

export function useOrgTrainingStats() {
  return useQuery({
    queryKey: ['training-stats', 'org'],
    queryFn: async () => {
      // Agrégats globaux depuis les tables directement
      const [enrollRes, certRes, catRes] = await Promise.all([
        supabase.from('training_enrollments')
          .select('status, training_catalog!training_id(duration_hours)', { count: 'exact' }),
        supabase.from('certifications').select('id', { count: 'exact' }),
        supabase.from('training_catalog').select('id', { count: 'exact' }).eq('is_active', true),
      ])
      const enrollments = enrollRes.data || []
      return {
        total_enrollments: enrollments.length,
        completed: enrollments.filter(e => e.status === 'termine').length,
        in_progress: enrollments.filter(e => e.status === 'en_cours').length,
        total_certifications: certRes.count || 0,
        active_formations: catRes.count || 0,
        hours_total: enrollments
          .filter(e => e.status === 'termine')
          .reduce((sum, e) => sum + (e.training_catalog?.duration_hours || 0), 0),
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ─── PLANS DE FORMATION ───────────────────────────────────────

export function useMyTrainingPlan(year = new Date().getFullYear()) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['training-plan', 'me', profile?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          training_plan_items (
            *,
            training_catalog!training_id (id, title, type, duration_hours, provider)
          )
        `)
        .eq('user_id', profile.id)
        .eq('year', year)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
  })
}

export function useTeamTrainingPlans(managerId, year = new Date().getFullYear()) {
  return useQuery({
    queryKey: ['training-plans', 'team', managerId, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          users!user_id (id, first_name, last_name, role),
          training_plan_items (
            *,
            training_catalog!training_id (id, title, type, duration_hours)
          )
        `)
        .eq('manager_id', managerId)
        .eq('year', year)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!managerId,
  })
}

export function useCreateOrUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId, userId, year, managerId, budget_xof, hours_target, notes, items = [] }) => {
      let plan
      if (planId) {
        const { data, error } = await supabase
          .from('training_plans')
          .update({ budget_xof, hours_target, notes })
          .eq('id', planId)
          .select()
          .single()
        if (error) throw error
        plan = data
      } else {
        const { data, error } = await supabase
          .from('training_plans')
          .insert({ user_id: userId, year, manager_id: managerId, budget_xof, hours_target, notes, status: 'brouillon' })
          .select()
          .single()
        if (error) throw error
        plan = data
      }
      return plan
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-plan'] }),
  })
}

export function useAddPlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId, trainingId, freeTitle, priority, targetDate, budgetXof, notes }) => {
      const { data, error } = await supabase
        .from('training_plan_items')
        .insert({
          plan_id:    planId,
          training_id: trainingId || null,
          free_title: freeTitle || null,
          priority,
          target_date: targetDate || null,
          budget_xof: budgetXof || null,
          notes,
          status: 'planifie',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-plan'] }),
  })
}

export function useUpdatePlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('training_plan_items')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-plan'] }),
  })
}

export function useDeletePlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('training_plan_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-plan'] }),
  })
}

export function useValidatePlan() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (planId) => {
      const { data, error } = await supabase
        .from('training_plans')
        .update({
          status: 'valide',
          validated_at: new Date().toISOString(),
          validated_by: profile?.id,
        })
        .eq('id', planId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-plan'] }),
  })
}
