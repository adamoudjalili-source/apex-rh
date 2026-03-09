// ============================================================
// APEX RH — Reports.jsx
// ✅ Session 23 — Rapports PULSE (Phase D)
// ✅ Session 25 — Phase G : Lien retour /pulse → /tasks (fusion UI)
// PDF : window.print() natif (zéro dépendance externe)
// Excel : import * as XLSX from 'xlsx' (statique, déjà installé)
// ============================================================

// 1. React hooks
import { useState, useMemo } from 'react'
// 2. Librairies externes
import { motion } from 'framer-motion'
import {
  FileText, ChevronLeft, Calendar,
  User, Users, CheckCircle2, FileSpreadsheet, Printer
} from 'lucide-react'
import * as XLSX from 'xlsx'
// 3. React Router
import { Navigate, Link } from 'react-router-dom'
// 4. Contexts
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { useAppSettings } from '../../hooks/useSettings'
// 5. Hooks projet
import {
  useTeamScoreHistory,
  useUserScoreHistory,
  buildLeaderboard,
  getPeriodDates,
} from '../../hooks/usePerformanceScores'
import { useTeamDailyLogs } from '../../hooks/useManagerReview'
// 6. Helpers
import {
  isPulseEnabled,
  PULSE_COLORS,
  formatDateFr,
  formatMinutes,
  SATISFACTION_LABELS,
} from '../../lib/pulseHelpers'

// S69 — MANAGER_ROLES remplacé par canManageTeam

// ─── TYPES DE RAPPORTS ────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: 'daily_individual',
    icon: <User size={18} />,
    label: 'Rapport Journalier Individuel',
    desc: 'Mon résumé du jour : brief, journal, score',
    format: ['PDF', 'Excel'],
    roles: 'all',
    color: PULSE_COLORS.primary,
  },
  {
    id: 'daily_team',
    icon: <Users size={18} />,
    label: 'Rapport Journalier Équipe',
    desc: "Vue synthétique de l'équipe : soumissions, évaluations",
    format: ['Excel'],
    roles: 'manager',
    color: PULSE_COLORS.delivery,
  },
  {
    id: 'weekly',
    icon: <Calendar size={18} />,
    label: 'Rapport Hebdomadaire',
    desc: 'Performance de la semaine : scores, tendances',
    format: ['PDF', 'Excel'],
    roles: 'all',
    color: PULSE_COLORS.quality,
  },
  {
    id: 'monthly',
    icon: <FileText size={18} />,
    label: 'Rapport Mensuel Complet',
    desc: 'Bilan mensuel : classement, évolution, dimensions',
    format: ['PDF', 'Excel'],
    roles: 'all',
    color: PULSE_COLORS.gold,
  },
]

// ─── COULEUR SCORE ────────────────────────────────────────────
function scoreColor(s) {
  return s >= 70 ? '#10B981' : s >= 40 ? '#F59E0B' : '#EF4444'
}

