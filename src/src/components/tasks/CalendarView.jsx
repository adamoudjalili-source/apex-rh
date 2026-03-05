// ============================================================
// APEX RH — CalendarView.jsx
// ============================================================
import { useState } from 'react'
import { getStatusInfo, getPriorityInfo } from '../../lib/taskHelpers'

export default function CalendarView({ tasks, onTaskClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay + 6) % 7 // Lundi = 0

  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  function getTasksForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.due_date === dateStr)
  }

  function isToday(day) {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-base font-semibold text-white capitalize">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden flex-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-[#0F0F23] min-h-24" />
          }

          const dayTasks = getTasksForDay(day)
          const today = isToday(day)

          return (
            <div
              key={day}
              className={`bg-[#0F0F23] p-2 min-h-24 ${today ? 'ring-1 ring-inset ring-indigo-500/50' : ''}`}
            >
              {/* Numéro du jour */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1.5 ${
                today ? 'bg-indigo-600 text-white' : 'text-gray-400'
              }`}>
                {day}
              </div>

              {/* Tâches */}
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => {
                  const statusInfo = getStatusInfo(task.status)
                  const priorityInfo = getPriorityInfo(task.priority)
                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task.id)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: `${statusInfo.color}20`,
                        color: statusInfo.color,
                        borderLeft: `2px solid ${priorityInfo.color}`,
                      }}
                    >
                      {task.title}
                    </button>
                  )
                })}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-gray-600 px-1">+{dayTasks.length - 3} autres</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mt-3 px-1">
        <span className="text-xs text-gray-600">Légende :</span>
        {[
          { color: '#F59E0B', label: 'En cours' },
          { color: '#8B5CF6', label: 'En revue' },
          { color: '#EF4444', label: 'Bloquée' },
          { color: '#10B981', label: 'Terminée' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}