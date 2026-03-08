# SESSION_START — S81
> Feedback 360° — Cycles planifiés + tendances
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S81.md` mis à jour
2. `src/docs/ROADMAP_S81.md` mis à jour
3. `src/docs/SESSION_START_S82.md` créé
4. **ZIP `src_S81.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S81.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S81): Feedback 360° — Cycles planifiés + tendances" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S80.md` → contexte complet
2. Lire `ROADMAP_S80.md` → session suivante confirmée
3. Lire `SESSION_START_S81.md` → brief opérationnel
4. Annoncer : "Session S81 chargée — Feedback 360° — Cycles + tendances — Livrables : [liste]"
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

Le feedback 360° existant est ponctuel et non structuré. Il manque :
- **Cycles planifiés** : campagnes 360° avec dates, périmètre, participants
- **Questionnaires structurés** : templates par compétences, échelles de notation
- **Anonymat contrôlé** : réponses anonymes sauf pour l'évalué et l'admin
- **Tendances** : évolution des scores 360° dans le temps, comparaison pairs/managers
- **Lien entretien** : synthèse 360° disponible dans le dossier de l'entretien annuel

---

## Livrables S81

### SQL (`src/sql/s81_feedback360_advanced.sql`)
- Table `feedback360_cycles` (organization_id, title, start_date, end_date, status, template_id, scope)
- Table `feedback360_requests` (cycle_id, evaluatee_id, evaluator_id, status, answers jsonb, submitted_at, is_anonymous)
- Table `feedback360_templates` (organization_id, name, competences jsonb — [{key, label, questions:[{key,label,type}]}])
- MV `mv_feedback360_trends` — score moyen par compétence par utilisateur par cycle
- RPC `get_feedback360_summary(evaluatee_id, cycle_id)` — synthèse scores + tendances
- RLS + index

### Hooks (`src/hooks/useFeedback360.js` — nouveau fichier S81)
- `useFeedback360Cycles()` — tous les cycles de l'org
- `useActiveFeedback360Cycle()` — cycle actif
- `useMyFeedback360Requests(cycleId)` — mes demandes d'évaluation reçues
- `useMyFeedback360ToComplete(cycleId)` — évaluations à compléter
- `useSubmitFeedback360()` — soumettre une évaluation
- `useFeedback360Summary(evaluateeId, cycleId)` — synthèse scores
- `useFeedback360Trends(userId)` — tendances historiques

### Composants (`src/components/feedback360/`)
- `Feedback360Form.jsx` — formulaire évaluation par compétences (notation + commentaires)
- `Feedback360Summary.jsx` — synthèse : radar SVG, scores par compétence, verbatims anonymisés
- `Feedback360Trends.jsx` — courbes SVG tendances dans le temps
- `Feedback360CycleAdmin.jsx` — création cycle, sélection participants, suivi taux réponse

### Intégration
- `src/pages/entretiens/EntretiensAnnuels.jsx` — onglet Feedback 360° (accessible managers/admins)
- `AnnualReviewForm.jsx` — synthèse 360° dans le dossier d'entretien si cycle actif

---

## Règles d'or S81

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur la MV mv_feedback360_trends
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ `review_self_assessments` et `review_development_plans` créées en S80 — ne pas recréer
