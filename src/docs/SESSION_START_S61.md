# SESSION_START.md — APEX RH
> Dernière mise à jour : Session 60 ✅ DÉPLOYÉ EN PRODUCTION (07/03/2026)

## Infos projet
- URL : https://apex-rh-h372.vercel.app
- Supabase : ptpxoczdycajphrshdnk
- Sessions : 1–60 déployées

---

## Message de démarrage Session 61 (copier-coller)

```
Bonjour Claude. Projet APEX RH — Session 61.

Contexte :
- URL production : https://apex-rh-h372.vercel.app
- Supabase : ptpxoczdycajphrshdnk
- Sessions 1–60 déployées et fonctionnelles.
- S59 : Portail Candidats & Recrutement Light.
- S60 : Entretiens annuels & Évaluation avancée.

⚠️ DÉCISIONS ARCHITECTURALES CRITIQUES (lire MEMOIRE_PROJET.md) :
1. Score IPR composite SUPPRIMÉ (S37). Ne jamais réintroduire.
2. Navigation 3 expériences DÉPLOYÉE (S38). Ne pas modifier Sidebar.jsx sans raison explicite.
3. App.jsx : NE PAS MODIFIER sauf raison explicite.
4. IA Générative DÉPLOYÉE (S43) — Claude API via Edge Functions uniquement.
5. Multi-tenancy DÉPLOYÉ (S52) : organizations + RLS auth_user_organization_id()
6. Portail Candidats & Recrutement Light DÉPLOYÉ (S59).
7. Entretiens annuels & Évaluation avancée DÉPLOYÉ (S60) :
    - Tables : annual_review_campaigns + annual_reviews + annual_review_signatures ✅
    - MVs : mv_annual_campaign_stats + mv_employee_review_history ✅
    - Enums : annual_review_status | campaign_status | salary_recommendation ✅
    - Hook : useAnnualReviews.js (30+ hooks + helpers) ✅
    - Page : /entretiens (4 onglets adaptatifs rôle) ✅
    - Composants : AnnualReviewForm + AnnualReviewDashboard + AnnualReviewAdmin + AnnualReviewHistory ✅
    - Module key : entretiens_annuels_enabled dans app_settings.modules ✅

⚠️ RÈGLES ENTRETIENS ANNUELS S60 :
- Route /entretiens → pages/entretiens/EntretiensAnnuels.jsx (lazy dans App.jsx)
- Sidebar : ClipboardList (couleur #A78BFA) dans les 3 vues (après Recrutement)
- annual_reviews : UNIQUE(campaign_id, employee_id)
- annual_review_signatures : UNIQUE(review_id, signer_type) — upsert onConflict
- overall_rating : CHECK IN ('insuffisant','a_ameliorer','satisfaisant','bien','excellent')
- salary_recommendation enum : maintien | augmentation_merite | augmentation_promotion | revision_exceptionnelle | gel
- objectives_next_year : JSONB [{title, indicator, target, deadline}]
- pg_cron : refresh MVs entretiens chaque nuit 3h00
- RLS annual_reviews : employee voit la sienne ; manager voit son équipe ; admin/directeur voient l'org
- Pas de recharts → SVG natif

⚠️ RÈGLES RECRUTEMENT S59 (toujours actives) :
- job_applications.is_internal : GENERATED ALWAYS — ne pas insérer manuellement
- job_applications : UNIQUE(job_id, candidate_email)
- interview_feedback : UNIQUE(interview_id, reviewer_id) — upsert onConflict
- PIPELINE_STAGES : 7 étapes (nouveau→accepte). refuse/retire sont finaux.

⚠️ MULTI-TENANCY S52 — TOUJOURS ACTIF :
- Toute nouvelle table → organization_id UUID REFERENCES organizations(id) + index + RLS
- RLS : auth_user_organization_id() dans les policies

⚠️ EDGE FUNCTIONS :
- // @ts-nocheck en ligne 1 (toujours)
- Jamais deno.land/x tiers → APIs natives Deno
- Jamais $$ imbriqué dans DO $$ → utiliser $outer$

⚠️ ENUMS CRITIQUES :
- users.role : administrateur | directeur | chef_division | chef_service | collaborateur
- objectives.status : brouillon | actif | en_evaluation | valide | archive
- contract_type : cdi | cdd | stage | freelance | apprentissage | autre
- application_status : nouveau | en_revue | telephone | entretien | test | offre | accepte | refuse | retire
- annual_review_status : pending | self_in_progress | self_submitted | meeting_scheduled | manager_in_progress | completed | signed | archived
- campaign_status : draft | active | in_progress | completed | archived
- salary_recommendation : maintien | augmentation_merite | augmentation_promotion | revision_exceptionnelle | gel

⚠️ PIÈGES COLONNES :
- performance_scores : score_date / score_delivery / score_quality / score_total
- survey_responses.scores : JSONB — clé 'enps' (0–10)
- review_evaluations : cycle_id (PAS review_cycle_id)
- training_plan_items : free_title (PAS training_name)
- compensation_records : is_current BOOLEAN (PAS current)
- job_applications : is_internal GENERATED (PAS internal)
- interview_feedback : overall_score SMALLINT (PAS score)
- annual_review_campaigns : template_sections JSONB (PAS sections)
- annual_reviews : overall_rating TEXT (PAS rating)
- annual_review_signatures : signer_type TEXT (PAS type)

⚠️ FRONTEND :
- isAdmin / isDirecteur depuis useAuth() — jamais user.role directement
- Pas de recharts → SVG natif (non installé sur Vercel)

Règle d'or : livrer src.zip complet + APEX_RH_SESSION_61.zip (docs mis à jour).
```

