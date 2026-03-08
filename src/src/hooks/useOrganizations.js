// ============================================================
// APEX RH — useOrganizations.js
// Session 52 — Multi-tenancy : gestion organisations (super-admin)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── LISTE DES ORGANISATIONS (super-admin seulement) ─────────
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id, name, slug, plan, is_active, max_users,
          domain, logo_url, settings, created_at, updated_at
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30000,
  })
}

// ─── ORGANISATION COURANTE DE L'UTILISATEUR ──────────────────
export function useMyOrganization() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!profile?.organization_id,
    staleTime: 60000,
  })
}

// ─── STATS PAR ORGANISATION (super-admin) ─────────────────────
export function useOrganizationStats(orgId) {
  return useQuery({
    queryKey: ['organization-stats', orgId],
    queryFn: async () => {
      if (!orgId) return null

      // Nombre d'utilisateurs actifs
      const { count: activeUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_active', true)

      // Nombre total d'objectifs
      const { count: totalObjectives } = await supabase
        .from('objectives')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      // Scores PULSE 30 derniers jours
      const { data: pulseData } = await supabase
        .from('performance_scores')
        .select('score_total')
        .eq('organization_id', orgId)
        .gte('score_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      const avgPulse = pulseData?.length
        ? Math.round(pulseData.reduce((s, r) => s + (r.score_total ?? 0), 0) / pulseData.length)
        : null

      return {
        activeUsers: activeUsers ?? 0,
        totalObjectives: totalObjectives ?? 0,
        avgPulse30j: avgPulse,
      }
    },
    enabled: !!orgId,
    staleTime: 60000,
  })
}

// ─── CRÉER UNE ORGANISATION ───────────────────────────────────
export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, slug, plan = 'enterprise', maxUsers = 500, domain = null }) => {
      // Valider le slug (lowercase, tirets)
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: cleanSlug,
          plan,
          max_users: maxUsers,
          domain: domain || null,
          is_active: true,
          settings: { locale: 'fr', timezone: 'Africa/Lome', currency: 'XOF' },
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  })
}

// ─── METTRE À JOUR UNE ORGANISATION ──────────────────────────
export function useUpdateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      qc.invalidateQueries({ queryKey: ['organization', data.id] })
    },
  })
}

// ─── ACTIVER / DÉSACTIVER UNE ORGANISATION ───────────────────
export function useToggleOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  })
}

// ─── AFFECTER UN ADMIN À UNE ORGANISATION ────────────────────
export function useAssignAdminToOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, organizationId }) => {
      const { data, error } = await supabase
        .from('users')
        .update({
          organization_id: organizationId,
          role: 'administrateur',
        })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// ─── VÉRIFIER SI SUPER-ADMIN ──────────────────────────────────
export function useIsSuperAdmin() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['super-admin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false
      const { data } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      return !!data
    },
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutes
  })
}

// ─── HELPERS ─────────────────────────────────────────────────
export const PLAN_CONFIG = {
  trial:        { label: 'Essai', color: 'text-gray-400',  bg: 'bg-gray-500/15',  maxUsers: 10  },
  starter:      { label: 'Starter', color: 'text-blue-400', bg: 'bg-blue-500/15',  maxUsers: 50  },
  professional: { label: 'Pro', color: 'text-violet-400',  bg: 'bg-violet-500/15', maxUsers: 200 },
  enterprise:   { label: 'Enterprise', color: 'text-amber-400', bg: 'bg-amber-500/15', maxUsers: 9999 },
}
