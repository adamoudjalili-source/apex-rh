# SESSION_START — S74
> Compensation — Workflow révision salariale
> Date cible : prochaine session | Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE CHAQUE SESSION

**À la fin de chaque session, Claude DOIT obligatoirement :**

1. Mettre à jour `src/docs/MEMOIRE_PROJET_S74.md` (nouvelle version numérotée)
2. Mettre à jour `src/docs/ROADMAP_S74.md` (session complétée + prochaine marquée)
3. Créer `src/docs/SESSION_START_S75.md` (brief complet de la prochaine session)
4. **Livrer un ZIP du dossier `src` COMPLET** — pas seulement les fichiers modifiés
5. **Fournir la commande Git prête à copier-coller** pour déployer sur Vercel

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S74.zip src/
```

**Commande Git déploiement :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S74): Compensation — Workflow révision salariale" && git push
```

---

## 📋 PROTOCOLE AUTO-REMPLISSAGE SESSION_START (pour Claude)

1. Lire `MEMOIRE_PROJET_S73.md` → récupérer le contexte projet complet
2. Lire `ROADMAP_S73.md` → identifier la prochaine session planifiée
3. Lire `SESSION_START_S74.md` → charger le brief opérationnel
4. Annoncer : "Session S74 chargée — Compensation — Livrables : [liste]"
5. Exécuter sans redemander ce qui est déjà documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/components/layout/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : AuthContext S69 (`canAdmin`, `canValidate`, `canManageTeam`, etc.)
- **Charts** : SVG natif uniquement — pas de recharts
- **Table users** : `users` (pas `profiles`) · `organization_id` (pas `org_id`)

---

## Problème à résoudre en S74

Le module Compensation (S58) existe mais est à **50%** :
- Grilles salariales et historiques présents
- **Pas de workflow révision salariale** (demande → validation manager → validation RH → application)
- **Pas de cycle de révision annuelle** avec planification et suivi d'avancement
- **Pas de simulation d'impact budget** avant validation
- Dashboard compensation incomplet (pas de suivi des révisions en cours)

---

## Livrables S74

### 1. Workflow révision salariale
- Demande de révision : initiée par manager ou RH
- Validation 2 niveaux : manager → RH/admin
- Motifs : augmentation annuelle, promotion, ajustement marché, prime exceptionnelle
- Commentaires et historique à chaque étape
- Notifications automatiques (email/push)

### 2. Cycle de révision annuelle
- Créer un cycle de révision (nom, période, date limite)
- Assigner des collaborateurs à réviser au manager
- Suivi d'avancement global (% soumis / % validés)
- Clôture du cycle avec application en masse

### 3. Simulation d'impact budget
- Calcul en temps réel de l'impact masse salariale
- Comparaison avec budget alloué
- Vue d'ensemble : augmentation moyenne %, total FCFA engagé
- Alerte si dépassement de budget

### 4. Dashboard révisions enrichi
- Révisions en cours / à valider / appliquées
- Évolution masse salariale (barres SVG)
- Distribution augmentations par tranche
- Top services par budget révision

---

## Tables existantes à utiliser (S58)

```
compensation_records  — historique salaires (is_current, effective_date, salary_amount, currency)
compensation_reviews  — révisions (increase_amount GENERATED, increase_pct GENERATED)
salary_grades         — grilles salariales
salary_benchmarks     — benchmarks marché
bonus_records         — primes
```

## Colonnes à ajouter si nécessaire

```
compensation_reviews — ajouter : status TEXT (brouillon/soumis/valide_manager/valide_rh/applique/refuse), 
                                  submitted_at, manager_approved_by, manager_approved_at, 
                                  hr_approved_by, hr_approved_at, applied_at, refused_reason,
                                  review_cycle_id UUID
```

## Nouvelles tables si nécessaire

```
compensation_cycles   — cycles de révision annuelle (name, year, start_date, end_date, status)
```

---

## Règles d'or S74

- ✅ Helpers S69 : `canAdmin`, `canValidate` pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `compensation_reviews.increase_amount` et `increase_pct` sont GENERATED — ne pas insérer
- ✅ `compensation_records.is_current` (pas `current`)
- ✅ Sidebar : `src/components/layout/Sidebar.jsx` UNIQUEMENT
