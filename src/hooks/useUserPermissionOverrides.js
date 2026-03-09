// ============================================================
// APEX RH — useUserPermissionOverrides.js
// Session 108 — Phase D RBAC — Surcharges individuelles en base
// Gestion CRUD sur table user_permission_overrides
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'

// ---- Hook : mes propres surcharges (utilisateur connecté) ----
export function useMyOverrides() {
  const { user, organization_id } = useAuth()
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const fetch = useCallback(async () => {
    if (!user?.id || !organization_id) return
    setLoading(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const { data, error: err } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization_id)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
      if (err) throw err
      setOverrides(data || [])
    } catch (e) {
      setError(e?.message || 'Erreur chargement surcharges')
      setOverrides([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, organization_id])

  useEffect(() => { fetch() }, [fetch])

  return { overrides, loading, error, refetch: fetch }
}

// ---- Hook : surcharges d'un utilisateur donné (pour admin) ----
export function useUserOverrides(userId) {
  const { organization_id } = useAuth()
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const fetch = useCallback(async () => {
    if (!userId || !organization_id) {
      setOverrides([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organization_id)
        .order('module', { ascending: true })
        .order('resource', { ascending: true })
      if (err) throw err
      setOverrides(data || [])
    } catch (e) {
      setError(e?.message || 'Erreur chargement surcharges utilisateur')
      setOverrides([])
    } finally {
      setLoading(false)
    }
  }, [userId, organization_id])

  useEffect(() => { fetch() }, [fetch])

  return { overrides, loading, error, refetch: fetch }
}

// ---- Hook : mutation — créer ou mettre à jour un override ----
export function useSetOverride() {
  const { user: me, organization_id } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  /**
   * Crée ou remplace un override.
   * @param {string} userId
   * @param {{ module, resource, action, granted, expires_at? }} override
   */
  async function setOverride(userId, { module, resource, action, granted, expires_at = null }) {
    if (!userId || !organization_id) return { success: false, error: 'Paramètres manquants' }
    setSaving(true)
    setError(null)
    try {
      // Upsert sur (user_id, organization_id, module, resource, action)
      const { error: err } = await supabase
        .from('user_permission_overrides')
        .upsert(
          {
            user_id:         userId,
            organization_id: organization_id,
            module,
            resource,
            action,
            granted,
            expires_at:      expires_at || null,
            created_by:      me?.id,
          },
          { onConflict: 'user_id,organization_id,module,resource,action' }
        )
      if (err) throw err

      await logAudit(
        granted ? 'permission_granted' : 'permission_revoked',
        'user',
        userId,
        {
          module, resource, action, granted,
          expires_at: expires_at || null,
          target_user_id: userId,
        },
        // category
        'rbac'
      )
      return { success: true }
    } catch (e) {
      setError(e?.message || 'Erreur sauvegarde')
      return { success: false, error: e?.message }
    } finally {
      setSaving(false)
    }
  }

  return { setOverride, saving, error }
}

// ---- Hook : mutation — supprimer un override ----
export function useDeleteOverride() {
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState(null)

  async function deleteOverride(id, details = {}) {
    if (!id) return { success: false, error: 'ID manquant' }
    setDeleting(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('user_permission_overrides')
        .delete()
        .eq('id', id)
      if (err) throw err

      await logAudit(
        'permission_override',
        'user',
        details.userId || null,
        { action: 'delete', override_id: id, ...details },
        'rbac'
      )
      return { success: true }
    } catch (e) {
      setError(e?.message || 'Erreur suppression')
      return { success: false, error: e?.message }
    } finally {
      setDeleting(false)
    }
  }

  return { deleteOverride, deleting, error }
}
