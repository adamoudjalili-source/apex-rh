// ============================================================
// APEX RH — src/components/temps/TimeClockWidget.jsx
// Session 66 — Pointage entrée / sortie avec timer
// ============================================================
import { useState, useEffect } from 'react'
import { Clock, LogIn, LogOut, Coffee, Timer } from 'lucide-react'
import { useClockIn, useClockOut, useLastClockEvent, CLOCK_EVENT_LABELS } from '../../hooks/useTemps'

function elapsed(from) {
  const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function TimeClockWidget() {
  const { data: lastEvent, isLoading } = useLastClockEvent()
  const clockIn  = useClockIn()
  const clockOut = useClockOut()
  const [timer, setTimer]     = useState('')
  const [locating, setLocating] = useState(false)
  const [message, setMessage]  = useState(null)

  const isClockedIn = lastEvent?.event_type === 'clock_in' || lastEvent?.event_type === 'break_end'

  useEffect(() => {
    if (!isClockedIn || !lastEvent) return
    const tick = () => setTimer(elapsed(lastEvent.event_at))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isClockedIn, lastEvent])

  const getLocation = () =>
    new Promise((res) => {
      if (!navigator.geolocation) return res({})
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocating(false); res({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }) },
        ()    => { setLocating(false); res({}) },
        { timeout: 5000 }
      )
    })

  const handleClock = async () => {
    const loc = await getLocation()
    try {
      if (isClockedIn) {
        await clockOut.mutateAsync(loc)
        setMessage({ type: 'out', text: 'Départ enregistré ✓' })
      } else {
        await clockIn.mutateAsync(loc)
        setMessage({ type: 'in', text: 'Arrivée enregistrée ✓' })
      }
      setTimeout(() => setMessage(null), 3000)
    } catch (e) {
      setMessage({ type: 'error', text: 'Erreur d\'enregistrement' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const loading = clockIn.isPending || clockOut.isPending || locating || isLoading

  const lastTime = lastEvent
    ? new Date(lastEvent.event_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="rounded-2xl border border-white/[0.08] p-5"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: isClockedIn ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)' }}>
            <Clock size={15} style={{ color: isClockedIn ? '#10B981' : '#6B7280' }}/>
          </div>
          <span className="text-sm font-semibold text-white/80">Pointage</span>
        </div>

        {isClockedIn && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            <span className="text-xs font-mono font-semibold text-emerald-400">{timer}</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mb-4">
        {lastEvent ? (
          <div className="space-y-1">
            <p className="text-xs text-white/35">Dernier événement</p>
            <p className="text-sm text-white/60">
              <span className="font-medium" style={{ color: isClockedIn ? '#10B981' : '#94A3B8' }}>
                {CLOCK_EVENT_LABELS[lastEvent.event_type] || lastEvent.event_type}
              </span>
              {' '}à <span className="text-white/80 font-mono">{lastTime}</span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-white/35">Aucun pointage aujourd'hui</p>
        )}
      </div>

      {/* Message feedback */}
      {message && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs font-medium text-center"
          style={{
            background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            color:      message.type === 'error' ? '#EF4444' : '#10B981',
          }}>
          {message.text}
        </div>
      )}

      {/* Bouton principal */}
      <button
        onClick={handleClock}
        disabled={loading}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          background: isClockedIn
            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))'
            : 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))',
          border: `1px solid ${isClockedIn ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: isClockedIn ? '#F87171' : '#34D399',
        }}>
        {loading ? (
          <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"/>
        ) : isClockedIn ? (
          <><LogOut size={15}/> Pointer le départ</>
        ) : (
          <><LogIn size={15}/> Pointer l'arrivée</>
        )}
      </button>

      {locating && (
        <p className="mt-2 text-center text-[10px] text-white/30">Géolocalisation en cours…</p>
      )}
    </div>
  )
}
