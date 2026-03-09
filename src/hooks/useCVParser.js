// ============================================================
// APEX RH — src/hooks/useCVParser.js
// Session 63 — Parsing IA automatique des CVs
// Hooks   : useUploadAndParseCV, useCVParseResult, useCVParseResultsByOrg,
//           useCVParseResultsByApplication, useDeleteCVParseResult,
//           useLinkCVToApplication, useCVParseSummary
// Helpers : getParsingStatusLabel, getParsingStatusColor, getParsingStatusIcon,
//           formatExperienceYears, extractTopSkills, computeExperienceTotal,
//           formatEducationLine, buildCandidateFromCV, getSkillsCategories,
//           scoreSkillsMatch, formatLanguageLevel, computeCompleteness
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase }  from '../lib/supabase'
import { useAuth }   from '../contexts/AuthContext'

// ─── CONSTANTES PUBLIQUES ─────────────────────────────────────

export const PARSING_STATUS = {
  pending   : 'pending',
  processing: 'processing',
  completed : 'completed',
  failed    : 'failed',
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
]
export const ALLOWED_EXTENSIONS = ['.pdf']
export const MAX_FILE_SIZE_MB   = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export const LANGUAGE_LEVELS = [
  'Natif', 'Bilingue', 'Courant', 'Intermédiaire', 'Notions', 'Scolaire'
]

// ─── HELPERS PUBLICS ──────────────────────────────────────────

/**
 * Label lisible du statut de parsing
 * @param {string} status
 * @returns {string}
 */
export function getParsingStatusLabel(status) {
  const MAP = {
    pending   : 'En attente',
    processing: 'Analyse en cours…',
    completed : 'Analysé',
    failed    : 'Échec',
  }
  return MAP[status] ?? 'Inconnu'
}

/**
 * Couleur associée au statut de parsing
 * @param {string} status
 * @returns {string} couleur hex
 */
export function getParsingStatusColor(status) {
  const MAP = {
    pending   : '#F59E0B',
    processing: '#6366F1',
    completed : '#10B981',
    failed    : '#EF4444',
  }
  return MAP[status] ?? '#6B7280'
}

/**
 * Icône Lucide name suggérée pour le statut
 * @param {string} status
 * @returns {string}
 */
export function getParsingStatusIcon(status) {
  const MAP = {
    pending   : 'Clock',
    processing: 'Loader2',
    completed : 'CheckCircle2',
    failed    : 'XCircle',
  }
  return MAP[status] ?? 'FileQuestion'
}

/**
 * Formater le nombre d'années d'expérience
 * @param {number|null} years
 * @returns {string}
 */
export function formatExperienceYears(years) {
  if (years == null || isNaN(years)) return '–'
  if (years === 0) return 'Débutant'
  if (years === 1) return '1 an d\'expérience'
  return `${years} ans d'expérience`
}

/**
 * Extraire les N premières compétences d'un CV parsé
 * @param {object} parsedData
 * @param {number} n
 * @returns {string[]}
 */
export function extractTopSkills(parsedData, n = 8) {
  if (!parsedData?.skills || !Array.isArray(parsedData.skills)) return []
  return parsedData.skills.slice(0, n)
}

/**
 * Calculer le nombre total d'années d'expérience depuis les postes
 * (fallback si total_experience_years absent dans parsed_data)
 * @param {object} parsedData
 * @returns {number}
 */
export function computeExperienceTotal(parsedData) {
  if (parsedData?.total_experience_years != null) {
    return parsedData.total_experience_years
  }
  const exp = parsedData?.experience
  if (!exp || !Array.isArray(exp) || exp.length === 0) return 0

  let totalMonths = 0
  const now = new Date()

  for (const e of exp) {
    const start = e.start_date ? new Date(e.start_date + '-01') : null
    const end   = e.is_current ? now
      : e.end_date ? new Date(e.end_date + '-01') : null
    if (!start || !end) continue
    const months = (end.getFullYear() - start.getFullYear()) * 12
      + (end.getMonth() - start.getMonth())
    if (months > 0) totalMonths += months
  }

  return Math.round(totalMonths / 12)
}

/**
 * Formater une ligne de formation
 * @param {object} edu
 * @returns {string}
 */
export function formatEducationLine(edu) {
  if (!edu) return ''
  const parts = []
  if (edu.degree)      parts.push(edu.degree)
  if (edu.field)       parts.push(`– ${edu.field}`)
  if (edu.institution) parts.push(`@ ${edu.institution}`)
  const years = [edu.year_start, edu.year_end].filter(Boolean).join('–')
  if (years) parts.push(`(${years})`)
  return parts.join(' ')
}

