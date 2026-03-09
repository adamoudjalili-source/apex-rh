// ============================================================
// APEX RH — src/components/temps/TimeSheetExport.jsx
// Session 66 — Sélecteur période + export Excel/CSV
// ============================================================
import { useState } from 'react'
import { Download, FileText, Sheet } from 'lucide-react'
import { useExportTimeSheets, getCurrentWeekStart } from '../../hooks/useTemps'

export default function TimeSheetExport({ showUserFilter = false }) {
  const today = new Date()
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}`

  const [from,   setFrom]   = useState(`${thisMonth}-01`)
  const [to,     setTo]     = useState(today.toISOString().split('T')[0])
  const [format, setFormat] = useState('xlsx')
  const [loading, setLoading] = useState(false)

  const { exportTimeSheets } = useExportTimeSheets()

  const handleExport = async () => {
    setLoading(true)
    try {
      await exportTimeSheets({ from, to, format })
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] p-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}>

      <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
        <Download size={14} className="text-white/40"/>
        Export des feuilles de temps
      </h3>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Du</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Au</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Format</label>
          <div className="flex gap-2">
            {[
              { value: 'xlsx', label: 'Excel (.xlsx)', icon: Sheet },
              { value: 'csv',  label: 'CSV (.csv)',   icon: FileText },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setFormat(value)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: format === value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  border:     format === value ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  color:      format === value ? '#A5B4FC' : 'rgba(255,255,255,0.4)',
                }}>
                <Icon size={11}/>{label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleExport} disabled={loading || !from || !to}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          {loading
            ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
            : <><Download size={13}/> Exporter</>
          }
        </button>
      </div>
    </div>
  )
}
