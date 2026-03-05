import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// --- PARAMETRES APP (app_settings) ---

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')

      if (error) throw error

      const settings = {}
      data?.forEach((row) => {
        settings[row.key] = row.value
      })
      return settings
    },
    staleTime: 300000,
  })
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }) => {
      const { data, error } = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] })
    },
  })
}

// --- PROFIL UTILISATEUR ---

export function useUserProfile() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['user-profile-full', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, email, role, is_active, created_at,
          direction_id, division_id, service_id,
          directions!users_direction_id_fkey (id, name),
          divisions!users_division_id_fkey (id, name),
          services!users_service_id_fkey (id, name)
        `)
        .eq('id', profile.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

export function useUpdateUserProfile() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-full'] })
    },
  })
}

// --- JOURNAUX D'AUDIT ---

export function useAuditLogs({ page = 0, pageSize = 20, actionFilter = null, userFilter = null, dateFrom = null, dateTo = null } = {}) {
  return useQuery({
    queryKey: ['audit-logs', page, pageSize, actionFilter, userFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          id, action, entity_type, entity_id, details, ip_address, created_at,
          user:users!audit_logs_user_id_fkey (id, first_name, last_name, email, role)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (actionFilter) query = query.eq('action', actionFilter)
      if (userFilter) query = query.eq('user_id', userFilter)
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo)

      const { data, error, count } = await query

      if (error) throw error
      return { logs: data || [], total: count || 0 }
    },
    staleTime: 30000,
  })
}

export function useLogAudit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ action, entityType = null, entityId = null, details = {} }) => {
      const { error } = await supabase.rpc('log_audit', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_details: details,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })
}

// --- LISTE UTILISATEURS (pour filtres audit) ---

export function useUsersList() {
  return useQuery({
    queryKey: ['users-list-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('is_active', true)
        .order('first_name')

      if (error) throw error
      return data || []
    },
    staleTime: 300000,
  })
}