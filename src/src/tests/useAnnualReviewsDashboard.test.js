// ============================================================
// APEX RH — tests/useAnnualReviewsDashboard.test.js
// Session 62 — Tableau de bord entretiens annuels enrichi
// 38 tests : helpers, KPIs, tendances, heatmap, comparaisons
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  scoreToHeatmapColor,
  scoreToTextColor,
  scoreToLabel,
  computeTrend,
  computeVariationPct,
  extractRatingDistribution,
  computeWeightedAvgFromRow,
  formatScore,
  getRecentYears,
  buildLinePoints,
  normalizeCompletionRate,
  computeTopPerformerPct,
  RATING_ORDER,
  TREND_COLORS,
  HEATMAP_COLORS,
  RATING_SCORE_MAP,
} from '../hooks/useAnnualReviewsDashboard'

// ─── CONSTANTES ──────────────────────────────────────────────

describe('CONSTANTES', () => {
  it('RATING_ORDER contient 5 niveaux dans le bon ordre', () => {
    expect(RATING_ORDER).toHaveLength(5)
    expect(RATING_ORDER[0]).toBe('excellent')
    expect(RATING_ORDER[4]).toBe('insuffisant')
  })

  it('RATING_SCORE_MAP : excellent=5, insuffisant=1', () => {
    expect(RATING_SCORE_MAP.excellent).toBe(5)
    expect(RATING_SCORE_MAP.insuffisant).toBe(1)
    expect(RATING_SCORE_MAP.bien).toBe(4)
    expect(RATING_SCORE_MAP.satisfaisant).toBe(3)
    expect(RATING_SCORE_MAP.a_ameliorer).toBe(2)
  })

  it('TREND_COLORS : toutes les clés requises présentes', () => {
    expect(TREND_COLORS).toHaveProperty('completion')
    expect(TREND_COLORS).toHaveProperty('signature')
    expect(TREND_COLORS).toHaveProperty('avgRating')
    expect(TREND_COLORS).toHaveProperty('excellent')
    expect(TREND_COLORS).toHaveProperty('insuffisant')
  })
})

// ─── scoreToHeatmapColor ─────────────────────────────────────

describe('scoreToHeatmapColor', () => {
  it('retourne une couleur verte pour score >= 4.5', () => {
    expect(scoreToHeatmapColor(5)).toContain('16,185,129')
    expect(scoreToHeatmapColor(4.5)).toContain('16,185,129')
  })

  it('retourne une couleur bleue pour 3.5 ≤ score < 4.5', () => {
    expect(scoreToHeatmapColor(4)).toContain('59,130,246')
    expect(scoreToHeatmapColor(3.5)).toContain('59,130,246')
  })

  it('retourne une couleur ambre pour 2.5 ≤ score < 3.5', () => {
    expect(scoreToHeatmapColor(3)).toContain('245,158,11')
  })

  it('retourne une couleur orange pour 1.5 ≤ score < 2.5', () => {
    expect(scoreToHeatmapColor(2)).toContain('249,115,22')
  })

  it('retourne une couleur rouge pour score < 1.5', () => {
    expect(scoreToHeatmapColor(1)).toContain('239,68,68')
  })

  it('retourne couleur vide si score null', () => {
    expect(scoreToHeatmapColor(null)).toBe('rgba(255,255,255,0.04)')
  })

  it('retourne couleur vide si score undefined', () => {
    expect(scoreToHeatmapColor(undefined)).toBe('rgba(255,255,255,0.04)')
  })
})

// ─── scoreToTextColor ─────────────────────────────────────────

describe('scoreToTextColor', () => {
  it('retourne #10B981 pour score >= 4.5', () => {
    expect(scoreToTextColor(5)).toBe('#10B981')
  })

  it('retourne #3B82F6 pour score 3.5–4.4', () => {
    expect(scoreToTextColor(4)).toBe('#3B82F6')
  })

  it('retourne couleur grise si score null', () => {
    expect(scoreToTextColor(null)).toBe('#ffffff40')
  })
})

// ─── scoreToLabel ──────────────────────────────────────────────

