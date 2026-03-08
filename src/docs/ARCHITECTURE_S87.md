# ARCHITECTURE.md — APEX RH

> Décisions techniques, patterns et règles à ne jamais violer.
> Mis à jour : Session 86 — Mars 2026

---

## 1. Vue d'ensemble

APEX RH est une **SPA (Single Page Application)** React connectée à Supabase comme backend-as-a-service. Pas de serveur custom — toute la logique métier complexe passe soit par des fonctions PostgreSQL, soit par des Supabase Edge Functions (Deno) pour l'IA.

```
Navigateur (React SPA)
    │
    ├── Supabase PostgREST API  ──→ PostgreSQL (tables, vues, fonctions)
    ├── Supabase Auth           ──→ Gestion sessions / JWT
    ├── Supabase Edge Functions ──→ IA (Claude API), emails, webhooks
    └── Vercel CDN              ──→ Hébergement statique
```

---

## 2. Décisions architecturales majeures (par session)

### Multi-tenancy (S52)
Chaque organisation est isolée via `organization_id` sur **toutes** les tables. Le Row Level Security (RLS) de PostgreSQL garantit qu'un utilisateur ne voit jamais les données d'une autre organisation. 8 Materialized Views pré-calculent les agrégats lourds.

**Règle** : toujours `organization_id`, jamais `org_id`.

### Navigation 6 rôles (S69)
Les guards de rôles sont centralisés dans `AuthContext.jsx`. Ne jamais comparer `profile.role` directement dans les composants — toujours utiliser les helpers :

```js
const { canAdmin, canValidate, canManageTeam, canRecruit, canViewAnalytics } = useAuth()
```

Les vrais noms de rôles en base sont : `collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`. Pas `admin`, `manager`, `rh`.

### PWA + Mobile-First (S39)
Service Worker dans `public/sw.js`. L'application est installable sur mobile. Les composants mobile sont dans `src/components/mobile/`.

### IA Générative (S43)
La clé API Claude n'est jamais exposée côté client. Tous les appels IA passent par des Supabase Edge Functions (Deno) dans `src/supabase/functions/`. Le client React appelle ces fonctions via `supabase.functions.invoke()`.

### Score IPR supprimé (S37)
Le score IPR composite a été supprimé et ne doit **jamais** être réintroduit. Le système de scoring actuel est PULSE (score journalier basé sur brief + journal + OKR).

### Réorganisation UX Hub & Spoke (S64)
La navigation principale est organisée en hubs thématiques, pas en liste plate de modules. Le fichier `src/Sidebar.jsx` (racine de `src/`) est la **seule** source de vérité pour la navigation — ne jamais modifier `src/components/layout/Sidebar.jsx` pour ajouter des routes.

---

## 3. Patterns techniques

### Hooks React Query
Un fichier de hooks par domaine métier. Toujours utiliser `@tanstack/react-query` pour les requêtes Supabase — pas de `useEffect` + `useState` manuels.

```
src/hooks/
├── usePulse.js          # PULSE : briefs, journaux, scores, alertes S76
├── useCompensation.js   # Révisions salariales, cycles, simulation
├── useFormations.js     # Catalogue, inscriptions, budget
├── useOnboarding.js     # Templates, assignments, suivi progression
├── useConges.js         # Soldes, demandes, validation, règles
├── useTemps.js          # Pointage, heures sup, export paie
├── useRecruitment.js    # Pipeline, candidats, scoring
├── useAnnualReviews.js  # Entretiens, campagnes, auto-éval, PDI (S80)
├── useFeedback360.js    # Feedback 360° : cycles, templates, requests, tendances (S81)
├── useHRIntelligence.js # Intelligence RH : effectifs, turnover, absentéisme, masse salariale (S82)
└── ...
```

**Convention d'appending** : les hooks d'une nouvelle session sont ajoutés à la fin du fichier existant avec un commentaire `// ─── S81 ───`.

