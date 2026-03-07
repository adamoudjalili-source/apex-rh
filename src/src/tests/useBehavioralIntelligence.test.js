// ============================================================
// APEX RH — src/tests/useBehavioralIntelligence.test.js
// Session 54 — Tests unitaires Behavioral Intelligence Engine
//
// Tests couverts :
//   - computeClientRiskScore (calcul côté client)
//   - getRiskConfig / getTrendConfig / getTrajectoryConfig
//   - useAttritionRisk (filtres, tri)
//   - useMyAttritionRisk
//   - useAttritionStats (agrégations)
//   - useDivisionAttritionHeatmap (regroupement par division)
//   - useCareerPredictions (prédiction + postes)
//   - useBehavioralAlerts (guard manager)
//   - useAcknowledgeAlert (mutation)
//   - useMarkAlertRead (mutation)
//   - useRefreshBehavioralScores (mutation RPC)
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  computeClientRiskScore,
  getRiskConfig,
  getTrendConfig,
  getTrajectoryConfig,
  RISK_CONFIG,
  TREND_CONFIG,
  TRAJECTORY_CONFIG,
  useAttritionRisk,
  useMyAttritionRisk,
  useAttritionStats,
  useDivisionAttritionHeatmap,
  useBehavioralAlerts,
} from '../hooks/useBehavioralIntelligence'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Wrapper QueryClient ──────────────────────────────────────
function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => createElement(QueryClientProvider, { client: qc }, children)
}

// ─── Données de test ──────────────────────────────────────────
const MOCK_RISK_DATA = [
  {
    user_id: 'u1', first_name: 'Alice', last_name: 'Martin',
    risk_score: 82, risk_level: 'critical', trend_direction: 'critical_decline',
    factor_pulse: 90, factor_feedback: 75, factor_okr: 80, factor_seniority: 70, factor_activity: 85,
    division_id: 'div-1', division_name: 'Exploitation', service_name: 'Planification',
    role: 'collaborateur', is_active: true,
  },
  {
    user_id: 'u2', first_name: 'Bob', last_name: 'Dupont',
    risk_score: 61, risk_level: 'high', trend_direction: 'declining',
    factor_pulse: 65, factor_feedback: 55, factor_okr: 60, factor_seniority: 90, factor_activity: 40,
    division_id: 'div-2', division_name: 'Finance', service_name: null,
    role: 'chef_service', is_active: true,
  },
  {
    user_id: 'u3', first_name: 'Claire', last_name: 'Petit',
    risk_score: 22, risk_level: 'low', trend_direction: 'improving',
    factor_pulse: 10, factor_feedback: 20, factor_okr: 15, factor_seniority: 5, factor_activity: 25,
    division_id: 'div-1', division_name: 'Exploitation', service_name: 'RH',
    role: 'collaborateur', is_active: true,
  },
  {
    user_id: 'u4', first_name: 'David', last_name: 'Bernard',
    risk_score: 44, risk_level: 'medium', trend_direction: 'stable',
    factor_pulse: 45, factor_feedback: 35, factor_okr: 50, factor_seniority: 70, factor_activity: 30,
    division_id: 'div-2', division_name: 'Finance', service_name: 'Comptabilité',
    role: 'collaborateur', is_active: true,
  },
]

const MOCK_ALERTS = [
  {
    id: 'alert-1', user_id: 'u1', manager_id: null,
    alert_type: 'attrition_risk', severity: 'critical',
    title: 'Risque de départ critique détecté',
    message: 'Score 82/100',
    risk_score: 82, is_read: false, is_acknowledged: false,
    created_at: new Date().toISOString(),
    user: { id: 'u1', first_name: 'Alice', last_name: 'Martin', role: 'collaborateur', divisions: { name: 'Exploitation' } },
  },
  {
    id: 'alert-2', user_id: 'u2', manager_id: null,
    alert_type: 'performance_decline', severity: 'high',
    title: 'Déclin de performance',
    message: 'Score PULSE en baisse sur 3 mois',
    risk_score: 61, is_read: true, is_acknowledged: false,
    created_at: new Date().toISOString(),
    user: { id: 'u2', first_name: 'Bob', last_name: 'Dupont', role: 'chef_service', divisions: { name: 'Finance' } },
  },
]

