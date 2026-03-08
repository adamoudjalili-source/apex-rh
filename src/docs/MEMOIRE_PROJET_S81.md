# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 81 — Feedback 360° — Cycles planifiés + tendances ✅ DÉPLOYÉ (08/03/2026)

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
cd /home/claude && zip -r /mnt/user-data/outputs/src_S81.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S81): Feedback 360° — Cycles planifiés + tendances" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 81
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
18. **Feedback 360° — Cycles planifiés + tendances DÉPLOYÉ (S81)** :
    - `s81_feedback360_advanced.sql` — 3 tables, 1 MV, 1 RPC, RLS, indexes
    - `useFeedback360.js` — 14 hooks S81 appended (cycles, templates, requests, summary, trends)
    - `Feedback360Form.jsx` — formulaire multi-étapes par compétences, notation étoiles, brouillon
    - `Feedback360Summary.jsx` — radar SVG, scores par compétence, tendance delta, verbatims
    - `Feedback360Trends.jsx` — courbes SVG historiques, tableau récapitulatif, sélection compétences
    - `Feedback360CycleAdmin.jsx` — création cycle, statuts, stats taux de réponse, actions
    - `EntretiensAnnuels.jsx` — +1 onglet Feedback 360° avec badge en attente

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
| `feedback360_templates` | organization_id, name, competences jsonb | NEW S81 |
| `feedback360_cycles` | organization_id, title, start_date, end_date, status, template_id | NEW S81 |
| `feedback360_requests` | cycle_id, evaluatee_id, evaluator_id, relationship, status, answers, is_anonymous | NEW S81 |

## Hooks S81 — référence rapide

```
useFeedback360Templates()              — templates de l'org
useUpsertFeedback360Template()         — créer/MAJ template
useFeedback360Cycles()                 — tous les cycles
useActiveFeedback360Cycle()            — cycle actif (status='active')
useCreateFeedback360Cycle()            — créer un cycle
useUpdateFeedback360CycleStatus()      — lancer/clôturer un cycle
useMyFeedback360ToComplete(cycleId)    — évaluations à compléter
useMyFeedback360Requests(cycleId)      — demandes reçues sur moi
useSubmitFeedback360Advanced()         — soumettre une évaluation
useSaveFeedback360Draft()              — brouillon
useCreateFeedback360Requests()         — bulk insert demandes
useFeedback360CycleStats(cycleId)      — stats taux réponse
useFeedback360Summary(evaluateeId, cycleId) — synthèse (RPC)
useFeedback360Trends(userId)           — tendances (MV)
useFeedback360Verbatims(evaluateeId, cycleId) — commentaires anonymes
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur mv_feedback360_trends
- ✅ `feedback360_requests.UNIQUE(cycle_id, evaluatee_id, evaluator_id)` — upsert par triplet
- ✅ `project_advanced_milestones` ≠ `milestones` (deux tables distinctes depuis S79)
- ✅ `review_self_assessments` et `review_development_plans` créées en S80 — ne pas recréer
- ✅ `annual_reviews.review_type = 'mid_year'` pour les entretiens mi-année
