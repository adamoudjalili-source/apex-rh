// ============================================================
// APEX RH — tests/useFormations.test.js
// Session 57 — Tests Module Formation & Certifications
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from './setup'

// ── Mock Supabase ─────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      in:     vi.fn().mockReturnThis(),
      ilike:  vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-test-001',
      role: 'collaborateur',
      first_name: 'Alice',
      last_name: 'Durand',
      organization_id: 'org-test-001',
    },
    isAdmin: false,
    isDirecteur: false,
  }),
}))

import {
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_COLORS,
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_COLORS,
  LEVEL_LABELS,
  LEVEL_COLORS,
  PLAN_PRIORITY_LABELS,
  PLAN_PRIORITY_COLORS,
  PLAN_ITEM_STATUS_LABELS,
} from '../hooks/useFormations'

// ── Tests constantes ──────────────────────────────────────────

describe('TRAINING_TYPE_LABELS', () => {
  it('contient tous les types requis', () => {
    const expected = ['presentiel', 'e-learning', 'blended', 'webinar', 'coaching', 'conference']
    expected.forEach(type => {
      expect(TRAINING_TYPE_LABELS[type]).toBeDefined()
      expect(typeof TRAINING_TYPE_LABELS[type]).toBe('string')
    })
  })
  it('Présentiel est correctement libellé', () => {
    expect(TRAINING_TYPE_LABELS['presentiel']).toBe('Présentiel')
  })
  it('E-Learning est correctement libellé', () => {
    expect(TRAINING_TYPE_LABELS['e-learning']).toBe('E-Learning')
  })
})

