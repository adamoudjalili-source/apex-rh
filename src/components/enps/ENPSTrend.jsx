// ============================================================
// APEX RH — src/components/enps/ENPSTrend.jsx
// Session 55 — Évolution mensuelle eNPS avec benchmark
// ============================================================
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { getEnpsZone, formatENPS, ENPS_BENCHMARK } from '../../hooks/useENPS'

function fmtMonth(key) {
  if (!key) return ''
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null
  const zone = getEnpsZone(data.enps)

  return (
    <div
      className="rounded-xl border border-white/10 p-3 text-xs"
      style={{ background: '#0F1117', minWidth: 160 }}
    >
      <div className="text-gray-400 mb-2 font-semibold">{fmtMonth(data.month)}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">eNPS</span>
          <span className="font-bold" style={{ color: zone?.color || '#6B7280' }}>
            {formatENPS(data.enps)}
          </span>
        </div>
        {data.total > 0 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">😊 Promoteurs</span>
              <span className="text-green-400">{data.promoters}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">😞 Détracteurs</span>
              <span className="text-red-400">{data.detractors}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Total réponses</span>
              <span className="text-white">{data.total}</span>
            </div>
          </>
        )}
        {data.benchmark != null && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/8">
            <span className="text-gray-600">Benchmark</span>
            <span className="text-indigo-400">+{data.benchmark}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ENPSTrend({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
        <div className="text-3xl mb-2">📈</div>
        <div className="text-sm text-gray-500">Aucune donnée d'évolution disponible</div>
        <div className="text-xs text-gray-600 mt-1">Les données apparaîtront après la clôture des premiers surveys</div>
      </div>
    )
  }

  // Domaine Y dynamique
  const scores = data.map(d => d.enps).filter(s => s != null)
  const minScore = Math.min(...scores, -20)
  const maxScore = Math.max(...scores, 30)
  const yDomain = [Math.floor(minScore / 10) * 10 - 5, Math.ceil(maxScore / 10) * 10 + 5]

  return (
    <div className="space-y-4">
      {/* Résumé tendance */}
      {data.length >= 2 && (() => {
        const last    = data[data.length - 1]?.enps
        const penult  = data[data.length - 2]?.enps
        const trend   = last != null && penult != null ? last - penult : null
        return (
          <div className="flex items-center gap-4">
            <div className="text-2xl font-black" style={{ color: getEnpsZone(last)?.color || '#6B7280' }}>
              {formatENPS(last)}
            </div>
            {trend !== null && (
              <div className={`flex items-center gap-1 text-sm font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(trend))} pts vs mois précédent
              </div>
            )}
            <div className="text-xs text-gray-500 ml-auto">
              Sur {data.filter(d => d.enps != null).length} mois de données
            </div>
          </div>
        )
      })()}

      {/* Chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={fmtMonth}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Ligne zéro */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
            {/* Benchmark sectoriel */}
            <ReferenceLine
              y={ENPS_BENCHMARK.sector_avg}
              stroke="#6366F1"
              strokeDasharray="6 3"
              strokeOpacity={0.5}
              label={{ value: 'Benchmark', position: 'insideTopRight', fill: '#6366F1', fontSize: 10 }}
            />
            {/* Courbe eNPS */}
            <Line
              type="monotone"
              dataKey="enps"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#8B5CF6', stroke: '#0F1117', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: '#8B5CF6' }} />
          <span>eNPS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: '#6366F1', opacity: 0.5 }}  />
          <span>Benchmark sectoriel (+{ENPS_BENCHMARK.sector_avg})</span>
        </div>
      </div>
    </div>
  )
}