**Règle import critique** : ne jamais redéclarer un import déjà présent en tête de fichier lors d'un append. En particulier `useQueryClient`, `useQuery`, `useMutation`, `useAuth`, `supabase` sont déjà importés — ne pas les réimporter dans la section appendée.

### Materialized Views
Les MVs sont utilisées pour les agrégats lourds (tableaux de bord, statistiques org-wide). Elles sont rafraîchies manuellement via des fonctions `refresh_*_mv()`.

**Règle critique** : toujours `REVOKE ALL ON mv_xxx FROM anon, authenticated` après création. Les MVs ne sont jamais exposées directement à l'API — elles sont lues via des fonctions RPC ou des queries avec RLS.

**Règle enum dans MV** : toujours caster `::text` sur les nouvelles valeurs d'enum dans une MV créée la même session que l'enum.

### Charts et graphiques
**SVG natif uniquement** — pas de Recharts, pas de Chart.js, pas de D3. Tous les graphiques sont des composants SVG écrits à la main pour garder le bundle léger et le style cohérent.

### Gestion des listes d'utilisateurs
Toujours `useUsersList()` depuis `useSettings.js` pour obtenir la liste des utilisateurs de l'organisation. Ne jamais utiliser `useOrgUsers` (supprimé).

---

## 4. Structure des tables critiques

### Table centrale : `users`
```sql
users (
  id              uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  role            user_role,   -- 'collaborateur'|'chef_service'|'chef_division'|'administrateur'|'directeur'
  manager_id      uuid REFERENCES users(id),
  email           text,
)
```

> La table s'appelle `users`, **pas** `profiles`.

### Compensation
```sql
compensation_records (employee_id, salary_amount, is_current, effective_date)
--  is_current  : pas "current"

compensation_reviews (user_id, old_base_salary, new_base_salary, status, review_cycle_id)
--  user_id     : pas "employee_id"
--  old_base_salary / new_base_salary : pas "current_salary" / "new_salary"
--  increase_amount, increase_pct : colonnes GENERATED — ne jamais les insérer
```

### PULSE
```sql
performance_scores (user_id, score_date, score_period, score_total, ...)
--  score_total : pas "total_score"
--  score_period = 'daily' pour les scores journaliers
```

### OKR avancé (S78)
```sql
okr_cycles (organization_id, name, cadence, start_date, end_date, status, created_by, closed_at)
okr_checkins (organization_id, key_result_id, user_id, progress_value, confidence, note, checked_at)
```

### Projets avancés (S79)
```sql
project_okr_links (organization_id, project_id, objective_id)
project_budget_lines (organization_id, project_id, category, label, amount_planned, amount_actual, note)
project_advanced_milestones (organization_id, project_id, title, due_date, is_reached, reached_at, key_result_id)
-- ⚠️ project_advanced_milestones ≠ milestones (deux tables DISTINCTES)
```

### Entretiens Annuels avancés (S80)
```sql
-- Enum ajouté
review_type AS ENUM ('annual', 'mid_year', 'probation')

-- Colonne ajoutée sur annual_reviews
annual_reviews.review_type  review_type  DEFAULT 'annual'

-- Nouvelles tables
review_self_assessments (
  organization_id, review_id, user_id,
  answers jsonb,   -- clés : bilan.*, competences.*, objectifs_proposes, developpement.*, commentaire_libre
  submitted_at
)
--  UNIQUE(review_id, user_id)

review_development_plans (
  organization_id, review_id, user_id,
  goals jsonb,     -- [{title, category, status, description, deadline, actions:[{text,done}]}]
  next_check_date, status, manager_comment
)
--  status : 'pending' | 'in_progress' | 'completed' | 'abandoned'
--  UNIQUE(review_id, user_id)

-- RPC
get_review_completion_stats(p_manager_id uuid)
  → campaign_id, campaign_title, campaign_year, total_reviews, pending_count,
    self_submitted, completed_count, signed_count, overdue_count, mid_year_count, completion_pct
```

