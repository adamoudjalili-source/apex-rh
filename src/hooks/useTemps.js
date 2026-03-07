// ============================================================
// APEX RH — src/hooks/useTemps.js
// Session 66 — Gestion des Temps
// Hooks : feuilles, entrées, pointage, stats, export
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import * as XLSX    from 'xlsx'

// ─── CONSTANTES ───────────────────────────────────────────────

export const TIMESHEET_STATUS_LABELS = {
  draft:            'Brouillon',
  submitted:        'Soumis',
  manager_approved: 'Approuvé manager',
  hr_approved:      'Validé RH',
  rejected:         'Refusé',
}

export const TIMESHEET_STATUS_COLORS = {
  draft:            '#6B7280',
  submitted:        '#F59E0B',
  manager_approved: '#3B82F6',
  hr_approved:      '#10B981',
  rejected:         '#EF4444',
}

export const ENTRY_TYPE_LABELS = {
  regular:   'Régulier',
  overtime:  'Heures sup.',
  project:   'Projet',
  task:      'Tâche',
}

export const CLOCK_EVENT_LABELS = {
  clock_in:    'Arrivée',
  clock_out:   'Départ',
  break_start: 'Début pause',
  break_end:   'Fin pause',
}

// ─── HELPER : semaine en cours ────────────────────────────────
export function getCurrentWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=Dimanche
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lundi
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function getWeekDates(weekStart) {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export function formatHours(h) {
  if (!h && h !== 0) return '—'
  const n = Number(h)
  const hours = Math.floor(n)
  const mins  = Math.round((n - hours) * 60)
  return mins > 0 ? `${hours}h${String(mins).padStart(2,'0')}` : `${hours}h`
}

// ─── TIME SETTINGS ────────────────────────────────────────────

export function useTimeSettings() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['time_settings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || { hours_per_day: 8, hours_per_week: 40, overtime_threshold: 40, work_days: [1,2,3,4,5] }
    },
    enabled: !!orgId,
  })
}

export function useUpdateTimeSettings() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (settings) => {
      const { data, error } = await supabase
        .from('time_settings')
        .upsert({ ...settings, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_settings', orgId] }),
  })
}

// ─── TIME SHEETS ──────────────────────────────────────────────

