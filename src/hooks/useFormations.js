// ============================================================
// APEX RH — src/hooks/useFormations.js
// Session 57 — Module Formation & Certifications
// Hooks : catalogue, inscriptions, certifications, plans
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import { TASK_STATUS } from '../utils/constants'

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
    queryKey: ['training-catalog', type, level, tags?.join(','), search, activeOnly],
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
    queryKey: ['enrollments', 'me', profile?.id, status],
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
      if (payload.status === TASK_STATUS.EN_COURS && !payload.started_at) {
        payload.started_at = new Date().toISOString()
      }
      if (payload.status === TASK_STATUS.TERMINE && !payload.completed_at) {
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
        completed: enrollments.filter(e => e.status === TASK_STATUS.TERMINE).length,
        in_progress: enrollments.filter(e => e.status === TASK_STATUS.EN_COURS).length,
        total_certifications: certRes.count || 0,
        active_formations: catRes.count || 0,
        hours_total: enrollments
          .filter(e => e.status === TASK_STATUS.TERMINE)
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

// ============================================================
// S73 — Budget + Formations Obligatoires + Évaluation post-formation
// ============================================================

// ─── CONSTANTES S73 ──────────────────────────────────────────

export const MANDATORY_TARGET_LABELS = {
  all:      'Tous les collaborateurs',
  role:     'Par rôle',
  service:  'Par service',
  division: 'Par division',
}

export const COMPLIANCE_STATUS_LABELS = {
  conforme:     'Conforme',
  non_realise:  'Non réalisé',
  a_renouveler: 'À renouveler',
}

export const COMPLIANCE_STATUS_COLORS = {
  conforme:     '#10B981',
  non_realise:  '#EF4444',
  a_renouveler: '#F59E0B',
}

export function getComplianceInfo(status) {
  return {
    label: COMPLIANCE_STATUS_LABELS[status] ?? status,
    color: COMPLIANCE_STATUS_COLORS[status] ?? '#6B7280',
  }
}

// ─── BUDGET FORMATION ─────────────────────────────────────────

export function useTrainingBudgets(year = new Date().getFullYear()) {
  const { profile } = useAuth() // FIX S88
  const orgId = profile?.organization_id // FIX S88
  return useQuery({
    queryKey: ['training-budget', orgId, year], // FIX S88 : orgId dans queryKey
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_budget')
        .select('*')
        .eq('organization_id', orgId) // FIX S88 : filtre org manquant
        .eq('year', year)
        .order('division_id', { ascending: true, nullsFirst: true })
      if (error) throw error
      return data || []
    },
    enabled: !!orgId, // FIX S88 : guard manquant
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateOrUpdateBudget() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, year, label, total_amount, division_id, notes }) => {
      if (id) {
        const { data, error } = await supabase
          .from('training_budget')
          .update({ label, total_amount, notes, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('training_budget')
          .insert({ year, label, total_amount, division_id: division_id || null, notes, created_by: profile?.id })
          .select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['training-budget'] }), // FIX S88
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, year }) => {
      const { error } = await supabase.from('training_budget').delete().eq('id', id)
      if (error) throw error
      return year
    },
    onSuccess: (year) => qc.invalidateQueries({ queryKey: ['training-budget'] }), // FIX S88 : préfixe large
  })
}

// Budget consommé depuis inscriptions (en temps réel)
export function useBudgetConsumed(year = new Date().getFullYear()) {
  const { profile } = useAuth() // FIX S88
  const orgId = profile?.organization_id // FIX S88
  return useQuery({
    queryKey: ['training-budget-consumed', orgId, year], // FIX S88
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .select(`
          status, enrolled_at,
          training_catalog!training_id(budget_cost, organization_id)
        `)
        .in('status', ['inscrit', TASK_STATUS.EN_COURS, TASK_STATUS.TERMINE])
      if (error) throw error
      const rows = (data || []).filter(e => {
        if (!e.enrolled_at) return false
        return new Date(e.enrolled_at).getFullYear() === year
      })
      return rows.reduce((sum, e) => sum + (e.training_catalog?.budget_cost || 0), 0)
    },
    enabled: !!orgId, // FIX S88
    staleTime: 60 * 1000,
  })
}

// ─── FORMATIONS OBLIGATOIRES ──────────────────────────────────