### Feedback 360° avancé (S81)
```sql
-- Enums ajoutés
feedback360_status         AS ENUM ('draft','active','closed','archived')
feedback360_request_status AS ENUM ('pending','in_progress','submitted','declined')

-- Nouvelles tables
feedback360_templates (
  organization_id, name, description,
  competences jsonb,  -- [{key, label, questions:[{key, label, type:'rating'|'text'}]}]
  is_default, created_by
)

feedback360_cycles (
  organization_id, title, description,
  start_date, end_date, status,   -- feedback360_status
  template_id, scope,             -- 'all'|'department'|'custom'
  scope_filter jsonb, created_by, launched_at, closed_at
)

feedback360_requests (
  organization_id, cycle_id, evaluatee_id, evaluator_id,
  relationship,   -- 'manager'|'peer'|'direct_report'|'self'
  status,         -- feedback360_request_status
  is_anonymous,   -- boolean, défaut true
  answers jsonb,  -- {competences:{[compKey]:{[qKey]:{rating,comment}}}, overall_comment}
  submitted_at, declined_reason, reminded_at
)
--  UNIQUE(cycle_id, evaluatee_id, evaluator_id)

-- Materialized View
mv_feedback360_trends
  -- score moyen par compétence par utilisateur par cycle
  -- colonnes : organization_id, evaluatee_id, cycle_id, cycle_title,
  --            cycle_end_date, cycle_status::text, comp_key, avg_rating, response_count

-- RPC
get_feedback360_summary(p_evaluatee_id uuid, p_cycle_id uuid)
  → comp_key, avg_rating, response_count, min_rating, max_rating, trend_vs_prev
```

### Succession & Vivier (S83)
```sql
talent_pool_entries (
  organization_id, user_id, target_role, target_position_id,
  readiness,    -- talent_readiness: 'ready_now'|'ready_1y'|'ready_2y'
  skills_gap,   -- jsonb: [{skill, required_level, current_level, gap, priority}]
  notes, added_by
)
--  UNIQUE(organization_id, user_id, target_position_id)

succession_gaps (
  organization_id, position_id, required_skills jsonb,
  current_coverage_pct, last_assessed_at, assessed_by
)
--  UNIQUE(organization_id, position_id)

-- Materialized View
mv_succession_coverage
  -- pool_count, ready_now_count, ready_1y_count, ready_2y_count,
  -- coverage_pct, is_at_risk
  -- REVOKE ALL appliqué

-- RPC
get_talent_gap_analysis(p_org_id uuid)
  → skill, avg_required, avg_current, avg_gap, affected_count, priority
get_succession_coverage(p_org_id uuid)
  → position_id, position_title, criticality_level, pool_count, ready_*_count, coverage_pct, is_at_risk
```

 (S1 → S82)

