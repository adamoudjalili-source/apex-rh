// ============================================================
// APEX RH — src/pages/intelligence/ENPSPage.jsx
// Session 55 — eNPS Enrichi
// Score global + évolution + segmentation cohortes
// ============================================================
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useENPSTrend,
  useCurrentENPS,
  useRefreshENPSCache,
  formatENPS,
  getEnpsZone,
  computeLocalENPS,
} from '../../hooks/useENPS'
import { useAllSurveys, useSurveyResponses } from '../../hooks/useEngagementSurveys'
import ENPSScore from '../../components/enps/ENPSScore'
import ENPSTrend from '../../components/enps/ENPSTrend'
import ENPSSegmentation from '../../components/enps/ENPSSegmentation'
import { getLastNMonthKeys } from '../../hooks/useAnalytics'

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{children}</h3>
      {action}
    </div>
  )
}

// ─── PANEL : Sélection survey ────────────────────────────────

function SurveyENPSPanel({ surveys }) {
  const [selectedId, setSelected] = useState(surveys[0]?.id || null)
  const { data: responses = [] } = useSurveyResponses(selectedId)
  const enpsData = computeLocalENPS(responses)
  const hasEnps  = responses.some(r => r.scores?.enps != null)

  return (
    <div className="space-y-4">
      {/* Sélecteur survey */}
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Survey source</label>
        <select
          className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none"
          value={selectedId || ''}
          onChange={e => setSelected(e.target.value || null)}
        >
          <option value="">— Sélectionner un survey —</option>
          {surveys.map(s => (
            <option key={s.id} value={s.id}>
              {s.title} ({new Date(s.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })})
            </option>
          ))}
        </select>
      </div>

      {!hasEnps && selectedId ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm text-amber-300">Ce survey ne contient pas de question eNPS</div>
          <div className="text-xs text-gray-500 mt-1">
            Ajoutez la clé <code className="bg-white/10 px-1 rounded">enps</code> dans les scores de ce survey pour calculer l'eNPS
          </div>
        </div>
      ) : selectedId ? (
        <ENPSScore
          score={enpsData.enps}
          promoters={enpsData.promoters}
          passives={enpsData.passives}
          detractors={enpsData.detractors}
          total={enpsData.total}
        />
      ) : null}
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function ENPSPage() {
  const { isAdmin, isDirecteur, isChefDivision, isChefService } = useAuth()
  const isManager = isAdmin || isDirecteur || isChefDivision || isChefService

  const [activeTab, setActiveTab] = useState('overview')
  const { data: current }        = useCurrentENPS()
  const { data: trend = [] }     = useENPSTrend(12)
  const { data: surveys = [] }   = useAllSurveys()
  const refreshCache             = useRefreshENPSCache()
  const currentMonth             = getLastNMonthKeys(1)[0]

  const closedSurveys = surveys.filter(s => s.status === 'closed')

  const tabs = [
    { id: 'overview',       label: 'Vue globale',   icon: '🎯' },
    { id: 'trend',          label: 'Évolution',     icon: '📈' },
    { id: 'segmentation',   label: 'Segmentation',  icon: '🔍', managerOnly: true },
    { id: 'per_survey',     label: 'Par survey',    icon: '📋' },
  ].filter(t => !t.managerOnly || isManager)

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div
        className="rounded-2xl p-5 border border-white/8"
        style={{
          background: 'linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(5,150,105,0.06) 100%)',
          borderColor: 'rgba(16,185,129,0.2)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
            >
              📊
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">eNPS Enrichi</h2>
              <p className="text-xs text-gray-500">Employee Net Promoter Score — Fidélité & recommandation</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => refreshCache.mutate()}
              disabled={refreshCache.isPending}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-all"
            >
              {refreshCache.isPending ? '⏳' : '🔄'} Actualiser
            </button>
          )}
        </div>

        {/* Score rapide */}
        {current && (
          <div className="mt-4 flex items-center gap-4">
            <div>
              <div className="text-[10px] text-gray-500 mb-0.5">eNPS ce mois</div>
              <div className="text-2xl font-black" style={{ color: getEnpsZone(current.enps_score)?.color || '#6B7280' }}>
                {formatENPS(current.enps_score)}
              </div>
            </div>
            <div className="text-xs text-gray-600 pl-4 border-l border-white/8">
              <div>{current.total_responses} répondants</div>
              <div className="text-green-500">{current.promoters} promoteurs ({current.promoters_pct}%)</div>
              <div className="text-red-500">{current.detractors} détracteurs ({current.detractors_pct}%)</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg,#10B981,#059669)' } : {}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'overview' && (
        <Card>
          <SectionTitle>Score eNPS global — {currentMonth}</SectionTitle>
          {current ? (
            <ENPSScore
              score={current.enps_score}
              promoters={current.promoters}
              passives={current.passives}
              detractors={current.detractors}
              total={current.total_responses}
            />
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm text-gray-500">Aucune donnée eNPS pour ce mois</div>
              <div className="text-xs text-gray-600 mt-1">
                Les surveys doivent inclure une question eNPS (clé <code className="bg-white/10 px-1 rounded">enps</code>, score 0–10)
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'trend' && (
        <Card>
          <SectionTitle>Évolution sur 12 mois</SectionTitle>
          <ENPSTrend data={trend} />
        </Card>
      )}

      {activeTab === 'segmentation' && (
        <Card>
          <SectionTitle>Segmentation par cohorte — {currentMonth}</SectionTitle>
          <ENPSSegmentation />
        </Card>
      )}

      {activeTab === 'per_survey' && (
        <Card>
          <SectionTitle>eNPS par survey</SectionTitle>
          {closedSurveys.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm text-gray-500">Aucun survey clôturé disponible</div>
            </div>
          ) : (
            <SurveyENPSPanel surveys={closedSurveys} />
          )}
        </Card>
      )}

      {/* Explications */}
      <div className="rounded-xl border border-white/5 p-4 text-xs text-gray-600 space-y-1">
        <div className="font-semibold text-gray-400 mb-2">💡 Comment intégrer l'eNPS à vos surveys ?</div>
        <div>• Lors de la création d'un survey, ajoutez la question : <em>« Sur une échelle de 0 à 10, recommanderiez-vous cette organisation comme lieu de travail ? »</em></div>
        <div>• Enregistrez la réponse avec la clé <code className="bg-white/10 px-1 rounded">enps</code> dans le champ <code className="bg-white/10 px-1 rounded">scores</code> (JSONB)</div>
        <div>• Le calcul se fait automatiquement : Score = % Promoteurs (9-10) − % Détracteurs (0-6)</div>
      </div>
    </div>
  )
}
