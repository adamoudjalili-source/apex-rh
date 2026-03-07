// ============================================================
// APEX RH — src/tests/useAnnualReviews.test.js
// Session 60 — Tests unitaires Entretiens annuels
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  ANNUAL_REVIEW_STATUS,
  ANNUAL_REVIEW_STATUS_LABELS,
  ANNUAL_REVIEW_STATUS_COLORS,
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
  OVERALL_RATING_SCORES,
  SALARY_RECOMMENDATION_LABELS,
  SALARY_RECOMMENDATION_COLORS,
  CAMPAIGN_STATUS_LABELS,
  DEFAULT_TEMPLATE_SECTIONS,
  getReviewStatusOrder,
  isReviewEditable,
  computeSelfScore,
  computeManagerScore,
  ratingToScore,
  scoreToRating,
  formatReviewYear,
  getReviewProgress,
  isSignedByEmployee,
  isSignedByManager,
  isFullySigned,
  getDaysUntilDeadline,
  isDeadlineOverdue,
  isDeadlineSoon,
} from '../hooks/useAnnualReviews'

// ─── Constantes ───────────────────────────────────────────────

describe('ANNUAL_REVIEW_STATUS', () => {
  it('has all required statuses', () => {
    const statuses = ['pending', 'self_in_progress', 'self_submitted', 'meeting_scheduled', 'manager_in_progress', 'completed', 'signed', 'archived']
    statuses.forEach(s => expect(ANNUAL_REVIEW_STATUS[s]).toBe(s))
  })

  it('has 8 statuses', () => {
    expect(Object.keys(ANNUAL_REVIEW_STATUS)).toHaveLength(8)
  })
})

describe('ANNUAL_REVIEW_STATUS_LABELS', () => {
  it('has a label for every status', () => {
    Object.keys(ANNUAL_REVIEW_STATUS).forEach(s => {
      expect(ANNUAL_REVIEW_STATUS_LABELS[s]).toBeTruthy()
    })
  })

  it('pending → En attente', () => {
    expect(ANNUAL_REVIEW_STATUS_LABELS.pending).toBe('En attente')
  })

  it('signed → Signé', () => {
    expect(ANNUAL_REVIEW_STATUS_LABELS.signed).toBe('Signé')
  })
})

