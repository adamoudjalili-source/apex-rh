# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 82 — Intelligence RH — Bilan social + turnover ✅ DÉPLOYÉ (08/03/2026)

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
cd /home/claude && zip -r /mnt/user-data/outputs/src_S82.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S82): Intelligence RH — Bilan social + turnover" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 82
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
17. **Entretiens — Mi-année + auto-éval + suivi managérial DÉPLOYÉ (S80)**.
18. **Feedback 360° — Cycles planifiés + tendances DÉPLOYÉ (S81)**.
19. **Intelligence RH — Bilan social + turnover DÉPLOYÉ (S82)** :
    - `s82_hr_intelligence.sql` — table `employee_departures`, 3 MVs (headcount/turnover/absenteeism), RPC `get_social_report`, RLS, indexes
    - `useHRIntelligence.js` — 7 hooks : useHeadcountStats, useTurnoverStats, useAbsenteeismStats, useSalaryMassStats, useSocialReport, useEmployeeDepartures, useRegisterDeparture, useDeleteDeparture
    - `HeadcountChart.jsx` — effectifs mensuels (barres SVG), donut répartition rôles SVG
    - `TurnoverDashboard.jsx` — KPIs turnover, donut motifs SVG, histogramme mensuel, liste départs, modal ajout
    - `AbsenteeismChart.jsx` — heatmap mensuelle SVG, barres jours, répartition par type
    - `SalaryMassDashboard.jsx` — masse salariale, barres horizontales par rôle, distribution SVG
    - `SocialReportExport.jsx` — bilan social structuré, export CSV, impression
    - `HRIntelligencePage.jsx` — page avec 5 onglets (effectifs/turnover/absentéisme/salaires/bilan)
    - `IntelligenceRH.jsx` — +1 onglet "Bilan Social" dans le groupe Stratégie (adminOnly)

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
| `review_self_assessments` | organization_id, review_id, user_id, answers | S80 |
| `review_development_plans` | organization_id, review_id, user_id, goals | S80 |
| `feedback360_templates` | organization_id, name, competences jsonb | S81 |
| `feedback360_cycles` | organization_id, title, start_date, end_date, status, template_id | S81 |
| `feedback360_requests` | cycle_id, evaluatee_id, evaluator_id, relationship, status, answers, is_anonymous | S81 |
| `employee_departures` | organization_id, user_id, departure_date, reason, type, rehirable | NEW S82 |

## MVs S82
- `mv_headcount_stats` — effectifs par mois, rôle (REVOKE ALL)
- `mv_turnover_stats` — taux turnover par mois, motif (REVOKE ALL)
- `mv_absenteeism_stats` — taux absentéisme par mois, type (REVOKE ALL)

## Hooks S82 — référence rapide
```
useHeadcountStats(year)         — effectifs mensuels + répartition rôles
useTurnoverStats(year)          — taux turnover, départs par motif/mois
useAbsenteeismStats(year)       — taux absentéisme, heatmap, par type
useSalaryMassStats(year)        — masse salariale, moyenne, distribution
useSocialReport(year)           — bilan social complet (RPC get_social_report)
useEmployeeDepartures()         — liste des départs enregistrés
useRegisterDeparture()          — mutation : enregistrer un départ
useDeleteDeparture()            — mutation : supprimer un départ
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur mv_headcount_stats, mv_turnover_stats, mv_absenteeism_stats
- ✅ `employee_departures.UNIQUE(user_id)` — upsert par user_id
- ✅ `employee_departures.reason` enum : resignation/dismissal/end_of_contract/retirement/mutual_agreement/death/other
- ✅ `get_social_report(p_org_id, p_year)` — RPC sécurisée SECURITY DEFINER
- ✅ `HRIntelligencePage.jsx` intégré comme onglet "Bilan Social" dans IntelligenceRH.jsx (groupe Stratégie, adminOnly)
- ✅ `feedback360_requests.is_anonymous = true` par défaut — ne jamais exposer evaluator_id
- ✅ `project_advanced_milestones` ≠ `milestones` (deux tables distinctes depuis S79)
