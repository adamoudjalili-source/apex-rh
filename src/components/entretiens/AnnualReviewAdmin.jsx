// ============================================================
// APEX RH — components/entretiens/AnnualReviewAdmin.jsx
// Session 60 — Administration : Campagnes d'entretiens annuels
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Edit3, Archive, Play, CheckCircle,
  Users, BarChart3, Calendar, ChevronRight,
  Loader2, AlertCircle, TrendingUp, Star, DollarSign, X,
} from 'lucide-react'
import {
  useAllCampaigns, useCampaignStats, useCampaignReviews,
  useCreateCampaign, useUpdateCampaign, usePublishCampaign, useArchiveCampaign,
  useCreateCampaignReviews,
  CAMPAIGN_STATUS_LABELS, ANNUAL_REVIEW_STATUS_LABELS,
  OVERALL_RATING_LABELS, OVERALL_RATING_COLORS,
  SALARY_RECOMMENDATION_LABELS,
} from '../../hooks/useAnnualReviews'
import { useAuth } from '../../contexts/AuthContext'

function StatMini({ label, value, color = '#818CF8' }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xl font-bold" style={{ color }}>{value ?? '—'}</p>
      <p className="text-xs text-white/40 mt-0.5">{label}</p>
    </div>
  )
}

function CampaignStatusBadge({ status }) {
  const colors = { draft: '#6B7280', active: '#3B82F6', in_progress: '#F59E0B', completed: '#10B981', archived: '#9CA3AF' }
  return (
    <span className="text-xs font-medium rounded-full px-2 py-0.5"
      style={{ background: `${colors[status]}20`, color: colors[status], border: `1px solid ${colors[status]}35` }}>
      {CAMPAIGN_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ─── Formulaire campagne ──────────────────────────────────────

function CampaignForm({ initial, onSave, onCancel, loading }) {
  const year = new Date().getFullYear()
  const [form, setForm] = useState({
    title: initial?.title ?? `Entretiens Annuels ${year}`,
    description: initial?.description ?? '',
    year: initial?.year ?? year,
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    self_eval_deadline: initial?.self_eval_deadline ?? '',
    manager_eval_deadline: initial?.manager_eval_deadline ?? '',
    meeting_deadline: initial?.meeting_deadline ?? '',
    include_pulse_synthesis: initial?.include_pulse_synthesis ?? true,
    include_okr_synthesis: initial?.include_okr_synthesis ?? true,
    include_f360_synthesis: initial?.include_f360_synthesis ?? true,
    require_dual_signature: initial?.require_dual_signature ?? true,
    allow_employee_comment: initial?.allow_employee_comment ?? true,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-white/50 mb-1.5">Titre de la campagne</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}/>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Année</label>
          <input type="number" value={form.year} min={2020} max={2099} onChange={e => set('year', parseInt(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}/>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-white/50 mb-1.5">Description (optionnel)</label>
          <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Campagne annuelle d'évaluation…"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 resize-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}/>
        </div>
      </div>

      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mt-2">Dates</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'start_date',             label: 'Début de campagne' },
          { key: 'end_date',               label: 'Fin de campagne' },
          { key: 'self_eval_deadline',     label: 'Limite auto-évaluation' },
          { key: 'manager_eval_deadline',  label: 'Limite éval manager' },
          { key: 'meeting_deadline',       label: 'Limite entretiens' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs text-white/50 mb-1.5">{f.label}</label>
            <input type="date" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}/>
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mt-2">Options</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'include_pulse_synthesis', label: 'Synthèse PULSE' },
          { key: 'include_okr_synthesis', label: 'Synthèse OKR' },
          { key: 'include_f360_synthesis', label: 'Synthèse F360' },
          { key: 'require_dual_signature', label: 'Double signature' },
          { key: 'allow_employee_comment', label: 'Commentaire collab' },
        ].map(opt => (
          <label key={opt.key} className="flex items-center gap-2 cursor-pointer rounded-lg p-2.5 hover:bg-white/5 transition-colors">
            <input type="checkbox" checked={form[opt.key]} onChange={e => set(opt.key, e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500"/>
            <span className="text-xs text-white/70">{opt.label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(form)} disabled={loading || !form.title || !form.start_date}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
          {loading ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
          {initial ? 'Mettre à jour' : 'Créer la campagne'}
        </button>
        <button onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm text-white/50 hover:text-white/70 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────

export default function AnnualReviewAdmin() {
  const { profile } = useAuth()
  const [view, setView] = useState('list') // list | create | detail
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [editCampaign, setEditCampaign] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: campaigns = [], isLoading } = useAllCampaigns()
  const { data: stats = [] } = useCampaignStats()
  const { data: campaignReviews = [], isLoading: loadingReviews } = useCampaignReviews(selectedCampaign?.id)

  const createCampaign = useCreateCampaign()
  const updateCampaign = useUpdateCampaign()
  const publishCampaign = usePublishCampaign()

  const getCampaignStats = (id) => stats.find(s => s.campaign_id === id)

  const handleCreate = async (form) => {
    setSaving(true)
    try { await createCampaign.mutateAsync(form); setView('list') } catch (e) { }
    setSaving(false)
  }

  const handleUpdate = async (form) => {
    setSaving(true)
    try { await updateCampaign.mutateAsync({ id: editCampaign.id, ...form }); setEditCampaign(null) } catch (e) { }
    setSaving(false)
  }

  if (view === 'create') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setView('list')} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">← Retour</button>
          <h3 className="text-base font-semibold text-white">Nouvelle campagne</h3>
        </div>
        <CampaignForm onSave={handleCreate} onCancel={() => setView('list')} loading={saving}/>
      </div>
    )
  }

  if (selectedCampaign) {
    const cStats = getCampaignStats(selectedCampaign.id)
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCampaign(null)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">← Campagnes</button>
          <span className="text-white/20">|</span>
          <h3 className="text-base font-semibold text-white">{selectedCampaign.title}</h3>
          <CampaignStatusBadge status={selectedCampaign.status}/>
        </div>

        {/* Stats campagne */}
        {cStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMini label="Total entretiens" value={cStats.total_reviews} color="#818CF8"/>
            <StatMini label="Taux complétion" value={`${cStats.completion_rate ?? 0}%`} color="#10B981"/>
            <StatMini label="Signés" value={cStats.signed_count} color="#059669"/>
            <StatMini label="Augmentations" value={cStats.aug_merite_count + (cStats.aug_promotion_count ?? 0)} color="#C9A227"/>
          </div>
        )}

        {/* Répartition ratings */}
        {cStats && (cStats.rating_excellent + cStats.rating_bien + cStats.rating_satisfaisant) > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">Répartition des notes</p>
            <div className="space-y-2">
              {[
                { key: 'excellent', n: cStats.rating_excellent },
                { key: 'bien', n: cStats.rating_bien },
                { key: 'satisfaisant', n: cStats.rating_satisfaisant },
                { key: 'a_ameliorer', n: cStats.rating_a_ameliorer },
                { key: 'insuffisant', n: cStats.rating_insuffisant },
              ].map(({ key, n }) => {
                const total = cStats.total_reviews || 1
                const pct = Math.round((n / total) * 100)
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs w-24 text-white/60">{OVERALL_RATING_LABELS[key]}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: OVERALL_RATING_COLORS[key] }}/>
                    </div>
                    <span className="text-xs text-white/40 w-8 text-right">{n}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions campagne */}
        {selectedCampaign.status === 'draft' && (
          <button onClick={async () => { await publishCampaign.mutateAsync(selectedCampaign.id); setSelectedCampaign(prev => ({ ...prev, status: 'active' })) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: 'rgba(79,70,229,0.8)' }}>
            <Play size={14}/> Publier la campagne
          </button>
        )}

        {/* Liste des reviews */}
        <div>
          <p className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
            Entretiens ({campaignReviews.length})
          </p>
          {loadingReviews ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-white/30"/>
            </div>
          ) : (
            <div className="space-y-2">
              {campaignReviews.map(r => {
                const emp = r.employee
                const name = [emp?.first_name, emp?.last_name].join(' ')
                const mgr = r.manager
                const mgrName = [mgr?.first_name, mgr?.last_name].join(' ')
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{name}</p>
                      <p className="text-xs text-white/35">Manager : {mgrName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.overall_rating && (
                        <span className="text-xs font-medium rounded-full px-2 py-0.5"
                          style={{ background: `${OVERALL_RATING_COLORS[r.overall_rating]}18`, color: OVERALL_RATING_COLORS[r.overall_rating] }}>
                          {OVERALL_RATING_LABELS[r.overall_rating]}
                        </span>
                      )}
                      <span className="text-xs rounded-full px-2 py-0.5"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#ffffff50' }}>
                        {ANNUAL_REVIEW_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      {r.employee_signed_at && r.manager_signed_at && (
                        <CheckCircle size={14} style={{ color: '#10B981' }}/>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Liste des campagnes
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Campagnes d'entretiens</p>
        <button onClick={() => setView('create')}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
          <Plus size={14}/> Nouvelle campagne
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-white/30"/>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Calendar size={32} className="text-white/15"/>
          <p className="text-sm text-white/35">Aucune campagne créée.</p>
          <button onClick={() => setView('create')}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Créer votre première campagne
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const cStats = getCampaignStats(campaign.id)
            return (
              <motion.div key={campaign.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 cursor-pointer hover:translate-y-[-1px] transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                onClick={() => setSelectedCampaign(campaign)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white">{campaign.title}</p>
                      <CampaignStatusBadge status={campaign.status}/>
                    </div>
                    <p className="text-xs text-white/40">
                      {campaign.start_date && new Date(campaign.start_date).getFullYear()} ·{' '}
                      {campaign.start_date && new Date(campaign.start_date).toLocaleDateString('fr-FR')}
                      {campaign.end_date && ` → ${new Date(campaign.end_date).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  {cStats && (
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-base font-bold text-white">{cStats.total_reviews}</p>
                        <p className="text-xs text-white/35">entretiens</p>
                      </div>
                      <div>
                        <p className="text-base font-bold" style={{ color: '#10B981' }}>{cStats.completion_rate ?? 0}%</p>
                        <p className="text-xs text-white/35">complétés</p>
                      </div>
                    </div>
                  )}
                  <ChevronRight size={16} className="text-white/20 mt-1"/>
                </div>

                {cStats && cStats.total_reviews > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${cStats.completion_rate ?? 0}%`,
                        background: 'linear-gradient(90deg, #4F46E5, #10B981)',
                      }}/>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
