// ============================================================
// APEX RH — MonProfil.jsx · S114
// Hub Mon Espace — Profil personnel enrichi
// Onglets via useSearchParams(?tab=infos|competences|formations|carriere)
// StatCard KPIs · GLASS_STYLE · Max 400 lignes
// ============================================================
import { useState }                         from 'react'
import { useSearchParams }                  from 'react-router-dom'
import { motion }                           from 'framer-motion'
import {
  User, Award, BookOpen, TrendingUp,
  Phone, Briefcase, Mail, Edit3, Check, X,
  Calendar, Star, Shield,
} from 'lucide-react'

import {
  GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE, ROLE_LABELS,
} from '../../utils/constants'
import StatCard     from '../../components/ui/StatCard'
import EmptyState   from '../../components/ui/EmptyState'

import { useAuth }               from '../../contexts/AuthContext'
import { usePermission }         from '../../hooks/usePermission'
import {
  useEmployee,
  useUpdateEmployee,
  useCareerEvents,
}                                from '../../hooks/useEmployeeManagement'
import { useUserJobFamily }      from '../../hooks/useCompetencyFramework'
import {
  useMyEnrollments,
  useMyCertifications,
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_COLORS,
  TRAINING_TYPE_LABELS,
  LEVEL_LABELS,
}                                from '../../hooks/useFormations'
import { FRAMEWORK_LEVEL_LABELS } from '../../hooks/useCompetencyFramework'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'infos',        label: 'Informations', icon: User,       color: '#6366F1' },
  { id: 'competences',  label: 'Compétences',  icon: Star,       color: '#8B5CF6' },
  { id: 'formations',   label: 'Formations',   icon: BookOpen,   color: '#3B82F6' },
  { id: 'carriere',     label: 'Carrière',     icon: TrendingUp, color: '#10B981' },
]
const DEFAULT_TAB = 'infos'

