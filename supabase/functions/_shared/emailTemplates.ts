// ============================================================
// APEX RH — supabase/functions/_shared/emailTemplates.ts
// Session 27 — 5 templates HTML brandés APEX RH / NITA
// ============================================================

const APP_URL = Deno.env.get('APP_URL') ?? 'https://apex-rh-h372.vercel.app'

// ─── LAYOUT DE BASE ──────────────────────────────────────────

function baseLayout(content: string, previewText: string = ''): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>APEX RH — NITA</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: #6366f1; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 16px !important; }
      .btn { width: 100% !important; text-align: center !important; }
      .stat-grid { display: block !important; }
      .stat-cell { display: block !important; width: 100% !important; margin-bottom: 12px; }
    }
  </style>
</head>
<body style="background-color:#f1f5f9; margin:0; padding:0;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <!-- WRAPPER -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius:16px 16px 0 0; padding: 32px 40px; text-align:center;">
              <div style="display:inline-flex; align-items:center; gap:10px;">
                <div style="width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:8px; display:inline-block; line-height:36px; text-align:center; font-size:18px;">⚡</div>
                <span style="color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.5px;">APEX RH</span>
              </div>
              <p style="color:rgba(255,255,255,0.65); font-size:12px; margin-top:6px; letter-spacing:1px; text-transform:uppercase;">NITA Transfert d'Argent</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff; padding: 40px; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc; border: 1px solid #e2e8f0; border-top:0; border-radius:0 0 16px 16px; padding: 24px 40px; text-align:center;">
              <p style="color:#94a3b8; font-size:12px; line-height:1.6;">
                Cet email a été envoyé automatiquement par APEX RH.<br />
                <a href="${APP_URL}/admin/settings?tab=pulse-notifications" style="color:#6366f1; text-decoration:underline;">Gérer mes préférences de notifications</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color:#6366f1; text-decoration:underline;">Accéder à APEX RH</a>
              </p>
              <p style="color:#cbd5e1; font-size:11px; margin-top:12px;">
                © ${new Date().getFullYear()} NITA Transfert d'Argent — APEX RH
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── COMPOSANTS RÉUTILISABLES ─────────────────────────────────

function ctaButton(text: string, url: string, color = '#6366f1'): string {
  return `
<div style="text-align:center; margin: 28px 0;">
  <a href="${url}" class="btn" style="
    display:inline-block;
    background:${color};
    color:#ffffff;
    font-size:15px;
    font-weight:600;
    padding:14px 32px;
    border-radius:10px;
    text-decoration:none;
    letter-spacing:-0.2px;
    box-shadow: 0 4px 12px rgba(99,102,241,0.3);
  ">${text} →</a>
</div>`
}

function divider(): string {
  return `<div style="height:1px; background:#f1f5f9; margin:24px 0;"></div>`
}

function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block; background:${bg}; color:${color}; font-size:12px; font-weight:600; padding:3px 10px; border-radius:20px;">${text}</span>`
}

// ─── 1. BRIEF MATINAL ────────────────────────────────────────

export interface BriefReminderData {
  firstName: string
  email: string
  briefStartTime: string
  briefDeadlineTime: string
}

export function briefReminderTemplate(data: BriefReminderData): { subject: string; html: string } {
  const subject = `☀️ ${data.firstName}, votre brief matinal vous attend — APEX RH`

  const content = `
    <h1 style="color:#1e293b; font-size:24px; font-weight:700; margin-bottom:8px;">
      Bonjour ${data.firstName} ! ☀️
    </h1>
    <p style="color:#64748b; font-size:15px; line-height:1.6; margin-bottom:0;">
      Il est l'heure de démarrer votre journée.
    </p>

    ${divider()}

    <div style="background:#f8faff; border:1px solid #e0e7ff; border-radius:12px; padding:24px; margin:24px 0;">
      <p style="color:#4f46e5; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">📋 Brief matinal PULSE</p>
      <p style="color:#334155; font-size:15px; line-height:1.7;">
        Prenez <strong>5 minutes</strong> pour planifier votre journée avec votre brief matinal.
        Définissez vos priorités, estimez vos temps et partez du bon pied.
      </p>
      <p style="color:#94a3b8; font-size:13px; margin-top:12px;">
        ⏰ Ouvert jusqu'à <strong>${data.briefDeadlineTime}</strong>
      </p>
    </div>

    ${ctaButton('Accéder à mon brief', `${APP_URL}/tasks?tab=ma-journee`)}

    ${divider()}

    <p style="color:#94a3b8; font-size:13px; line-height:1.6; text-align:center;">
      Bonne journée,<br />
      <strong style="color:#64748b;">L'équipe APEX RH — NITA</strong>
    </p>
  `

  return { subject, html: baseLayout(content, `Votre brief matinal du ${new Date().toLocaleDateString('fr-FR')} est disponible`) }
}

