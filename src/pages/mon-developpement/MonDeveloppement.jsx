// ============================================================
// APEX RH — MonDeveloppement.jsx  ·  Session 41 (RÉÉCRITURE COMPLÈTE)
// Route /mon-developpement
//   • PDI : Plan de Développement Individuel avec actions par compétence
//   • Feedbacks 360° reçus : radar compétences + synthèse commentaires
//   • Boucle fermée : Review Cycles → PDI → Objectifs
// ⚠️ NE PAS réintroduire de score IPR composite côté employé
// ⚠️ NE PAS modifier Sidebar.jsx, App.jsx, useTasks.js, usePulse.js
// ============================================================
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
  useMyPlan, usePlanActions, useUpsertPlan,
  useCreateAction, useUpdateAction, useDeleteAction,
  COMPETENCY_OPTIONS, ACTION_STATUS_LABELS, ACTION_STATUS_COLORS,
  ACTION_PRIORITY_LABELS, ACTION_PRIORITY_COLORS,
  computePdiProgress, groupActionsByCompetency, CURRENT_PERIOD,
} from '../../hooks/useDevelopmentPlan'
import { useFeedbackReceived, FEEDBACK_QUESTIONS } from '../../hooks/useFeedback360'
import { useMyEvaluations, OVERALL_RATING_LABELS, OVERALL_RATING_COLORS } from '../../hooks/useReviewCycles'
import {
  BookOpen, Target, MessageSquare, CheckCircle2, Circle,
  Plus, ChevronDown, Trash2, Pencil, X, Check,
  TrendingUp, Zap, RefreshCw, Calendar, ArrowRight, ChevronRight,
} from 'lucide-react'

// ─── Animations ──────────────────────────────────────────────
const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }
const fadeUp  = { hidden:{ opacity:0, y:12 }, visible:{ opacity:1, y:0, transition:{ duration:0.35, ease:[0.4,0,0.2,1] } } }

// ─── Constantes visuelles ────────────────────────────────────
const ACCENT = '#10B981'

// ─── Helpers ─────────────────────────────────────────────────
const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '—'
const isOverdue = d => d && new Date(d) < new Date()

// ─── Radar SVG Compétences ───────────────────────────────────
function RadarChart({ scores, size = 200 }) {
  const N  = FEEDBACK_QUESTIONS.length
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38
  const angle = i => (Math.PI * 2 * i) / N - Math.PI / 2
  const pt    = (i, val) => {
    const a = angle(i), v = ((val ?? 0) / 10) * r
    return { x: cx + Math.cos(a) * v, y: cy + Math.sin(a) * v }
  }
  const ptOut = i => ({ x: cx + Math.cos(angle(i)) * r, y: cy + Math.sin(angle(i)) * r })
  const gridPoly = f => FEEDBACK_QUESTIONS.map((_,i)=>{
    const a=angle(i); const v=r*f
    return `${cx+Math.cos(a)*v},${cy+Math.sin(a)*v}`
  }).join(' ')
  const scorePts = FEEDBACK_QUESTIONS.map((q,i)=>pt(i, scores[q.key]??0))
  const poly     = scorePts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')+'Z'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[.25,.5,.75,1].map((f,i)=><polygon key={i} points={gridPoly(f)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>)}
      {FEEDBACK_QUESTIONS.map((_,i)=>{const o=ptOut(i);return <line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>})}
      <path d={poly} fill={`${ACCENT}22`} stroke={ACCENT} strokeWidth="1.8" strokeLinejoin="round"/>
      {scorePts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill={ACCENT} opacity="0.9"/>)}
      {FEEDBACK_QUESTIONS.map((q,i)=>{
        const o=ptOut(i), a=angle(i), off=15
        const tx=cx+Math.cos(a)*(r+off), ty=cy+Math.sin(a)*(r+off)
        const s=scores[q.key]
        return <g key={i}>
          <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="rgba(255,255,255,0.5)" fontFamily="Inter,sans-serif">{q.icon}</text>
          {s!=null && <text x={tx} y={ty+12} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill={ACCENT} fontWeight="700" fontFamily="Inter,sans-serif">{s.toFixed(1)}</text>}
        </g>
      })}
    </svg>
  )
}

