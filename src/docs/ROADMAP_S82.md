# ROADMAP.md — APEX RH
> Mis à jour : Session 82 ✅ — Intelligence RH — Bilan social + turnover — DÉPLOYÉ (08/03/2026)

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
| S1–S81 | (voir MEMOIRE_PROJET_S82.md) | ✅ Production |
| **S82** | **Intelligence RH — Bilan social + turnover** | ✅ **DÉPLOYÉ** |

---

## Session 82 — Livrables ✅

- `s82_hr_intelligence.sql` — table employee_departures, 3 MVs (headcount/turnover/absenteeism), RPC get_social_report, RLS
- `useHRIntelligence.js` — 8 hooks : effectifs, turnover, absentéisme, masse salariale, bilan social, départs
- `HeadcountChart.jsx` — barres SVG mensuelles + donut répartition rôles
- `TurnoverDashboard.jsx` — KPIs, donut motifs SVG, histogramme, modal ajout départ
- `AbsenteeismChart.jsx` — heatmap mensuelle SVG, barres, répartition par type
- `SalaryMassDashboard.jsx` — masse salariale, barres horizontales rôles, distribution
- `SocialReportExport.jsx` — bilan social structuré, export CSV, impression
- `HRIntelligencePage.jsx` — page 5 onglets bilan social
- `IntelligenceRH.jsx` — +onglet "Bilan Social" groupe Stratégie (adminOnly)

---

## Roadmap S83–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S83** | **Succession & Talents — Vivier + gap analysis** | 🟡 Basse | 🎯 **Prochaine** |
| S84 | Référentiel Compétences — Cartographie + gaps | 🟠 Moyenne | ⏳ Planifiée |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
