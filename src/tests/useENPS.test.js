// ============================================================
// APEX RH — tests/useENPS.test.js
// Session 55 — Tests eNPS enrichi
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import {
  ENPS_BENCHMARK,
  ENPS_ZONE_CONFIG,
  SENIORITY_LABELS,
  ROLE_LABELS,
  getEnpsZone,
  formatENPS,
  computeLocalENPS,
} from '../src/hooks/useENPS'

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      in:          vi.fn().mockReturnThis(),
      not:         vi.fn().mockReturnThis(),
      order:       vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

vi.mock('../src/hooks/useAnalytics', () => ({
  getLastNMonthKeys: (n) => {
    const keys = []
    const now = new Date()
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return keys
  },
}))

// ─── TESTS CONSTANTES ────────────────────────────────────────

describe('ENPS_BENCHMARK', () => {
  it('a un score sectoriel positif', () => {
    expect(ENPS_BENCHMARK.sector_avg).toBeGreaterThan(0)
  })

  it('a les 3 niveaux de benchmark', () => {
    expect(ENPS_BENCHMARK.sector_avg).toBeDefined()
    expect(ENPS_BENCHMARK.top_quartile).toBeDefined()
    expect(ENPS_BENCHMARK.bottom_quartile).toBeDefined()
  })

  it('top_quartile > sector_avg > bottom_quartile', () => {
    expect(ENPS_BENCHMARK.top_quartile).toBeGreaterThan(ENPS_BENCHMARK.sector_avg)
    expect(ENPS_BENCHMARK.sector_avg).toBeGreaterThan(ENPS_BENCHMARK.bottom_quartile)
  })
})

