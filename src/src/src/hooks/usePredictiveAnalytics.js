// ============================================================
// APEX RH — src/hooks/usePredictiveAnalytics.js
// Session 46 — Analytics Prédictifs Avancés
// Corrélations NITA ↔ PULSE ↔ F360, tendances multi-dim,
// détection automatique de patterns (baisse, progression, anomalie)
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, useIPR.js
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getLastNMonthKeys } from './useAnalytics'

// ─── CONSTANTES ──────────────────────────────────────────────

export const NITA_DIMS = [
  { key: 'resilience_score',  label: 'Résilience',  color: '#F59E0B', short: 'Rés.' },
  { key: 'reliability_score', label: 'Fiabilité',   color: '#10B981', short: 'Fiab.' },
  { key: 'endurance_score',   label: 'Endurance',   color: '#3B82F6', short: 'End.' },
]

export const PULSE_DIMS = [
  { key: 'delivery_score', label: 'Delivery',  color: '#8B5CF6' },
  { key: 'quality_score',  label: 'Qualité',   color: '#EC4899' },
  { key: 'total',          label: 'PULSE Total', color: '#4F46E5' },
]

export const F360_DIMS = [
  { key: 'quality',       label: 'Qualité travail', color: '#06B6D4' },
  { key: 'deadlines',     label: 'Délais',          color: '#84CC16' },
  { key: 'communication', label: 'Communication',   color: '#F97316' },
  { key: 'teamwork',      label: 'Esprit équipe',   color: '#A78BFA' },
  { key: 'initiative',    label: 'Initiative',      color: '#FB7185' },
]

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Calcule la corrélation de Pearson entre deux séries numériques
 * Retourne un coefficient entre -1 et 1 (ou null si insuffisant)
 */
export function pearsonCorrelation(xArr, yArr) {
  const pairs = xArr
    .map((x, i) => [x, yArr[i]])
    .filter(([x, y]) => x != null && y != null)

  const n = pairs.length
  if (n < 3) return null

  const sumX  = pairs.reduce((s, [x]) => s + x, 0)
  const sumY  = pairs.reduce((s, [, y]) => s + y, 0)
  const sumXY = pairs.reduce((s, [x, y]) => s + x * y, 0)
  const sumX2 = pairs.reduce((s, [x]) => s + x * x, 0)
  const sumY2 = pairs.reduce((s, [, y]) => s + y * y, 0)

  const num = n * sumXY - sumX * sumY
  const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))

  if (den === 0) return null
  return Math.round((num / den) * 100) / 100
}

/**
 * Libellé de la corrélation de Pearson
 */
export function correlationLabel(r) {
  if (r === null) return { label: '—', color: '#6B7280', strength: 0 }
  const abs = Math.abs(r)
  if (abs >= 0.7)  return { label: r > 0 ? 'Forte ↑' : 'Forte ↓',    color: r > 0 ? '#10B981' : '#EF4444', strength: 3 }
  if (abs >= 0.4)  return { label: r > 0 ? 'Modérée ↑' : 'Modérée ↓', color: r > 0 ? '#34D399' : '#F87171', strength: 2 }
  if (abs >= 0.2)  return { label: r > 0 ? 'Faible ↑' : 'Faible ↓',   color: r > 0 ? '#6EE7B7' : '#FCA5A5', strength: 1 }
  return { label: 'Neutre', color: '#9CA3AF', strength: 0 }
}

/**
 * Détecte les patterns dans une série temporelle (score 0-100)
 * Retourne un tableau de patterns détectés
 * Algorithme : Z-score, régression linéaire, détection consécutive
 */
