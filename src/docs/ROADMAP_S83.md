# ROADMAP.md — APEX RH
> Mis à jour : Session 83 ✅ — Succession & Talents — Vivier + gap analysis — DÉPLOYÉ (08/03/2026)

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
| S1–S82 | (voir MEMOIRE_PROJET_S83.md) | ✅ Production |
| **S83** | **Succession & Talents — Vivier + gap analysis** | ✅ **DÉPLOYÉ** |

---

## Session 83 — Livrables ✅

- `s83_succession_vivier.sql` — tables talent_pool_entries + succession_gaps, MV mv_succession_coverage, RPC get_talent_gap_analysis + get_succession_coverage, RLS, indexes
- `useSuccessionVivier.js` — 7 hooks : useTalentPool, useAddToTalentPool, useRemoveFromTalentPool, useSuccessionGaps, useUpsertSuccessionGap, useTalentGapAnalysis, useSuccessionCoverage
- `TalentPoolBoard.jsx` — kanban 3 colonnes SVG avec modal d'ajout et cartes expandables
- `GapAnalysisChart.jsx` — radar SVG compétences (top 8) + histogramme priorité filtrable
- `SuccessionMap.jsx` — grille postes clés SVG avec couverture + panneau successeurs
- `SuccessionVivierPage.jsx` — page 3 onglets (Vivier / Cartographie / Gap Analysis)
- `IntelligenceRH.jsx` — +onglet "Vivier & Relève" groupe Talent (adminOnly)

---

## Roadmap S84–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S84** | **Référentiel Compétences — Cartographie + gaps** | 🟠 Moyenne | 🎯 **Prochaine** |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
