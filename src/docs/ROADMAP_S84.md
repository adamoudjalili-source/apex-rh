# ROADMAP.md — APEX RH
> Mis à jour : Session 84 ✅ — Référentiel Compétences — Cartographie + gaps — DÉPLOYÉ (08/03/2026)

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
| S1–S83 | (voir MEMOIRE_PROJET_S84.md) | ✅ Production |
| **S84** | **Référentiel Compétences — Cartographie + gaps** | ✅ **DÉPLOYÉ** |

---

## Session 84 — Livrables ✅

- `s84_competency_framework.sql` — tables competency_categories + competencies + role_competency_requirements + user_competency_assessments, MV mv_competency_coverage, RPC get_competency_gaps + refresh_competency_coverage_mv, RLS, indexes
- `useCompetencyS84.js` — 15 hooks (catalogue, catégories, exigences rôles, évaluations, gaps RPC, refresh MV)
- `CompetencyCatalog.jsx` — CRUD catalogue groupé par catégorie (adminOnly), descripteurs par niveau
- `CompetencyHeatmap.jsx` — heatmap SVG compétences × collaborateurs, filtre catégorie, tooltip
- `UserCompetencyProfile.jsx` — radar SVG individuel + tableau écarts vs rôle + formulaire évaluation
- `CompetencyFrameworkPage.jsx` — page 3 onglets (Catalogue / Heatmap / Profil individuel)
- `IntelligenceRH.jsx` — +onglet "Référentiel" groupe Talent (adminOnly)

---

## Roadmap S85–S88

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S85** | **Offboarding — Automatisation + solde auto** | 🟡 Basse | 🎯 **Prochaine** |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
| S88 | Intégration référentiel → Vivier S83 (auto-sync skills_gap) | 🟠 Moyenne | ⏳ Planifiée |