| Module | Session | Tables principales |
|--------|---------|-------------------|
| Auth + Rôles | S1–S10 | `users`, `organizations` |
| Tasks + Kanban | S21–S30 | `tasks`, `task_assignees` |
| PULSE Performance | S21–S39 | `morning_plans`, `daily_logs`, `performance_scores` |
| OKR Enterprise | S50 | `objectives`, `key_results` |
| Multi-tenancy | S52 | RLS sur toutes les tables |
| Succession & Talents | S51, S55 | `succession_plans`, `talent_assessments` |
| Behavioral Intelligence | S54 | `behavioral_signals` |
| Calibration + eNPS | S55 | `calibration_sessions`, `enps_responses` |
| Push Notifications | S56 | `push_subscriptions`, `notification_queue` |
| Formations | S57, S73 | `training_courses`, `training_enrollments` |
| Compensation | S58, S74 | `compensation_records`, `compensation_reviews`, `compensation_cycles` |
| Recrutement | S59, S72 | `job_postings`, `candidates`, `applications` |
| Entretiens Annuels | S60 | `annual_reviews` |
| IA Recrutement + CV | S61, S63 | Edge Functions |
| Communication | S65 | `messages`, `announcements` |
| Gestion des Temps | S66, S71 | `time_entries`, `overtime_rules` |
| Congés | S67, S70 | `leave_requests`, `leave_balances`, `leave_rules` |
| Offboarding | S68 | `offboarding_processes` |
| Réorg UX Hub & Spoke | S64 | — |
| Onboarding parcours | S75 | `onboarding_templates`, `onboarding_assignments`, `onboarding_step_completions` |
| PULSE Alertes + Calibration | S76 | `pulse_alert_rules`, `pulse_alerts`, `pulse_calibration` |
| Tâches Avancées — Dépendances + récurrence + charge | S77 | `task_dependencies`, `task_recurrences`, `task_time_tracking` |
| OKR — Cycles + Check-ins + Alignement | S78 | `okr_cycles`, `okr_checkins` |
| Projets — Connexions OKR + budget + Gantt avancé | S79 | `project_okr_links`, `project_budget_lines`, `project_advanced_milestones` |
| Entretiens — Mi-année + auto-éval + suivi managérial | S80 | `review_self_assessments`, `review_development_plans` |
| Feedback 360° — Cycles planifiés + tendances | S81 | `feedback360_templates`, `feedback360_cycles`, `feedback360_requests` |
| Intelligence RH — Bilan social + turnover | S82 | `employee_departures`, `mv_headcount_stats`, `mv_turnover_stats`, `mv_absenteeism_stats` |
| Succession & Talents — Vivier + gap analysis | S83 | `talent_pool_entries`, `succession_gaps`, `mv_succession_coverage` |
| Référentiel Compétences — Cartographie + gaps | S84 | `competency_categories`, `competencies`, `role_competency_requirements`, `user_competency_assessments`, `mv_competency_coverage` |
| Offboarding — Automatisation + solde auto | S85 | ALTER `offboarding_processes` (+departure_id, +auto_triggered), `v_offboarding_dashboard` |
| Notifications — Moteur de règles + escalade | S86 | `notification_rules`, `notification_inbox` |

---

## 6. Edge Functions (Supabase Deno)

```
supabase/functions/
├── generate-ai-response/      # Réponses IA génériques (Claude API)
├── generate-ai-coach/         # Coaching personnalisé PULSE
├── ai-recruitment-match/      # Matching CV ↔ offre
├── ai-cv-parser/              # Extraction données CV
├── generate-pdi-suggestions/  # Plan de développement individuel
├── generate-report/           # Génération rapports RH
├── send-brief-reminder/       # Rappel brief quotidien
├── send-journal-reminder/     # Rappel journal quotidien
├── send-push-notification/    # Notifications push
├── send-manager-alert/        # Alertes managers
├── send-message-notification/ # Notifs messagerie
├── sync-nita-activity/        # Sync activité NITA
├── apex-api/                  # API REST externe
└── apex-webhooks/             # Webhooks entrants
```

---

## 7. Règles d'or — ne jamais violer

