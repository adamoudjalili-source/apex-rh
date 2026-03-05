// ============================================================
// APEX RH — MonEquipe.jsx  ·  Session 36 v3
// Vue manager complète :
//   - Tableau dense IPR + sparkline + alertes
//   - Fiche personne : PULSE + OKR + Feedback + Review + Recommandation
//   - Actions : voir profil complet + rediriger vers Intelligence RH
//   - Tri par colonne + filtres
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users, AlertTriangle, X, Activity, BarChart3,
  ArrowRight, ChevronRight, Trophy, Target, MessageSquare,
  ClipboardList, TrendingUp, TrendingDown, Minus,
  Plus, Pencil, Trash2, Check,
} from 'lucide-react'
import { useAuth }     from '../../contexts/AuthContext'
import { useTeamIPR }  from '../../hooks/useIPR'
import {
  GaugeRing, Sparkline, TrendBadge, iprColor, iprLabel,
} from '../../components/ui/premium'
import { getQualitativeLabel } from '../../components/ui/ProfilPerformance'
import {
  useManagerNotes, useUpsertManagerNote, useDeleteManagerNote,
  NOTE_TYPE_LABELS, currentPeriodKey,
} from '../../hooks/useTransparency'

// ─── Helpers ─────────────────────────────────────────────────
const roleLabel = r => ({
  collaborateur:'Collaborateur', chef_service:'Chef de Service',
  chef_division:'Chef de Division', directeur:'Directeur', administrateur:'Admin',
}[r]||r)

const ROLE_COLORS = {
  administrateur:'#EF4444', directeur:'#C9A227', chef_division:'#8B5CF6',
  chef_service:'#3B82F6', collaborateur:'#10B981',
}

const OVERALL_RATING_LABELS = {
  insuffisant:'Insuffisant', a_ameliorer:'À améliorer',
  satisfaisant:'Satisfaisant', bien:'Bien', excellent:'Excellent',
}