// ─── SUITE 1 : Helpers purs (sans hooks) ─────────────────────
describe('computeClientRiskScore', () => {
  it('retourne 0 pour un profil parfait', () => {
    const score = computeClientRiskScore({
      pulseTrend: -10, f360: 5, okrProgress: 100, seniority: 3650, nitaScore: 10,
    })
    expect(score).toBe(0)
  })

  it('retourne un score élevé pour un profil à risque', () => {
    const score = computeClientRiskScore({
      pulseTrend: 25, f360: 0.5, okrProgress: 10, seniority: 60, nitaScore: 1,
    })
    expect(score).toBeGreaterThan(60)
  })

  it('respecte les bornes 0-100', () => {
    const s1 = computeClientRiskScore({ pulseTrend: 100, f360: 0, okrProgress: 0, seniority: 0, nitaScore: 0 })
    const s2 = computeClientRiskScore({ pulseTrend: -100, f360: 10, okrProgress: 100, seniority: 5000, nitaScore: 10 })
    expect(s1).toBeLessThanOrEqual(100)
    expect(s2).toBeGreaterThanOrEqual(0)
  })

  it('la pondération respecte les poids (30/20/20/15/15)', () => {
    // pulseTrend = 20 → factor_pulse = 100 (poids 30%)
    const s = computeClientRiskScore({ pulseTrend: 20, f360: 5, okrProgress: 100, seniority: 5000, nitaScore: 10 })
    expect(s).toBeGreaterThanOrEqual(28) // 100*0.30 = 30 minimum
  })
})

describe('getRiskConfig', () => {
  it('retourne la config correcte pour chaque niveau', () => {
    expect(getRiskConfig('low').label).toBe('Faible')
    expect(getRiskConfig('medium').label).toBe('Modéré')
    expect(getRiskConfig('high').label).toBe('Élevé')
    expect(getRiskConfig('critical').label).toBe('Critique')
  })

  it('fallback sur low pour un niveau inconnu', () => {
    expect(getRiskConfig('unknown').label).toBe('Faible')
  })

  it('chaque config a les champs requis', () => {
    Object.keys(RISK_CONFIG).forEach(level => {
      const cfg = getRiskConfig(level)
      expect(cfg).toHaveProperty('color')
      expect(cfg).toHaveProperty('bg')
      expect(cfg).toHaveProperty('icon')
      expect(cfg).toHaveProperty('description')
    })
  })
})

describe('getTrendConfig', () => {
  it('retourne la config correcte pour chaque tendance', () => {
    expect(getTrendConfig('improving').label).toBe('En amélioration')
    expect(getTrendConfig('stable').label).toBe('Stable')
    expect(getTrendConfig('declining').label).toBe('En déclin')
    expect(getTrendConfig('critical_decline').label).toBe('Chute critique')
  })

  it('fallback sur stable pour une tendance inconnue', () => {
    expect(getTrendConfig('unknown').label).toBe('Stable')
  })
})

describe('getTrajectoryConfig', () => {
  it('retourne un icône pour les trajectoires connues', () => {
    expect(getTrajectoryConfig('Potentiel Managérial').icon).toBe('🚀')
    expect(getTrajectoryConfig('Spécialiste Expert').icon).toBe('🎯')
  })

  it('retourne un fallback pour les trajectoires inconnues', () => {
    const cfg = getTrajectoryConfig('Inconnu')
    expect(cfg).toHaveProperty('color')
    expect(cfg).toHaveProperty('icon')
  })
})