```
✅ table `users`          — jamais `profiles`
✅ colonne `organization_id` — jamais `org_id`
✅ `compensation_reviews.user_id` — jamais `employee_id`
✅ `compensation_records.is_current` — jamais `current`
✅ `performance_scores.score_total` — jamais `total_score`
✅ Rôles en base : 'administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur'
✅ Helpers AuthContext S69 pour tous les guards de rôles
✅ SVG natif — jamais recharts ou chart.js
✅ useUsersList() de useSettings.js — jamais useOrgUsers
✅ Sidebar : src/Sidebar.jsx UNIQUEMENT
✅ RLS sur toutes les nouvelles tables
✅ REVOKE ALL sur toutes les nouvelles Materialized Views
✅ increase_amount et increase_pct sont GENERATED — ne jamais les insérer
✅ Score IPR SUPPRIMÉ — ne jamais réintroduire
✅ project_advanced_milestones ≠ milestones — deux tables DISTINCTES (S11 vs S79)
✅ useCurrentCycle() depuis useObjectives.js pour cycle OKR actif
✅ review_self_assessments.UNIQUE(review_id, user_id) — upsert par paire
✅ review_development_plans.UNIQUE(review_id, user_id) — upsert par paire
✅ annual_reviews.review_type = 'mid_year' pour entretiens mi-année (pas une table séparée)
✅ feedback360_requests.UNIQUE(cycle_id, evaluatee_id, evaluator_id) — upsert par triplet
✅ mv_feedback360_trends — REVOKE ALL appliqué, jamais exposée directement
✅ useFeedback360.js : ne pas redéclarer useQueryClient/useQuery/useMutation en milieu de fichier (déjà importés en tête)
✅ feedback360_requests.is_anonymous = true par défaut — ne jamais exposer evaluator_id dans les résultats agrégés
✅ employee_departures.UNIQUE(user_id) — upsert par user_id
✅ mv_headcount_stats / mv_turnover_stats / mv_absenteeism_stats — REVOKE ALL appliqué, jamais exposées directement
✅ get_social_report(p_org_id, p_year) — RPC SECURITY DEFINER avec vérification org du caller
✅ HRIntelligencePage intégré dans IntelligenceRH.jsx onglet "Bilan Social" groupe Stratégie (adminOnly)
✅ talent_pool_entries.UNIQUE(organization_id, user_id, target_position_id) — upsert par triplet (S83)
✅ succession_gaps.UNIQUE(organization_id, position_id) — upsert par paire (S83)
✅ talent_readiness enum : 'ready_now' | 'ready_1y' | 'ready_2y' (S83)
✅ mv_succession_coverage — REVOKE ALL appliqué, jamais exposée directement (S83)
✅ get_talent_gap_analysis + get_succession_coverage — SECURITY DEFINER avec vérif org (S83)
✅ succession_plans et talent_assessments existent depuis S51/S55 — ne jamais recréer
✅ key_positions existe depuis S51 — talent_pool_entries.target_position_id la référence
✅ useCompetencyFramework.js (S42 familles métiers) — NE PAS ÉCRASER — hooks S84 dans useCompetencyS84.js (S84)
✅ competencies.UNIQUE(organization_id, name) — pas de doublon de nom dans une org (S84)
✅ role_competency_requirements — UNIQUE sur (org, role_name, competency_id) OU (org, position_id, competency_id) (S84)
✅ user_competency_assessments.UNIQUE(organization_id, user_id, competency_id, source) — upsert par quadruplet (S84)
✅ mv_competency_coverage — REVOKE ALL appliqué, jamais exposée directement (S84)
✅ get_competency_gaps + refresh_competency_coverage_mv — SECURITY DEFINER avec vérif org (S84)
✅ source enum assessments : 'manager' | 'self' | '360' | 'import' (S84)
✅ useNotifications.js (S12) + NotificationCenter.jsx (S56) — NE PAS ÉCRASER — hooks S86 dans useNotificationsS86.js (S86)
✅ notification_inbox (S86) ≠ notifications (S12) — deux systèmes coexistants, ne pas confondre
✅ dispatch_notification — SECURITY DEFINER, silencieux sur erreur (RAISE WARNING), ne bloque jamais la mutation appelante (S86)
✅ process_notification_escalations — à appeler via cron ou Edge Function, jamais inline dans une mutation (S86)
✅ notification_rules.target_roles[] — tableau de rôles, pas un enum, peut être vide (S86)
✅ notification_inbox.escalated_from — uuid auto-référence pour tracer la chaîne d'escalade (S86)
```

---

## S85 — Offboarding Automatisation + Solde Auto (08/03/2026)

### Nouveaux fichiers
- `src/sql/s85_offboarding_automation.sql`
- `src/hooks/useOffboardingS85.js`
- `src/components/offboarding/OffboardingDashboard.jsx`
- `src/components/offboarding/FinalSettlementCard.jsx`

### Fichiers modifiés
- `src/pages/offboarding/Offboarding.jsx` — +onglet Dashboard, +FinalSettlementCard, +useOffboardingAlerts

