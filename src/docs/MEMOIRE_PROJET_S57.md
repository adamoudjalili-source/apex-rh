# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 57 — Module Formation & Certifications ✅ DÉPLOYÉ EN PRODUCTION (07/03/2026)

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 57

---

## Décisions architecturales critiques

1. **Score IPR composite SUPPRIMÉ (S37)** — Ne jamais réintroduire.
2. **Navigation 3 expériences DÉPLOYÉE (S38)** — Ne PAS modifier `Sidebar.jsx` ni `App.jsx` sans raison explicite.
3. **PWA + Mobile-First DÉPLOYÉ (S39)**.
4. **Ma Performance COMPLÈTE (S40)** + transparency (S42) + Rapports IA (S44).
5. **Mon Développement COMPLET (S41)** + IA Coach (S43).
6. **Référentiel Compétences DÉPLOYÉ (S42)** — `job_families` + `competency_frameworks`.
7. **Conduite du Changement DÉPLOYÉE (S42)** — `performance_comments` + `manager_notes`.
8. **IA Générative DÉPLOYÉE (S43)** — Claude API via Edge Functions uniquement.
9. **Reporting Automatisé IA DÉPLOYÉ (S44)** — Rapports Claude + export PDF.
10. **NITA Temps Réel DÉPLOYÉ (S45)** — Webhook HMAC + Realtime + Export Excel/CSV.
11. **Analytics Prédictifs DÉPLOYÉ (S46)** — Corrélations NITA↔PULSE↔F360 + tendances + patterns.
12. **Tableau de Bord DRH DÉPLOYÉ (S47)** — KPIs globaux + matrice divisions + alertes + export Excel.
13. **Dashboard Direction Générale DÉPLOYÉ (S48)** — Scorecard RAG + jauge santé orga + tendances 12 mois + OKR stratégiques + ROI RH.
14. **Audit Stratégique + Quick Wins LIVRÉS (S49)** — Score global 68/100. 5 QWs implémentés.
15. **OKR Enterprise DÉPLOYÉ (S50)** — Cascade parent-enfant réelle + KPI custom.
16. **Succession Planning & Cartographie Talents DÉPLOYÉ (S51)**.
17. **Performance Technique & Multi-tenancy Foundation DÉPLOYÉ (S52)** — 8 MVs + RLS multi-tenant + Tests Vitest.
18. **API Ouverte & Connecteurs SIRH DÉPLOYÉ (S53)**.
19. **Behavioral Intelligence Engine DÉPLOYÉ (S54)**.
20. **Calibration Multi-niveaux & eNPS Enrichi DÉPLOYÉ (S55)**.
21. **Alertes Push & Onboarding Enrichi DÉPLOYÉ (S56)**.
22. **Module Formation & Certifications DÉPLOYÉ (S57)** :
    - `sql/migration_s57_formations.sql` — 5 tables + 2 MVs + 4 enums + pg_cron nightly + seed démo
    - `hooks/useFormations.js` — 20+ hooks (catalogue, inscriptions, certifications, plans)
    - `components/formation/FormationCard.jsx` — Carte catalogue avec stats populaire
    - `components/formation/FormationDetail.jsx` — Panel détail + inscription directe
    - `components/formation/FormationCatalog.jsx` — Navigateur catalogue avec filtres
    - `components/formation/MyEnrollments.jsx` — Mes formations + progression + feedback
    - `components/formation/MyCertifications.jsx` — Mes certifications + alertes expiration + ajout
    - `components/formation/TrainingPlanPanel.jsx` — Plan formation annuel individuel
    - `components/formation/TeamFormationDashboard.jsx` — Vue manager : équipe + certs + plans
    - `components/formation/FormationAdminPanel.jsx` — Admin : catalogue CRUD + stats org
    - `pages/formation/Formation.jsx` — Page principale 6 onglets adaptatifs rôle
    - `tests/useFormations.test.js` — 30 tests

---

## ⚠️ Nouvelles tables S57

| Table | Description |
|-------|-------------|
| `training_catalog` | Catalogue formations (title, type, provider, duration_hours, price_xof, skills_covered, level, is_mandatory) |
| `training_enrollments` | Inscriptions (user_id, training_id, status, progress_pct, score, feedback_rating, enrolled_by) |
| `certifications` | Certifications obtenues (name, issuer, obtained_at, expires_at, credential_id, credential_url) |
| `training_plans` | Plans formation annuels (user_id, manager_id, year, budget_xof, hours_target, status) |
| `training_plan_items` | Items du plan (plan_id, training_id OU free_title, priority, target_date, status) |

