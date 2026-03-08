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
export function useHeadcountStats(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['headcount_stats', orgId, year],
    queryFn: async () => {
      const startDate = `${year}-01-01`
      const endDate   = `${year}-12-31`
      const { data, error } = await supabase.rpc('query_mv', {
        mv_name: 'mv_headcount_stats',
        p_org_id: orgId
      }).select('*')
      // Direct MV query via RPC not available — use direct select via function
      // Fallback: query users + departures directly
      const { data: users, error: e1 } = await supabase
        .from('users')
        .select('id, role, created_at')
        .eq('organization_id', orgId)
      if (e1) throw e1

      const { data: departures, error: e2 } = await supabase
        .from('employee_departures')
        .select('user_id, departure_date')
        .eq('organization_id', orgId)
      if (e2) throw e2

      const deptSet = new Set(departures?.map(d => d.user_id) || [])
      const active  = (users || []).filter(u => !deptSet.has(u.id))

      // Monthly headcount for the year
      const months = Array.from({ length: 12 }, (_, i) => {
        const m     = new Date(year, i, 1)
        const label = m.toLocaleString('fr-FR', { month: 'short' })
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`
        const activeAtMonth = (users || []).filter(u => {
          const created = u.created_at?.slice(0, 7) || '2020-01'
          if (created > monthStr) return false
          const dep = departures?.find(d => d.user_id === u.id)
          if (dep && dep.departure_date?.slice(0, 7) <= monthStr) return false
          return true
        })
        return { month: label, monthStr, headcount: activeAtMonth.length }
      })

      // Role breakdown
      const byRole = active.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1
        return acc
      }, {})

      return {
        total: active.length,
        byRole,
        months,
        activeUsers: active
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000
  })
}

// ─── useTurnoverStats ────────────────────────────────────────
export function useTurnoverStats(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['turnover_stats', orgId, year],
    queryFn: async () => {
      // Departures this year
      const { data: departures, error } = await supabase
        .from('employee_departures')
        .select('id, user_id, departure_date, reason, type, rehirable, notes')
        .eq('organization_id', orgId)
        .gte('departure_date', `${year}-01-01`)
        .lte('departure_date', `${year}-12-31`)
        .order('departure_date', { ascending: false })
      if (error) throw error

      // Total headcount (beginning of year)
      const { count: totalHeadcount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const byReason = (departures || []).reduce((acc, d) => {
        acc[d.reason] = (acc[d.reason] || 0) + 1
        return acc
      }, {})

      const byMonth = Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`
        const cnt = (departures || []).filter(d => d.departure_date?.startsWith(monthStr)).length
        return {
          month: new Date(year, i, 1).toLocaleString('fr-FR', { month: 'short' }),
          count: cnt
        }
      })

      const totalDepartures = departures?.length || 0
      const turnoverRate    = totalHeadcount ? ((totalDepartures / totalHeadcount) * 100).toFixed(1) : 0
      const rehirableCount  = (departures || []).filter(d => d.rehirable).length

      return {
        total:           totalDepartures,
        turnoverRate:    parseFloat(turnoverRate),
        byReason,
        byMonth,
        rehirableCount,
        departures:      departures || []
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000
  })
}

// ─── useAbsenteeismStats ─────────────────────────────────────
export function useAbsenteeismStats(year = currentYear) {
  const { user } = useAuth()
  const orgId = user?.organization_id

  return useQuery({
    queryKey: ['absenteeism_stats', orgId, year],
    queryFn: async () => {
      const { data: leaves, error } = await supabase
        .from('leave_requests')
        .select('id, user_id, start_date, end_date, duration_days, leave_type, status')
        .eq('organization_id', orgId)
        .eq('status', 'approved')
        .gte('start_date', `${year}-01-01`)
        .lte('start_date', `${year}-12-31`)
      if (error) throw error

      const { count: headcount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const workingDaysYear = (headcount || 0) * 22 * 12

      const byType = (leaves || []).reduce((acc, l) => {
        const t = l.leave_type || 'Autre'
        if (!acc[t]) acc[t] = { count: 0, days: 0 }
        acc[t].count++
        acc[t].days += l.duration_days || 0
        return acc
      }, {})

      const byMonth = Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`
        const monthLeaves = (leaves || []).filter(l => l.start_date?.startsWith(monthStr))
        const totalDays   = monthLeaves.reduce((s, l) => s + (l.duration_days || 0), 0)
        const rate        = headcount ? ((totalDays / (headcount * 22)) * 100).toFixed(1) : 0
        return {
          month: new Date(year, i, 1).toLocaleString('fr-FR', { month: 'short' }),
          days:  totalDays,
          count: monthLeaves.length,
          rate:  parseFloat(rate)
        }
      })

      const totalDays = (leaves || []).reduce((s, l) => s + (l.duration_days || 0), 0)
      const annualRate = workingDaysYear ? ((totalDays / workingDaysYear) * 100).toFixed(1) : 0

      return {
        totalDays,
        annualRate:   parseFloat(annualRate),
        totalRequests: leaves?.length || 0,
        byType,
        byMonth
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000
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
      const orgReviews = (reviews || []).filter(rv => {
        // can't filter org directly, use proxy via headcount
        return true
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
