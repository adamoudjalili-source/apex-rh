// ============================================================
// APEX RH — ReviewCycles.jsx (Hub)
// S123 — Routeur rôle : Manager → ReviewCyclesList | Collaborateur → ReviewCycleDetail
// ============================================================
import { usePermission } from '../../hooks/usePermission'
import { ManagerView } from './ReviewCyclesList'
import { CollaborateurView } from './ReviewCycleDetail'

export default function ReviewCycles() {
  const { can } = usePermission()
  const isManager = can('evaluations', 'entretiens_team', 'read')

  return (
    <div className="space-y-6 pb-8">
      <div
        className="rounded-2xl p-5 border border-white/8"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.10) 100%)',
          borderColor: 'rgba(79,70,229,0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
          >
            🔄
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Review Cycles Formels</h2>
            <p className="text-xs text-gray-500">Évaluations trimestrielles, semestrielles et annuelles</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {isManager
            ? "Créez et gérez des cycles d'évaluation structurés. Synthèse automatique PULSE + Feedback 360° + OKRs."
            : "Consultez vos cycles d'évaluation, soumettez votre auto-évaluation et accédez à vos résultats."}
        </p>
      </div>

      {isManager ? <ManagerView /> : <CollaborateurView />}
    </div>
  )
}