// ─── GÉNÉRATION HTML POUR window.print() ─────────────────────
function buildPrintHTML({ subtitle, leaderboard, myScores, myLog, selectedType }) {
  let body = ''

  if (selectedType === 'daily_individual' || selectedType === 'weekly') {
    const scoreSection = myScores.length
      ? `<h3>Scores</h3>
         <table>
           <thead><tr><th>Dimension</th><th>Score</th></tr></thead>
           <tbody>
             ${myScores.slice(-1).map(s => `
               <tr><td>Score Total</td><td style="color:${scoreColor(s.score_total)};font-weight:bold">${s.score_total}</td></tr>
               <tr><td>Livraison (40%)</td><td>${s.score_delivery ?? '—'}</td></tr>
               <tr><td>Qualité (30%)</td><td>${s.score_quality ?? '—'}</td></tr>
               <tr><td>Régularité (20%)</td><td>${s.score_regularity ?? '—'}</td></tr>
               <tr><td>Bonus OKR (10%)</td><td>${s.score_bonus ?? '—'}</td></tr>
             `).join('')}
           </tbody>
         </table>`
      : '<p style="color:#888">Aucun score disponible pour cette période.</p>'

    const logSection = myLog
      ? `<h3>Journal du jour</h3>
         <p><strong>Statut :</strong> ${myLog.status}</p>
         ${myLog.overall_note ? `<p><strong>Note :</strong> ${myLog.overall_note}</p>` : ''}
         ${myLog.satisfaction_level
           ? `<p><strong>Satisfaction :</strong> ${SATISFACTION_LABELS[myLog.satisfaction_level] || ''}</p>`
           : ''}
         ${myLog.daily_log_entries?.length ? `
           <h4>Tâches travaillées (${myLog.daily_log_entries.length})</h4>
           <table>
             <thead><tr><th>Tâche</th><th>Temps</th><th>Progression</th></tr></thead>
             <tbody>
               ${myLog.daily_log_entries.map(e =>
                 `<tr>
                   <td>${e.task?.title || '—'}</td>
                   <td>${formatMinutes(e.time_spent_min)}</td>
                   <td>${e.progress_after ?? 0}%</td>
                 </tr>`
               ).join('')}
             </tbody>
           </table>
         ` : ''}
       `
      : ''

    body = scoreSection + logSection
  }

  if ((selectedType === 'monthly' || selectedType === 'weekly') && leaderboard.length) {
    body += `
      <h3>Classement équipe (${leaderboard.length} agents)</h3>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Agent</th><th>Service</th>
            <th>Score</th><th>Livraison</th><th>Qualité</th><th>Régularité</th><th>Bonus</th><th>Jours</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard.map(u => `
            <tr>
              <td>${u.rank}</td>
              <td>${u.firstName} ${u.lastName}</td>
              <td>${u.service || ''}</td>
              <td style="color:${scoreColor(u.avgTotal)};font-weight:bold">${u.avgTotal}</td>
              <td>${u.avgDelivery}</td>
              <td>${u.avgQuality}</td>
              <td>${u.avgRegularity}</td>
              <td>${u.avgBonus}</td>
              <td>${u.daysCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>PULSE — Rapport</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 32px; font-size: 13px; }
    .header { border-bottom: 3px solid #4F46E5; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 20px; color: #4F46E5; margin-bottom: 4px; }
    .header p  { font-size: 11px; color: #666; margin-top: 4px; }
    h3 { font-size: 13px; color: #374151; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    h4 { font-size: 12px; color: #6B7280; margin: 12px 0 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F3F4F6; padding: 7px 10px; text-align: left; font-weight: 600; color: #374151; font-size: 11px; }
    td { padding: 6px 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    p  { margin: 5px 0; line-height: 1.6; color: #4B5563; }
    .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>APEX RH — PULSE</h1>
    <p>${subtitle}</p>
    <p>Généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  ${body || '<p style="color:#888">Aucune donnée disponible pour cette période.</p>'}
  <div class="footer">APEX RH — NITA Transfert d'Argent · Document confidentiel</div>
</body>
</html>`
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function Reports() {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canManageTeam = can('pulse', 'team', 'read')
  const { data: settings, isLoading: settingsLoading } = useAppSettings()

  const [selectedType, setSelectedType]   = useState('daily_individual')
  const [selectedDate, setSelectedDate]   = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating]       = useState(null) // 'PDF' | 'Excel' | null
  const [lastGenerated, setLastGenerated] = useState(null)

  const isManager = canManageTeam

  // ─── Guard PULSE ──────────────────────────────────────────
  if (!settingsLoading && !isPulseEnabled(settings)) {
    return <Navigate to="/dashboard" replace />
  }

  // ─── Période ──────────────────────────────────────────────
  const periodForReport = useMemo(() => {
    if (selectedType === 'weekly')  return getPeriodDates('week')
    if (selectedType === 'monthly') return getPeriodDates('month')
    return { startDate: selectedDate, endDate: selectedDate }
  }, [selectedType, selectedDate])

  // ─── Requêtes données ─────────────────────────────────────
  const { data: teamScores = [], isLoading: scoresLoading } =
    useTeamScoreHistory(periodForReport.startDate, periodForReport.endDate)

  const { data: myScores = [], isLoading: myScoresLoading } =
    useUserScoreHistory(profile?.id, periodForReport.startDate, periodForReport.endDate)

  const { data: teamLogs = [], isLoading: logsLoading } =
    useTeamDailyLogs(selectedDate)

  const leaderboard = useMemo(() => buildLeaderboard(teamScores), [teamScores])

  const isLoading = scoresLoading || myScoresLoading || (isManager && logsLoading)

  // ─── Filtrage types par rôle ──────────────────────────────
  const visibleTypes = REPORT_TYPES.filter(t =>
    t.roles === 'all' || (t.roles === 'manager' && isManager)
  )

  // ─── PDF via window.print() ───────────────────────────────
  function handlePDF() {
    setGenerating('PDF')
    const reportDef = REPORT_TYPES.find(t => t.id === selectedType)
    const subtitle  = `${reportDef?.label} · ${
      selectedType === 'daily_individual' || selectedType === 'daily_team'
        ? formatDateFr(selectedDate)
        : `${formatDateFr(periodForReport.startDate)} → ${formatDateFr(periodForReport.endDate)}`
    }`
    const myLog = teamLogs.find(l => l.user_id === profile?.id) || null

    const html = buildPrintHTML({ subtitle, leaderboard, myScores, myLog, selectedType })
    const win  = window.open('', '_blank', 'width=900,height=700')

    if (!win) {
      alert('Popup bloquée par le navigateur.\nAutorisez les popups pour ce site puis réessayez.')
      setGenerating(null)
      return
    }

    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      setLastGenerated({ format: 'PDF (impression)', fileName: reportDef?.label, date: new Date() })
      setGenerating(null)
    }, 500)
  }

  // ─── Excel via SheetJS (import statique) ──────────────────
  function handleExcel() {
    setGenerating('Excel')
    try {
      const wb = XLSX.utils.book_new()

      if (selectedType === 'daily_team' && isManager) {
        const rows = teamLogs.map(log => ({
          'Prénom':       log.user?.first_name || '',
          'Nom':          log.user?.last_name  || '',
          'Service':      log.user?.services?.name || '',
          'Statut':       log.status,
          'Soumis à':     log.submitted_at
            ? new Date(log.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : '',
          'Nb tâches':    log.daily_log_entries?.length || 0,
          'Satisfaction': log.satisfaction_level ? SATISFACTION_LABELS[log.satisfaction_level] : '',
          'Note mgr':     log.manager_reviews?.[0]?.quality_rating || '',
          'Commentaire':  log.manager_reviews?.[0]?.comment || '',
        }))
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: 'Aucune donnée' }]),
          String(formatDateFr(selectedDate)).slice(0, 31)
        )
      }

      else if (selectedType === 'weekly' || selectedType === 'monthly') {
        if (leaderboard.length) {
          XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(leaderboard.map(u => ({
              'Rang': u.rank, 'Prénom': u.firstName, 'Nom': u.lastName,
              'Service': u.service || '', 'Score': u.avgTotal,
              'Livraison': u.avgDelivery, 'Qualité': u.avgQuality,
              'Régularité': u.avgRegularity, 'Bonus': u.avgBonus,
              'Jours': u.daysCount,
              'Tendance': u.trend > 0 ? `+${u.trend}` : String(u.trend),
            }))),
            'Classement'
          )
        }
        if (teamScores.length) {
          XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(teamScores.map(s => ({
              'Date': s.score_date,
              'Prénom': s.user?.first_name || '', 'Nom': s.user?.last_name || '',
              'Total': s.score_total, 'Livraison': s.score_delivery,
              'Qualité': s.score_quality, 'Régularité': s.score_regularity,
              'Bonus': s.score_bonus,
            }))),
            'Scores journaliers'
          )
        }
      }

      else if (selectedType === 'daily_individual') {
        const myScore = myScores.find(s => s.score_date === selectedDate)
        const myLog   = teamLogs.find(l => l.user_id === profile?.id)
        const rows    = []
        if (myScore) {
          rows.push({ Métrique: 'Score Total',      Valeur: myScore.score_total })
          rows.push({ Métrique: 'Livraison (40%)',  Valeur: myScore.score_delivery })
          rows.push({ Métrique: 'Qualité (30%)',    Valeur: myScore.score_quality })
          rows.push({ Métrique: 'Régularité (20%)', Valeur: myScore.score_regularity })
          rows.push({ Métrique: 'Bonus OKR (10%)',  Valeur: myScore.score_bonus })
          if (myLog?.daily_log_entries?.length) {
            rows.push({ Métrique: '' })
            for (const e of myLog.daily_log_entries) {
              rows.push({
                Métrique: e.task?.title || 'Tâche',
                Valeur: `${formatMinutes(e.time_spent_min)} — ${e.progress_after ?? 0}%`,
              })
            }
          }
        }
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: 'Aucune donnée disponible' }]),
          'Mon rapport'
        )
      }

      if (!wb.SheetNames.length) {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet([{ Message: 'Aucune donnée disponible pour cette période' }]),
          'Rapport'
        )
      }

      const fileName = `PULSE_${selectedType}_${selectedDate}.xlsx`
      XLSX.writeFile(wb, fileName)
      setLastGenerated({ format: 'Excel', fileName, date: new Date() })

    } catch (err) {
      alert('Erreur génération Excel : ' + err.message)
    } finally {
      setGenerating(null)
    }
  }

  const currentType = REPORT_TYPES.find(t => t.id === selectedType)

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* ─── EN-TÊTE ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          to="/tasks"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <ChevronLeft size={16} className="text-white/50" />
        </Link>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.2)' }}
        >
          <FileText size={22} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Rapports PULSE
          </h1>
          <p className="text-sm text-white/30">Impression PDF & Export Excel</p>
        </div>
      </div>

      {/* ─── TYPES DE RAPPORTS ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleTypes.map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className="rounded-xl p-4 text-left transition-all"
            style={{
              background: selectedType === type.id ? `${type.color}12` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selectedType === type.id ? type.color + '40' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${type.color}20`, color: type.color }}
              >
                {type.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{type.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{type.desc}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {type.format.map(f => (
                    <span
                      key={f}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${type.color}18`, color: type.color }}
                    >
                      {f === 'PDF' ? '🖨 PDF' : '📊 Excel'}
                    </span>
                  ))}
                </div>
              </div>
              {selectedType === type.id && (
                <CheckCircle2 size={16} style={{ color: type.color }} className="flex-shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ─── PARAMÈTRES ───────────────────────────────────── */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p className="text-sm font-semibold text-white">Paramètres</p>

        {(selectedType === 'daily_individual' || selectedType === 'daily_team') && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/40 w-16 flex-shrink-0">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="text-sm text-white px-3 py-2 rounded-lg outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>
        )}

        {(selectedType === 'weekly' || selectedType === 'monthly') && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/40 w-16 flex-shrink-0">Période</label>
            <span className="text-sm text-white/60">
              {formatDateFr(periodForReport.startDate)} → {formatDateFr(periodForReport.endDate)}
            </span>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-white/30">
            <div
              className="w-4 h-4 rounded-full border border-t-transparent animate-spin flex-shrink-0"
              style={{ borderColor: `${PULSE_COLORS.primary}40`, borderTopColor: PULSE_COLORS.primary }}
            />
            Chargement des données…
          </div>
        )}
      </div>

      {/* ─── BOUTONS DE GÉNÉRATION ────────────────────────── */}
      {currentType && (
        <div className="flex items-center gap-3 flex-wrap">
          {currentType.format.includes('PDF') && (
            <button
              onClick={handlePDF}
              disabled={!!generating || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: generating === 'PDF'
                  ? 'rgba(79,70,229,0.5)'
                  : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              }}
            >
              {generating === 'PDF'
                ? <><div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" /> Ouverture…</>
                : <><Printer size={16} /> Imprimer / PDF</>
              }
            </button>
          )}

          {currentType.format.includes('Excel') && (
            <button
              onClick={handleExcel}
              disabled={!!generating || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: generating === 'Excel'
                  ? 'rgba(16,185,129,0.4)'
                  : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              }}
            >
              {generating === 'Excel'
                ? <><div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" /> Génération…</>
                : <><FileSpreadsheet size={16} /> Télécharger Excel</>
              }
            </button>
          )}
        </div>
      )}

      {/* ─── CONFIRMATION ─────────────────────────────────── */}
      {lastGenerated && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm rounded-xl px-4 py-3"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
          <span className="text-green-400 font-medium">{lastGenerated.format} :</span>
          <span className="text-white/50">{lastGenerated.fileName}</span>
        </motion.div>
      )}

      {/* ─── NOTE PDF ─────────────────────────────────────── */}
      <div
        className="flex items-start gap-2 text-xs rounded-xl px-4 py-3"
        style={{
          background: 'rgba(79,70,229,0.06)',
          border: '1px solid rgba(79,70,229,0.15)',
        }}
      >
        <Printer size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-indigo-300/60">
          <strong>PDF :</strong> Une fenêtre d'impression s'ouvrira.
          Dans la boîte de dialogue, sélectionnez <em>"Enregistrer en PDF"</em> comme
          imprimante pour obtenir un fichier PDF.
        </div>
      </div>
    </div>
  )
}
