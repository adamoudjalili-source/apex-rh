// ============================================================
// APEX RH — useOnboarding.js  ·  Session 40
// Gestion de l'onboarding guidé par rôle (première connexion)
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── Étapes par rôle ─────────────────────────────────────────
export const ONBOARDING_STEPS = {
  collaborateur: [
    {
      key: 'welcome',
      title: 'Bienvenue sur APEX RH',
      subtitle: 'Votre espace de performance personnelle',
      description: 'APEX RH vous permet de suivre vos tâches, votre performance et vos objectifs au quotidien. Découvrons ensemble les 3 espaces essentiels.',
      icon: '👋',
      color: '#4F46E5',
    },
    {
      key: 'brief_demo',
      title: 'Le Brief Matinal',
      subtitle: '2 minutes chaque matin',
      description: 'Chaque matin, partagez votre humeur, vos tâches du jour et votre disponibilité. Ces 2 minutes alimentent votre score PULSE et informent votre manager.',
      icon: '🌅',
      color: '#F59E0B',
      tip: 'Accessible via "Mon Travail" → onglet "Ma Journée"',
    },
    {
      key: 'performance_demo',
      title: 'Ma Performance',
      subtitle: 'Votre profil multi-dimensionnel',
      description: 'Suivez votre profil de performance sur 5 dimensions : PULSE, OKR, Feedback, Activité NITA et Engagement. Pas de note unique — un profil complet et lisible.',
      icon: '📊',
      color: '#10B981',
      tip: 'Accessible via "Ma Performance" dans la navigation',
    },
  ],

  manager: [
    {
      key: 'welcome',
      title: 'Bienvenue, Manager',
      subtitle: 'Pilotez la performance de votre équipe',
      description: 'APEX RH vous donne une vision en temps réel de votre équipe : performance, alertes, feedback et objectifs. Voici les 3 espaces clés pour vous.',
      icon: '🎯',
      color: '#4F46E5',
    },
    {
      key: 'equipe_demo',
      title: 'Mon Équipe',
      subtitle: 'Vue dense de vos collaborateurs',
      description: 'Consultez le profil de performance de chaque membre, les alertes PULSE, les feedbacks reçus et les scores NITA. Détectez les signaux faibles en amont.',
      icon: '👥',
      color: '#8B5CF6',
      tip: 'Accessible via "Mon Équipe" dans la navigation',
    },
    {
      key: 'intelligence_demo',
      title: 'Intelligence RH',
      subtitle: 'Analytics et pilotage avancé',
      description: 'Performance PULSE, Analytics, Feedback 360°, Surveys et Review Cycles — tout centralisé. Attribuez les awards mensuels et suivez les tendances.',
      icon: '🧠',
      color: '#EC4899',
      tip: 'Accessible via "Intelligence RH" dans la navigation',
    },
  ],

  admin: [
    {
      key: 'welcome',
      title: 'Administration APEX RH',
      subtitle: 'Configuration et pilotage global',
      description: 'En tant qu\'administrateur, vous gérez les utilisateurs, l\'organisation, les modules et les paramètres. Bienvenue dans la configuration APEX RH.',
      icon: '⚙️',
      color: '#4F46E5',
    },
    {
      key: 'settings_demo',
      title: 'Paramètres & Modules',
      subtitle: 'Activez et configurez les modules',
      description: 'PULSE, Feedback 360°, Surveys, IA Coach, Gamification — chaque module s\'active depuis Paramètres. Configurez les horaires PULSE et les pondérations.',
      icon: '🔧',
      color: '#6B7280',
      tip: 'Accessible via "Gestion" → "Paramètres"',
    },
    {
      key: 'adoption_demo',
      title: 'Tableau d\'Adoption',
      subtitle: 'Suivez l\'adoption de l\'outil',
      description: 'Mesurez l\'adoption d\'APEX RH par votre équipe : connexions actives, pages visitées, onboarding complété. Disponible dans Intelligence RH → Adoption.',
      icon: '📈',
      color: '#10B981',
      tip: 'Accessible via "Intelligence RH" → onglet "Adoption"',
    },
  ],
}