// ─── 2. JOURNAL DU SOIR ──────────────────────────────────────

export interface JournalReminderData {
  firstName: string
  email: string
  currentScore: number | null
  journalDeadlineTime: string
}

export function journalReminderTemplate(data: JournalReminderData): { subject: string; html: string } {
  const subject = `🌙 ${data.firstName}, n'oubliez pas votre journal du soir`

  const scoreHtml = data.currentScore !== null
    ? `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px 20px; margin:16px 0; display:flex; align-items:center; gap:12px;">
        <span style="font-size:24px;">📊</span>
        <div>
          <p style="color:#166534; font-size:13px; font-weight:600;">Score PULSE du jour</p>
          <p style="color:#15803d; font-size:22px; font-weight:700;">${data.currentScore}%</p>
        </div>
      </div>`
    : ''

  const content = `
    <h1 style="color:#1e293b; font-size:24px; font-weight:700; margin-bottom:8px;">
      Bonsoir ${data.firstName} ! 🌙
    </h1>
    <p style="color:#64748b; font-size:15px; line-height:1.6;">
      Votre journée touche à sa fin. Il reste encore quelques minutes pour soumettre votre journal.
    </p>

    ${divider()}

    ${scoreHtml}

    <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:24px; margin:24px 0;">
      <p style="color:#c2410c; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">📝 Journal du soir</p>
      <p style="color:#334155; font-size:15px; line-height:1.7;">
        Prenez <strong>5 minutes</strong> pour clôturer votre journée : consignez vos avancées,
        les obstacles rencontrés et préparez demain. Votre régularité booste votre score PULSE.
      </p>
      <p style="color:#94a3b8; font-size:13px; margin-top:12px;">
        ⏰ Délai limite : <strong>${data.journalDeadlineTime}</strong>
      </p>
    </div>

    ${ctaButton('Soumettre mon journal', `${APP_URL}/tasks?tab=ma-journee`, '#ea580c')}

    ${divider()}

    <p style="color:#94a3b8; font-size:13px; line-height:1.6; text-align:center;">
      À demain,<br />
      <strong style="color:#64748b;">L'équipe APEX RH — NITA</strong>
    </p>
  `

  return { subject, html: baseLayout(content, 'Soumettez votre journal du soir pour maintenir votre score PULSE') }
}

// ─── 3. ALERTE MANAGER ───────────────────────────────────────

export interface AbsentCollaborator {
  firstName: string
  lastName: string
  role: string
  absentDays: number
  lastSubmission: string | null
}

export interface ManagerAlertData {
  managerFirstName: string
  email: string
  absentCollaborators: AbsentCollaborator[]
  teamName: string
}