describe('scoreToLabel', () => {
  it('retourne Excellent pour score >= 4.5', () => {
    expect(scoreToLabel(5)).toBe('Excellent')
  })

  it('retourne Bien pour score 3.5–4.4', () => {
    expect(scoreToLabel(4)).toBe('Bien')
  })

  it('retourne Satisfaisant pour score 2.5–3.4', () => {
    expect(scoreToLabel(3)).toBe('Satisfaisant')
  })

  it('retourne À améliorer pour score 1.5–2.4', () => {
    expect(scoreToLabel(2)).toBe('À améliorer')
  })

  it('retourne Insuffisant pour score < 1.5', () => {
    expect(scoreToLabel(1)).toBe('Insuffisant')
  })

  it('retourne — si score null', () => {
    expect(scoreToLabel(null)).toBe('—')
  })
})

// ─── computeTrend ─────────────────────────────────────────────

describe('computeTrend', () => {
  it('hausse si current > previous', () => {
    const t = computeTrend(80, 70)
    expect(t.direction).toBe('up')
    expect(t.delta).toBeCloseTo(10)
  })

  it('baisse si current < previous', () => {
    const t = computeTrend(60, 70)
    expect(t.direction).toBe('down')
    expect(t.delta).toBeCloseTo(-10)
  })

  it('stable si delta < 0.05', () => {
    const t = computeTrend(70.02, 70)
    expect(t.direction).toBe('stable')
    expect(t.delta).toBe(0)
  })

  it('retourne null si current est null', () => {
    expect(computeTrend(null, 70)).toBeNull()
  })

  it('retourne null si previous est null', () => {
    expect(computeTrend(80, null)).toBeNull()
  })

  it('retourne null si les deux sont null', () => {
    expect(computeTrend(null, null)).toBeNull()
  })
})

// ─── computeVariationPct ──────────────────────────────────────

describe('computeVariationPct', () => {
  it('calcule +50% correctement', () => {
    expect(computeVariationPct(150, 100)).toBe(50)
  })

  it('calcule -20% correctement', () => {
    expect(computeVariationPct(80, 100)).toBe(-20)
  })

  it('retourne null si previous = 0', () => {
    expect(computeVariationPct(80, 0)).toBeNull()
  })

  it('retourne null si previous est null', () => {
    expect(computeVariationPct(80, null)).toBeNull()
  })
})

// ─── computeWeightedAvgFromRow ────────────────────────────────

describe('computeWeightedAvgFromRow', () => {
  it('calcule la moyenne pondérée correctement', () => {
    const row = {
      rating_excellent:    2,
      rating_bien:         3,
      rating_satisfaisant: 5,
      rating_a_ameliorer:  0,
      rating_insuffisant:  0,
      total_reviews: 10,
    }
    // (2*5 + 3*4 + 5*3) / 10 = (10+12+15)/10 = 3.7
    expect(computeWeightedAvgFromRow(row)).toBeCloseTo(3.7)
  })

  it('retourne null si aucun noté', () => {
    const row = { rating_excellent: 0, rating_bien: 0, rating_satisfaisant: 0, rating_a_ameliorer: 0, rating_insuffisant: 0, total_reviews: 5 }
    expect(computeWeightedAvgFromRow(row)).toBeNull()
  })

  it('retourne null si row est null', () => {
    expect(computeWeightedAvgFromRow(null)).toBeNull()
  })

  it('excellent pur = 5', () => {
    const row = { rating_excellent: 10, rating_bien: 0, rating_satisfaisant: 0, rating_a_ameliorer: 0, rating_insuffisant: 0, total_reviews: 10 }
    expect(computeWeightedAvgFromRow(row)).toBe(5)
  })
})

// ─── computeTopPerformerPct ───────────────────────────────────

