# ROADMAP.md — APEX RH
> Mis à jour : Session 77 ✅ — Tâches — Dépendances + récurrence + charge — DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour** (nouvelles tables, règles d'or, nouveaux modules)
6. **Commande Git prête à copier-coller**
7. `README.md` **uniquement si** stack / installation / structure a changé

---

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S76 | (voir MEMOIRE_PROJET_S77.md) | ✅ Production |
| **S77** | **Tâches — Dépendances + récurrence + charge** | ✅ **DÉPLOYÉ** |

---

## Session 77 — Livrables ✅

- `s77_tasks_advanced.sql` — 2 enums (task_dependency_type, task_recurrence_frequency), 3 tables (task_dependencies, task_recurrences, task_time_tracking), colonnes estimated_minutes + workload_score sur tasks, MV mv_team_workload, 2 fonctions RPC (get_team_workload, get_gantt_tasks), RLS
- `useTasks.js` — 12 hooks S77 appended
- `TaskDependencyGraph.jsx` — graphe SVG dépendances, nœuds + flèches, ajout/suppression dépendances
- `RecurrenceConfig.jsx` — config récurrence complète, preview prochaines occurrences
- `TimeTrackingPanel.jsx` — log temps rapide, historique, barre progression vs estimé
- `WorkloadChart.jsx` — barre SVG charge par collaborateur, seuil surcharge, seuils couleur
- `GanttMini.jsx` — timeline Gantt 4 semaines SVG natif, navigation, filtres statut, tooltip hover
- `TaskDetailPanel.jsx` — +3 onglets : Dépendances / Récurrence / Temps
- `Tasks.jsx` — +2 vues : Gantt 📊 / Charge ⚖

---

## Roadmap S78–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S78** | **OKR — Cycle complet + check-ins + lien évaluation** | 🟠 Moyenne | 🎯 **Prochaine** |
| S79 | Projets — Connexions + budget + Gantt avancé | 🟠 Moyenne | ⏳ Planifiée |
| S80 | Entretiens Annuels — Mi-année + auto-éval + suivi | 🟠 Moyenne | ⏳ Planifiée |
| S81 | Feedback 360° — Cycles planifiés + tendances | 🟡 Basse | ⏳ Planifiée |
| S82 | Intelligence RH — Bilan social + turnover | 🟠 Moyenne | ⏳ Planifiée |
| S83 | Succession & Talents — Vivier + gap analysis | 🟡 Basse | ⏳ Planifiée |
| S84 | Référentiel Compétences — Cartographie + gaps | 🟠 Moyenne | ⏳ Planifiée |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
