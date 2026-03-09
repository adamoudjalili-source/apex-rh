// ============================================================
// APEX RH — src/hooks/useTemps.js
// Session 66 — Gestion des Temps
// Hooks : feuilles, entrées, pointage, stats, export
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import * as XLSX    from 'xlsx'
import { CRITICALITY, LEAVE_STATUS, ROLES } from '../utils/constants'

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
        .update({ status: LEAVE_STATUS.SUBMITTED, submitted_at: new Date().toISOString() })
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
  const isManager = [ROLES.CHEF_DIVISION,ROLES.CHEF_SERVICE].includes(profile?.role)

  return useMutation({
    mutationFn: async ({ id, asManager }) => {
      const update = asManager || isManager
        ? { status: LEAVE_STATUS.MANAGER_APPROVED, manager_approved_by: profile.id, manager_approved_at: new Date().toISOString() }
        : { status: LEAVE_STATUS.HR_APPROVED, hr_approved_by: profile.id, hr_approved_at: new Date().toISOString() }

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
      const approved      = sheets.filter(r => r.status === LEAVE_STATUS.HR_APPROVED).length
      const pending       = sheets.filter(r => [LEAVE_STATUS.SUBMITTED,LEAVE_STATUS.MANAGER_APPROVED].includes(r.status)).length

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

// ============================================================
// S71 — MOTEUR HEURES SUPPLÉMENTAIRES
// Hooks : calcul HS, validation, alertes, export paie
// ============================================================

// ─── CONSTANTES HS ────────────────────────────────────────────

export const OT_MODES = {
  daily:  'Journalier',
  weekly: 'Hebdomadaire',
  both:   'Journalier + Hebdomadaire',
}

export const DEFAULT_OT_SETTINGS = {
  daily_threshold_hours:      8,
  weekly_threshold_hours:     40,
  ot_rate_25_after:           8,
  ot_rate_50_after:           10,
  ot_rate_100_after:          null,
  submission_deadline_days:   3,
  alert_enabled:              true,
  overtime_requires_approval: true,
  overtime_calc_mode:         'weekly',
}

// ─── CALCUL HS À PARTIR D'UN GROUPE D'ENTRÉES ─────────────────

/**
 * Calcule la répartition HS à partir des entrées d'une feuille
 * @param {Array}  entries   — time_entries de la semaine
 * @param {Object} settings  — time_settings (avec colonnes S71)
 * @returns {{ regularHours, ot25Hours, ot50Hours, ot100Hours, overtimeHours, totalHours }}
 */
export function calculateOvertimeBreakdown(entries = [], settings = {}) {
  const s = { ...DEFAULT_OT_SETTINGS, ...settings }
  const mode = s.overtime_calc_mode || 'weekly'

  let regularHours = 0
  let ot25Hours    = 0
  let ot50Hours    = 0
  let ot100Hours   = 0

  if (mode === 'daily' || mode === 'both') {
    // Regrouper par jour
    const byDay = {}
    entries.forEach(e => {
      if (!byDay[e.entry_date]) byDay[e.entry_date] = 0
      byDay[e.entry_date] += Number(e.hours || 0)
    })

    Object.values(byDay).forEach(dayHours => {
      const thresh = s.daily_threshold_hours
      const t25    = s.ot_rate_25_after
      const t50    = s.ot_rate_50_after
      const t100   = s.ot_rate_100_after

      if (dayHours <= thresh) {
        regularHours += dayHours
      } else {
        regularHours += thresh
        const over = dayHours - thresh

        if (t100 && dayHours > t100) {
          const h100 = dayHours - t100
          const h50  = t100 - t50
          const h25  = Math.max(0, t50 - t25)
          ot25Hours  += Math.min(h25, over)
          ot50Hours  += Math.min(h50, Math.max(0, over - h25))
          ot100Hours += h100
        } else if (dayHours > t50) {
          ot25Hours += Math.max(0, t50 - t25)
          ot50Hours += dayHours - t50
        } else {
          ot25Hours += Math.min(over, t50 - t25)
        }
      }
    })
  } else {
    // Mode weekly (défaut)
    const weekTotal = entries.reduce((s, e) => s + Number(e.hours || 0), 0)
    const thresh    = s.weekly_threshold_hours
    const t25       = s.ot_rate_25_after
    const t50       = s.ot_rate_50_after
    const t100      = s.ot_rate_100_after

    if (weekTotal <= thresh) {
      regularHours = weekTotal
    } else {
      regularHours = thresh
      const over = weekTotal - thresh

      if (t100 && weekTotal > (thresh + t100)) {
        const h100 = weekTotal - (thresh + t100)
        const h50  = t100 - t50
        const h25  = Math.max(0, t50 - t25)
        ot25Hours  = h25
        ot50Hours  = h50
        ot100Hours = h100
      } else if (weekTotal > (thresh + t50)) {
        ot25Hours = Math.max(0, t50 - t25)
        ot50Hours = weekTotal - (thresh + t50)
      } else {
        ot25Hours = Math.min(over, Math.max(0, t50 - t25))
      }
    }
  }

  const overtimeHours = ot25Hours + ot50Hours + ot100Hours
  const totalHours    = regularHours + overtimeHours

  return {
    regularHours:  Math.round(regularHours  * 100) / 100,
    ot25Hours:     Math.round(ot25Hours     * 100) / 100,
    ot50Hours:     Math.round(ot50Hours     * 100) / 100,
    ot100Hours:    Math.round(ot100Hours    * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    totalHours:    Math.round(totalHours    * 100) / 100,
  }
}

// ─── MISE À JOUR RÉPARTITION HS (feuille unique) ──────────────

export function useRecalculateOvertime() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ timesheetId }) => {
      // 1. Récupérer les entrées + settings
      const [tsRes, setRes] = await Promise.all([
        supabase
          .from('time_sheets')
          .select('*, time_entries(*)')
          .eq('id', timesheetId)
          .single(),
        supabase
          .from('time_settings')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .maybeSingle(),
      ])
      if (tsRes.error) throw tsRes.error
      const entries  = tsRes.data.time_entries || []
      const settings = setRes.data || {}

      // 2. Calculer
      const breakdown = calculateOvertimeBreakdown(entries, settings)

      // 3. Mettre à jour la feuille
      const { data, error } = await supabase
        .from('time_sheets')
        .update({
          total_hours:    breakdown.totalHours,
          overtime_hours: breakdown.overtimeHours,
          regular_hours:  breakdown.regularHours,
          ot_25_hours:    breakdown.ot25Hours,
          ot_50_hours:    breakdown.ot50Hours,
          ot_100_hours:   breakdown.ot100Hours,
        })
        .eq('id', timesheetId)
        .select()
        .single()
      if (error) throw error
      return { ...data, breakdown }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['time_sheets'] })
      qc.invalidateQueries({ queryKey: ['time_sheet', vars.timesheetId] })
      qc.invalidateQueries({ queryKey: ['time_stats'] })
    },
  })
}

