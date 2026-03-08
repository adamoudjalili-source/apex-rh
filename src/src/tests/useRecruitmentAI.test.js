// ============================================================
// APEX RH — tests/useRecruitmentAI.test.js
// Session 61 — Tests hooks & helpers IA Recrutement
// 38 tests
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  AI_RECOMMENDATION_LABELS,
  AI_RECOMMENDATION_COLORS,
  AI_RECOMMENDATION_BG,
  SCORE_AXES_LABELS,
  SCORE_AXES_COLORS,
  getRecommendationLabel,
  scoreToColor,
  getScoreLevel,
  computeOverallScore,
  rankCandidates,
  filterByMinScore,
  scoreToRecommendation,
  getAnalysisRate,
  computeScoreStats,
} from '../hooks/useRecruitmentAI'

// ─── CONSTANTES ────────────────────────────────────────────────

describe('AI_RECOMMENDATION_LABELS', () => {
  it('contient les 5 recommandations', () => {
    expect(Object.keys(AI_RECOMMENDATION_LABELS)).toHaveLength(5)
  })
  it('strongly_recommend est libellé en français', () => {
    expect(AI_RECOMMENDATION_LABELS.strongly_recommend).toBe('Fortement recommandé')
  })
  it('strong_reject est libellé en français', () => {
    expect(AI_RECOMMENDATION_LABELS.strong_reject).toBe('Rejeté')
  })
  it('neutral est libellé en français', () => {
    expect(AI_RECOMMENDATION_LABELS.neutral).toBe('Neutre')
  })
})

