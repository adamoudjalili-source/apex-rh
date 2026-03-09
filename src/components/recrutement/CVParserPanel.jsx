// ============================================================
// APEX RH — src/components/recrutement/CVParserPanel.jsx
// Session 63 — Parser IA de CVs (upload PDF + extraction structurée)
// ============================================================
import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, Brain, CheckCircle2, XCircle, Loader2,
  Clock, Trash2, User, Mail, Phone, MapPin, Linkedin,
  Briefcase, GraduationCap, Star, Globe, Award,
  Link2, ChevronDown, ChevronUp, Download, RefreshCw,
  Sparkles, BarChart3, AlertTriangle,
} from 'lucide-react'
import {
  useUploadAndParseCV,
  useCVParseResult,
  useCVParseResultsByOrg,
  useDeleteCVParseResult,
  useLinkCVToApplication,
  useCVParseSummary,
  getParsingStatusLabel,
  getParsingStatusColor,
  formatExperienceYears,
  extractTopSkills,
  computeExperienceTotal,
  formatEducationLine,
  buildCandidateFromCV,
  getSkillsCategories,
  scoreSkillsMatch,
  formatLanguageLevel,
  computeCompleteness,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
} from '../../hooks/useCVParser'
import { useJobPostings } from '../../hooks/useRecruitment'
import { usePermission }   from '../../hooks/usePermission'