// ─── Carte action PDI ────────────────────────────────────────
function ActionCard({ action, planId, onEdit }) {
  const updateAction = useUpdateAction()
  const deleteAction = useDeleteAction()
  const [confirm, setConfirm] = useState(false)
  const sc = ACTION_STATUS_COLORS[action.status]

  const toggle = () => updateAction.mutate({ id:action.id, plan_id:planId, status:action.status==='done'?'todo':'done' })

  return (
    <motion.div layout className="rounded-xl border p-3.5 flex gap-3 items-start group"
      style={{ background:action.status==='done'?'rgba(16,185,129,0.04)':'rgba(255,255,255,0.025)', borderColor:action.status==='done'?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.06)' }}>
      <button onClick={toggle} className="flex-shrink-0 mt-0.5 transition-transform active:scale-90">
        {action.status==='done' ? <CheckCircle2 size={18} style={{color:ACCENT}}/> : <Circle size={18} className="text-white/20 group-hover:text-white/40 transition-colors"/>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${action.status==='done'?'text-white/30 line-through':'text-white/85'}`}>{action.title}</p>
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={()=>onEdit(action)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors"><Pencil size={11} className="text-white/40"/></button>
            {confirm
              ? <button onClick={()=>{deleteAction.mutate({id:action.id,plan_id:planId});setConfirm(false)}} className="w-6 h-6 rounded flex items-center justify-center bg-red-500/20"><Check size={11} className="text-red-400"/></button>
              : <button onClick={()=>setConfirm(true)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors"><Trash2 size={11} className="text-white/40"/></button>
            }
          </div>
        </div>
        {action.description && <p className="text-xs text-white/30 mt-1 leading-relaxed">{action.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:`${sc}18`,color:sc}}>{ACTION_STATUS_LABELS[action.status]}</span>
          {action.priority!=='medium' && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{background:`${ACTION_PRIORITY_COLORS[action.priority]}15`,color:ACTION_PRIORITY_COLORS[action.priority]}}>{ACTION_PRIORITY_LABELS[action.priority]}</span>}
          {action.due_date && <span className={`text-[10px] flex items-center gap-1 ${isOverdue(action.due_date)&&action.status!=='done'?'text-red-400':'text-white/25'}`}><Calendar size={9}/>{fmt(action.due_date)}</span>}
          {action.review_cycle && <span className="text-[10px] text-indigo-400/60 flex items-center gap-1"><RefreshCw size={9}/>{action.review_cycle.title}</span>}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Formulaire action ───────────────────────────────────────
function ActionForm({ planId, competencyKey, editAction, onClose, reviewCycles=[] }) {
  const createAction = useCreateAction()
  const updateAction = useUpdateAction()
  const isEdit = !!editAction
  const [form, setForm] = useState({
    title:           editAction?.title||'',
    description:     editAction?.description||'',
    competency_key:  editAction?.competency_key||competencyKey||'other',
    priority:        editAction?.priority||'medium',
    due_date:        editAction?.due_date||'',
    review_cycle_id: editAction?.review_cycle_id||'',
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const submit = async () => {
    if(!form.title.trim()) return
    setSaving(true)
    try {
      const payload = { title:form.title, description:form.description||null, competency_key:form.competency_key, priority:form.priority, due_date:form.due_date||null, review_cycle_id:form.review_cycle_id||null }
      if(isEdit) await updateAction.mutateAsync({ id:editAction.id, plan_id:planId, ...payload })
      else       await createAction.mutateAsync({ plan_id:planId, ...payload })
      onClose()
    } catch(e){console.error(e)}
    setSaving(false)
  }

  return (
    <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
      className="rounded-xl border border-white/10 p-4 mb-3" style={{background:'rgba(16,185,129,0.04)'}}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-white/60">{isEdit?'Modifier':'Nouvelle action'}</p>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={14}/></button>
      </div>
      <div className="space-y-2.5">
        <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Titre de l'action…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50"/>
        <input value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Description (optionnel)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50"/>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">Compétence</label>
            <select value={form.competency_key} onChange={e=>set('competency_key',e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50">
              {COMPETENCY_OPTIONS.map(c=><option key={c.key} value={c.key} style={{background:'#1a1a2e'}}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">Priorité</label>
            <select value={form.priority} onChange={e=>set('priority',e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50">
              {Object.entries(ACTION_PRIORITY_LABELS).map(([k,v])=><option key={k} value={k} style={{background:'#1a1a2e'}}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">Échéance</label>
            <input type="date" value={form.due_date} onChange={e=>set('due_date',e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"/>
          </div>
          {reviewCycles.length>0 && <div>
            <label className="text-[10px] text-white/30 mb-1 block">Review liée</label>
            <select value={form.review_cycle_id} onChange={e=>set('review_cycle_id',e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50">
              <option value="" style={{background:'#1a1a2e'}}>— Aucune</option>
              {reviewCycles.map(c=><option key={c.id} value={c.id} style={{background:'#1a1a2e'}}>{c.title}</option>)}
            </select>
          </div>}
        </div>
        <button onClick={submit} disabled={!form.title.trim()||saving}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
          style={{background:form.title.trim()?`${ACCENT}22`:undefined,color:ACCENT,border:`1px solid ${ACCENT}35`}}>
          {saving?'Enregistrement…':isEdit?'Mettre à jour':'Ajouter'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Section compétence ──────────────────────────────────────
function CompetencySection({ comp, actions, planId, userId, reviewCycles }) {
  const [open,setOpen]       = useState(true)
  const [showForm,setShowForm] = useState(false)
  const [editAction,setEdit]  = useState(null)
  const done  = actions.filter(a=>a.status==='done').length
  const total = actions.length
  const pct   = total?Math.round((done/total)*100):0
  const closeForm = () => { setShowForm(false); setEdit(null) }
  const handleEdit = a => { setEdit(a); setShowForm(true) }

  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{background:'rgba(255,255,255,0.015)'}}>
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-base" style={{background:`${comp.color}15`,border:`1px solid ${comp.color}25`}}>{comp.icon}</div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/80">{comp.label}</span>
            {total>0 && <span className="text-[10px] text-white/30">{done}/{total}</span>}
          </div>
          {total>0 && <div className="mt-1 h-1 w-32 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:pct===100?ACCENT:comp.color}}/></div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {total>0 && <span className="text-[11px] font-bold" style={{color:pct===100?ACCENT:comp.color}}>{pct}%</span>}
          <ChevronDown size={14} className="text-white/20 transition-transform" style={{transform:open?'rotate(180deg)':'rotate(0deg)'}}/>
        </div>
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}}>
          <div className="px-4 pb-4 space-y-2">
            {actions.map(a=><ActionCard key={a.id} action={a} planId={planId} onEdit={handleEdit}/>)}
            {showForm && <ActionForm planId={planId} userId={userId} competencyKey={comp.key} editAction={editAction} onClose={closeForm} reviewCycles={reviewCycles}/>}
            {!showForm && <button onClick={()=>setShowForm(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 hover:border-white/20 transition-colors group">
              <Plus size={12} className="text-white/20 group-hover:text-white/40 transition-colors"/>
              <span className="text-xs text-white/20 group-hover:text-white/40 transition-colors">Ajouter une action</span>
            </button>}
          </div>
        </motion.div>}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Onglet PDI ──────────────────────────────────────────────
function TabPDI({ profile, reviewCycles }) {
  const period     = CURRENT_PERIOD()
  const { data:plan, isLoading:planLoading } = useMyPlan(period)
  const { data:actions=[], isLoading:actionsLoading } = usePlanActions(plan?.id)
  const upsertPlan = useUpsertPlan()

  const [editObj,setEditObj]   = useState(false)
  const [objText,setObjText]   = useState('')
  const [creating,setCreating] = useState(false)

  const progress    = computePdiProgress(actions)
  const groups      = useMemo(()=>groupActionsByCompetency(actions),[actions])
  const totalDone   = actions.filter(a=>a.status==='done').length
  const totalInProg = actions.filter(a=>a.status==='in_progress').length
  const totalTodo   = actions.filter(a=>a.status==='todo').length

  useEffect(()=>{ if(plan) setObjText(plan.objectives||'') },[plan])

  const ensurePlan = async () => {
    if(plan) return plan
    setCreating(true)
    const p = await upsertPlan.mutateAsync({ period_label:period })
    setCreating(false)
    return p
  }
  const saveObjectives = async () => {
    await upsertPlan.mutateAsync({ period_label:period, objectives:objText||null })
    setEditObj(false)
  }

  if(planLoading||actionsLoading) return <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"/></div>

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
      {/* Progression globale */}
      {actions.length>0 && <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] p-4" style={{background:'rgba(16,185,129,0.04)'}}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white/80">Progression PDI {period}</p>
            <p className="text-xs text-white/30 mt-0.5">{totalDone} réalisée{totalDone>1?'s':''} · {totalInProg} en cours · {totalTodo} à faire</p>
          </div>
          <p className="text-2xl font-bold" style={{color:ACCENT}}>{progress}%</p>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full" style={{background:`linear-gradient(90deg,${ACCENT},#34D399)`}} initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.6,ease:[0.4,0,0.2,1]}}/>
        </div>
        <div className="flex gap-2 mt-3">
          {[{label:'Réalisées',count:totalDone,color:ACCENT},{label:'En cours',count:totalInProg,color:'#F59E0B'},{label:'À faire',count:totalTodo,color:'#6B7280'}].map(b=>(
            <div key={b.label} className="flex-1 rounded-lg px-2.5 py-2 text-center" style={{background:`${b.color}10`,border:`1px solid ${b.color}20`}}>
              <p className="text-lg font-bold" style={{color:b.color}}>{b.count}</p>
              <p className="text-[10px] text-white/30">{b.label}</p>
            </div>
          ))}
        </div>
      </motion.div>}

      {/* Objectifs */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] p-4" style={{background:'rgba(255,255,255,0.015)'}}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white/60 flex items-center gap-2"><Target size={14} style={{color:ACCENT}}/>Objectifs {period}</p>
          <button onClick={()=>setEditObj(o=>!o)} className="text-[11px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"><Pencil size={10}/>{editObj?'Annuler':'Modifier'}</button>
        </div>
        {editObj
          ? <div className="space-y-2">
              <textarea value={objText} onChange={e=>setObjText(e.target.value)} rows={4} placeholder="Décrivez vos objectifs de développement pour cette période…" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 resize-none"/>
              <button onClick={saveObjectives} className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{background:`${ACCENT}22`,color:ACCENT,border:`1px solid ${ACCENT}35`}}>Enregistrer</button>
            </div>
          : plan?.objectives
            ? <p className="text-sm text-white/50 leading-relaxed">{plan.objectives}</p>
            : <p className="text-xs text-white/20 italic">Aucun objectif défini — cliquez "Modifier" pour décrire vos ambitions.</p>
        }
      </motion.div>

      {/* Sections compétences */}
      {COMPETENCY_OPTIONS.map(comp=>(
        <CompetencySection key={comp.key} comp={comp} actions={groups[comp.key]||[]} planId={plan?.id} userId={profile?.id} reviewCycles={reviewCycles}/>
      ))}

      {/* Démarrage PDI vide */}
      {!plan && actions.length===0 && <motion.div variants={fadeUp} className="rounded-2xl border border-dashed border-white/10 p-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}20`}}><BookOpen size={20} style={{color:ACCENT}}/></div>
        <h3 className="text-base font-semibold text-white/70 mb-1">Commencez votre PDI {period}</h3>
        <p className="text-xs text-white/30 mb-4 max-w-xs">Définissez vos objectifs et les actions concrètes pour progresser dans chaque compétence.</p>
        <button onClick={ensurePlan} disabled={creating} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50" style={{background:`${ACCENT}22`,color:ACCENT,border:`1px solid ${ACCENT}35`}}>
          {creating?'Création…':'Créer mon PDI'}
        </button>
      </motion.div>}
    </motion.div>
  )
}

// ─── Onglet Feedbacks 360° ───────────────────────────────────
function TabFeedbacks({ profile }) {
  const { data:feedbacks=[], isLoading } = useFeedbackReceived(profile?.id)

  const avgScores = useMemo(()=>{
    if(!feedbacks.length) return {}
    const sums={}, counts={}
    for(const fb of feedbacks) {
      for(const resp of (fb.responses||[])) {
        if(resp.score!==null) {
          sums[resp.question_key]   = (sums[resp.question_key]||0)+resp.score
          counts[resp.question_key] = (counts[resp.question_key]||0)+1
        }
      }
    }
    const r={}
    for(const k of Object.keys(sums)) r[k]=sums[k]/counts[k]
    return r
  },[feedbacks])

  const hasScores  = Object.keys(avgScores).length>0
  const globalAvg  = hasScores ? Object.values(avgScores).reduce((a,b)=>a+b,0)/Object.values(avgScores).length : null
  const typeColors = { self:'#4F46E5', peer:'#F59E0B', manager:'#10B981' }
  const typeLabels = { self:'Auto-évaluation', peer:'Pair', manager:'Manager' }

  if(isLoading) return <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"/></div>

  if(!feedbacks.length) return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible"
      className="rounded-2xl border border-dashed border-white/10 p-10 flex flex-col items-center text-center mt-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{background:'rgba(79,70,229,0.1)',border:'1px solid rgba(79,70,229,0.2)'}}><MessageSquare size={20} style={{color:'#4F46E5'}}/></div>
      <h3 className="text-base font-semibold text-white/70 mb-1">Aucun feedback validé</h3>
      <p className="text-xs text-white/30 max-w-xs">Vos feedbacks 360° apparaîtront ici une fois validés par votre manager.</p>
    </motion.div>
  )

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
      {/* Radar */}
      {hasScores && <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] p-4" style={{background:'rgba(79,70,229,0.04)'}}>
        <div className="flex items-center gap-5">
          <RadarChart scores={avgScores} size={155}/>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-white/70">Profil de compétences</p>
            <p className="text-xs text-white/30">{feedbacks.length} feedback{feedbacks.length>1?'s':''} reçu{feedbacks.length>1?'s':''}</p>
            {globalAvg!==null && <div className="flex items-baseline gap-1.5 mt-2"><span className="text-3xl font-bold" style={{color:ACCENT}}>{globalAvg.toFixed(1)}</span><span className="text-sm text-white/30">/10</span><span className="text-xs text-white/40 ml-1">moy.</span></div>}
            <div className="space-y-1.5 mt-2">
              {FEEDBACK_QUESTIONS.map(q=>{
                const s=avgScores[q.key]
                if(s===undefined) return null
                return <div key={q.key} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30 w-4 flex-shrink-0">{q.icon}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{width:`${(s/10)*100}%`,background:ACCENT}}/></div>
                  <span className="text-[11px] font-semibold w-6 text-right" style={{color:ACCENT}}>{s.toFixed(1)}</span>
                </div>
              })}
            </div>
          </div>
        </div>
      </motion.div>}

      {/* Liste feedbacks */}
      <motion.div variants={fadeUp} className="space-y-2">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1">Historique</p>
        {feedbacks.map(fb=>{
          const comments=(fb.responses||[]).filter(r=>r.comment).map(r=>r.comment)
          return <motion.div key={fb.id} variants={fadeUp} className="rounded-xl border border-white/[0.06] p-3.5" style={{background:'rgba(255,255,255,0.015)'}}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-white/75">{fb.campaign?.title||'Campagne'}</p>
                <p className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{background:`${typeColors[fb.type]}18`,color:typeColors[fb.type]}}>{typeLabels[fb.type]}</span>
                  {fb.evaluator&&fb.type!=='self'&&<span>par {fb.evaluator.first_name} {fb.evaluator.last_name}</span>}
                  <span>· {fmt(fb.submitted_at)}</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 mb-2">
              {FEEDBACK_QUESTIONS.map(q=>{
                const resp=(fb.responses||[]).find(r=>r.question_key===q.key)
                const s=resp?.score
                return <div key={q.key} className="text-center">
                  <div className="text-base">{q.icon}</div>
                  <div className="text-[10px] font-bold mt-0.5" style={{color:s!==undefined?ACCENT:'#4B5563'}}>{s!==undefined?s:'—'}</div>
                </div>
              })}
            </div>
            {comments.length>0 && <div className="space-y-1 mt-2 pt-2 border-t border-white/[0.05]">
              {comments.map((c,i)=><p key={i} className="text-xs text-white/35 italic leading-relaxed">"{c}"</p>)}
            </div>}
          </motion.div>
        })}
      </motion.div>
    </motion.div>
  )
}

