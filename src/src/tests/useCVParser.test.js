// ============================================================
// APEX RH — src/tests/useCVParser.test.js
// Session 63 — Tests : Parsing IA automatique des CVs
// 34 tests
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getParsingStatusLabel,
  getParsingStatusColor,
  getParsingStatusIcon,
  formatExperienceYears,
  extractTopSkills,
  computeExperienceTotal,
  formatEducationLine,
  buildCandidateFromCV,
  getSkillsCategories,
  scoreSkillsMatch,
  formatLanguageLevel,
  computeCompleteness,
  PARSING_STATUS,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from '../hooks/useCVParser'

// ─── CONSTANTES ───────────────────────────────────────────────

describe('Constantes useCVParser', () => {
  it('PARSING_STATUS contient les 4 statuts attendus', () => {
    expect(PARSING_STATUS).toHaveProperty('pending')
    expect(PARSING_STATUS).toHaveProperty('processing')
    expect(PARSING_STATUS).toHaveProperty('completed')
    expect(PARSING_STATUS).toHaveProperty('failed')
  })

  it('ALLOWED_EXTENSIONS contient .pdf', () => {
    expect(ALLOWED_EXTENSIONS).toContain('.pdf')
  })

  it('MAX_FILE_SIZE_MB est 10', () => {
    expect(MAX_FILE_SIZE_MB).toBe(10)
  })

  it('MAX_FILE_SIZE_BYTES est cohérent avec MAX_FILE_SIZE_MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
  })
})

// ─── getParsingStatusLabel ────────────────────────────────────

describe('getParsingStatusLabel', () => {
  it('retourne "En attente" pour pending', () => {
    expect(getParsingStatusLabel('pending')).toBe('En attente')
  })

  it('retourne "Analyse en cours…" pour processing', () => {
    expect(getParsingStatusLabel('processing')).toBe('Analyse en cours…')
  })

  it('retourne "Analysé" pour completed', () => {
    expect(getParsingStatusLabel('completed')).toBe('Analysé')
  })

  it('retourne "Échec" pour failed', () => {
    expect(getParsingStatusLabel('failed')).toBe('Échec')
  })

  it('retourne "Inconnu" pour statut inconnu', () => {
    expect(getParsingStatusLabel('unknown')).toBe('Inconnu')
    expect(getParsingStatusLabel(null)).toBe('Inconnu')
  })
})

// ─── getParsingStatusColor ────────────────────────────────────

describe('getParsingStatusColor', () => {
  it('retourne une couleur hex pour chaque statut', () => {
    const hexRe = /^#[0-9A-Fa-f]{6}$/
    expect(getParsingStatusColor('pending')).toMatch(hexRe)
    expect(getParsingStatusColor('processing')).toMatch(hexRe)
    expect(getParsingStatusColor('completed')).toMatch(hexRe)
    expect(getParsingStatusColor('failed')).toMatch(hexRe)
  })

  it('retourne une couleur grise pour statut inconnu', () => {
    expect(getParsingStatusColor('xyz')).toBe('#6B7280')
  })
})

// ─── getParsingStatusIcon ─────────────────────────────────────

describe('getParsingStatusIcon', () => {
  it('retourne un nom d\'icône pour chaque statut', () => {
    expect(typeof getParsingStatusIcon('pending')).toBe('string')
    expect(typeof getParsingStatusIcon('processing')).toBe('string')
    expect(typeof getParsingStatusIcon('completed')).toBe('string')
    expect(typeof getParsingStatusIcon('failed')).toBe('string')
  })

  it('completed → CheckCircle2', () => {
    expect(getParsingStatusIcon('completed')).toBe('CheckCircle2')
  })

  it('failed → XCircle', () => {
    expect(getParsingStatusIcon('failed')).toBe('XCircle')
  })
})

// ─── formatExperienceYears ────────────────────────────────────