describe('computeTopPerformerPct', () => {
  it('calcule le % top performers (excellent + bien)', () => {
    const row = {
      rating_excellent: 3, rating_bien: 2,
      rating_satisfaisant: 5, rating_a_ameliorer: 0, rating_insuffisant: 0,
    }
    // 5/10 = 50%
    expect(computeTopPerformerPct(row)).toBe(50)
  })

  it('retourne null si aucun noté', () => {
    const row = { rating_excellent: 0, rating_bien: 0, rating_satisfaisant: 0, rating_a_ameliorer: 0, rating_insuffisant: 0 }
    expect(computeTopPerformerPct(row)).toBeNull()
  })

  it('retourne null si row est null', () => {
    expect(computeTopPerformerPct(null)).toBeNull()
  })
})

// ─── formatScore ─────────────────────────────────────────────

describe('formatScore', () => {
  it('formate avec une décimale', () => {
    expect(formatScore(3.67)).toBe('3.7')
    expect(formatScore(5)).toBe('5.0')
  })

  it('retourne — pour null', () => {
    expect(formatScore(null)).toBe('—')
  })

  it('retourne — pour undefined', () => {
    expect(formatScore(undefined)).toBe('—')
  })
})

// ─── getRecentYears ───────────────────────────────────────────

describe('getRecentYears', () => {
  const trends = [
    { year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 }, { year: 2024 }, { year: 2025 },
  ]

  it('retourne les n dernières années triées asc', () => {
    const result = getRecentYears(trends, 3)
    expect(result).toHaveLength(3)
    expect(result.map(t => t.year)).toEqual([2023, 2024, 2025])
  })

  it('retourne 5 par défaut', () => {
    const result = getRecentYears(trends)
    expect(result).toHaveLength(5)
  })

  it('retourne [] si tableau vide', () => {
    expect(getRecentYears([])).toEqual([])
  })

  it('retourne [] si null', () => {
    expect(getRecentYears(null)).toEqual([])
  })
})

// ─── normalizeCompletionRate ──────────────────────────────────

describe('normalizeCompletionRate', () => {
  it('retourne 0 si rate = 0', () => {
    expect(normalizeCompletionRate(0)).toBe(0)
  })

  it('retourne 100 si rate = 100', () => {
    expect(normalizeCompletionRate(100)).toBe(100)
  })

  it('plafonne à 100', () => {
    expect(normalizeCompletionRate(110)).toBe(100)
  })

  it('plancher à 0', () => {
    expect(normalizeCompletionRate(-5)).toBe(0)
  })

  it('retourne 0 si null', () => {
    expect(normalizeCompletionRate(null)).toBe(0)
  })
})

// ─── buildLinePoints ─────────────────────────────────────────

describe('buildLinePoints', () => {
  it('génère des points SVG pour une série simple', () => {
    const data = [
      { year: 2023, completion_rate: 70 },
      { year: 2024, completion_rate: 80 },
      { year: 2025, completion_rate: 90 },
    ]
    const result = buildLinePoints(data, 'completion_rate', 300, 100)
    expect(result).toBeTruthy()
    expect(result.split(' ')).toHaveLength(3)
  })

  it('retourne string vide si données vides', () => {
    expect(buildLinePoints([], 'completion_rate', 300, 100)).toBe('')
  })

  it('retourne string vide si toutes valeurs null', () => {
    const data = [{ year: 2023, v: null }, { year: 2024, v: null }]
    expect(buildLinePoints(data, 'v', 300, 100)).toBe('')
  })
})

// ─── extractRatingDistribution ───────────────────────────────

describe('extractRatingDistribution', () => {
  it('retourne 5 items dans le bon ordre', () => {
    const row = {
      rating_excellent: 5, rating_bien: 10,
      rating_satisfaisant: 8, rating_a_ameliorer: 3, rating_insuffisant: 1,
    }
    const result = extractRatingDistribution(row)
    expect(result).toHaveLength(5)
    expect(result[0].key).toBe('excellent')
    expect(result[0].count).toBe(5)
    expect(result[4].key).toBe('insuffisant')
    expect(result[4].count).toBe(1)
  })

  it('retourne [] si row null', () => {
    expect(extractRatingDistribution(null)).toEqual([])
  })

  it('retourne counts à 0 si champs manquants', () => {
    const result = extractRatingDistribution({})
    expect(result.every(r => r.count === 0)).toBe(true)
  })
})
