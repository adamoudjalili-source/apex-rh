# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 84 — Référentiel Compétences — Cartographie + gaps ✅ DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour** (nouvelles tables, règles d'or, nouveaux modules)
6. **Commande Git prête à copier-coller** pour déployer sur Vercel
7. `README.md` **uniquement si** stack / installation / structure a changé

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S84.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S84): Référentiel Compétences — Cartographie + gaps" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 84
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1–18. (voir MEMOIRE_PROJET_S82.md)
19. **Intelligence RH — Bilan social + turnover DÉPLOYÉ (S82)**
20. **Succession & Talents — Vivier + gap analysis DÉPLOYÉ (S83)**
21. **Référentiel Compétences — Cartographie + gaps DÉPLOYÉ (S84)** :
    - `s84_competency_framework.sql` — tables `competency_categories` + `competencies` + `role_competency_requirements` + `user_competency_assessments`, MV `mv_competency_coverage`, RPC `get_competency_gaps` + `refresh_competency_coverage_mv`, RLS, indexes
    - `useCompetencyS84.js` — 13 hooks : useCompetencyCategories, useCreateCompetencyCategory, useCompetenciesList, useCreateCompetency, useUpdateCompetency, useDeleteCompetency, useRoleRequirements, useAllRoleRequirements, useUpsertRoleRequirement, useDeleteRoleRequirement, useUserAssessments, useOrgAssessments, useUpsertAssessment, useCompetencyGaps, useRefreshCompetencyCoverage
    - `CompetencyCatalog.jsx` — liste groupée par catégorie, CRUD compétences + catégories (adminOnly), descripteurs par niveau, formulaire expandable
    - `CompetencyHeatmap.jsx` — heatmap SVG compétences × collaborateurs, filtre catégorie, tooltip, couleur niveau 1–5
    - `UserCompetencyProfile.jsx` — radar SVG 8 compétences max + tableau écarts vs rôle, formulaire évaluation (manager/admin)
    - `CompetencyFrameworkPage.jsx` — page 3 onglets (Catalogue / Heatmap / Profil individuel), bouton refresh MV
    - `IntelligenceRH.jsx` — +onglet "Référentiel" dans groupe Talent (adminOnly)
    - **NOTE S84** : `useCompetencyFramework.js` existait déjà depuis S42 (familles métiers) → NON écrasé. Nouveau fichier `useCompetencyS84.js` créé.

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les vrais noms en base
- `collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canManageOrg } = useAuth()
```

---

## Tables critiques — référence

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `users` | id, organization_id, role, manager_id | PAS `profiles` |
| `compensation_records` | employee_id, salary_amount, **is_current** | `is_current` PAS `current` |
| `compensation_reviews` | **user_id**, old_base_salary, new_base_salary | `increase_amount/pct` GENERATED |
| `annual_reviews` | ..., **review_type** | S80 : 'annual' \| 'mid_year' \| 'probation' |
| `feedback360_requests` | cycle_id, evaluatee_id, evaluator_id, relationship, status, answers, is_anonymous | S81 |
| `employee_departures` | organization_id, user_id, departure_date, reason, type, rehirable | S82 |
| `talent_pool_entries` | organization_id, user_id, target_role, target_position_id, readiness, skills_gap | S83 |
| `succession_gaps` | organization_id, position_id, required_skills, current_coverage_pct | S83 |
| `competency_categories` | organization_id, name, color, icon, order_index | NEW S84 |
| `competencies` | organization_id, category_id, name, description, levels jsonb, is_active | NEW S84 |
| `role_competency_requirements` | organization_id, role_name OR position_id, competency_id, required_level, weight | NEW S84 |
| `user_competency_assessments` | organization_id, user_id, competency_id, assessed_level, assessed_by, source | NEW S84 |

## MVs S84
- `mv_competency_coverage` — best_level / required_level / gap par (user × compétence) — REVOKE ALL
- `get_competency_gaps(p_org_id, p_user_id?)` — RPC SECURITY DEFINER qui lit la MV
- `refresh_competency_coverage_mv()` — RPC SECURITY DEFINER, admin uniquement

## Hooks S84 — référence rapide
```
useCompetencyCategories()            — catégories avec couleur/icône
useCreateCompetencyCategory()        — mutation : créer catégorie
useCompetenciesList()                — catalogue complet avec join catégorie
useCreateCompetency()                — mutation : créer compétence
useUpdateCompetency()                — mutation : MAJ compétence
useDeleteCompetency()                — mutation : archiver (is_active=false)
useRoleRequirements({roleName,positionId}) — requis pour un rôle ou poste
useAllRoleRequirements()             — tous les requis de l'org
useUpsertRoleRequirement()           — mutation : créer/MAJ exigence rôle
useDeleteRoleRequirement()           — mutation : supprimer exigence
useUserAssessments(userId)           — évaluations d'un collaborateur
useOrgAssessments()                  — toutes les évaluations de l'org
useUpsertAssessment()                — mutation : créer/MAJ évaluation
useCompetencyGaps(userId?)           — RPC gaps individuels ou org
useRefreshCompetencyCoverage()       — mutation : refresh MV
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur mv_competency_coverage
- ✅ `useCompetencyFramework.js` (S42 familles métiers) — NE PAS ÉCRASER — les hooks S84 sont dans `useCompetencyS84.js`
- ✅ `competencies.UNIQUE(organization_id, name)` — pas de doublon de nom dans une org
- ✅ `role_competency_requirements` — UNIQUE sur (org, role_name, competency_id) OU (org, position_id, competency_id)
- ✅ `user_competency_assessments.UNIQUE(organization_id, user_id, competency_id, source)` — upsert par quadruplet
- ✅ `get_competency_gaps` et `refresh_competency_coverage_mv` — SECURITY DEFINER avec vérification org
- ✅ `assessed_level` entre 1 et 5 — validation CHECK en base
- ✅ `source` enum : 'manager' | 'self' | '360' | 'import'
- ✅ `talent_pool_entries.skills_gap` jsonb reste format libre — le référentiel S84 peut l'alimenter mais ne le remplace pas
- ✅ Toutes les règles S83 restent valides
