// ============================================================
// APEX RH — supabase/functions/send-review-cycle-notification/index.ts
// Session 32 — Notifications email pour les Review Cycles Formels
// Déclenchée par l'UI après activation ou lancement révision d'un cycle
// Body : { cycle_id: string, type: 'activation' | 'review_phase' | 'self_eval_reminder' }
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailBatch } from '../_shared/resendClient.ts'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://apex-rh-h372.vercel.app'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const FREQUENCY_LABELS: Record<string, string> = {
  quarterly: 'Trimestrielle',
  biannual:  'Semestrielle',
  annual:    'Annuelle',
}

function fmtDate(d: string) {
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')} ${MONTHS_FR[dt.getMonth()]} ${dt.getFullYear()}`
}

function buildActivationEmail(firstName: string, cycle: any): string {
  const freqLabel = FREQUENCY_LABELS[cycle.frequency] ?? cycle.frequency
  const dateEnd   = fmtDate(cycle.period_end)
  const link      = `${APP_URL}/tasks?tab=review_cycles`

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:'Inter',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <!-- Header gradient -->
    <div style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);border-radius:16px 16px 0 0;padding:32px 32px 24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🔄</div>
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Nouveau cycle d'évaluation</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">${freqLabel} · APEX RH — NITA</p>
    </div>

    <!-- Body -->
    <div style="background:#1A1D27;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;">
      <p style="color:#E5E7EB;font-size:15px;margin:0 0 16px;">Bonjour <strong>${firstName}</strong>,</p>
      <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Un nouveau cycle d'évaluation a été activé et vous concerne. Vous pouvez dès à présent soumettre votre auto-évaluation.
      </p>

      <!-- Cycle info card -->
      <div style="background:rgba(79,70,229,0.08);border:1px solid rgba(79,70,229,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
        <h3 style="margin:0 0 12px;color:#fff;font-size:14px;font-weight:600;">${cycle.title}</h3>
        <div style="display:flex;gap:20px;flex-wrap:wrap;">
          <div>
            <div style="color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Fréquence</div>
            <div style="color:#A5B4FC;font-size:13px;font-weight:500;">${freqLabel}</div>
          </div>
          <div>
            <div style="color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Date limite</div>
            <div style="color:#A5B4FC;font-size:13px;font-weight:500;">${dateEnd}</div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <p style="color:#9CA3AF;font-size:13px;margin:0 0 8px;">Le processus se déroule en 3 étapes :</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px;">
        ${['1. Vous soumettez votre <strong style="color:#fff">auto-évaluation</strong>', '2. Votre manager complète son <strong style="color:#fff">évaluation</strong>', '3. L\'évaluation est <strong style="color:#fff">validée et archivée</strong>'].map((s, i) => `
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="color:#fff;font-size:11px;font-weight:700;">${i + 1}</span>
            </div>
            <span style="color:#9CA3AF;font-size:13px;">${s}</span>
          </div>
        `).join('')}
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-top:8px;">
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
          Commencer mon auto-évaluation →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#4B5563;font-size:11px;margin:16px 0 0;">APEX RH · NITA Transfert d'Argent · Notification automatique</p>
  </div>
</body>
</html>`
}

function buildReviewPhaseEmail(firstName: string, cycle: any): string {
  const link = `${APP_URL}/tasks?tab=review_cycles`
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:'Inter',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#3B82F6 0%,#4F46E5 100%);border-radius:16px 16px 0 0;padding:32px 32px 24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">📋</div>
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Phase d'évaluation lancée</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Des auto-évaluations vous attendent · APEX RH</p>
    </div>
    <div style="background:#1A1D27;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;">
      <p style="color:#E5E7EB;font-size:15px;margin:0 0 16px;">Bonjour <strong>${firstName}</strong>,</p>
      <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 20px;">
        La phase d'évaluation du cycle <strong style="color:#fff">${cycle.title}</strong> est maintenant ouverte.
        Des collaborateurs ont soumis leur auto-évaluation et attendent votre retour.
      </p>
      <div style="text-align:center;margin-top:16px;">
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#4F46E5);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
          Accéder aux évaluations →
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#4B5563;font-size:11px;margin:16px 0 0;">APEX RH · NITA Transfert d'Argent · Notification automatique</p>
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: { cycle_id?: string; type?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }

  if (!body.cycle_id || !body.type) {
    return new Response(JSON.stringify({ error: 'cycle_id et type requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Récupérer le cycle
    const { data: cycle, error: cycleError } = await supabase
      .from('review_cycles')
      .select('id, title, frequency, period_start, period_end')
      .eq('id', body.cycle_id)
      .single()

    if (cycleError || !cycle) {
      return new Response(JSON.stringify({ error: 'Cycle introuvable' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    // Récupérer les évaluations + utilisateurs concernés
    const { data: evaluations, error: evalError } = await supabase
      .from('review_evaluations')
      .select(`
        id, status,
        evaluatee:users!review_evaluations_evaluatee_id_fkey(id, first_name, email, is_active),
        evaluator:users!review_evaluations_evaluator_id_fkey(id, first_name, email, is_active)
      `)
      .eq('cycle_id', body.cycle_id)

    if (evalError) throw evalError

    const emails: any[] = []
    let sent = 0

    // ── Activation : notifier tous les collaborateurs évalués ──
    if (body.type === 'activation') {
      for (const ev of (evaluations ?? [])) {
        const user = ev.evaluatee
        if (!user?.email || !user?.is_active) continue

        // Vérifier idempotence
        const { data: alreadySent } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('notification_type', `review_cycle_activation_${body.cycle_id}`)
          .maybeSingle()

        if (alreadySent) continue

        emails.push({
          to: user.email,
          subject: `🔄 ${user.first_name}, un nouveau cycle d'évaluation est lancé — ${cycle.title}`,
          html: buildActivationEmail(user.first_name, cycle),
        })

        // Log
        await supabase.from('notification_logs').insert({
          user_id: user.id,
          notification_type: `review_cycle_activation_${body.cycle_id}`,
          metadata: { cycle_id: body.cycle_id, cycle_title: cycle.title },
        })
      }
    }

    // ── Phase révision : notifier les managers ─────────────────
    if (body.type === 'review_phase') {
      const managerIds = new Set<string>()
      for (const ev of (evaluations ?? [])) {
        if (ev.evaluator?.id && !managerIds.has(ev.evaluator.id)) {
          managerIds.add(ev.evaluator.id)
          const manager = ev.evaluator
          if (!manager?.email || !manager?.is_active) continue

          const { data: alreadySent } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', manager.id)
            .eq('notification_type', `review_cycle_review_phase_${body.cycle_id}`)
            .maybeSingle()

          if (alreadySent) continue

          emails.push({
            to: manager.email,
            subject: `📋 ${manager.first_name}, des évaluations attendent votre retour — ${cycle.title}`,
            html: buildReviewPhaseEmail(manager.first_name, cycle),
          })

          await supabase.from('notification_logs').insert({
            user_id: manager.id,
            notification_type: `review_cycle_review_phase_${body.cycle_id}`,
            metadata: { cycle_id: body.cycle_id, cycle_title: cycle.title },
          })
        }
      }
    }

    // Envoyer les emails par batch
    if (emails.length > 0) {
      const results = await sendEmailBatch(emails)
      sent = results.filter(r => r.success).length
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: emails.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[review-cycle-notification] Erreur:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
