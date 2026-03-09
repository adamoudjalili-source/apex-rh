// ============================================================
// APEX RH — TaskAttachments.jsx  ·  S125-A
// Pièces jointes sur les tâches — upload Supabase Storage
// Max 10 Mo / fichier · 20 fichiers max par tâche
// ============================================================
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const MAX_SIZE_MB  = 10
const MAX_FILES    = 20
const BUCKET       = 'task-attachments'

// ─── Hooks ───────────────────────────────────────────────────
export function useTaskAttachments(taskId) {
  return useQuery({
    queryKey: ['task_attachments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*, users!task_attachments_uploaded_by_fkey(id, first_name, last_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!taskId,
  })
}

export function useUploadAttachment() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ taskId, file }) => {
      const ext  = file.name.split('.').pop()
      const path = `${profile.organization_id}/${taskId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr
      const { error: dbErr } = await supabase.from('task_attachments').insert({
        task_id:         taskId,
        organization_id: profile.organization_id,
        uploaded_by:     profile.id,
        file_name:       file.name,
        file_size:       file.size,
        mime_type:       file.type,
        storage_path:    path,
      })
      if (dbErr) throw dbErr
    },
    onSuccess: (_, { taskId }) => qc.invalidateQueries({ queryKey: ['task_attachments', taskId] }),
  })
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taskId, storagePath }) => {
      await supabase.storage.from(BUCKET).remove([storagePath])
      const { error } = await supabase.from('task_attachments').delete().eq('id', id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => qc.invalidateQueries({ queryKey: ['task_attachments', taskId] }),
  })
}

// ─── Helpers ─────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '?'
  if (bytes < 1024)          return `${bytes} o`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function getFileIcon(mime) {
  if (!mime) return '📄'
  if (mime.startsWith('image/'))       return '🖼'
  if (mime === 'application/pdf')      return '📕'
  if (mime.includes('word'))           return '📝'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊'
  if (mime.includes('presentation'))   return '📑'
  if (mime.includes('zip'))            return '🗜'
  return '📄'
}

async function openSignedUrl(path) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank')
}

// ─── Composant principal ─────────────────────────────────────
export default function TaskAttachments({ taskId, canUpload = true }) {
  const { profile } = useAuth()
  const fileRef                            = useRef(null)
  const [dragging, setDragging]            = useState(false)
  const [uploadErr, setUploadErr]          = useState('')
  const { data: attachments = [], isLoading } = useTaskAttachments(taskId)
  const uploadAttachment                   = useUploadAttachment()
  const deleteAttachment                   = useDeleteAttachment()

  async function handleFiles(files) {
    setUploadErr('')
    if (attachments.length + files.length > MAX_FILES) {
      setUploadErr(`Maximum ${MAX_FILES} fichiers par tâche.`); return
    }
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadErr(`"${file.name}" dépasse ${MAX_SIZE_MB} Mo.`); continue
      }
      await uploadAttachment.mutateAsync({ taskId, file })
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* Zone de drop */}
      {canUpload && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/3'
          }`}>
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-xs text-gray-500">Glissez un fichier ici ou <span className="text-indigo-400">cliquez pour choisir</span></p>
          <p className="text-[10px] text-gray-600">Max {MAX_SIZE_MB} Mo · {MAX_FILES} fichiers max</p>
          <input ref={fileRef} type="file" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>
      )}

      {uploadErr && (
        <p className="text-xs text-red-400 px-1">{uploadErr}</p>
      )}

      {uploadAttachment.isPending && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-lg">
          <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-indigo-300">Upload en cours...</span>
        </div>
      )}

      {/* Liste des fichiers */}
      {isLoading ? (
        <div className="text-xs text-gray-500">Chargement...</div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Aucune pièce jointe.</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map(att => (
            <div key={att.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg group hover:border-white/10 transition-colors">
              <span className="text-lg flex-shrink-0">{getFileIcon(att.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 font-medium truncate">{att.file_name}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {formatSize(att.file_size)} · {att.users?.first_name} {att.users?.last_name}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openSignedUrl(att.storage_path)}
                  className="p-1.5 text-gray-400 hover:text-indigo-400 rounded transition-colors" title="Télécharger">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {(att.uploaded_by === profile?.id || canUpload) && (
                  <button onClick={() => deleteAttachment.mutate({ id: att.id, taskId, storagePath: att.storage_path })}
                    className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors" title="Supprimer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
