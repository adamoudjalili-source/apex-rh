// ============================================================
// APEX RH — src/hooks/useConges.js
// Session 67 — Congés & Absences
// Hooks : types, soldes, demandes, workflow, calendrier, export
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import * as XLSX    from 'xlsx'

// ─── CONSTANTES ───────────────────────────────────────────────

export const LEAVE_STATUS_LABELS = {
  draft:            'Brouillon',
  submitted:        'En attente manager',
  manager_approved: 'Approuvé manager',
  hr_approved:      'Validé RH',
  rejected:         'Refusé',
}

export const LEAVE_STATUS_COLORS = {
  draft:            '#6B7280',
  submitted:        '#F59E0B',
  manager_approved: '#3B82F6',
  hr_approved:      '#10B981',
  rejected:         '#EF4444',
}

export const LEAVE_STATUS_BG = {
  draft:            'rgba(107,114,128,0.1)',
  submitted:        'rgba(245,158,11,0.1)',
  manager_approved: 'rgba(59,130,246,0.1)',
  hr_approved:      'rgba(16,185,129,0.1)',
  rejected:         'rgba(239,68,68,0.1)',
}

// ─── HELPER : comptage jours ouvrés ───────────────────────────

export function countWorkDays(start, end, workDays = [1, 2, 3, 4, 5]) {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (s > e) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    if (workDays.includes(cur.getDay())) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── LEAVE TYPES ──────────────────────────────────────────────

export function useLeaveTypes() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['leave_types', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('organization_id', orgId)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useActiveLeaveTypes() {
  const { data: types = [] } = useLeaveTypes()
  return types.filter(t => t.is_active)
}

export function useCreateLeaveType() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('leave_types')
        .insert({ ...payload, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_types', orgId] }),
  })
}

export function useUpdateLeaveType() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('leave_types')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_types', orgId] }),
  })
}

// ─── LEAVE BALANCES ───────────────────────────────────────────

export function useLeaveBalances({ userId, year } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const uid   = userId || profile?.id
  const yr    = year   || new Date().getFullYear()

  return useQuery({
    queryKey: ['leave_balances', orgId, uid, yr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`*, leave_types(id, name, code, color, max_days, is_paid, requires_attachment)`)
        .eq('organization_id', orgId)
        .eq('user_id', uid)
        .eq('year', yr)
      if (error) throw error
      return data || []
    },
    enabled: !!orgId && !!uid,
  })
}

export function useMyBalances(year) {
  const { profile } = useAuth()
  return useLeaveBalances({ userId: profile?.id, year })
}

export function useUpdateLeaveBalance() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ userId, leaveTypeId, year, ...payload }) => {
      const { data, error } = await supabase
        .from('leave_balances')
        .upsert({
          organization_id: orgId,
          user_id: userId,
          leave_type_id: leaveTypeId,
          year: year || new Date().getFullYear(),
          ...payload,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['leave_balances', orgId] })
    },
  })
}

// ─── LEAVE REQUESTS ───────────────────────────────────────────

export function useLeaveRequests({ userId, status, year } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['leave_requests', orgId, userId, status, year],
    queryFn: async () => {
      let q = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(id, name, code, color, requires_attachment),
          users!leave_requests_user_id_fkey(id, first_name, last_name, email, avatar_url),
          manager:users!leave_requests_manager_approved_by_fkey(id, first_name, last_name),
          hr:users!leave_requests_hr_approved_by_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (userId) q = q.eq('user_id', userId)
      if (status)  q = q.eq('status', status)
      if (year)    q = q.gte('start_date', `${year}-01-01`).lte('end_date', `${year}-12-31`)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useMyLeaveRequests(year) {
  const { profile } = useAuth()
  return useLeaveRequests({ userId: profile?.id, year })
}

export function useTeamLeaveRequests(status) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['team_leave_requests', orgId, status],
    queryFn: async () => {
      let q = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(id, name, code, color, requires_attachment),
          users!leave_requests_user_id_fkey(id, first_name, last_name, email, avatar_url, service_id),
          manager:users!leave_requests_manager_approved_by_fkey(id, first_name, last_name),
          hr:users!leave_requests_hr_approved_by_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (status) q = q.eq('status', status)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useLeaveRequest(id) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['leave_request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(id, name, code, color, requires_attachment, max_days),
          users!leave_requests_user_id_fkey(id, first_name, last_name, email, avatar_url),
          manager:users!leave_requests_manager_approved_by_fkey(id, first_name, last_name),
          hr:users!leave_requests_hr_approved_by_fkey(id, first_name, last_name)
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id && !!orgId,
  })
}

// ─── MUTATIONS LEAVE REQUESTS ─────────────────────────────────

function useInvalidateLeaves() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  return () => {
    qc.invalidateQueries({ queryKey: ['leave_requests', orgId] })
    qc.invalidateQueries({ queryKey: ['team_leave_requests', orgId] })
    qc.invalidateQueries({ queryKey: ['leave_balances', orgId] })
    qc.invalidateQueries({ queryKey: ['team_calendar', orgId] })
  }
}

export function useCreateLeaveRequest() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  const invalidate = useInvalidateLeaves()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...payload,
          organization_id: orgId,
          user_id: profile?.id,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}

export function useSubmitLeaveRequest() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  const invalidate = useInvalidateLeaves()

  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ status: 'submitted' })
        .eq('id', id)
        .eq('organization_id', orgId)
        .eq('user_id', profile?.id)
        .select()
        .single()
      if (error) throw error

      // Notification in-app (non bloquant)
      await supabase.from('notifications').insert({
        organization_id: orgId,
        user_id: profile?.id,
        type: 'leave_submitted',
        title: 'Demande de congé soumise',
        content: 'Votre demande a été transmise à votre manager.',
        is_read: false,
      }).then(() => {})

      return data
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['leave_request', undefined] })
    },
  })
}

