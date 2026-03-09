// ============================================================
// APEX RH — src/hooks/useConges.js
// Session 70 — Moteur de règles complet
// Nouveau : acquisition auto, jours fériés, report N+1, alertes, export paie
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import * as XLSX    from 'xlsx'
import { LEAVE_STATUS } from '../utils/constants'

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

// Jours fériés officiels du Niger (fixes + mobiles islamiques 2026)
export const SENEGAL_PUBLIC_HOLIDAYS_DEFAULT = [
  // ── Jours fériés fixes ──────────────────────────────────────
  { date: '01-01', name: "Nouvel An",                      is_fixed: true,  is_active: true },
  { date: '04-24', name: "Fête de la Concorde Nationale",  is_fixed: true,  is_active: true },
  { date: '05-01', name: "Fête du Travail",                is_fixed: true,  is_active: true },
  { date: '08-03', name: "Fête de l'Indépendance",         is_fixed: true,  is_active: true },
  { date: '12-18', name: "Fête de la République",          is_fixed: true,  is_active: true },
  { date: '12-25', name: "Noël",                           is_fixed: true,  is_active: true },
  // ── Jours fériés islamiques mobiles (2026) ──────────────────
  { date: '2026-01-06', name: "Tamkharit (Achoura)",       is_fixed: false, is_active: true },
  { date: '2026-03-20', name: "Maouloud (Naissance Prophète)", is_fixed: false, is_active: true },
  { date: '2026-06-18', name: "Laylat al-Qadr",            is_fixed: false, is_active: true },
  { date: '2026-06-22', name: "Aïd el-Fitr (Korité)",      is_fixed: false, is_active: true },
  { date: '2026-08-29', name: "Aïd el-Adha (Tabaski)",     is_fixed: false, is_active: true },
  { date: '2026-09-18', name: "1er Muharram (An islamique)",is_fixed: false, is_active: true },
]

export function countWorkDays(start, end, workDays = [1,2,3,4,5], publicHolidays = []) {
  if (!start || !end) return 0
  const s = new Date(start), e = new Date(end)
  if (s > e) return 0
  const year = s.getFullYear()
  const holidaySet = new Set((publicHolidays || [])
    .filter(h => h.is_active !== false)
    .map(h => h.is_fixed ? `${year}-${h.date}` : h.date))
  let count = 0, cur = new Date(s)
  while (cur <= e) {
    if (workDays.includes(cur.getDay()) && !holidaySet.has(cur.toISOString().split('T')[0])) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
}
export function calculateAccruedDays(accrualRate, hireDate, year) {
  if (!accrualRate || !hireDate) return 0
  const hire = new Date(hireDate)
  const now  = new Date()
  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year, 11, 31)
  const start = hire > yearStart ? hire : yearStart
  const end   = now  < yearEnd  ? now  : yearEnd
  if (start > end) return 0
  const months = (end.getFullYear() - start.getFullYear())*12 + (end.getMonth() - start.getMonth()) + 1
  return Math.round(Math.min(accrualRate * months, accrualRate * 12) * 10) / 10
}