// ─── Onglet Boucle Fermée ────────────────────────────────────
function TabBoucle({ profile }) {
  const { data:evaluations=[], isLoading } = useMyEvaluations()
  const recent    = evaluations.slice(0,5)
  const validated = evaluations.filter(e=>e.status==='validated')
  const freqIcon  = { quarterly:'📅', biannual:'🗓️', annual:'📆' }

  if(isLoading) return <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"/></div>

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
      {/* Schéma cycle */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] p-4" style={{background:'rgba(255,255,255,0.015)'}}>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Cycle de performance continu</p>
        <div className="flex items-center justify-between gap-1">
          {[
            {icon:RefreshCw, label:'Review',   color:'#4F46E5'},
            null,
            {icon:BookOpen,  label:'PDI',      color:ACCENT},
            null,
            {icon:Target,    label:'Objectifs',color:'#F59E0B'},
            null,
            {icon:TrendingUp,label:'Performance',color:'#EC4899'},
          ].map((s,i)=>{
            if(!s) return <ArrowRight key={i} size={10} className="text-white/15 flex-shrink-0"/>
            return <div key={i} className="flex flex-col items-center text-center flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{background:`${s.color}15`,border:`1px solid ${s.color}25`}}><s.icon size={13} style={{color:s.color}}/></div>
              <p className="text-[10px] font-semibold text-white/60 leading-tight">{s.label}</p>
            </div>
          })}
        </div>
      </motion.div>

      {/* Mes évaluations */}
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1 mb-2">Mes évaluations formelles</p>
        {!recent.length
          ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <RefreshCw size={20} className="text-white/15 mx-auto mb-2"/>
              <p className="text-xs text-white/25">Aucune évaluation trouvée. Vos Review Cycles apparaîtront ici.</p>
            </div>
          : <div className="space-y-2">
              {recent.map(ev=>{
                const rColor = ev.overall_rating ? OVERALL_RATING_COLORS[ev.overall_rating] : '#6B7280'
                const rLabel = ev.overall_rating ? OVERALL_RATING_LABELS[ev.overall_rating] : null
                const mAnswers = ev.manager_answers||{}
                const mScores  = Object.values(mAnswers).filter(v=>typeof v==='number')
                const mAvg     = mScores.length ? (mScores.reduce((a,b)=>a+b,0)/mScores.length).toFixed(1) : null

                return <motion.div key={ev.id} variants={fadeUp} className="rounded-xl border border-white/[0.06] p-3.5" style={{background:'rgba(255,255,255,0.015)'}}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs">{freqIcon[ev.cycle?.frequency]||'📄'}</span>
                        <p className="text-sm font-semibold text-white/75 truncate">{ev.cycle?.title||'Évaluation'}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{background:ev.status==='validated'?`${ACCENT}18`:'rgba(107,114,128,0.15)',color:ev.status==='validated'?ACCENT:'#9CA3AF'}}>
                          {ev.status==='validated'?'✓ Validée':ev.status==='manager_submitted'?'En attente':ev.status==='self_submitted'?'Auto soumise':'En cours'}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/30 mt-0.5">
                        {ev.evaluator?`${ev.evaluator.first_name} ${ev.evaluator.last_name} · `:''}
                        {ev.cycle?.period_start&&`${new Date(ev.cycle.period_start).toLocaleDateString('fr-FR',{month:'short',year:'numeric'})} — ${new Date(ev.cycle.period_end).toLocaleDateString('fr-FR',{month:'short',year:'numeric'})}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {rLabel && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{background:`${rColor}18`,color:rColor}}>{rLabel}</span>}
                      {mAvg&&!rLabel && <span className="text-sm font-bold" style={{color:ACCENT}}>{mAvg}/10</span>}
                    </div>
                  </div>
                  {ev.final_comment&&ev.status==='validated' && <p className="text-[11px] text-white/30 italic mt-2 pt-2 border-t border-white/[0.05] leading-relaxed">"{ev.final_comment}"</p>}
                  {ev.synthesis&&Object.keys(ev.synthesis).length>0&&ev.status==='validated' && <div className="flex gap-3 mt-2 pt-2 border-t border-white/[0.05] flex-wrap">
                    {ev.synthesis.pulse_avg_score!=null && <div className="flex items-center gap-1"><Zap size={10} className="text-indigo-400"/><span className="text-[10px] text-white/40">PULSE {ev.synthesis.pulse_avg_score?.toFixed(0)}</span></div>}
                    {ev.synthesis.feedback360_avg!=null && <div className="flex items-center gap-1"><MessageSquare size={10} className="text-emerald-400"/><span className="text-[10px] text-white/40">F360 {ev.synthesis.feedback360_avg?.toFixed(1)}/10</span></div>}
                    {ev.synthesis.okr_completion_rate!=null && <div className="flex items-center gap-1"><Target size={10} className="text-amber-400"/><span className="text-[10px] text-white/40">OKR {(ev.synthesis.okr_completion_rate*100)?.toFixed(0)}%</span></div>}
                  </div>}
                </motion.div>
              })}
            </div>
        }
      </motion.div>

      {/* CTA PDI si review validée */}
      {validated.length>0 && <motion.div variants={fadeUp}
        className="rounded-xl border border-emerald-500/20 p-3.5 flex items-center gap-3"
        style={{background:'rgba(16,185,129,0.05)'}}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${ACCENT}15`}}><BookOpen size={14} style={{color:ACCENT}}/></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/70">Dernière évaluation disponible</p>
          <p className="text-[11px] text-white/35 mt-0.5">Créez ou mettez à jour votre PDI pour tracer vos axes de progression.</p>
        </div>
        <ChevronRight size={14} className="text-white/20 flex-shrink-0"/>
      </motion.div>}
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function MonDeveloppement() {
  const { profile }  = useAuth()
  const [activeTab, setActiveTab] = useState('pdi')

  const { data:evaluations=[] } = useMyEvaluations()
  const reviewCycles = useMemo(()=>
    evaluations.map(e=>e.cycle).filter(Boolean).filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i)
  ,[evaluations])

  const TABS = [
    { id:'pdi',       label:'Mon PDI',         icon:BookOpen,       color:ACCENT    },
    { id:'feedbacks', label:'Feedbacks reçus',  icon:MessageSquare,  color:'#4F46E5' },
    { id:'boucle',    label:'Boucle & Reviews', icon:RefreshCw,      color:'#F59E0B' },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-hidden"
      style={{background:'linear-gradient(180deg,rgba(16,185,129,0.03) 0%,transparent 160px)'}}>

      {/* Header */}
      <motion.div variants={fadeUp} className="px-5 pt-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:`${ACCENT}15`,border:`1px solid ${ACCENT}25`}}>
            <BookOpen size={16} style={{color:ACCENT}}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>Mon Développement</h1>
            <p className="text-xs text-white/30">PDI · Feedbacks · Compétences · Progression</p>
          </div>
        </div>
      </motion.div>

      {/* Onglets */}
      <motion.div variants={fadeUp} className="px-5 pt-3 flex-shrink-0">
        <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
          {TABS.map(tab=>{
            const Icon=tab.icon, isActive=activeTab===tab.id
            return <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all"
              style={isActive?{background:`${tab.color}20`,color:tab.color,border:`1px solid ${tab.color}30`}:{color:'rgba(255,255,255,0.3)'}}>
              <Icon size={12}/>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.id==='pdi'?'PDI':tab.id==='feedbacks'?'F360':'Boucle'}</span>
            </button>
          })}
        </div>
      </motion.div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}>
            {activeTab==='pdi'       && <TabPDI       profile={profile} reviewCycles={reviewCycles}/>}
            {activeTab==='feedbacks' && <TabFeedbacks profile={profile}/>}
            {activeTab==='boucle'    && <TabBoucle    profile={profile}/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
