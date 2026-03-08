# SESSION_START — S73
> Formation — Budget + obligatoire + évaluation
> Date cible : prochaine session | Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE CHAQUE SESSION

**À la fin de chaque session, Claude DOIT obligatoirement :**

1. Mettre à jour `src/docs/MEMOIRE_PROJET_S73.md` (nouvelle version numérotée)
2. Mettre à jour `src/docs/ROADMAP_S73.md` (session complétée + prochaine marquée)
3. Créer `src/docs/SESSION_START_S74.md` (brief complet de la prochaine session)
4. **Livrer un ZIP du dossier `src` COMPLET** — pas seulement les fichiers modifiés
5. **Fournir la commande Git prête à copier-coller** pour déployer sur Vercel

**Commande ZIP (toujours la même) :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S73.zip src/
```

**Commande Git déploiement (toujours la même) :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S73): [description session]" && git push
```

---

## 📋 PROTOCOLE AUTO-REMPLISSAGE SESSION_START (pour Claude)

Au début de chaque nouvelle session, Claude doit :
1. Lire `MEMOIRE_PROJET_S72.md` → récupérer le contexte projet complet
2. Lire `ROADMAP_S72.md` → identifier la prochaine session planifiée
3. Lire `SESSION_START_S73.md` → charger le brief opérationnel
4. Annoncer : "Session S73 chargée — Formation — Livrables : [liste]"
5. Exécuter sans redemander ce qui est déjà documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/components/layout/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : AuthContext S69 (`canAdmin`, `canValidate`, `canManageTeam`, etc.)
- **Charts** : SVG natif uniquement — pas de recharts
- **Table users** : `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- **Sécurité Supabase** : Security Advisor à 0 erreurs / 1 warning résiduel pg_trgm (inévitable)

---

## Problème à résoudre en S73

Le module Formation (S57) existe mais est à **45%** :
- Catalogue de formations présent mais **pas de budget formation**
- **Pas de formations obligatoires** configurables par poste/rôle
- **Pas de suivi évaluation post-formation** (satisfaction, efficacité)
- Tableau de bord formation incomplet (taux complétion manquant)
- Pas d'alertes formations obligatoires non réalisées

---

## Livrables S73

### 1. Budget formation par organisation/département
- Budget global organisation + répartition par département/division
- Suivi consommation budget en temps réel
- Alertes dépassement de budget
- Export budget formation (CSV/XLSX)

### 2. Formations obligatoires configurables
- Configurer les formations obligatoires par rôle / service / poste
- Périodicité : annuelle, tous les 2 ans, unique (onboarding)
- Alertes automatiques : formations à renouveler, en retard
- Tableau de bord conformité (% collaborateurs à jour)

### 3. Évaluation post-formation
- Formulaire satisfaction (1-5 étoiles + commentaire)
- Évaluation efficacité à J+30 (compétences acquises)
- Score d'efficacité agrégé par formation
- Lien avec PDI (Plan de Développement Individuel)

### 4. Tableau de bord formation enrichi
- Taux de complétion global et par département
- Budget consommé vs alloué (barres SVG)
- Top formations par satisfaction
- Formations obligatoires non réalisées (alerte rouge)

### 5. Plan de formation annuel
- Créer/modifier le plan de formation annuel
- Budgétisation par session
- Validation workflow (manager → RH)

---

## Tables existantes à utiliser (S57)

```
training_catalog    — catalogue formations (title, category, duration_hours, cost)
training_enrollments — inscriptions (user_id, training_id, status, completed_at)
certifications      — certifications obtenues
training_plans      — plans de formation
training_plan_items — éléments du plan
```

## Colonnes à ajouter si nécessaire

```
training_catalog    — ajouter : is_mandatory BOOLEAN, mandatory_roles TEXT[], renewal_months INT, budget_cost NUMERIC
training_enrollments — ajouter : satisfaction_score SMALLINT, satisfaction_comment TEXT, effectiveness_score SMALLINT, effectiveness_at TIMESTAMPTZ
training_plans      — ajouter : budget_allocated NUMERIC, budget_consumed NUMERIC, approved_by UUID, approved_at TIMESTAMPTZ
```

## Nouvelles tables si nécessaire

```
training_budget     — budget formation par org/division/année
training_mandatory_rules — règles formations obligatoires par rôle/service
```

---

## Règles d'or S73

**Code :**
- ✅ Helpers S69 : `canAdmin`, `canValidate` pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Sidebar : `src/components/layout/Sidebar.jsx` UNIQUEMENT

**Livraison (OBLIGATOIRE en fin de session) :**
- ✅ ZIP du dossier `src/` COMPLET → `src_S73.zip`
- ✅ `MEMOIRE_PROJET_S73.md` mis à jour
- ✅ `ROADMAP_S73.md` mis à jour
- ✅ `SESSION_START_S74.md` créé et prêt
