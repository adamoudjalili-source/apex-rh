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
