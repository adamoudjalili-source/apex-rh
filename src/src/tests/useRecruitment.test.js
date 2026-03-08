// ============================================================
// APEX RH — tests/useRecruitment.test.js
// Session 59 — Tests hooks & helpers recrutement
// 38 tests
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  CONTRACT_TYPE_LABELS, CONTRACT_TYPE_COLORS,
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS,
  PIPELINE_STAGES, INTERVIEW_TYPE_LABELS, INTERVIEW_TYPE_COLORS,
  INTERVIEW_STATUS_LABELS, INTERVIEW_STATUS_COLORS,
  RECOMMENDATION_LABELS, RECOMMENDATION_COLORS,
  JOB_SOURCE_LABELS,
  formatSalaryRange, getStatusBadgeClass,
  computeConversionRate, getDaysOpen,
  isDeadlinePassed, isDeadlineSoon,
} from '../hooks/useRecruitment'

// ─── CONSTANTES ────────────────────────────────────────────────

describe('CONTRACT_TYPE_LABELS', () => {
  it('contient les 6 types de contrat', () => {
    expect(Object.keys(CONTRACT_TYPE_LABELS)).toHaveLength(6)
  })
  it('CDI est correctement libellé', () => {
    expect(CONTRACT_TYPE_LABELS.cdi).toBe('CDI')
  })
  it('stage est correctement libellé', () => {
    expect(CONTRACT_TYPE_LABELS.stage).toBe('Stage')
  })
  it('freelance est correctement libellé', () => {
    expect(CONTRACT_TYPE_LABELS.freelance).toBe('Freelance')
  })
})

describe('CONTRACT_TYPE_COLORS', () => {
  it('chaque type a une couleur hex', () => {
    Object.values(CONTRACT_TYPE_COLORS).forEach(c => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
  it('CDI est vert (embauche stable)', () => {
    expect(CONTRACT_TYPE_COLORS.cdi).toBe('#10B981')
  })
})

describe('APPLICATION_STATUS_LABELS', () => {
  it('contient les 9 statuts de pipeline', () => {
    expect(Object.keys(APPLICATION_STATUS_LABELS)).toHaveLength(9)
  })
  it('nouveau est libellé', () => {
    expect(APPLICATION_STATUS_LABELS.nouveau).toBe('Nouveau')
  })
  it('accepte est libellé', () => {
    expect(APPLICATION_STATUS_LABELS.accepte).toBe('Accepté')
  })
  it('refuse est libellé', () => {
    expect(APPLICATION_STATUS_LABELS.refuse).toBe('Refusé')
  })
})

describe('PIPELINE_STAGES', () => {
  it('contient 7 étapes actives', () => {
    expect(PIPELINE_STAGES).toHaveLength(7)
  })
  it('première étape est nouveau', () => {
    expect(PIPELINE_STAGES[0].status).toBe('nouveau')
  })
  it('dernière étape active est accepte', () => {
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1].status).toBe('accepte')
  })
  it('chaque étape a status, label et color', () => {
    PIPELINE_STAGES.forEach(s => {
      expect(s.status).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.color).toMatch(/^#/)
    })
  })
})

describe('INTERVIEW_TYPE_LABELS', () => {
  it('contient les 6 types d\'entretien', () => {
    expect(Object.keys(INTERVIEW_TYPE_LABELS)).toHaveLength(6)
  })
  it('visio est correctement libellé', () => {
    expect(INTERVIEW_TYPE_LABELS.visio).toBe('Visioconférence')
  })
  it('rh est correctement libellé', () => {
    expect(INTERVIEW_TYPE_LABELS.rh).toBe('RH')
  })
})

describe('RECOMMENDATION_LABELS', () => {
  it('contient les 5 niveaux de recommandation', () => {
    expect(Object.keys(RECOMMENDATION_LABELS)).toHaveLength(5)
  })
  it('fort_oui est positif', () => {
    expect(RECOMMENDATION_LABELS.fort_oui).toContain('Fortement')
  })
  it('fort_non est négatif', () => {
    expect(RECOMMENDATION_LABELS.fort_non).toContain('Fortement')
    expect(RECOMMENDATION_COLORS.fort_non).toBe('#EF4444')
  })
})

// ─── FORMATTERS ──────────────────────────────────────────────

describe('formatSalaryRange', () => {
  it('retourne "Non communiqué" si min et max sont null', () => {
    expect(formatSalaryRange(null, null)).toBe('Non communiqué')
  })
  it('formate min et max en FCFA', () => {
    const result = formatSalaryRange(500000, 800000, 'XOF')
    expect(result).toContain('500k')
    expect(result).toContain('800k')
    expect(result).toContain('FCFA')
  })
  it('formate uniquement min si max est null', () => {
    const result = formatSalaryRange(300000, null, 'XOF')
    expect(result).toContain('partir de')
    expect(result).toContain('300k')
  })
  it('formate uniquement max si min est null', () => {
    const result = formatSalaryRange(null, 600000, 'XOF')
    expect(result).toContain("jusqu'à" || "Jusqu'à")
  })
  it('formate EUR correctement', () => {
    const result = formatSalaryRange(2000, 3000, 'EUR')
    expect(result).toContain('€')
  })
})

describe('computeConversionRate', () => {
  it('retourne 0 si total est 0', () => {
    expect(computeConversionRate(0, 0)).toBe(0)
  })
  it('retourne 0 si total est null', () => {
    expect(computeConversionRate(null, 0)).toBe(0)
  })
  it('calcule correctement le taux', () => {
    expect(computeConversionRate(10, 2)).toBe(20)
    expect(computeConversionRate(4, 1)).toBe(25)
    expect(computeConversionRate(3, 3)).toBe(100)
  })
  it('arrondit au nombre entier', () => {
    expect(computeConversionRate(3, 1)).toBe(33)
  })
})

describe('getDaysOpen', () => {
  it('retourne null si publishedAt est absent', () => {
    expect(getDaysOpen(null)).toBeNull()
  })
  it('retourne un nombre positif de jours', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const days = getDaysOpen(pastDate)
    expect(days).toBeGreaterThanOrEqual(4)
    expect(days).toBeLessThanOrEqual(6)
  })
  it('calcule les jours entre deux dates', () => {
    const start = '2026-01-01T00:00:00.000Z'
    const end = '2026-01-11T00:00:00.000Z'
    expect(getDaysOpen(start, end)).toBe(10)
  })
})

