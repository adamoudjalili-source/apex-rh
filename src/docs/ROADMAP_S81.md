# ROADMAP.md — APEX RH
> Mis à jour : Session 81 ✅ — Feedback 360° — Cycles planifiés + tendances — DÉPLOYÉ (08/03/2026)

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
| S1–S80 | (voir MEMOIRE_PROJET_S81.md) | ✅ Production |
| **S81** | **Feedback 360° — Cycles planifiés + tendances** | ✅ **DÉPLOYÉ** |

---

## Session 81 — Livrables ✅

- `s81_feedback360_advanced.sql` — tables feedback360_templates + feedback360_cycles + feedback360_requests, MV mv_feedback360_trends, RPC get_feedback360_summary, RLS
- `useFeedback360.js` — 14 hooks S81 appended : templates, cycles, requests, submit, draft, stats, summary (RPC), trends (MV), verbatims
- `Feedback360Form.jsx` — formulaire multi-étapes par compétences : notation étoiles + commentaires, brouillon, soumission finale
- `Feedback360Summary.jsx` — synthèse : radar SVG scores compétences, delta vs cycle précédent, verbatims anonymisés
- `Feedback360Trends.jsx` — courbes SVG tendances historiques, tableau multi-cycles, sélection compétences par toggle
- `Feedback360CycleAdmin.jsx` — admin : création cycle, lancement/clôture, stats taux réponse par donut SVG
- `EntretiensAnnuels.jsx` — +1 onglet "Feedback 360°" avec badge compteur évaluations à compléter

---

## Roadmap S82–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S82** | **Intelligence RH — Bilan social + turnover** | 🟠 Moyenne | 🎯 **Prochaine** |
| S83 | Succession & Talents — Vivier + gap analysis | 🟡 Basse | ⏳ Planifiée |
| S84 | Référentiel Compétences — Cartographie + gaps | 🟠 Moyenne | ⏳ Planifiée |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
