// ============================================================
// APEX RH — src/components/temps/TimeSheetGrid.jsx
// Session 66 — Grille de saisie hebdomadaire
// ============================================================
import { useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Send, X, AlertCircle, CheckCircle } from 'lucide-react'
import {
  useMyCurrentTimeSheet, useCreateTimeSheet, useTimeEntries,
  useDeleteTimeEntry, useSubmitTimeSheet, useRejectTimeSheet,
  getCurrentWeekStart, getWeekDates, formatHours,
  TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS, ENTRY_TYPE_LABELS,
} from '../../hooks/useTemps'
import TimeEntryForm from './TimeEntryForm'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function addWeeks(weekStart, n) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TimeSheetGrid({ weekStart: externalWeekStart, userId: externalUserId, readOnly = false }) {
  const [weekStart, setWeekStart] = useState(externalWeekStart || getCurrentWeekStart())
  const [showForm,  setShowForm]  = useState(false)
  const [formDate,  setFormDate]  = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: sheet, isLoading } = useMyCurrentTimeSheet()
  const createSheet  = useCreateTimeSheet()
  const submitSheet  = useSubmitTimeSheet()
  const rejectSheet  = useRejectTimeSheet()
  const deleteEntry  = useDeleteTimeEntry()

  // Use sheet from current week hook or we need to find the sheet for the selected week
  const sheetForWeek = sheet?.week_start === weekStart ? sheet : null
  const { data: entries = [] } = useTimeEntries(sheetForWeek?.id)

  const weekDates = getWeekDates(weekStart)
  const isDraft = !sheetForWeek || sheetForWeek.status === 'draft'
  const canEdit = !readOnly && isDraft

  const handleCreateOrAddEntry = async (date) => {
    if (!sheetForWeek) {
      // Create sheet first
      const s = await createSheet.mutateAsync({ weekStart })
      setFormDate(date)
      setShowForm(true)
    } else {
      setFormDate(date)
      setShowForm(true)
    }
  }

  const handleSubmit = async () => {
    if (!sheetForWeek) return
    await submitSheet.mutateAsync(sheetForWeek.id)
  }

  const entriesByDate = weekDates.reduce((acc, d) => {
    acc[d] = entries.filter(e => e.entry_date === d)
    return acc
  }, {})

  const statusColor = sheetForWeek ? TIMESHEET_STATUS_COLORS[sheetForWeek.status] : '#6B7280'
  const statusLabel = sheetForWeek ? TIMESHEET_STATUS_LABELS[sheetForWeek.status] : 'Aucune feuille'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-indigo-400 animate-spin"/>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Navigation semaine + statut */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addWeeks(weekStart, -1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft size={15}/>
          </button>
          <div className="text-sm font-semibold text-white/80">
            Semaine du {new Date(weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </div>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            disabled={weekStart >= getCurrentWeekStart()}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-30">
            <ChevronRight size={15}/>
          </button>
          <button onClick={() => setWeekStart(getCurrentWeekStart())}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors">
            Aujourd'hui
          </button>
        </div>

        <div className="flex items-center gap-3">
          {sheetForWeek && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }}/>
              {statusLabel}
            </div>
          )}
          {sheetForWeek && (
            <div className="text-sm font-semibold text-white/60">
              Total: <span className="text-white">{formatHours(sheetForWeek.total_hours)}</span>
              {Number(sheetForWeek.overtime_hours) > 0 && (
                <span className="ml-1 text-amber-400 text-xs">
                  (+{formatHours(sheetForWeek.overtime_hours)} sup.)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Refus reason */}
      {sheetForWeek?.status === 'rejected' && sheetForWeek.rejection_reason && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0"/>
          <div>
            <span className="text-red-400 font-medium">Feuille refusée : </span>
            <span className="text-white/60">{sheetForWeek.rejection_reason}</span>
          </div>
        </div>
      )}

      {/* Grille jours */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, i) => {
          const dayEntries = entriesByDate[date] || []
          const dayTotal   = dayEntries.reduce((s, e) => s + Number(e.hours), 0)
          const isWeekend  = i >= 5
          const isToday    = date === new Date().toISOString().split('T')[0]

          return (
            <div key={date}
              className="rounded-xl p-2 min-h-[120px] flex flex-col transition-all"
              style={{
                background: isToday
                  ? 'rgba(99,102,241,0.06)'
                  : isWeekend ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                border: isToday ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.05)',
              }}>

              {/* Header jour */}
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">{DAY_LABELS[i]}</p>
                  <p className={`text-xs font-semibold ${isToday ? 'text-indigo-300' : 'text-white/60'}`}>
                    {new Date(date).getDate()}
                  </p>
                </div>
                {dayTotal > 0 && (
                  <span className="text-[10px] font-mono text-white/40">{formatHours(dayTotal)}</span>
                )}
              </div>

              {/* Entrées */}
              <div className="flex-1 space-y-1">
                {dayEntries.map(entry => (
                  <div key={entry.id}
                    onClick={() => canEdit && setEditEntry(entry)}
                    className={`px-2 py-1 rounded-lg text-[10px] leading-tight ${canEdit ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-300">{formatHours(entry.hours)}</span>
                      {canEdit && (
                        <button onClick={e => { e.stopPropagation(); deleteEntry.mutate({ id: entry.id, timesheetId: sheetForWeek.id }) }}
                          className="text-white/20 hover:text-red-400 transition-colors ml-1">
                          <X size={9}/>
                        </button>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-white/40 truncate mt-0.5">{entry.description}</p>
                    )}
                    {entry.projects?.name && (
                      <p className="text-cyan-400/60 truncate">{entry.projects.name}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Bouton ajouter */}
              {canEdit && !isWeekend && (
                <button
                  onClick={() => handleCreateOrAddEntry(date)}
                  className="mt-1.5 w-full py-1 rounded-lg text-white/20 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center justify-center"
                  title="Ajouter des heures">
                  <Plus size={12}/>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Formulaire ajout */}
      {(showForm || editEntry) && sheetForWeek && (
        <TimeEntryForm
          timesheetId={sheetForWeek.id}
          entryDate={formDate}
          entry={editEntry}
          onClose={() => { setShowForm(false); setEditEntry(null); setFormDate(null) }}
        />
      )}

      {/* Actions bas */}
      {canEdit && sheetForWeek && sheetForWeek.status === 'draft' && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitSheet.isPending || entries.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
            {submitSheet.isPending
              ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
              : <><Send size={13}/> Soumettre la feuille</>
            }
          </button>
        </div>
      )}

      {sheetForWeek?.status === 'submitted' && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <CheckCircle size={14} className="text-amber-400"/>
          <span className="text-amber-300">Feuille soumise, en attente d'approbation manager.</span>
        </div>
      )}

      {sheetForWeek?.status === 'manager_approved' && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <CheckCircle size={14} className="text-blue-400"/>
          <span className="text-blue-300">Approuvée par le manager, en attente de validation RH.</span>
        </div>
      )}

      {sheetForWeek?.status === 'hr_approved' && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={14} className="text-emerald-400"/>
          <span className="text-emerald-300">✓ Feuille validée par les RH.</span>
        </div>
      )}
    </div>
  )
}
