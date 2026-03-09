// ============================================================
// APEX RH — src/hooks/useAnalytics.js
// Session 33 — Module Analytics Avancés & Prédictif
// Corrélation PULSE/OKR, Heatmap équipe, Comparatif services,
// Score prédictif risque de départ (A2 + A4)
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, etc.
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../utils/constants'

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Retourne les N derniers mois sous forme de clés 'YYYY-MM' (du plus ancien au plus récent)
 */
export function getLastNMonthKeys(n = 6) {
  const keys = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year  = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    keys.push(`${year}-${month}`)
  }
  return keys
}

/**
 * Libellé court d'un mois 'YYYY-MM' → 'Jan', 'Fév', etc.
 */
export function monthKeyToLabel(key) {
  if (!key) return ''
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  const label = d.toLocaleDateString('fr-FR', { month: 'short' })
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

/**
 * Libellé long 'YYYY-MM' → 'Janvier 2025'
 */
export function monthKeyToLongLabel(key) {
  if (!key) return ''
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Couleur heatmap basée sur le score PULSE (0–100)
 */
export function heatmapColor(score, alpha = 1) {
  if (score === null || score === undefined) return `rgba(30, 30, 50, ${alpha})`
  if (score >= 75) return `rgba(16, 185, 129, ${alpha})`   // vert
  if (score >= 60) return `rgba(52, 211, 153, ${alpha})`   // vert clair
  if (score >= 50) return `rgba(245, 158, 11, ${alpha})`   // orange
  if (score >= 35) return `rgba(249, 115, 22, ${alpha})`   // orange foncé
  return `rgba(239, 68, 68, ${alpha})`                      // rouge
}

/**
 * Couleur du score risque de départ (0 = aucun risque, 100 = risque maximal)
 */
export function riskColor(score) {
  if (score >= 70) return '#EF4444'   // rouge — risque élevé
  if (score >= 40) return '#F59E0B'   // orange — risque modéré
  return '#10B981'                    // vert — faible risque
}

export function riskLabel(score) {
  if (score >= 70) return 'Risque élevé'
  if (score >= 40) return 'Risque modéré'
  return 'Faible risque'
}

/**
 * Calcule le score de risque de départ (0–100) d'un utilisateur
 * Basé sur 3 signaux :
 *   1. Tendance PULSE (40 pts) — score décroissant sur 3 mois
 *   2. Engagement survey (30 pts) — score survey < seuils
 *   3. OKR completion (30 pts) — progression OKR faible
 */
export function computeDepartureRisk({ pulseTrend, surveyScore, okrProgress }) {
  let risk = 0

  // ── Signal 1 : Tendance PULSE ────────────────────────────
  const pulseScore = pulseTrend?.score_m0 ?? null
  const trendDelta = pulseTrend?.trend_delta ?? 0
  const declining  = pulseTrend?.is_consistently_declining ?? false

  if (pulseScore !== null) {
    if (pulseScore < 40)       risk += 30  // score faible
    else if (pulseScore < 55)  risk += 15  // score moyen-bas

    if (declining)             risk += 10  // 3 mois de baisse consécutive
    else if (trendDelta < -10) risk += 5   // baisse significative
  } else {
    // Pas de données PULSE → signal d'absence = risque modéré
    risk += 15
  }

  // ── Signal 2 : Engagement Survey ────────────────────────
  if (surveyScore !== null && surveyScore !== undefined) {
    if (surveyScore < 40)       risk += 30
    else if (surveyScore < 55)  risk += 20
    else if (surveyScore < 65)  risk += 10
  } else {
    // Pas de réponse survey = signal modéré
    risk += 10
  }

  // ── Signal 3 : OKR Progress ─────────────────────────────
  if (okrProgress !== null && okrProgress !== undefined) {
    if (okrProgress < 25)       risk += 30
    else if (okrProgress < 40)  risk += 20
    else if (okrProgress < 55)  risk += 10
  } else {
    risk += 5
  }

  return Math.min(100, Math.round(risk))
}

// ─── HOOK 1 : DONNÉES HEATMAP ÉQUIPE ─────────────────────────
/**
 * Scores mensuels pour tous les membres visibles (scope manager)
 * avec leur profil utilisateur (nom, service).
 * Retourne la structure prête pour la heatmap.
 *
 * @param {number} months — nombre de mois à afficher (défaut 6)
 */
export function useHeatmapData(months = 6) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'heatmap', profile?.id, months],
    queryFn: async () => {
      if (!profile?.id) return { users: [], months: [], scores: {} }

      const monthKeys = getLastNMonthKeys(months)
      const startDate = `${monthKeys[0]}-01`

      // Récupérer les scores depuis la vue
      const { data: scoreRows, error: e1 } = await supabase
        .from('v_pulse_monthly_scores')
        .select('user_id, month_key, avg_score, days_count')
        .gte('month_key', monthKeys[0])
        .lte('month_key', monthKeys[monthKeys.length - 1])

      if (e1) throw e1

      // Récupérer les utilisateurs visibles (scope du manager)
      let usersQuery = supabase
        .from('users')
        .select('id, first_name, last_name, role, service_id, services(id, name)')
        .eq('is_active', true)
        .order('first_name')

      // Scope : managers voient leur service, directeurs voient plus
      if (profile.role === ROLES.CHEF_SERVICE) {
        usersQuery = usersQuery.eq('service_id', profile.service_id)
      } else if (profile.role === ROLES.CHEF_DIVISION) {
        // Récupère tous les services de la division
        const { data: divServices } = await supabase
          .from('services')
          .select('id')
          .eq('division_id', profile.division_id)
        const ids = divServices?.map(s => s.id) || []
        if (ids.length > 0) usersQuery = usersQuery.in('service_id', ids)
      }
      // directeur et administrateur voient tout → pas de filtre

      const { data: users, error: e2 } = await usersQuery
      if (e2) throw e2

      // Construire la map scores[userId][monthKey] = score
      const scores = {}
      for (const row of (scoreRows || [])) {
        if (!scores[row.user_id]) scores[row.user_id] = {}
        scores[row.user_id][row.month_key] = row.avg_score
      }

      return {
        users:  users || [],
        months: monthKeys,
        scores,
      }
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
  })
}

