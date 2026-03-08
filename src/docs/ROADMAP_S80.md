# ROADMAP.md — APEX RH
> Mis à jour : Session 80 ✅ — Entretiens Annuels — Mi-année + auto-éval + suivi — DÉPLOYÉ (08/03/2026)

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
| S1–S79 | (voir MEMOIRE_PROJET_S80.md) | ✅ Production |
| **S80** | **Entretiens — Mi-année + auto-éval + suivi managérial** | ✅ **DÉPLOYÉ** |

---

## Session 80 — Livrables ✅

- `s80_annual_reviews_advanced.sql` — enum review_type, colonne annual_reviews.review_type, tables review_self_assessments + review_development_plans, RPC get_review_completion_stats, RLS
- `useAnnualReviews.js` — 6 hooks S80 : useReviewSelfAssessment, useSubmitSelfAssessment, useReviewDevelopmentPlan, useUpsertDevelopmentPlan, useReviewCompletionStats, useMidYearReviews, useCreateMidYearReviews
- `ReviewSelfAssessmentForm.jsx` — formulaire 4 étapes (Bilan / Compétences étoiles / Objectifs N+1 / Développement), sauvegarde brouillon + soumission finale
- `ReviewDevelopmentPlan.jsx` — PDI : objectifs de développement par catégorie, actions checkbox, statut, commentaire manager
- `ReviewManagerDashboard.jsx` — tableau de bord suivi : 4 stats, barre progression, filtres, liste entretiens, historique campagnes
- `MidYearCampaignPanel.jsx` — panel mi-année : info, stats, liste, modal lancement multi-sélection équipe
- `EntretiensAnnuels.jsx` — +3 onglets : Auto-évaluation 👤 / Suivi 📊 / Mi-année 📅

---

## Roadmap S81–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S81** | **Feedback 360° — Cycles planifiés + tendances** | 🟡 Basse | 🎯 **Prochaine** |
| S82 | Intelligence RH — Bilan social + turnover | 🟠 Moyenne | ⏳ Planifiée |
| S83 | Succession & Talents — Vivier + gap analysis | 🟡 Basse | ⏳ Planifiée |
| S84 | Référentiel Compétences — Cartographie + gaps | 🟠 Moyenne | ⏳ Planifiée |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