// ─── RECALCUL GLOBAL ORGANISATION ─────────────────────────────

export function useRecalculateOrgOvertime() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ weekStart }) => {
      const orgId = profile.organization_id

      // 1. Settings
      const { data: settings } = await supabase
        .from('time_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      // 2. Toutes les feuilles de la semaine avec leurs entrées
      let q = supabase
        .from('time_sheets')
        .select('*, time_entries(*)')
        .eq('organization_id', orgId)
      if (weekStart) q = q.eq('week_start', weekStart)

      const { data: sheets, error } = await q
      if (error) throw error

      // 3. Recalculer + mettre à jour chaque feuille
      const updates = (sheets || []).map(sheet => {
        const breakdown = calculateOvertimeBreakdown(sheet.time_entries || [], settings || {})
        return supabase
          .from('time_sheets')
          .update({
            total_hours:    breakdown.totalHours,
            overtime_hours: breakdown.overtimeHours,
            regular_hours:  breakdown.regularHours,
            ot_25_hours:    breakdown.ot25Hours,
            ot_50_hours:    breakdown.ot50Hours,
            ot_100_hours:   breakdown.ot100Hours,
          })
          .eq('id', sheet.id)
      })
      await Promise.all(updates)
      return { recalculated: updates.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_sheets'] })
      qc.invalidateQueries({ queryKey: ['time_stats'] })
    },
  })
}

// ─── VALIDATION HS PAR MANAGER ────────────────────────────────

export function useApproveOvertime() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (timesheetId) => {
      const { data, error } = await supabase
        .from('time_sheets')
        .update({
          overtime_approved:    true,
          overtime_approved_by: profile.id,
          overtime_approved_at: new Date().toISOString(),
          overtime_rejected_reason: null,
        })
        .eq('id', timesheetId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_sheets'] }),
  })
}

export function useRejectOvertime() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ timesheetId, reason }) => {
      const { data, error } = await supabase
        .from('time_sheets')
        .update({
          overtime_approved:        false,
          overtime_rejected_reason: reason,
        })
        .eq('id', timesheetId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_sheets'] }),
  })
}

