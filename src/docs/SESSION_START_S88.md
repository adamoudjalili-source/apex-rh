# SESSION_START — S88
> Intégration référentiel → Vivier S83 (auto-sync skills_gap)
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S88.md` mis à jour
2. `src/docs/ROADMAP_S88.md` mis à jour
3. `src/docs/SESSION_START_S89.md` créé
4. **ZIP `src_S88.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S88.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S88): Intégration référentiel → Vivier auto-sync skills_gap" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S87.md` → contexte complet
2. Lire `ROADMAP_S87.md` → session suivante confirmée
3. Lire `SESSION_START_S88.md` → brief opérationnel
4. Annoncer : "Session S88 chargée — Intégration référentiel → Vivier auto-sync — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam`, `canManageOrg` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · `organization_id` · liste via `useUsersList()` (useSettings.js)
- **⚠️ useCommunication.js** (S65) + **useCommunicationS87.js** (S87) existent → ne pas écraser

---

## Contexte modules concernés

### Référentiel de compétences (S84)
- `useCompetencyS84.js` — hooks framework compétences
- Tables : `competency_frameworks`, `competency_items`, `user_competency_assessments`
- Page : `src/pages/talent/CompetencyFrameworkPage.jsx`

### Vivier de succession (S83)
- `useSuccessionVivier.js` — hooks vivier talents
- Tables : `succession_pools`, `pool_members`, `vivier_skills_gap`
- Page : `src/pages/talent/SuccessionVivierPage.jsx`

---

## Problème à résoudre

Le module Compétences S84 évalue les collaborateurs sur un référentiel. Le Vivier S83 liste les talents mais le calcul du skills_gap est statique. Il manque :
- **Auto-sync** : quand une évaluation compétences S84 est mise à jour → recalcul automatique du skills_gap dans le vivier
- **Dashboard gap** : vue consolidée des écarts compétences par pool de talents
- **Recommandations IA** : suggestions de formation pour combler les gaps identifiés

---

## Livrables S88

### SQL (`src/sql/s88_vivier_skills_sync.sql`)
- Trigger `trig_sync_vivier_skills_gap` sur `user_competency_assessments` → appelle fonction de recalcul
- Fonction `sync_pool_member_skills_gap(p_user_id, p_org_id)` → met à jour `vivier_skills_gap`
- Vue `v_pool_skills_dashboard` (pool_id, skill_name, avg_gap, members_below_target)
- RLS + indexes

### Hooks (`src/hooks/useVivierSkillsS88.js`)
- `usePoolSkillsDashboard(poolId)` — dashboard gaps par pool
- `useUserSkillsGap(userId)` — gaps d'un membre spécifique
- `useTriggerSkillsSync(userId)` — mutation : forcer resync

### Composants
- `PoolSkillsGapChart.jsx` — graphe SVG natif des gaps compétences par pool
- `SkillsGapSummary.jsx` — résumé gaps pour un membre (dans SuccessionVivierPage)
- Modifier `SuccessionVivierPage.jsx` — intégrer PoolSkillsGapChart dans le dashboard

### Règles d'or S88
- ✅ Ne pas écraser `useCompetencyFramework.js` (S42) ni `useCompetencyS84.js` (S84)
- ✅ Ne pas écraser `useSuccessionVivier.js` (S83)
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ SVG natif (pas recharts) pour les graphes
- ✅ Vérifier tables competency + vivier existantes avant ALTER
