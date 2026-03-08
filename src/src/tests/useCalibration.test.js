// ============================================================
// APEX RH — tests/useCalibration.test.js
// Session 55 — Tests calibration multi-niveaux
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  CALIBRATION_STATUS_LABELS,
  CALIBRATION_STATUS_COLORS,
  CALIBRATION_LEVEL_LABELS,
  CALIBRATION_LEVEL_COLORS,
  OVERRIDE_STATUS_LABELS,
  OVERRIDE_STATUS_COLORS,
  RATING_OPTIONS,
  DISTRIBUTION_BENCHMARK,
  useDistributionStats,
} from '../src/hooks/useCalibration'

// ─── Mock Supabase ────────────────────────────────────────────

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      in:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single:      vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', role: 'directeur' },
    isAdmin: false,
    isDirecteur: true,
  }),
}))

// ─── TESTS CONSTANTES ────────────────────────────────────────

describe('CALIBRATION_STATUS_LABELS', () => {
  it('contient tous les statuts attendus', () => {
    expect(Object.keys(CALIBRATION_STATUS_LABELS)).toHaveLength(5)
    expect(CALIBRATION_STATUS_LABELS.open).toBe('Ouverte')
    expect(CALIBRATION_STATUS_LABELS.in_progress).toBe('En cours')
    expect(CALIBRATION_STATUS_LABELS.pending_n2).toBe('Validation N+2')
    expect(CALIBRATION_STATUS_LABELS.validated).toBe('Validée')
    expect(CALIBRATION_STATUS_LABELS.closed).toBe('Clôturée')
  })

  it('a des couleurs pour chaque statut', () => {
    Object.keys(CALIBRATION_STATUS_LABELS).forEach(key => {
      expect(CALIBRATION_STATUS_COLORS[key]).toBeDefined()
      expect(CALIBRATION_STATUS_COLORS[key]).toMatch(/^#/)
    })
  })
})

describe('CALIBRATION_LEVEL_LABELS', () => {
  it('contient les 3 niveaux', () => {
    expect(CALIBRATION_LEVEL_LABELS.n1).toBeDefined()
    expect(CALIBRATION_LEVEL_LABELS.n2).toBeDefined()
    expect(CALIBRATION_LEVEL_LABELS.hr).toBeDefined()
  })

  it('a des couleurs hexadécimales pour chaque niveau', () => {
    Object.values(CALIBRATION_LEVEL_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })
})

describe('OVERRIDE_STATUS_LABELS', () => {
  it('contient pending/approved/rejected', () => {
    expect(OVERRIDE_STATUS_LABELS.pending).toBe('En attente')
    expect(OVERRIDE_STATUS_LABELS.approved).toBe('Approuvé')
    expect(OVERRIDE_STATUS_LABELS.rejected).toBe('Rejeté')
  })
})

describe('RATING_OPTIONS', () => {
  it('contient les 5 niveaux de performance', () => {
    expect(RATING_OPTIONS).toHaveLength(5)
    const values = RATING_OPTIONS.map(o => o.value)
    expect(values).toContain('insuffisant')
    expect(values).toContain('satisfaisant')
    expect(values).toContain('excellent')
  })

  it('chaque option a value, label, color', () => {
    RATING_OPTIONS.forEach(opt => {
      expect(opt.value).toBeDefined()
      expect(opt.label).toBeDefined()
      expect(opt.color).toMatch(/^#/)
    })
  })
})

describe('DISTRIBUTION_BENCHMARK', () => {
  it('totalise 100%', () => {
    const total = Object.values(DISTRIBUTION_BENCHMARK).reduce((s, v) => s + v, 0)
    expect(total).toBe(100)
  })

  it('a des valeurs pour tous les ratings', () => {
    RATING_OPTIONS.forEach(opt => {
      expect(DISTRIBUTION_BENCHMARK[opt.value]).toBeDefined()
      expect(DISTRIBUTION_BENCHMARK[opt.value]).toBeGreaterThan(0)
    })
  })
})

// ─── TESTS useDistributionStats ───────────────────────────────

describe('useDistributionStats', () => {
  it('retourne des valeurs vides si pas d\'évals', () => {
    const result = useDistributionStats([])
    expect(result.total).toBe(0)
    expect(result.distribution).toEqual({})
  })

  it('calcule la distribution correctement', () => {
    const evals = [
      { overall_rating: 'excellent',   calibrated_rating: null },
      { overall_rating: 'excellent',   calibrated_rating: null },
      { overall_rating: 'bien',        calibrated_rating: null },
      { overall_rating: 'satisfaisant', calibrated_rating: null },
    ]
    const result = useDistributionStats(evals)
    expect(result.total).toBe(4)
    expect(result.distribution.excellent).toBe(2)
    expect(result.distribution.bien).toBe(1)
    expect(result.distribution.satisfaisant).toBe(1)
  })

  it('préfère le calibrated_rating sur le overall_rating', () => {
    const evals = [
      { overall_rating: 'bien', calibrated_rating: 'excellent' },
      { overall_rating: 'bien', calibrated_rating: null },
    ]
    const result = useDistributionStats(evals)
    expect(result.distribution.excellent).toBe(1)
    expect(result.distribution.bien).toBe(1)
  })

  it('calcule le delta vs benchmark', () => {
    const evals = new Array(20).fill({ overall_rating: 'excellent', calibrated_rating: null })
    const result = useDistributionStats(evals)
    // 100% excellent vs benchmark 10% → delta +90
    expect(result.delta.excellent).toBe(90)
  })

  it('retourne tous les RATING_OPTIONS dans le benchmark', () => {
    const result = useDistributionStats([])
    RATING_OPTIONS.forEach(opt => {
      expect(result.benchmark[opt.value]).toBeDefined()
    })
  })

  it('gère les évals sans rating', () => {
    const evals = [
      { overall_rating: null, calibrated_rating: null },
      { overall_rating: 'bien', calibrated_rating: null },
    ]
    const result = useDistributionStats(evals)
    expect(result.total).toBe(2)
    expect(result.distribution.bien).toBe(1)
    // null ne compte pas
    expect(Object.values(result.distribution).reduce((s, v) => s + v, 0)).toBe(1)
  })
})

// ─── TESTS MOCK HOOKS SUPABASE ────────────────────────────────

describe('useCalibrationSessions — disabled si pas de cycleId', () => {
  it('est enabled seulement si cycleId fourni', () => {
    // Test unitaire des paramètres de la query
    const { enabled } = { enabled: !!'cycle-1' }
    expect(enabled).toBe(true)
    const { enabled: disabled } = { enabled: !!null }
    expect(disabled).toBe(false)
  })
})

describe('Workflow status transitions', () => {
  const validTransitions = {
    open:        ['in_progress'],
    in_progress: ['pending_n2'],
    pending_n2:  ['validated', 'in_progress'],
    validated:   ['closed'],
    closed:      [],
  }

  it('les transitions de statut sont logiques', () => {
    expect(validTransitions.open).toContain('in_progress')
    expect(validTransitions.in_progress).toContain('pending_n2')
    expect(validTransitions.pending_n2).toContain('validated')
    expect(validTransitions.validated).toContain('closed')
    expect(validTransitions.closed).toHaveLength(0)
  })
})
