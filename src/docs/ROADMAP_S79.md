# ROADMAP.md — APEX RH
> Mis à jour : Session 79 ✅ — Projets — Connexions OKR + budget + Gantt avancé — DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête à copier-coller**
7. `README.md` **uniquement si** stack / structure a changé

---

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S78 | (voir MEMOIRE_PROJET_S79.md) | ✅ Production |
| **S79** | **Projets — Connexions OKR + budget + Gantt avancé** | ✅ **DÉPLOYÉ** |

---

## Session 79 — Livrables ✅

- `s79_projects_advanced.sql` — colonnes projects (budget_total, budget_spent, cycle_id), tables (project_okr_links, project_budget_lines, project_advanced_milestones), RPC (get_projects_gantt, get_project_budget_summary), RLS
- `useProjects.js` — 9 hooks S79 appended (useProjectOKRLinks, useLinkProjectToOKR, useUnlinkProjectOKR, useProjectBudget, useUpsertBudgetLine, useDeleteBudgetLine, useAdvancedMilestones, useCreate/Update/DeleteAdvancedMilestone, useProjectsGantt)
- `ProjectOKRLinker.jsx` — sélecteur OKR avec preview KRs et confiance, expand/collapse
- `ProjectBudgetPanel.jsx` — tableau budget : catégories, barres planifié/réel, variance, alerte dépassement
- `ProjectAdvancedMilestones.jsx` — jalons avancés, timeline SVG, lien KR optionnel, statut retard
- `ProjectGanttAdvanced.jsx` — Gantt 3 mois SVG natif multi-projets : tâches, jalons 💎, zoom ±, filtre statut
- `ProjectDetailPanel.jsx` — +3 onglets : OKR 🎯 / Budget 💰 / Jalons+ 💎
- `Projects.jsx` — +1 vue : Gantt avancé

---

## Roadmap S80–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S80** | **Entretiens Annuels — Mi-année + auto-éval + suivi** | 🟠 Moyenne | 🎯 **Prochaine** |
| S81 | Feedback 360° — Cycles planifiés + tendances | 🟡 Basse | ⏳ Planifiée |
| S82 | Intelligence RH — Bilan social + turnover | 🟠 Moyenne | ⏳ Planifiée |
| S83 | Succession & Talents — Vivier + gap analysis | 🟡 Basse | ⏳ Planifiée |
| S84 | Référentiel Compétences — Cartographie + gaps | 🟠 Moyenne | ⏳ Planifiée |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