// ─── Composant principal ─────────────────────────────────────
export default function MonEquipe() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const isManager   = ['administrateur','directeur','chef_division','chef_service'].includes(profile?.role)

  const [selected, setSelected] = useState(null)
  const [sortKey,  setSortKey]  = useState('ipr')
  const [sortDir,  setSortDir]  = useState('desc')
  const [filter,   setFilter]   = useState('all') // all | alerts | excellent

  const { data: team = [], isLoading } = useTeamIPR()

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20 p-12">
        <Users size={32}/>
        <p className="text-sm">Accès réservé aux managers</p>
      </div>
    )
  }

  const filtered = team.filter(m => {
    if (filter === 'alerts')    return !!m.alert
    if (filter === 'excellent') return (m.ipr ?? 0) >= 70
    return true
  })

  const sorted = [...filtered].sort((a,b) => {
    const av = a[sortKey]??-1, bv = b[sortKey]??-1
    return sortDir==='desc' ? bv-av : av-bv
  })

  const toggleSort = k => {
    if (sortKey===k) setSortDir(d=>d==='desc'?'asc':'desc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const withIPR       = team.filter(m=>m.ipr!==null)
  const avgIPR        = withIPR.length ? Math.round(withIPR.reduce((s,m)=>s+m.ipr,0)/withIPR.length) : null
  const alertCount    = team.filter(m=>m.alert).length
  const excellentCount = team.filter(m=>(m.ipr??0)>=70).length

  return (
    <div className="flex flex-col h-full p-6 md:p-8 max-w-7xl mx-auto gap-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
            Mon Équipe
          </h1>
          <p className="text-sm text-white/30 mt-0.5">
            Performance — {new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}
          </p>
        </div>
        <button onClick={()=>navigate('/intelligence')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/45 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all">
          <BarChart3 size={13}/> Analytics complets <ArrowRight size={12}/>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Membres',        value:team.length,    color:'#4F46E5', icon:<Users size={13}/> },
          { label:'IPR moyen',      value:avgIPR??'—',    color:iprColor(avgIPR), suffix:avgIPR?'/100':'', icon:<Activity size={13}/> },
          { label:'Alertes actives',value:alertCount,     color:alertCount>0?'#EF4444':'#10B981', icon:<AlertTriangle size={13}/> },
          { label:'Excellents ≥70', value:excellentCount, color:'#C9A227', icon:<Trophy size={13}/> },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4"
            style={{ background:'rgba(255,255,255,0.025)', border:`1px solid rgba(255,255,255,0.07)` }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background:`${k.color}15`, color:k.color }}>{k.icon}</div>
              <span className="text-[10px] text-white/25 uppercase tracking-wide">{k.label}</span>
            </div>
            <p className="text-2xl font-black" style={{ color:k.color, fontFamily:"'Syne',sans-serif" }}>
              {k.value}{k.suffix&&<span className="text-sm font-normal text-white/20">{k.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2">
        {[
          { k:'all',      label:`Tous (${team.length})` },
          { k:'alerts',   label:`⚠ Alertes (${alertCount})` },
          { k:'excellent',label:`★ Excellents (${excellentCount})` },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter===f.k
                ? 'bg-indigo-600 text-white'
                : 'text-white/35 hover:text-white/70 bg-white/[0.03] border border-white/[0.06]'
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Table + Panel */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Table */}
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col min-w-0"
          style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>

          {/* En-têtes */}
          <div className="grid px-4 py-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider border-b border-white/[0.06] flex-shrink-0"
            style={{ gridTemplateColumns:'1fr 72px 72px 72px 100px 110px 28px' }}>
            <span>Collaborateur</span>
            <SortTh k="ipr"       label="IPR"   cur={sortKey} dir={sortDir} onSort={toggleSort}/>
            <SortTh k="pulseAvg"  label="PULSE" cur={sortKey} dir={sortDir} onSort={toggleSort}/>
            <SortTh k="briefRate" label="Briefs" cur={sortKey} dir={sortDir} onSort={toggleSort}/>
            <span>Tendance 14j</span>
            <span>Signal</span>
            <span/>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-white/15">
                <Users size={24}/><p className="text-sm">Aucun résultat</p>
              </div>
            ) : sorted.map((m,idx) => (
              <TeamRow key={m.userId} member={m} rank={idx+1}
                isSelected={selected?.userId===m.userId}
                onClick={() => setSelected(selected?.userId===m.userId?null:m)}/>
            ))}
          </div>
        </div>

        {/* Fiche personne */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity:0, x:24, width:0 }}
              animate={{ opacity:1, x:0, width:320 }}
              exit={{ opacity:0, x:24, width:0 }}
              transition={{ duration:0.28, ease:[0.4,0,0.2,1] }}
              className="flex-shrink-0">
              <PersonPanel member={selected} onClose={()=>setSelected(null)}
                onNavigate={()=>navigate('/intelligence')}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Ligne tableau ────────────────────────────────────────────
function TeamRow({ member: m, isSelected, onClick }) {
  const name = `${m.firstName||''} ${m.lastName||''}`.trim()||'Inconnu'
  const init = `${m.firstName?.charAt(0)||''}${m.lastName?.charAt(0)||''}`.toUpperCase()||'?'
  const c    = iprColor(m.ipr)
  return (
    <motion.button
      className="w-full grid px-4 py-3.5 items-center text-left border-b border-white/[0.04] last:border-0 transition-colors"
      style={{
        gridTemplateColumns:'1fr 72px 72px 72px 100px 110px 28px',
        background:isSelected?'rgba(79,70,229,0.07)':undefined,
      }}
      onClick={onClick}
      whileHover={{ background:isSelected?'rgba(79,70,229,0.09)':'rgba(255,255,255,0.025)' }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background:ROLE_COLORS[m.role]||'#4F46E5' }}>{init}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80 truncate">{name}</p>
          <p className="text-[10px] text-white/25">{roleLabel(m.role)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-base font-black" style={{ color:c, fontFamily:"'Syne',sans-serif" }}>{m.ipr??'—'}</span>
        {m.ipr !== null && m.ipr !== undefined && (() => {
          const ql = getQualitativeLabel(m.ipr)
          return <span className="hidden lg:inline text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background:ql.bg, color:ql.color }}>{ql.label}</span>
        })()}
      </div>
      <span className="text-sm font-semibold" style={{ color:iprColor(m.pulseAvg) }}>{m.pulseAvg??'—'}</span>
      <span className="text-sm text-white/55">{m.briefRate!==null&&m.briefRate!==undefined?`${m.briefRate}%`:'—'}</span>
      <div>
        {m.sparkline?.length>1
          ? <Sparkline data={m.sparkline} width={88} height={22} color={c} filled={false}/>
          : <span className="text-[10px] text-white/15">—</span>}
      </div>
      <div>
        {m.alert ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background:m.alert==='no_brief'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',
              color:m.alert==='no_brief'?'#EF4444':'#F59E0B',
              border:`1px solid ${m.alert==='no_brief'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'}`,
            }}>
            <AlertTriangle size={9}/>
            {m.alert==='no_brief'?`${m.daysSinceLastBrief}j`:'bas'}
          </span>
        ) : <span className="text-[10px] text-emerald-400/50">✓</span>}
      </div>
      <ChevronRight size={13} className={`transition-all ${isSelected?'text-indigo-400 rotate-90':'text-white/10'}`}/>
    </motion.button>
  )
}

