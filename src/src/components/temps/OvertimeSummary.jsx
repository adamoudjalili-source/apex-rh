// ============================================================
// APEX RH — src/components/temps/OvertimeSummary.jsx
// Session 71 — Récapitulatif hebdomadaire heures supplémentaires
// Vue semaine : normales / HS 25% / HS 50% / total · SVG natif
// ============================================================
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth }        from '../../contexts/AuthContext'
import {
  useTimeSheets,
  useTimeSettings,
  useRecalculateOvertime,
  getCurrentWeekStart,
  getWeekDates,
  formatHours,
  TIMESHEET_STATUS_LABELS,
  TIMESHEET_STATUS_COLORS,
  calculateOvertimeBreakdown,
} from '../../hooks/useTemps'

// ─── Carte semaine ────────────────────────────────────────────
function WeekCard({ sheet, settings, userId, onRecalc }) {
  const recalc = useRecalculateOvertime()
  const [expanded, setExpanded] = useState(false)

  if (!sheet) return (
    <div className="rounded-2xl border border-dashed border-white/10 p-5 flex flex-col items-center
                    justify-center gap-2 min-h-[140px]">
      <Clock className="w-6 h-6 text-white/20"/>
      <p className="text-xs text-white/30">Aucune feuille cette semaine</p>
    </div>
  )

  const statusColor = TIMESHEET_STATUS_COLORS[sheet.status] || '#6B7280'
  const totalH  = Number(sheet.total_hours    || 0)
  const regH    = Number(sheet.regular_hours  || sheet.total_hours - sheet.overtime_hours || 0)
  const ot25H   = Number(sheet.ot_25_hours    || 0)
  const ot50H   = Number(sheet.ot_50_hours    || 0)
  const ot100H  = Number(sheet.ot_100_hours   || 0)
  const otTotal = Number(sheet.overtime_hours || 0)

  const weekThresh = settings?.weekly_threshold_hours || 40
  const maxBar  = Math.max(totalH, weekThresh) * 1.1 || 1

  // Barre empilée SVG
  const W = 200
  const H = 12
  const segReg  = (regH   / maxBar) * W
  const segOt25 = (ot25H  / maxBar) * W
  const segOt50 = (ot50H  / maxBar) * W
  const segOt100= (ot100H / maxBar) * W
  const threshX = (weekThresh / maxBar) * W

  const dates = getWeekDates(sheet.week_start)

  return (
    <div className="rounded-2xl border border-white/[0.08] p-5 transition-all hover:border-white/15"
      style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">
            Semaine du {new Date(sheet.week_start + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
          </p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
            style={{ background: statusColor + '20', color: statusColor }}
          >
            {TIMESHEET_STATUS_LABELS[sheet.status] || sheet.status}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{formatHours(totalH)}</p>
          {otTotal > 0 && (
            <p className="text-xs text-amber-400 font-medium">+{formatHours(otTotal)} HS</p>
          )}
        </div>
      </div>

      {/* Barre empilée */}
      <div className="mb-3">
        <svg width="100%" height={H + 8} viewBox={`0 0 ${W} ${H + 8}`} preserveAspectRatio="none">
          {/* Fond */}
          <rect x={0} y={0} width={W} height={H} rx={H/2} fill="rgba(255,255,255,0.06)"/>
          {/* Segments */}
          {segReg > 0 && (
            <rect x={0} y={0} width={segReg} height={H} rx={H/2} fill="#10B981"/>
          )}
          {segOt25 > 0 && (
            <rect x={segReg} y={0} width={segOt25} height={H} rx={0} fill="#F59E0B"/>
          )}
          {segOt50 > 0 && (
            <rect x={segReg + segOt25} y={0} width={segOt50} height={H} rx={0} fill="#EF4444"/>
          )}
          {segOt100 > 0 && (
            <rect x={segReg + segOt25 + segOt50} y={0} width={segOt100} height={H} rx={0} fill="#7C3AED"/>
          )}
          {/* Seuil vertical */}
          {threshX > 0 && threshX < W && (
            <>
              <line x1={threshX} y1={0} x2={threshX} y2={H + 7} stroke="#ffffff40" strokeWidth={1.5} strokeDasharray="2,2"/>
              <text x={threshX + 2} y={H + 7} fontSize={7} fill="#ffffff40">
                {formatHours(weekThresh)}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Détail heures */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Normal',   val: regH,   color: '#10B981' },
          { label: '+25%',     val: ot25H,  color: '#F59E0B' },
          { label: '+50%',     val: ot50H,  color: '#EF4444' },
          { label: '+100%',    val: ot100H, color: '#7C3AED' },
        ].map((seg, i) => (
          <div key={i} className="text-center">
            <p className="text-base font-bold" style={{ color: seg.color }}>{formatHours(seg.val)}</p>
            <p className="text-xs text-white/30">{seg.label}</p>
          </div>
        ))}
      </div>

      {/* Statut validation HS */}
      {otTotal > 0 && (
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-white/40">Validation HS :</span>
          <span className="font-medium" style={{ color: sheet.overtime_approved ? '#10B981' : '#F59E0B' }}>
            {sheet.overtime_approved ? '✓ Validées' : '⏳ En attente'}
          </span>
        </div>
      )}

      {/* Recalculer */}
      <button
        onClick={async () => {
          await recalc.mutateAsync({ timesheetId: sheet.id })
          onRecalc?.()
        }}
        disabled={recalc.isPending}
        className="w-full text-xs text-white/30 hover:text-white/60 transition-colors py-1 flex items-center justify-center gap-1"
      >
        {recalc.isPending
          ? <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin"/>
          : <TrendingUp className="w-3 h-3"/>
        }
        Recalculer HS
      </button>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function OvertimeSummary({ userId: propUserId }) {
  const { profile } = useAuth()
  const uid = propUserId || profile?.id

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)

  // Générer les 8 dernières semaines
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date()
    const day = d.getDay()
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diffToMonday - (i * 7))
    return d.toISOString().split('T')[0]
  }).reverse()

  const visibleWeeks = weeks.slice(currentWeekOffset, currentWeekOffset + 4)

  const { data: sheets }   = useTimeSheets({ userId: uid })
  const { data: settings } = useTimeSettings()

  const sheetByWeek = {}
  ;(sheets || []).forEach(s => { sheetByWeek[s.week_start] = s })

  // Stats globales (4 semaines visibles)
  const visibleSheets = visibleWeeks.map(w => sheetByWeek[w]).filter(Boolean)
  const totalH  = visibleSheets.reduce((a, s) => a + Number(s.total_hours    || 0), 0)
  const totalOt = visibleSheets.reduce((a, s) => a + Number(s.overtime_hours || 0), 0)
  const totalOt25 = visibleSheets.reduce((a, s) => a + Number(s.ot_25_hours  || 0), 0)
  const totalOt50 = visibleSheets.reduce((a, s) => a + Number(s.ot_50_hours  || 0), 0)

  return (
    <div className="space-y-4">
      {/* Bande stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total 4 sem.', val: formatHours(totalH),   color: '#A78BFA', icon: Clock },
          { label: 'Total HS',     val: formatHours(totalOt),  color: '#F59E0B', icon: TrendingUp },
          { label: 'HS taux 25%',  val: formatHours(totalOt25), color: '#FBBF24', icon: AlertCircle },
          { label: 'HS taux 50%',  val: formatHours(totalOt50), color: '#EF4444', icon: AlertCircle },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] px-4 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.val}</p>
            <p className="text-xs text-white/40">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Navigation semaines */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Récapitulatif par semaine</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeekOffset(Math.max(0, currentWeekOffset - 4))}
            disabled={currentWeekOffset === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all
                       border border-white/10 hover:border-white/20 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 text-white/60"/>
          </button>
          <span className="text-xs text-white/40 min-w-[120px] text-center">
            {visibleWeeks[0] && new Date(visibleWeeks[0] + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
            {' → '}
            {visibleWeeks[3] && new Date(visibleWeeks[3] + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
          </span>
          <button
            onClick={() => setCurrentWeekOffset(Math.min(weeks.length - 4, currentWeekOffset + 4))}
            disabled={currentWeekOffset >= weeks.length - 4}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all
                       border border-white/10 hover:border-white/20 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-white/60"/>
          </button>
        </div>
      </div>

      {/* Grille semaines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {visibleWeeks.map(week => (
          <WeekCard
            key={week}
            sheet={sheetByWeek[week]}
            settings={settings}
            userId={uid}
          />
        ))}
      </div>
    </div>
  )
}
