// ============================================================
// APEX RH — src/hooks/useTalentNineBox.js
// Session 51 — Grille 9-Box Talent
//
// Hooks :
//   useTalentNineBox  — tous collaborateurs avec position 9-box
//   useNineBoxStats   — stats par cellule (comptages)
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ─── Configuration des 9 cellules ────────────────────────────
export const NINEBOX_CELLS = {
  // Ligne HIGH performance (y=2)
  star: {
    label: '⭐ Stars',
    sublabel: 'Haute performance, haut potentiel',
    description: 'Prêts pour des responsabilités élargies. Priorité de rétention absolue.',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.3)',
    textColor: '#6EE7B7',
    row: 2, col: 2,
    action: 'Accélérer développement',
  },
  backbone: {
    label: '🔧 Piliers',
    sublabel: 'Haute performance, potentiel moyen',
    description: 'Excellents opérationnels. Valoriser l\'expertise, envisager expertise verticale.',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.25)',
    textColor: '#93C5FD',
    row: 2, col: 1,
    action: 'Fidéliser & stabiliser',
  },
  expert: {
    label: '🎯 Experts',
    sublabel: 'Haute performance, potentiel à confirmer',
    description: 'Très performants mais potentiel non confirmé. Investiguer les freins au développement.',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.25)',
    textColor: '#A5B4FC',
    row: 2, col: 0,
    action: 'Explorer le potentiel',
  },
  // Ligne MEDIUM performance (y=1)
  high_potential: {
    label: '🚀 Hauts Potentiels',
    sublabel: 'Performance moyenne, haut potentiel',
    description: 'Talents en développement. Investir fortement : coaching, missions stretch.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    textColor: '#FCD34D',
    row: 1, col: 2,
    action: 'Coaching intensif',
  },
  core: {
    label: '💼 Socle',
    sublabel: 'Performance moyenne, potentiel moyen',
    description: 'Le cœur de l\'organisation. Accompagner la progression, identifier les leviers.',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.2)',
    textColor: '#C4B5FD',
    row: 1, col: 1,
    action: 'Développer progressivement',
  },
  reliable: {
    label: '⚙️ Fiables',
    sublabel: 'Performance moyenne, potentiel limité',
    description: 'Bons exécutants dans leur rôle actuel. Maintenir la motivation.',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.1)',
    border: 'rgba(107,114,128,0.2)',
    textColor: '#D1D5DB',
    row: 1, col: 0,
    action: 'Reconnaître la contribution',
  },
  // Ligne LOW performance (y=0)
  enigma: {
    label: '❓ Enigmes',
    sublabel: 'Performance faible, haut potentiel',
    description: 'Paradoxe à résoudre. Facteurs bloquants à identifier (contexte, manager, rôle).',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.1)',
    border: 'rgba(236,72,153,0.2)',
    textColor: '#F9A8D4',
    row: 0, col: 2,
    action: 'Diagnostic approfondi',
  },
  inconsistent: {
    label: '📉 Inconstants',
    sublabel: 'Performance faible, potentiel moyen',
    description: 'Performance insuffisante. Plan de remise à niveau ou repositionnement.',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.2)',
    textColor: '#FDBA74',
    row: 0, col: 1,
    action: 'Plan de progression',
  },
  underperformer: {
    label: '⚠️ Sous-performers',
    sublabel: 'Performance faible, potentiel faible',
    description: 'Intervention urgente requise. Plan de performance ou repositionnement.',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.2)',
    textColor: '#FCA5A5',
    row: 0, col: 0,
    action: 'Intervention immédiate',
  },
}

// ─── HOOK 1 : Données 9-Box ───────────────────────────────────
export function useTalentNineBox(filters = {}) {
  return useQuery({
    queryKey: ['talent_ninebox', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_talent_ninebox')
        .select('*')

      if (filters.division_id) q = q.eq('division_id', filters.division_id)
      if (filters.service_id)  q = q.eq('service_id',  filters.service_id)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    staleTime: 3 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 2 : Stats par cellule ───────────────────────────────
export function useNineBoxStats(filters = {}) {
  const { data: raw = [], ...rest } = useTalentNineBox(filters)

  const stats = {}
  Object.keys(NINEBOX_CELLS).forEach(cell => {
    const people = raw.filter(p => p.ninebox_cell === cell)
    stats[cell] = {
      count:   people.length,
      people,
      config:  NINEBOX_CELLS[cell],
    }
  })

  const totalMapped   = raw.length
  const starsAndHiPot = (stats.star?.count || 0) + (stats.high_potential?.count || 0)
  const atRisk        = (stats.underperformer?.count || 0) + (stats.inconsistent?.count || 0)

  return {
    ...rest,
    stats,
    totalMapped,
    starsAndHiPot,
    atRisk,
    raw,
  }
}
