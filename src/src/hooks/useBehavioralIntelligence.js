// ============================================================
// APEX RH — src/hooks/useBehavioralIntelligence.js
// Session 54 — Behavioral Intelligence Engine
//
// Hooks exportés :
//   useAttritionRisk(filters)       — liste collaborateurs + scores risque
//   useMyAttritionRisk()            — score risque du user connecté
//   useAttritionStats()             — stats globales organisation
//   useDivisionAttritionHeatmap()   — données heatmap par division
//   useCareerPredictions(userId)    — trajectoire + matching postes
//   useMyCareerPrediction()         — prédiction du user connecté
//   useBehavioralAlerts(filters)    — alertes équipe pour managers
//   useMyBehavioralAlerts()         — alertes de l'utilisateur courant
//   useAcknowledgeAlert()           — mutation dismiss alerte
//   useMarkAlertRead()              — mutation marquer lu
//   useRefreshBehavioralScores()    — déclencher recalcul manuel
//
// Constantes :
//   RISK_CONFIG       — couleurs/labels par niveau de risque
//   TREND_CONFIG      — config tendances
//   TRAJECTORY_CONFIG — config trajectoires carrière
//   ALERT_TYPE_CONFIG — config types d'alertes
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const RISK_CONFIG = {
  low: {
    label: 'Faible',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    text: '#6EE7B7',
    icon: '🟢',
    description: 'Collaborateur stable, pas d\'action requise.',
  },
  medium: {
    label: 'Modéré',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    text: '#FCD34D',
    icon: '🟡',
    description: 'Surveiller l\'évolution. Entretien recommandé.',
  },
  high: {
    label: 'Élevé',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.25)',
    text: '#FDBA74',
    icon: '🟠',
    description: 'Action managériale requise dans les 30 jours.',
  },
  critical: {
    label: 'Critique',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    text: '#FCA5A5',
    icon: '🔴',
    description: 'Intervention urgente — risque départ imminent.',
  },
}

export const TREND_CONFIG = {
  improving:       { label: 'En amélioration', color: '#10B981', icon: '↗', arrow: '↑' },
  stable:          { label: 'Stable',          color: '#6B7280', icon: '→', arrow: '→' },
  declining:       { label: 'En déclin',       color: '#F59E0B', icon: '↘', arrow: '↓' },
  critical_decline:{ label: 'Chute critique',  color: '#EF4444', icon: '↓↓', arrow: '⬇' },
}

export const TRAJECTORY_CONFIG = {
  'Potentiel Managérial':    { color: '#8B5CF6', icon: '🚀', description: 'Aptitudes leadership confirmées' },
  'Spécialiste Expert':      { color: '#3B82F6', icon: '🎯', description: 'Excellence technique reconnue' },
  'Socle Opérationnel':      { color: '#6B7280', icon: '⚙️', description: 'Fiabilité et constance' },
  'Évolution Chef de Division': { color: '#F59E0B', icon: '📈', description: 'Prêt pour plus de responsabilités' },
  'Évolution Directeur':     { color: '#EC4899', icon: '⭐', description: 'Profil stratégique en développement' },
  'Leadership Stratégique':  { color: '#C9A227', icon: '👑', description: 'Vision et influence organisationnelle' },
}

export const ALERT_TYPE_CONFIG = {
  attrition_risk: {
    label: 'Risque de départ',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.1)',
    icon: '🚨',
  },
  performance_decline: {
    label: 'Déclin performance',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.1)',
    icon: '📉',
  },
  okr_stagnation: {
    label: 'OKR en stagnation',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    icon: '⏸️',
  },
  feedback_gap: {
    label: 'Absence de feedback',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.1)',
    icon: '💬',
  },
  activity_drop: {
    label: 'Baisse d\'activité',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.1)',
    icon: '📊',
  },
  career_plateau: {
    label: 'Plateau carrière',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.1)',
    icon: '🧊',
  },
}

// ─── HELPERS ─────────────────────────────────────────────────