// ─── HOOK 2 : CORRÉLATION PULSE ↔ OKR ────────────────────────
/**
 * Pour chaque utilisateur visible : score PULSE moyen (3 derniers mois)
 * + progression OKR moyenne. Utilisé pour le scatter plot.
 */
export function usePulseOkrCorrelation() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'pulse-okr-correlation', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      // Scores PULSE des 3 derniers mois
      const monthKeys = getLastNMonthKeys(3)

      const { data: pulseScores, error: e1 } = await supabase
        .from('v_pulse_monthly_scores')
        .select('user_id, month_key, avg_score')
        .gte('month_key', monthKeys[0])

      if (e1) throw e1

      // OKR individuels
      const { data: okrSummary, error: e2 } = await supabase
        .from('v_user_okr_summary')
        .select('user_id, avg_progress, total_objectives, completed_count')

      if (e2) throw e2

      // Utilisateurs
      let usersQuery = supabase
        .from('users')
        .select('id, first_name, last_name, role, service_id, services(id, name)')
        .eq('is_active', true)

      if (profile.role === ROLES.CHEF_SERVICE) {
        usersQuery = usersQuery.eq('service_id', profile.service_id)
      }

      const { data: users, error: e3 } = await usersQuery
      if (e3) throw e3

      // Calcul PULSE moyen par user sur 3 mois
      const pulseByUser = {}
      for (const row of (pulseScores || [])) {
        if (!pulseByUser[row.user_id]) pulseByUser[row.user_id] = []
        pulseByUser[row.user_id].push(row.avg_score)
      }

      const okrByUser = {}
      for (const row of (okrSummary || [])) {
        okrByUser[row.user_id] = row
      }

      return (users || [])
        .map(u => {
          const pulseValues = pulseByUser[u.id] || []
          const avgPulse = pulseValues.length > 0
            ? Math.round(pulseValues.reduce((a, b) => a + b, 0) / pulseValues.length)
            : null
          const okr = okrByUser[u.id]
          return {
            userId:        u.id,
            name:          `${u.first_name} ${u.last_name}`,
            service:       u.services?.name || '—',
            pulse:         avgPulse,
            okrProgress:   okr ? Math.round(okr.avg_progress) : null,
            okrTotal:      okr?.total_objectives || 0,
            okrCompleted:  okr?.completed_count || 0,
          }
        })
        .filter(u => u.pulse !== null || u.okrProgress !== null)
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
  })
}

