// ============================================================
// APEX RH — src/components/temps/OvertimePayrollExport.jsx
// Session 71 — Export paie mensuel heures supplémentaires
// Aperçu colonnes + sélection mois + format CSV/XLSX
// ============================================================
import { useState } from 'react'
import { Download, FileSpreadsheet, Eye, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { useExportOvertimePayroll, useOrgTimeSheets, formatHours } from '../../hooks/useTemps'

// ─── Aperçu colonnes ──────────────────────────────────────────
const COLUMNS_RECAP = [
  { label: 'Collaborateur',   width: 'w-36', color: '#A78BFA' },
  { label: 'Service',         width: 'w-28', color: '#60A5FA' },
  { label: 'Rôle',            width: 'w-24', color: '#60A5FA' },
  { label: 'Total heures',    width: 'w-24', color: '#10B981' },
  { label: 'Heures normales', width: 'w-28', color: '#10B981' },
  { label: 'HS 25%',          width: 'w-20', color: '#F59E0B' },
  { label: 'HS 50%',          width: 'w-20', color: '#EF4444' },
  { label: 'HS 100%',         width: 'w-20', color: '#7C3AED' },
  { label: 'Total HS',        width: 'w-20', color: '#F97316' },
  { label: 'Semaines val.',   width: 'w-24', color: '#6B7280' },
]

function ColumnPreview() {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max pb-2">
        {COLUMNS_RECAP.map((col, i) => (
          <div key={i} className={`${col.width} px-3 py-2 rounded-lg text-center flex-shrink-0`}
            style={{ background: col.color + '15', border: `1px solid ${col.color}30` }}>
            <p className="text-xs font-medium truncate" style={{ color: col.color }}>{col.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/30 mt-1">
        + Feuille &ldquo;Détail hebdomadaire&rdquo; avec décomposition par semaine
      </p>
    </div>
  )
}

// ─── Statistiques du mois sélectionné ────────────────────────
function MonthStats({ year, month }) {
  const now = new Date()
  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2,'0')}-${lastDay}`

  const { data: sheets = [] } = useOrgTimeSheets({ from, to })

  const total    = sheets.reduce((a, s) => a + Number(s.total_hours    || 0), 0)
  const regular  = sheets.reduce((a, s) => a + Number(s.regular_hours  || 0), 0)
  const ot       = sheets.reduce((a, s) => a + Number(s.overtime_hours || 0), 0)
  const ot25     = sheets.reduce((a, s) => a + Number(s.ot_25_hours    || 0), 0)
  const ot50     = sheets.reduce((a, s) => a + Number(s.ot_50_hours    || 0), 0)
  const validated= sheets.filter(s => s.overtime_approved).length
  const withOt   = sheets.filter(s => Number(s.overtime_hours) > 0).length

  if (!sheets.length) return (
    <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-center">
      <p className="text-xs text-white/30">Aucune feuille pour ce mois</p>
    </div>
  )

  return (
    <div className="rounded-xl border border-white/[0.08] p-4"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Aperçu du mois</p>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label: 'Total heures',   val: formatHours(total),   color: '#A78BFA' },
          { label: 'Heures normales',val: formatHours(regular), color: '#10B981' },
          { label: 'Total HS',       val: formatHours(ot),      color: '#F59E0B' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs text-white/40">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <p className="text-amber-400 font-semibold">{formatHours(ot25)}</p>
          <p className="text-white/30">HS 25%</p>
        </div>
        <div>
          <p className="text-red-400 font-semibold">{formatHours(ot50)}</p>
          <p className="text-white/30">HS 50%</p>
        </div>
        <div>
          <p className="text-green-400 font-semibold">{validated}/{withOt}</p>
          <p className="text-white/30">HS validées</p>
        </div>
        <div>
          <p className="text-blue-400 font-semibold">{sheets.length}</p>
          <p className="text-white/30">Feuilles</p>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function OvertimePayrollExport() {
  const { exportOvertimePayroll } = useExportOvertimePayroll()
  const now = new Date()

  const [year,     setYear]     = useState(now.getFullYear())
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [format,   setFormat]   = useState('xlsx')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const MONTHS = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ]

  const handleExport = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await exportOvertimePayroll({ year, month, format })
      setResult(res)
    } catch (err) {
      setError(err.message || 'Erreur export')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
          <FileSpreadsheet className="w-4 h-4 text-white"/>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Export paie — Heures supplémentaires</h3>
          <p className="text-xs text-white/40">Récapitulatif mensuel par collaborateur</p>
        </div>
      </div>

      {/* Sélecteur mois */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Année</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10
                       focus:outline-none focus:border-violet-500/60"
          >
            {[now.getFullYear() - 1, now.getFullYear()].map(y => (
              <option key={y} value={y} className="bg-gray-900">{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Mois</label>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10
                       focus:outline-none focus:border-violet-500/60"
          >
            {MONTHS.map((m, i) => (
              <option key={i+1} value={i+1} className="bg-gray-900">{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats du mois */}
      <MonthStats year={year} month={month}/>

      {/* Format + export */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06] flex-1"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          {[
            { key: 'xlsx', label: 'XLSX (Excel)' },
            { key: 'csv',  label: 'CSV' },
          ].map(f => (
            <button key={f.key} onClick={() => setFormat(f.key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={format === f.key ? {
                background: 'rgba(16,185,129,0.2)', color: '#34D399'
              } : { color: 'rgba(255,255,255,0.35)' }}>
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white
                     transition-all disabled:opacity-50 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
            : <Download className="w-4 h-4"/>
          }
          Exporter
        </button>
      </div>

      {/* Résultat */}
      {result && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-green-500/30"
          style={{ background: 'rgba(16,185,129,0.08)' }}>
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0"/>
          <p className="text-xs text-green-300">
            Export réussi — {result.exported} collaborateur(s) — {result.month}
          </p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/30"
          style={{ background: 'rgba(239,68,68,0.08)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Aperçu colonnes */}
      <div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-3"
        >
          <Eye className="w-3 h-3"/>
          {showPreview ? 'Masquer' : 'Voir'} l&apos;aperçu des colonnes
        </button>
        {showPreview && <ColumnPreview/>}
      </div>
    </div>
  )
}
