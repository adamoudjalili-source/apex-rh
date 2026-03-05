// ============================================================
// APEX RH — src/pages/pulse/AICoach.jsx
// Session 30 — Module IA Coach
// Vue collaborateur : analyse personnelle (3 axes)
// Vue manager : résumé équipe + suivi individuel des membres
// ============================================================
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useMyAICoachAnalyses,
  useLatestMyAnalysis,
  useTeamAICoachAnalyses,
  useServiceMemberAnalyses,
  useGenerateIndividualAnalysis,
  useGenerateTeamAnalysis,
  AI_COACH_AXES,
  isManagerRole,
  formatAnalysisDate,
  formatPeriod,
} from '../../hooks/useAICoach'

// ─── HELPERS UI ──────────────────────────────────────────────

function SparkleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

function LoadingSpinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'
  return (
    <div className={`${sz} border-2 border-indigo-500 border-t-transparent rounded-full animate-spin`} />
  )
}

// ─── CARTE D'AXE IA ──────────────────────────────────────────
function AIAxisCard({ axis, content }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ borderColor: `${axis.color}30`, background: axis.bg }}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{axis.icon}</span>
          <div className="text-left">
            <div className="font-semibold text-white text-sm">{axis.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{axis.desc}</div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {content ? (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <p className="text-sm text-gray-600 italic">Aucune donnée pour cet axe.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CARTE ANALYSE (historique) ──────────────────────────────
function AnalysisHistoryCard({ analysis, onSelect, isSelected }) {
  return (
    <button
      onClick={() => onSelect(analysis)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-indigo-500/50 bg-indigo-500/10'
          : 'border-white/8 bg-white/3 hover:bg-white/6'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          {formatAnalysisDate(analysis.created_at)}
        </div>
        <div className="text-xs text-gray-500">
          {analysis.journal_count} journal{analysis.journal_count > 1 ? 'x' : ''}
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
        {formatPeriod(analysis.period_start, analysis.period_end)}
      </div>
    </button>
  )
}

// ─── VUE COLLABORATEUR ───────────────────────────────────────
function CollaborateurView() {
  const { data: latestAnalysis, isLoading } = useLatestMyAnalysis()
  const { data: allAnalyses = [] }          = useMyAICoachAnalyses()
  const generateMutation                    = useGenerateIndividualAnalysis()
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  const displayed = selectedAnalysis ?? latestAnalysis

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync({ periodDays: 7 })
      setSelectedAnalysis(null) // Afficher la nouvelle analyse
    } catch (err) {
      console.error('[AICoach] Erreur génération:', err)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header action */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">Mon analyse IA</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Basée sur vos 7 derniers journaux PULSE
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          {generateMutation.isPending ? (
            <>
              <LoadingSpinner size="sm" />
              Analyse en cours…
            </>
          ) : (
            <>
              <SparkleIcon />
              {latestAnalysis ? 'Nouvelle analyse' : 'Analyser ma semaine'}
            </>
          )}
        </button>
      </div>

      {/* Erreur */}
      {generateMutation.isError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          ⚠️ {generateMutation.error?.message ?? 'Erreur lors de la génération. Vérifiez que ANTHROPIC_API_KEY est configuré dans Supabase.'}
        </div>
      )}

      {/* Succès message */}
      {generateMutation.isSuccess && !generateMutation.isPending && (
        <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
          ✓ Analyse générée avec succès — {generateMutation.data?.journal_count ?? 0} journal(x) analysé(s)
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !displayed ? (
        /* État vide */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(124,58,237,0.2) 100%)' }}
          >
            🤖
          </div>
          <p className="text-white font-medium mb-1">Aucune analyse disponible</p>
          <p className="text-sm text-gray-500 max-w-xs">
            Cliquez sur "Analyser ma semaine" pour recevoir vos premières suggestions personnalisées basées sur vos journaux PULSE.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Colonne principale : résultats */}
          <div className="lg:col-span-2 space-y-4">
            {/* Badge période */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Analyse du</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(79,70,229,0.15)', color: '#818CF8' }}
              >
                {formatAnalysisDate(displayed.created_at)}
              </span>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-500">
                Période : {formatPeriod(displayed.period_start, displayed.period_end)}
              </span>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-500">
                {displayed.journal_count} journal{displayed.journal_count > 1 ? 'x' : ''} analysé{displayed.journal_count > 1 ? 's' : ''}
              </span>
            </div>

            {/* 3 cartes axes */}
            {AI_COACH_AXES.map(axis => (
              <AIAxisCard
                key={axis.key}
                axis={axis}
                content={
                  axis.key === 'performance' ? displayed.performance_insights :
                  axis.key === 'wellbeing'   ? displayed.wellbeing_insights :
                  displayed.blockers_insights
                }
              />
            ))}
          </div>

          {/* Colonne historique */}
          {allAnalyses.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Historique</h3>
              {allAnalyses.map(a => (
                <AnalysisHistoryCard
                  key={a.id}
                  analysis={a}
                  onSelect={setSelectedAnalysis}
                  isSelected={selectedAnalysis?.id === a.id}
                />
              ))}
              {selectedAnalysis && (
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  ← Voir la plus récente
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CARTE MEMBRE ÉQUIPE ─────────────────────────────────────
function MemberCard({ member, onGenerateForMember, isGenerating }) {
  const [expanded, setExpanded] = useState(false)
  const a = member.latestAnalysis

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            {member.first_name[0]}{member.last_name[0]}
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {member.first_name} {member.last_name}
            </div>
            <div className="text-xs text-gray-500">
              {a ? `Analysé le ${formatAnalysisDate(a.created_at)}` : 'Aucune analyse'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {a && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10"
            >
              {expanded ? 'Masquer' : 'Voir détails'}
            </button>
          )}
          <button
            onClick={() => onGenerateForMember(member.id)}
            disabled={isGenerating}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            {isGenerating ? <LoadingSpinner size="sm" /> : <SparkleIcon />}
            {a ? 'Ré-analyser' : 'Analyser'}
          </button>
        </div>
      </div>

      {/* Détail analyse */}
      {expanded && a && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/6 pt-3">
          {AI_COACH_AXES.map(axis => {
            const content = axis.key === 'performance' ? a.performance_insights
              : axis.key === 'wellbeing' ? a.wellbeing_insights
              : a.blockers_insights
            if (!content) return null
            return (
              <div key={axis.key} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: axis.color }}>
                  <span>{axis.icon}</span> {axis.label}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{content}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── VUE MANAGER ─────────────────────────────────────────────
function ManagerView() {
  const { profile }             = useAuth()
  const serviceId               = profile?.service_id
  const { data: members = [], isLoading: membersLoading } = useServiceMemberAnalyses(serviceId)
  const { data: teamAnalyses = [], isLoading: teamLoading } = useTeamAICoachAnalyses(serviceId)
  const generateIndividual      = useGenerateIndividualAnalysis()
  const generateTeam            = useGenerateTeamAnalysis()
  const [activeTab, setActiveTab] = useState('individual')
  const [generatingFor, setGeneratingFor] = useState(null)
  const latestTeamAnalysis      = teamAnalyses[0] ?? null

  const handleGenerateForMember = async (userId) => {
    setGeneratingFor(userId)
    try {
      await generateIndividual.mutateAsync({ userId, periodDays: 7 })
    } catch (err) {
      console.error('[AICoach] Erreur:', err)
    } finally {
      setGeneratingFor(null)
    }
  }

  const handleGenerateTeam = async () => {
    if (!serviceId) return
    try {
      await generateTeam.mutateAsync({ serviceId, periodDays: 7 })
    } catch (err) {
      console.error('[AICoach] Erreur équipe:', err)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">IA Coach — Vue Manager</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Analyses IA de votre équipe basées sur les journaux PULSE
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {[
          { id: 'individual', label: '👤 Individuels' },
          { id: 'team',       label: '👥 Résumé équipe' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Individuels ─────────────────────────────── */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          {membersLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Aucun collaborateur trouvé dans votre service.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {members.length} collaborateur{members.length > 1 ? 's' : ''} —
                  {members.filter(m => m.latestAnalysis).length} analysé{members.filter(m => m.latestAnalysis).length > 1 ? 's' : ''}
                </p>
                <button
                  onClick={async () => {
                    for (const m of members) {
                      await handleGenerateForMember(m.id)
                    }
                  }}
                  disabled={generatingFor !== null}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 transition-all disabled:opacity-50"
                >
                  <SparkleIcon />
                  Analyser toute l'équipe
                </button>
              </div>

              {members.map(m => (
                <MemberCard
                  key={m.id}
                  member={m}
                  onGenerateForMember={handleGenerateForMember}
                  isGenerating={generatingFor === m.id}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Onglet Résumé équipe ──────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-5">

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-500">
              Synthèse IA de la dynamique d'équipe sur les 7 derniers jours
            </p>
            <button
              onClick={handleGenerateTeam}
              disabled={generateTeam.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              {generateTeam.isPending ? <LoadingSpinner size="sm" /> : <SparkleIcon />}
              {latestTeamAnalysis ? 'Nouveau résumé' : 'Générer le résumé équipe'}
            </button>
          </div>

          {generateTeam.isError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              ⚠️ {generateTeam.error?.message ?? 'Erreur lors de la génération.'}
            </div>
          )}

          {teamLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : !latestTeamAnalysis ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(124,58,237,0.2) 100%)' }}
              >
                👥
              </div>
              <p className="text-white font-medium mb-1">Aucun résumé équipe disponible</p>
              <p className="text-sm text-gray-500 max-w-xs">
                Générez un résumé IA pour obtenir une vision globale de la dynamique et des recommandations pour votre équipe.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Badges info */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-lg"
                  style={{ background: 'rgba(79,70,229,0.15)', color: '#818CF8' }}
                >
                  {formatAnalysisDate(latestTeamAnalysis.created_at)}
                </span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">
                  Période : {formatPeriod(latestTeamAnalysis.period_start, latestTeamAnalysis.period_end)}
                </span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">
                  {latestTeamAnalysis.journal_count} journal{latestTeamAnalysis.journal_count > 1 ? 'x' : ''} analysé{latestTeamAnalysis.journal_count > 1 ? 's' : ''}
                </span>
              </div>

              {/* Résumé équipe */}
              <div
                className="rounded-2xl border p-5"
                style={{ borderColor: 'rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.05)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🤖</span>
                  <span className="font-semibold text-white text-sm">Résumé IA de l'équipe</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {latestTeamAnalysis.team_summary}
                </p>
              </div>

              {/* Historique résumés */}
              {teamAnalyses.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Résumés précédents</h4>
                  {teamAnalyses.slice(1).map(a => (
                    <div key={a.id} className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">{formatAnalysisDate(a.created_at)}</span>
                        <span className="text-xs text-gray-600">{formatPeriod(a.period_start, a.period_end)}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{a.team_summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function AICoach() {
  const { profile } = useAuth()
  const isManager   = isManagerRole(profile?.role)

  return (
    <div className="space-y-6 pb-8">
      {/* Bandeau IA */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.1) 100%)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(124,58,237,0.3) 100%)' }}
        >
          🤖
        </div>
        <div>
          <div className="text-sm font-semibold text-white">IA Coach — Propulsé par Claude (Anthropic)</div>
          <div className="text-xs text-gray-400 mt-0.5">
            Vos journaux PULSE analysés par intelligence artificielle pour des conseils personnalisés et actionnables.
          </div>
        </div>
        <div
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Actif
        </div>
      </div>

      {/* Vue selon le rôle */}
      {isManager ? <ManagerView /> : <CollaborateurView />}
    </div>
  )
}