/**
 * Construire un objet candidature pré-rempli depuis un CV parsé
 * @param {object} parsedData
 * @returns {object} champs pour job_applications
 */
export function buildCandidateFromCV(parsedData) {
  if (!parsedData) return {}
  return {
    candidate_name  : parsedData.full_name   ?? '',
    candidate_email : parsedData.email       ?? '',
    candidate_phone : parsedData.phone       ?? '',
    cover_letter    : parsedData.summary     ?? '',
  }
}

/**
 * Catégoriser les compétences en groupes (Tech / Outils / Soft Skills)
 * Heuristique simple basée sur des mots-clés courants
 * @param {string[]} skills
 * @returns {{ tech: string[], tools: string[], soft: string[] }}
 */
export function getSkillsCategories(skills = []) {
  const techKeywords = [
    'javascript','typescript','python','java','react','vue','angular','node',
    'sql','postgresql','mysql','mongodb','redis','graphql','rest','api',
    'docker','kubernetes','aws','azure','gcp','linux','git','ci/cd',
    'php','ruby','swift','kotlin','flutter','dart','go','rust','c++','c#',
  ]
  const toolKeywords = [
    'jira','confluence','figma','sketch','adobe','salesforce','sap',
    'hubspot','slack','notion','trello','asana','powerbi','tableau',
    'excel','word','powerpoint','photoshop','illustrator',
  ]

  const tech  = []
  const tools = []
  const soft  = []

  for (const skill of skills) {
    const lower = skill.toLowerCase()
    if (techKeywords.some(k => lower.includes(k))) {
      tech.push(skill)
    } else if (toolKeywords.some(k => lower.includes(k))) {
      tools.push(skill)
    } else {
      soft.push(skill)
    }
  }

  return { tech, tools, soft }
}

/**
 * Calculer un score de correspondance compétences (CV vs offre)
 * @param {string[]} cvSkills       compétences du CV
 * @param {string[]} requiredSkills compétences requises de l'offre
 * @returns {number} score 0-100
 */
export function scoreSkillsMatch(cvSkills = [], requiredSkills = []) {
  if (!requiredSkills.length) return 0
  const cvLower  = cvSkills.map(s => s.toLowerCase())
  const matched  = requiredSkills.filter(s =>
    cvLower.some(c => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c))
  )
  return Math.round((matched.length / requiredSkills.length) * 100)
}

/**
 * Formater le niveau de langue de façon lisible
 * @param {string} level
 * @returns {string}
 */
export function formatLanguageLevel(level) {
  const MAP = {
    'natif'          : 'Natif / Bilingue',
    'bilingue'       : 'Natif / Bilingue',
    'courant'        : 'Courant (C1–C2)',
    'intermédiaire'  : 'Intermédiaire (B1–B2)',
    'notions'        : 'Notions (A1–A2)',
    'scolaire'       : 'Notions (A1–A2)',
  }
  return MAP[level?.toLowerCase()] ?? level ?? '–'
}

/**
 * Calculer le taux de complétude d'un CV parsé (0-100)
 * @param {object} parsedData
 * @returns {number} pourcentage
 */
export function computeCompleteness(parsedData) {
  if (!parsedData) return 0
  const checks = [
    !!parsedData.full_name,
    !!parsedData.email,
    !!parsedData.phone,
    !!parsedData.location,
    !!parsedData.summary,
    Array.isArray(parsedData.skills)      && parsedData.skills.length > 0,
    Array.isArray(parsedData.experience)  && parsedData.experience.length > 0,
    Array.isArray(parsedData.education)   && parsedData.education.length > 0,
    Array.isArray(parsedData.languages)   && parsedData.languages.length > 0,
    parsedData.total_experience_years != null,
  ]
  const score = checks.filter(Boolean).length
  return Math.round((score / checks.length) * 100)
}

// ─── HOOKS ────────────────────────────────────────────────────

/**
 * Upload + création enregistrement + déclenchement Edge Function
 * Mutation principale de S63
 */
