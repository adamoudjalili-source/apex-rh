# ROADMAP.md — APEX RH
> Mis à jour : Session 75 ✅ — Onboarding — Parcours progressif automatisé — DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **Commande Git prête à copier-coller**

---

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S74 | (voir MEMOIRE_PROJET_S75.md) | ✅ Production |
| **S75** | **Onboarding — Parcours progressif automatisé** | ✅ **DÉPLOYÉ** |

---

## Session 75 — Livrables ✅

- `s75_onboarding_parcours.sql` — 3 enums, 4 tables (templates, steps, assignments, completions), MV `mv_onboarding_progress`, fonction refresh, RLS, index
- `useOnboarding.js` — 15 hooks S75 appended
- `OnboardingTemplateManager.jsx` — CRUD templates + étapes, modales, expand/collapse
- `MyOnboardingJourney.jsx` — timeline visuelle, marquage étapes, modale complétion avec commentaire
- `TeamOnboardingDashboard.jsx` — KPIs, alertes retard, filtres, cartes collaborateurs
- `OnboardingAdminDashboard.jsx` — stats donuts SVG, assignation modale, liste search
- `pages/onboarding/Onboarding.jsx` — hub 4 onglets : Mon parcours / Mon équipe(S75) / Templates(S75) / Administration(S75)
- `App.jsx` — route `/onboarding` lazy
- `Sidebar.jsx` — MapPin import + NavItem dans les 3 vues (admin, manager, collaborateur)

---

## Roadmap S76–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S76** | **Performance PULSE — Alertes proactives + calibration** | 🟠 Moyenne | 🎯 **Prochaine** |
| S77 | Tâches — Dépendances + récurrence + charge | 🟠 Moyenne | ⏳ Planifiée |
| S78 | OKR — Cycle complet + check-ins + lien évaluation | 🟠 Moyenne | ⏳ Planifiée |
| S79 | Projets — Connexions + budget + Gantt avancé | 🟠 Moyenne | ⏳ Planifiée |
| S80 | Entretiens Annuels — Mi-année + auto-éval + suivi | 🟠 Moyenne | ⏳ Planifiée |
| S81 | Feedback 360° — Cycles planifiés + tendances | 🟡 Basse | ⏳ Planifiée |
| S82 | Intelligence RH — Bilan social + turnover | 🟠 Moyenne | ⏳ Planifiée |
| S83 | Succession & Talents — Vivier + gap analysis | 🟡 Basse | ⏳ Planifiée |
| S84 | Référentiel Compétences — Cartographie + gaps | 🟠 Moyenne | ⏳ Planifiée |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