---

## Checklist déploiement Session 60 ✅

**Étape 1 — SQL**
1. Exécuter `migration_s60_entretiens_annuels.sql` dans Supabase SQL Editor
2. Vérifier les 3 tables : annual_review_campaigns, annual_reviews, annual_review_signatures
3. Vérifier les 2 MVs : mv_annual_campaign_stats, mv_employee_review_history
4. Vérifier les nouvelles valeurs notification_type
5. Vérifier update app_settings (entretiens_annuels_enabled = true)

**Étape 2 — Build & déploiement**
6. `npm run build` → vérifier absence d'erreurs
7. Git push → Vercel déploie

**Étape 3 — Vérification**
8. Naviguer vers /entretiens → onglet "Mon entretien" visible
9. En tant qu'admin : onglet "Campagnes" → créer une campagne test
10. Publier la campagne → vérifier status = active
11. En tant que manager : onglet "Mon équipe" → liste collaborateurs visible
12. En tant que collaborateur : vérifier entretien créé + formulaire accessible

**Étape 4 — Tests**
13. `npm run test` → vérifier ≥212 tests passent (170 S59 + 42 S60)

---

## Score cumulatif post-S60

| Axe | S58 | S59 | S60 (estimé) |
|-----|-----|-----|------|
| Fonctionnalités produit | 95 | 97 | **98** |
| Logique métier | 91 | 93 | **95** |
| Scalabilité | 81 | 82 | **83** |
| Analytics prédictifs | 85 | 85 | 85 |
| Engagement RH | 86 | 87 | **89** |
| Expérience utilisateur | 85 | 86 | **88** |
| Tests | 88 (132t) | 91 (170t) | **93** (212t) |
| **GLOBAL estimé** | **93** | **94** | **95** |

**Top 3 priorités post-S60 :**
1. 🔴 IA dans le Recrutement (matching automatique, scoring candidats) → **S61**
2. 🟡 Tableau de bord entretiens annuels enrichi (comparaisons, tendances multi-années) → **S62**
3. 🟢 Mobile app native (Capacitor/React Native) → **Long terme**