describe('formatExperienceYears', () => {
  it('retourne "–" pour null', () => {
    expect(formatExperienceYears(null)).toBe('–')
  })

  it('retourne "Débutant" pour 0 ans', () => {
    expect(formatExperienceYears(0)).toBe('Débutant')
  })

  it('retourne "1 an d\'expérience" pour 1', () => {
    expect(formatExperienceYears(1)).toContain('1 an')
  })

  it('retourne le pluriel pour n > 1', () => {
    expect(formatExperienceYears(5)).toContain('5 ans')
    expect(formatExperienceYears(10)).toContain('10 ans')
  })
})

// ─── extractTopSkills ─────────────────────────────────────────

describe('extractTopSkills', () => {
  const pd = { skills: ['React', 'TS', 'Node', 'SQL', 'Git', 'Docker', 'AWS', 'Python'] }

  it('retourne les N premières compétences', () => {
    const result = extractTopSkills(pd, 5)
    expect(result).toHaveLength(5)
    expect(result[0]).toBe('React')
  })

  it('retourne 8 par défaut', () => {
    const result = extractTopSkills(pd)
    expect(result).toHaveLength(8)
  })

  it('retourne [] si aucune compétence', () => {
    expect(extractTopSkills({}, 5)).toEqual([])
    expect(extractTopSkills(null, 5)).toEqual([])
  })
})

// ─── computeExperienceTotal ───────────────────────────────────

describe('computeExperienceTotal', () => {
  it('utilise total_experience_years si présent', () => {
    const pd = { total_experience_years: 7, experience: [] }
    expect(computeExperienceTotal(pd)).toBe(7)
  })

  it('calcule depuis les expériences si total_experience_years absent', () => {
    const pd = {
      experience: [
        { start_date: '2020-01', end_date: '2023-01', is_current: false },
      ],
    }
    // 36 mois = 3 ans
    expect(computeExperienceTotal(pd)).toBe(3)
  })

  it('retourne 0 si pas d\'expérience', () => {
    expect(computeExperienceTotal({ experience: [] })).toBe(0)
    expect(computeExperienceTotal({})).toBe(0)
  })

  it('gère is_current = true', () => {
    const now = new Date()
    const startYear = now.getFullYear() - 2
    const pd = {
      experience: [
        { start_date: `${startYear}-01`, is_current: true },
      ],
    }
    const result = computeExperienceTotal(pd)
    expect(result).toBeGreaterThanOrEqual(1)
  })
})

// ─── formatEducationLine ──────────────────────────────────────

describe('formatEducationLine', () => {
  it('retourne une chaîne vide pour null', () => {
    expect(formatEducationLine(null)).toBe('')
  })

  it('inclut le diplôme, l\'institution et les années', () => {
    const edu = {
      degree: 'Master Informatique',
      institution: 'Paris Saclay',
      field: 'IA',
      year_start: '2018',
      year_end: '2020',
    }
    const result = formatEducationLine(edu)
    expect(result).toContain('Master Informatique')
    expect(result).toContain('Paris Saclay')
    expect(result).toContain('2018')
    expect(result).toContain('2020')
  })

  it('gère les champs manquants', () => {
    const edu = { degree: 'Licence' }
    expect(formatEducationLine(edu)).toContain('Licence')
  })
})

// ─── buildCandidateFromCV ─────────────────────────────────────

describe('buildCandidateFromCV', () => {
  it('retourne {} pour null', () => {
    expect(buildCandidateFromCV(null)).toEqual({})
  })

  it('mappe les champs candidature correctement', () => {
    const pd = {
      full_name: 'Marie Curie',
      email   : 'marie@science.fr',
      phone   : '+33 6 12 34 56 78',
      summary : 'Chercheuse passionnée.',
    }
    const result = buildCandidateFromCV(pd)
    expect(result.candidate_name).toBe('Marie Curie')
    expect(result.candidate_email).toBe('marie@science.fr')
    expect(result.candidate_phone).toBe('+33 6 12 34 56 78')
    expect(result.cover_letter).toBe('Chercheuse passionnée.')
  })
})

