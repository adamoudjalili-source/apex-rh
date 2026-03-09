// ============================================================
// APEX RH — useHRIntelligence.js  ·  S82
// Intelligence RH — Bilan social + turnover
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Helpers ─────────────────────────────────────────────────
const currentYear = new Date().getFullYear()

// ─── useHeadcountStats ───────────────────────────────────────
// ✅ Fix S89 (BUG-M4) : v_headcount_stats_secure (RLS-safe) au lieu de mv_headcount_stats
export function useHeadcountStats(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['headcount_stats', orgId, year],
    queryFn: async () => {
      const startStr = `${year}-01-01`
      const endStr   = `${year}-12-31`

      // Vue sécurisée — filtre organization_id via auth.uid() côté Supabase
      const { data: rows, error } = await supabase
        .from('v_headcount_stats_secure')
        .select('month_start, headcount, collaborateurs, managers, direction, departed_count')
        .gte('month_start', startStr)
        .lte('month_start', endStr)
        .order('month_start', { ascending: true })
      if (error) throw error

      const months = (rows || []).map(r => ({
        month:    new Date(r.month_start).toLocaleString('fr-FR', { month: 'short' }),
        monthStr: r.month_start?.slice(0, 7),
        headcount: r.headcount,
        collaborateurs: r.collaborateurs,
        managers:  r.managers,
        direction: r.direction,
        departed:  r.departed_count,
      }))

      const latest = rows?.[rows.length - 1]
      const byRole = latest ? {
        collaborateur: latest.collaborateurs,
        manager:       latest.managers,
        direction:     latest.direction,
      } : {}

      return {
        total:  latest?.headcount ?? 0,
        byRole,
        months,
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── useTurnoverStats ────────────────────────────────────────
// ✅ Fix S89 (BUG-M4) : v_turnover_stats_secure (RLS-safe) au lieu de mv_turnover_stats
export function useTurnoverStats(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['turnover_stats', orgId, year],
    queryFn: async () => {
      const startStr = `${year}-01-01`
      const endStr   = `${year}-12-31`

      const { data: rows, error } = await supabase
        .from('v_turnover_stats_secure')
        .select('dep_month, reason, departure_type, rehirable, departure_count, total_active, turnover_rate_pct')
        .gte('dep_month', startStr)
        .lte('dep_month', endStr)
        .order('dep_month', { ascending: true })
      if (error) throw error

      const byReason = (rows || []).reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + (r.departure_count || 0)
        return acc
      }, {})

      const byMonth = Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`
        const monthRows = (rows || []).filter(r => r.dep_month?.startsWith(monthStr))
        const cnt = monthRows.reduce((s, r) => s + (r.departure_count || 0), 0)
        const rate = monthRows[0]?.turnover_rate_pct ?? 0
        return {
          month: new Date(year, i, 1).toLocaleString('fr-FR', { month: 'short' }),
          count: cnt,
          turnoverRate: parseFloat(rate),
        }
      })

      const totalDepartures = (rows || []).reduce((s, r) => s + (r.departure_count || 0), 0)
      const avgTurnoverRate = rows?.length
        ? (rows.reduce((s, r) => s + parseFloat(r.turnover_rate_pct || 0), 0) / rows.length).toFixed(1)
        : 0
      const rehirableCount = (rows || []).filter(r => r.rehirable).reduce((s, r) => s + (r.departure_count || 0), 0)

      return {
        total:        totalDepartures,
        turnoverRate: parseFloat(avgTurnoverRate),
        byReason,
        byMonth,
        rehirableCount,
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── useAbsenteeismStats ─────────────────────────────────────
// ✅ Fix S89 (BUG-M4) : v_absenteeism_stats_secure (RLS-safe) au lieu de mv_absenteeism_stats
export function useAbsenteeismStats(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['absenteeism_stats', orgId, year],
    queryFn: async () => {
      const startStr = `${year}-01-01`
      const endStr   = `${year}-12-31`

      const { data: rows, error } = await supabase
        .from('v_absenteeism_stats_secure')
        .select('absence_month, leave_type, request_count, total_days, headcount, total_working_days_month, absenteeism_rate_pct')
        .gte('absence_month', startStr)
        .lte('absence_month', endStr)
        .order('absence_month', { ascending: true })
      if (error) throw error

      const byType = (rows || []).reduce((acc, r) => {
        const t = r.leave_type || 'Autre'
        if (!acc[t]) acc[t] = { count: 0, days: 0 }
        acc[t].count += r.request_count || 0
        acc[t].days  += r.total_days    || 0
        return acc
      }, {})

      const byMonth = Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`
        const monthRows = (rows || []).filter(r => r.absence_month?.startsWith(monthStr))
        const totalDays = monthRows.reduce((s, r) => s + (r.total_days || 0), 0)
        const count     = monthRows.reduce((s, r) => s + (r.request_count || 0), 0)
        const rate      = monthRows[0]?.absenteeism_rate_pct ?? 0
        return {
          month: new Date(year, i, 1).toLocaleString('fr-FR', { month: 'short' }),
          days:  totalDays,
          count,
          rate:  parseFloat(rate),
        }
      })

      const totalDays = (rows || []).reduce((s, r) => s + (r.total_days || 0), 0)
      const totalRequests = (rows || []).reduce((s, r) => s + (r.request_count || 0), 0)
      const annualRate = rows?.length
        ? (rows.reduce((s, r) => s + parseFloat(r.absenteeism_rate_pct || 0), 0) / rows.length).toFixed(1)
        : 0

      return {
        totalDays,
        annualRate:    parseFloat(annualRate),
        totalRequests,
        byType,
        byMonth,
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── useSalaryMassStats ──────────────────────────────────────
export function useSalaryMassStats(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['salary_mass_stats', orgId, year],
    queryFn: async () => {
      // Current salaries
      const { data: records, error } = await supabase
        .from('compensation_records')
        .select('employee_id, salary_amount, is_current, effective_date')
        .eq('is_current', true)
      if (error) throw error

      // Filter by org (join users)
      const { data: orgUsers } = await supabase
        .from('users')
        .select('id, role')
        .eq('organization_id', orgId)
      if (!orgUsers) return {}

      const orgUserIds = new Set(orgUsers.map(u => u.id))
      const orgRecords = (records || []).filter(r => orgUserIds.has(r.employee_id))

      const totalMass = orgRecords.reduce((s, r) => s + (r.salary_amount * 12 || 0), 0)
      const avgSalary = orgRecords.length ? orgRecords.reduce((s, r) => s + (r.salary_amount || 0), 0) / orgRecords.length : 0

      // By role
      const byRole = orgRecords.reduce((acc, r) => {
        const role = orgUsers.find(u => u.id === r.employee_id)?.role || 'other'
        if (!acc[role]) acc[role] = { count: 0, total: 0 }
        acc[role].count++
        acc[role].total += r.salary_amount || 0
        return acc
      }, {})

      // Salary ranges
      const ranges = [
        { label: '< 30k', min: 0,      max: 2500  },
        { label: '30-50k', min: 2500,   max: 4167  },
        { label: '50-70k', min: 4167,   max: 5833  },
        { label: '70-100k', min: 5833,  max: 8333  },
        { label: '> 100k', min: 8333,   max: Infinity }
      ]
      const distribution = ranges.map(r => ({
        ...r,
        count: orgRecords.filter(rec => rec.salary_amount >= r.min && rec.salary_amount < r.max).length
      }))

      // Historical from compensation_reviews (evolution)
      const { data: reviews } = await supabase
        .from('compensation_reviews')
        .select('created_at, new_base_salary, old_base_salary')
        .order('created_at', { ascending: true })
      // filter by org users
      })

      return {
        totalMass,
        avgSalary,
        medianSalary: orgRecords.length
          ? [...orgRecords].sort((a,b) => a.salary_amount - b.salary_amount)[Math.floor(orgRecords.length / 2)]?.salary_amount || 0
          : 0,
        byRole,
        distribution,
        covered: orgRecords.length,
        total:   orgUsers.length
      }
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000
  })
}

