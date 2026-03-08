// ============================================================
// APEX RH — supabase/functions/_shared/resendClient.ts
// Session 27 — Client Resend partagé entre toutes les Edge Functions
// ============================================================

const RESEND_API_URL = 'https://api.resend.com/emails'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  id: string
  success: boolean
  error?: string
}

/**
 * Envoie un email via l'API Resend.
 * La clé API est lue depuis les variables d'environnement Supabase.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')

  if (!apiKey) {
    console.error('[Resend] RESEND_API_KEY manquante dans les variables d\'environnement')
    return { id: '', success: false, error: 'RESEND_API_KEY non configurée' }
  }

  const fromAddress = options.from ?? 'APEX RH — NITA <notifications@apex-rh.nita.tg>'
  const toArray = Array.isArray(options.to) ? options.to : [options.to]

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: toArray,
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo ?? fromAddress,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Resend] Erreur API:', data)
      return {
        id: '',
        success: false,
        error: data.message ?? `HTTP ${response.status}`,
      }
    }

    console.log(`[Resend] Email envoyé → ${toArray.join(', ')} | ID: ${data.id}`)
    return { id: data.id, success: true }

  } catch (err) {
    console.error('[Resend] Exception:', err)
    return { id: '', success: false, error: String(err) }
  }
}

/**
 * Envoie plusieurs emails en parallèle (max 10 par batch).
 * Retourne les résultats pour chaque destinataire.
 */
export async function sendEmailBatch(
  emails: SendEmailOptions[]
): Promise<SendEmailResult[]> {
  // Envoyer par groupes de 10 pour éviter le rate limit Resend
  const BATCH_SIZE = 10
  const results: SendEmailResult[] = []

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(sendEmail))
    results.push(...batchResults)

    // Petite pause entre les batches
    if (i + BATCH_SIZE < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return results
}
