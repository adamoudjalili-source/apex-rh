// ============================================================
// APEX RH — StatCard.jsx
// ✅ Session 12 — Carte statistique dashboard
// ✅ Session 18 — Fix animation (div au lieu de motion.div avec variants)
// ============================================================

export default function StatCard({ label, value, icon: Icon, color, subtitle, trend }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 group hover:scale-[1.02] transition-transform duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}20` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: trend >= 0 ? '#10B981' : '#EF4444',
            }}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          {value ?? '—'}
        </p>
        <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
        {subtitle && (
          <p className="text-[10px] text-white/25 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}