// ─── LEAVE TYPES ──────────────────────────────────────────────
export function useLeaveTypes() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  return useQuery({
    queryKey: ['leave_types', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_types').select('*').eq('organization_id', orgId).order('name')
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
      const { data, error } = await supabase.from('leave_types').insert({ ...payload, organization_id: orgId }).select().single()
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
      const { data, error } = await supabase.from('leave_types').update(payload).eq('id', id).eq('organization_id', orgId).select().single()
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
  const uid = userId || profile?.id
  const yr  = year || new Date().getFullYear()
  return useQuery({
    queryKey: ['leave_balances', orgId, uid, yr],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_balances')
        .select('*, leave_types(id,name,code,color,max_days,is_paid,requires_attachment,accrual_rate,accrual_enabled,carry_over_policy,carry_over_max_days)')
        .eq('organization_id', orgId).eq('user_id', uid).eq('year', yr)
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
      const { data, error } = await supabase.from('leave_balances')
        .upsert({ organization_id: orgId, user_id: userId, leave_type_id: leaveTypeId, year: year || new Date().getFullYear(), ...payload })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_balances', orgId] }),
  })
}

// ─── ACCRUAL ENGINE ───────────────────────────────────────────
export function useRecalculateBalances() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  return useMutation({
    mutationFn: async ({ userId, year } = {}) => {
      const yr = year || new Date().getFullYear()
      const { data: types } = await supabase.from('leave_types').select('*').eq('organization_id', orgId).eq('is_active', true).eq('accrual_enabled', true)
      if (!types?.length) return []
      let usersQ = supabase.from('users').select('id,hire_date,contract_type').eq('organization_id', orgId).eq('is_active', true)
      if (userId) usersQ = usersQ.eq('id', userId)
      const { data: users } = await usersQ
      if (!users?.length) return []
      const upserts = []
      for (const user of users) {
        for (const type of types) {
          const contractTypes = type.contract_types || ['CDI','CDD','essai']
          if (!contractTypes.includes(user.contract_type || 'CDI')) continue
          const accrued = calculateAccruedDays(type.accrual_rate, user.hire_date, yr)
          upserts.push({ organization_id: orgId, user_id: user.id, leave_type_id: type.id, year: yr, accrued_days: accrued, initial_days: accrued })
        }
      }
      if (!upserts.length) return []
      const { data, error } = await supabase.from('leave_balances')
        .upsert(upserts, { onConflict: 'organization_id,user_id,leave_type_id,year' }).select()
      if (error) throw error
      return data || []
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_balances', orgId] }),
  })
}

// ─── REPORT N+1 ───────────────────────────────────────────────
export function useApplyCarryOver() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  return useMutation({
    mutationFn: async ({ fromYear } = {}) => {
      const fromYr = fromYear || new Date().getFullYear() - 1
      const toYr   = fromYr + 1
      const { data: oldBals } = await supabase.from('leave_balances')
        .select('*, leave_types(carry_over_policy, carry_over_max_days)')
        .eq('organization_id', orgId).eq('year', fromYr)
      if (!oldBals?.length) return []
      const { data: settings } = await supabase.from('leave_settings').select('carry_over_deadline').eq('organization_id', orgId).single()
      const expiryDate = settings?.carry_over_deadline
        ? new Date(settings.carry_over_deadline)
        : new Date(toYr, 2, 31)
      const upserts = []
      for (const bal of oldBals) {
        const policy = bal.leave_types?.carry_over_policy || 'none'
        const maxDays = bal.leave_types?.carry_over_max_days || 0
        const remaining = Math.max((bal.initial_days||0) - (bal.used_days||0) - (bal.pending_days||0), 0)
        let carryOver = 0
        if (policy === 'full')   carryOver = remaining
        if (policy === 'capped') carryOver = Math.min(remaining, maxDays)
        if (carryOver > 0) upserts.push({
          organization_id: orgId, user_id: bal.user_id, leave_type_id: bal.leave_type_id,
          year: toYr, carried_over: carryOver, expiry_date: expiryDate.toISOString().split('T')[0],
        })
      }
      if (!upserts.length) return []
      const { data, error } = await supabase.from('leave_balances')
        .upsert(upserts, { onConflict: 'organization_id,user_id,leave_type_id,year' }).select()
      if (error) throw error
      return data || []
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_balances', orgId] }),
  })
}

// ─── ALERTES ──────────────────────────────────────────────────
export function useLeaveAlerts() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  return useQuery({
    queryKey: ['leave_alerts', orgId],
    queryFn: async () => {
      const alerts = [], now = new Date()
      const { data: settings } = await supabase.from('leave_settings').select('pending_alert_hours,low_balance_threshold').eq('organization_id', orgId).single()
      const pendingHours = settings?.pending_alert_hours || 48
      const threshold    = settings?.low_balance_threshold || 2
      const cutoff = new Date(now.getTime() - pendingHours*3600*1000)

      // Demandes en attente trop longtemps
      const { data: pending } = await supabase.from('leave_requests')
        .select('id,created_at,user_id,days_count,leave_types(name),users!leave_requests_user_id_fkey(first_name,last_name)')
        .eq('organization_id', orgId).in('status', [LEAVE_STATUS.SUBMITTED,LEAVE_STATUS.MANAGER_APPROVED]).lte('created_at', cutoff.toISOString())
      for (const req of pending || []) {
        const hrs = Math.round((now - new Date(req.created_at))/3600000)
        const name = `${req.users?.first_name||''} ${req.users?.last_name||''}`.trim()
        alerts.push({ id:`pending_${req.id}`, type:'pending', severity: hrs>72?'high':'medium',
          title: `Demande en attente — ${name}`,
          description: `${req.leave_types?.name||'Congé'} (${req.days_count}j) — ${hrs}h sans réponse`,
          leave_request_id: req.id, user_id: req.user_id })
      }

      // Soldes faibles
      const { data: bals } = await supabase.from('leave_balances')
        .select('user_id,initial_days,used_days,pending_days,carried_over,leave_types(name,code,color),users!leave_balances_user_id_fkey(first_name,last_name)')
        .eq('organization_id', orgId).eq('year', now.getFullYear())
      for (const bal of bals || []) {
        const total = (bal.initial_days||0)+(bal.carried_over||0)
        const rem   = Math.max(total-(bal.used_days||0)-(bal.pending_days||0), 0)
        if (total > 0 && rem <= threshold) {
          const name = `${bal.users?.first_name||''} ${bal.users?.last_name||''}`.trim()
          alerts.push({ id:`bal_${bal.user_id}_${bal.leave_types?.code}`, type:'low_balance', severity: rem===0?'high':'low',
            title: `Solde faible — ${name}`,
            description: `${bal.leave_types?.name} : ${rem.toFixed(1)} j restant(s)`, color: bal.leave_types?.color, user_id: bal.user_id })
        }
      }

      // Soldes reportés expirant bientôt
      const in30 = new Date(now.getTime()+30*24*3600*1000)
      const { data: expiring } = await supabase.from('leave_balances')
        .select('user_id,carried_over,expiry_date,leave_types(name,code,color),users!leave_balances_user_id_fkey(first_name,last_name)')
        .eq('organization_id', orgId).eq('year', now.getFullYear()).gt('carried_over', 0)
        .not('expiry_date','is',null).lte('expiry_date', in30.toISOString().split('T')[0]).gte('expiry_date', now.toISOString().split('T')[0])
      for (const bal of expiring || []) {
        const daysLeft = Math.round((new Date(bal.expiry_date)-now)/(24*3600*1000))
        const name = `${bal.users?.first_name||''} ${bal.users?.last_name||''}`.trim()
        alerts.push({ id:`exp_${bal.user_id}_${bal.leave_types?.code}`, type:'expiry', severity: daysLeft<=7?'high':'medium',
          title: `Solde expirant — ${name}`, description: `${bal.carried_over}j de ${bal.leave_types?.name} expirent dans ${daysLeft}j`,
          expiry_date: bal.expiry_date, color: bal.leave_types?.color, user_id: bal.user_id })
      }

      const order = { high:0, medium:1, low:2 }
      return alerts.sort((a,b) => order[a.severity]-order[b.severity])
    },
    enabled: !!orgId,
    refetchInterval: 5*60*1000,
  })
}

// ─── LEAVE REQUESTS ───────────────────────────────────────────
export function useLeaveRequests({ userId, status, year } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  return useQuery({
    queryKey: ['leave_requests', orgId, userId, status, year],
    queryFn: async () => {
      let q = supabase.from('leave_requests').select(`*,leave_types(id,name,code,color,requires_attachment),users!leave_requests_user_id_fkey(id,first_name,last_name,email,avatar_url),manager:users!leave_requests_manager_approved_by_fkey(id,first_name,last_name),hr:users!leave_requests_hr_approved_by_fkey(id,first_name,last_name)`).eq('organization_id', orgId).order('created_at', { ascending: false })
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
      let q = supabase.from('leave_requests').select(`*,leave_types(id,name,code,color,requires_attachment),users!leave_requests_user_id_fkey(id,first_name,last_name,email,avatar_url,service_id),manager:users!leave_requests_manager_approved_by_fkey(id,first_name,last_name),hr:users!leave_requests_hr_approved_by_fkey(id,first_name,last_name)`).eq('organization_id', orgId).order('created_at', { ascending: false })
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
      const { data, error } = await supabase.from('leave_requests').select(`*,leave_types(id,name,code,color,requires_attachment,max_days),users!leave_requests_user_id_fkey(id,first_name,last_name,email,avatar_url),manager:users!leave_requests_manager_approved_by_fkey(id,first_name,last_name),hr:users!leave_requests_hr_approved_by_fkey(id,first_name,last_name)`).eq('id', id).eq('organization_id', orgId).single()
      if (error) throw error
      return data
    },
    enabled: !!id && !!orgId,
  })
}

function useInvalidateLeaves() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  return () => {
    qc.invalidateQueries({ queryKey: ['leave_requests', orgId] })
    qc.invalidateQueries({ queryKey: ['team_leave_requests', orgId] })
    qc.invalidateQueries({ queryKey: ['leave_balances', orgId] })
    qc.invalidateQueries({ queryKey: ['team_calendar', orgId] })
    qc.invalidateQueries({ queryKey: ['leave_alerts', orgId] })
  }
}