### Nouvelles colonnes
- `offboarding_processes.departure_id UUID REFERENCES employee_departures(id)`
- `offboarding_processes.auto_triggered BOOLEAN DEFAULT false`

### Nouvelles vues
- `v_offboarding_dashboard` — processus + comptages tâches (total/done/overdue) + days_until_exit + infos user

### Nouveaux RPCs
- `calculate_final_settlement(p_user_id, p_org_id) → JSONB` — SECURITY DEFINER, lit leave_balances + compensation_records.is_current
- `auto_create_offboarding(p_departure_id) → UUID` — SECURITY DEFINER, idempotent

### Trigger
- `trg_auto_offboarding` AFTER INSERT ON employee_departures → auto_create_offboarding (silencieux sur erreur)

### Règles d'or S85
- `useOffboarding.js` (S68) NON écrasé → hooks S85 dans `useOffboardingS85.js`
- `auto_create_offboarding` idempotent — ne double pas si processus in_progress existant
- Trigger silencieux : RAISE WARNING mais ne bloque pas l'INSERT
- `calculate_final_settlement` taux journalier = salaire mensuel / 21.67

---

## S86 — Notifications — Moteur de règles + escalade (08/03/2026)

### Nouveaux fichiers
- `src/sql/s86_notification_engine.sql`
- `src/hooks/useNotificationsS86.js`
- `src/components/NotificationBell.jsx`
- `src/components/NotificationInbox.jsx`
- `src/components/NotificationRulesAdmin.jsx`

### Fichiers modifiés
- `src/Sidebar.jsx` — import NotificationBell, cloche ajoutée au-dessus de la zone profil

### Nouvelles tables

#### `notification_rules`
```sql
notification_rules (
  id                  uuid PK,
  organization_id     uuid NOT NULL REFERENCES organizations(id),
  name                text NOT NULL,
  trigger_event       text NOT NULL,
  -- 'leave_refused' | 'leave_approved' | 'departure_registered'
  -- 'onboarding_overdue' | 'offboarding_alert' | 'review_due'
  -- 'feedback360_due' | 'settlement_applied'
  conditions          jsonb NOT NULL DEFAULT '{}',
  target_roles        text[] NOT NULL DEFAULT '{}',
  message_template    text NOT NULL,
  -- variables : {{employee_name}}, {{event_date}}, {{details}}
  is_active           boolean NOT NULL DEFAULT true,
  escalate_after_days integer,   -- NULL = pas d'escalade
  escalate_to_role    text,      -- NULL = pas d'escalade
  created_by          uuid REFERENCES users(id)
)
-- RLS : SELECT pour tous les membres de l'org, ALL pour administrateur/directeur
```

#### `notification_inbox`
```sql
notification_inbox (
  id               uuid PK,
  organization_id  uuid NOT NULL,
  user_id          uuid NOT NULL REFERENCES users(id),
  rule_id          uuid REFERENCES notification_rules(id),
  title            text NOT NULL,
  body             text NOT NULL,
  event_type       text NOT NULL,
  reference_id     uuid,         -- ID de l'entité concernée
  reference_type   text,         -- 'leave_request' | 'departure' | ...
  priority         text DEFAULT 'normal',  -- 'low'|'normal'|'high'|'urgent'
  read_at          timestamptz,   -- NULL = non lu
  archived_at      timestamptz,   -- NULL = non archivé
  escalated_at     timestamptz,   -- NULL = pas encore escaladé
  escalated_from   uuid REFERENCES notification_inbox(id)  -- auto-ref escalade
)
-- RLS : SELECT/UPDATE pour owner (user_id = auth.uid()),
--        SELECT pour admin de l'org
```

### Nouvelles fonctions

- `dispatch_notification(p_org_id, p_event_type, p_reference_id, p_data jsonb) → integer`
  — SECURITY DEFINER, évalue les règles actives, insère dans notification_inbox, silencieux (RAISE WARNING)
  — `p_data` : `{title, employee_name, event_date, details, priority, reference_type, target_user_id, exclude_user_id}`