export function detectPatterns(series, label = '') {
  const patterns = []
  if (!series || series.length < 4) return patterns

  const values = series.map(p => p.value).filter(v => v != null)
  if (values.length < 4) return patterns

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)

  // ── Pattern 1 : Tendance baisse progressive ───────────────
  const last4 = values.slice(-4)
  const isDecline = last4.every((v, i) => i === 0 || v < last4[i - 1])
  const declineAmp = last4[0] - last4[last4.length - 1]
  if (isDecline && declineAmp >= 8) {
    patterns.push({
      type: 'decline',
      label: `Baisse progressive ${label}`,
      detail: `−${declineAmp.toFixed(0)} pts sur ${last4.length} périodes`,
      color: '#EF4444',
      icon: 'trending_down',
      severity: declineAmp >= 15 ? 'high' : 'medium',
    })
  }

  // ── Pattern 2 : Progression continue ─────────────────────
  const isProgress = last4.every((v, i) => i === 0 || v > last4[i - 1])
  const progressAmp = last4[last4.length - 1] - last4[0]
  if (isProgress && progressAmp >= 8) {
    patterns.push({
      type: 'progress',
      label: `Progression ${label}`,
      detail: `+${progressAmp.toFixed(0)} pts sur ${last4.length} périodes`,
      color: '#10B981',
      icon: 'trending_up',
      severity: 'positive',
    })
  }

  // ── Pattern 3 : Anomalie (Z-score > 2) ───────────────────
  const lastVal = values[values.length - 1]
  if (std > 0) {
    const z = Math.abs((lastVal - mean) / std)
    if (z > 1.8) {
      const isHigh = lastVal > mean
      patterns.push({
        type: 'anomaly',
        label: `Anomalie ${label}`,
        detail: `Score ${isHigh ? 'inhabituellement élevé' : 'inhabituellement bas'} : ${lastVal.toFixed(0)}/100 (moy. ${mean.toFixed(0)})`,
        color: isHigh ? '#8B5CF6' : '#F59E0B',
        icon: 'alert',
        severity: isHigh ? 'info' : 'warning',
      })
    }
  }

  // ── Pattern 4 : Stagnation (écart-type faible) ───────────
  if (std < 3 && mean < 55 && values.length >= 5) {
    patterns.push({
      type: 'stagnation',
      label: `Stagnation ${label}`,
      detail: `Score stable mais faible : ${mean.toFixed(0)}/100 (±${std.toFixed(1)})`,
      color: '#6B7280',
      icon: 'minus',
      severity: 'medium',
    })
  }

  // ── Pattern 5 : Pic isolé ─────────────────────────────────
  if (values.length >= 5 && std > 0) {
    const prev  = values.slice(-5, -1)
    const prevMean = prev.reduce((a, b) => a + b, 0) / prev.length
    const diff  = Math.abs(lastVal - prevMean)
    if (diff > 2 * std && diff > 12) {
      patterns.push({
        type: 'spike',
        label: `Pic isolé ${label}`,
        detail: `Variation soudaine : ${diff.toFixed(0)} pts vs moyenne récente`,
        color: '#A78BFA',
        icon: 'zap',
        severity: 'info',
      })
    }
  }

  return patterns
}

// ─── HOOK 1 : DONNÉES CORRÉLATION ────────────────────────────
/**
 * Récupère les scores NITA + PULSE + F360 agrégés par mois et par user
 * pour calculer les corrélations inter-dimensions.
 *
 * Retourne pour chaque utilisateur :
 *   { userId, name, months: [{ month, nitaAvg, pulse, f360 }] }
 */