export function useCreateLeaveRequest() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.from('leave_requests').insert({ ...payload, organization_id: orgId, user_id: profile?.id, status: 'draft' }).select().single()
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
      const { data, error } = await supabase.from('leave_requests').update({ status: LEAVE_STATUS.SUBMITTED }).eq('id', id).eq('organization_id', orgId).eq('user_id', profile?.id).select().single()
      if (error) throw error
      await supabase.from('notifications').insert({ organization_id: orgId, user_id: profile?.id, type: 'leave_submitted', title: 'Demande de congé soumise', content: 'Votre demande a été transmise à votre manager.', is_read: false }).then(() => {})
      return data
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['leave_request', undefined] }) },
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
        ? { status: LEAVE_STATUS.MANAGER_APPROVED, manager_approved_by: profile?.id, manager_approved_at: new Date().toISOString() }
        : { status: LEAVE_STATUS.HR_APPROVED, hr_approved_by: profile?.id, hr_approved_at: new Date().toISOString() }
      const { data, error } = await supabase.from('leave_requests').update(update).eq('id', id).eq('organization_id', orgId).select('*, users!leave_requests_user_id_fkey(id)').single()
      if (error) throw error
      await supabase.from('notifications').insert({ organization_id: orgId, user_id: data.user_id, type: isManager ? 'leave_manager_approved' : 'leave_hr_approved', title: isManager ? 'Congé approuvé par votre manager' : 'Congé validé par les RH', content: isManager ? 'Transmise aux RH pour validation finale.' : 'Votre congé est définitivement validé.', is_read: false }).then(() => {})
      return data
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['leave_request'] }) },
  })
}
export function useRejectLeaveRequest() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: async ({ id, rejection_reason }) => {
      const { data, error } = await supabase.from('leave_requests').update({ status: 'rejected', rejection_reason }).eq('id', id).eq('organization_id', orgId).select('*, users!leave_requests_user_id_fkey(id)').single()
      if (error) throw error
      await supabase.from('notifications').insert({ organization_id: orgId, user_id: data.user_id, type: 'leave_rejected', title: 'Demande de congé refusée', content: rejection_reason || 'Votre demande a été refusée.', is_read: false }).then(() => {})
      return data
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['leave_request'] }) },
  })
}

