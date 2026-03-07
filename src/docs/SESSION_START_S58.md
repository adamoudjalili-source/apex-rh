# SESSION_START.md — APEX RH
> Template de démarrage session. Dernière mise à jour : Session 57 ✅ DÉPLOYÉ EN PRODUCTION (07/03/2026)

## Infos projet
- URL : https://apex-rh-h372.vercel.app
- Supabase : ptpxoczdycajphrshdnk
- Sessions : 1–57 déployées

---

## Message de démarrage Session 58 (copier-coller)

```
Bonjour Claude. Projet APEX RH — Session 58.

Contexte :
- URL production : https://apex-rh-h372.vercel.app
- Supabase : ptpxoczdycajphrshdnk
- Sessions 1–57 déployées et fonctionnelles.
- S56 : Alertes Push & Onboarding Enrichi.
- S57 : Module Formation & Certifications.

⚠️ DÉCISIONS ARCHITECTURALES CRITIQUES (lire MEMOIRE_PROJET.md) :
1. Score IPR composite SUPPRIMÉ (S37). Ne pas réintroduire.
2. Navigation 3 expériences DÉPLOYÉE (S38). Ne pas modifier Sidebar.jsx sans raison explicite.
3. App.jsx : NE PAS MODIFIER sauf raison explicite.
4. IA Générative DÉPLOYÉE (S43) — Claude API via Edge Functions uniquement.
5. Multi-tenancy DÉPLOYÉ (S52) : organizations + RLS auth_user_organization_id()
6. Behavioral Intelligence Engine DÉPLOYÉ (S54).
7. Calibration Multi-niveaux DÉPLOYÉ (S55).
8. eNPS Enrichi DÉPLOYÉ (S55).
9. Alertes Push DÉPLOYÉES (S56).
10. Onboarding Enrichi DÉPLOYÉ (S56).
11. Module Formation & Certifications DÉPLOYÉ (S57) :
    - Tables : training_catalog + training_enrollments + certifications + training_plans + training_plan_items ✅
    - MVs : mv_user_training_stats + mv_training_popularity ✅
    - Enums : training_type | enrollment_status | plan_priority | plan_item_status ✅
    - Hook : useFormations.js (20+ hooks) ✅
    - Page : /formation (6 onglets adaptatifs rôle) ✅
    - Composants : FormationCatalog + FormationDetail + MyEnrollments + MyCertifications + TrainingPlanPanel + TeamFormationDashboard + FormationAdminPanel ✅
    - notification_type : + training_enrolled + training_completed + training_reminder + certification_expiring + training_plan_validated ✅
    - Module key : formations_enabled dans app_settings.modules ✅

⚠️ RÈGLES FORMATION S57 :
- Route /formation → pages/formation/Formation.jsx (lazy dans App.jsx)
- Sidebar : GraduationCap dans les 3 vues (collaborateur/manager/admin)
- Enrollment UNIQUE(user_id, training_id) → upsert avec onConflict
- Plan UNIQUE(user_id, year) → un seul plan par user/année
- pg_cron : refresh MVs formation chaque nuit 2h (refresh-training-views-nightly)
- Certifications : alerte auto si expires_at < 60j
- Données démo : 3 formations insérées automatiquement à la migration

⚠️ MULTI-TENANCY S52 — TOUJOURS ACTIF :
- Toute nouvelle table → organization_id UUID REFERENCES organizations(id) + index + RLS
- RLS : auth_user_organization_id() dans les policies

⚠️ EDGE FUNCTIONS :
- // @ts-nocheck en ligne 1 (toujours)
- Jamais deno.land/x tiers → APIs natives Deno
- Jamais $$ imbriqué dans DO $$ → $outer$

⚠️ ENUMS CRITIQUES :
- objectives.status : brouillon | actif | en_evaluation | valide | archive
- objectives.level : strategique | division | service | individuel
- users.role : administrateur | directeur | chef_division | chef_service | collaborateur
- calibration_sessions.status : open | in_progress | pending_n2 | validated | closed
- training_type : presentiel | e-learning | blended | webinar | coaching | conference
- enrollment_status : inscrit | en_cours | termine | annule | abandonne
- plan_priority : haute | moyenne | basse
- plan_item_status : planifie | inscrit | en_cours | termine | reporte | annule

⚠️ PIÈGES COLONNES :
- performance_scores : score_date / score_delivery / score_quality / score_total
- survey_responses.scores : JSONB — clé 'enps' (0–10) ✅ S55
- review_evaluations : cycle_id (PAS review_cycle_id) ✅ S55
- survey_responses : respondent_id (PAS user_id) ✅ S55
- objectives : parent_id ✅, weight ✅ — PAS de start_date/end_date
- users.role 'direction' N'EST PAS dans l'enum DB
- training_plan_items : free_title (PAS training_name) pour formations hors catalogue

⚠️ FRONTEND :
- isAdmin / isDirecteur depuis useAuth() — jamais user.role directement
- Pas de recharts → SVG natif (non installé sur Vercel)

Règle d'or : livrer src.zip complet + APEX_RH_SESSION_58.zip (docs mis à jour).
```