describe('isDeadlinePassed', () => {
  it('retourne false si deadline est null', () => {
    expect(isDeadlinePassed(null)).toBe(false)
  })
  it('retourne true pour une date passée', () => {
    expect(isDeadlinePassed('2020-01-01')).toBe(true)
  })
  it('retourne false pour une date future', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    expect(isDeadlinePassed(future)).toBe(false)
  })
})

describe('isDeadlineSoon', () => {
  it('retourne false si deadline est null', () => {
    expect(isDeadlineSoon(null)).toBe(false)
  })
  it('retourne false pour une date passée', () => {
    expect(isDeadlineSoon('2020-01-01')).toBe(false)
  })
  it('retourne true si deadline dans 3 jours (défaut 7 jours)', () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    expect(isDeadlineSoon(soon)).toBe(true)
  })
  it('retourne false si deadline dans 30 jours', () => {
    const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    expect(isDeadlineSoon(far)).toBe(false)
  })
  it('respecte le paramètre days personnalisé', () => {
    const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    expect(isDeadlineSoon(soon, 20)).toBe(true)
    expect(isDeadlineSoon(soon, 5)).toBe(false)
  })
})

describe('getStatusBadgeClass', () => {
  it('retourne une couleur valide pour un statut connu', () => {
    const color = getStatusBadgeClass('nouveau')
    expect(color).toMatch(/^#/)
  })
  it('retourne une couleur par défaut pour statut inconnu', () => {
    const color = getStatusBadgeClass('inconnu')
    expect(color).toBe('#6B7280')
  })
  it('accepte est vert', () => {
    expect(getStatusBadgeClass('accepte')).toBe('#059669')
  })
  it('refuse est rouge', () => {
    expect(getStatusBadgeClass('refuse')).toBe('#EF4444')
  })
})