export function useCorrelationData(months = 6) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['predictive', 'correlation', profile?.id, months],
    queryFn: async () => {
      if (!profile?.id) return { points: [], byDim: {} }

      const monthKeys = getLastNMonthKeys(months)
      const fromDate  = `${monthKeys[0]}-01`

      // ── NITA : moyennes mensuelles par user ───────────────
      const { data: nitaRaw } = await supabase
        .from('agent_activity_logs')
        .select('user_id, date, resilience_score, reliability_score, endurance_score')
        .gte('date', fromDate)
        .order('date', { ascending: true })

      // ── PULSE : scores mensuels par user ──────────────────
      const { data: pulseRaw } = await supabase
        .from('performance_scores')
        .select('user_id, score_date, score_delivery, score_quality, score_total')
        .gte('score_date', fromDate)
        .order('score_date', { ascending: true })

      // ── F360 : réponses par request ───────────────────────
      const { data: f360Raw } = await supabase
        .from('feedback_responses')
        .select(`
          question_key, score,
          feedback_requests!inner(evaluated_id, created_at, status)
        `)
        .eq('feedback_requests.status', 'completed')
        .gte('feedback_requests.created_at', fromDate)

      // ── Utilisateurs scope ────────────────────────────────
      let usersQ = supabase
        .from('users')
        .select('id, first_name, last_name, service_id, services(name)')
        .eq('is_active', true)

      if (profile.role === 'chef_service' && profile.service_id)
        usersQ = usersQ.eq('service_id', profile.service_id)
      else if (profile.role === 'chef_division' && profile.division_id) {
        const { data: svcs } = await supabase
          .from('services').select('id').eq('division_id', profile.division_id)
        const ids = svcs?.map(s => s.id) || []
        if (ids.length) usersQ = usersQ.in('service_id', ids)
      }

      const { data: users } = await usersQ

      // ── Agrégation NITA par user×mois ────────────────────
      const nitaByUserMonth = {}
      for (const row of nitaRaw || []) {
        const m = row.date?.slice(0, 7)
        if (!m) continue
        const k = `${row.user_id}__${m}`
        if (!nitaByUserMonth[k]) nitaByUserMonth[k] = { res: [], rel: [], end: [] }
        if (row.resilience_score  != null) nitaByUserMonth[k].res.push(row.resilience_score)
        if (row.reliability_score != null) nitaByUserMonth[k].rel.push(row.reliability_score)
        if (row.endurance_score   != null) nitaByUserMonth[k].end.push(row.endurance_score)
      }

      // ── Agrégation PULSE par user×mois ───────────────────
      const pulseByUserMonth = {}
      for (const row of pulseRaw || []) {
        const m = row.score_date?.slice(0, 7)
        if (!m) continue
        const k = `${row.user_id}__${m}`
        if (!pulseByUserMonth[k]) pulseByUserMonth[k] = { del: [], qual: [], tot: [] }
        if (row.score_delivery != null) pulseByUserMonth[k].del.push(row.score_delivery)
        if (row.score_quality  != null) pulseByUserMonth[k].qual.push(row.score_quality)
        if (row.score_total    != null) pulseByUserMonth[k].tot.push(row.score_total)
      }

      // ── Agrégation F360 par user ──────────────────────────
      const f360ByUser = {}
      for (const row of f360Raw || []) {
        const uid = row.feedback_requests?.evaluated_id
        if (!uid || row.score == null) continue
        if (!f360ByUser[uid]) f360ByUser[uid] = {}
        if (!f360ByUser[uid][row.question_key]) f360ByUser[uid][row.question_key] = []
        f360ByUser[uid][row.question_key].push(row.score)
      }

      const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null

      // ── Construire les points de corrélation ──────────────
      const points = []

      for (const u of users || []) {
        for (const m of monthKeys) {
          const k = `${u.id}__${m}`
          const nita = nitaByUserMonth[k]
          const pulse = pulseByUserMonth[k]

          const nitaAvg = nita
            ? avg([...nita.res, ...nita.rel, ...nita.end])
            : null
          const nitaRes = nita ? avg(nita.res) : null
          const nitaRel = nita ? avg(nita.rel) : null
          const nitaEnd = nita ? avg(nita.end) : null
          const pulseTotal = pulse ? avg(pulse.tot) : null
          const pulseDelivery = pulse ? avg(pulse.del) : null
          const pulseQuality  = pulse ? avg(pulse.qual) : null

          const f360 = f360ByUser[u.id]
          const f360avg = f360
            ? avg(Object.values(f360).flat().map(v => v * 20)) // scale 1-5 → 0-100
            : null

          if (nitaAvg !== null || pulseTotal !== null || f360avg !== null) {
            points.push({
              userId:  u.id,
              name:    `${u.first_name} ${u.last_name}`,
              service: u.services?.name || '—',
              month:   m,
              nitaAvg, nitaRes, nitaRel, nitaEnd,
              pulseTotal, pulseDelivery, pulseQuality,
              f360avg,
            })
          }
        }
      }

      // ── Corrélations globales ─────────────────────────────
      const pairs = (xKey, yKey) => {
        const xs = [], ys = []
        for (const p of points) {
          if (p[xKey] != null && p[yKey] != null) {
            xs.push(p[xKey]); ys.push(p[yKey])
          }
        }
        return { r: pearsonCorrelation(xs, ys), n: xs.length }
      }

      const correlations = {
        nitaVsPulse:     pairs('nitaAvg',  'pulseTotal'),
        nitaVsF360:      pairs('nitaAvg',  'f360avg'),
        pulseVsF360:     pairs('pulseTotal','f360avg'),
        resVsPulse:      pairs('nitaRes',  'pulseTotal'),
        relVsPulse:      pairs('nitaRel',  'pulseTotal'),
        endVsPulse:      pairs('nitaEnd',  'pulseTotal'),
        resVsF360:       pairs('nitaRes',  'f360avg'),
        relVsF360:       pairs('nitaRel',  'f360avg'),
      }

      return { points, correlations, monthKeys }
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
  })
}

