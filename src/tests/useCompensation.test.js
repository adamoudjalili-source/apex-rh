// ============================================================
// APEX RH — src/tests/useCompensation.test.js
// Session 58 — Tests Compensation & Benchmark Salarial
// 35 tests : constantes, formatters, logique métier
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  CURRENCY_LABELS,
  REVIEW_REASON_LABELS, REVIEW_REASON_COLORS,
  REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS,
  BONUS_TYPE_LABELS, BONUS_TYPE_COLORS,
  BONUS_STATUS_LABELS,
  GRADE_CATEGORY_LABELS,
  formatSalary, formatSalaryShort,
  getCompaRatioColor, getCompaRatioLabel,
  computeRangePosition, computeCompaRatio,
  computeMarketGap, getMarketGapColor,
} from '../hooks/useCompensation'

// ── 1. CONSTANTES ─────────────────────────────────────────────

describe('CURRENCY_LABELS', () => {
  it('contient les 3 devises', () => {
    expect(Object.keys(CURRENCY_LABELS)).toEqual(['XOF', 'EUR', 'USD'])
  })
  it('XOF = F CFA', () => {
    expect(CURRENCY_LABELS.XOF).toBe('F CFA')
  })
})

describe('REVIEW_REASON_LABELS', () => {
  it('contient toutes les raisons', () => {
    const keys = ['annuelle', 'promotion', 'revalorisation', 'correction', 'recrutement', 'autre']
    keys.forEach(k => expect(REVIEW_REASON_LABELS[k]).toBeTruthy())
  })
  it('a des libellés en français', () => {
    expect(REVIEW_REASON_LABELS.annuelle).toBe('Révision annuelle')
    expect(REVIEW_REASON_LABELS.promotion).toBe('Promotion')
  })
})

describe('REVIEW_STATUS_LABELS', () => {
  it('contient tous les statuts', () => {
    const keys = ['propose', 'valide', 'applique', 'rejete']
    keys.forEach(k => expect(REVIEW_STATUS_LABELS[k]).toBeTruthy())
  })
})

describe('BONUS_TYPE_LABELS', () => {
  it('contient tous les types', () => {
    const keys = ['performance', 'anciennete', 'projet', 'exceptionnel', 'astreinte', 'autre']
    keys.forEach(k => expect(BONUS_TYPE_LABELS[k]).toBeTruthy())
  })
})

describe('BONUS_STATUS_LABELS', () => {
  it('contient tous les statuts bonus', () => {
    const keys = ['propose', 'valide', 'paye', 'annule']
    keys.forEach(k => expect(BONUS_STATUS_LABELS[k]).toBeTruthy())
  })
})

describe('GRADE_CATEGORY_LABELS', () => {
  it('contient les 4 catégories', () => {
    const keys = ['agent', 'technicien', 'cadre', 'direction']
    keys.forEach(k => expect(GRADE_CATEGORY_LABELS[k]).toBeTruthy())
  })
})

// ── 2. FORMATTERS ─────────────────────────────────────────────

describe('formatSalary', () => {
  it('formate XOF correctement', () => {
    const result = formatSalary(500000, 'XOF')
    expect(result).toContain('F CFA')
    expect(result).toContain('500')
  })

  it('retourne — pour null', () => {
    expect(formatSalary(null)).toBe('—')
  })

  it('retourne — pour undefined', () => {
    expect(formatSalary(undefined)).toBe('—')
  })

  it('formate zéro', () => {
    const result = formatSalary(0, 'XOF')
    expect(result).toContain('F CFA')
  })

  it('formate de grands montants', () => {
    const result = formatSalary(1500000, 'XOF')
    expect(result).toContain('F CFA')
  })
})

describe('formatSalaryShort', () => {
  it('abrège les millions', () => {
    expect(formatSalaryShort(1500000)).toBe('1.5M')
  })

  it('abrège les milliers', () => {
    expect(formatSalaryShort(500000)).toBe('500k')
  })

  it('retourne la valeur brute pour les petits montants', () => {
    expect(formatSalaryShort(999)).toBe('999')
  })

  it('retourne — pour null', () => {
    expect(formatSalaryShort(null)).toBe('—')
  })

  it('gère 2 millions', () => {
    expect(formatSalaryShort(2000000)).toBe('2.0M')
  })
})

// ── 3. COMPA-RATIO ────────────────────────────────────────────