// ─── HOOK 3 : COMPARATIF INTER-SERVICES ──────────────────────
/**
 * Score PULSE moyen des 3 derniers mois par service.
 * Réservé aux directeurs et administrateurs.
 */
export function useServiceComparison(months = 3) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'service-comparison', profile?.id, months],
    queryFn: async () => {
      if (!profile?.id) return []

      const monthKeys = getLastNMonthKeys(months)

      // Scores par service depuis la vue
      const { data: serviceScores, error: e1 } = await supabase
        .from('v_service_monthly_pulse')
        .select('service_id, month_key, avg_score, active_users')
        .gte('month_key', monthKeys[0])

      if (e1) throw e1

      // Infos services
      const { data: services, error: e2 } = await supabase
        .from('services')
        .select('id, name, division_id, divisions(name)')
        .order('name')

      if (e2) throw e2

      // Agréger par service
      const byService = {}
      for (const row of (serviceScores || [])) {
        if (!byService[row.service_id]) {
          byService[row.service_id] = { scores: [], users: 0 }
        }
        byService[row.service_id].scores.push(row.avg_score)
        byService[row.service_id].users = Math.max(byService[row.service_id].users, row.active_users)
      }

      return (services || [])
        .map(s => {
          const data = byService[s.id]
          const scores = data?.scores || []
          const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null
          return {
            serviceId:   s.id,
            name:        s.name,
            division:    s.divisions?.name || '',
            avgScore,
            activeUsers: data?.users || 0,
            hasData:     avgScore !== null,
          }
        })
        .filter(s => s.hasData)
        .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
  })
}

// ─── HOOK 4 : SCORE RISQUE DE DÉPART ─────────────────────────
/**
 * Score prédictif de risque de départ (0–100) pour chaque collaborateur.
 * Basé sur : tendance PULSE 3 mois + dernier score survey engagement + OKR progress.
 * Accès réservé aux managers et administrateurs.
 */
