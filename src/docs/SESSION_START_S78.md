# SESSION_START — S78
> OKR — Cycle complet + check-ins + lien évaluation
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S78.md` mis à jour
2. `src/docs/ROADMAP_S78.md` mis à jour
3. `src/docs/SESSION_START_S79.md` créé
4. **ZIP `src_S78.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**
7. `README.md` uniquement si stack / structure a changé

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S78.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S78): OKR — Cycle complet + check-ins + lien évaluation" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S77.md` → contexte complet
2. Lire `ROADMAP_S77.md` → session suivante confirmée
3. Lire `SESSION_START_S78.md` → brief opérationnel
4. Annoncer : "Session S78 chargée — OKR — Cycle complet + check-ins — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · colonne `organization_id` · liste via `useUsersList()` (useSettings.js)

---

## Problème à résoudre

Le module OKR est fonctionnel (S50) mais manque de :
- **Cycle OKR** : périodes trimestrielles/semestrielles, clôture automatique, archivage
- **Check-ins** : réunions hebdomadaires de suivi, mise à jour du score de progression KR
- **Lien évaluation** : connecter les KR au score PULSE + à l'entretien annuel
- **Dashboard OKR** : vue cascade stratégique → division → service → individuel
- **Alignement** : lier un OKR enfant à un OKR parent (arbres d'objectifs)

---

## Livrables S78

### SQL (`src/sql/s78_okr_advanced.sql`)
- `okr_cycles` — périodes OKR (name, start_date, end_date, status, organization_id)
- `okr_checkins` — check-ins KR (key_result_id, user_id, progress_value, confidence, note, checked_at)
- Colonnes sur `objectives` : `cycle_id`, `parent_objective_id`, `alignment_score`
- Colonnes sur `key_results` : `confidence_level` (high/medium/low/at_risk)
- RLS + index

### Hooks (`src/hooks/useOKR.js` — appends S78)
- `useOKRCycles()` — liste cycles org
- `useCurrentCycle()` — cycle actif
- `useCreateCycle()` / `useUpdateCycle()` / `useCloseCycle()`
- `useOKRCheckins(keyResultId)` — check-ins d'un KR
- `useCreateCheckin()` — enregistrer un check-in
- `useObjectiveTree()` — objectifs avec enfants (cascade)
- `useOKRAlignmentScore()` — score alignement org

### Composants (`src/components/okr/`)
- `OKRCycleManager.jsx` — gestion cycles (admin) : liste, création, clôture
- `OKRCheckinForm.jsx` — formulaire check-in : progression %, confiance, note
- `OKRCheckinHistory.jsx` — historique check-ins d'un KR avec sparkline SVG
- `OKRCascadeView.jsx` — vue arborescente stratégique → individuel (SVG ou divs)
- `OKRDashboard.jsx` — tableau de bord : score global cycle, KR at-risk, tendances

### Intégration
- `OKRPage.jsx` — onglets : Vue Cycle / Cascade / Mes OKR / Dashboard
- Lien PULSE : afficher dans `DailyLog.jsx` le score OKR du jour

---

## Règles d'or S78

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ Cast `::text` sur nouvelles valeurs d'enum dans MVs créées la même session
- ✅ RLS sur toutes les nouvelles tables
- ✅ MVs avec REVOKE ALL (anon, authenticated)
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
