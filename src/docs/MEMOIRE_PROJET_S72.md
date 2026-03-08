# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 72 — Recrutement — Pipeline structuré + scoring ✅ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour  
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET** (l'utilisateur remplace son dossier src/ local)
5. **Commande Git prête à copier-coller** pour déployer sur Vercel

**Commande ZIP (toujours la même) :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_SXX.zip src/
```

**Commande Git déploiement (toujours la même) :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(SXX): [description session]" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 72
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1. **Score IPR composite SUPPRIMÉ (S37)** — Ne jamais réintroduire.
2. **Navigation 3 vues MIGRÉE vers 6 vues (S69)** — Voir section rôles ci-dessous.
3. **PWA + Mobile-First DÉPLOYÉ (S39)**.
4. **Ma Performance COMPLÈTE (S40)** + transparency (S42) + Rapports IA (S44).
5. **Mon Développement COMPLET (S41)** + IA Coach (S43).
6. **Référentiel Compétences DÉPLOYÉ (S42)**.
7. **IA Générative DÉPLOYÉE (S43)** — Claude API via Edge Functions uniquement.
8. **Reporting Automatisé IA DÉPLOYÉ (S44)**.
9. **NITA Temps Réel DÉPLOYÉ (S45)**.
10. **Analytics Prédictifs DÉPLOYÉ (S46)**.
11. **Tableau de Bord DRH DÉPLOYÉ (S47)**.
12. **Dashboard Direction Générale DÉPLOYÉ (S48)**.
13. **OKR Enterprise DÉPLOYÉ (S50)** — Cascade parent-enfant + KPI custom.
14. **Succession Planning DÉPLOYÉ (S51)**.
15. **Multi-tenancy Foundation DÉPLOYÉ (S52)** — 8 MVs + RLS multi-tenant.
16. **API Ouverte & Connecteurs SIRH DÉPLOYÉ (S53)**.
17. **Behavioral Intelligence Engine DÉPLOYÉ (S54)**.
18. **Calibration Multi-niveaux & eNPS Enrichi DÉPLOYÉ (S55)**.
19. **Alertes Push & Onboarding Enrichi DÉPLOYÉ (S56)**.
20. **Module Formation & Certifications DÉPLOYÉ (S57)**.
21. **Compensation & Benchmark Salarial DÉPLOYÉ (S58)**.
22. **Portail Candidats & Recrutement Light DÉPLOYÉ (S59)**.
23. **Entretiens annuels & Évaluation avancée DÉPLOYÉ (S60)**.
24. **IA Recrutement DÉPLOYÉ (S61)**.
25. **CV Parser IA DÉPLOYÉ (S63)**.
26. **Réorganisation UX Hub & Spoke DÉPLOYÉ (S64)**.
27. **Communication Interne DÉPLOYÉ (S65)**.
28. **Gestion des Temps DÉPLOYÉ (S66)**.
29. **Congés & Absences DÉPLOYÉ (S67)**.
30. **Offboarding DÉPLOYÉ (S68)**.
31. **Restructuration UX Navigation 6 rôles DÉPLOYÉ (S69)**.
32. **Congés — Moteur de règles DÉPLOYÉ (S70)**.
33. **Sécurité Supabase — Hotfix post-S70** : 0 erreurs / 1 warning résiduel pg_trgm.
34. **Gestion des Temps — Règles HS + Export paie DÉPLOYÉ (S71)**.
35. **Recrutement — Pipeline structuré + scoring DÉPLOYÉ (S72)** :
    - `s72_recrutement_pipeline.sql` — 4 colonnes job_applications, 3 colonnes recruitment_stages, table pipeline_actions, table recruitment_metrics, 2 MVs (mv_pipeline_by_job + mv_recruitment_dashboard), fonction compute_application_score()
    - `useRecruitment.js` — 10 nouveaux hooks S72 :
      - `useJobApplicationsEnriched()` — candidatures avec entretiens + feedback
      - `usePipelineByJob()` — MV pipeline agrégé par offre
      - `useRecruitmentDashboard()` — MV dashboard enrichi
      - `useMoveApplicationStage()` — déplacer candidat + log pipeline_actions
      - `useArchiveApplication()` — archiver avec motif
      - `useAddPipelineNote()` — note pipeline
      - `usePipelineActions()` — historique actions pipeline
      - `useRecruitmentGlobalStats()` — stats globales avec fallback
      - `useComputeApplicationScore()` — score depuis RPC Supabase
      - `useRefreshRecruitmentMVs()` — refresh MVs admin
      - Constantes : `SCORE_LABELS`, `APPLICATION_SOURCE_LABELS`, `APPLICATION_SOURCE_COLORS`, `getScoreInfo()`, `getScoreLevel()`
    - `RecruitmentPipelineKanban.jsx` — Kanban 7 colonnes (Candidature→Embauché), filtres avancés (recherche/poste/source/score), actions rapides par carte (déplacer±1, refuser, archiver, entretien, score), modal candidat 4 onglets (Infos/Déplacer/Note/Entretien), score badge visuel, compteur colonnes
    - `RecruitmentDashboard.jsx` — Stats globales, time-to-hire, entonnoir conversion SVG, donut sources SVG, distribution scores SVG, top postes barres SVG
    - `RecruitmentScoringPanel.jsx` — Liste candidats avec gauge score SVG, filtres niveau/poste/tri, score manuel ou recalcul automatique, distribution résumé
    - `Recrutement.jsx` — 9 onglets : Offres/Mes candidatures/Pipeline(S72)/Dashboard(S72)/Scoring(S72)/Entretiens/IA Matching/Parser CV/Admin

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (implémenté S69)

### Les 6 rôles

| Rôle DB | Label UI | Définition |
|---------|----------|------------|
| `super_admin` | Super Administrateur | Cross-organisations (multi-tenant). |
| `administrateur` | Administrateur | Tous les droits dans 1 organisation. DRH / RRH. |
| `directeur` | Directeur | Vue stratégique. ❌ Administration ❌ API ❌ Offboarding. |
| `chef_division` | Chef de Division | Manage toute sa division. Intelligence RH. |
| `chef_service` | Chef de Service | Manage son service uniquement. ❌ Intelligence RH ❌ Pipeline. |
| `collaborateur` | Collaborateur | Vue personnelle uniquement. |

### Helpers AuthContext — CODE DE RÉFÉRENCE S69

```js
const isSuperAdmin   = role === 'super_admin'
const isAdmin        = role === 'administrateur'
const isDirecteur    = role === 'directeur'
const isChefDivision = role === 'chef_division'
const isChefService  = role === 'chef_service'
const isCollab       = role === 'collaborateur'

const canAdmin       = isSuperAdmin || isAdmin
const canManageOrg   = canAdmin || isDirecteur
const canManageTeam  = canManageOrg || isChefDivision || isChefService
const canValidate    = canAdmin || isChefDivision || isChefService
const hasStrategic   = canManageOrg || isChefDivision
```

---

## ⚠️ Corrections critiques permanentes

| ❌ FAUX | ✅ RÉEL |
|---------|---------|
| `profiles` | `users` |
| `profile.org_id` | `profile.organization_id` |
| `.eq('org_id', ...)` | `.eq('organization_id', ...)` |
| `profiles!fkey(...)` | `users!fkey(...)` |
| `src/Sidebar.jsx` | `src/components/layout/Sidebar.jsx` UNIQUEMENT |
| `UPDATE app_settings SET modules = ...` | `UPDATE app_settings SET value = value \|\| '...' WHERE key = 'modules'` |
| `MANAGER_ROLES.includes(role)` | `canManageTeam` (depuis AuthContext) |
| `ADMIN_ROLES.includes(role)` | `canAdmin` (depuis AuthContext) |
| `recharts` | **SVG natif uniquement** |

---

## ⚠️ Schéma app_settings

`app_settings` : table **clé/valeur** `(id, key, value jsonb, updated_at, updated_by)`
- ✅ `UPDATE app_settings SET value = value || '{"module": true}'::jsonb WHERE key = 'modules'`
- ❌ `UPDATE app_settings SET modules = ...` — FAUX

---

## ⚠️ Règles architecturales globales

- Toute nouvelle table → `organization_id UUID REFERENCES organizations(id)` + index + RLS
- RLS : `auth_user_organization_id()` (SECURITY DEFINER)
- RLS avec enum : `current_user_role()` pour caster en TEXT
- Super-admin : `is_super_admin()` pour accès cross-org
- **Edge Functions** : `// @ts-nocheck` en 1re ligne + copier vers `supabase/functions/` racine avant deploy
- **AuthContext** : toujours utiliser les helpers S69 — jamais `user?.role` directement
- **Pas de recharts** → SVG natif uniquement
- **Sidebar active** : `src/components/layout/Sidebar.jsx` UNIQUEMENT
- **Rôle `direction`** : N'EXISTE PAS en production — ne jamais l'utiliser

---

## Diagnostic modules — état post S72

| Module | Niveau actuel | Session enrichissement |
|--------|--------------|----------------------|
| **Recrutement** | **85% — pipeline Kanban + scoring + dashboard complet** | **S72 ✅** |
| **Gestion des Temps** | 80% — moteur HS + export paie complet | S71 ✅ |
| **Congés & Absences** | 85% — moteur de règles complet | S70 ✅ |
| Formation | 45% — pas de budget ni obligatoire | S73 |
| Compensation | 50% — pas de workflow révision | S74 |
| Onboarding | 45% — checklist statique | S75 |
| Performance PULSE | 65% — bon core, alertes manquantes | S76 |
| Tâches | 65% — pas de dépendances ni récurrence | S77 |
| OKR | 60% — pas de check-ins ni scoring final | S78 |
| Projets | 55% — pas connecté aux tâches/OKR | S79 |
| Entretiens Annuels | 60% — pas de mi-année ni auto-éval | S80 |
| Feedback 360° | 55% — cycles non planifiés | S81 |
| Intelligence RH | 65% — pas de bilan social ni turnover | S82 |
| Succession & Talents | 50% — pas de vivier ni gap analysis | S83 |
| Référentiel Compétences | 45% — pas de cartographie gaps | S84 |
| Offboarding | 60% — pas automatisé | S85 |
| Notifications | 50% — pas de moteur de règles | S86 |
| Communication | 55% — pas de ciblage ni accusés | S87 |

---

## Tables Supabase (production complète)

### Core
- `users` — profils, **6 rôles**, service_id, division_id, direction_id, is_active, organization_id
- `services`, `divisions`, `directions`, `organizations`, `super_admins`
- `app_settings` — clé/valeur

### Performance & PULSE
`performance_scores`, `agent_activity_logs`, `pulse_morning_plans`, `pulse_daily_logs`, `monthly_performance_snapshots`

### Développement & OKR
`objectives` (parent_id, weight), `pdi_actions`, `feedback_requests`, `feedback_responses`, `review_cycles`, `review_evaluations`, `engagement_surveys`, `survey_responses`

### Formation (S57)
`training_catalog`, `training_enrollments`, `certifications`, `training_plans`, `training_plan_items`

### Compensation (S58)
`salary_grades`, `compensation_records`, `salary_benchmarks`, `compensation_reviews`, `bonus_records`

### Recrutement (S59–S63 + S72)
`job_postings` — + required_skills TEXT[], required_experience_years INT, scoring_criteria JSONB  
`job_applications` — + match_score NUMERIC(4,1), stage_order INT, pipeline_notes TEXT, source TEXT, archived_at TIMESTAMPTZ, archived_reason TEXT  
`interview_schedules`, `interview_feedback`  
`recruitment_stages` — + color TEXT, is_terminal BOOLEAN, auto_notify BOOLEAN, terminal_outcome TEXT  
`pipeline_actions` (NEW S72) — historique actions pipeline  
`recruitment_metrics` (NEW S72) — cache métriques recrutement  
MV : `mv_pipeline_by_job` (pipeline agrégé par offre + statut)  
MV : `mv_recruitment_dashboard` (dashboard complet par offre)  
Fonction : `compute_application_score(p_application_id UUID)` — score depuis feedbacks entretien

### Entretiens annuels (S60)
`annual_review_campaigns`, `annual_reviews`, `annual_review_signatures`

### Communication (S65)
`communication_channels`, `communication_messages`, `communication_announcements`, `communication_announcement_comments`, `communication_threads`, `communication_thread_messages`, `communication_ai_summaries`, `communication_user_status`

### Gestion des Temps (S66 + S71)
`time_sheets` — + regular_hours, ot_25_hours, ot_50_hours, ot_100_hours, overtime_approved, overtime_approved_by, overtime_approved_at, overtime_rejected_reason  
`time_entries`, `time_clock_events`  
`time_settings` — + daily_threshold_hours, weekly_threshold_hours, ot_rate_25_after, ot_rate_50_after, ot_rate_100_after, submission_deadline_days, alert_enabled, overtime_requires_approval, overtime_calc_mode  
MV : `mv_overtime_monthly_summary` (synthèse mensuelle HS par collaborateur)

### Congés & Absences (S67 + S70)
`leave_types` — + accrual_rate, accrual_enabled, contract_types[], carry_over_policy, carry_over_max_days  
`leave_balances` — + accrued_days, carried_over, expiry_date  
`leave_requests`, `leave_request_comments`  
`leave_settings` — + public_holidays jsonb[], carry_over_deadline, low_balance_threshold, pending_alert_hours, accrual_day

### Offboarding (S68)
`offboarding_processes`, `offboarding_templates`, `offboarding_checklists`, `offboarding_interviews`, `offboarding_knowledge`

### Autres modules
`key_positions`, `succession_plans` (S51) · `api_keys`, `webhook_endpoints`, `field_mappings`, `scim_sync_logs` (S53) · `attrition_risk_scores`, `behavioral_alerts`, `career_predictions` (S54) · `calibration_sessions`, `enps_cache` (S55) · `push_subscriptions`, `onboarding_checklist` (S56) · `notifications`, `notification_preferences`, `email_queue` (S12) · `ai_chat_messages`, `ai_reports` (S43–S44)

---

## ⚠️ Pièges colonnes connus (mis à jour S72)

| Table | ❌ FAUX | ✅ RÉEL |
|-------|--------|--------|
| `users` | `profiles` | `users` |
| `users` | `org_id` | `organization_id` |
| `app_settings` | `modules` (colonne) | `key = 'modules'` |
| `performance_scores` | `date` | `score_date` |
| `performance_scores` | `delivery_score` / `quality_score` / `total` | `score_delivery` / `score_quality` / `score_total` |
| `objectives` | `start_date` / `end_date` | N'EXISTENT PAS |
| `survey_responses` | `score` / `user_id` | `scores` (JSONB) / `respondent_id` |
| `review_evaluations` | `review_cycle_id` | `cycle_id` |
| `compensation_reviews` | `increase_amount` / `increase_pct` | GENERATED — ne pas insérer |
| `compensation_records` | `current` | `is_current` BOOLEAN |
| `job_applications` | `internal` | `is_internal` GENERATED |
| `job_applications` | `score` | `match_score` NUMERIC(4,1) (S72) |
| `interview_feedback` | `score` | `overall_score` SMALLINT |
| `annual_review_campaigns` | `sections` | `template_sections` JSONB |
| `annual_reviews` | `rating` | `overall_rating` TEXT |
| `annual_review_signatures` | `type` | `signer_type` TEXT |
| `time_settings` | `overtime_threshold` | `weekly_threshold_hours` (S71) |

---

## Edge Functions Supabase (17 total)

| Fonction | S | Usage |
|----------|----|-------|
| `generate-ai-response` | 43 | Chat IA contextuel |
| `generate-pdi-suggestions` | 43 | Suggestions PDI |
| `generate-report` | 44 | Rapports automatisés Claude |
| `nita-webhook` | 45 | Réception NITA (HMAC-SHA256) |
| `apex-api` | 53 | API REST publique v1 |
| `apex-api-scim` | 53 | Connecteur SCIM 2.0 |
| `apex-webhooks` | 53 | Dispatch webhooks sortants |
| `send-push-notification` | 56 | Push Web notifications |
| `send-manager-alert` | 56 | Alerte manager événement collab |
| `send-weekly-summary` | 56 | Résumé hebdo équipe |
| `send-journal-reminder` | 56 | Rappel saisie journal PULSE |
| `send-brief-reminder` | 56 | Rappel brief quotidien |
| `send-feedback-request` | 59 | Notification feedback recrutement |
| `send-award-notification` | 59 | Notification award |
| `ai-recruitment-match` | 61 | Matching IA candidats/postes |
| `send-message-notification` | 65 | Push nouveau message Communication |
| `send-timesheet-reminder` | 66 | Rappel soumission feuille de temps |