export function managerAlertTemplate(data: ManagerAlertData): { subject: string; html: string } {
  const count = data.absentCollaborators.length
  const subject = `⚠️ ${count} collaborateur${count > 1 ? 's' : ''} sans journal — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`

  const rows = data.absentCollaborators.map((c) => {
    const urgencyColor = c.absentDays >= 4 ? '#dc2626' : c.absentDays >= 3 ? '#ea580c' : '#d97706'
    const urgencyBg   = c.absentDays >= 4 ? '#fef2f2' : c.absentDays >= 3 ? '#fff7ed' : '#fffbeb'
    return `
    <tr>
      <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; background:#e0e7ff; border-radius:50%; text-align:center; line-height:32px; font-size:14px; font-weight:700; color:#6366f1;">
            ${c.firstName[0]}${c.lastName[0]}
          </div>
          <div>
            <p style="color:#1e293b; font-size:14px; font-weight:600;">${c.firstName} ${c.lastName}</p>
            <p style="color:#94a3b8; font-size:12px;">${c.role || ''}</p>
          </div>
        </div>
      </td>
      <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; text-align:center;">
        <span style="display:inline-block; background:${urgencyBg}; color:${urgencyColor}; font-size:13px; font-weight:700; padding:4px 12px; border-radius:20px;">
          ${c.absentDays} jour${c.absentDays > 1 ? 's' : ''}
        </span>
      </td>
      <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:13px;">
        ${c.lastSubmission ? new Date(c.lastSubmission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Jamais'}
      </td>
    </tr>`
  }).join('')

  const content = `
    <h1 style="color:#1e293b; font-size:24px; font-weight:700; margin-bottom:8px;">
      Bonjour ${data.managerFirstName} ⚠️
    </h1>
    <p style="color:#64748b; font-size:15px; line-height:1.6;">
      ${count} collaborateur${count > 1 ? 's' : ''} de votre équipe <strong>${data.teamName}</strong>
      ${count > 1 ? 'n\'ont' : 'n\'a'} pas soumis de journal depuis plusieurs jours.
    </p>

    ${divider()}

    <div style="border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; margin:24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:12px 16px; text-align:left; color:#64748b; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Collaborateur</th>
            <th style="padding:12px 16px; text-align:center; color:#64748b; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Absent depuis</th>
            <th style="padding:12px 16px; text-align:left; color:#64748b; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Dernier journal</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    ${ctaButton('Voir le tableau de bord équipe', `${APP_URL}/tasks?tab=performance`, '#dc2626')}

    ${divider()}

    <p style="color:#94a3b8; font-size:13px; line-height:1.6; text-align:center;">
      Cordialement,<br />
      <strong style="color:#64748b;">APEX RH — NITA</strong>
    </p>
  `

  return { subject, html: baseLayout(content, `${count} collaborateur(s) sans journal dans votre équipe`) }
}

// ─── 4. RÉSUMÉ HEBDOMADAIRE ──────────────────────────────────

export interface WeeklySummaryData {
  managerFirstName: string
  email: string
  teamName: string
  weekLabel: string      // ex: "3 mars – 7 mars 2025"
  avgScore: number
  submissionRate: number
  submittedCount: number
  totalCount: number
  topPerformer: { firstName: string; lastName: string; score: number } | null
  toWatch: { firstName: string; lastName: string; score: number } | null
}

export function weeklySummaryTemplate(data: WeeklySummaryData): { subject: string; html: string } {
  const subject = `📊 Résumé PULSE — Semaine du ${data.weekLabel} | Équipe ${data.teamName}`

  const scoreColor = data.avgScore >= 70 ? '#16a34a' : data.avgScore >= 40 ? '#d97706' : '#dc2626'
  const scoreBg    = data.avgScore >= 70 ? '#f0fdf4' : data.avgScore >= 40 ? '#fffbeb' : '#fef2f2'

  const topHtml = data.topPerformer
    ? `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px 20px; margin-bottom:12px;">
        <p style="color:#166534; font-size:13px; font-weight:600; margin-bottom:4px;">🏆 Top performer</p>
        <p style="color:#15803d; font-size:15px; font-weight:700;">${data.topPerformer.firstName} ${data.topPerformer.lastName}</p>
        <p style="color:#16a34a; font-size:22px; font-weight:800;">${data.topPerformer.score}%</p>
      </div>`
    : ''

  const watchHtml = data.toWatch
    ? `<div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:16px 20px;">
        <p style="color:#c2410c; font-size:13px; font-weight:600; margin-bottom:4px;">⚠️ À surveiller</p>
        <p style="color:#ea580c; font-size:15px; font-weight:700;">${data.toWatch.firstName} ${data.toWatch.lastName}</p>
        <p style="color:#f97316; font-size:22px; font-weight:800;">${data.toWatch.score}%</p>
      </div>`
    : ''

  const content = `
    <h1 style="color:#1e293b; font-size:24px; font-weight:700; margin-bottom:8px;">
      Bonjour ${data.managerFirstName} 📊
    </h1>
    <p style="color:#64748b; font-size:15px; line-height:1.6;">
      Voici le résumé de performance de votre équipe <strong>${data.teamName}</strong>
      pour la semaine du <strong>${data.weekLabel}</strong>.
    </p>

    ${divider()}

    <!-- Stats globales -->
    <table role="presentation" class="stat-grid" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td class="stat-cell" style="width:50%; padding-right:8px; vertical-align:top;">
          <div style="background:${scoreBg}; border:1px solid ${scoreColor}30; border-radius:12px; padding:20px; text-align:center;">
            <p style="color:${scoreColor}; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Score moyen équipe</p>
            <p style="color:${scoreColor}; font-size:36px; font-weight:800; margin:8px 0;">${data.avgScore}%</p>
          </div>
        </td>
        <td class="stat-cell" style="width:50%; padding-left:8px; vertical-align:top;">
          <div style="background:#f8faff; border:1px solid #e0e7ff; border-radius:12px; padding:20px; text-align:center;">
            <p style="color:#6366f1; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Taux de soumission</p>
            <p style="color:#4f46e5; font-size:36px; font-weight:800; margin:8px 0;">${data.submissionRate}%</p>
            <p style="color:#94a3b8; font-size:13px;">${data.submittedCount} / ${data.totalCount} collaborateurs</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top / À surveiller -->
    ${topHtml}
    ${watchHtml}

    ${ctaButton('Voir le détail complet', `${APP_URL}/tasks?tab=performance`)}

    ${divider()}

    <p style="color:#94a3b8; font-size:13px; line-height:1.6; text-align:center;">
      Bonne semaine,<br />
      <strong style="color:#64748b;">APEX RH — NITA</strong>
    </p>
  `

  return { subject, html: baseLayout(content, `Score moyen équipe : ${data.avgScore}% — ${data.teamName}`) }
}

