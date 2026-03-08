// ============================================================
// APEX RH — useEmployeeManagement.js
// Session 96 — Module 2 Gestion des Employés
// Hook unifié : annuaire + fiche + structure + career_events
// Remplace useUsersList dans ce contexte
// Pattern V2 : organization_id · zéro org_id
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase }    from '../lib/supabase'
import { useAuth }     from '../contexts/AuthContext'
import { logAudit }    from '../lib/auditLog'

// ─── ANNUAIRE — liste complète avec structure ───────────────

export function useEmployeeList({ search = '', roleFilter = 'tous', statusFilter = 'actifs' } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['employees', orgId, search, roleFilter, statusFilter],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('users')
        .select(`
          id, first_name, last_name, email, role, is_active,
          created_at, phone, poste, avatar_url,
          direction_id, division_id, service_id,
          directions!users_direction_id_fkey (id, name),
          divisions!users_division_id_fkey   (id, name),
          services!users_service_id_fkey     (id, name)
        `)
        .eq('organization_id', orgId)
        .order('last_name', { ascending: true })

      if (statusFilter === 'actifs')   q = q.eq('is_active', true)
      if (statusFilter === 'inactifs') q = q.eq('is_active', false)
      if (roleFilter !== 'tous')       q = q.eq('role', roleFilter)
      if (search.trim()) {
        q = q.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
        )
      }

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

// ─── FICHE EMPLOYÉ — détail complet ─────────────────────────

export function useEmployee(userId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['employee', orgId, userId],
    enabled: !!orgId && !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, email, role, is_active,
          created_at, phone, poste, avatar_url,
          direction_id, division_id, service_id,
          directions!users_direction_id_fkey (id, name),
          divisions!users_division_id_fkey   (id, name),
          services!users_service_id_fkey     (id, name)
        `)
        .eq('organization_id', orgId)
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ─── MISE À JOUR FICHE EMPLOYÉ ───────────────────────────────

export function useUpdateEmployee() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['employees', orgId] })
      qc.invalidateQueries({ queryKey: ['employee', orgId, data.id] })
      logAudit('employee_updated', 'user', data.id, { category: 'admin' })
    },
  })
}

// ─── CAREER EVENTS — historique carrière d'un employé ───────

export function useCareerEvents(userId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['career_events', orgId, userId],
    enabled: !!orgId && !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_events')
        .select(`
          id, event_type, old_value, new_value,
          effective_date, note, created_at,
          created_by_user:users!career_events_created_by_fkey (first_name, last_name)
        `)
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .order('effective_date', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

// ─── AJOUT CAREER EVENT ──────────────────────────────────────

export function useAddCareerEvent() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (event) => {
      const { data, error } = await supabase
        .from('career_events')
        .insert({ ...event, organization_id: orgId, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['career_events', orgId, data.user_id] })
      logAudit('career_event_added', 'user', data.user_id, {
        event_type: data.event_type,
        category: 'admin',
      })
    },
  })
}

// ─── STRUCTURE — directions + divisions + services ───────────

export function useOrgStructure() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['org_structure', orgId],
    enabled: !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const [{ data: dirs }, { data: divs }, { data: svcs }] = await Promise.all([
        supabase.from('directions').select('id, name, description').eq('organization_id', orgId).order('name'),
        supabase.from('divisions').select('id, name, direction_id, description').eq('organization_id', orgId).order('name'),
        supabase.from('services').select('id, name, division_id, description').eq('organization_id', orgId).order('name'),
      ])
      return {
        directions: dirs || [],
        divisions:  divs || [],
        services:   svcs || [],
      }
    },
  })
}

// ─── ORG CHART — arbre hiérarchique pour SVG ─────────────────

export function useOrgChart() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['org_chart', orgId],
    enabled: !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, role, poste, avatar_url, is_active,
          direction_id, division_id, service_id,
          directions!users_direction_id_fkey (id, name),
          divisions!users_division_id_fkey   (id, name),
          services!users_service_id_fkey     (id, name)
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('role')
      if (error) throw error
      return data || []
    },
  })
}

// ─── SURCHARGES RBAC — user_permission_overrides ─────────────

export function useEmployeeAccess(userId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['employee_access', orgId, userId],
    enabled: !!orgId && !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('id, module, resource, action, granted, expires_at, created_at')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function useUpsertEmployeeAccess() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (override) => {
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .upsert({ ...override, organization_id: orgId, granted_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['employee_access', orgId, data.user_id] })
      logAudit('permission_override_set', 'user', data.user_id, {
        module: data.module,
        resource: data.resource,
        action: data.action,
        granted: data.granted,
        category: 'rbac',
      })
    },
  })
}

export function useDeleteEmployeeAccess() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ overrideId, userId }) => {
      const { error } = await supabase
        .from('user_permission_overrides')
        .delete()
        .eq('id', overrideId)
        .eq('organization_id', orgId)
      if (error) throw error
      return { overrideId, userId }
    },
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ['employee_access', orgId, userId] })
      logAudit('permission_override_deleted', 'user', userId, { category: 'rbac' })
    },
  })
}
