// ============================================================
// APEX RH — src/pages/talent/SuccessionVivierPage.jsx  ·  S83
// Succession & Talents — Vivier + gap analysis
// Onglets : Vivier · Cartographie · Gap Analysis
// Accès : chef_division + administrateur + directeur
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Map, TrendingDown, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import TalentPoolBoard from '../../components/talent/TalentPoolBoard'
import SuccessionMap   from '../../components/talent/SuccessionMap'
import GapAnalysisChart from '../../components/talent/GapAnalysisChart'
import { useSuccessionCoverage, useTalentGapAnalysis } from '../../hooks/useSuccessionVivier'
import { supabase } from '../../lib/supabase'

// ─── Onglets ─────────────────────────────────────────────────
const TABS = [
  { id: 'vivier',    label: 'Vivier',        icon: Users,        color: '#10B981' },
  { id: 'map',       label: 'Cartographie',  icon: Map,          color: '#3B82F6' },
  { id: 'gaps',      label: 'Gap Analysis',  icon: TrendingDown, color: '#F59E0B' },
]

// ─── Bouton refresh MV ───────────────────────────────────────
function RefreshButton() {
  const { canAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  if (!canAdmin) return null

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await supabase.rpc('refresh_succession_coverage_mv')
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
      style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
      title="Rafraîchir la vue matérialisée"
    >
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
      {done ? 'Actualisé !' : 'Actualiser'}
    </button>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function SuccessionVivierPage() {
  const [activeTab, setActiveTab] = useState('vivier')
  const { data: coverage }        = useSuccessionCoverage()
  const { data: gaps = [] }       = useTalentGapAnalysis()

  const criticalGaps = gaps.filter(g => g.priority === 'critical').length
  const atRisk       = coverage?.atRiskCount || 0

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
            Succession & Vivier de Talents
          </h2>
          <p className="text-xs text-white/35 mt-0.5">
            Planification de la relève, analyse des écarts et cartographie des successeurs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Alertes rapides */}
          {atRisk > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              ⚠ {atRisk} poste{atRisk > 1 ? 's' : ''} à risque
            </div>
          )}
          {criticalGaps > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              {criticalGaps} écart{criticalGaps > 1 ? 's' : ''} critique{criticalGaps > 1 ? 's' : ''}
            </div>
          )}
          <RefreshButton />
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
        {TABS.map(tab => {
          const Icon   = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all ${active ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
              style={active ? {
                background: 'rgba(255,255,255,0.04)',
                borderTop: `2px solid ${tab.color}`,
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              } : undefined}
            >
              <Icon size={13} style={active ? { color: tab.color } : undefined} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            className="h-full"
          >
            {activeTab === 'vivier' && (
              <div className="h-full">
                <TalentPoolBoard />
              </div>
            )}
            {activeTab === 'map' && (
              <div className="pb-4">
                <SuccessionMap />
              </div>
            )}
            {activeTab === 'gaps' && (
              <div className="pb-4">
                <GapAnalysisChart />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
