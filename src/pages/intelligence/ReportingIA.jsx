// ============================================================
// APEX RH — src/pages/intelligence/ReportingIA.jsx
// Session 44 — Reporting Automatisé IA
// Vue manager : rapports mensuels et hebdo de l'équipe
// Vue collaborateur : rapport mensuel individuel
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
  useMyReports, useTeamReports,
  useGenerateReport, useDeleteReport,
  currentYearMonth, previousYearMonth, formatPeriodLabel, currentWeek,
} from '../../hooks/useReporting'
import {
  FileText, Sparkles, Download, Trash2, ChevronDown,
  TrendingUp, TrendingDown, Minus, Calendar, Users,
  AlertTriangle, Star, BarChart3, RefreshCw,
} from 'lucide-react'

// ─── Constantes ───────────────────────────────────────────────
const MANAGER_ROLES = ['chef_service','chef_division','directeur','administrateur']

const HIGHLIGHT_ICONS: Record<string, any> = {
  pulse   : BarChart3,
  briefs  : Calendar,
  okr     : Star,
  nita    : Sparkles,
  f360    : Users,
  members : Users,
  alert   : AlertTriangle,
  top     : Star,
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  monthly_individual: 'Rapport Mensuel Individuel',
  monthly_team      : 'Rapport Mensuel Équipe',
  weekly_team       : 'Rapport Hebdomadaire Équipe',
}

// ─── Utilitaires ──────────────────────────────────────────────
function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === 'up')   return <TrendingUp  size={12} className="text-emerald-400"/>
  if (trend === 'down') return <TrendingDown size={12} className="text-red-400"/>
  return <Minus size={12} className="text-white/30"/>
}

