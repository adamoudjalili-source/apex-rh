// ============================================================
// APEX RH — components/recrutement/MyApplications.jsx
// Session 59 — Mes candidatures (vue collaborateur)
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Calendar, Building2, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react'
import {
  useMyApplications,
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS,
  CONTRACT_TYPE_LABELS, CONTRACT_TYPE_COLORS,
  PIPELINE_STAGES,
} from '../../hooks/useRecruitment'

// ─── Progress Pipeline ────────────────────────────────────────
function PipelineProgress({ status }) {
  const activeStages = ['nouveau', 'en_revue', 'telephone', 'entretien', 'test', 'offre', 'accepte']
  const refused = ['refuse', 'retire'].includes(status)
  const currentIdx = activeStages.indexOf(status)

  if (refused) {
    return (
      <div className="flex items-center gap-1.5 mt-3">
        <XCircle size={13} className="text-red-400"/>
        <span className="text-xs text-red-400">{APPLICATION_STATUS_LABELS[status]}</span>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-0">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isActive = idx <= currentIdx
          const isCurrent = idx === currentIdx
          return (
            <div key={stage.status} className="flex items-center">
              <div className="relative flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full transition-all ${isCurrent ? 'w-3 h-3' : ''}`}
                  style={{
                    background: isActive ? stage.color : 'rgba(255,255,255,0.1)',
                    boxShadow: isCurrent ? `0 0 8px ${stage.color}80` : undefined,
                  }}/>
                {isCurrent && (
                  <div className="absolute -bottom-5 text-[9px] whitespace-nowrap font-medium"
                    style={{ color: stage.color }}>
                    {stage.label}
                  </div>
                )}
              </div>
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className="w-6 h-[1px]"
                  style={{ background: idx < currentIdx ? stage.color : 'rgba(255,255,255,0.08)' }}/>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Card candidature ─────────────────────────────────────────
function ApplicationCard({ app }) {
  const statusColor = APPLICATION_STATUS_COLORS[app.status] || '#6B7280'
  const typeColor = CONTRACT_TYPE_COLORS[app.job?.contract_type] || '#6B7280'
  const accepted = app.status === 'accepte'
  const refused = ['refuse', 'retire'].includes(app.status)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl p-5"
      style={{
        background: accepted
          ? 'rgba(16,185,129,0.06)'
          : refused
          ? 'rgba(239,68,68,0.04)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${accepted ? 'rgba(16,185,129,0.2)' : refused ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.07)'}`,
      }}>

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-0.5">{app.job?.title || 'Poste inconnu'}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: typeColor + '20', color: typeColor }}>
              {CONTRACT_TYPE_LABELS[app.job?.contract_type]}
            </span>
            <span className="text-[11px] text-white/30">
              Postulé le {new Date(app.applied_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: statusColor + '18', border: `1px solid ${statusColor}30` }}>
          {accepted ? <CheckCircle size={11} style={{ color: statusColor }}/> :
           refused ? <XCircle size={11} style={{ color: statusColor }}/> :
           <Clock size={11} style={{ color: statusColor }}/>}
          <span className="text-[11px] font-medium" style={{ color: statusColor }}>
            {APPLICATION_STATUS_LABELS[app.status]}
          </span>
        </div>
      </div>

      <PipelineProgress status={app.status}/>

      {app.status === 'accepte' && (
        <div className="mt-6 pt-3 border-t border-white/[0.05]">
          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle size={12}/> Félicitations ! Votre candidature a été retenue.
          </p>
        </div>
      )}

      {app.status === 'refuse' && app.rejection_reason && (
        <div className="mt-6 pt-3 border-t border-white/[0.05]">
          <p className="text-xs text-white/30">Motif : {app.rejection_reason}</p>
        </div>
      )}

      {!accepted && !refused && (
        <div className="mt-6"/>
      )}
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function MyApplications() {
  const { data: applications = [], isLoading } = useMyApplications()

  if (isLoading) {
    return <div className="text-center py-16 text-white/30 text-sm">Chargement...</div>
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <Send size={36} className="mx-auto text-white/10"/>
        <p className="text-white/30 text-sm">Vous n'avez pas encore postulé à une offre.</p>
        <p className="text-white/20 text-xs">Consultez les offres disponibles et postulez !</p>
      </div>
    )
  }

  const active = applications.filter(a => !['accepte', 'refuse', 'retire'].includes(a.status))
  const closed = applications.filter(a => ['accepte', 'refuse', 'retire'].includes(a.status))

  return (
    <div className="space-y-5">
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/30">
            En cours ({active.length})
          </h3>
          {active.map(app => <ApplicationCard key={app.id} app={app}/>)}
        </div>
      )}
      {closed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/30">
            Terminées ({closed.length})
          </h3>
          {closed.map(app => <ApplicationCard key={app.id} app={app}/>)}
        </div>
      )}
    </div>
  )
}