// ─── Animations ───────────────────────────────────────────────
const stagger = {
  hidden : {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden : { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

// ─── Zone de dépôt de fichier ─────────────────────────────────
function DropZone({ onFile, uploading }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className="relative rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        border    : `2px dashed ${dragging ? '#6366F1' : 'rgba(255,255,255,0.12)'}`,
        background: dragging
          ? 'rgba(99,102,241,0.08)'
          : 'rgba(255,255,255,0.02)',
        padding   : '2.5rem 2rem',
      }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleChange}
        disabled={uploading}
        style={{ display: 'none' }}
      />
      <div className="flex flex-col items-center gap-3">
        {uploading ? (
          <>
            <Loader2 size={40} className="animate-spin" style={{ color: '#6366F1' }} />
            <p className="text-white/60 text-sm">Upload en cours…</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Upload size={24} style={{ color: '#6366F1' }} />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-sm">
                {dragging ? 'Déposer le fichier ici' : 'Déposer un CV ou cliquer pour parcourir'}
              </p>
              <p className="text-white/30 text-xs mt-1">
                PDF uniquement · Max {MAX_FILE_SIZE_MB} Mo
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Barre de progression animée (parsing en cours) ───────────
function ParsingProgress({ status }) {
  const color = getParsingStatusColor(status)
  const isRunning = status === 'processing' || status === 'pending'

  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 mb-3">
        {status === 'processing' && <Loader2 size={16} className="animate-spin" style={{ color }} />}
        {status === 'pending'    && <Clock    size={16} style={{ color }} />}
        {status === 'completed'  && <CheckCircle2 size={16} style={{ color }} />}
        {status === 'failed'     && <XCircle  size={16} style={{ color }} />}
        <span className="text-sm font-medium" style={{ color }}>
          {getParsingStatusLabel(status)}
        </span>
      </div>
      {/* Barre SVG animée */}
      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
        {isRunning && (
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        )}
        {status === 'completed' && (
          <div className="h-full rounded-full w-full" style={{ background: color }} />
        )}
        {status === 'failed' && (
          <div className="h-full rounded-full w-1/3" style={{ background: color }} />
        )}
      </div>
    </div>
  )
}

// ─── Badge compétence ─────────────────────────────────────────
function SkillBadge({ skill, color = '#6366F1' }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-lg font-medium"
      style={{
        background: color + '18',
        color,
        border    : `1px solid ${color}30`,
      }}>
      {skill}
    </span>
  )
}

// ─── Carte résultat de parsing ─────────────────────────────────
function ParsedCVCard({ result, onDelete, onLink }) {
  const [expanded, setExpanded]   = useState(false)
  const { data: live }            = useCVParseResult(
    result.id,
    result.parsing_status !== 'completed' && result.parsing_status !== 'failed'
  )
  const rec = live ?? result
  const pd  = rec.parsed_data ?? {}

  const completeness = computeCompleteness(pd)
  const topSkills    = extractTopSkills(pd, 6)
  const { tech, soft } = getSkillsCategories(pd.skills ?? [])
  const expYears     = computeExperienceTotal(pd)

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* En-tête */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)' }}>
              <FileText size={18} style={{ color: '#6366F1' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{rec.file_name}</p>
              <p className="text-xs text-white/30">
                {new Date(rec.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
                {rec.file_size_bytes && ` · ${(rec.file_size_bytes / 1024).toFixed(0)} Ko`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Badge statut */}
            <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{
                background: getParsingStatusColor(rec.parsing_status) + '18',
                color     : getParsingStatusColor(rec.parsing_status),
              }}>
              {getParsingStatusLabel(rec.parsing_status)}
            </span>
            {/* Supprimer */}
            <button
              onClick={() => onDelete(rec)}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Barre de progression si en cours */}
        {(rec.parsing_status === 'pending' || rec.parsing_status === 'processing') && (
          <div className="mt-3">
            <ParsingProgress status={rec.parsing_status} />
          </div>
        )}

        {/* Résumé si complété */}
        {rec.parsing_status === 'completed' && pd.full_name && (
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <User size={13} style={{ color: '#C9A227' }} />
              <span className="text-sm text-white font-medium">{pd.full_name}</span>
            </div>
            {pd.email && (
              <div className="flex items-center gap-1.5">
                <Mail size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs text-white/50">{pd.email}</span>
              </div>
            )}
            {pd.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs text-white/50">{pd.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Briefcase size={12} style={{ color: '#6366F1' }} />
              <span className="text-xs" style={{ color: '#6366F1' }}>
                {formatExperienceYears(expYears)}
              </span>
            </div>
          </div>
        )}

        {/* Compétences top */}
        {rec.parsing_status === 'completed' && topSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {topSkills.map(s => <SkillBadge key={s} skill={s} />)}
            {(pd.skills?.length ?? 0) > 6 && (
              <span className="text-xs text-white/30 flex items-center">
                +{pd.skills.length - 6} autres
              </span>
            )}
          </div>
        )}

        {/* Erreur */}
        {rec.parsing_status === 'failed' && (
          <div className="mt-3 rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <p className="text-xs" style={{ color: '#EF4444' }}>
              {rec.error_message ?? 'Erreur lors de l\'analyse. Réessayez avec un autre fichier.'}
            </p>
          </div>
        )}

        {/* Actions + expand */}
        {rec.parsing_status === 'completed' && (
          <div className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              {/* Completeness gauge */}
              <div className="flex items-center gap-2">
                <div className="w-16 rounded-full h-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full"
                    style={{
                      width     : `${completeness}%`,
                      background: completeness >= 80 ? '#10B981'
                        : completeness >= 50 ? '#F59E0B' : '#EF4444',
                    }} />
                </div>
                <span className="text-xs text-white/30">{completeness}% complet</span>
              </div>
              {!rec.job_application_id && (
                <button
                  onClick={() => onLink(rec)}
                  className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    color     : '#6366F1',
                    border    : '1px solid rgba(99,102,241,0.25)',
                  }}>
                  <Link2 size={11} /> Lier à une candidature
                </button>
              )}
              {rec.job_application_id && (
                <span className="text-xs text-white/30 flex items-center gap-1">
                  <CheckCircle2 size={11} style={{ color: '#10B981' }} />
                  Lié à une candidature
                </span>
              )}
            </div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Réduire' : 'Voir détails'}
            </button>
          </div>
        )}
      </div>

      {/* Détail expandable */}
      <AnimatePresence>
        {expanded && rec.parsing_status === 'completed' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Résumé */}
              {pd.summary && (
                <div className="md:col-span-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Résumé</p>
                  <p className="text-sm text-white/70 leading-relaxed">{pd.summary}</p>
                </div>
              )}

              {/* Expériences */}
              {pd.experience?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase size={11} /> Expériences
                  </p>
                  <div className="space-y-2">
                    {pd.experience.slice(0, 4).map((exp, i) => (
                      <div key={i} className="rounded-xl p-3"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{exp.title}</p>
                            <p className="text-xs text-white/50">{exp.company}
                              {exp.location ? ` · ${exp.location}` : ''}
                            </p>
                          </div>
                          <span className="text-xs text-white/30 flex-shrink-0">
                            {exp.start_date}
                            {exp.end_date ? ` → ${exp.end_date}` : exp.is_current ? ' → Présent' : ''}
                          </span>
                        </div>
                        {exp.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {exp.technologies.slice(0, 4).map(t => (
                              <SkillBadge key={t} skill={t} color="#3B82F6" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {pd.experience.length > 4 && (
                      <p className="text-xs text-white/30">+{pd.experience.length - 4} postes</p>
                    )}
                  </div>
                </div>
              )}

              {/* Formations */}
              {pd.education?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <GraduationCap size={11} /> Formations
                  </p>
                  <div className="space-y-2">
                    {pd.education.map((edu, i) => (
                      <div key={i} className="rounded-xl p-3"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-sm font-medium text-white">{edu.degree}</p>
                        <p className="text-xs text-white/50">{formatEducationLine(edu)
                          .split(edu.degree).filter(Boolean).join('').trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compétences catégorisées */}
              {pd.skills?.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Star size={11} /> Compétences ({pd.skills.length})
                  </p>
                  <div className="space-y-2">
                    {tech.length > 0 && (
                      <div>
                        <p className="text-xs text-white/25 mb-1.5">Techniques</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tech.map(s => <SkillBadge key={s} skill={s} color="#6366F1" />)}
                        </div>
                      </div>
                    )}
                    {soft.length > 0 && (
                      <div>
                        <p className="text-xs text-white/25 mb-1.5">Transversales</p>
                        <div className="flex flex-wrap gap-1.5">
                          {soft.map(s => <SkillBadge key={s} skill={s} color="#8B5CF6" />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Langues + Certifications */}
              <div className="flex flex-col gap-4">
                {pd.languages?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe size={11} /> Langues
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pd.languages.map((l, i) => (
                        <div key={i} className="rounded-lg px-2.5 py-1"
                          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <span className="text-xs text-white/80">{l.language}</span>
                          {l.level && (
                            <span className="text-xs text-white/30 ml-1.5">
                              {formatLanguageLevel(l.level)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pd.certifications?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Award size={11} /> Certifications
                    </p>
                    {pd.certifications.map((c, i) => (
                      <div key={i} className="text-xs text-white/60 mb-1">
                        {c.name}
                        {c.issuer && <span className="text-white/30"> · {c.issuer}</span>}
                        {c.year && <span className="text-white/30"> ({c.year})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tokens utilisés */}
              {rec.tokens_used && (
                <div className="md:col-span-2 pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs text-white/20">
                    Analyse IA · {rec.tokens_used.toLocaleString()} tokens · {rec.ai_model}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Modal : lier à une candidature ──────────────────────────
function LinkModal({ result, onClose}) {
  const { data: postings } = useJobPostings({ status: 'published' })
  const [selectedApp, setSelectedApp] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl p-6 w-full max-w-md"
        style={{ background: '#0F0F23', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 className="text-white font-semibold mb-1">Lier à une candidature</h3>
        <p className="text-white/40 text-sm mb-4">
          CV de : <strong className="text-white/60">
            {result.parsed_data?.full_name ?? result.file_name}
          </strong>
        </p>
        <p className="text-xs text-white/40 mb-4">
          Fonctionnalité disponible depuis le pipeline de candidatures.
          Ouvrez une candidature et importez ce CV depuis l'onglet "Candidats".
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 transition-colors">
            Fermer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: '#6366F1' }}>
            Compris
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Stats globales parsing ────────────────────────────────────
function ParsingSummaryBar({ summary }) {
  if (!summary) return null
  const items = [
    { label: 'CVs analysés',  value: summary.completed ?? 0,    color: '#10B981' },
    { label: 'En attente',    value: summary.pending ?? 0,       color: '#F59E0B' },
    { label: 'Échecs',        value: summary.failed ?? 0,        color: '#EF4444' },
    { label: 'Liés candidat', value: summary.linked_to_app ?? 0, color: '#6366F1' },
    { label: 'Compétences/CV',value: summary.avg_skills_count ?? '–', color: '#8B5CF6' },
  ]

  return (
    <div className="grid grid-cols-5 gap-2 mb-6">
      {items.map(({ label, value, color }) => (
        <div key={label} className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function CVParserPanel() {
  const { can } = usePermission()
  const isAdmin = can('admin', 'users', 'read')
  const isDirecteur = can('intelligence', 'overview', 'read')

  const [uploadError, setUploadError]     = useState(null)
  const [linkTarget, setLinkTarget]       = useState(null)

  const { data: results = [], isLoading } = useCVParseResultsByOrg()
  const { data: summary }                 = useCVParseSummary()
  const uploadMutation                    = useUploadAndParseCV()
  const deleteMutation                    = useDeleteCVParseResult()

  const handleFile = async (file) => {
    setUploadError(null)
    try {
      await uploadMutation.mutateAsync({ file })
    } catch (err) {
      setUploadError(err.message)
    }
  }

  const handleDelete = async (rec) => {
    if (!window.confirm(`Supprimer le CV "${rec.file_name}" ?`)) return
    deleteMutation.mutate({ id: rec.id, filePath: rec.file_path })
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.12)' }}>
            <Sparkles size={18} style={{ color: '#6366F1' }} />
          </div>
          <div>
            <h2 className="text-white font-semibold">Parser IA de CVs</h2>
            <p className="text-white/40 text-xs">
              Upload PDF · Extraction automatique par Claude
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <ParsingSummaryBar summary={summary} />

      {/* Zone de dépôt */}
      <DropZone
        onFile={handleFile}
        uploading={uploadMutation.isPending}
      />

      {/* Erreur upload */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3 flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={14} style={{ color: '#EF4444' }} />
            <p className="text-sm" style={{ color: '#EF4444' }}>{uploadError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bannière succès */}
      <AnimatePresence>
        {uploadMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3 flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Brain size={14} style={{ color: '#10B981' }} />
            <p className="text-sm" style={{ color: '#10B981' }}>
              CV uploadé · Analyse IA en cours (actualisation automatique)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des CVs parsés */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-sm">
            {results.length} CV{results.length > 1 ? 's' : ''} analysés
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center">
            <Loader2 size={16} className="animate-spin" />
            Chargement…
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl py-12 flex flex-col items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
            <FileText size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-white/30 text-sm">Aucun CV analysé pour l'instant</p>
            <p className="text-white/20 text-xs">Déposez un PDF ci-dessus pour commencer</p>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="space-y-3">
            {results.map(r => (
              <ParsedCVCard
                key={r.id}
                result={r}
                onDelete={handleDelete}
                onLink={setLinkTarget}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Modal lier à candidature */}
      <AnimatePresence>
        {linkTarget && (
          <LinkModal
            result={linkTarget}
            onClose={() => setLinkTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
