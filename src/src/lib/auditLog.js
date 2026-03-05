import { supabase } from './supabase'

export async function logAudit(action, entityType = null, entityId = null, details = {}) {
  try {
    await supabase.rpc('log_audit', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_details: details,
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
}