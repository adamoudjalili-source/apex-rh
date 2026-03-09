// ============================================================
// APEX RH — src/components/enps/ENPSScore.jsx
// Session 55 — Score eNPS principal
// Affiche le score -100 → +100 avec promoteurs/passifs/détracteurs
// ============================================================
import { ENPS_BENCHMARK, getEnpsZone, formatENPS } from '../../hooks/useENPS'

// ─── GAUGE ARC ────────────────────────────────────────────────

function ENPSGauge({ score }) {
  const zone = getEnpsZone(score)
  if (score === null || score === undefined) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-600 text-sm">Données insuffisantes</span>
      </div>
    )
  }

  // Normaliser -100/+100 vers 0–180° (demi-cercle)
  const pct = ((score + 100) / 200)
  const deg = pct * 180 - 90  // -90° à +90°

  // SVG demi-cercle
  const r = 70
  const cx = 90
  const cy = 90
  // Arc gris (fond)
  // Aiguille
  const radians = (deg - 90) * Math.PI / 180
  const needleX = cx + r * 0.75 * Math.cos(radians)
  const needleY = cy + r * 0.75 * Math.sin(radians)

  // Zones colorées
  const zones = [
    { start: 0,   end: 30,  color: '#EF4444' },  // critique
    { start: 30,  end: 60,  color: '#F97316' },  // préoccupant
    { start: 60,  end: 100, color: '#F59E0B' },  // acceptable
    { start: 100, end: 140, color: '#3B82F6' },  // bon
    { start: 140, end: 180, color: '#10B981' },  // excellent
  ]

  function arcPath(startDeg, endDeg) {
    const s = (startDeg - 90) * Math.PI / 180
    const e = (endDeg - 90) * Math.PI / 180
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Fond arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="butt"
        />
        {/* Zones colorées */}
        {zones.map((z, i) => (
          <path
            key={i}
            d={arcPath(z.start, z.end)}
            fill="none"
            stroke={z.color}
            strokeWidth="12"
            strokeLinecap="butt"
            opacity="0.4"
          />
        ))}
        {/* Aiguille */}
        <line
          x1={cx} y1={cy}
          x2={needleX} y2={needleY}
          stroke={zone?.color || '#6B7280'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4" fill={zone?.color || '#6B7280'} />

        {/* Labels */}
        <text x="8"  y={cy + 18} fontSize="10" fill="#6B7280" textAnchor="middle">-100</text>
        <text x={cx} y="12"      fontSize="10" fill="#6B7280" textAnchor="middle">0</text>
        <text x="172" y={cy + 18} fontSize="10" fill="#6B7280" textAnchor="middle">+100</text>
      </svg>

      {/* Score numérique */}
      <div className="text-4xl font-black mt-1" style={{ color: zone?.color || '#6B7280' }}>
        {formatENPS(score)}
      </div>
      {zone && (
        <div
          className="text-xs font-semibold px-3 py-1 rounded-full mt-1"
          style={{ background: zone.bg, color: zone.color }}
        >
          {zone.label}
        </div>
      )}
    </div>
  )
}

// ─── RÉPARTITION PROMOTEURS / PASSIFS / DÉTRACTEURS ──────────

function TriBar({ promotersPct, passivesPct, detractorsPct }) {
  if (!promotersPct && !passivesPct && !detractorsPct) return null
  return (
    <div className="space-y-1.5">
      {[
        { label: 'Promoteurs (9-10)', pct: promotersPct, color: '#10B981', icon: '😊' },
        { label: 'Passifs (7-8)',     pct: passivesPct,  color: '#F59E0B', icon: '😐' },
        { label: 'Détracteurs (0-6)', pct: detractorsPct, color: '#EF4444', icon: '😞' },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm">{item.icon}</span>
          <span className="text-xs text-gray-400 w-36">{item.label}</span>
          <div className="flex-1 h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${item.pct || 0}%`, background: item.color }}
            />
          </div>
          <span className="text-xs font-bold w-10 text-right" style={{ color: item.color }}>
            {item.pct != null ? `${item.pct}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

export default function ENPSScore({
  score,
  promoters,
  passives,
  detractors,
  total,
  responseRate,
  benchmark = ENPS_BENCHMARK.sector_avg,
  compact = false,
}) {
  const promotersPct  = total ? Math.round(promoters  / total * 100) : null
  const passivesPct   = total ? Math.round(passives   / total * 100) : null
  const detractorsPct = total ? Math.round(detractors / total * 100) : null
  const deltaVsBench  = score != null ? Math.round(score - benchmark) : null

  if (compact) {
    const zone = getEnpsZone(score)
    return (
      <div className="flex items-center gap-2">
        <div className="text-2xl font-black" style={{ color: zone?.color || '#6B7280' }}>
          {formatENPS(score)}
        </div>
        {zone && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: zone.bg, color: zone.color }}>
            {zone.label}
          </span>
        )}
        {deltaVsBench !== null && (
          <span className={`text-xs ${deltaVsBench >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {deltaVsBench >= 0 ? '+' : ''}{deltaVsBench} vs secteur
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Gauge + score */}
      <ENPSGauge score={score} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Répondants</div>
          <div className="text-xl font-bold text-white">{total ?? '—'}</div>
          {responseRate != null && (
            <div className="text-[10px] text-gray-600">{responseRate}% taux</div>
          )}
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Promoteurs</div>
          <div className="text-xl font-bold text-green-400">{promoters ?? '—'}</div>
          {promotersPct != null && <div className="text-[10px] text-green-600">{promotersPct}%</div>}
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Détracteurs</div>
          <div className="text-xl font-bold text-red-400">{detractors ?? '—'}</div>
          {detractorsPct != null && <div className="text-[10px] text-red-600">{detractorsPct}%</div>}
        </div>
      </div>

      {/* Benchmark */}
      {deltaVsBench !== null && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Benchmark sectoriel</div>
            <div className="text-xs text-gray-600">Secteur public : +{benchmark} en moyenne</div>
          </div>
          <div className={`text-lg font-bold ${deltaVsBench >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {deltaVsBench >= 0 ? '+' : ''}{deltaVsBench}
          </div>
        </div>
      )}

      {/* Barres répartition */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4">
        <div className="text-xs text-gray-500 mb-3">Répartition des réponses</div>
        <TriBar
          promotersPct={promotersPct}
          passivesPct={passivesPct}
          detractorsPct={detractorsPct}
        />
      </div>
    </div>
  )
}