export function useLeaveRequestComments(requestId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  return useQuery({
    queryKey: ['leave_comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_request_comments').select('*, users!leave_request_comments_user_id_fkey(id,first_name,last_name,avatar_url)').eq('leave_request_id', requestId).eq('organization_id', orgId).order('created_at')
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
      const { data, error } = await supabase.from('leave_request_comments').insert({ leave_request_id: requestId, organization_id: orgId, user_id: profile?.id, content }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { requestId }) => qc.invalidateQueries({ queryKey: ['leave_comments', requestId] }),
  })
}

export function useTeamCalendar({ month, year } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const m = month ?? new Date().getMonth()+1
  const y = year  ?? new Date().getFullYear()
  return useQuery({
    queryKey: ['team_calendar', orgId, m, y],
    queryFn: async () => {
      const firstDay = `${y}-${String(m).padStart(2,'0')}-01`
      const lastDay  = new Date(y, m, 0).toISOString().split('T')[0]
      const { data, error } = await supabase.from('leave_requests').select(`id,user_id,start_date,end_date,days_count,status,leave_types(id,name,code,color),users!leave_requests_user_id_fkey(id,first_name,last_name,avatar_url)`).eq('organization_id', orgId).in('status', [LEAVE_STATUS.SUBMITTED,LEAVE_STATUS.MANAGER_APPROVED,LEAVE_STATUS.HR_APPROVED]).lte('start_date', lastDay).gte('end_date', firstDay).order('start_date')
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useLeaveSettings() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  return useQuery({
    queryKey: ['leave_settings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_settings').select('*').eq('organization_id', orgId).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || { cp_days_per_year:25, rtt_days_per_year:10, carry_over_max:5, carry_over_deadline:null, work_days:[1,2,3,4,5], public_holidays:[], low_balance_threshold:2, pending_alert_hours:48, accrual_day:1 }
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
      const { data, error } = await supabase.from('leave_settings').upsert({ ...settings, organization_id: orgId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave_settings', orgId] }); qc.invalidateQueries({ queryKey: ['leave_alerts', orgId] }) },
  })
}

// ─── EXPORT PAIE MENSUEL ──────────────────────────────────────
export function useExportPayroll() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  return useMutation({
    mutationFn: async ({ year, month, format = 'csv' }) => {
      const mm = String(month).padStart(2,'0')
      const startDate = `${year}-${mm}-01`
      const endDate   = new Date(year, month, 0).toISOString().split('T')[0]
      const { data, error } = await supabase.from('leave_requests')
        .select('*,leave_types(name,code,color,is_paid),users!leave_requests_user_id_fkey(id,first_name,last_name,email,services(name),divisions(name))')
        .eq('organization_id', orgId).eq('status', LEAVE_STATUS.HR_APPROVED)
        .lte('start_date', endDate).gte('end_date', startDate).order('start_date')
      if (error) throw error
      const rows = (data||[]).map(r => ({
        'Nom':          `${r.users?.last_name||''} ${r.users?.first_name||''}`.trim(),
        'Email':        r.users?.email||'',
        'Service':      r.users?.services?.name||'',
        'Division':     r.users?.divisions?.name||'',
        'Type absence': r.leave_types?.name||'',
        'Code':         r.leave_types?.code||'',
        'Payé':         r.leave_types?.is_paid?'Oui':'Non',
        'Début':        r.start_date,
        'Fin':          r.end_date,
        'Nb jours':     r.days_count,
        'Période':      `${mm}/${year}`,
        'Motif':        r.reason||'',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `Paie_${mm}_${year}`)
      const ext = format==='csv'?'csv':'xlsx'
      const buf = XLSX.write(wb, { bookType: format==='csv'?'csv':'xlsx', type:'array' })
      const blob = new Blob([buf], { type: format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=`export_paie_${mm}_${year}.${ext}`; a.click()
      URL.revokeObjectURL(url)
      return rows.length
    },
  })
}

export function useExportLeaves() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  return useMutation({
    mutationFn: async ({ startDate, endDate, format='xlsx', userId }) => {
      let q = supabase.from('leave_requests').select('*,leave_types(name,code,color),users!leave_requests_user_id_fkey(first_name,last_name,email)').eq('organization_id', orgId).gte('start_date', startDate).lte('end_date', endDate).order('start_date')
      if (userId) q = q.eq('user_id', userId)
      const { data, error } = await q
      if (error) throw error
      const rows = (data||[]).map(r => ({ 'Collaborateur': `${r.users?.first_name||''} ${r.users?.last_name||''}`.trim(), 'Email': r.users?.email||'', 'Type de congé': r.leave_types?.name||'', 'Code': r.leave_types?.code||'', 'Début': r.start_date, 'Fin': r.end_date, 'Nb jours': r.days_count, 'Statut': LEAVE_STATUS_LABELS[r.status]||r.status, 'Motif': r.reason||'', 'Créé le': new Date(r.created_at).toLocaleDateString('fr-FR') }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Congés')
      const ext = format==='csv'?'csv':'xlsx'
      const buf = XLSX.write(wb, { bookType: format==='csv'?'csv':'xlsx', type:'array' })
      const blob = new Blob([buf], { type: format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=`conges_${startDate}_${endDate}.${ext}`; a.click()
      URL.revokeObjectURL(url)
    },
  })
}