// ─── ALERTES HS ───────────────────────────────────────────────

export function useOvertimeAlerts() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['overtime_alerts', orgId],
    queryFn: async () => {
      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 14)

      const [sheetsRes, settingsRes] = await Promise.all([
        supabase
          .from('time_sheets')
          .select(`
            *, users!time_sheets_user_id_fkey(id, first_name, last_name, service_id)
          `)
          .eq('organization_id', orgId)
          .gte('week_start', weekAgo.toISOString().split('T')[0])
          .order('week_start', { ascending: false }),
        supabase
          .from('time_settings')
          .select('*')
          .eq('organization_id', orgId)
          .maybeSingle(),
      ])

      const sheets   = sheetsRes.data  || []
      const settings = settingsRes.data || DEFAULT_OT_SETTINGS
      const alerts   = []

      sheets.forEach(sheet => {
        const user = sheet.users || {}
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim()
        const weekEnd = new Date(sheet.week_start)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const daysSinceEnd = Math.floor((now - weekEnd) / 86400000)

        // Alerte : feuille non soumise après délai
        if (sheet.status === 'draft' && daysSinceEnd > (settings.submission_deadline_days || 3)) {
          alerts.push({
            id:       `late_${sheet.id}`,
            type:     'late_submission',
            severity: daysSinceEnd > 7 ? CRITICALITY.CRITICAL : 'warning',
            userId:   sheet.user_id,
            userName: name,
            weekStart: sheet.week_start,
            message:  `Feuille de temps non soumise (${daysSinceEnd}j de retard)`,
            icon:     'clock',
          })
        }

        // Alerte : HS en attente de validation
        if (sheet.overtime_hours > 0 && !sheet.overtime_approved && sheet.status === LEAVE_STATUS.SUBMITTED) {
          alerts.push({
            id:       `ot_pending_${sheet.id}`,
            type:     'overtime_pending',
            severity: sheet.overtime_hours > 8 ? CRITICALITY.CRITICAL : 'warning',
            userId:   sheet.user_id,
            userName: name,
            weekStart: sheet.week_start,
            hours:    sheet.overtime_hours,
            message:  `${sheet.overtime_hours}h HS en attente de validation`,
            icon:     'alert',
          })
        }

        // Alerte : HS élevées (> 1.5× seuil hebdo)
        const weeklyThresh = settings.weekly_threshold_hours || 40
        if (sheet.overtime_hours > weeklyThresh * 0.5) {
          alerts.push({
            id:       `ot_high_${sheet.id}`,
            type:     'overtime_high',
            severity: 'info',
            userId:   sheet.user_id,
            userName: name,
            weekStart: sheet.week_start,
            hours:    sheet.overtime_hours,
            message:  `Volume HS élevé : ${sheet.overtime_hours}h cette semaine`,
            icon:     'trending',
          })
        }
      })

      return alerts.sort((a, b) => {
        const sev = { critical: 0, warning: 1, info: 2 }
        return (sev[a.severity] || 2) - (sev[b.severity] || 2)
      })
    },
    enabled: !!orgId,
    refetchInterval: 5 * 60 * 1000,
  })
}

// ─── EXPORT PAIE MENSUEL (HS structuré) ───────────────────────

