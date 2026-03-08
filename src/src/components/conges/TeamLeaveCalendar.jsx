// ============================================================
// APEX RH — src/components/conges/TeamLeaveCalendar.jsx
// Session 67 — Calendrier mensuel des absences équipe
// ============================================================
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTeamCalendar, LEAVE_STATUS_COLORS } from '../../hooks/useConges'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function getDaysInMonth(year, month) {
  const days = []
  const first = new Date(year, month - 1, 1)
  let startDow = first.getDay() // 0=dim
  if (startDow === 0) startDow = 7
  // jours vides avant le 1er
  for (let i = 1; i < startDow; i++) days.push(null)
  const total = new Date(year, month, 0).getDate()
  for (let d = 1; d <= total; d++) days.push(d)
  return days
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

export default function TeamLeaveCalendar() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [hover, setHover] = useState(null)

  const { data: absences = [], isLoading } = useTeamCalendar({ month, year })

  function prev() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const days = getDaysInMonth(year, month)
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  // Pour chaque jour, trouver les absences qui se chevauchent
  function getAbsencesForDay(day) {
    if (!day) return []
    const d = isoDate(year, month, day)
    return absences.filter(a =>
      a.start_date <= d && a.end_date >= d
      && a.status !== 'draft'
    )
  }

  // Tooltip
  const hoverAbsences = hover ? getAbsencesForDay(hover) : []

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>

      {/* Navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={prev}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
          <ChevronLeft size={15}/>
        </button>
        <h3 className="text-sm font-semibold text-white/80">
          {MONTHS_FR[month - 1]} {year}
        </h3>
        <button onClick={next}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
          <ChevronRight size={15}/>
        </button>
      </div>

      {/* En-têtes jours */}
      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-white/25 uppercase tracking-wider pb-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px px-3 pb-4">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`}/>
            const d = isoDate(year, month, day)
            const dayAbsences = getAbsencesForDay(day)
            const isToday = d === today
            const isWeekend = (() => {
              const dow = new Date(d).getDay()
              return dow === 0 || dow === 6
            })()

            return (
              <div
                key={day}
                className="relative min-h-[52px] rounded-lg p-1 cursor-default transition-colors"
                style={{
                  background: isToday
                    ? 'rgba(79,70,229,0.12)'
                    : hover === day
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                }}
                onMouseEnter={() => setHover(day)}
                onMouseLeave={() => setHover(null)}
              >
                {/* Numéro */}
                <div className={`text-[11px] font-medium text-center mb-1 ${
                  isToday      ? 'text-indigo-400 font-bold'
                  : isWeekend  ? 'text-white/20'
                  : 'text-white/50'
                }`}>
                  {isToday
                    ? <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center mx-auto text-[10px]">{day}</span>
                    : day}
                </div>

                {/* Absences */}
                <div className="space-y-0.5">
                  {dayAbsences.slice(0, 3).map(a => {
                    const typeColor = a.leave_types?.color || '#6366F1'
                    const isMaladie = a.leave_types?.code === 'MALADIE'
                    return (
                      <div
                        key={a.id}
                        className="rounded text-[8px] px-1 truncate leading-4"
                        style={{ background: `${typeColor}25`, color: typeColor }}
                        title={`${a.users?.first_name} ${a.users?.last_name} — ${a.leave_types?.name}`}
                      >
                        {isMaladie ? '••••' : `${a.users?.first_name?.[0]}. ${a.users?.last_name?.slice(0,6)}`}
                      </div>
                    )
                  })}
                  {dayAbsences.length > 3 && (
                    <div className="text-[8px] text-white/25 text-center">+{dayAbsences.length - 3}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Légende (tooltip) au survol */}
      {hover && hoverAbsences.length > 0 && (
        <div className="px-4 pb-4">
          <div className="rounded-xl px-4 py-3 text-xs space-y-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
              {MONTHS_FR[month-1]} {hover}
            </p>
            {hoverAbsences.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.leave_types?.color || '#6366F1' }}/>
                <span className="text-white/70 font-medium">
                  {a.leave_types?.code === 'MALADIE'
                    ? 'Absent(e)'
                    : `${a.users?.first_name} ${a.users?.last_name}`}
                </span>
                <span className="text-white/35 ml-auto">{a.leave_types?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats bas de page */}
      {absences.length > 0 && (
        <div className="px-5 py-3 border-t flex items-center gap-4 flex-wrap"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] text-white/30">
            {absences.length} absence{absences.length > 1 ? 's' : ''} ce mois
          </span>
          {/* Types présents */}
          {[...new Set(absences.map(a => a.leave_types?.code))].slice(0,4).map(code => {
            const a   = absences.find(x => x.leave_types?.code === code)
            const col = a?.leave_types?.color || '#6366F1'
            return (
              <span key={code} className="flex items-center gap-1 text-[10px] text-white/40">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: col }}/>
                {code}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