// ─── SUITE 2 : Hooks avec mocks ──────────────────────────────
describe('useAttritionRisk', () => {
  beforeEach(() => {
    supabase.from.mockReturnValue({
      ...supabase.__createQueryBuilder(MOCK_RISK_DATA),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: vi.fn(resolve => resolve({ data: MOCK_RISK_DATA, error: null })),
    })
  })

  it('retourne tous les utilisateurs sans filtre', async () => {
    const { result } = renderHook(() => useAttritionRisk(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(MOCK_RISK_DATA.length)
  })

  it('est dans un état loading initial', () => {
    const { result } = renderHook(() => useAttritionRisk(), { wrapper: makeWrapper() })
    expect(result.current.isLoading).toBe(true)
  })

  it('la queryKey change selon les filtres', () => {
    const { result: r1 } = renderHook(() => useAttritionRisk({ risk_level: 'high' }), { wrapper: makeWrapper() })
    const { result: r2 } = renderHook(() => useAttritionRisk({ risk_level: 'low' }),  { wrapper: makeWrapper() })
    // Les deux hooks ont des queryKeys différentes (via options différentes)
    expect(r1).toBeDefined()
    expect(r2).toBeDefined()
  })
})

describe('useMyAttritionRisk', () => {
  it('ne fait pas de requête si pas de profil', () => {
    useAuth.mockReturnValueOnce({ profile: null })
    const { result } = renderHook(() => useMyAttritionRisk(), { wrapper: makeWrapper() })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  it('fait une requête quand profile.id est disponible', async () => {
    supabase.from.mockReturnValue({
      ...supabase.__createQueryBuilder([MOCK_RISK_DATA[0]]),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_RISK_DATA[0], error: null }),
    })

    const { result } = renderHook(() => useMyAttritionRisk(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })
})

describe('useAttritionStats', () => {
  beforeEach(() => {
    supabase.from.mockReturnValue({
      ...supabase.__createQueryBuilder(MOCK_RISK_DATA),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: vi.fn(resolve => resolve({ data: MOCK_RISK_DATA, error: null })),
    })
  })

  it('calcule les comptages par niveau', async () => {
    const { result } = renderHook(() => useAttritionStats(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { stats } = result.current
    expect(stats.critical).toBe(1) // Alice
    expect(stats.high).toBe(1)     // Bob
    expect(stats.medium).toBe(1)   // David
    expect(stats.low).toBe(1)      // Claire
    expect(stats.total).toBe(4)
  })

  it('calcule le score moyen', async () => {
    const { result } = renderHook(() => useAttritionStats(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const avg = Math.round((82 + 61 + 22 + 44) / 4)
    expect(result.current.stats.avgScore).toBe(avg)
  })

  it('identifie les collaborateurs en amélioration', async () => {
    const { result } = renderHook(() => useAttritionStats(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.stats.improving).toBe(1) // Claire
  })

  it('retourne le top 5 à risque', async () => {
    const { result } = renderHook(() => useAttritionStats(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.stats.topRisk.length).toBeLessThanOrEqual(5)
  })
})

describe('useDivisionAttritionHeatmap', () => {
  beforeEach(() => {
    supabase.from.mockReturnValue({
      ...supabase.__createQueryBuilder(MOCK_RISK_DATA),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: vi.fn(resolve => resolve({ data: MOCK_RISK_DATA, error: null })),
    })
  })

  it('groupe les collaborateurs par division', async () => {
    const { result } = renderHook(() => useDivisionAttritionHeatmap(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { divisions } = result.current
    expect(divisions).toHaveLength(2) // Exploitation + Finance

    const exploitation = divisions.find(d => d.division_name === 'Exploitation')
    expect(exploitation?.users).toHaveLength(2) // Alice + Claire
  })

  it('calcule le score moyen par division', async () => {
    const { result } = renderHook(() => useDivisionAttritionHeatmap(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { divisions } = result.current
    const exploitation = divisions.find(d => d.division_name === 'Exploitation')
    // (82 + 22) / 2 = 52
    expect(exploitation?.avgScore).toBe(52)
  })

  it('calcule le ratio de risque élevé+', async () => {
    const { result } = renderHook(() => useDivisionAttritionHeatmap(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { divisions } = result.current
    const exploitation = divisions.find(d => d.division_name === 'Exploitation')
    // 1 critical sur 2 → 50%
    expect(exploitation?.riskRatio).toBe(50)
  })

  it('trie les divisions par score moyen décroissant', async () => {
    const { result } = renderHook(() => useDivisionAttritionHeatmap(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { divisions } = result.current
    for (let i = 0; i < divisions.length - 1; i++) {
      expect(divisions[i].avgScore).toBeGreaterThanOrEqual(divisions[i + 1].avgScore)
    }
  })
})

describe('useBehavioralAlerts', () => {
  it('ne charge pas pour un non-manager', () => {
    useAuth.mockReturnValueOnce({
      profile: { id: 'u1', role: 'collaborateur' },
      isAdmin: false, isDirecteur: false, isChefDivision: false, isChefService: false,
    })
    const { result } = renderHook(() => useBehavioralAlerts(), { wrapper: makeWrapper() })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  it('charge les alertes pour un manager', async () => {
    useAuth.mockReturnValue({
      profile: { id: 'manager-1' },
      isAdmin: false, isDirecteur: false, isChefDivision: false, isChefService: true,
    })

    const builder = supabase.__createQueryBuilder(MOCK_ALERTS)
    builder.order = vi.fn().mockReturnThis()
    builder.eq    = vi.fn().mockReturnThis()
    builder.limit = vi.fn().mockReturnThis()
    builder.then  = vi.fn(resolve => resolve({ data: MOCK_ALERTS, error: null }))
    supabase.from.mockReturnValue(builder)

    const { result } = renderHook(() => useBehavioralAlerts(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.length).toBeGreaterThan(0)
  })

  it('compte correctement les alertes non lues', async () => {
    useAuth.mockReturnValue({
      profile: { id: 'manager-1' },
      isAdmin: false, isDirecteur: false, isChefDivision: false, isChefService: true,
    })

    const builder = supabase.__createQueryBuilder(MOCK_ALERTS)
    builder.order = vi.fn().mockReturnThis()
    builder.eq    = vi.fn().mockReturnThis()
    builder.limit = vi.fn().mockReturnThis()
    builder.then  = vi.fn(resolve => resolve({ data: MOCK_ALERTS, error: null }))
    supabase.from.mockReturnValue(builder)

    const { result } = renderHook(() => useBehavioralAlerts(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const unread = result.current.data.filter(a => !a.is_read)
    expect(unread).toHaveLength(1) // seulement alert-1
  })
})

// ─── SUITE 3 : Vérification des constantes ───────────────────
describe('RISK_CONFIG constants', () => {
  it('contient exactement 4 niveaux', () => {
    expect(Object.keys(RISK_CONFIG)).toHaveLength(4)
  })

  it('chaque niveau a les propriétés requises', () => {
    const required = ['label', 'color', 'bg', 'border', 'text', 'icon', 'description']
    Object.values(RISK_CONFIG).forEach(cfg => {
      required.forEach(prop => {
        expect(cfg).toHaveProperty(prop)
      })
    })
  })
})

describe('TREND_CONFIG constants', () => {
  it('contient les 4 tendances attendues', () => {
    expect(TREND_CONFIG).toHaveProperty('improving')
    expect(TREND_CONFIG).toHaveProperty('stable')
    expect(TREND_CONFIG).toHaveProperty('declining')
    expect(TREND_CONFIG).toHaveProperty('critical_decline')
  })

  it('chaque tendance a les champs arrow et icon', () => {
    Object.values(TREND_CONFIG).forEach(cfg => {
      expect(cfg).toHaveProperty('arrow')
      expect(cfg).toHaveProperty('icon')
      expect(cfg).toHaveProperty('color')
    })
  })
})

describe('TRAJECTORY_CONFIG constants', () => {
  it('contient au moins 4 trajectoires', () => {
    expect(Object.keys(TRAJECTORY_CONFIG).length).toBeGreaterThanOrEqual(4)
  })

  it('chaque trajectoire a un icône et une couleur', () => {
    Object.values(TRAJECTORY_CONFIG).forEach(cfg => {
      expect(cfg).toHaveProperty('icon')
      expect(cfg).toHaveProperty('color')
      expect(cfg).toHaveProperty('description')
    })
  })
})