function exportToPDF(report: any) {
  const { stats, ai_summary, highlights = [], period_label, report_type } = report
  const isTeam = report_type?.includes('team')

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport APEX RH — ${period_label}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; margin-bottom: 28px; }
  .logo { font-size: 22px; font-weight: 800; color: #4F46E5; letter-spacing: -0.5px; }
  .logo span { color: #10B981; }
  .meta { text-align: right; color: #6b7280; font-size: 13px; }
  .meta strong { display: block; font-size: 18px; color: #1a1a2e; font-weight: 700; margin-bottom: 2px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .kpi { background: #f8f9ff; border: 1px solid #e8eaf6; border-radius: 12px; padding: 16px; }
  .kpi .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .kpi .value { font-size: 24px; font-weight: 800; color: #4F46E5; }
  .kpi .trend { font-size: 11px; margin-top: 4px; }
  .kpi .trend.up   { color: #10B981; }
  .kpi .trend.down { color: #EF4444; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 700; color: #4F46E5; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #e8eaf6; }
  .summary { background: #f0fdf4; border-left: 4px solid #10B981; border-radius: 0 8px 8px 0; padding: 16px 20px; font-size: 14px; line-height: 1.7; color: #374151; white-space: pre-wrap; }
  .members-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .members-table th { background: #f3f4ff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
  .members-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
  .members-table tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .badge.green { background: #d1fae5; color: #059669; }
  .badge.orange { background: #fef3c7; color: #d97706; }
  .badge.red { background: #fee2e2; color: #dc2626; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8eaf6; display: flex; justify-content: space-between; color: #9ca3af; font-size: 11px; }
  @media print { body { padding: 16px; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">APEX <span>RH</span><br><span style="font-size:13px;font-weight:400;color:#6b7280;">NITA Transfert d'Argent</span></div>
  <div class="meta">
    <strong>${REPORT_TYPE_LABELS[report_type] ?? 'Rapport'}</strong>
    Période : ${period_label}<br>
    Généré le ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
  </div>
</div>

${isTeam ? `<div style="font-size:18px;font-weight:700;margin-bottom:20px;">Service : ${stats?.service ?? ''}</div>` : `<div style="font-size:18px;font-weight:700;margin-bottom:20px;">${stats?.name ?? ''} — ${stats?.role ?? ''}</div>`}

<div class="kpi-grid">
${(highlights ?? []).slice(0,6).map((h: any) => `
<div class="kpi">
  <div class="label">${h.label}</div>
  <div class="value">${h.value}</div>
  ${h.trend ? `<div class="trend ${h.trend}">${h.trend === 'up' ? '▲ Positif' : h.trend === 'down' ? '▼ À surveiller' : '— Stable'}</div>` : ''}
</div>`).join('')}
</div>

<div class="section">
  <div class="section-title">Résumé IA — Analyse de la période</div>
  <div class="summary">${ai_summary ?? 'Résumé non disponible.'}</div>
</div>

${isTeam && stats?.member_details?.length ? `
<div class="section">
  <div class="section-title">Détails par collaborateur</div>
  <table class="members-table">
    <thead><tr><th>Collaborateur</th><th>PULSE moyen</th><th>Taux briefs</th><th>Jours mesurés</th><th>Statut</th></tr></thead>
    <tbody>
    ${stats.member_details.map((m: any) => {
      const score = m.pulse_avg ?? 0
      const cls = score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red'
      const lbl = score >= 70 ? 'Excellent' : score >= 40 ? 'Correct' : 'À surveiller'
      return `<tr>
        <td style="font-weight:600">${m.name}</td>
        <td>${m.pulse_avg ?? '—'}/100</td>
        <td>${m.brief_rate ?? '—'}%</td>
        <td>${m.days_measured ?? 0}</td>
        <td><span class="badge ${cls}">${lbl}</span></td>
      </tr>`
    }).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">
  <span>APEX RH · Rapport généré automatiquement par IA (Claude / Anthropic)</span>
  <span>Confidentiel — Usage interne NITA</span>
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(htmlContent)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }
}

// ─── Carte rapport ────────────────────────────────────────────
function ReportCard({ report, onDelete }: { report: any; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const isTeam   = report.report_type?.includes('team')
  const typeLabel = REPORT_TYPE_LABELS[report.report_type] ?? report.report_type
  const accentColor = isTeam ? '#4F46E5' : '#10B981'
  const highlights   = report.highlights ?? []

  return (
    <motion.div layout
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ background:'rgba(255,255,255,0.025)', borderColor:'rgba(255,255,255,0.07)' }}
    >
      {/* Header carte */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:`${accentColor}15`, border:`1px solid ${accentColor}25` }}>
            <FileText size={16} style={{ color: accentColor }}/>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{report.period_label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: accentColor }}>{typeLabel}</p>
            <p className="text-[10px] text-white/25 mt-1">
              Généré le {new Date(report.generated_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => exportToPDF(report)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
            style={{ color: accentColor, border:`1px solid ${accentColor}30` }}>
            <Download size={11}/> PDF
          </button>
          {confirmDel
            ? <>
                <button onClick={onDelete} className="px-2 py-1.5 rounded-lg text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">Confirmer</button>
                <button onClick={() => setConfirmDel(false)} className="px-2 py-1.5 rounded-lg text-[11px] text-white/30 hover:text-white/60 transition-all">Annuler</button>
              </>
            : <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/8 transition-all">
                <Trash2 size={12}/>
              </button>
          }
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all">
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`}/>
          </button>
        </div>
      </div>

      {/* KPIs highlights */}
      {highlights.length > 0 && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap">
          {highlights.slice(0,4).map((h: any, i: number) => {
            const Icon = HIGHLIGHT_ICONS[h.type] ?? BarChart3
            return (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <Icon size={11} className="text-white/30"/>
                <span className="text-[11px] text-white/45">{h.label}</span>
                <span className="text-[11px] font-semibold text-white/75">{h.value}</span>
                <TrendIcon trend={h.trend}/>
              </div>
            )
          })}
        </div>
      )}

      {/* Résumé IA — expandable */}
      <AnimatePresence>
        {expanded && report.ai_summary && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} className="overflow-hidden">
            <div className="px-5 pb-4 border-t border-white/[0.05] pt-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles size={12} style={{ color: accentColor }}/>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
                  Analyse IA — Claude
                </p>
              </div>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                {report.ai_summary}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Générateur de rapport ────────────────────────────────────
function ReportGenerator({ serviceId, isManager }: { serviceId?: string; isManager: boolean }) {
  const { profile }  = useAuth()
  const generate     = useGenerateReport()
  const { year: cy, month: cm } = currentYearMonth()
  const { year: py, month: pm } = previousYearMonth()
  const { year: wy, week: ww }  = currentWeek()

  const [selectedType, setSelectedType] = useState(isManager ? 'monthly_team' : 'monthly_individual')
  const [selectedPeriod, setSelectedPeriod] = useState('current')

  const TYPES = isManager
    ? [
        { id:'monthly_team',  label:'Mensuel équipe',   icon:'📊' },
        { id:'weekly_team',   label:'Hebdomadaire',     icon:'📅' },
      ]
    : [
        { id:'monthly_individual', label:'Mensuel individuel', icon:'📋' },
      ]

  const PERIODS = selectedType === 'weekly_team'
    ? [{ id:'current', label:`Semaine ${ww} (en cours)` }]
    : [
        { id:'current',  label:`${formatPeriodLabel(cy, cm)} (en cours)` },
        { id:'previous', label:`${formatPeriodLabel(py, pm)} (précédent)` },
      ]

  const handleGenerate = async () => {
    const isPrev   = selectedPeriod === 'previous'
    const isWeekly = selectedType === 'weekly_team'

    try {
      await generate.mutateAsync({
        reportType: selectedType,
        serviceId : isManager ? serviceId : undefined,
        userId    : !isManager ? profile?.id : undefined,
        year      : isWeekly ? wy : (isPrev ? py : cy),
        month     : isWeekly ? undefined : (isPrev ? pm : cm),
        week      : isWeekly ? ww : undefined,
      })
    } catch (err) {
      console.error('[ReportGenerator]', err)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden mb-4"
      style={{ background:'rgba(79,70,229,0.04)' }}>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-indigo-400"/>
          <p className="text-sm font-semibold text-white/80">Générer un nouveau rapport IA</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Type */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Type de rapport</p>
            <div className="flex flex-col gap-1.5">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setSelectedType(t.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left"
                  style={selectedType === t.id
                    ? { background:'rgba(79,70,229,0.2)', border:'1px solid rgba(79,70,229,0.4)', color:'#818CF8' }
                    : { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.45)' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Période */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Période</p>
            <div className="flex flex-col gap-1.5">
              {PERIODS.map(p => (
                <button key={p.id} onClick={() => setSelectedPeriod(p.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left"
                  style={selectedPeriod === p.id
                    ? { background:'rgba(79,70,229,0.2)', border:'1px solid rgba(79,70,229,0.4)', color:'#818CF8' }
                    : { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.45)' }}>
                  <Calendar size={12}/> {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generate.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'white' }}>
          {generate.isPending
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Génération en cours…</>
            : <><Sparkles size={14}/>Générer le rapport IA</>
          }
        </button>

        {generate.isError && (
          <p className="text-xs text-red-400 mt-2 text-center">
            ⚠️ {generate.error?.message ?? 'Erreur lors de la génération'}
          </p>
        )}
        {generate.isSuccess && (
          <p className="text-xs text-emerald-400 mt-2 text-center">
            ✓ Rapport généré et sauvegardé !
          </p>
        )}
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function ReportingIA() {
  const { profile } = useAuth()
  const isManager   = MANAGER_ROLES.includes(profile?.role ?? '')
  const serviceId   = profile?.service_id

  const deleteReport = useDeleteReport()
  const { data: myReports   = [], isLoading: myLoading }   = useMyReports()
  const { data: teamReports = [], isLoading: teamLoading } = useTeamReports(isManager ? serviceId : null)

  const reports  = isManager ? teamReports : myReports
  const isLoading = isManager ? teamLoading : myLoading

  return (
    <div className="p-6 max-w-3xl mx-auto pb-16">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background:'rgba(79,70,229,0.12)', border:'1px solid rgba(79,70,229,0.2)' }}>
          <FileText size={16} style={{ color:'#818CF8' }}/>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
            Rapports IA
          </h2>
          <p className="text-xs text-white/30">
            Générés automatiquement par Claude · Exportables en PDF
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
          style={{ background:'rgba(79,70,229,0.1)', color:'#818CF8', border:'1px solid rgba(79,70,229,0.2)' }}>
          <Sparkles size={11}/>IA Active
        </div>
      </div>

      {/* Générateur */}
      <ReportGenerator serviceId={serviceId} isManager={isManager} />

      {/* Liste des rapports */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"/>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ background:'rgba(79,70,229,0.1)', border:'1px solid rgba(79,70,229,0.15)' }}>
              📊
            </div>
            <p className="text-white/60 font-medium mb-1">Aucun rapport généré</p>
            <p className="text-sm text-white/30 max-w-xs">
              Cliquez sur "Générer le rapport IA" pour créer votre premier rapport automatisé.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-white/25 mb-2">
              {reports.length} rapport{reports.length > 1 ? 's' : ''} — triés du plus récent
            </p>
            {reports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onDelete={() => deleteReport.mutate({ reportId: report.id })}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