describe('AI_RECOMMENDATION_COLORS', () => {
  it('chaque recommandation a une couleur hex', () => {
    Object.values(AI_RECOMMENDATION_COLORS).forEach(c => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
  it('strongly_recommend est vert', () => {
    expect(AI_RECOMMENDATION_COLORS.strongly_recommend).toBe('#10B981')
  })
  it('strong_reject est rouge', () => {
    expect(AI_RECOMMENDATION_COLORS.strong_reject).toBe('#EF4444')
  })
})

describe('AI_RECOMMENDATION_BG', () => {
  it('contient les 5 recommandations', () => {
    expect(Object.keys(AI_RECOMMENDATION_BG)).toHaveLength(5)
  })
  it('toutes les valeurs sont des strings rgba', () => {
    Object.values(AI_RECOMMENDATION_BG).forEach(bg => {
      expect(bg).toMatch(/^rgba\(/)
    })
  })
})

describe('SCORE_AXES_LABELS', () => {
  it('contient les 4 axes', () => {
    expect(Object.keys(SCORE_AXES_LABELS)).toHaveLength(4)
  })
  it('skills est libellé "Compétences"', () => {
    expect(SCORE_AXES_LABELS.skills).toBe('Compétences')
  })
  it('motivation est libellé "Motivation"', () => {
    expect(SCORE_AXES_LABELS.motivation).toBe('Motivation')
  })
})

// ─── HELPERS ──────────────────────────────────────────────────

describe('getRecommendationLabel', () => {
  it('retourne le label pour recommend', () => {
    expect(getRecommendationLabel('recommend')).toBe('Recommandé')
  })
  it('retourne "Inconnu" pour une valeur inconnue', () => {
    expect(getRecommendationLabel('unknown_value')).toBe('Inconnu')
  })
})

describe('scoreToColor', () => {
  it('retourne gris pour null', () => {
    expect(scoreToColor(null)).toBe('#6B7280')
  })
  it('retourne vert pour score >= 85', () => {
    expect(scoreToColor(90)).toBe('#10B981')
    expect(scoreToColor(85)).toBe('#10B981')
  })
  it('retourne bleu pour 70-84', () => {
    expect(scoreToColor(75)).toBe('#3B82F6')
    expect(scoreToColor(70)).toBe('#3B82F6')
  })
  it('retourne ambre pour 55-69', () => {
    expect(scoreToColor(60)).toBe('#F59E0B')
  })
  it('retourne orange pour 40-54', () => {
    expect(scoreToColor(45)).toBe('#F97316')
  })
  it('retourne rouge pour < 40', () => {
    expect(scoreToColor(20)).toBe('#EF4444')
    expect(scoreToColor(0)).toBe('#EF4444')
  })
})

describe('getScoreLevel', () => {
  it('retourne "Non analysé" pour null', () => {
    expect(getScoreLevel(null).label).toBe('Non analysé')
  })
  it('retourne "Excellent" pour >= 85', () => {
    expect(getScoreLevel(92).label).toBe('Excellent')
  })
  it('retourne "Bon profil" pour 70-84', () => {
    expect(getScoreLevel(78).label).toBe('Bon profil')
  })
  it('retourne "Correct" pour 55-69', () => {
    expect(getScoreLevel(62).label).toBe('Correct')
  })
  it('retourne "Faible" pour 40-54', () => {
    expect(getScoreLevel(48).label).toBe('Faible')
  })
  it('retourne "Insuffisant" pour < 40', () => {
    expect(getScoreLevel(30).label).toBe('Insuffisant')
  })
  it('retourne toujours une couleur hex', () => {
    [0, 30, 50, 65, 75, 90].forEach(s => {
      expect(getScoreLevel(s).color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
})

describe('computeOverallScore', () => {
  it('retourne 0 pour null', () => {
    expect(computeOverallScore(null)).toBe(0)
  })
  it('calcule correctement la moyenne pondérée', () => {
    const breakdown = { skills: 100, experience: 100, education: 100, motivation: 100 }
    expect(computeOverallScore(breakdown)).toBe(100)
  })
  it('applique la pondération skills×40%', () => {
    const breakdown = { skills: 100, experience: 0, education: 0, motivation: 0 }
    expect(computeOverallScore(breakdown)).toBe(40)
  })
  it('applique la pondération experience×30%', () => {
    const breakdown = { skills: 0, experience: 100, education: 0, motivation: 0 }
    expect(computeOverallScore(breakdown)).toBe(30)
  })
  it('applique la pondération education×15%', () => {
    const breakdown = { skills: 0, experience: 0, education: 100, motivation: 0 }
    expect(computeOverallScore(breakdown)).toBe(15)
  })
  it('applique la pondération motivation×15%', () => {
    const breakdown = { skills: 0, experience: 0, education: 0, motivation: 100 }
    expect(computeOverallScore(breakdown)).toBe(15)
  })
  it('calcule un score réaliste', () => {
    const breakdown = { skills: 80, experience: 70, education: 90, motivation: 75 }
    // 80×0.4 + 70×0.3 + 90×0.15 + 75×0.15 = 32+21+13.5+11.25 = 77.75 → 78
    expect(computeOverallScore(breakdown)).toBe(78)
  })
})

describe('rankCandidates', () => {
  it('retourne [] pour un tableau vide', () => {
    expect(rankCandidates([])).toEqual([])
  })
  it('retourne [] pour null', () => {
    expect(rankCandidates(null)).toEqual([])
  })
  it('trie par score décroissant', () => {
    const list = [
      { id: 'a', overall_score: 60 },
      { id: 'b', overall_score: 90 },
      { id: 'c', overall_score: 75 },
    ]
    const ranked = rankCandidates(list)
    expect(ranked[0].id).toBe('b')
    expect(ranked[1].id).toBe('c')
    expect(ranked[2].id).toBe('a')
  })
  it('place les non-analysés en dernier (score null → -1)', () => {
    const list = [
      { id: 'a', overall_score: null },
      { id: 'b', overall_score: 80 },
    ]
    const ranked = rankCandidates(list)
    expect(ranked[0].id).toBe('b')
    expect(ranked[1].id).toBe('a')
  })
  it('ne modifie pas le tableau original', () => {
    const list = [{ id: 'a', overall_score: 50 }]
    const ranked = rankCandidates(list)
    expect(ranked).not.toBe(list)
  })
})

describe('filterByMinScore', () => {
  const list = [
    { id: 'a', overall_score: 80 },
    { id: 'b', overall_score: 50 },
    { id: 'c', overall_score: 30 },
    { id: 'd', overall_score: null },
  ]
  it('retourne tous les candidats avec seuil 0', () => {
    expect(filterByMinScore(list, 0)).toHaveLength(4)
  })
  it('filtre correctement au seuil 60', () => {
    const filtered = filterByMinScore(list, 60)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('a')
  })
  it('gère un tableau null', () => {
    expect(filterByMinScore(null, 50)).toEqual([])
  })
})

describe('scoreToRecommendation', () => {
  it('retourne "neutral" pour null', () => {
    expect(scoreToRecommendation(null)).toBe('neutral')
  })
  it('retourne "strongly_recommend" pour >= 85', () => {
    expect(scoreToRecommendation(90)).toBe('strongly_recommend')
    expect(scoreToRecommendation(85)).toBe('strongly_recommend')
  })
  it('retourne "recommend" pour 70-84', () => {
    expect(scoreToRecommendation(75)).toBe('recommend')
  })
  it('retourne "neutral" pour 50-69', () => {
    expect(scoreToRecommendation(60)).toBe('neutral')
  })
  it('retourne "not_recommend" pour 35-49', () => {
    expect(scoreToRecommendation(40)).toBe('not_recommend')
  })
  it('retourne "strong_reject" pour < 35', () => {
    expect(scoreToRecommendation(20)).toBe('strong_reject')
  })
})

describe('getAnalysisRate', () => {
  it('retourne 0 pour un tableau vide', () => {
    expect(getAnalysisRate([])).toBe(0)
  })
  it('retourne 100 si tous analysés', () => {
    const list = [
      { ai_score: { overall_score: 80 } },
      { ai_score: { overall_score: 60 } },
    ]
    expect(getAnalysisRate(list)).toBe(100)
  })
  it('retourne 50 si la moitié est analysée', () => {
    const list = [
      { ai_score: { overall_score: 75 } },
      { ai_score: null },
    ]
    expect(getAnalysisRate(list)).toBe(50)
  })
  it('retourne 0 si aucun analysé', () => {
    const list = [{ ai_score: null }, { ai_score: undefined }]
    expect(getAnalysisRate(list)).toBe(0)
  })
})

describe('computeScoreStats', () => {
  it('gère un tableau vide', () => {
    const stats = computeScoreStats([])
    expect(stats.avg).toBeNull()
    expect(stats.min).toBeNull()
    expect(stats.max).toBeNull()
  })
  it('calcule correctement avg/min/max', () => {
    const stats = computeScoreStats([60, 80, 40])
    expect(stats.avg).toBe(60)
    expect(stats.min).toBe(40)
    expect(stats.max).toBe(80)
  })
  it('comptabilise correctement les niveaux', () => {
    const scores = [90, 85, 75, 70, 60, 55, 45, 30]
    const stats  = computeScoreStats(scores)
    expect(stats.countByLevel.excellent).toBe(2)   // 90, 85
    expect(stats.countByLevel.bon).toBe(2)          // 75, 70
    expect(stats.countByLevel.correct).toBe(2)      // 60, 55
    expect(stats.countByLevel.faible).toBe(1)       // 45
    expect(stats.countByLevel.insuffisant).toBe(1)  // 30
  })
  it('ignore les valeurs null/NaN', () => {
    const stats = computeScoreStats([80, null, NaN, 60])
    expect(stats.avg).toBe(70)
    expect(stats.min).toBe(60)
    expect(stats.max).toBe(80)
  })
})