// ─── Notes Manager ───────────────────────────────────────────
function ManagerNotesPanel({ employeeId, employeeName }) {
  const { data: notes = [], isLoading } = useManagerNotes(employeeId)
  const upsert = useUpsertManagerNote()
  const remove = useDeleteManagerNote()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [isShared, setIsShared] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleSave() {
    if (!draft.trim()) return
    await upsert.mutateAsync({ id:editing?.id, employee_id:employeeId, note_text:draft.trim(), note_type:noteType, is_shared:isShared })
    setOpen(false); setDraft(''); setNoteType('general'); setIsShared(false); setEditing(null)
  }

  function startEdit(note) {
    setEditing(note); setDraft(note.note_text); setNoteType(note.note_type)
    setIsShared(note.is_shared); setOpen(true)
  }

  async function handleDelete(id) {
    setDeleting(id)
    await remove.mutateAsync({ id, employee_id:employeeId })
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-white/20 uppercase tracking-wider">Notes Manager</p>
        <button onClick={()=>{setOpen(o=>!o);setEditing(null);setDraft('');setNoteType('general');setIsShared(false)}}
          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
          <Plus size={11}/> Ajouter
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden mb-3">
            <div className="space-y-2 p-3 rounded-xl" style={{background:'rgba(79,70,229,0.07)',border:'1px solid rgba(79,70,229,0.15)'}}>
              <select value={noteType} onChange={e=>setNoteType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 text-xs text-white px-2 py-1.5 focus:outline-none">
                {Object.entries(NOTE_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <textarea value={draft} onChange={e=>setDraft(e.target.value)}
                placeholder={`Note sur ${employeeName}...`} rows={3}
                className="w-full px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none resize-none"/>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer">
                  <input type="checkbox" checked={isShared} onChange={e=>setIsShared(e.target.checked)} className="w-3 h-3 rounded"/>
                  Partager avec l'employé
                </label>
                <div className="flex gap-1.5">
                  <button onClick={()=>{setOpen(false);setEditing(null)}} className="px-2 py-1 text-[10px] text-white/30 hover:text-white/50 transition-colors">Annuler</button>
                  <button onClick={handleSave} disabled={!draft.trim()||upsert.isPending}
                    className="flex items-center gap-1 px-3 py-1 text-[10px] font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40 transition-colors">
                    <Check size={10}/> {editing ? 'Modifier' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {notes.length === 0 ? (
        <p className="text-[10px] text-white/15 py-1">Aucune note pour ce collaborateur.</p>
      ) : (
        <div className="space-y-1.5">
          {notes.map(note => {
            const nt = NOTE_TYPE_LABELS[note.note_type]||NOTE_TYPE_LABELS.general
            return (
              <div key={note.id} className="flex items-start gap-2 p-2.5 rounded-xl"
                style={{background:`${nt.color}06`,border:`1px solid ${nt.color}15`}}>
                <span className="text-sm flex-shrink-0">{nt.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-semibold" style={{color:nt.color}}>{nt.label}</span>
                    {note.is_shared && <span className="text-[8px] text-emerald-400">• Partagé</span>}
                    <span className="text-[8px] text-white/20 ml-auto">{note.period_key}</span>
                  </div>
                  <p className="text-[10px] text-white/55 leading-relaxed line-clamp-2">{note.note_text}</p>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={()=>startEdit(note)} className="p-1 rounded text-white/20 hover:text-indigo-400 transition-colors"><Pencil size={9}/></button>
                  <button onClick={()=>handleDelete(note.id)} disabled={deleting===note.id}
                    className="p-1 rounded text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"><Trash2 size={9}/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Fiche Personne complète ──────────────────────────────────
function PersonPanel({ member: m, onClose, onNavigate }) {
  const name  = `${m.firstName||''} ${m.lastName||''}`.trim()||'Inconnu'
  const init  = `${m.firstName?.charAt(0)||''}${m.lastName?.charAt(0)||''}`.toUpperCase()||'?'
  const color = iprColor(m.ipr)

  return (
    <div className="h-full rounded-2xl flex flex-col overflow-hidden"
      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', width:320 }}>

      {/* Header */}
      <div className="p-5 border-b border-white/[0.06]"
        style={{ background:'linear-gradient(180deg,rgba(255,255,255,0.02) 0%,transparent 100%)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{ background:ROLE_COLORS[m.role]||'#4F46E5' }}>{init}</div>
            <div>
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="text-[11px]" style={{ color:ROLE_COLORS[m.role] }}>{roleLabel(m.role)}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{m.daysWithData} jours actifs ce mois</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white/60 transition-colors mt-0.5">
            <X size={15}/>
          </button>
        </div>

        {/* IPR gauge */}
        <div className="flex items-center gap-4">
          <GaugeRing score={m.ipr??0} size={76} stroke={6} color={color}>
            <div className="text-center">
              <p className="text-base font-black leading-none" style={{ color, fontFamily:"'Syne',sans-serif" }}>
                {m.ipr??'—'}
              </p>
              <p className="text-[8px] text-white/20">IPR</p>
            </div>
          </GaugeRing>
          <div>
            <p className="text-base font-bold mb-0.5" style={{ color }}>{iprLabel(m.ipr)}</p>
            {m.alert && (
              <div className="flex items-center gap-1">
                <AlertTriangle size={10} className="text-red-400"/>
                <span className="text-[10px] text-red-400">
                  {m.alert==='no_brief'?`Pas de brief depuis ${m.daysSinceLastBrief}j`:`IPR insuffisant`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Détails */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Dimensions */}
        <div>
          <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Dimensions Profil</p>
          <div className="space-y-0.5">
            <DimDetail icon={<Activity size={10}/>}       label="PULSE moyen"     value={m.pulseAvg}     color={iprColor(m.pulseAvg)}    suffix="/100"/>
            <DimDetail icon={<Target size={10}/>}         label="OKR progression" value={m.okrScore}      color={iprColor(m.okrScore)}    suffix="%"/>
            <DimDetail icon={<MessageSquare size={10}/>}  label="Feedback 360°"   value={m.f360Score}     color={iprColor(m.f360Score)}   suffix="/100"/>
            <DimDetail icon={<ClipboardList size={10}/>}  label="Dernier Review"  value={m.reviewScore}   color={iprColor(m.reviewScore)} suffix="/100"/>
            <DimDetail icon={<TrendingUp size={10}/>}     label={m.hasNitaData ? "Activité NITA" : "Régularité briefs"}
              value={m.activiteScore ?? m.briefRate}
              color={iprColor(m.activiteScore ?? m.briefRate)}
              suffix={m.hasNitaData ? "/100" : "%"}
              badge={m.hasNitaData ? "NITA" : null} />
          </div>
        </div>

        {/* Sparkline */}
        {m.sparkline?.length > 1 && (
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Tendance PULSE 14 jours</p>
            <div className="rounded-xl p-3"
              style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
              <Sparkline data={m.sparkline} width={264} height={44} color={color} filled/>
            </div>
          </div>
        )}

        {/* Notes Manager */}
        <ManagerNotesPanel employeeId={m.id} employeeName={m.firstName} />

        {/* Recommandation IA */}
        <div className="rounded-xl p-4"
          style={{ background:'rgba(79,70,229,0.07)', border:'1px solid rgba(79,70,229,0.13)' }}>
          <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            ⚡ Recommandation IA Coach
          </p>
          <p className="text-[11px] text-white/55 leading-relaxed">
            {generateRecommendation(m)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/[0.06] space-y-2">
        <button onClick={onNavigate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow:'0 4px 12px rgba(79,70,229,0.25)' }}>
          <BarChart3 size={13}/> Voir dans Intelligence RH
        </button>
        <button
          onClick={() => {
            const subject = encodeURIComponent(`1:1 avec ${m.firstName} ${m.lastName}`)
            const body    = encodeURIComponent(`Bonjour ${m.firstName},\n\nJe souhaite planifier un entretien individuel avec vous.\n\nCordialement`)
            window.open(`mailto:?subject=${subject}&body=${body}`)
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.05] border border-white/[0.08] transition-all">
          <Users size={13}/> Planifier un 1:1
        </button>
        <button onClick={onClose}
          className="w-full px-4 py-2 rounded-xl text-sm text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
          Fermer
        </button>
      </div>
    </div>
  )
}

function generateRecommendation(m) {
  if (m.alert === 'no_brief')
    return `${m.firstName} n'a pas soumis de brief depuis ${m.daysSinceLastBrief} jours consécutifs. Planifier un entretien individuel pour comprendre les obstacles. Vérifier la charge de travail.`
  if (m.alert === 'low_ipr')
    return `L'IPR de ${m.firstName} est en dessous du seuil (${m.ipr}/100). Examiner ensemble les objectifs OKR en retard et identifier les points de blocage. Renforcer le suivi hebdomadaire.`
  if ((m.ipr ?? 0) >= 80)
    return `${m.firstName} est en excellente performance ce mois. Envisager une reconnaissance publique ou une montée en responsabilité pour maintenir la motivation.`
  return `${m.firstName} est sur une trajectoire correcte (${m.ipr??'—'}/100). Maintenir le rythme et s'assurer que les OKR restent alignés avec les priorités du service.`
}

function DimDetail({ icon, label, value, color, suffix, badge }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-white/20 flex-shrink-0">{icon}</span>
      <span className="text-[11px] text-white/40 flex-1">{label}</span>
      {badge && (
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full mr-1"
          style={{ background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>{badge}</span>
      )}
      <span className="text-xs font-bold" style={{ color:value!==null&&value!==undefined?color:'#6B7280', fontFamily:"'Syne',sans-serif" }}>
        {value!==null&&value!==undefined?`${value}${suffix}`:'—'}
      </span>
    </div>
  )
}

function SortTh({ k, label, cur, dir, onSort }) {
  const active = cur===k
  return (
    <button onClick={()=>onSort(k)}
      className={`flex items-center gap-0.5 transition-colors ${active?'text-indigo-400':'hover:text-white/50'}`}>
      {label}{active&&<span className="text-[8px]">{dir==='desc'?'▼':'▲'}</span>}
    </button>
  )
}