// ─── HOOK 2 : DONNÉES TENDANCES ──────────────────────────────
/**
 * Séries temporelles NITA + PULSE mensuelles pour l'utilisateur courant
 * ou la moyenne équipe (managers). Utilisé pour les graphiques tendances.
 */
export function useTrendData(months = 6) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['predictive', 'trends', profile?.id, months],
    queryFn: async () => {
      if (!profile?.id) return { series: [], monthKeys: [] }

      const monthKeys = getLastNMonthKeys(months)
      const fromDate  = `${monthKeys[0]}-01`

      // NITA perso
      const { data: nitaRaw } = await supabase
        .from('agent_activity_logs')
        .select('date, resilience_score, reliability_score, endurance_score')
        .eq('user_id', profile.id)
        .gte('date', fromDate)
        .order('date', { ascending: true })

      // PULSE perso
      const { data: pulseRaw } = await supabase
        .from('performance_scores')
        .select('score_date, score_delivery, score_quality, score_total')
        .eq('user_id', profile.id)
        .gte('score_date', fromDate)
        .order('score_date', { ascending: true })

      // Agréger par mois
      const byMonth = {}
      for (const m of monthKeys) {
        byMonth[m] = {
          res: [], rel: [], end: [],
          del: [], qual: [], tot: [],
        }
      }

      for (const row of nitaRaw || []) {
        const m = row.date?.slice(0, 7)
        if (!byMonth[m]) continue
        if (row.resilience_score  != null) byMonth[m].res.push(row.resilience_score)
        if (row.reliability_score != null) byMonth[m].rel.push(row.reliability_score)
        if (row.endurance_score   != null) byMonth[m].end.push(row.endurance_score)
      }

      for (const row of pulseRaw || []) {
        const m = row.score_date?.slice(0, 7)
        if (!byMonth[m]) continue
        if (row.score_delivery != null) byMonth[m].del.push(row.score_delivery)
        if (row.score_quality  != null) byMonth[m].qual.push(row.score_quality)
        if (row.score_total    != null) byMonth[m].tot.push(row.score_total)
      }

      const avgOf = arr => arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null

      // Construire les séries
      const seriesData = monthKeys.map(m => ({
        month: m,
        resilience:  avgOf(byMonth[m].res),
        reliability: avgOf(byMonth[m].rel),
        endurance:   avgOf(byMonth[m].end),
        pulse:       avgOf(byMonth[m].tot),
        delivery:    avgOf(byMonth[m].del),
        quality:     avgOf(byMonth[m].qual),
      }))

      // Patterns par dimension
      const makePatternInput = key => seriesData.map(p => ({
        month: p.month, value: p[key],
      }))

      const patterns = [
        ...detectPatterns(makePatternInput('resilience'),  'Résilience'),
        ...detectPatterns(makePatternInput('reliability'), 'Fiabilité'),
        ...detectPatterns(makePatternInput('endurance'),   'Endurance'),
        ...detectPatterns(makePatternInput('pulse'),       'PULSE'),
      ]

      return { seriesData, monthKeys, patterns }
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
  })
}

// ─── HOOK 3 : TENDANCES ÉQUIPE (managers) ────────────────────
/**
 * Moyenne des scores NITA + PULSE pour l'équipe visible du manager
 * sur N mois. Retourne les mêmes séries que useTrendData mais agrégées.
 */
