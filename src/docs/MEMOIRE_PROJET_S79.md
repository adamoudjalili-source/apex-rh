# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 79 — Projets — Connexions OKR + budget + Gantt avancé ✅ DÉPLOYÉ (08/03/2026)

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
cd /home/claude && zip -r /mnt/user-data/outputs/src_S79.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S79): Projets — Connexions OKR + budget + Gantt avancé" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 79
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
8. **Sécurité Supabase Hotfix post-S70** — 0 erreurs / 1 warning résiduel pg_trgm.
9. **Gestion des Temps — Règles HS + Export paie DÉPLOYÉ (S71)**.
10. **Recrutement — Pipeline structuré + scoring DÉPLOYÉ (S72)**.
11. **Formation — Budget + Obligatoire + Évaluation DÉPLOYÉ (S73)**.
12. **Compensation — Workflow révision salariale DÉPLOYÉ (S74)**.
13. **Onboarding — Parcours progressif automatisé DÉPLOYÉ (S75)**.
14. **Performance PULSE — Alertes proactives + Calibration DÉPLOYÉ (S76)**.
15. **Tâches — Dépendances + récurrence + charge DÉPLOYÉ (S77)**.
16. **OKR — Cycles + Check-ins + Lien évaluation DÉPLOYÉ (S78)**.
17. **Projets — Connexions OKR + budget + Gantt avancé DÉPLOYÉ (S79)** :
    - `s79_projects_advanced.sql` — colonnes sur projects, 2 tables, 2 RPC, RLS
    - `useProjects.js` — 9 hooks S79 appended
    - `ProjectOKRLinker.jsx` — sélecteur OKR avec preview KRs, expand/collapse
    - `ProjectBudgetPanel.jsx` — lignes budget par catégorie, barres planifié/réel, variance
    - `ProjectAdvancedMilestones.jsx` — jalons avancés avec timeline SVG, lien KR
    - `ProjectGanttAdvanced.jsx` — Gantt 3 mois SVG natif multi-projets, jalons 💎, zoom
    - `ProjectDetailPanel.jsx` — +3 onglets : OKR / Budget / Jalons+
    - `Projects.jsx` — +1 vue : Gantt avancé

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
| `okr_cycles` | id, organization_id, name, cadence, start_date, end_date, status | NEW S78 |
| `okr_checkins` | id, organization_id, key_result_id, user_id, progress_value, confidence | NEW S78 |
| `project_okr_links` | id, organization_id, project_id, objective_id | NEW S79 |
| `project_budget_lines` | id, organization_id, project_id, category, label, amount_planned, amount_actual | NEW S79 |
| `project_advanced_milestones` | id, organization_id, project_id, title, due_date, is_reached, key_result_id | NEW S79 |

## Colonnes ajoutées (S79)
```sql
projects.budget_total   numeric(15,2)
projects.budget_spent   numeric(15,2)
projects.cycle_id       uuid FK okr_cycles
```

## Hooks disponibles — Projets S79 (référence rapide)

```
useProjectOKRLinks(projectId)       — OKRs liés à un projet
useLinkProjectToOKR()               — lier projet ↔ objectif
useUnlinkProjectOKR()               — délier projet ↔ objectif
useProjectBudget(projectId)         — lignes budget
useUpsertBudgetLine()               — créer/MAJ ligne budget
useDeleteBudgetLine()               — supprimer ligne budget
useAdvancedMilestones(projectId)    — jalons avancés
useCreateAdvancedMilestone()        — créer jalon avancé
useUpdateAdvancedMilestone()        — modifier jalon avancé
useDeleteAdvancedMilestone()        — supprimer jalon avancé
useProjectsGantt(start, end)        — RPC Gantt multi-projets
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif uniquement — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ Cast `::text` sur les nouvelles valeurs d'enum dans les MVs créées la même session
- ✅ `increase_amount` et `increase_pct` sont GENERATED — ne JAMAIS les insérer
- ✅ Score IPR SUPPRIMÉ — ne jamais réintroduire
- ✅ `project_advanced_milestones` ≠ `milestones` (deux tables distinctes)