// ─── HELPER ANCIENNETÉ ────────────────────────────────────────
function computeSeniority(createdAt) {
  if (!createdAt) return '—'
  const years  = Math.floor((Date.now() - new Date(createdAt)) / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor(((Date.now() - new Date(createdAt)) % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  if (years > 0) return `${years} an${years > 1 ? 's' : ''} ${months > 0 ? `${months} mois` : ''}`
  return `${months} mois`
}

// ─── PANEL INFOS ─────────────────────────────────────────────
function InfosPanel({ employee, onSave, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({})

  const startEdit = () => {
    setForm({
      first_name: employee?.first_name || '',
      last_name:  employee?.last_name  || '',
      phone:      employee?.phone      || '',
      poste:      employee?.poste      || '',
    })
    setEditing(true)
  }
  const cancel = () => setEditing(false)
  const save   = () => { onSave(form); setEditing(false) }

  const f = employee
  return (
    <div className="space-y-4">
      {/* Avatar + identité */}
      <div className="rounded-2xl p-6 flex items-center gap-5" style={GLASS_STYLE_STRONG}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
        >
          {f?.first_name?.charAt(0)}{f?.last_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-white truncate">{f?.first_name} {f?.last_name}</p>
          <p className="text-sm text-white/50">{f?.poste || '—'}</p>
          <span
            className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC' }}
          >
            {ROLE_LABELS[f?.role] || f?.role}
          </span>
        </div>
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="p-2 rounded-xl transition-colors hover:bg-white/[0.06]"
            style={{ color: '#6366F1' }}
          >
            <Edit3 size={16} />
          </button>
        )}
      </div>

      {/* Formulaire édition / lecture */}
      <div className="rounded-2xl p-5 space-y-4" style={GLASS_STYLE}>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Coordonnées</p>

        {editing ? (
          <div className="space-y-3">
            {[
              { key: 'first_name', label: 'Prénom' },
              { key: 'last_name',  label: 'Nom' },
              { key: 'poste',      label: 'Poste' },
              { key: 'phone',      label: 'Téléphone' },
            ].map(({ key, label }) => (
              <div key={key}>
                <p className="text-[11px] text-white/40 mb-1">{label}</p>
                <input
                  className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={save}   className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}><Check size={12}/>Enregistrer</button>
              <button onClick={cancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF' }}><X size={12}/>Annuler</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: Mail,     label: 'Email',     value: f?.email },
              { icon: Phone,    label: 'Téléphone', value: f?.phone || '—' },
              { icon: Briefcase,label: 'Poste',     value: f?.poste || '—' },
              { icon: Shield,   label: 'Service',   value: f?.services?.name || f?.divisions?.name || f?.directions?.name || '—' },
              { icon: Calendar, label: 'Depuis le', value: f?.created_at ? new Date(f.created_at).toLocaleDateString('fr-FR') : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Icon size={13} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] text-white/30">{label}</p>
                  <p className="text-sm text-white/80">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PANEL COMPÉTENCES ────────────────────────────────────────
function CompetencesPanel({ userId }) {
  const { data: jobFamily, isLoading } = useUserJobFamily(userId)

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (!jobFamily) return <EmptyState icon={Star} title="Aucun référentiel" description="Aucune famille de métiers assignée." />

  const competencies = jobFamily.competency_frameworks || []
  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4 flex items-center gap-3" style={GLASS_STYLE_STRONG}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: `${jobFamily.color || '#6366F1'}18` }}>
          {jobFamily.icon || '⭐'}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{jobFamily.name}</p>
          <p className="text-[11px] text-white/40">{jobFamily.code} · {competencies.length} compétence{competencies.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {competencies.length === 0
        ? <EmptyState icon={Star} title="Aucune compétence" description="Le référentiel ne contient pas encore de compétences." />
        : competencies.map(c => {
            const lvl = FRAMEWORK_LEVEL_LABELS[c.level] || FRAMEWORK_LEVEL_LABELS[3]
            return (
              <div key={c.id} className="rounded-2xl p-4" style={GLASS_STYLE}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/80 font-medium">{c.name}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: lvl.bg, color: lvl.color }}>
                    {lvl.label}
                  </span>
                </div>
                {c.description && <p className="text-[11px] text-white/35">{c.description}</p>}
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(c.level / 5) * 100}%`, background: lvl.color }} />
                </div>
              </div>
            )
          })
      }
    </div>
  )
}

// ─── PANEL FORMATIONS ─────────────────────────────────────────
function FormationsPanel() {
  const { data: enrollments  = [], isLoading: loadingE } = useMyEnrollments()
  const { data: certifications = [], isLoading: loadingC } = useMyCertifications()

  if (loadingE || loadingC) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  return (
    <div className="space-y-5">
      {/* Certifications */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Certifications ({certifications.length})</p>
        {certifications.length === 0
          ? <EmptyState icon={Award} title="Aucune certification" description="Vos certifications obtenues apparaîtront ici." />
          : certifications.map(cert => (
              <div key={cert.id} className="rounded-2xl p-4 mb-2 flex items-center gap-3" style={GLASS_STYLE}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <Award size={14} style={{ color: '#10B981' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate">{cert.training_catalog?.title || cert.name}</p>
                  <p className="text-[10px] text-white/35">
                    Obtenu le {new Date(cert.obtained_at).toLocaleDateString('fr-FR')}
                    {cert.expires_at && ` · Expire ${new Date(cert.expires_at).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
              </div>
            ))
        }
      </div>

      {/* Inscriptions / formations */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Formations ({enrollments.length})</p>
        {enrollments.length === 0
          ? <EmptyState icon={BookOpen} title="Aucune formation" description="Votre historique de formation apparaîtra ici." />
          : enrollments.map(enr => {
              const statusColor = ENROLLMENT_STATUS_COLORS[enr.status] || '#6B7280'
              return (
                <div key={enr.id} className="rounded-2xl p-4 mb-2" style={GLASS_STYLE}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm text-white/80 font-medium leading-snug">{enr.training_catalog?.title}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${statusColor}18`, color: statusColor }}>
                      {ENROLLMENT_STATUS_LABELS[enr.status] || enr.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/35">
                    {TRAINING_TYPE_LABELS[enr.training_catalog?.type] || ''}{enr.training_catalog?.level ? ` · ${LEVEL_LABELS[enr.training_catalog.level] || ''}` : ''}
                    {enr.training_catalog?.duration_hours ? ` · ${enr.training_catalog.duration_hours}h` : ''}
                  </p>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}

// ─── PANEL CARRIÈRE ───────────────────────────────────────────
const CAREER_EVENT_LABELS = {
  promotion:      { label: 'Promotion',        icon: '🚀', color: '#6366F1' },
  role_change:    { label: 'Changement rôle',  icon: '🔄', color: '#3B82F6' },
  transfer:       { label: 'Mobilité',         icon: '📍', color: '#8B5CF6' },
  salary_change:  { label: 'Évolution salariale', icon: '💰', color: '#10B981' },
  onboarding:     { label: 'Arrivée',          icon: '🎉', color: '#F59E0B' },
  offboarding:    { label: 'Départ',           icon: '👋', color: '#EF4444' },
  other:          { label: 'Autre',            icon: '📌', color: '#6B7280' },
}

function CarrierePanel({ userId }) {
  const { data: events = [], isLoading } = useCareerEvents(userId)

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (events.length === 0) return <EmptyState icon={TrendingUp} title="Aucun événement" description="Votre historique de carrière apparaîtra ici." />

  return (
    <div className="space-y-2">
      {events.map((ev, idx) => {
        const meta = CAREER_EVENT_LABELS[ev.event_type] || CAREER_EVENT_LABELS.other
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="rounded-2xl p-4 flex items-start gap-3"
            style={GLASS_STYLE}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}25` }}
            >
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-white/80">{meta.label}</p>
                <span className="text-[10px] text-white/30">{ev.effective_date ? new Date(ev.effective_date).toLocaleDateString('fr-FR') : '—'}</span>
              </div>
              {(ev.old_value || ev.new_value) && (
                <p className="text-[11px] text-white/40">
                  {ev.old_value && <span className="line-through mr-1">{ev.old_value}</span>}
                  {ev.new_value && <span style={{ color: meta.color }}>{ev.new_value}</span>}
                </p>
              )}
              {ev.note && <p className="text-[11px] text-white/30 mt-0.5">{ev.note}</p>}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function MonProfil() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { profile }  = useAuth()
  const { can }      = usePermission()
  const updateMutation = useUpdateEmployee()

  const { data: employee, isLoading } = useEmployee(profile?.id)

  // Stats KPIs
  const { data: allEnrollments  = [] } = useMyEnrollments()
  const { data: certifications  = [] } = useMyCertifications()
  const done     = allEnrollments.filter(e => e.status === 'termine').length
  const activeCerts = certifications.filter(c => !c.expires_at || new Date(c.expires_at) > new Date()).length
  const seniority = computeSeniority(employee?.created_at)

  const canEdit = can('users', 'update') || profile?.id === employee?.id

  const handleSave = (updates) => {
    if (!employee?.id) return
    updateMutation.mutate({ id: employee.id, updates })
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Mon Profil</h1>
        <p className="text-sm text-white/40">Informations personnelles, compétences et parcours</p>
      </div>

      {/* Stats header */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Calendar} label="Ancienneté"             value={seniority}    color="#6366F1" loading={isLoading} />
        <StatCard icon={BookOpen} label="Formations terminées"   value={done}         color="#3B82F6" loading={isLoading} />
        <StatCard icon={Award}    label="Certifications actives" value={activeCerts}  color="#10B981" loading={isLoading} />
      </div>

      {/* TabBar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={GLASS_STYLE_SUBTLE}>
        {TABS.map(tab => {
          const active = tab.id === activeTab
          const Icon   = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200"
              style={active
                ? { background: `${tab.color}20`, color: tab.color, border: `1px solid ${tab.color}30` }
                : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
              }
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {activeTab === 'infos'       && <InfosPanel       employee={employee} onSave={handleSave} canEdit={canEdit} />}
        {activeTab === 'competences' && <CompetencesPanel userId={profile?.id} />}
        {activeTab === 'formations'  && <FormationsPanel />}
        {activeTab === 'carriere'    && <CarrierePanel    userId={profile?.id} />}
      </motion.div>
    </div>
  )
}