// ─── getSkillsCategories ──────────────────────────────────────

describe('getSkillsCategories', () => {
  it('retourne 3 catégories : tech, tools, soft', () => {
    const result = getSkillsCategories([])
    expect(result).toHaveProperty('tech')
    expect(result).toHaveProperty('tools')
    expect(result).toHaveProperty('soft')
  })

  it('classe React en tech', () => {
    const { tech } = getSkillsCategories(['React', 'Vue', 'Node.js'])
    expect(tech.length).toBeGreaterThan(0)
    expect(tech.some(s => s.toLowerCase().includes('react'))).toBe(true)
  })

  it('classe Jira en tools', () => {
    const { tools } = getSkillsCategories(['Jira', 'Confluence', 'Notion'])
    expect(tools.length).toBeGreaterThan(0)
  })

  it('gère un tableau vide', () => {
    const result = getSkillsCategories([])
    expect(result.tech).toEqual([])
    expect(result.tools).toEqual([])
    expect(result.soft).toEqual([])
  })
})

// ─── scoreSkillsMatch ─────────────────────────────────────────

describe('scoreSkillsMatch', () => {
  it('retourne 0 si requiredSkills est vide', () => {
    expect(scoreSkillsMatch(['React', 'Node'], [])).toBe(0)
  })

  it('retourne 100 si toutes les compétences matchent', () => {
    const score = scoreSkillsMatch(['React', 'TypeScript', 'Node'], ['React', 'Node'])
    expect(score).toBe(100)
  })

  it('retourne un score partiel', () => {
    const score = scoreSkillsMatch(['React', 'Node'], ['React', 'Node', 'Python', 'Docker'])
    expect(score).toBe(50)
  })

  it('est insensible à la casse', () => {
    const score = scoreSkillsMatch(['react', 'node'], ['React', 'Node'])
    expect(score).toBe(100)
  })
})

// ─── formatLanguageLevel ──────────────────────────────────────

describe('formatLanguageLevel', () => {
  it('normalise "natif" → "Natif / Bilingue"', () => {
    expect(formatLanguageLevel('natif')).toContain('Natif')
  })

  it('normalise "courant" → mention C1-C2', () => {
    expect(formatLanguageLevel('courant')).toContain('C1')
  })

  it('retourne le niveau tel quel si non reconnu', () => {
    expect(formatLanguageLevel('Expert')).toBe('Expert')
  })

  it('retourne "–" pour null', () => {
    expect(formatLanguageLevel(null)).toBe('–')
  })
})

// ─── computeCompleteness ─────────────────────────────────────

describe('computeCompleteness', () => {
  it('retourne 0 pour null', () => {
    expect(computeCompleteness(null)).toBe(0)
  })

  it('retourne 0 pour un objet vide', () => {
    expect(computeCompleteness({})).toBe(0)
  })

  it('retourne 100 pour un CV complet', () => {
    const pd = {
      full_name            : 'Jean Dupont',
      email                : 'jean@example.com',
      phone                : '+33 6 00 00 00 00',
      location             : 'Paris',
      summary              : 'Développeur senior.',
      skills               : ['React', 'Node'],
      experience           : [{ title: 'Dev', company: 'ACME' }],
      education            : [{ degree: 'Master' }],
      languages            : [{ language: 'Français', level: 'Natif' }],
      total_experience_years: 8,
    }
    expect(computeCompleteness(pd)).toBe(100)
  })

  it('retourne un score partiel pour un CV incomplet', () => {
    const pd = {
      full_name: 'Jean Dupont',
      email    : 'jean@example.com',
      skills   : ['React'],
    }
    const score = computeCompleteness(pd)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('le score est un entier entre 0 et 100', () => {
    const pd = { full_name: 'Test', email: 't@t.fr', skills: [] }
    const score = computeCompleteness(pd)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(Number.isInteger(score)).toBe(true)
  })
})
