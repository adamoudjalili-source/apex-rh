// ============================================================
// APEX RH — TaskStatusBadge.jsx
// ============================================================
import { getStatusInfo } from '../../lib/taskHelpers'

export default function TaskStatusBadge({ status, size = 'sm' }) {
  const info = getStatusInfo(status)

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${info.bg} ${info.text} ${info.border} ${sizes[size]}`}>
      <span
        className="rounded-full shrink-0"
        style={{ width: 6, height: 6, backgroundColor: info.color }}
      />
      {info.label}
    </span>
  )
}