export function getRiskConfig(level) {
  return RISK_CONFIG[level] || RISK_CONFIG.low
}

export function getTrendConfig(direction) {
  return TREND_CONFIG[direction] || TREND_CONFIG.stable
}

export function getTrajectoryConfig(label) {
  return TRAJECTORY_CONFIG[label] || { color: '#6B7280', icon: '➡️', description: '' }
}

/**
 * Calcule le score d'attrition côté client à partir des données disponibles
 * Utilisé pour un aperçu rapide avant que le SQL ait recalculé
 */
export function computeClientRiskScore({ pulseTrend = 0, f360 = 0, okrProgress = 0, seniority = 365, nitaScore = 0 }) {
  const fPulse    = Math.min(100, Math.max(0, pulseTrend * 5))
  const fFeedback = Math.max(0, 100 - f360 * 20)
  const fOkr      = Math.max(0, 100 - okrProgress)
  const fSeniority = seniority < 180 ? 90 : seniority < 365 ? 70 : seniority < 730 ? 50 : seniority < 1825 ? 20 : 5
  const fActivity  = Math.max(0, 100 - nitaScore * 10)
  const total = fPulse*0.30 + fFeedback*0.20 + fOkr*0.20 + fSeniority*0.15 + fActivity*0.15
  return Math.round(Math.min(100, Math.max(0, total)))
}

