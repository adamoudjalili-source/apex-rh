// ============================================================
// APEX RH — AgentIAHub.jsx · S136
// Hub Agents IA — onglets overview / actions / config
// Route : /admin/agents-ia
// ============================================================
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot, Activity, Settings, Power, PowerOff,
  CheckCircle2, XCircle, Clock, Zap,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { usePermission } from '../../hooks/usePermission'
import { useAgentConfigs, useAgentActions, useToggleAgent, useAgentStats } from '../../hooks/useAgentIA'
import { GLASS_STYLE } from '../../utils/constants'

const TABS = [
  { key: 'overview', label: 'Vue d\u2019ensemble', icon: Bot },
  { key: 'actions',  label: 'Journal actions',  icon: Activity },
  { key: 'config',   label: 'Configuration',    icon: Settings },
]

const STATUS_BADGES = {
  pending:  { color: '#FBBF24', label: 'En attente' },
  approved: { color: '#34D399', label: 'Approuvé' },
  executed: { color: '#60A5FA', label: 'Exécuté' },
  rejected: { color: '#F87171', label: 'Rejeté' },
  error:    { color: '#F87171', label: 'Erreur' },
  skipped:  { color: '#9CA3AF', label: 'Ignoré' },
}

// ─── Overview Tab ───────────────────────────────────────────
function OverviewTab({ configs, stats, isLight }) {
  const toggle = useToggleAgent()

  if (!configs?.length) return (
    <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
      <Bot size={48} className="mx-auto mb-4 opacity-40" />
      <p className="text-lg font-medium">Aucun agent configuré</p>
      <p className="text-sm mt-1">Les agents seront disponibles après exécution des migrations SQL.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Actions totales', value: stats.totalActions, icon: Activity },
            { label: 'Taux succès', value: `${stats.successRate}%`, icon: CheckCircle2 },
            { label: 'En attente', value: stats.pendingActions, icon: Clock },
            { label: 'Tokens aujourd\'hui', value: stats.tokensToday, icon: Zap },
          ].map(s => (
            <div key={s.label} style={GLASS_STYLE} className="rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {configs.map(agent => (
          <motion.div key={agent.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={GLASS_STYLE} className="rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              agent.is_active ? 'bg-emerald-500/15' : 'bg-white/5'
            }`}>
              <Bot size={20} style={{ color: agent.is_active ? '#34D399' : 'var(--text-muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {agent.agent_name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Niveau {agent.level} · {agent.tokens_used_today}/{agent.max_tokens_day} tokens
              </p>
            </div>
            <button
              onClick={() => toggle.mutate({ id: agent.id, is_active: !agent.is_active })}
              disabled={toggle.isPending}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              title={agent.is_active ? 'Désactiver' : 'Activer'}>
              {agent.is_active
                ? <Power size={18} style={{ color: '#34D399' }} />
                : <PowerOff size={18} style={{ color: 'var(--text-muted)' }} />
              }
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Actions Tab ────────────────────────────────────────────
function ActionsTab({ isLight }) {
  const { data: actions, isLoading } = useAgentActions({ limit: 50 })

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--text-secondary)' }} />
    </div>
  )

  if (!actions?.length) return (
    <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
      <Activity size={48} className="mx-auto mb-4 opacity-40" />
      <p className="text-lg font-medium">Aucune action enregistrée</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {actions.map(action => {
        const badge = STATUS_BADGES[action.status] || STATUS_BADGES.pending
        return (
          <div key={action.id} style={GLASS_STYLE} className="rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {action.agent_name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: `${badge.color}20`, color: badge.color }}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {action.action_type} · {action.target_table || '—'}
              {action.llm_tokens_used > 0 && ` · ${action.llm_tokens_used} tokens`}
              {action.execution_ms && ` · ${action.execution_ms}ms`}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {new Date(action.created_at).toLocaleString('fr-FR')}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Config Tab (placeholder Phase 3+) ─────────────────────
function ConfigTab() {
  return (
    <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
      <Settings size={48} className="mx-auto mb-4 opacity-40" />
      <p className="text-lg font-medium">Configuration avancée</p>
      <p className="text-sm mt-1">Disponible en Phase 3 (S139+)</p>
    </div>
  )
}

// ─── Main Hub ───────────────────────────────────────────────
export default function AgentIAHub() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const { can } = usePermission()

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const { data: configs, isLoading: loadingConfigs } = useAgentConfigs()
  const { data: stats } = useAgentStats()

  if (!can('manage', 'settings')) return (
    <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
      Accès restreint aux administrateurs.
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Agents IA
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Supervision et configuration des agents intelligents APEX RH
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={GLASS_STYLE}>
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button key={tab.key}
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active ? '' : 'hover:bg-white/5'
              }`}
              style={active
                ? { background: isLight ? '#EEF2FF' : 'rgba(99,102,241,.15)', color: isLight ? '#4F46E5' : '#A5B4FC' }
                : { color: 'var(--text-tertiary)' }
              }>
              <tab.icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loadingConfigs ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--text-secondary)' }} />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab configs={configs} stats={stats} isLight={isLight} />}
          {activeTab === 'actions'  && <ActionsTab isLight={isLight} />}
          {activeTab === 'config'   && <ConfigTab />}
        </>
      )}
    </div>
  )
}
