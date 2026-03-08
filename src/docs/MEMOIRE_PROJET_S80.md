# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 80 — Entretiens Annuels — Mi-année + auto-éval + suivi managérial ✅ DÉPLOYÉ (08/03/2026)

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
cd /home/claude && zip -r /mnt/user-data/outputs/src_S80.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S80): Entretiens Annuels — Mi-année + auto-éval + suivi managérial" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 80
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1. **Score IPR composite SUPPRIMÉ (S37)** — Ne jamais réintroduire.
2. **Navigation 6 rôles DÉPLOYÉE (S69)** — Helpers AuthContext uniquement.
3. **PWA + Mobile-First DÉPLOYÉ (S39)**.
4. **IA Générative DÉPLOYÉE (S43)** — Claude API via Edge Functions uniquement.
5. **Multi-tenancy DÉPLOYÉ (S52)** — 8 MVs + RLS multi-tenant.
6. **Réorganisation UX Hub & Spoke DÉPLOYÉE (S64)**.
7. **Congés — Moteur de règles DÉPLOYÉ (S70)**.
8. **Gestion des Temps — Règles HS + Export paie DÉPLOYÉ (S71)**.
9. **Recrutement — Pipeline structuré + scoring DÉPLOYÉ (S72)**.
10. **Formation — Budget + Obligatoire + Évaluation DÉPLOYÉ (S73)**.
11. **Compensation — Workflow révision salariale DÉPLOYÉ (S74)**.
12. **Onboarding — Parcours progressif automatisé DÉPLOYÉ (S75)**.
13. **Performance PULSE — Alertes proactives + Calibration DÉPLOYÉ (S76)**.
14. **Tâches — Dépendances + récurrence + charge DÉPLOYÉ (S77)**.
15. **OKR — Cycles + Check-ins + Lien évaluation DÉPLOYÉ (S78)**.
16. **Projets — Connexions OKR + budget + Gantt avancé DÉPLOYÉ (S79)**.
17. **Entretiens — Mi-année + auto-éval + suivi managérial DÉPLOYÉ (S80)** :
    - `s80_annual_reviews_advanced.sql` — enum review_type, colonne annual_reviews.review_type, 2 tables, 1 RPC, RLS
    - `useAnnualReviews.js` — 6 hooks S80 appended
    - `ReviewSelfAssessmentForm.jsx` — formulaire 4 étapes avec notation étoiles, objectifs dynamiques
    - `ReviewDevelopmentPlan.jsx` — PDI avec objectifs, actions, suivi statut, commentaire manager
    - `ReviewManagerDashboard.jsx` — tableau de bord suivi : stats, filtres, historique campagnes
    - `MidYearCampaignPanel.jsx` — campagne mi-année, lancement multi-sélection équipe
    - `EntretiensAnnuels.jsx` — +3 onglets : Auto-évaluation / Suivi / Mi-année

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
| `annual_reviews` | ..., **review_type** | NEW S80 : 'annual' \| 'mid_year' \| 'probation' |
| `review_self_assessments` | organization_id, review_id, user_id, answers, submitted_at | NEW S80 |
| `review_development_plans` | organization_id, review_id, user_id, goals, next_check_date, status | NEW S80 |

## Hooks disponibles — Entretiens S80 (référence rapide)

```
useReviewSelfAssessment(reviewId)     — auto-éval d'un entretien
useSubmitSelfAssessment()             — sauvegarder/soumettre auto-éval
useReviewDevelopmentPlan(reviewId)    — PDI lié à un entretien
useUpsertDevelopmentPlan()            — créer/MAJ PDI
useReviewCompletionStats(managerId)   — stats suivi manager (RPC)
useMidYearReviews()                   — entretiens mi-année actifs
useCreateMidYearReviews()             — lancer mi-année pour une équipe
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `project_advanced_milestones` ≠ `milestones` (deux tables distinctes depuis S79)
- ✅ `review_self_assessments` UNIQUE(review_id, user_id) — toujours upsert
- ✅ `annual_reviews.review_type = 'mid_year'` pour les entretiens mi-année
