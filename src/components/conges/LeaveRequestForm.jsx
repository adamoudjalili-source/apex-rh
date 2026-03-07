// ============================================================
// APEX RH — src/components/conges/LeaveRequestForm.jsx
// Session 67 — Formulaire demande de congé
// ============================================================
import { useState, useEffect } from 'react'
import { X, Calendar, FileText, Upload, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import {
  useActiveLeaveTypes,
  useLeaveSettings,
  useCreateLeaveRequest,
  useSubmitLeaveRequest,
  countWorkDays,
  LEAVE_STATUS_LABELS,
} from '../../hooks/useConges'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function LeaveRequestForm({ onClose, onSuccess }) {
  const { profile } = useAuth()
  const types                 = useActiveLeaveTypes()
  const { data: settings }    = useLeaveSettings()
  const createRequest         = useCreateLeaveRequest()
  const submitRequest         = useSubmitLeaveRequest()

  const [form, setForm] = useState({
    leave_type_id: '',
    start_date:    '',
    end_date:      '',
    reason:        '',
    attachment_url: null,
  })
  const [daysCount,    setDaysCount]    = useState(0)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError,   setUploadError]   = useState(null)
  const [errors,       setErrors]       = useState({})
  const [success,      setSuccess]      = useState(false)

  const selectedType = types.find(t => t.id === form.leave_type_id)
  const workDays     = settings?.work_days || [1, 2, 3, 4, 5]

  // Recalcul automatique des jours
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const count = countWorkDays(form.start_date, form.end_date, workDays)
      setDaysCount(count)
    } else {
      setDaysCount(0)
    }
  }, [form.start_date, form.end_date, workDays])

  function validate() {
    const e = {}
    if (!form.leave_type_id)  e.leave_type_id = 'Choisissez un type de congé'
    if (!form.start_date)     e.start_date    = 'Date de début requise'
    if (!form.end_date)       e.end_date      = 'Date de fin requise'
    if (form.start_date && form.end_date && form.start_date > form.end_date)
      e.end_date = 'La fin doit être après le début'
    if (daysCount === 0)      e.end_date      = 'La période ne contient aucun jour ouvré'
    if (selectedType?.requires_attachment && !form.attachment_url)
      e.attachment = 'Un justificatif est obligatoire pour ce type de congé'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    setUploadError(null)
    try {
      const ext  = file.name.split('.').pop()
      const path = `leave-attachments/${profile?.organization_id}/${profile?.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      setForm(f => ({ ...f, attachment_url: publicUrl }))
    } catch (err) {
      setUploadError('Erreur upload — vérifiez la taille du fichier (max 5 Mo)')
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleSubmit(action = 'save') {
    if (!validate()) return
    try {
      const req = await createRequest.mutateAsync({
        leave_type_id:  form.leave_type_id,
        start_date:     form.start_date,
        end_date:       form.end_date,
        days_count:     daysCount,
        reason:         form.reason || null,
        attachment_url: form.attachment_url || null,
      })
      if (action === 'submit') {
        await submitRequest.mutateAsync(req.id)
      }
      setSuccess(true)
      setTimeout(() => { onSuccess?.(); onClose?.() }, 1200)
    } catch (err) {
      setErrors({ submit: err.message || 'Erreur lors de la création' })
    }
  }

  const isLoading = createRequest.isPending || submitRequest.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: '#0D0D2B', borderColor: 'rgba(255,255,255,0.1)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h2 className="text-base font-bold text-white">Nouvelle demande de congé</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <X size={18}/>
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 size={48} className="text-emerald-400"/>
            <p className="text-white/80 font-medium">Demande créée avec succès</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Type */}
            <div>
              <label className="text-xs font-medium text-white/50 mb-2 block">Type de congé *</label>
              <div className="grid grid-cols-2 gap-2">
                {types.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm(f => ({ ...f, leave_type_id: t.id }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      form.leave_type_id === t.id ? 'border-opacity-60' : 'border-opacity-10 hover:border-opacity-25'
                    }`}
                    style={{
                      borderColor: t.color,
                      background: form.leave_type_id === t.id ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }}/>
                    <span className="text-xs font-medium text-white/80 truncate">{t.name}</span>
                  </button>
                ))}
              </div>
              {errors.leave_type_id && <p className="text-red-400 text-xs mt-1">{errors.leave_type_id}</p>}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block flex items-center gap-1">
                  <Calendar size={11}/> Début *
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white border outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: errors.start_date ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
                />
                {errors.start_date && <p className="text-red-400 text-xs mt-1">{errors.start_date}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block flex items-center gap-1">
                  <Calendar size={11}/> Fin *
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white border outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: errors.end_date ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
                />
                {errors.end_date && <p className="text-red-400 text-xs mt-1">{errors.end_date}</p>}
              </div>
            </div>

            {/* Jours calculés */}
            {daysCount > 0 && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: selectedType ? `${selectedType.color}12` : 'rgba(99,102,241,0.1)',
                  color: selectedType?.color || '#818CF8',
                }}
              >
                <Calendar size={15}/>
                {daysCount} jour{daysCount > 1 ? 's' : ''} ouvré{daysCount > 1 ? 's' : ''}
              </div>
            )}

            {/* Motif */}
            <div>
              <label className="text-xs font-medium text-white/50 mb-1.5 block flex items-center gap-1">
                <FileText size={11}/> Motif (optionnel)
              </label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Précisions éventuelles..."
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-indigo-500 resize-none placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Pièce jointe */}
            <div>
              <label className="text-xs font-medium text-white/50 mb-1.5 block flex items-center gap-1">
                <Upload size={11}/>
                Justificatif {selectedType?.requires_attachment ? '*' : '(optionnel)'}
              </label>
              {form.attachment_url ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-emerald-400"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <CheckCircle2 size={14}/>
                  Fichier joint
                  <button onClick={() => setForm(f => ({ ...f, attachment_url: null }))}
                    className="ml-auto text-white/30 hover:text-white/60"><X size={12}/></button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed cursor-pointer transition-colors hover:border-white/20"
                  style={{ borderColor: errors.attachment ? '#EF4444' : 'rgba(255,255,255,0.12)' }}>
                  {uploadLoading
                    ? <Loader2 size={15} className="animate-spin text-white/40"/>
                    : <Upload size={15} className="text-white/30"/>}
                  <span className="text-xs text-white/40">
                    {uploadLoading ? 'Envoi...' : 'Cliquer pour joindre un fichier'}
                  </span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload}/>
                </label>
              )}
              {uploadError  && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
              {errors.attachment && <p className="text-red-400 text-xs mt-1">{errors.attachment}</p>}
            </div>

            {errors.submit && (
              <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <AlertCircle size={14}/>{errors.submit}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/60 hover:text-white/80 border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              Annuler
            </button>
            <button
              onClick={() => handleSubmit('save')}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/70 border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}>
              Brouillon
            </button>
            <button
              onClick={() => handleSubmit('submit')}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              {isLoading ? <Loader2 size={15} className="animate-spin"/> : null}
              Soumettre
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