export function useMandatoryRules() {
  return useQuery({
    queryKey: ['mandatory-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_mandatory_rules')
        .select(`
          *,
          training_catalog!training_id(id, title, type, renewal_months)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMandatoryRule() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ training_id, target_type, target_id, target_role, renewal_months, deadline_days }) => {
      const { data, error } = await supabase
        .from('training_mandatory_rules')
        .insert({ training_id, target_type, target_id: target_id || null, target_role: target_role || null, renewal_months: renewal_months || null, deadline_days: deadline_days || 90, created_by: profile?.id })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mandatory-rules'] })
      qc.invalidateQueries({ queryKey: ['mandatory-compliance'] })
    },
  })
}

export function useDeleteMandatoryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('training_mandatory_rules').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mandatory-rules'] })
      qc.invalidateQueries({ queryKey: ['mandatory-compliance'] })
    },
  })
}

// Conformité : charge depuis la MV (admin) ou fallback simplifié
export function useMandatoryCompliance() {
  return useQuery({
    queryKey: ['mandatory-compliance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_mandatory_compliance')
        .select(`
          *,
          training_catalog!training_id(id, title)
        `)
      if (error) {
        // fallback direct si MV non refresh
        return []
      }
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Formations obligatoires non réalisées pour un utilisateur donné
export function useMyMandatoryStatus() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mandatory-status', 'me', profile?.id],
    queryFn: async () => {
      if (!profile) return []
      // Règles applicables à cet user
      const { data: rules, error: rErr } = await supabase
        .from('training_mandatory_rules')
        .select(`*, training_catalog!training_id(id, title, type, duration_hours, renewal_months)`)
        .eq('is_active', true)

      if (rErr) throw rErr

      const applicable = (rules || []).filter(r => {
        if (r.target_type === 'all') return true
        if (r.target_type === 'role' && r.target_role === profile.role) return true
        if (r.target_type === 'service' && r.target_id === profile.service_id) return true
        if (r.target_type === 'division' && r.target_id === profile.division_id) return true
        return false
      })

      if (!applicable.length) return []

      const trainingIds = applicable.map(r => r.training_id)
      const { data: completions, error: cErr } = await supabase
        .from('training_enrollments')
        .select('training_id, status, completed_at')
        .eq('user_id', profile.id)
        .in('training_id', trainingIds)
        .eq('status', TASK_STATUS.TERMINE)

      if (cErr) throw cErr

      const completionMap = {}
      ;(completions || []).forEach(c => {
        if (!completionMap[c.training_id] || c.completed_at > completionMap[c.training_id]) {
          completionMap[c.training_id] = c.completed_at
        }
      })

      return applicable.map(rule => {
        const lastDone = completionMap[rule.training_id]
        const renewal = rule.renewal_months || rule.training_catalog?.renewal_months
        let status = 'non_realise'
        if (lastDone) {
          if (renewal) {
            const renewalDate = new Date(lastDone)
            renewalDate.setMonth(renewalDate.getMonth() + renewal)
            status = renewalDate > new Date() ? 'conforme' : 'a_renouveler'
          } else {
            status = 'conforme'
          }
        }
        return { ...rule, last_completed_at: lastDone || null, compliance_status: status }
      })
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── ÉVALUATION POST-FORMATION ────────────────────────────────

export function useSubmitSatisfaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ enrollmentId, satisfaction_score, satisfaction_comment }) => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .update({
          satisfaction_score,
          satisfaction_comment,
          satisfaction_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  })
}

export function useSubmitEffectiveness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ enrollmentId, effectiveness_score, effectiveness_comment }) => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .update({
          effectiveness_score,
          effectiveness_comment,
          effectiveness_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  })
}

// Enrollments terminés en attente d'évaluation (satisfaction OU efficacité J+30)
export function useMyPendingEvaluations() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['evaluations-pending', 'me', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .select(`
          id, completed_at, satisfaction_score, satisfaction_at,
          effectiveness_score, effectiveness_at, enrolled_at,
          training_catalog!training_id(id, title, type, duration_hours)
        `)
        .eq('user_id', profile.id)
        .eq('status', TASK_STATUS.TERMINE)
        .order('completed_at', { ascending: false })
      if (error) throw error

      const now = new Date()
      return (data || []).filter(e => {
        const noSatisfaction = !e.satisfaction_score
        const completedAt = e.completed_at ? new Date(e.completed_at) : null
        const daysSinceCompletion = completedAt ? (now - completedAt) / (1000 * 60 * 60 * 24) : 0
        const noEffectiveness = !e.effectiveness_score && daysSinceCompletion >= 30
        return noSatisfaction || noEffectiveness
      })
    },
    enabled: !!profile?.id,
  })
}

// Agrégats satisfaction par formation (depuis MV)
export function useFormationSatisfactionStats(trainingId) {
  return useQuery({
    queryKey: ['training-satisfaction', trainingId],
    queryFn: async () => {
      const q = supabase.from('mv_training_satisfaction').select('*')
      if (trainingId) q.eq('training_id', trainingId).single()
      const { data, error } = await q
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: trainingId !== undefined,
    staleTime: 5 * 60 * 1000,
  })
}

// Stats évaluation globales (pour dashboard admin)
export function useGlobalEvaluationStats() {
  return useQuery({
    queryKey: ['training-eval-stats-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .select('training_id, satisfaction_score, effectiveness_score, completed_at')
        .eq('status', TASK_STATUS.TERMINE)
      if (error) throw error
      const rows = data || []
      const withSat = rows.filter(r => r.satisfaction_score)
      const withEff = rows.filter(r => r.effectiveness_score)
      return {
        total_completed: rows.length,
        satisfaction_count: withSat.length,
        avg_satisfaction: withSat.length
          ? +(withSat.reduce((s, r) => s + r.satisfaction_score, 0) / withSat.length).toFixed(2)
          : null,
        effectiveness_count: withEff.length,
        avg_effectiveness: withEff.length
          ? +(withEff.reduce((s, r) => s + r.effectiveness_score, 0) / withEff.length).toFixed(2)
          : null,
        response_rate_sat: rows.length ? Math.round(withSat.length / rows.length * 100) : 0,
        response_rate_eff: rows.length ? Math.round(withEff.length / rows.length * 100) : 0,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ─── REFRESH MVs FORMATION (admin) ───────────────────────────

export function useRefreshFormationMVs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_formation_mvs')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mandatory-compliance'] })
      qc.invalidateQueries({ queryKey: ['training-satisfaction'] })
    },
  })
}