export function useApproveLeaveRequest() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  const invalidate = useInvalidateLeaves()

  return useMutation({
    mutationFn: async ({ id, level = 'manager' }) => {
      const isManager = level === 'manager'
      const update = isManager
        ? { status: 'manager_approved', manager_approved_by: profile?.id, manager_approved_at: new Date().toISOString() }
        : { status: 'hr_approved',      hr_approved_by:      profile?.id, hr_approved_at:      new Date().toISOString() }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(update)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select('*, users!leave_requests_user_id_fkey(id)')
        .single()
      if (error) throw error

      // Notification pour le demandeur
      await supabase.from('notifications').insert({
        organization_id: orgId,
        user_id: data.user_id,
        type: isManager ? 'leave_manager_approved' : 'leave_hr_approved',
        title: isManager ? 'Congé approuvé par votre manager' : 'Congé validé par les RH',
        content: isManager ? 'Votre demande est transmise aux RH pour validation finale.' : 'Votre congé est définitivement validé.',
        is_read: false,
      }).then(() => {})

      return data
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['leave_request'] })
    },
  })
}

export function useRejectLeaveRequest() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  const invalidate = useInvalidateLeaves()

  return useMutation({
    mutationFn: async ({ id, rejection_reason }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected', rejection_reason })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select('*, users!leave_requests_user_id_fkey(id)')
        .single()
      if (error) throw error

      await supabase.from('notifications').insert({
        organization_id: orgId,
        user_id: data.user_id,
        type: 'leave_rejected',
        title: 'Demande de congé refusée',
        content: rejection_reason || 'Votre demande a été refusée.',
        is_read: false,
      }).then(() => {})

      return data
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['leave_request'] })
    },
  })
}

// ─── COMMENTS ─────────────────────────────────────────────────

export function useLeaveRequestComments(requestId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['leave_comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_request_comments')
        .select(`*, users!leave_request_comments_user_id_fkey(id, first_name, last_name, avatar_url)`)
        .eq('leave_request_id', requestId)
        .eq('organization_id', orgId)
        .order('created_at')
      if (error) throw error
      return data || []
    },
    enabled: !!requestId && !!orgId,
  })
}

export function useAddLeaveComment() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ requestId, content }) => {
      const { data, error } = await supabase
        .from('leave_request_comments')
        .insert({
          leave_request_id: requestId,
          organization_id: orgId,
          user_id: profile?.id,
          content,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { requestId }) => {
      qc.invalidateQueries({ queryKey: ['leave_comments', requestId] })
    },
  })
}

// ─── TEAM CALENDAR ────────────────────────────────────────────

export function useTeamCalendar({ month, year } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const m = month ?? new Date().getMonth() + 1
  const y = year  ?? new Date().getFullYear()

  return useQuery({
    queryKey: ['team_calendar', orgId, m, y],
    queryFn: async () => {
      const firstDay = `${y}-${String(m).padStart(2,'0')}-01`
      const lastDay  = new Date(y, m, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          id, user_id, start_date, end_date, days_count, status,
          leave_types(id, name, code, color),
          users!leave_requests_user_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('organization_id', orgId)
        .in('status', ['submitted', 'manager_approved', 'hr_approved'])
        .lte('start_date', lastDay)
        .gte('end_date', firstDay)
        .order('start_date')
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

// ─── LEAVE SETTINGS ───────────────────────────────────────────

export function useLeaveSettings() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['leave_settings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || {
        cp_days_per_year: 25,
        rtt_days_per_year: 10,
        carry_over_max: 5,
        carry_over_deadline: null,
        work_days: [1, 2, 3, 4, 5],
      }
    },
    enabled: !!orgId,
  })
}

export function useUpdateLeaveSettings() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (settings) => {
      const { data, error } = await supabase
        .from('leave_settings')
        .upsert({ ...settings, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_settings', orgId] }),
  })
}

// ─── EXPORT EXCEL / CSV ───────────────────────────────────────

export function useExportLeaves() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ startDate, endDate, format = 'xlsx', userId }) => {
      let q = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(name, code, color),
          users!leave_requests_user_id_fkey(first_name, last_name, email)
        `)
        .eq('organization_id', orgId)
        .gte('start_date', startDate)
        .lte('end_date',   endDate)
        .order('start_date')

      if (userId) q = q.eq('user_id', userId)

      const { data, error } = await q
      if (error) throw error

      const rows = (data || []).map(r => ({
        'Collaborateur':   `${r.users?.first_name || ''} ${r.users?.last_name || ''}`.trim(),
        'Email':           r.users?.email || '',
        'Type de congé':   r.leave_types?.name || '',
        'Code':            r.leave_types?.code || '',
        'Début':           r.start_date,
        'Fin':             r.end_date,
        'Nb jours':        r.days_count,
        'Statut':          LEAVE_STATUS_LABELS[r.status] || r.status,
        'Motif':           r.reason || '',
        'Créé le':         new Date(r.created_at).toLocaleDateString('fr-FR'),
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Congés')

      const ext  = format === 'csv' ? 'csv' : 'xlsx'
      const type = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const buf  = format === 'csv'
        ? XLSX.write(wb, { bookType: 'csv', type: 'array' })
        : XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

      const blob = new Blob([buf], { type })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `conges_${startDate}_${endDate}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}