describe('ANNUAL_REVIEW_STATUS_COLORS', () => {
  it('has a hex color for every status', () => {
    Object.keys(ANNUAL_REVIEW_STATUS).forEach(s => {
      expect(ANNUAL_REVIEW_STATUS_COLORS[s]).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })
})

describe('OVERALL_RATING_LABELS', () => {
  it('has 5 ratings', () => {
    expect(Object.keys(OVERALL_RATING_LABELS)).toHaveLength(5)
  })

  it('includes excellent → Excellent', () => {
    expect(OVERALL_RATING_LABELS.excellent).toBe('Excellent')
  })

  it('includes insuffisant → Insuffisant', () => {
    expect(OVERALL_RATING_LABELS.insuffisant).toBe('Insuffisant')
  })
})

describe('OVERALL_RATING_SCORES', () => {
  it('excellent = 5', () => expect(OVERALL_RATING_SCORES.excellent).toBe(5))
  it('bien = 4', () => expect(OVERALL_RATING_SCORES.bien).toBe(4))
  it('satisfaisant = 3', () => expect(OVERALL_RATING_SCORES.satisfaisant).toBe(3))
  it('a_ameliorer = 2', () => expect(OVERALL_RATING_SCORES.a_ameliorer).toBe(2))
  it('insuffisant = 1', () => expect(OVERALL_RATING_SCORES.insuffisant).toBe(1))
})

describe('SALARY_RECOMMENDATION_LABELS', () => {
  it('has 5 recommendations', () => {
    expect(Object.keys(SALARY_RECOMMENDATION_LABELS)).toHaveLength(5)
  })

  it('includes maintien', () => {
    expect(SALARY_RECOMMENDATION_LABELS.maintien).toBe('Maintien')
  })

  it('includes gel', () => {
    expect(SALARY_RECOMMENDATION_LABELS.gel).toBe('Gel')
  })
})

describe('DEFAULT_TEMPLATE_SECTIONS', () => {
  it('has 5 sections', () => {
    expect(DEFAULT_TEMPLATE_SECTIONS).toHaveLength(5)
  })

  it('first section is bilan', () => {
    expect(DEFAULT_TEMPLATE_SECTIONS[0].id).toBe('bilan')
  })

  it('each section has id, title, type, questions', () => {
    DEFAULT_TEMPLATE_SECTIONS.forEach(s => {
      expect(s.id).toBeTruthy()
      expect(s.title).toBeTruthy()
      expect(s.type).toBeTruthy()
      expect(Array.isArray(s.questions)).toBe(true)
    })
  })

  it('competences section has 6 competencies', () => {
    const compSection = DEFAULT_TEMPLATE_SECTIONS.find(s => s.id === 'competences')
    expect(compSection?.questions).toHaveLength(6)
  })
})

// ─── getReviewStatusOrder ─────────────────────────────────────

describe('getReviewStatusOrder', () => {
  it('pending is 0', () => expect(getReviewStatusOrder('pending')).toBe(0))
  it('signed is 6', () => expect(getReviewStatusOrder('signed')).toBe(6))
  it('archived is 7', () => expect(getReviewStatusOrder('archived')).toBe(7))
  it('unknown status returns -1', () => expect(getReviewStatusOrder('unknown')).toBe(-1))
  it('order is strictly increasing', () => {
    const statuses = ['pending', 'self_in_progress', 'self_submitted', 'meeting_scheduled', 'manager_in_progress', 'completed', 'signed', 'archived']
    for (let i = 1; i < statuses.length; i++) {
      expect(getReviewStatusOrder(statuses[i])).toBeGreaterThan(getReviewStatusOrder(statuses[i - 1]))
    }
  })
})

// ─── isReviewEditable ─────────────────────────────────────────

describe('isReviewEditable', () => {
  const employeeId = 'emp-123'
  const managerId  = 'mgr-456'

  it('employee can edit pending review', () => {
    expect(isReviewEditable({ employee_id: employeeId, manager_id: managerId, status: 'pending' }, employeeId)).toBe(true)
  })

  it('employee can edit self_in_progress review', () => {
    expect(isReviewEditable({ employee_id: employeeId, manager_id: managerId, status: 'self_in_progress' }, employeeId)).toBe(true)
  })

  it('employee cannot edit self_submitted review', () => {
    expect(isReviewEditable({ employee_id: employeeId, manager_id: managerId, status: 'self_submitted' }, employeeId)).toBe(false)
  })

  it('manager can edit self_submitted review', () => {
    expect(isReviewEditable({ employee_id: employeeId, manager_id: managerId, status: 'self_submitted' }, managerId)).toBe(true)
  })

  it('manager can edit manager_in_progress review', () => {
    expect(isReviewEditable({ employee_id: employeeId, manager_id: managerId, status: 'manager_in_progress' }, managerId)).toBe(true)
  })

  it('manager cannot edit signed review', () => {
    expect(isReviewEditable({ employee_id: employeeId, manager_id: managerId, status: 'signed' }, managerId)).toBe(false)
  })

  it('returns false for null review', () => {
    expect(isReviewEditable(null, employeeId)).toBe(false)
  })

  it('returns false for null userId', () => {
    expect(isReviewEditable({ employee_id: employeeId, manager_id: managerId, status: 'pending' }, null)).toBe(false)
  })
})

// ─── computeSelfScore ─────────────────────────────────────────

describe('computeSelfScore', () => {
  it('returns average of competences ratings', () => {
    const selfEval = {
      competences: { qualite: 4, delais: 5, communication: 3 }
    }
    expect(computeSelfScore(selfEval)).toBe(4.0)
  })

  it('returns null for missing competences', () => {
    expect(computeSelfScore({ bilan: {} })).toBeNull()
  })

  it('returns null for null input', () => {
    expect(computeSelfScore(null)).toBeNull()
  })

  it('rounds to 1 decimal', () => {
    const selfEval = { competences: { qualite: 4, delais: 5 } }
    expect(computeSelfScore(selfEval)).toBe(4.5)
  })

  it('ignores non-numeric values', () => {
    const selfEval = { competences: { qualite: 4, delais: 'bad' } }
    expect(computeSelfScore(selfEval)).toBe(4.0)
  })
})

// ─── computeManagerScore ─────────────────────────────────────

describe('computeManagerScore', () => {
  it('returns average', () => {
    const eval_ = { competences: { qualite: 5, delais: 5, communication: 5 } }
    expect(computeManagerScore(eval_)).toBe(5.0)
  })

  it('returns null if no competences', () => {
    expect(computeManagerScore({})).toBeNull()
  })
})

// ─── ratingToScore / scoreToRating ───────────────────────────

describe('ratingToScore', () => {
  it('excellent → 5', () => expect(ratingToScore('excellent')).toBe(5))
  it('insuffisant → 1', () => expect(ratingToScore('insuffisant')).toBe(1))
  it('unknown → null', () => expect(ratingToScore('unknown')).toBeNull())
})

describe('scoreToRating', () => {
  it('5 → excellent', () => expect(scoreToRating(5)).toBe('excellent'))
  it('4.5 → excellent', () => expect(scoreToRating(4.5)).toBe('excellent'))
  it('4 → bien', () => expect(scoreToRating(4)).toBe('bien'))
  it('3 → satisfaisant', () => expect(scoreToRating(3)).toBe('satisfaisant'))
  it('2 → a_ameliorer', () => expect(scoreToRating(2)).toBe('a_ameliorer'))
  it('1 → insuffisant', () => expect(scoreToRating(1)).toBe('insuffisant'))
  it('null → null', () => expect(scoreToRating(null)).toBeNull())
})

// ─── formatReviewYear ─────────────────────────────────────────

describe('formatReviewYear', () => {
  it('formats year label', () => {
    expect(formatReviewYear(2025)).toBe('Entretien 2025')
  })

  it('handles string year', () => {
    expect(formatReviewYear('2024')).toBe('Entretien 2024')
  })
})

// ─── getReviewProgress ───────────────────────────────────────

describe('getReviewProgress', () => {
  it('pending → 0', () => expect(getReviewProgress({ status: 'pending' })).toBe(0))
  it('self_in_progress → 15', () => expect(getReviewProgress({ status: 'self_in_progress' })).toBe(15))
  it('self_submitted → 35', () => expect(getReviewProgress({ status: 'self_submitted' })).toBe(35))
  it('signed → 100', () => expect(getReviewProgress({ status: 'signed' })).toBe(100))
  it('archived → 100', () => expect(getReviewProgress({ status: 'archived' })).toBe(100))
  it('null review → 0', () => expect(getReviewProgress(null)).toBe(0))
})

// ─── Signature helpers ───────────────────────────────────────

describe('isSignedByEmployee', () => {
  it('returns true when employee_signed_at is set', () => {
    expect(isSignedByEmployee({ employee_signed_at: '2025-01-01T10:00:00Z' })).toBe(true)
  })

  it('returns false when not set', () => {
    expect(isSignedByEmployee({ employee_signed_at: null })).toBe(false)
  })
})

describe('isSignedByManager', () => {
  it('returns true when manager_signed_at is set', () => {
    expect(isSignedByManager({ manager_signed_at: '2025-01-01T10:00:00Z' })).toBe(true)
  })

  it('returns false when not set', () => {
    expect(isSignedByManager({ manager_signed_at: null })).toBe(false)
  })
})

describe('isFullySigned', () => {
  it('true when both signed', () => {
    expect(isFullySigned({
      employee_signed_at: '2025-01-01T10:00:00Z',
      manager_signed_at: '2025-01-02T10:00:00Z',
    })).toBe(true)
  })

  it('false when only employee signed', () => {
    expect(isFullySigned({ employee_signed_at: '2025-01-01T10:00:00Z', manager_signed_at: null })).toBe(false)
  })

  it('false when neither signed', () => {
    expect(isFullySigned({ employee_signed_at: null, manager_signed_at: null })).toBe(false)
  })
})

// ─── Deadline helpers ────────────────────────────────────────

describe('getDaysUntilDeadline', () => {
  it('returns null for null deadline', () => {
    expect(getDaysUntilDeadline(null)).toBeNull()
  })

  it('returns negative number for past deadline', () => {
    const past = new Date(Date.now() - 3 * 86400000).toISOString()
    expect(getDaysUntilDeadline(past)).toBeLessThan(0)
  })

  it('returns positive number for future deadline', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString()
    expect(getDaysUntilDeadline(future)).toBeGreaterThan(0)
  })
})

describe('isDeadlineOverdue', () => {
  it('returns true for past deadline', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(isDeadlineOverdue(past)).toBe(true)
  })

  it('returns false for future deadline', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isDeadlineOverdue(future)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isDeadlineOverdue(null)).toBe(false)
  })
})

describe('isDeadlineSoon', () => {
  it('returns true for deadline in 3 days (within 7-day window)', () => {
    const soon = new Date(Date.now() + 3 * 86400000).toISOString()
    expect(isDeadlineSoon(soon)).toBe(true)
  })

  it('returns false for deadline in 10 days', () => {
    const far = new Date(Date.now() + 10 * 86400000).toISOString()
    expect(isDeadlineSoon(far)).toBe(false)
  })

  it('returns false for overdue deadline', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(isDeadlineSoon(past)).toBe(false)
  })

  it('respects custom days parameter', () => {
    const days5 = new Date(Date.now() + 5 * 86400000).toISOString()
    expect(isDeadlineSoon(days5, 3)).toBe(false)
    expect(isDeadlineSoon(days5, 7)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isDeadlineSoon(null)).toBe(false)
  })
})