export function useExportOvertimePayroll() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  const exportFn = async ({ year, month, format = 'xlsx' }) => {
    // Calculer la plage de semaines du mois
    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to   = `${year}-${String(month).padStart(2,'0')}-${lastDay}`

    const { data, error } = await supabase
      .from('time_sheets')
      .select(`
        week_start, status, total_hours, regular_hours,
        ot_25_hours, ot_50_hours, ot_100_hours, overtime_hours,
        overtime_approved, overtime_approved_at,
        users!time_sheets_user_id_fkey(
          id, first_name, last_name, role, service_id,
          services(name)
        )
      `)
      .eq('organization_id', orgId)
      .gte('week_start', from)
      .lte('week_start', to)
      .order('users(last_name)', { ascending: true })

    if (error) throw error

    // Agréger par collaborateur
    const byUser = {}
    ;(data || []).forEach(sheet => {
      const u   = sheet.users || {}
      const uid = u.id || 'unknown'
      if (!byUser[uid]) {
        byUser[uid] = {
          collaborateur: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
          service:       u.services?.name || '',
          role:          u.role || '',
          total_hours:   0,
          regular_hours: 0,
          ot_25_hours:   0,
          ot_50_hours:   0,
          ot_100_hours:  0,
          overtime_hours: 0,
          weeks:         0,
          validated_weeks: 0,
        }
      }
      byUser[uid].total_hours    += Number(sheet.total_hours    || 0)
      byUser[uid].regular_hours  += Number(sheet.regular_hours  || 0)
      byUser[uid].ot_25_hours    += Number(sheet.ot_25_hours    || 0)
      byUser[uid].ot_50_hours    += Number(sheet.ot_50_hours    || 0)
      byUser[uid].ot_100_hours   += Number(sheet.ot_100_hours   || 0)
      byUser[uid].overtime_hours += Number(sheet.overtime_hours || 0)
      byUser[uid].weeks          += 1
      if (sheet.overtime_approved) byUser[uid].validated_weeks += 1
    })

    const monthLabel = new Date(year, month - 1, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    // Feuille récap
    const summary = Object.values(byUser).map(u => ({
      'Collaborateur':       u.collaborateur,
      'Service':             u.service,
      'Rôle':                u.role,
      'Total heures':        +u.total_hours.toFixed(2),
      'Heures normales':     +u.regular_hours.toFixed(2),
      'HS taux 25%':         +u.ot_25_hours.toFixed(2),
      'HS taux 50%':         +u.ot_50_hours.toFixed(2),
      'HS taux 100%':        +u.ot_100_hours.toFixed(2),
      'Total HS':            +u.overtime_hours.toFixed(2),
      'Semaines validées':   `${u.validated_weeks}/${u.weeks}`,
    }))

    // Feuille détail hebdo
    const detail = (data || []).map(sheet => {
      const u = sheet.users || {}
      return {
        'Collaborateur':   `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        'Service':         u.services?.name || '',
        'Semaine':         sheet.week_start,
        'Statut':          TIMESHEET_STATUS_LABELS[sheet.status] || sheet.status,
        'Total heures':    +Number(sheet.total_hours    || 0).toFixed(2),
        'Heures normales': +Number(sheet.regular_hours  || 0).toFixed(2),
        'HS 25%':          +Number(sheet.ot_25_hours    || 0).toFixed(2),
        'HS 50%':          +Number(sheet.ot_50_hours    || 0).toFixed(2),
        'HS 100%':         +Number(sheet.ot_100_hours   || 0).toFixed(2),
        'Total HS':        +Number(sheet.overtime_hours || 0).toFixed(2),
        'HS validées':     sheet.overtime_approved ? 'Oui' : 'Non',
      }
    })

    const filename = `paie_heures_${year}_${String(month).padStart(2,'0')}`
    const wb = XLSX.utils.book_new()

    const wsSum = XLSX.utils.json_to_sheet(summary)
    wsSum['!cols'] = [
      { wch: 25 },{ wch: 18 },{ wch: 16 },
      { wch: 14 },{ wch: 16 },{ wch: 12 },{ wch: 12 },{ wch: 12 },{ wch: 10 },{ wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, wsSum, `Récap ${monthLabel}`)

    const wsDet = XLSX.utils.json_to_sheet(detail)
    wsDet['!cols'] = [
      { wch: 22 },{ wch: 16 },{ wch: 12 },{ wch: 14 },
      { wch: 12 },{ wch: 14 },{ wch: 8 },{ wch: 8 },{ wch: 8 },{ wch: 10 },{ wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, wsDet, 'Détail hebdomadaire')

    if (format === 'csv') {
      XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' })
    } else {
      XLSX.writeFile(wb, `${filename}.xlsx`)
    }

    return { exported: summary.length, month: monthLabel }
  }

  return { exportOvertimePayroll: exportFn }
}

// ─── FEUILLES HS EN ATTENTE (pour managers) ───────────────────

export function usePendingOvertimeSheets() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['pending_overtime_sheets', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_sheets')
        .select(`
          *,
          users!time_sheets_user_id_fkey(id, first_name, last_name, role, service_id)
        `)
        .eq('organization_id', orgId)
        .eq('status', LEAVE_STATUS.SUBMITTED)
        .gt('overtime_hours', 0)
        .eq('overtime_approved', false)
        .order('week_start', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

// ─── TASK TIME ENTRIES — temps timesheet lié à une tâche ──────
export function useTaskTimeEntries(taskId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['task_time_entries', taskId, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id, entry_date, hours, description, entry_type,
          user:users(id, first_name, last_name),
          time_sheets(week_start)
        `)
        .eq('task_id', taskId)
        .eq('organization_id', orgId)
        .order('entry_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!taskId && !!orgId,
  })
}