## ⚠️ Nouvelles vues matérialisées S57

| Vue | Description |
|-----|-------------|
| `mv_user_training_stats` | Agrégats formations par user (heures, completions, avg_rating, certifs) |
| `mv_training_popularity` | Popularité formations (enrollments, completion_rate, avg_rating, avg_score) |

## ⚠️ Nouveaux types enum S57

- `training_type`: `presentiel | e-learning | blended | webinar | coaching | conference`
- `enrollment_status`: `inscrit | en_cours | termine | annule | abandonne`
- `plan_priority`: `haute | moyenne | basse`
- `plan_item_status`: `planifie | inscrit | en_cours | termine | reporte | annule`

## ⚠️ Extension enum `notification_type` S57

- `training_enrolled`, `training_completed`, `training_reminder`
- `certification_expiring`, `training_plan_validated`

## ⚠️ Règles architecturales S57

- **Route** : `/formation` → `pages/formation/Formation.jsx` (lazy)
- **Sidebar** : `GraduationCap` icon — affiché pour tous les rôles (collaborateur, manager, admin)
- **Onglets adaptatifs** :
  - Collaborateur : Catalogue · Mes formations · Mes certifications · Mon plan
  - Manager : + Mon équipe (TeamFormationDashboard)
  - Admin : + Mon équipe + Administration (FormationAdminPanel)
- **Module key** : `formations_enabled` dans `app_settings.modules` (activé par défaut)
- **Refresh MVs** : pg_cron chaque nuit à 2h (`refresh-training-views-nightly`)
- **Enrollment unique** : `UNIQUE(user_id, training_id)` — upsert si réinscription
- **Plan unique** : `UNIQUE(user_id, year)` — un seul plan par user/année
- **FormationDetail** : modal overlay bottom-sheet mobile / centered desktop
- **Certifications** : alerte automatique si expiration < 60j (banner + badge)
- **Pas de recharts** → SVG natif (règle S55-S56 maintenue)

---

## ⚠️ Pièges colonnes connus (NE PAS SE TROMPER)

| Table | ❌ NOM FAUX | ✅ NOM RÉEL |
|-------|------------|------------|
| `organizations` | — | `slug` UNIQUE, `plan` enum, `is_active`, `max_users`, `settings JSONB` |
| `users` | — | `organization_id UUID` ✅ ajouté S52 |
| `performance_scores` | `date` | `score_date` |
| `performance_scores` | `delivery_score` | `score_delivery` |
| `performance_scores` | `quality_score` | `score_quality` |
| `performance_scores` | `total` | `score_total` |
| `objectives` | `start_date` | **N'EXISTE PAS** |
| `objectives` | `end_date` | **N'EXISTE PAS** |
| `objectives` | — | `parent_id UUID` ✅ S50 |
| `objectives` | — | `weight NUMERIC(5,2)` ✅ S50 |
| `survey_responses` | `score` | `scores` (JSONB) |
| `survey_responses` | `user_id` | `respondent_id` ✅ S55 |
| `survey_responses` | — | `scores->>'enps'` ✅ S55 (score 0–10) |
| `review_evaluations` | `review_cycle_id` | `cycle_id` ✅ S55 |
| `key_positions` | `department_id` | **N'EXISTE PAS** → `division_id` / `direction_id` |
| `users` | `role = 'direction'` | **PAS dans l'enum user_role DB** |
| `objectives` | `status = 'on_track'` | **PAS dans l'enum** → `brouillon\|actif\|en_evaluation\|valide\|archive` |
| `objectives` | `level = 'direction'` | **PAS dans l'enum** → `strategique\|division\|service\|individuel` |
| `training_plan_items` | `training_name` | `free_title` (si hors catalogue) |
| `training_enrollments` | `user_id` + `training_id` | UNIQUE → upsert avec `onConflict` |

---

## ⚠️ Règles architecturales S52-S57 (toujours valables)

- Toute nouvelle table → `organization_id UUID REFERENCES organizations(id)` + index + RLS
- RLS : utiliser `auth_user_organization_id()` (SECURITY DEFINER)
- Super-admin : vérifier `is_super_admin()` pour accès cross-org
- Vues matérialisées : modifier la MV (`mv_xxx`), pas la vue alias (`v_xxx`)
- Refresh : `SELECT refresh_all_materialized_views();` ou `SELECT refresh_training_views();`
- **Edge Functions** : toujours ajouter `// @ts-nocheck` en première ligne
- **AuthContext** : utiliser `isAdmin`, `isDirecteur`, etc. — NE PAS utiliser `user?.role` directement
- **Ne pas imbriquer** `$$` dans un bloc `DO $$` pour pg_cron → utiliser `$outer$`
- **Ne jamais importer** `deno.land/x` tiers dans les Edge Functions
- **Pas de recharts** → SVG natif (non installé sur Vercel)

