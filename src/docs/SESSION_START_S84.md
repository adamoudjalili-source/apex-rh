# SESSION_START — S84
> Référentiel Compétences — Cartographie + gaps
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S84.md` mis à jour
2. `src/docs/ROADMAP_S84.md` mis à jour
3. `src/docs/SESSION_START_S85.md` créé
4. **ZIP `src_S84.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S84.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S84): Référentiel Compétences — Cartographie + gaps" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S83.md` → contexte complet
2. Lire `ROADMAP_S83.md` → session suivante confirmée
3. Lire `SESSION_START_S84.md` → brief opérationnel
4. Annoncer : "Session S84 chargée — Référentiel Compétences — Cartographie + gaps — Livrables : [liste]"
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

APEX RH dispose du gap analysis (S83) et de feedback 360° (S81) qui référencent des compétences via jsonb libre. Il manque un référentiel centralisé :
- **Catalogue de compétences** : liste canonique avec catégories (techniques, comportementales, managériales)
- **Niveaux standardisés** : grille 1–5 avec descripteurs par niveau
- **Rattachement aux rôles** : quelles compétences sont requises pour chaque rôle/poste
- **Cartographie visuelle** : heatmap compétences × collaborateurs
- **Liens avec S83** : alimenter automatiquement `talent_pool_entries.skills_gap` depuis le référentiel

---

## Livrables S84

### SQL (`src/sql/s84_competency_framework.sql`)
- Table `competency_categories` (organization_id, name, color, icon, order_index)
- Table `competencies` (organization_id, category_id, name, description, levels jsonb — [{level, label, descriptor}])
- Table `role_competency_requirements` (organization_id, role_name OR position_id, competency_id, required_level, weight)
- Table `user_competency_assessments` (organization_id, user_id, competency_id, assessed_level, assessed_by, assessed_at, source — 'manager'|'self'|'360'|'import')
- MV `mv_competency_coverage` — score couverture par compétence × utilisateur
- RPC `get_competency_gaps(p_org_id, p_user_id?)` → gaps individuels ou org
- RLS + indexes

### Hooks (`src/hooks/useCompetencyFramework.js` — déjà existant depuis S?, à vérifier avant d'écraser)
- `useCompetencies()` — catalogue + catégories
- `useCreateCompetency()` — création
- `useRoleRequirements(roleName)` — requis pour un rôle
- `useUserAssessments(userId)` — évaluations individuelles
- `useUpsertAssessment()` — saisir/MAJ une évaluation
- `useCompetencyCoverage()` — heatmap MV

### Composants (`src/components/competency/`)
- `CompetencyCatalog.jsx` — liste groupée par catégorie, gestion CRUD (adminOnly)
- `CompetencyHeatmap.jsx` — heatmap SVG compétences × collaborateurs
- `UserCompetencyProfile.jsx` — profil radar SVG individuel + écarts vs rôle

### Intégration
- Onglet "Référentiel" dans groupe Talent de IntelligenceRH.jsx (adminOnly)
- Lien depuis SuccessionVivierPage : "Importer gaps depuis référentiel"

---

## Règles d'or S84

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur toutes les nouvelles MVs
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ Vérifier si `useCompetencyFramework.js` existe déjà avant d'en créer un nouveau
- ✅ Ne pas recréer les tables S80/S81/S82/S83
- ✅ `talent_pool_entries.skills_gap` jsonb reste format libre — le référentiel S84 peut l'alimenter mais ne le remplace pas