// ─── 5. AWARD ATTRIBUÉ ───────────────────────────────────────

export interface AwardNotificationData {
  firstName: string
  email: string
  awardType: string         // ex: "⭐ Star du Mois"
  awardMonth: string        // ex: "Mars 2025"
  managerMessage?: string
  score?: number
}

const AWARD_ICONS: Record<string, string> = {
  'star_of_month':   '⭐',
  'top_delivery':    '🚀',
  'most_improved':   '📈',
  'to_watch':        '👁️',
}

export function awardNotificationTemplate(data: AwardNotificationData): { subject: string; html: string } {
  const subject = `🏆 Félicitations ${data.firstName} — Vous avez reçu un award APEX RH !`

  const managerMessageHtml = data.managerMessage
    ? `<div style="background:#f8f8ff; border-left:4px solid #6366f1; border-radius:0 10px 10px 0; padding:16px 20px; margin:20px 0;">
        <p style="color:#94a3b8; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Message de votre manager</p>
        <p style="color:#334155; font-size:15px; line-height:1.7; font-style:italic;">"${data.managerMessage}"</p>
      </div>`
    : ''

  const scoreHtml = data.score !== undefined
    ? `<p style="color:#94a3b8; font-size:14px; margin-top:8px;">Score du mois : <strong style="color:#6366f1;">${data.score}%</strong></p>`
    : ''

  const content = `
    <!-- Trophée central -->
    <div style="text-align:center; margin-bottom:32px;">
      <div style="font-size:64px; margin-bottom:16px;">🏆</div>
      <h1 style="color:#1e293b; font-size:28px; font-weight:800; margin-bottom:8px;">
        Félicitations, ${data.firstName} !
      </h1>
      <p style="color:#64748b; font-size:15px;">
        Vous avez été récompensé(e) pour le mois de <strong>${data.awardMonth}</strong>.
      </p>
    </div>

    <!-- Award card -->
    <div style="background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%); border:2px solid #c4b5fd; border-radius:16px; padding:28px; text-align:center; margin:24px 0;">
      <div style="font-size:40px; margin-bottom:12px;">${AWARD_ICONS[data.awardType] ?? '🏅'}</div>
      <p style="color:#7c3aed; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Award attribué</p>
      <p style="color:#4c1d95; font-size:22px; font-weight:800;">${data.awardType}</p>
      <p style="color:#6d28d9; font-size:14px; margin-top:6px;">${data.awardMonth}</p>
      ${scoreHtml}
    </div>

    ${managerMessageHtml}

    <div style="background:#fdfce8; border:1px solid #fef08a; border-radius:10px; padding:16px 20px; margin:20px 0; text-align:center;">
      <p style="color:#854d0e; font-size:14px; font-weight:600;">🌟 Vous rejoignez le Hall of Fame d'APEX RH !</p>
    </div>

    ${ctaButton('Voir mon award', `${APP_URL}/tasks?tab=awards`, '#7c3aed')}

    ${divider()}

    <p style="color:#94a3b8; font-size:13px; line-height:1.6; text-align:center;">
      Toutes nos félicitations,<br />
      <strong style="color:#64748b;">L'équipe APEX RH — NITA</strong>
    </p>
  `

  return { subject, html: baseLayout(content, `Vous avez reçu l'award ${data.awardType} pour ${data.awardMonth}`) }
}