export function useTimeSheets({ userId, weekStart, status } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['time_sheets', orgId, userId, weekStart, status],
    queryFn: async () => {
      let q = supabase
        .from('time_sheets')
        .select(`
          *,
          users!time_sheets_user_id_fkey(id, first_name, last_name, role, service_id)
        `)
        .eq('organization_id', orgId)
        .order('week_start', { ascending: false })

      if (userId) q = q.eq('user_id', userId)
      if (weekStart) q = q.eq('week_start', weekStart)
      if (status) q = q.eq('status', status)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useTimeSheet(id) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['time_sheet', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_sheets')
        .select(`
          *,
          users!time_sheets_user_id_fkey(id, first_name, last_name, role),
          time_entries(*)
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

export function useMyCurrentTimeSheet() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const userId = profile?.id
  const weekStart = getCurrentWeekStart()

  return useQuery({
    queryKey: ['time_sheet_current', orgId, userId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_sheets')
        .select('*, time_entries(*)')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!orgId && !!userId,
  })
}

export function useCreateTimeSheet() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ weekStart }) => {
      const { data, error } = await supabase
        .from('time_sheets')
        .insert({
          organization_id: profile.organization_id,
          user_id: profile.id,
          week_start: weekStart,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_sheets'] })
      qc.invalidateQueries({ queryKey: ['time_sheet_current'] })
    },
  })
}

export function useSubmitTimeSheet() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('time_sheets')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_sheets'] }),
  })
}

export function useApproveTimeSheet() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const isAdmin = ['administrateur','directeur','direction'].includes(profile?.role)
  const isManager = ['chef_division','chef_service'].includes(profile?.role)

  return useMutation({
    mutationFn: async ({ id, asManager }) => {
      const update = asManager || isManager
        ? { status: 'manager_approved', manager_approved_by: profile.id, manager_approved_at: new Date().toISOString() }
        : { status: 'hr_approved', hr_approved_by: profile.id, hr_approved_at: new Date().toISOString() }

      const { data, error } = await supabase
        .from('time_sheets')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_sheets'] }),
  })
}

export function useRejectTimeSheet() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { data, error } = await supabase
        .from('time_sheets')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_sheets'] }),
  })
}

// ─── TIME ENTRIES ─────────────────────────────────────────────

export function useTimeEntries(timesheetId) {
  return useQuery({
    queryKey: ['time_entries', timesheetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, projects(id,name), tasks(id,title)')
        .eq('timesheet_id', timesheetId)
        .order('entry_date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!timesheetId,
  })
}

export function useAddTimeEntry() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ timesheetId, entryDate, hours, entryType = 'regular', projectId, taskId, description }) => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          timesheet_id:    timesheetId,
          organization_id: profile.organization_id,
          user_id:         profile.id,
          entry_date:      entryDate,
          hours,
          entry_type:      entryType,
          project_id:      projectId || null,
          task_id:         taskId || null,
          description:     description || null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['time_entries', vars.timesheetId] })
      qc.invalidateQueries({ queryKey: ['time_sheet', vars.timesheetId] })
      qc.invalidateQueries({ queryKey: ['time_sheet_current'] })
    },
  })
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, timesheetId, ...fields }) => {
      const { data, error } = await supabase
        .from('time_entries')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['time_entries', data.timesheet_id] })
      qc.invalidateQueries({ queryKey: ['time_sheet_current'] })
    },
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, timesheetId }) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id)
      if (error) throw error
      return { id, timesheetId }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['time_entries', data.timesheetId] })
      qc.invalidateQueries({ queryKey: ['time_sheet_current'] })
    },
  })
}

// ─── POINTAGE ─────────────────────────────────────────────────

export function useLastClockEvent() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const userId = profile?.id

  return useQuery({
    queryKey: ['last_clock_event', orgId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_clock_events')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .order('event_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!orgId && !!userId,
    refetchInterval: 30000,
  })
}

export function useClockIn() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ latitude, longitude } = {}) => {
      const { data, error } = await supabase
        .from('time_clock_events')
        .insert({
          organization_id: profile.organization_id,
          user_id:         profile.id,
          event_type:      'clock_in',
          event_at:        new Date().toISOString(),
          latitude:        latitude || null,
          longitude:       longitude || null,
          device_info:     { ua: navigator.userAgent },
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['last_clock_event'] }),
  })
}

export function useClockOut() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ latitude, longitude } = {}) => {
      const { data, error } = await supabase
        .from('time_clock_events')
        .insert({
          organization_id: profile.organization_id,
          user_id:         profile.id,
          event_type:      'clock_out',
          event_at:        new Date().toISOString(),
          latitude:        latitude || null,
          longitude:       longitude || null,
          device_info:     { ua: navigator.userAgent },
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['last_clock_event'] }),
  })
}

// ─── VUES ÉQUIPE / ORG ────────────────────────────────────────

export function useTeamTimeSheets({ weekStart } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const wk = weekStart || getCurrentWeekStart()

  return useQuery({
    queryKey: ['team_time_sheets', orgId, wk],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_sheets')
        .select(`
          *,
          users!time_sheets_user_id_fkey(id, first_name, last_name, role, service_id)
        `)
        .eq('organization_id', orgId)
        .eq('week_start', wk)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useOrgTimeSheets({ from, to, status } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['org_time_sheets', orgId, from, to, status],
    queryFn: async () => {
      let q = supabase
        .from('time_sheets')
        .select(`
          *,
          users!time_sheets_user_id_fkey(id, first_name, last_name, role, service_id)
        `)
        .eq('organization_id', orgId)
        .order('week_start', { ascending: false })

      if (from) q = q.gte('week_start', from)
      if (to)   q = q.lte('week_start', to)
      if (status) q = q.eq('status', status)

      const { data, error } = await q.limit(200)
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

// ─── STATS ────────────────────────────────────────────────────

export function useTimeStats({ userId, period = 'month' } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const uid = userId || profile?.id

  return useQuery({
    queryKey: ['time_stats', orgId, uid, period],
    queryFn: async () => {
      const now = new Date()
      let from
      if (period === 'week')  from = getCurrentWeekStart()
      else if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      else from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('time_sheets')
        .select('week_start, total_hours, overtime_hours, status')
        .eq('organization_id', orgId)
        .eq('user_id', uid)
        .gte('week_start', from)
        .order('week_start', { ascending: true })

      if (error) throw error
      const sheets = data || []

      const totalHours    = sheets.reduce((s, r) => s + Number(r.total_hours), 0)
      const overtimeHours = sheets.reduce((s, r) => s + Number(r.overtime_hours), 0)
      const approved      = sheets.filter(r => r.status === 'hr_approved').length
      const pending       = sheets.filter(r => ['submitted','manager_approved'].includes(r.status)).length

      return { sheets, totalHours, overtimeHours, approved, pending, period }
    },
    enabled: !!orgId && !!uid,
  })
}

// ─── EXPORT EXCEL/CSV ─────────────────────────────────────────

export function useExportTimeSheets() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  const exportFn = async ({ from, to, userId, format = 'xlsx' }) => {
    let q = supabase
      .from('time_sheets')
      .select(`
        week_start, status, total_hours, overtime_hours, submitted_at, hr_approved_at,
        users!time_sheets_user_id_fkey(first_name, last_name, role),
        time_entries(entry_date, hours, entry_type, description, projects(name), tasks(title))
      `)
      .eq('organization_id', orgId)
      .order('week_start', { ascending: false })

    if (from)   q = q.gte('week_start', from)
    if (to)     q = q.lte('week_start', to)
    if (userId) q = q.eq('user_id', userId)

    const { data, error } = await q
    if (error) throw error

    const rows = []
    for (const sheet of (data || [])) {
      const user = sheet.users || {}
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim()
      for (const entry of (sheet.time_entries || [])) {
        rows.push({
          'Collaborateur':  name,
          'Rôle':           user.role || '',
          'Semaine (lundi)': sheet.week_start,
          'Date':           entry.entry_date,
          'Heures':         Number(entry.hours),
          'Type':           ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type,
          'Projet':         entry.projects?.name || '',
          'Tâche':          entry.tasks?.title  || '',
          'Description':    entry.description   || '',
          'Statut feuille': TIMESHEET_STATUS_LABELS[sheet.status] || sheet.status,
          'Heures sup. semaine': Number(sheet.overtime_hours),
        })
      }
      if (!sheet.time_entries?.length) {
        rows.push({
          'Collaborateur':  name,
          'Rôle':           user.role || '',
          'Semaine (lundi)': sheet.week_start,
          'Date':           '',
          'Heures':         0,
          'Type':           '',
          'Projet':         '',
          'Tâche':          '',
          'Description':    '',
          'Statut feuille': TIMESHEET_STATUS_LABELS[sheet.status] || sheet.status,
          'Heures sup. semaine': Number(sheet.overtime_hours),
        })
      }
    }

    const d = new Date()
    const suffix = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
    const filename = `temps_${suffix}`

    if (format === 'csv') {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, 'Temps')
      XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' })
    } else {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 22 },{ wch: 16 },{ wch: 14 },{ wch: 12 },
        { wch: 8 }, { wch: 12 },{ wch: 20 },{ wch: 20 },
        { wch: 30 },{ wch: 16 },{ wch: 16 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Temps')
      XLSX.writeFile(wb, `${filename}.xlsx`)
    }
  }

  return { exportTimeSheets: exportFn }
}