// ─── HOOK 1 : Liste complète des risques d'attrition ─────────
export function useAttritionRisk(filters = {}) {
  return useQuery({
    queryKey: ['attrition_risk', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_attrition_risk')
        .select('*')
        .order('risk_score', { ascending: false })

      if (filters.division_id)   q = q.eq('division_id', filters.division_id)
      if (filters.service_id)    q = q.eq('service_id',  filters.service_id)
      if (filters.risk_level)    q = q.eq('risk_level',  filters.risk_level)
      if (filters.min_score)     q = q.gte('risk_score', filters.min_score)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 2 : Score d'attrition du user connecté ─────────────
export function useMyAttritionRisk() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['attrition_risk', 'me', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_attrition_risk')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 3 : Stats globales organisation ────────────────────
export function useAttritionStats() {
  const { data: all = [], ...rest } = useAttritionRisk()

  const stats = {
    total:    all.length,
    low:      all.filter(u => u.risk_level === 'low').length,
    medium:   all.filter(u => u.risk_level === 'medium').length,
    high:     all.filter(u => u.risk_level === 'high').length,
    critical: all.filter(u => u.risk_level === 'critical').length,
    avgScore: all.length
      ? Math.round(all.reduce((s, u) => s + (u.risk_score || 0), 0) / all.length)
      : 0,
    topRisk:  all.slice(0, 5),
    improving: all.filter(u => u.trend_direction === 'improving').length,
    declining: all.filter(u => u.trend_direction === 'declining' || u.trend_direction === 'critical_decline').length,
  }

  return { ...rest, stats }
}

// ─── HOOK 4 : Heatmap par division ───────────────────────────
export function useDivisionAttritionHeatmap() {
  const { data: all = [], ...rest } = useAttritionRisk()

  const byDivision = {}
  all.forEach(u => {
    const key  = u.division_id || 'unknown'
    const name = u.division_name || 'Sans division'
    if (!byDivision[key]) {
      byDivision[key] = {
        division_id:   key,
        division_name: name,
        users:         [],
        low: 0, medium: 0, high: 0, critical: 0,
        avgScore: 0,
      }
    }
    byDivision[key].users.push(u)
    byDivision[key][u.risk_level]++
  })

  const divisions = Object.values(byDivision).map(div => ({
    ...div,
    avgScore: div.users.length
      ? Math.round(div.users.reduce((s, u) => s + (u.risk_score || 0), 0) / div.users.length)
      : 0,
    riskRatio: div.users.length
      ? Math.round(((div.high + div.critical) / div.users.length) * 100)
      : 0,
  })).sort((a, b) => b.avgScore - a.avgScore)

  return { ...rest, divisions }
}

// ─── HOOK 5 : Prédiction carrière d'un user ──────────────────
export function useCareerPredictions(userId) {
  return useQuery({
    queryKey: ['career_predictions', userId],
    enabled: !!userId,
    queryFn: async () => {
      // Prédiction
      const { data: pred, error: e1 } = await supabase
        .from('career_predictions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (e1 && e1.code !== 'PGRST116') throw e1

      // Postes clés matchés (même division)
      const { data: user } = await supabase
        .from('users')
        .select('division_id, direction_id, role')
        .eq('id', userId)
        .single()

      let positions = []
      if (user) {
        const { data: kp } = await supabase
          .from('key_positions')
          .select(`
            id, title, criticality_level, vacancy_horizon_months,
            divisions(name), directions(name)
          `)
          .eq('is_active', true)
          .or(`division_id.eq.${user.division_id || '00000000-0000-0000-0000-000000000000'},direction_id.eq.${user.direction_id || '00000000-0000-0000-0000-000000000000'}`)
          .limit(5)

        positions = kp || []
      }

      return {
        prediction: pred || null,
        matchedPositions: positions,
        user: user || null,
      }
    },
    staleTime: 10 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 6 : Ma prédiction carrière ─────────────────────────
export function useMyCareerPrediction() {
  const { profile } = useAuth()
  return useCareerPredictions(profile?.id)
}

// ─── HOOK 7 : Alertes comportementales ───────────────────────
export function useBehavioralAlerts(filters = {}) {
  const { profile, isAdmin, isDirecteur, isChefDivision, isChefService } = useAuth()
  const isManager = isAdmin || isDirecteur || isChefDivision || isChefService

  return useQuery({
    queryKey: ['behavioral_alerts', filters, profile?.id],
    enabled: !!profile?.id && isManager,
    queryFn: async () => {
      let q = supabase
        .from('behavioral_alerts')
        .select(`
          *,
          user:users!behavioral_alerts_user_id_fkey(
            id, first_name, last_name, role,
            divisions(name), services(name)
          )
        `)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false })

      if (filters.severity)   q = q.eq('severity',   filters.severity)
      if (filters.alert_type) q = q.eq('alert_type', filters.alert_type)
      if (filters.unread_only) q = q.eq('is_read', false)
      if (filters.limit)      q = q.limit(filters.limit)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 8 : Mes alertes (vue collaborateur) ─────────────────
export function useMyBehavioralAlerts() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['behavioral_alerts', 'me', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('behavioral_alerts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 9 : Acquitter une alerte ───────────────────────────
export function useAcknowledgeAlert() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (alertId) => {
      const { error } = await supabase
        .from('behavioral_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: profile?.id,
        })
        .eq('id', alertId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['behavioral_alerts'] })
    },
  })
}

// ─── HOOK 10 : Marquer comme lu ──────────────────────────────
export function useMarkAlertRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (alertId) => {
      const { error } = await supabase
        .from('behavioral_alerts')
        .update({ is_read: true })
        .eq('id', alertId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['behavioral_alerts'] })
    },
  })
}

// ─── HOOK 11 : Déclencher recalcul manuel ────────────────────
export function useRefreshBehavioralScores() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_behavioral_scores')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attrition_risk'] })
      qc.invalidateQueries({ queryKey: ['career_predictions'] })
      qc.invalidateQueries({ queryKey: ['behavioral_alerts'] })
    },
  })
}

// ─── HOOK 12 : Données brutes d'un user pour diagnostic ──────
export function useUserBehavioralProfile(userId) {
  return useQuery({
    queryKey: ['behavioral_profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [riskRes, predRes, alertsRes] = await Promise.all([
        supabase
          .from('attrition_risk_scores')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('career_predictions')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('behavioral_alerts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      return {
        risk: riskRes.data || null,
        prediction: predRes.data || null,
        alerts: alertsRes.data || [],
      }
    },
    staleTime: 3 * 60_000,
    retry: 1,
  })
}
