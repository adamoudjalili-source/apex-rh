// ============================================================
// APEX RH — SocialReportExport.jsx  ·  S82
// Bilan social — données structurées + export (print/CSV)
// ============================================================
import { useState } from 'react'
import { FileText, Download, RefreshCw, CheckCircle } from 'lucide-react'
import { useSocialReport } from '../../hooks/useHRIntelligence'

const ROLE_LABELS = {
  collaborateur:  'Collaborateurs',
  chef_service:   'Chefs de service',
  chef_division:  'Chefs de division',
  administrateur: 'Administrateurs',
  directeur:      'Direction',
}

const REASON_LABELS = {
  resignation:      'Démission',
  dismissal:        'Licenciement',
  end_of_contract:  'Fin de contrat',
  retirement:       'Retraite',
  mutual_agreement: 'Rupture conventionnelle',
  death:            'Décès',
  other:            'Autre',
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <CheckCircle size={13} style={{ color: '#10B981' }}/>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <span className="text-sm text-white/60">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-white' : 'text-white/80'}`}>{value}</span>
    </div>
  )
}

function fmt(val) {
  if (!val) return '0 €'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)} M €`
  if (val >= 1_000)     return `${(val / 1_000).toFixed(0)} k €`
  return `${Math.round(val)} €`
}

export default function SocialReportExport({ year }) {
  const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear())
  const { data: report, isLoading, refetch, isFetching } = useSocialReport(selectedYear)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const handleExportCSV = () => {
    if (!report) return
    const rows = [
      ['Bilan Social APEX RH', selectedYear],
      [],
      ['=== EFFECTIFS ==='],
      ['Effectif total', report.total_headcount],
      ...Object.entries(report.by_role || {}).map(([r, c]) => [ROLE_LABELS[r] || r, c]),
      [],
      ['=== TURNOVER ==='],
      ['Départs année', report.departures_year],
      ['Taux de turnover (%)', report.annual_turnover_rate],
      ...Object.entries(report.departures_by_reason || {}).map(([r, c]) => [REASON_LABELS[r] || r, c]),
      [],
      ['=== ABSENTÉISME ==='],
      ['Jours d\'absence totaux', report.total_absence_days],
      [],
      ['=== MASSE SALARIALE ==='],
      ['Masse salariale annuelle (€)', report.salary_mass],
      ['Salaire mensuel moyen (€)', Math.round(report.avg_salary || 0)],
      [],
      ['Généré le', new Date(report.generated_at).toLocaleString('fr-FR')],
    ]
    const csv    = rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n')
    const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `bilan_social_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <FileText size={16} style={{ color: '#6366F1' }}/>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Bilan Social</div>
            <div className="text-xs text-white/40">Rapport annuel consolidé</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="rounded-lg px-3 py-1.5 text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} style={{ color: 'rgba(255,255,255,0.5)' }}/>
          </button>
          <button onClick={handleExportCSV} disabled={!report}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Download size={12}/>CSV
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <FileText size={12}/>Imprimer
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-white/30 text-sm">
          Génération du bilan social…
        </div>
      ) : !report ? (
        <div className="flex items-center justify-center h-48 text-white/30 text-sm">
          Aucune donnée disponible pour {selectedYear}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Effectifs */}
          <Section title={`1. Effectifs — ${selectedYear}`}>
            <Row label="Effectif total actuel" value={report.total_headcount} highlight/>
            {Object.entries(report.by_role || {}).map(([role, count]) => (
              <Row key={role} label={ROLE_LABELS[role] || role} value={count}/>
            ))}
          </Section>

          {/* Turnover */}
          <Section title={`2. Mouvements du personnel — ${selectedYear}`}>
            <Row label="Nombre de départs" value={report.departures_year || 0} highlight/>
            <Row label="Taux de turnover annuel" value={`${report.annual_turnover_rate || 0} %`}/>
            {Object.entries(report.departures_by_reason || {}).map(([reason, count]) => (
              <Row key={reason} label={`↳ ${REASON_LABELS[reason] || reason}`} value={count}/>
            ))}
          </Section>

          {/* Absentéisme */}
          <Section title={`3. Absentéisme — ${selectedYear}`}>
            <Row label="Jours d'absence totaux" value={report.total_absence_days || 0} highlight/>
          </Section>

          {/* Masse salariale */}
          <Section title={`4. Masse salariale — ${selectedYear}`}>
            <Row label="Masse salariale annuelle" value={fmt(report.salary_mass)} highlight/>
            <Row label="Salaire mensuel moyen" value={fmt(report.avg_salary)}/>
          </Section>

          {/* Footer */}
          <div className="text-center text-xs text-white/20 pt-2">
            Généré le {new Date(report.generated_at).toLocaleString('fr-FR')} — APEX RH
          </div>
        </div>
      )}
    </div>
  )
}