export function useUploadAndParseCV() {
  const { user, organizationId } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, jobApplicationId = null, jobPostingId = null }) => {
      // Validation fichier
      if (!file) throw new Error('Aucun fichier fourni')
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Fichier trop lourd (max ${MAX_FILE_SIZE_MB} Mo)`)
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type) &&
          !ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
        throw new Error('Format non supporté. Utilisez un PDF.')
      }

      // ── 1. Upload dans Supabase Storage ─────────────────────
      const timestamp = Date.now()
      const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath  = `${organizationId}/${user.id}/${timestamp}_${safeName}`

      const { error: uploadErr } = await supabase.storage
        .from('cv-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert      : false,
        })

      if (uploadErr) throw new Error(`Erreur upload: ${uploadErr.message}`)

      // ── 2. Créer l'enregistrement cv_parse_results ─────────
      const { data: record, error: insertErr } = await supabase
        .from('cv_parse_results')
        .insert({
          organization_id   : organizationId,
          job_application_id: jobApplicationId,
          job_posting_id    : jobPostingId,
          file_name         : file.name,
          file_path         : filePath,
          file_size_bytes   : file.size,
          parsing_status    : 'pending',
          created_by        : user.id,
        })
        .select()
        .single()

      if (insertErr) {
        // Nettoyer le fichier uploadé si l'insert échoue
        await supabase.storage.from('cv-uploads').remove([filePath])
        throw new Error(`Erreur création enregistrement: ${insertErr.message}`)
      }

      // ── 3. Déclencher l'Edge Function ────────────────────────
      const { error: fnErr } = await supabase.functions.invoke('ai-cv-parser', {
        body: { cv_parse_result_id: record.id },
      })

      if (fnErr) {
        // L'enregistrement existe — la fonction a été appelée même si erreur réseau
      }

      return record
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['cv-parse-results'] })
      qc.invalidateQueries({ queryKey: ['cv-parse-result', data.id] })
      if (data.job_application_id) {
        qc.invalidateQueries({ queryKey: ['cv-parse-results-app', data.job_application_id] })
      }
    },
  })
}

/**
 * Récupérer un résultat de parsing (polling sur le status)
 * @param {string|null} id
 * @param {boolean} poll activer le polling si status non final
 */
export function useCVParseResult(id, poll = true) {
  return useQuery({
    queryKey: ['cv-parse-result', id],
    enabled : !!id,
    queryFn : async () => {
      const { data, error } = await supabase
        .from('cv_parse_results')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    // Polling toutes les 2s si status non final
    refetchInterval: (query) => {
      if (!poll) return false
      const status = query.state.data?.parsing_status
      if (status === 'completed' || status === 'failed') return false
      return 2000
    },
    staleTime: 5 * 1000,
  })
}

/**
 * Tous les résultats de parsing de l'organisation (vue admin)
 */
export function useCVParseResultsByOrg(filters = {}) {
  const { organizationId } = useAuth()
  const { status, jobPostingId, limit = 50 } = filters

  return useQuery({
    queryKey: ['cv-parse-results', { status, jobPostingId, organizationId }],
    enabled : !!organizationId,
    queryFn : async () => {
      let q = supabase
        .from('cv_parse_results')
        .select(`
          *,
          creator:created_by(id, first_name, last_name),
          application:job_application_id(id, candidate_name, candidate_email),
          posting:job_posting_id(id, title)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (status)        q = q.eq('parsing_status', status)
      if (jobPostingId)  q = q.eq('job_posting_id', jobPostingId)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Résultats de parsing pour une candidature spécifique
 * @param {string|null} jobApplicationId
 */
export function useCVParseResultsByApplication(jobApplicationId) {
  return useQuery({
    queryKey: ['cv-parse-results-app', jobApplicationId],
    enabled : !!jobApplicationId,
    queryFn : async () => {
      const { data, error } = await supabase
        .from('cv_parse_results')
        .select('*')
        .eq('job_application_id', jobApplicationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Supprimer un résultat de parsing (+ fichier Storage)
 */
export function useDeleteCVParseResult() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, filePath }) => {
      // Supprimer l'enregistrement BDD
      const { error } = await supabase
        .from('cv_parse_results')
        .delete()
        .eq('id', id)
      if (error) throw error

      // Supprimer le fichier Storage (non bloquant)
      if (filePath) {
        await supabase.storage.from('cv-uploads').remove([filePath]).catch(() => {})
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cv-parse-results'] })
    },
  })
}

/**
 * Lier un résultat de parsing à une candidature
 */
export function useLinkCVToApplication() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ cvParseResultId, jobApplicationId }) => {
      const { data, error } = await supabase
        .from('cv_parse_results')
        .update({ job_application_id: jobApplicationId })
        .eq('id', cvParseResultId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['cv-parse-results'] })
      qc.invalidateQueries({ queryKey: ['cv-parse-result', data.id] })
    },
  })
}

/**
 * Récupérer un résumé des statistiques de parsing de l'org
 */
export function useCVParseSummary() {
  const { organizationId } = useAuth()

  return useQuery({
    queryKey: ['cv-parse-summary', organizationId],
    enabled : !!organizationId,
    queryFn : async () => {
      const { data, error } = await supabase
        .rpc('get_cv_parse_summary', { p_org_id: organizationId })
        .single()
      if (error) throw error
      return data
    },
    staleTime: 2 * 60 * 1000,
  })
}
