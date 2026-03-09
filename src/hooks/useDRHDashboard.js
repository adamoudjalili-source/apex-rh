// ============================================================
// APEX RH — src/hooks/useDRHDashboard.js
// Session 47 — Tableau de Bord DRH
// Agrégations multi-divisions : KPIs globaux, matrice divisions,
// tendances mensuelles, alertes agents (via patterns S46)
// Accès réservé : isAdmin || isDirecteur
// ⚠️ Colonnes réelles : score_date, score_total, score_delivery, score_quality
// ============================================================
import { useQuery }  from '@tanstack/react-query'
import { supabase }  from '../lib/supabase'
import { getLastNMonthKeys } from './useAnalytics'
import { detectPatterns }    from './usePredictiveAnalytics'
import { CRITICALITY } from '../utils/constants'

// ─── HOOK 1 : KPIs globaux ───────────────────────────────────

export function useDRHGlobalKPIs() {
  return useQuery({
    queryKey: ['drh_global_kpis'],
    queryFn:  async () => {
      // On tire directement de la vue SQL créée en S47
      const { data, error } = await supabase
        .from('v_drh_global_kpis')
        .select('*')
        .maybeSingle()

      if (error) throw error
      return data || {}
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 2 : Matrice divisions (score moyen + risque) ───────

export function useDivisionMatrix(months = 3) {
  const monthKeys = getLastNMonthKeys(months)
  const refMonth  = monthKeys[monthKeys.length - 1]
  const prevMonth = monthKeys[monthKeys.length - 2]

  return useQuery({
    queryKey: ['drh_division_matrix', refMonth],
    queryFn:  async () => {
      // ── PULSE par division (2 derniers mois pour tendance)
      const { data: pulseCur, error: e1 } = await supabase
        .from('v_division_monthly_summary')
        .select('division_id,division_name,month_key,avg_pulse,avg_delivery,avg_quality,nb_agents,agents_with_pulse')
        .in('month_key', [refMonth, prevMonth])

      if (e1) throw e1

      // ── NITA par division (2 derniers mois)
      const { data: nitaData, error: e2 } = await supabase
        .from('v_division_nita_monthly')
        .select('division_id,division_name,month_key,avg_nita_composite,avg_resilience,avg_reliability,avg_endurance,agents_with_nita')
        .in('month_key', [refMonth, prevMonth])

      if (e2) throw e2

      // ── OKR par division
      const { data: okrData, error: e3 } = await supabase
        .from('objectives')
        .select(`
          id,
          progress_score,
          status,
          users!owner_id(division_id)
        `)
        .in('status', ['actif', 'en_evaluation'])
        .not('progress_score', 'is', null)

      if (e3) throw e3

      // ── F360 par division (via evaluated user)
      const { data: f360Data, error: e4 } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          status,
          users!evaluated_id(division_id)
        `)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 3600_000).toISOString())

      if (e4) throw e4

      // ── Agréger par division
      const divMap = {}

      // Helper pour s'assurer que la division existe
      const ensureDiv = (id, name) => {
        if (!divMap[id]) {
          divMap[id] = {
            id, name: name || id,
            pulse_cur: null, pulse_prev: null,
            nita_cur:  null, nita_prev:  null,
            delivery:  null, quality:    null,
            avg_resilience: null, avg_reliability: null, avg_endurance: null,
            okr_progress:   null, okr_count: 0,
            f360_rate:      null, f360_total: 0,
            nb_agents:      0, agents_pulse: 0, agents_nita: 0,
          }
        }
      }

      // PULSE
      ;(pulseCur || []).forEach(row => {
        ensureDiv(row.division_id, row.division_name)
        const d = divMap[row.division_id]
        if (row.month_key === refMonth) {
          d.pulse_cur    = row.avg_pulse
          d.delivery     = row.avg_delivery
          d.quality      = row.avg_quality
          d.nb_agents    = Math.max(d.nb_agents, row.nb_agents || 0)
          d.agents_pulse = row.agents_with_pulse || 0
        } else if (row.month_key === prevMonth) {
          d.pulse_prev = row.avg_pulse
        }
      })

      // NITA
      ;(nitaData || []).forEach(row => {
        ensureDiv(row.division_id, row.division_name)
        const d = divMap[row.division_id]
        if (row.month_key === refMonth) {
          d.nita_cur      = row.avg_nita_composite
          d.avg_resilience  = row.avg_resilience
          d.avg_reliability = row.avg_reliability
          d.avg_endurance   = row.avg_endurance
          d.agents_nita   = row.agents_with_nita || 0
        } else if (row.month_key === prevMonth) {
          d.nita_prev = row.avg_nita_composite
        }
      })

      // OKR : agréger par division via users.division_id
      const okrByDiv = {}
      ;(okrData || []).forEach(o => {
        const divId = o.users?.division_id
        if (!divId) return
        if (!okrByDiv[divId]) okrByDiv[divId] = { total: 0, sum: 0 }
        okrByDiv[divId].total++
        okrByDiv[divId].sum += o.progress_score || 0
      })
      Object.entries(okrByDiv).forEach(([divId, v]) => {
        ensureDiv(divId, null)
        divMap[divId].okr_progress = Math.round(v.sum / v.total)
        divMap[divId].okr_count    = v.total
      })

      // F360 : agréger par division
      const f360ByDiv = {}
      ;(f360Data || []).forEach(r => {
        const divId = r.users?.division_id
        if (!divId) return
        if (!f360ByDiv[divId]) f360ByDiv[divId] = { total: 0, done: 0 }
        f360ByDiv[divId].total++
        if (r.status === 'completed') f360ByDiv[divId].done++
      })
      Object.entries(f360ByDiv).forEach(([divId, v]) => {
        ensureDiv(divId, null)
        divMap[divId].f360_rate  = v.total ? Math.round(v.done * 100 / v.total) : null
        divMap[divId].f360_total = v.total
      })

      // ── Calcul indicateur de risque par division
      const divisions = Object.values(divMap).map(d => {
        let riskScore = 0
        const flags   = []

        // Déclin PULSE
        if (d.pulse_cur !== null && d.pulse_prev !== null) {
          const delta = d.pulse_cur - d.pulse_prev
          if (delta <= -10) { riskScore += 3; flags.push({ type: 'decline', label: `PULSE −${Math.abs(delta)} pts`, severity: 'high' }) }
          else if (delta <= -5) { riskScore += 2; flags.push({ type: 'decline', label: `PULSE −${Math.abs(delta)} pts`, severity: 'medium' }) }
          else if (delta > 5)   flags.push({ type: 'progress', label: `PULSE +${delta} pts`, severity: 'positive' })
        }

        // PULSE bas
        if (d.pulse_cur !== null && d.pulse_cur < 50)  { riskScore += 2; flags.push({ type: 'low', label: `PULSE bas (${d.pulse_cur})`, severity: 'high' }) }
        else if (d.pulse_cur !== null && d.pulse_cur < 60) { riskScore += 1; flags.push({ type: 'low', label: `PULSE faible (${d.pulse_cur})`, severity: 'medium' }) }

        // NITA bas
        if (d.nita_cur !== null && d.nita_cur < 45) { riskScore += 2; flags.push({ type: 'nita_low', label: `NITA bas (${d.nita_cur})`, severity: 'high' }) }

        // Déclin NITA
        if (d.nita_cur !== null && d.nita_prev !== null) {
          const delta = d.nita_cur - d.nita_prev
          if (delta <= -8) { riskScore += 2; flags.push({ type: 'nita_decline', label: `NITA −${Math.abs(delta)} pts`, severity: 'high' }) }
          else if (delta <= -4) { riskScore += 1; flags.push({ type: 'nita_decline', label: `NITA −${Math.abs(delta)} pts`, severity: 'medium' }) }
        }

        // OKR faible
        if (d.okr_progress !== null && d.okr_progress < 40) { riskScore += 1; flags.push({ type: 'okr', label: `OKR ${d.okr_progress}%`, severity: 'medium' }) }

        // F360 faible
        if (d.f360_rate !== null && d.f360_rate < 40) { riskScore += 1; flags.push({ type: 'f360', label: `F360 ${d.f360_rate}%`, severity: 'medium' }) }

        const riskLevel = riskScore >= 5 ? CRITICALITY.CRITICAL
                        : riskScore >= 3 ? 'high'
                        : riskScore >= 1 ? 'medium'
                        : 'ok'

        return { ...d, riskScore, riskLevel, flags }
      })

      // Trier par risque décroissant puis PULSE ascendant
      return divisions.sort((a, b) => b.riskScore - a.riskScore || (a.pulse_cur ?? 999) - (b.pulse_cur ?? 999))
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 3 : Tendances mensuelles multi-divisions ───────────

export function useDRHTrends(months = 6) {
  const monthKeys = getLastNMonthKeys(months)

  return useQuery({
    queryKey: ['drh_trends', months],
    queryFn:  async () => {
      const { data: pulseData, error: e1 } = await supabase
        .from('v_division_monthly_summary')
        .select('division_id,division_name,month_key,avg_pulse,nb_agents')
        .in('month_key', monthKeys)
        .order('month_key', { ascending: true })

      if (e1) throw e1

      const { data: nitaData, error: e2 } = await supabase
        .from('v_division_nita_monthly')
        .select('division_id,division_name,month_key,avg_nita_composite')
        .in('month_key', monthKeys)
        .order('month_key', { ascending: true })

      if (e2) throw e2

      // Regrouper par division pour obtenir les séries temporelles
      const divSeries = {}

      ;(pulseData || []).forEach(row => {
        if (!divSeries[row.division_id]) {
          divSeries[row.division_id] = { id: row.division_id, name: row.division_name, pulse: {}, nita: {} }
        }
        divSeries[row.division_id].pulse[row.month_key] = row.avg_pulse
      })

      ;(nitaData || []).forEach(row => {
        if (!divSeries[row.division_id]) {
          divSeries[row.division_id] = { id: row.division_id, name: row.division_name, pulse: {}, nita: {} }
        }
        divSeries[row.division_id].nita[row.month_key] = row.avg_nita_composite
      })

      // Construire les séries indexées par mois pour les graphiques
      const series = Object.values(divSeries).map(div => ({
        id:   div.id,
        name: div.name,
        data: monthKeys.map(mk => ({
          month_key: mk,
          pulse: div.pulse[mk] ?? null,
          nita:  div.nita[mk]  ?? null,
        })),
      }))

      return { series, monthKeys }
    },
    staleTime: 10 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 4 : Alertes DRH (agents en déclin/anomalie/stagnation) ──

export function useDRHAlerts(maxPatterns = 25) {
  return useQuery({
    queryKey: ['drh_alerts', maxPatterns],
    queryFn:  async () => {
      const monthKeys = getLastNMonthKeys(4)

      // PULSE par agent × mois (4 derniers mois)
      const { data: pulseRows, error: e1 } = await supabase
        .from('v_user_pulse_monthly')
        .select('user_id,month_key,avg_total,avg_delivery,avg_quality')
        .in('month_key', monthKeys)
        .order('month_key', { ascending: true })

      if (e1) throw e1

      // NITA par agent × mois
      const { data: nitaRows, error: e2 } = await supabase
        .from('v_user_nita_monthly')
        .select('user_id,month_key,avg_nita_composite,avg_resilience,avg_reliability,avg_endurance')
        .in('month_key', monthKeys)
        .order('month_key', { ascending: true })

      if (e2) throw e2

      // Profils utilisateurs (nom + division + service)
      const allUserIds = [...new Set([
        ...(pulseRows || []).map(r => r.user_id),
        ...(nitaRows  || []).map(r => r.user_id),
      ])]

      let profiles = {}
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id,first_name,last_name,divisions(name),services(name)')
          .in('id', allUserIds)
          .eq('is_active', true)

        ;(usersData || []).forEach(u => { profiles[u.id] = u })
      }

      // ── Grouper PULSE par user
      const pulseBySeries = {}
      ;(pulseRows || []).forEach(r => {
        if (!pulseBySeries[r.user_id]) pulseBySeries[r.user_id] = {}
        pulseBySeries[r.user_id][r.month_key] = r.avg_total
      })

      // ── Grouper NITA par user
      const nitaBySeries = {}
      ;(nitaRows || []).forEach(r => {
        if (!nitaBySeries[r.user_id]) nitaBySeries[r.user_id] = {}
        nitaBySeries[r.user_id][r.month_key] = r.avg_nita_composite
      })

      // ── Détecter les patterns sur chaque agent
      const alerts = []

      Object.entries(pulseBySeries).forEach(([userId, byMonth]) => {
        const series = monthKeys.map(mk => byMonth[mk] ?? null).filter(v => v !== null)
        const pats = detectPatterns(series, 'PULSE')
        pats
          .filter(p => p.type !== 'progression') // on garde déclin, anomalie, stagnation
          .forEach(p => {
            const profile = profiles[userId]
            if (!profile) return
            alerts.push({
              user_id:  userId,
              name:     `${profile.first_name} ${profile.last_name}`,
              division: profile.divisions?.name || '—',
              service:  profile.services?.name  || '—',
              metric:   'PULSE',
              ...p,
            })
          })
      })

      Object.entries(nitaBySeries).forEach(([userId, byMonth]) => {
        const series = monthKeys.map(mk => byMonth[mk] ?? null).filter(v => v !== null)
        const pats = detectPatterns(series, 'NITA')
        pats
          .filter(p => p.type !== 'progression')
          .forEach(p => {
            const profile = profiles[userId]
            if (!profile) return
            alerts.push({
              user_id:  userId,
              name:     `${profile.first_name} ${profile.last_name}`,
              division: profile.divisions?.name || '—',
              service:  profile.services?.name  || '—',
              metric:   'NITA',
              ...p,
            })
          })
      })

      // Trier : anomalie > déclin > stagnation, puis sévérité
      const SEVERITY_ORDER = { anomalie: 0, baisse: 1, stagnation: 2 }
      alerts.sort((a, b) =>
        (SEVERITY_ORDER[a.type] ?? 9) - (SEVERITY_ORDER[b.type] ?? 9)
      )

      return alerts.slice(0, maxPatterns)
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 5 : Top/Flop agents NITA & PULSE ───────────────────

export function useDRHTopFlop(month = null) {
  const refMonth = month || getLastNMonthKeys(1)[0]

  return useQuery({
    queryKey: ['drh_topflop', refMonth],
    queryFn:  async () => {
      const { data: pulseRows, error: e1 } = await supabase
        .from('v_user_pulse_monthly')
        .select('user_id,avg_total,month_key')
        .eq('month_key', refMonth)
        .order('avg_total', { ascending: false })
        .limit(20)

      if (e1) throw e1

      const { data: nitaRows, error: e2 } = await supabase
        .from('v_user_nita_monthly')
        .select('user_id,avg_nita_composite,month_key')
        .eq('month_key', refMonth)
        .order('avg_nita_composite', { ascending: false })
        .limit(20)

      if (e2) throw e2

      const allIds = [...new Set([
        ...(pulseRows || []).map(r => r.user_id),
        ...(nitaRows  || []).map(r => r.user_id),
      ])]

      let profiles = {}
      if (allIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id,first_name,last_name,divisions(name),services(name)')
          .in('id', allIds)
          .eq('is_active', true)
        ;(usersData || []).forEach(u => { profiles[u.id] = u })
      }

      const enrich = (rows, scoreKey) =>
        rows
          .filter(r => profiles[r.user_id])
          .map(r => ({
            ...r,
            score: r[scoreKey],
            name:     `${profiles[r.user_id].first_name} ${profiles[r.user_id].last_name}`,
            division: profiles[r.user_id].divisions?.name || '—',
            service:  profiles[r.user_id].services?.name  || '—',
          }))

      const pulseEnriched = enrich(pulseRows || [], 'avg_total')
      const nitaEnriched  = enrich(nitaRows  || [], 'avg_nita_composite')

      return {
        pulseTop5:  pulseEnriched.slice(0, 5),
        pulseFlop5: [...pulseEnriched].sort((a, b) => a.score - b.score).slice(0, 5),
        nitaTop5:   nitaEnriched.slice(0, 5),
        nitaFlop5:  [...nitaEnriched].sort((a, b) => a.score - b.score).slice(0, 5),
      }
    },
    staleTime: 10 * 60_000,
    retry: 1,
  })
}