describe('ENPS_ZONE_CONFIG', () => {
  it('contient 5 zones', () => {
    expect(Object.keys(ENPS_ZONE_CONFIG)).toHaveLength(5)
  })

  it('chaque zone a label, color, bg, min', () => {
    Object.values(ENPS_ZONE_CONFIG).forEach(zone => {
      expect(zone.label).toBeDefined()
      expect(zone.color).toMatch(/^#/)
      expect(zone.bg).toContain('rgba')
      expect(zone.min).toBeDefined()
    })
  })

  it('les seuils sont en ordre décroissant', () => {
    const mins = Object.values(ENPS_ZONE_CONFIG).map(z => z.min).sort((a, b) => b - a)
    expect(mins[0]).toBe(50)
    expect(mins[mins.length - 1]).toBe(-100)
  })
})

// ─── TESTS getEnpsZone ────────────────────────────────────────

describe('getEnpsZone', () => {
  it('retourne null pour score null', () => {
    expect(getEnpsZone(null)).toBeNull()
    expect(getEnpsZone(undefined)).toBeNull()
  })

  it('retourne excellent pour score >= 50', () => {
    expect(getEnpsZone(50)).toEqual(ENPS_ZONE_CONFIG.excellent)
    expect(getEnpsZone(75)).toEqual(ENPS_ZONE_CONFIG.excellent)
    expect(getEnpsZone(100)).toEqual(ENPS_ZONE_CONFIG.excellent)
  })

  it('retourne good pour 20-49', () => {
    expect(getEnpsZone(20)).toEqual(ENPS_ZONE_CONFIG.good)
    expect(getEnpsZone(35)).toEqual(ENPS_ZONE_CONFIG.good)
    expect(getEnpsZone(49)).toEqual(ENPS_ZONE_CONFIG.good)
  })

  it('retourne acceptable pour 0-19', () => {
    expect(getEnpsZone(0)).toEqual(ENPS_ZONE_CONFIG.acceptable)
    expect(getEnpsZone(10)).toEqual(ENPS_ZONE_CONFIG.acceptable)
    expect(getEnpsZone(19)).toEqual(ENPS_ZONE_CONFIG.acceptable)
  })

  it('retourne concerning pour -30 à -1', () => {
    expect(getEnpsZone(-1)).toEqual(ENPS_ZONE_CONFIG.concerning)
    expect(getEnpsZone(-29)).toEqual(ENPS_ZONE_CONFIG.concerning)
  })

  it('retourne critical pour < -30', () => {
    expect(getEnpsZone(-30)).toEqual(ENPS_ZONE_CONFIG.critical)
    expect(getEnpsZone(-100)).toEqual(ENPS_ZONE_CONFIG.critical)
  })
})

// ─── TESTS formatENPS ────────────────────────────────────────

describe('formatENPS', () => {
  it('retourne — pour null/undefined', () => {
    expect(formatENPS(null)).toBe('—')
    expect(formatENPS(undefined)).toBe('—')
  })

  it('préfixe + pour les scores positifs', () => {
    expect(formatENPS(25)).toBe('+25')
    expect(formatENPS(0)).toBe('0')
  })

  it('pas de préfixe pour les scores négatifs', () => {
    expect(formatENPS(-15)).toBe('-15')
    expect(formatENPS(-100)).toBe('-100')
  })
})

// ─── TESTS computeLocalENPS ──────────────────────────────────

describe('computeLocalENPS', () => {
  it('retourne enps null si tableau vide', () => {
    const result = computeLocalENPS([])
    expect(result.enps).toBeNull()
    expect(result.total).toBe(0)
  })

  it('retourne enps null si pas de clé enps', () => {
    const responses = [
      { scores: { satisfaction: 4, motivation: 3 } },
    ]
    const result = computeLocalENPS(responses)
    expect(result.enps).toBeNull()
  })

  it('calcule correctement avec 100% de promoteurs', () => {
    const responses = [
      { scores: { enps: 10 } },
      { scores: { enps: 9  } },
      { scores: { enps: 10 } },
    ]
    const result = computeLocalENPS(responses)
    expect(result.enps).toBe(100)
    expect(result.promoters).toBe(3)
    expect(result.detractors).toBe(0)
  })

  it('calcule correctement avec 100% de détracteurs', () => {
    const responses = [
      { scores: { enps: 0 } },
      { scores: { enps: 3 } },
      { scores: { enps: 6 } },
    ]
    const result = computeLocalENPS(responses)
    expect(result.enps).toBe(-100)
    expect(result.detractors).toBe(3)
    expect(result.promoters).toBe(0)
  })

  it('calcule correctement un mix réaliste', () => {
    // 4 promoteurs (9-10), 3 passifs (7-8), 3 détracteurs (0-6)
    const responses = [
      { scores: { enps: 10 } }, { scores: { enps: 9 } }, { scores: { enps: 9 } }, { scores: { enps: 10 } },
      { scores: { enps: 8  } }, { scores: { enps: 7 } }, { scores: { enps: 8  } },
      { scores: { enps: 5  } }, { scores: { enps: 3 } }, { scores: { enps: 6  } },
    ]
    const result = computeLocalENPS(responses)
    expect(result.total).toBe(10)
    expect(result.promoters).toBe(4)
    expect(result.passives).toBe(3)
    expect(result.detractors).toBe(3)
    // eNPS = 40% - 30% = 10
    expect(result.enps).toBe(10)
  })

  it('les passifs ne comptent pas dans l\'eNPS', () => {
    const responses = [
      { scores: { enps: 9 } },  // promoteur
      { scores: { enps: 7 } },  // passif
      { scores: { enps: 7 } },  // passif
    ]
    const result = computeLocalENPS(responses)
    // 1 promoteur sur 3 = 33.3%, 0 détracteur = eNPS = 33
    expect(result.enps).toBe(33)
    expect(result.passives).toBe(2)
  })

  it('ignore les réponses sans clé enps', () => {
    const responses = [
      { scores: { enps: 9 } },
      { scores: { satisfaction: 5 } },  // pas d'enps
      { scores: null },                  // null
    ]
    const result = computeLocalENPS(responses)
    expect(result.total).toBe(1)
    expect(result.promoters).toBe(1)
    expect(result.enps).toBe(100)
  })
})

// ─── TESTS SENIORITY_LABELS ──────────────────────────────────

describe('SENIORITY_LABELS', () => {
  it('contient 4 tranches d\'ancienneté', () => {
    expect(Object.keys(SENIORITY_LABELS)).toHaveLength(4)
  })

  it('a des ordres croissants', () => {
    const orders = Object.values(SENIORITY_LABELS).map(l => l.order)
    const sorted = [...orders].sort((a, b) => a - b)
    expect(orders).toEqual(sorted)
  })
})
