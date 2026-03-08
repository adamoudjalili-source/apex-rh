// ============================================================
// APEX RH — src/components/conges/LeavePayrollExport.jsx
// Session 70 — Export paie mensuel structuré
// CSV + XLSX · Filtrable par mois/service
// ============================================================
import { useState } from 'react'
import { Download, FileText, Calendar, Check, AlertCircle } from 'lucide-react'
import { useExportPayroll } from '../../hooks/useConges'

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

export default function LeavePayrollExport() {
  const now  = new Date()
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth() + 1)
  const [format, setFormat] = useState('csv')
  const [lastCount, setLastCount] = useState(null)
  const exportPayroll = useExportPayroll()

  async function handleExport() {
    const count = await exportPayroll.mutateAsync({ year, month, format })
    setLastCount(count)
    setTimeout(() => setLastCount(null), 4000)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <FileText size={16} className="text-emerald-400"/>
          Export paie mensuel
        </h3>
        <p className="text-[11px] text-white/30 mt-0.5">
          Génère un fichier structuré des absences validées pour la paie
        </p>
      </div>

      {/* Paramètres */}
      <div className="rounded-2xl border p-5 space-y-5"
        style={{ background:'rgba(255,255,255,0.025)', borderColor:'rgba(255,255,255,0.08)' }}>

        <div className="grid grid-cols-3 gap-4">
          {/* Année */}
          <div>
            <label className="text-[11px] text-white/40 mb-1.5 block flex items-center gap-1">
              <Calendar size={10}/> Année
            </label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Mois */}
          <div>
            <label className="text-[11px] text-white/40 mb-1.5 block">Mois</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)' }}>
              {MONTHS_FR.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>

          {/* Format */}
          <div>
            <label className="text-[11px] text-white/40 mb-1.5 block">Format</label>
            <div className="flex gap-1 p-1 rounded-xl h-[42px] items-center"
              style={{ background:'rgba(255,255,255,0.04)' }}>
              {['csv','xlsx'].map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 h-full rounded-lg text-xs font-semibold uppercase transition-all ${format === f ? 'bg-emerald-600 text-white' : 'text-white/30 hover:text-white/60'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colonnes de l'export — aperçu */}
        <div className="rounded-xl p-3"
          style={{ background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">Colonnes exportées</p>
          <div className="flex flex-wrap gap-1.5">
            {['Nom','Email','Service','Division','Type absence','Code','Payé','Début','Fin','Nb jours','Période','Motif'].map(col => (
              <span key={col} className="px-2 py-0.5 rounded-lg text-[10px] text-white/40"
                style={{ background:'rgba(255,255,255,0.05)' }}>
                {col}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-2">
            Uniquement les absences avec statut <span className="text-emerald-500/60">Validé RH</span> dont la période chevauche le mois sélectionné
          </p>
        </div>

        {/* Bouton export */}
        <button
          onClick={handleExport}
          disabled={exportPayroll.isPending}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
          style={{ background: lastCount !== null ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#059669,#10B981)' }}>
          {exportPayroll.isPending ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/> Génération...</>
          ) : lastCount !== null ? (
            <><Check size={15}/> {lastCount} ligne{lastCount>1?'s':''} exportée{lastCount>1?'s':''}</>
          ) : (
            <><Download size={15}/> Exporter {MONTHS_FR[month-1]} {year} (.{format})</>
          )}
        </button>

        {exportPayroll.isError && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle size={13}/>
            Erreur lors de l'export. Vérifiez les paramètres.
          </div>
        )}
      </div>

      {/* Aide */}
      <div className="rounded-xl px-4 py-3"
        style={{ background:'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.1)' }}>
        <p className="text-[11px] text-emerald-400/60 leading-relaxed">
          <strong className="text-emerald-400/80">Utilisation :</strong> Transmettez ce fichier à votre logiciel de paie (Sage, Sylae, Niamkey...). 
          Chaque ligne représente une absence validée couvrant tout ou partie du mois sélectionné.
        </p>
      </div>
    </div>
  )
}