describe('getCompaRatioColor', () => {
  it('rouge si < 80', () => {
    expect(getCompaRatioColor(75)).toBe('#EF4444')
  })

  it('orange si entre 80 et 94', () => {
    expect(getCompaRatioColor(90)).toBe('#F59E0B')
  })

  it('vert si entre 95 et 110', () => {
    expect(getCompaRatioColor(100)).toBe('#10B981')
  })

  it('violet si > 110', () => {
    expect(getCompaRatioColor(120)).toBe('#8B5CF6')
  })

  it('gris si null', () => {
    expect(getCompaRatioColor(null)).toBe('#6B7280')
  })
})

describe('getCompaRatioLabel', () => {
  it('retourne — pour null', () => {
    expect(getCompaRatioLabel(null)).toBe('—')
  })

  it('retourne label aligné pour 100', () => {
    expect(getCompaRatioLabel(100)).toBe('Aligné marché')
  })

  it('retourne label sous marché pour 70', () => {
    expect(getCompaRatioLabel(70)).toBe('Sous le marché')
  })

  it('retourne label en dessous médiane pour 88', () => {
    expect(getCompaRatioLabel(88)).toBe('En dessous médiane')
  })

  it('retourne label au-dessus pour 115', () => {
    expect(getCompaRatioLabel(115)).toBe('Au-dessus médiane')
  })
})

// ── 4. POSITION DANS LA FOURCHETTE ───────────────────────────

describe('computeRangePosition', () => {
  const grade = { min_salary: 500000, mid_salary: 700000, max_salary: 900000 }

  it('retourne 0% au minimum', () => {
    expect(computeRangePosition(500000, grade)).toBe(0)
  })

  it('retourne 100% au maximum', () => {
    expect(computeRangePosition(900000, grade)).toBe(100)
  })

  it('retourne 50% au milieu', () => {
    expect(computeRangePosition(700000, grade)).toBe(50)
  })

  it('retourne null si pas de grade', () => {
    expect(computeRangePosition(500000, null)).toBeNull()
  })

  it('retourne null si pas de salaire', () => {
    expect(computeRangePosition(null, grade)).toBeNull()
  })

  it('clamp à 0 si sous le minimum', () => {
    expect(computeRangePosition(100000, grade)).toBe(0)
  })

  it('clamp à 100 si au-dessus du max', () => {
    expect(computeRangePosition(1200000, grade)).toBe(100)
  })
})

describe('computeCompaRatio', () => {
  const grade = { mid_salary: 700000 }

  it('retourne 100 quand salaire = médian', () => {
    expect(computeCompaRatio(700000, grade)).toBeCloseTo(100)
  })

  it('retourne null si pas de grade', () => {
    expect(computeCompaRatio(700000, null)).toBeNull()
  })

  it('retourne null si pas de salaire', () => {
    expect(computeCompaRatio(null, grade)).toBeNull()
  })

  it('calcule correctement au-dessus du médian', () => {
    expect(computeCompaRatio(840000, grade)).toBeCloseTo(120)
  })
})

// ── 5. GAP MARCHÉ ─────────────────────────────────────────────

describe('computeMarketGap', () => {
  const benchmark = { p50: 800000 }

  it('retourne 0 quand aligné avec la médiane', () => {
    expect(computeMarketGap(800000, benchmark)).toBeCloseTo(0)
  })

  it('retourne positif si au-dessus', () => {
    expect(computeMarketGap(960000, benchmark)).toBeCloseTo(20)
  })

  it('retourne négatif si en dessous', () => {
    expect(computeMarketGap(640000, benchmark)).toBeCloseTo(-20)
  })

  it('retourne null si benchmark absent', () => {
    expect(computeMarketGap(800000, null)).toBeNull()
  })

  it('retourne null si salaire absent', () => {
    expect(computeMarketGap(null, benchmark)).toBeNull()
  })
})

describe('getMarketGapColor', () => {
  it('rouge si gap < -20%', () => {
    expect(getMarketGapColor(-25)).toBe('#EF4444')
  })

  it('orange si gap entre -20 et -5%', () => {
    expect(getMarketGapColor(-10)).toBe('#F59E0B')
  })

  it('vert si gap entre -5 et +10%', () => {
    expect(getMarketGapColor(0)).toBe('#10B981')
  })

  it('violet si gap > +10%', () => {
    expect(getMarketGapColor(15)).toBe('#8B5CF6')
  })

  it('gris si null', () => {
    expect(getMarketGapColor(null)).toBe('#6B7280')
  })
})
