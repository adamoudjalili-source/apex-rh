# SESSION_START — S80
> Entretiens Annuels — Mi-année + auto-évaluation + suivi managérial
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S80.md` mis à jour
2. `src/docs/ROADMAP_S80.md` mis à jour
3. `src/docs/SESSION_START_S81.md` créé
4. **ZIP `src_S80.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S80.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S80): Entretiens Annuels — Mi-année + auto-éval + suivi" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S79.md` → contexte complet
2. Lire `ROADMAP_S79.md` → session suivante confirmée
3. Lire `SESSION_START_S80.md` → brief opérationnel
4. Annoncer : "Session S80 chargée — Entretiens Annuels — Mi-année + auto-éval — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam`, `canManageOrg` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · `organization_id` · liste via `useUsersList()` (useSettings.js)

---

## Problème à résoudre

Le module Entretiens Annuels (S60) est fonctionnel pour les entretiens classiques mais manque de :
- **Entretien mi-année** : campagne dédiée Q2, template spécifique, lien avec l'entretien annuel
- **Auto-évaluation** : formulaire collaborateur avant l'entretien manager
- **Suivi managérial** : tableau de bord manager : taux de complétion, retards, alertes
- **Plan de développement individuel (PDI)** : objectifs de développement issus de l'entretien, suivi à 6 mois

---

## Livrables S80

### SQL (`src/sql/s80_annual_reviews_advanced.sql`)
- Enum `review_type` : 'annual' | 'mid_year' | 'probation'
- Colonne `annual_reviews.review_type` (défaut 'annual')
- Table `review_self_assessments` — auto-éval collaborateur (review_id, user_id, answers jsonb, submitted_at)
- Table `review_development_plans` — PDI (review_id, user_id, goals jsonb, next_check_date, status)
- RPC `get_review_completion_stats(manager_id)` — taux complétion, en retard, par étape
- RLS + index

### Hooks (`src/hooks/useAnnualReviews.js` — appends S80)
- `useReviewSelfAssessment(reviewId)` — auto-éval d'un entretien
- `useSubmitSelfAssessment()` — soumettre auto-éval
- `useReviewDevelopmentPlan(reviewId)` — PDI lié à un entretien
- `useUpsertDevelopmentPlan()` — créer/MAJ PDI
- `useReviewCompletionStats(managerId)` — stats suivi manager (RPC)
- `useMidYearReviews()` — entretiens mi-année du cycle actif

### Composants (`src/components/reviews/`)
- `ReviewSelfAssessmentForm.jsx` — formulaire auto-éval avec sections et scores
- `ReviewDevelopmentPlan.jsx` — PDI : objectifs, actions, dates, statuts
- `ReviewManagerDashboard.jsx` — tableau de bord : taux complétion, liste retards, filtres équipe
- `MidYearCampaignPanel.jsx` — lancement campagne mi-année, templates, suivi

### Intégration
- `AnnualReviews.jsx` — +2 vues : Auto-éval / Tableau de bord manager
- `ReviewDetailModal.jsx` — +2 onglets : Auto-évaluation / PDI

---

## Règles d'or S80

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ RLS sur toutes les nouvelles tables
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ `project_advanced_milestones` ≠ `milestones` (deux tables distinctes depuis S79)
