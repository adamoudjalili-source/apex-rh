# SESSION_START — S83
> Succession & Talents — Vivier + gap analysis
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S83.md` mis à jour
2. `src/docs/ROADMAP_S83.md` mis à jour
3. `src/docs/SESSION_START_S84.md` créé
4. **ZIP `src_S83.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S83.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S83): Succession & Talents — Vivier + gap analysis" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S82.md` → contexte complet
2. Lire `ROADMAP_S82.md` → session suivante confirmée
3. Lire `SESSION_START_S83.md` → brief opérationnel
4. Annoncer : "Session S83 chargée — Succession & Talents — Vivier + gap analysis — Livrables : [liste]"
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

APEX RH dispose déjà de `succession_plans` et `talent_assessments` (S51/S55), mais manque :
- **Vivier de talents** : pool de candidats internes prêts à prendre un rôle clé
- **Gap analysis** : écart entre compétences requises et compétences actuelles
- **Cartographie visuelle** : qui peut remplacer qui, délai de préparation
- **Plans de développement ciblés** : actions pour combler les gaps identifiés

---

## Livrables S83

### SQL (`src/sql/s83_succession_vivier.sql`)
- Table `talent_pool_entries` (organization_id, user_id, target_role, readiness — 'ready_now'|'ready_1y'|'ready_2y', skills_gap jsonb, notes)
- Table `succession_gaps` (organization_id, position_id, required_skills jsonb, current_coverage_pct)
- MV `mv_succession_coverage` — couverture par poste clé
- RPC `get_talent_gap_analysis(p_org_id uuid)` → gaps par compétence
- RLS + indexes

### Hooks (`src/hooks/useSuccessionVivier.js` — nouveau fichier S83)
- `useTalentPool()` — vivier complet
- `useAddToTalentPool()` — ajouter un talent
- `useSuccessionGaps()` — gaps par poste
- `useTalentGapAnalysis()` — analyse gaps (RPC)
- `useSuccessionCoverage()` — couverture (MV)

### Composants (`src/components/talent/`)
- `TalentPoolBoard.jsx` — kanban 3 colonnes (ready_now / 1y / 2y) avec avatars
- `GapAnalysisChart.jsx` — radar SVG compétences requises vs actuelles
- `SuccessionMap.jsx` — arbre SVG organigramme succession (qui remplace qui)

### Intégration
- Onglet "Vivier S83" dans le hub Talent de IntelligenceRH.jsx
- Accessible chef_division + administrateur + directeur

---

## Règles d'or S83

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur toutes les nouvelles MVs
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ Ne pas recréer les tables S80/S81/S82 (review_*, feedback360_*, employee_departures)
- ✅ `succession_plans` et `talent_assessments` existent déjà (S51/S55) — ne pas recréer