---

## Checklist déploiement Session 57 ✅

### Fichiers livrés S57
- `src/sql/migration_s57_formations.sql` — 5 tables + 2 MVs + 4 enums + pg_cron + seed
- `src/hooks/useFormations.js` — 20+ hooks (catalogue, inscriptions, certifications, plans)
- `src/components/formation/FormationCard.jsx` — Carte catalogue
- `src/components/formation/FormationDetail.jsx` — Panel détail + inscription
- `src/components/formation/FormationCatalog.jsx` — Navigateur catalogue
- `src/components/formation/MyEnrollments.jsx` — Mes formations
- `src/components/formation/MyCertifications.jsx` — Mes certifications
- `src/components/formation/TrainingPlanPanel.jsx` — Plan formation annuel
- `src/components/formation/TeamFormationDashboard.jsx` — Vue équipe manager
- `src/components/formation/FormationAdminPanel.jsx` — Administration
- `src/pages/formation/Formation.jsx` — Page principale
- `src/tests/useFormations.test.js` — 30 tests
- `src/App.jsx` (modifié)
- `src/components/layout/Sidebar.jsx` (modifié)

### Étapes déploiement S57

**Étape 1 — SQL**
1. Exécuter `migration_s57_formations.sql` dans Supabase SQL Editor
2. Vérifier les 5 tables : training_catalog, training_enrollments, certifications, training_plans, training_plan_items
3. Vérifier les 2 MVs : mv_user_training_stats, mv_training_popularity
4. Vérifier les nouvelles valeurs dans notification_type
5. Vérifier l'update de app_settings (formations_enabled = true)

**Étape 2 — Build & déploiement**
6. `npm run build` → vérifier absence d'erreurs
7. Git push → Vercel déploie

**Étape 3 — Vérification**
8. Naviguer vers /formation → onglet Catalogue visible
9. Vérifier les 3 formations de démo dans le catalogue
10. Tester inscription → "S'inscrire" → statut "Inscrit" visible
11. Tester ajout certification → date + organisme
12. Tester plan de formation → ajouter item

**Étape 4 — Tests**
13. `npm run test` → vérifier ≥97 tests passent (67 S56 + 30 S57)

---

## Score cumulatif post-S57

| Axe | S55 | S56 | S57 (estimé) |
|-----|-----|-----|------|
| Fonctionnalités produit | 89 | 91 | **93** |
| Logique métier | 85 | 87 | **89** |
| Scalabilité | 77 | 79 | **80** |
| Analytics prédictifs | 85 | 85 | 85 |
| Engagement RH | 78 | 83 | **85** |
| Expérience utilisateur | — | 82 | **84** |
| Tests | 57 | 67 | **78** |
| **GLOBAL estimé** | **87** | **89** | **91** |

**Top 3 priorités post-S57 :**
1. 🔴 Compensation & Benchmark salarial → **S58**
2. 🟡 Portail candidats & Recrutement light → **S59**
3. 🟢 Mobile app native (Capacitor/React Native) → **S60**