// Groupe de rôle → clé steps
export function getRoleGroup(role) {
  if (role === 'administrateur' || role === 'directeur') return 'admin'
  if (role === 'chef_division' || role === 'chef_service') return 'manager'
  return 'collaborateur'
}

// ─── useOnboarding ───────────────────────────────────────────
export function useOnboarding() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const roleGroup = getRoleGroup(profile?.role)
  const steps = ONBOARDING_STEPS[roleGroup] || ONBOARDING_STEPS.collaborateur

  // Fetch completed steps from Supabase
  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['onboarding', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase
        .from('onboarding_completions')
        .select('step_key, completed, skipped')
        .eq('user_id', profile.id)
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: Infinity,
  })

  // Decide if onboarding should show
  useEffect(() => {
    if (isLoading || !profile?.id) return
    const allDone = steps.every(s =>
      completions.some(c => c.step_key === s.key && (c.completed || c.skipped))
    )
    if (!allDone) setVisible(true)
  }, [completions, isLoading, profile?.id])

  // Mutation: mark step done
  const completeMutation = useMutation({
    mutationFn: async ({ stepKey, skipped = false }) => {
      if (!profile?.id) return
      await supabase.from('onboarding_completions').upsert({
        user_id: profile.id,
        step_key: stepKey,
        role_group: roleGroup,
        completed: !skipped,
        skipped,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,step_key' })
    },
    onSuccess: () => {
      qc.invalidateQueries(['onboarding', profile?.id])
    },
  })

  const nextStep = useCallback(async () => {
    const step = steps[currentStep]
    if (!step) return
    await completeMutation.mutateAsync({ stepKey: step.key, skipped: false })
    if (currentStep < steps.length - 1) {
      setCurrentStep(p => p + 1)
    } else {
      setVisible(false)
    }
  }, [currentStep, steps, completeMutation])

  const skipAll = useCallback(async () => {
    for (const step of steps) {
      await completeMutation.mutateAsync({ stepKey: step.key, skipped: true })
    }
    setVisible(false)
  }, [steps, completeMutation])

  return {
    visible,
    currentStep,
    steps,
    roleGroup,
    nextStep,
    skipAll,
    progress: Math.round(((currentStep) / steps.length) * 100),
    isLast: currentStep === steps.length - 1,
  }
}

// ============================================================
// SESSION 75 — Onboarding Parcours Progressif
// Hooks : templates, étapes, assignments, progress
// ============================================================

// ─── useOnboardingTemplates ───────────────────────────────────
export function useOnboardingTemplates() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['onboarding_templates', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
  })
}

// ─── useCreateTemplate ───────────────────────────────────────
export function useCreateTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .insert({ ...payload, organization_id: profile.organization_id, created_by: profile.id })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries(['onboarding_templates']),
  })
}

// ─── useUpdateTemplate ───────────────────────────────────────
export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .update(payload)
        .eq('id', id)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries(['onboarding_templates']),
  })
}

// ─── useDeleteTemplate ───────────────────────────────────────
export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('onboarding_templates')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(['onboarding_templates']),
  })
}

// ─── useTemplateSteps ────────────────────────────────────────
export function useTemplateSteps(templateId) {
  return useQuery({
    queryKey: ['onboarding_steps', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index')
      if (error) throw error
      return data || []
    },
    enabled: !!templateId,
  })
}

// ─── useCreateStep ───────────────────────────────────────────
export function useCreateStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .insert(payload)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => qc.invalidateQueries(['onboarding_steps', vars.template_id]),
  })
}

// ─── useUpdateStep ───────────────────────────────────────────
export function useUpdateStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, template_id, ...payload }) => {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .update(payload)
        .eq('id', id)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => qc.invalidateQueries(['onboarding_steps', data.template_id]),
  })
}

// ─── useDeleteStep ───────────────────────────────────────────
export function useDeleteStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, template_id }) => {
      const { error } = await supabase
        .from('onboarding_steps')
        .delete()
        .eq('id', id)
      if (error) throw error
      return template_id
    },
    onSuccess: (templateId) => qc.invalidateQueries(['onboarding_steps', templateId]),
  })
}