export function useDepartureRisk() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'departure-risk', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      // 1. Tendances PULSE 3 mois depuis la vue
      const { data: trends, error: e1 } = await supabase
        .from('v_pulse_trend_3m')
        .select('user_id, score_m0, score_m1, score_m2, trend_delta, is_consistently_declining')

      if (e1) throw e1

      // 2. OKR résumé
      const { data: okrData, error: e2 } = await supabase
        .from('v_user_okr_summary')
        .select('user_id, avg_progress, total_objectives')

      if (e2) throw e2

      // 3. Dernier score survey par user (survey_responses)
      // On récupère les réponses récentes et calcule la moyenne des scores
      const { data: surveyResponses, error: e3 } = await supabase
        .from('survey_responses')
        .select('respondent_id, scores, submitted_at')
        .not('scores', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(500)  // limité pour perf — les 500 plus récentes

      if (e3) throw e3

      // 4. Utilisateurs scope
      let usersQuery = supabase
        .from('users')
        .select('id, first_name, last_name, role, service_id, services(id, name)')
        .eq('is_active', true)
        .not('role', 'in', '(administrateur,directeur)')  // évalue seulement collaborateurs + chefs

      if (profile.role === ROLES.CHEF_SERVICE) {
        usersQuery = usersQuery.eq('service_id', profile.service_id)
      } else if (profile.role === ROLES.CHEF_DIVISION) {
        const { data: divServices } = await supabase
          .from('services')
          .select('id')
          .eq('division_id', profile.division_id)
        const ids = divServices?.map(s => s.id) || []
        if (ids.length > 0) usersQuery = usersQuery.in('service_id', ids)
      }

      const { data: users, error: e4 } = await usersQuery
      if (e4) throw e4

      // Index des données
      const trendByUser = {}
      for (const t of (trends || [])) trendByUser[t.user_id] = t

      const okrByUser = {}
      for (const o of (okrData || [])) okrByUser[o.user_id] = o

      // Score survey par user — prend la réponse la plus récente
      const surveyByUser = {}
      for (const r of (surveyResponses || [])) {
        if (!surveyByUser[r.respondent_id] && r.scores) {
          const vals = Object.values(r.scores).filter(v => typeof v === 'number')
          if (vals.length > 0) {
            surveyByUser[r.respondent_id] = Math.round(
              vals.reduce((a, b) => a + b, 0) / vals.length
            )
          }
        }
      }

      // Calcul du score de risque pour chaque utilisateur
      return (users || []).map(u => {
        const pulseTrend  = trendByUser[u.id] || null
        const okr         = okrByUser[u.id]
        const surveyScore = surveyByUser[u.id] ?? null

        const riskScore = computeDepartureRisk({
          pulseTrend,
          surveyScore,
          okrProgress: okr?.avg_progress ?? null,
        })

        return {
          userId:       u.id,
          name:         `${u.first_name} ${u.last_name}`,
          service:      u.services?.name || '—',
          role:         u.role,
          riskScore,
          pulseScore:   pulseTrend?.score_m0 ?? null,
          pulseTrend:   pulseTrend?.trend_delta ?? null,
          declining:    pulseTrend?.is_consistently_declining ?? false,
          surveyScore,
          okrProgress:  okr ? Math.round(okr.avg_progress) : null,
          okrTotal:     okr?.total_objectives || 0,
        }
      }).sort((a, b) => b.riskScore - a.riskScore)
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
  })
}

// ─── HOOK 5 : KPIs GLOBAUX ────────────────────────────────────
/**
 * Indicateurs globaux : score moyen équipe, taux de soumission,
 * progression OKR, score engagement — pour le bandeau de résumé
 */
export function useAnalyticsKpis() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'kpis', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null

      const monthKeys = getLastNMonthKeys(3)

      // PULSE moyen du mois courant (toute équipe visible)
      const { data: pulseData } = await supabase
        .from('v_pulse_monthly_scores')
        .select('user_id, avg_score, days_count')
        .eq('month_key', monthKeys[monthKeys.length - 1])

      // OKR global
      const { data: okrData } = await supabase
        .from('v_user_okr_summary')
        .select('avg_progress, total_objectives')

      // Survey le plus récent (dernier survey actif ou closed)
      const { data: lastSurvey } = await supabase
        .from('engagement_surveys')
        .select('id, title')
        .in('status', ['closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let avgSurvey = null
      if (lastSurvey?.id) {
        const { data: responses } = await supabase
          .from('survey_responses')
          .select('scores')
          .eq('survey_id', lastSurvey.id)
          .not('scores', 'is', null)

        if (responses?.length > 0) {
          const allValues = responses.flatMap(r =>
            Object.values(r.scores || {}).filter(v => typeof v === 'number')
          )
          if (allValues.length > 0) {
            avgSurvey = Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length)
          }
        }
      }

      const pulseValues = (pulseData || []).map(r => r.avg_score).filter(v => v !== null)
      const avgPulse = pulseValues.length > 0
        ? Math.round(pulseValues.reduce((a, b) => a + b, 0) / pulseValues.length)
        : null

      const okrValues = (okrData || []).map(r => r.avg_progress).filter(v => v !== null)
      const avgOkr = okrValues.length > 0
        ? Math.round(okrValues.reduce((a, b) => a + b, 0) / okrValues.length)
        : null

      return {
        avgPulse,
        avgOkr,
        avgSurvey,
        pulseUsersCount: pulseData?.length || 0,
        okrObjectivesCount: (okrData || []).reduce((sum, r) => sum + (r.total_objectives || 0), 0),
      }
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
  })
}
