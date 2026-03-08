# SESSION_START — S77
> Tâches — Dépendances + récurrence + charge de travail
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S77.md` mis à jour
2. `src/docs/ROADMAP_S77.md` mis à jour
3. `src/docs/SESSION_START_S78.md` créé
4. **ZIP `src_S77.zip` complet**
5. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S77.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S77): Tâches — Dépendances + récurrence + charge" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S76.md` → contexte complet
2. Lire `ROADMAP_S76.md` → session suivante confirmée
3. Lire `SESSION_START_S77.md` → brief opérationnel
4. Annoncer : "Session S77 chargée — Tâches — Dépendances + récurrence + charge — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · colonne `organization_id` · liste via `useUsersList()` (useSettings.js)

---

## Problème à résoudre

Le module Tâches est fonctionnel (S21–S30) mais manque de :
- **Dépendances** : lier des tâches entre elles (bloquante/bloquée), visualisation du graphe
- **Récurrence** : créer des tâches récurrentes (quotidien, hebdomadaire, mensuel, personnalisé)
- **Charge de travail** : estimation temps prévu vs temps réel, répartition charge par collaborateur
- **Vue Gantt simplifiée** : timeline tâches sur 4 semaines

---

## Livrables S77

### SQL (`src/sql/s77_tasks_advanced.sql`)
- `task_dependencies` — liaisons entre tâches (task_id, depends_on_id, type: blocks/related)
- `task_recurrences` — règles récurrence (task_id, frequency, interval, end_date, last_generated)
- `task_time_tracking` — temps réel (task_id, user_id, minutes_spent, logged_at, note)
- Colonnes sur `tasks` : `estimated_minutes`, `workload_score` (0-10)
- RLS sur toutes les tables

### Hooks (`src/hooks/useTasks.js` — appends S77)
- `useTaskDependencies(taskId)` — dépendances d'une tâche
- `useCreateDependency()` / `useDeleteDependency()`
- `useTaskRecurrence(taskId)` — règle récurrence
- `useCreateRecurrence()` / `useUpdateRecurrence()` / `useDeleteRecurrence()`
- `useTimeTracking(taskId)` — logs temps d'une tâche
- `useLogTime()` — enregistrer du temps
- `useTeamWorkload()` — charge par collaborateur (pour vue manager)
- `useGanttData(startDate, endDate)` — tâches avec dates pour Gantt

### Composants (`src/components/tasks/`)
- `TaskDependencyGraph.jsx` — graphe SVG dépendances (nœuds + flèches)
- `RecurrenceConfig.jsx` — formulaire configuration récurrence
- `TimeTrackingPanel.jsx` — log temps + historique
- `WorkloadChart.jsx` — barre SVG charge par user
- `GanttMini.jsx` — timeline 4 semaines tâches (SVG natif)

### Intégration
- `Tasks.jsx` — sidebar détail enrichie avec onglets : Détail / Dépendances / Temps / Récurrence
- Vue manager : onglet Charge d'équipe avec WorkloadChart

---

## Règles d'or S77

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ Cast `::text` sur nouvelles valeurs d'enum dans MVs créées la même session
- ✅ RLS sur toutes les nouvelles tables
- ✅ MVs avec REVOKE ALL (anon, authenticated)
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