- `process_notification_escalations() → integer`
  — SECURITY DEFINER, à appeler en cron quotidien
  — escalade les notifs non lues après escalate_after_days jours

- `mark_notification_read(p_notification_id uuid) → void`
  — SECURITY DEFINER, owner uniquement

- `mark_all_notifications_read(p_org_id uuid) → integer`
  — SECURITY DEFINER, owner uniquement

### Hooks S86 — référence rapide
```
useNotificationInbox({ limit, onlyUnread })    — notification_inbox non archivées
useUnreadCountS86()                             — count + realtime Supabase subscribe
useMarkRead()                                   — RPC mark_notification_read
useMarkAllRead()                                — RPC mark_all_notifications_read
useArchiveNotification()                        — update archived_at = now()
useNotificationRules()                          — notification_rules de l'org
useUpsertRule()                                 — upsert notification_rules
useDeleteRule()                                 — delete notification_rules
useDispatchNotification()                       — RPC dispatch_notification
```

### Règles d'or S86
- `useNotifications.js` (S12) + `NotificationCenter.jsx` (S56) — NE PAS ÉCRASER
- `notification_inbox` (S86) ≠ `notifications` (S12) — coexistent, ne pas confondre
- `dispatch_notification` — silencieux sur erreur, ne jamais await en bloquant une mutation critique
- `process_notification_escalations` — uniquement via cron, jamais inline
- `target_roles[]` — tableau text, pas d'enum, peut être vide (ne cible alors personne par rôle)
- `escalated_from` — null pour les notifications originales, uuid pour les escalades

---

## S87 — Communication : Ciblage avancé + accusés lecture

### Nouveaux objets SQL
- `communication_announcements` : +`targeting_rules jsonb`, +`important boolean`
- `announcement_read_receipts` : table (organization_id, announcement_id, user_id, read_at), UNIQUE(announcement_id, user_id)
- `v_announcement_stats` : vue (read_count, read_pct, total_recipients, last_read_at)
- `mark_announcement_read(p_announcement_id)` : RPC SECURITY DEFINER, upsert silencieux
- `get_announcement_recipients(p_announcement_id)` : RPC SECURITY DEFINER → liste destinataires + statut lecture

### Pattern targeting_rules
```json
{ "type": "all" }
{ "type": "roles", "roles": ["collaborateur", "chef_service"] }
{ "type": "manual", "user_ids": ["uuid1", "uuid2"] }
```
Backward compat : `target_roles[]` maintenu pour RLS S65.

### Hooks S87 — `useCommunicationS87.js`
```
useAnnouncementStats(announcementId)     — vue v_announcement_stats
useMarkAnnouncementRead()                — RPC mark_announcement_read
useReadReceipts(announcementId)          — RPC get_announcement_recipients (adminOnly)
useCreateTargetedAnnouncement()          — create + dispatch_notification si important
useUpdateTargetedAnnouncement()          — update
useUnreadImportantCount()                — badge annonces importantes non lues
```

### Composants S87
- `MessageReadReceipts.jsx` — panel accusés de lecture, filtre lu/non-lu, export CSV
- `MessageStats.jsx` — barre de progression + métriques (compact ou full)
- `AnnouncementCard.jsx` — modifié : badge important, auto-mark read (2s), bouton stats admin
- `AnnouncementForm.jsx` — modifié : ciblage avancé (all/roles/manual), toggle important

### Règles d'or S87
- ✅ `useCommunication.js` (S65) NON écrasé — nouveau fichier `useCommunicationS87.js`
- ✅ `announcement_read_receipts` uses `users` table + `organization_id`
- ✅ Auto-mark read : setTimeout 2s dans useEffect, silencieux (ON CONFLICT DO NOTHING)
- ✅ `dispatch_notification` S86 appelé si `important = true` à la création
- ✅ `targeting_rules.type = "manual"` → `user_ids` array of UUIDs
- ✅ `targeting_rules.type = "roles"` → `roles` array, aussi dupliqué dans `target_roles[]` pour compat RLS S65