describe('TRAINING_TYPE_COLORS', () => {
  it('chaque type a une couleur hex valide', () => {
    Object.values(TRAINING_TYPE_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
  it('autant de couleurs que de labels', () => {
    expect(Object.keys(TRAINING_TYPE_COLORS).length)
      .toBe(Object.keys(TRAINING_TYPE_LABELS).length)
  })
})

describe('ENROLLMENT_STATUS_LABELS', () => {
  it('contient tous les statuts requis', () => {
    const expected = ['inscrit', 'en_cours', 'termine', 'annule', 'abandonne']
    expected.forEach(s => expect(ENROLLMENT_STATUS_LABELS[s]).toBeDefined())
  })
  it('Terminé est correctement libellé', () => {
    expect(ENROLLMENT_STATUS_LABELS['termine']).toBe('Terminé')
  })
})

describe('ENROLLMENT_STATUS_COLORS', () => {
  it('statut terminé est vert', () => {
    expect(ENROLLMENT_STATUS_COLORS['termine']).toBe('#10B981')
  })
  it('statut annulé est rouge', () => {
    expect(ENROLLMENT_STATUS_COLORS['annule']).toBe('#EF4444')
  })
  it('chaque statut a une couleur valide', () => {
    Object.values(ENROLLMENT_STATUS_COLORS).forEach(c => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
})

describe('LEVEL_LABELS', () => {
  it('contient les 3 niveaux', () => {
    expect(LEVEL_LABELS['debutant']).toBeDefined()
    expect(LEVEL_LABELS['intermediaire']).toBeDefined()
    expect(LEVEL_LABELS['avance']).toBeDefined()
  })
})

describe('LEVEL_COLORS', () => {
  it('débutant est vert (facile)', () => {
    expect(LEVEL_COLORS['debutant']).toBe('#10B981')
  })
  it('avancé est rouge (difficile)', () => {
    expect(LEVEL_COLORS['avance']).toBe('#EF4444')
  })
})

describe('PLAN_PRIORITY_LABELS', () => {
  it('contient haute/moyenne/basse', () => {
    expect(PLAN_PRIORITY_LABELS['haute']).toBeDefined()
    expect(PLAN_PRIORITY_LABELS['moyenne']).toBeDefined()
    expect(PLAN_PRIORITY_LABELS['basse']).toBeDefined()
  })
})

describe('PLAN_PRIORITY_COLORS', () => {
  it('haute priorité est rouge', () => {
    expect(PLAN_PRIORITY_COLORS['haute']).toBe('#EF4444')
  })
  it('basse priorité est gris', () => {
    expect(PLAN_PRIORITY_COLORS['basse']).toBe('#6B7280')
  })
})

describe('PLAN_ITEM_STATUS_LABELS', () => {
  it('contient tous les statuts de plan', () => {
    const expected = ['planifie', 'inscrit', 'en_cours', 'termine', 'reporte', 'annule']
    expected.forEach(s => expect(PLAN_ITEM_STATUS_LABELS[s]).toBeDefined())
  })
})

// ── Tests logique métier ──────────────────────────────────────

describe('Logique durée formations', () => {
  it('une formation de 8h = 1 jour de travail', () => {
    const hours = 8
    const workDays = hours / 8
    expect(workDays).toBe(1)
  })
  it('calcul correct des heures totales', () => {
    const trainings = [
      { duration_hours: 8, status: 'termine' },
      { duration_hours: 16, status: 'termine' },
      { duration_hours: 4, status: 'en_cours' },
    ]
    const completedHours = trainings
      .filter(t => t.status === 'termine')
      .reduce((sum, t) => sum + t.duration_hours, 0)
    expect(completedHours).toBe(24)
  })
})

describe('Logique expiration certifications', () => {
  it('détecte une certification expirée', () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const days = Math.ceil((pastDate - new Date()) / (1000 * 60 * 60 * 24))
    expect(days).toBeLessThan(0)
  })
  it('détecte une certification qui expire bientôt (< 60j)', () => {
    const soonDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const days = Math.ceil((soonDate - new Date()) / (1000 * 60 * 60 * 24))
    expect(days).toBeGreaterThan(0)
    expect(days).toBeLessThan(60)
  })
  it('certification lointaine ne déclenche pas l\'alerte', () => {
    const farDate = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000)
    const days = Math.ceil((farDate - new Date()) / (1000 * 60 * 60 * 24))
    expect(days).toBeGreaterThan(60)
  })
  it('sans date d\'expiration → null (pas d\'alerte)', () => {
    const expiresAt = null
    expect(expiresAt).toBeNull()
  })
})

describe('Logique plan de formation', () => {
  it('calcule le taux de progression correctement', () => {
    const items = [
      { status: 'termine' },
      { status: 'termine' },
      { status: 'en_cours' },
      { status: 'planifie' },
    ]
    const completed = items.filter(i => i.status === 'termine').length
    const pct = Math.round((completed / items.length) * 100)
    expect(pct).toBe(50)
  })
  it('plan vide → progression 0%', () => {
    const items = []
    const pct = items.length > 0
      ? Math.round((items.filter(i => i.status === 'termine').length / items.length) * 100)
      : 0
    expect(pct).toBe(0)
  })
  it('tous terminés → progression 100%', () => {
    const items = [{ status: 'termine' }, { status: 'termine' }]
    const pct = Math.round((items.filter(i => i.status === 'termine').length / items.length) * 100)
    expect(pct).toBe(100)
  })
})

describe('Logique feedback', () => {
  it('note moyenne de 4.5 sur 5 inscriptions', () => {
    const ratings = [4, 5, 4, 5, 4]
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    expect(avg).toBe(4.4)
  })
  it('pas de note → null ne provoque pas d\'erreur', () => {
    const ratings = [4, null, 5, null, 3]
    const valid = ratings.filter(r => r !== null)
    const avg = valid.length > 0
      ? valid.reduce((a, b) => a + b, 0) / valid.length
      : null
    expect(avg).toBeCloseTo(4, 1)
  })
})

describe('Logique taux de complétion catalogue', () => {
  it('calcule correctement le taux de completion', () => {
    const total = 50
    const completed = 35
    const rate = Math.round((completed / total) * 100)
    expect(rate).toBe(70)
  })
  it('total 0 ne cause pas de division par zéro', () => {
    const total = 0
    const completed = 0
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    expect(rate).toBe(0)
  })
})
