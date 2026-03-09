// ============================================================
// APEX RH — src/components/conges/LeaveTypeAdmin.jsx
// Session 67 — Gestion des types de congés (admin)
// ============================================================
import { useState } from 'react'
import { Plus, Edit2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType } from '../../hooks/useConges'

const COLORS = ['#10B981','#3B82F6','#EF4444','#8B5CF6','#6B7280','#F59E0B','#EC4899','#6366F1']

function TypeForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    name:                initial?.name                || '',
    code:                initial?.code                || '',
    color:               initial?.color               || '#6366F1',
    max_days:            initial?.max_days            ?? '',
    requires_attachment: initial?.requires_attachment ?? false,
    is_paid:             initial?.is_paid             ?? true,
    is_active:           initial?.is_active           ?? true,
  })

  const isValid = form.name.trim() && form.code.trim()

  return (
    <div className="rounded-2xl border p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${form.color}30` }}>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Nom *</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="ex : Congés payés"
            className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Code *</label>
          <input
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="ex : CP"
            maxLength={10}
            className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-white/20 uppercase"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Jours max / an</label>
          <input
            type="number"
            min={0}
            value={form.max_days}
            onChange={e => setForm(f => ({ ...f, max_days: e.target.value }))}
            placeholder="Illimité"
            className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Couleur</label>
          <div className="flex gap-1.5 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: form.color === c ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setForm(f => ({ ...f, is_paid: !f.is_paid }))}
            className="transition-colors"
          >
            {form.is_paid
              ? <ToggleRight size={22} className="text-emerald-400"/>
              : <ToggleLeft  size={22} className="text-white/25"/>}
          </div>
          <span className="text-xs text-white/55">Payé</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => setForm(f => ({ ...f, requires_attachment: !f.requires_attachment }))}>
            {form.requires_attachment
              ? <ToggleRight size={22} className="text-amber-400"/>
              : <ToggleLeft  size={22} className="text-white/25"/>}
          </div>
          <span className="text-xs text-white/55">Justificatif obligatoire</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            {form.is_active
              ? <ToggleRight size={22} className="text-indigo-400"/>
              : <ToggleLeft  size={22} className="text-white/25"/>}
          </div>
          <span className="text-xs text-white/55">Actif</span>
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-xs text-white/50 border transition-colors hover:text-white/70"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          Annuler
        </button>
        <button
          onClick={() => isValid && onSave({ ...form, max_days: form.max_days === '' ? null : Number(form.max_days) })}
          disabled={!isValid || loading}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
          {loading && <Loader2 size={12} className="animate-spin"/>}
          {initial ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

export default function LeaveTypeAdmin() {
  const { data: types = [], isLoading } = useLeaveTypes()
  const createType = useCreateLeaveType()
  const updateType = useUpdateLeaveType()

  const [showCreate, setShowCreate] = useState(false)
  const [editingId,  setEditingId]  = useState(null)

  async function handleCreate(payload) {
    await createType.mutateAsync(payload)
    setShowCreate(false)
  }

  async function handleUpdate(id, payload) {
    await updateType.mutateAsync({ id, ...payload })
    setEditingId(null)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70">Types de congés</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
          <Plus size={12}/> Nouveau type
        </button>
      </div>

      {showCreate && (
        <TypeForm
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          loading={createType.isPending}
        />
      )}

      <div className="space-y-2">
        {types.map(type => (
          editingId === type.id ? (
            <TypeForm
              key={type.id}
              initial={type}
              onSave={p => handleUpdate(type.id, p)}
              onCancel={() => setEditingId(null)}
              loading={updateType.isPending}
            />
          ) : (
            <div key={type.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all"
              style={{
                background:  'rgba(255,255,255,0.025)',
                borderColor: `${type.color}20`,
                opacity: type.is_active ? 1 : 0.5,
              }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: type.color }}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/80">{type.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${type.color}20`, color: type.color }}>
                    {type.code}
                  </span>
                  {!type.is_active && (
                    <span className="text-[10px] text-white/30 italic">inactif</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/30">
                  {type.max_days ? `${type.max_days} j max` : 'Illimité'}
                  <span>·</span>
                  {type.is_paid ? 'Payé' : 'Non payé'}
                  {type.requires_attachment && <><span>·</span>Justificatif requis</>}
                </div>
              </div>
              <button
                onClick={() => setEditingId(type.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors">
                <Edit2 size={12}/>
              </button>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
