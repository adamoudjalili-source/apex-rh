# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 77 — Tâches — Dépendances + récurrence + charge ✅ DÉPLOYÉ (08/03/2026)

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
cd /home/claude && zip -r /mnt/user-data/outputs/src_S77.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S77): Tâches — Dépendances + récurrence + charge" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 77
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
15. **Tâches — Dépendances + récurrence + charge DÉPLOYÉ (S77)** :
    - `s77_tasks_advanced.sql` — 2 enums, 3 tables, MV `mv_team_workload`, 2 fonctions RPC, RLS
    - `useTasks.js` — 12 hooks S77 appended
    - `TaskDependencyGraph.jsx` — graphe SVG dépendances inter-tâches
    - `RecurrenceConfig.jsx` — config récurrence (daily/weekly/monthly/custom), preview occurrences
    - `TimeTrackingPanel.jsx` — log temps + historique + barre progression estimé
    - `WorkloadChart.jsx` — barre SVG charge par collaborateur (via MV + RPC)
    - `GanttMini.jsx` — timeline Gantt 4 semaines SVG natif, navigation semaines, filtres statut
    - `TaskDetailPanel.jsx` — +3 onglets : Dépendances / Récurrence / Temps
    - `Tasks.jsx` — +2 vues : Gantt / Charge

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les 6 rôles
- `collaborateur` — lecture seule sur ses propres données
- `manager` — + accès équipe directe
- `rh` — + accès org-wide, validation révisions
- `admin` — accès complet, cycles, application révisions
- `direction` — lecture org-wide + tableaux de bord
- `recruteur` — module recrutement uniquement

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canRecruit, canViewAnalytics } = useAuth()
// canAdmin       → role = 'admin'
// canValidate    → role IN ('admin','rh')
// canManageTeam  → role IN ('admin','rh','manager','direction')
```

---

## Tables critiques — référence

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `users` | id, organization_id, role, manager_id, full_name | PAS `profiles` |
| `compensation_records` | employee_id, salary_amount, **is_current**, effective_date | `is_current` PAS `current` |
| `compensation_reviews` | **user_id**, old_base_salary, new_base_salary, status, review_cycle_id | `increase_amount` et `increase_pct` GENERATED |
| `compensation_cycles` | organization_id, name, year, status, budget_envelope | NEW S74 |
| `onboarding_templates` | id, organization_id, name, target_role, target_department, is_active | NEW S75 |
| `onboarding_assignments` | id, organization_id, user_id, template_id, start_date, status | NEW S75 |
| `onboarding_step_completions` | id, assignment_id, step_id, user_id, status, completed_at, comment | NEW S75 |
| `pulse_alert_rules` | id, organization_id, name, alert_type, threshold_score, consecutive_days | NEW S76 |
| `pulse_alerts` | id, organization_id, rule_id, user_id, alert_type, status, severity, context_json | NEW S76 |
| `pulse_calibration` | id, organization_id, dimension, weight, min_trigger_score, target_score | NEW S76 |
| `task_dependencies` | id, organization_id, task_id, depends_on_id, dependency_type | NEW S77 |
| `task_recurrences` | id, organization_id, task_id, frequency, interval_value, days_of_week, end_date | NEW S77 |
| `task_time_tracking` | id, organization_id, task_id, user_id, minutes_spent, logged_at, note | NEW S77 |

---

## Hooks disponibles — Tâches S77 (référence rapide)

```
useTaskDependencies(taskId)   — dépendances d'une tâche (dependsOn + blockedBy)
useCreateDependency()         — créer une dépendance
useDeleteDependency()         — supprimer une dépendance
useTaskRecurrence(taskId)     — règle récurrence d'une tâche
useCreateRecurrence()         — créer récurrence
useUpdateRecurrence()         — modifier récurrence
useDeleteRecurrence()         — supprimer récurrence
useTimeTracking(taskId)       — logs temps d'une tâche
useLogTime()                  — enregistrer du temps
useDeleteTimeLog()            — supprimer un log
useTeamWorkload()             — charge par collaborateur (RPC → MV)
useGanttData(start, end)      — tâches avec dates pour Gantt (RPC)
```

---

## Enums S77

```sql
task_dependency_type    : 'blocks' | 'related'
task_recurrence_frequency : 'daily' | 'weekly' | 'monthly' | 'custom'
```

## Colonnes ajoutées sur `tasks` (S77)
```sql
tasks.estimated_minutes  integer  -- temps estimé en minutes
tasks.workload_score     integer  -- charge 0-10
```

---

## Règles d'or techniques (jamais violer)

- ✅ `compensation_reviews.user_id` (PAS `employee_id`)
- ✅ `compensation_reviews.old_base_salary` / `new_base_salary` (PAS `current_salary` / `new_salary`)
- ✅ `increase_amount` et `increase_pct` sont GENERATED — ne JAMAIS les insérer
- ✅ `compensation_records.is_current` (pas `current`)
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif uniquement — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js` pour liste des users org (PAS `useOrgUsers`)
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ MVs avec REVOKE ALL (anon, authenticated)
- ✅ Cast `::text` sur les nouvelles valeurs d'enum dans les MVs créées la même session