export function useTeamTrendData(months = 6) {
  const { profile } = useAuth()
  const isManager = ['chef_service','chef_division','directeur','administrateur']
    .includes(profile?.role)

  return useQuery({
    queryKey: ['predictive', 'team-trends', profile?.id, months],
    queryFn: async () => {
      if (!profile?.id || !isManager) return { seriesData: [], monthKeys: [] }

      const monthKeys = getLastNMonthKeys(months)
      const fromDate  = `${monthKeys[0]}-01`

      // NITA équipe
      let nitaQ = supabase
        .from('agent_activity_logs')
        .select('user_id, date, resilience_score, reliability_score, endurance_score, users!inner(service_id, division_id)')
        .gte('date', fromDate)

      if (profile.role === 'chef_service' && profile.service_id)
        nitaQ = nitaQ.eq('users.service_id', profile.service_id)
      else if (profile.role === 'chef_division' && profile.division_id)
        nitaQ = nitaQ.eq('users.division_id', profile.division_id)

      const { data: nitaRaw } = await nitaQ.order('date', { ascending: true })

      // PULSE équipe
      let pulseQ = supabase
        .from('performance_scores')
        .select('user_id, score_date, score_delivery, score_quality, score_total, users!inner(service_id, division_id)')
        .gte('score_date', fromDate)

      if (profile.role === 'chef_service' && profile.service_id)
        pulseQ = pulseQ.eq('users.service_id', profile.service_id)
      else if (profile.role === 'chef_division' && profile.division_id)
        pulseQ = pulseQ.eq('users.division_id', profile.division_id)

      const { data: pulseRaw } = await pulseQ.order('score_date', { ascending: true })

      // Agréger par mois (tous users)
      const byMonth = {}
      for (const m of monthKeys) {
        byMonth[m] = { res: [], rel: [], end: [], del: [], qual: [], tot: [] }
      }

      for (const row of nitaRaw || []) {
        const m = row.date?.slice(0, 7)
        if (!byMonth[m]) continue
        if (row.resilience_score  != null) byMonth[m].res.push(row.resilience_score)
        if (row.reliability_score != null) byMonth[m].rel.push(row.reliability_score)
        if (row.endurance_score   != null) byMonth[m].end.push(row.endurance_score)
      }

      for (const row of pulseRaw || []) {
        const m = row.score_date?.slice(0, 7)
        if (!byMonth[m]) continue
        if (row.score_delivery != null) byMonth[m].del.push(row.score_delivery)
        if (row.score_quality  != null) byMonth[m].qual.push(row.score_quality)
        if (row.score_total    != null) byMonth[m].tot.push(row.score_total)
      }

      const avgOf = arr => arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null

      const seriesData = monthKeys.map(m => ({
        month: m,
        resilience:  avgOf(byMonth[m].res),
        reliability: avgOf(byMonth[m].rel),
        endurance:   avgOf(byMonth[m].end),
        pulse:       avgOf(byMonth[m].tot),
        delivery:    avgOf(byMonth[m].del),
        quality:     avgOf(byMonth[m].qual),
      }))

      const makePatternInput = key => seriesData.map(p => ({ month: p.month, value: p[key] }))
      const patterns = [
        ...detectPatterns(makePatternInput('resilience'),  'Résilience équipe'),
        ...detectPatterns(makePatternInput('reliability'), 'Fiabilité équipe'),
        ...detectPatterns(makePatternInput('pulse'),       'PULSE équipe'),
      ]

      return { seriesData, monthKeys, patterns }
    },
    enabled: !!profile?.id && isManager,
    staleTime: 5 * 60_000,
  })
}

// ─── HOOK 4 : PATTERNS PERSONNELS ────────────────────────────
/**
 * Détecte les patterns sur les 30 derniers jours (données quotidiennes).
 * Plus granulaire que useTrendData (qui est mensuel).
 */
export function useDailyPatterns(days = 30) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['predictive', 'daily-patterns', profile?.id, days],
    queryFn: async () => {
      if (!profile?.id) return []

      const from = new Date()
      from.setDate(from.getDate() - days)
      const fromStr = from.toISOString().split('T')[0]

      const [{ data: nitaRaw }, { data: pulseRaw }] = await Promise.all([
        supabase
          .from('agent_activity_logs')
          .select('date, resilience_score, reliability_score, endurance_score')
          .eq('user_id', profile.id)
          .gte('date', fromStr)
          .order('date', { ascending: true }),
        supabase
          .from('performance_scores')
          .select('score_date, score_total')
          .eq('user_id', profile.id)
          .gte('score_date', fromStr)
          .order('score_date', { ascending: true }),
      ])

      const allPatterns = [
        ...detectPatterns(
          (nitaRaw || []).map(r => ({ value: r.resilience_score })), 'Résilience'
        ),
        ...detectPatterns(
          (nitaRaw || []).map(r => ({ value: r.reliability_score })), 'Fiabilité'
        ),
        ...detectPatterns(
          (nitaRaw || []).map(r => ({ value: r.endurance_score })), 'Endurance'
        ),
        ...detectPatterns(
          (pulseRaw || []).map(r => ({ value: r.score_total })), 'PULSE'
        ),
      ]

      return allPatterns
    },
    enabled: !!profile?.id,
    staleTime: 10 * 60_000,
  })
}