---

## Rôles utilisateurs (production)

| Valeur DB | Label UI | Droits dashboard |
|-----------|----------|--------------------|
| `administrateur` | Administrateur | Tout |
| `directeur` | Directeur | Intelligence RH + Tableau DRH + Direction |
| `direction` | Direction Générale | Dashboard Direction (S48) uniquement |
| `chef_division` | Chef de Division | Mon Équipe + Intelligence RH |
| `chef_service` | Chef de Service | Mon Équipe + Intelligence RH |
| `collaborateur` | Collaborateur | Mon Espace |

> ⚠️ `ADMINS = ['administrateur','directeur','direction']` dans `Sidebar.jsx`
> ⚠️ Dans les composants : utiliser `isAdmin` depuis `useAuth()`, jamais `user?.role`

---

## Tables Supabase (production)

### Core
- `users` — profils, rôles, service_id, division_id, direction_id, is_active, must_change_password, organization_id
- `services`, `divisions`, `directions`
- `app_settings` — modules on/off + clés VAPID S56 + `formations_enabled` S57
- `organizations` — orgs multi-tenant (S52)
- `super_admins` — utilisateurs super-admin cross-org (S52)

### Performance
- `performance_scores` — scores PULSE quotidiens (score_delivery, score_quality, score_regularity, score_bonus, score_total, **score_date**)
- `agent_activity_logs` — données NITA (**date**)
- `pulse_morning_plans`, `pulse_daily_logs`, `monthly_performance_snapshots`

### Développement
- `objectives` — OKR (parent_id ✅ S50, weight ✅ S50)
- `pdi_actions`, `feedback_requests`, `feedback_responses`
- `review_cycles`, `review_evaluations`
- `engagement_surveys`, `survey_responses` (**scores est JSONB**, clé `enps` ✅ S55)

### Formation & Certifications (S57)
- `training_catalog` — Catalogue formations (type, provider, duration_hours, price_xof, skills_covered, level)
- `training_enrollments` — Inscriptions (status, progress_pct, score, feedback_rating, enrolled_by)
- `certifications` — Certifications obtenues (issuer, obtained_at, expires_at, credential_id, credential_url)
- `training_plans` — Plans de formation annuels (user_id, year, budget_xof, hours_target, status)
- `training_plan_items` — Items du plan (training_id OU free_title, priority, target_date, status)

### Vues Matérialisées Formation (S57)
- `mv_user_training_stats` — Stats formations par user
- `mv_training_popularity` — Popularité formations par catalogue

### Talents & Succession (S51)
- `key_positions`, `succession_plans`

### API & Connecteurs (S53)
- `api_keys`, `api_audit_logs`
- `webhook_endpoints`, `webhook_delivery_logs`
- `field_mappings`, `scim_sync_logs`

### Intelligence Comportementale (S54)
- `attrition_risk_scores`, `behavioral_alerts`, `career_predictions`

### Calibration & eNPS (S55)
- `calibration_sessions`, `calibration_overrides`, `calibration_history`
- `enps_cache`

### Push Notifications & Onboarding (S56)
- `push_subscriptions` — Subscriptions Web Push (endpoint + keys VAPID)
- `push_notification_logs` — Audit envois push
- `onboarding_checklist` — Checklist items cochés par user

### Notifications (S12)
- `notifications`, `notification_preferences` (enrichi S56 : colonnes push_*)
- `email_queue`

### Onboarding (S40)
- `onboarding_completions`

### IA (S43–S44)
- `ai_chat_messages`, `ai_pdi_suggestions`, `ai_predictive_alerts`, `ai_reports`

---

## Edge Functions Supabase

| Fonction | S | Usage |
|----------|----|-------|
| `generate-ai-response` | 43 | Chat IA contextuel |
| `generate-pdi-suggestions` | 43 | Suggestions PDI |
| `generate-report` | 44 | Rapports automatisés Claude |
| `nita-webhook` | 45 | Réception NITA temps réel (HMAC-SHA256) |
| `apex-api` | 53 | API REST publique v1 |
| `apex-api-scim` | 53 | Connecteur SCIM 2.0 |
| `apex-webhooks` | 53 | Dispatch webhooks sortants |
| `send-push-notification` | 56 | Envoi push notifications Web Push (VAPID + AES-GCM) |