// ─── useSocialReport ─────────────────────────────────────────
export function useSocialReport(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['social_report', orgId, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_social_report', {
        p_org_id: orgId,
        p_year:   year
      })
      if (error) throw error
      return data
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000
  })
}

// ─── useEmployeeDepartures ───────────────────────────────────
export function useEmployeeDepartures() {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['employee_departures', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_departures')
        .select(`
          id, user_id, departure_date, reason, type, rehirable, notes, created_at,
          users!user_id(id, email, role)
        `)
        .eq('organization_id', orgId)
        .order('departure_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!orgId
  })
}

// ─── useRegisterDeparture ────────────────────────────────────
export function useRegisterDeparture() {
  const { user } = useAuth()
  const orgId    = user?.organization_id
  const qc       = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('employee_departures')
        .upsert({
          organization_id: orgId,
          registered_by:   user?.id,
          ...payload
        }, { onConflict: 'user_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_departures', orgId] })
      qc.invalidateQueries({ queryKey: ['turnover_stats', orgId] })
      qc.invalidateQueries({ queryKey: ['social_report', orgId] })
    }
  })
}

// ─── useDeleteDeparture ──────────────────────────────────────
export function useDeleteDeparture() {
  const { user } = useAuth()
  const orgId    = user?.organization_id
  const qc       = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('employee_departures')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_departures', orgId] })
      qc.invalidateQueries({ queryKey: ['turnover_stats', orgId] })
    }
  })
}