// ─── useAssignTemplate ───────────────────────────────────────
export function useAssignTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, templateId, startDate }) => {
      // Créer assignment
      const { data: assignment, error: ae } = await supabase
        .from('onboarding_assignments')
        .insert({
          user_id: userId,
          template_id: templateId,
          start_date: startDate || new Date().toISOString().slice(0, 10),
          assigned_by: profile.id,
          organization_id: profile.organization_id,
        })
        .select().single()
      if (ae) throw ae

      // Créer completions pour chaque étape
      const { data: steps } = await supabase
        .from('onboarding_steps')
        .select('id')
        .eq('template_id', templateId)

      if (steps?.length) {
        const completions = steps.map(s => ({
          assignment_id: assignment.id,
          step_id: s.id,
          user_id: userId,
          status: 'pending',
        }))
        await supabase.from('onboarding_step_completions').insert(completions)
      }
      return assignment
    },
    onSuccess: () => {
      qc.invalidateQueries(['onboarding_assignments'])
      qc.invalidateQueries(['onboarding_progress'])
    },
  })
}

// ─── useMyOnboardingProgress ─────────────────────────────────
export function useMyOnboardingProgress() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my_onboarding_progress', profile?.id],
    queryFn: async () => {
      // Assignment actif
      const { data: assignments, error } = await supabase
        .from('onboarding_assignments')
        .select(`
          *,
          onboarding_templates (id, name, description),
          onboarding_step_completions (
            id, status, completed_at, comment, step_id,
            onboarding_steps (id, title, description, order_index, due_day_offset, assignee_type, is_required, category)
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      return assignments || []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

// ─── useCompleteStep ─────────────────────────────────────────
export function useCompleteStep() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ completionId, comment, skip = false }) => {
      const { data, error } = await supabase
        .from('onboarding_step_completions')
        .update({
          status: skip ? 'skipped' : 'completed',
          completed_at: new Date().toISOString(),
          completed_by: profile.id,
          comment: comment || null,
        })
        .eq('id', completionId)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries(['my_onboarding_progress'])
      qc.invalidateQueries(['team_onboarding_progress'])
      qc.invalidateQueries(['all_onboarding_progress'])
    },
  })
}

// ─── useTeamOnboardingProgress ───────────────────────────────
export function useTeamOnboardingProgress() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['team_onboarding_progress', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_assignments')
        .select(`
          *,
          users!onboarding_assignments_user_id_fkey (id, full_name, role, manager_id),
          onboarding_templates (id, name),
          onboarding_step_completions (id, status, step_id)
        `)
        .eq('users.manager_id', profile.id)
        .eq('status', 'active')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}

// ─── useAllOnboardingProgress ────────────────────────────────
export function useAllOnboardingProgress() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['all_onboarding_progress', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_assignments')
        .select(`
          *,
          users!onboarding_assignments_user_id_fkey (id, full_name, role, manager_id),
          onboarding_templates (id, name, target_role, target_department),
          onboarding_step_completions (id, status)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 60_000,
  })
}

// ─── useOnboardingStats ──────────────────────────────────────
export function useOnboardingStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['onboarding_stats', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_assignments')
        .select(`
          id, status,
          onboarding_step_completions (id, status)
        `)
        .eq('organization_id', profile.organization_id)
      if (error) throw error

      const total   = data?.length || 0
      const active  = data?.filter(a => a.status === 'active').length || 0
      const done    = data?.filter(a => a.status === 'completed').length || 0

      let totalSteps = 0, completedSteps = 0, overdueSteps = 0
      data?.forEach(a => {
        const steps = a.onboarding_step_completions || []
        totalSteps     += steps.length
        completedSteps += steps.filter(s => s.status === 'completed').length
        overdueSteps   += steps.filter(s => s.status === 'overdue').length
      })

      return {
        total,
        active,
        completed: done,
        overdue: overdueSteps,
        avgCompletionRate: totalSteps > 0
          ? Math.round((completedSteps / totalSteps) * 100)
          : 0,
      }
    },
    enabled: !!profile?.organization_id,
    staleTime: 60_000,
  })
}

// ─── useRefreshOnboardingMVs ─────────────────────────────────
export function useRefreshOnboardingMVs() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_onboarding_mvs')
      if (error) throw error
    },
  })
}
