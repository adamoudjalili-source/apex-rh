# SESSION_START — S71
> Gestion des Temps — Règles heures sup + export paie
> Date cible : prochaine session | Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE CHAQUE SESSION

**À la fin de chaque session, Claude DOIT obligatoirement :**

1. Mettre à jour `src/docs/MEMOIRE_PROJET_SXX.md` (nouvelle version numérotée)
2. Mettre à jour `src/docs/ROADMAP_SXX.md` (session complétée + prochaine marquée)
3. Créer `src/docs/SESSION_START_SXX+1.md` (brief complet de la prochaine session, prêt à l'emploi)
4. **Livrer un ZIP du dossier `src` COMPLET** — pas seulement les fichiers modifiés

```
⚠️  Le ZIP doit contenir l'intégralité du dossier src/
⚠️  L'utilisateur remplace son dossier src/ local par ce ZIP
⚠️  Sans ZIP complet = session non livrée
```

**Commande de génération du ZIP (toujours la même) :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S71.zip src/
```

---

## 📋 PROTOCOLE AUTO-REMPLISSAGE SESSION_START (pour Claude)

Au début de chaque nouvelle session, Claude doit :
1. Lire `MEMOIRE_PROJET_S70.md` → récupérer le contexte projet complet
2. Lire `ROADMAP_S70.md` → identifier la prochaine session planifiée
3. Lire `SESSION_START_S71.md` → charger le brief opérationnel
4. Annoncer : "Session S71 chargée — Gestion des Temps — Livrables : [liste]"
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

## Problème à résoudre en S71

Le module Gestion des Temps (S66) existe mais est à **45%** :
- Feuilles de temps saisies mais **aucune règle sur les HS**
- **Pas de seuil configurable** (légal ou organisation)
- **Pas de taux de majoration** configurables
- **Pas d'export paie** des heures
- Workflow de validation sans logique HS

---

## Livrables S71

### 1. Moteur de règles heures supplémentaires
- Seuils configurables : journalier (>8h) et/ou hebdomadaire (>40h ou >48h)
- Tranches de majoration : 0-8h normal / 8-10h à +25% / >10h à +50% (configurables)
- Calcul automatique des HS à partir des time_entries validées

### 2. Interface récapitulatif hebdomadaire
- Vue semaine par semaine : heures normales / HS 25% / HS 50% / total
- Statut par semaine : En cours / Soumise / Validée / Refusée

### 3. Workflow validation HS
- Chef de service valide les HS de son équipe
- Notification automatique en cas de dépassement seuil
- Motif de refus possible

### 4. Alertes proactives
- Dépassement seuil HS hebdomadaire → alerte manager
- Feuille de temps non soumise après délai configurable
- Récapitulatif hebdo envoyé le lundi (intégration notification existante)

### 5. Export paie mensuel
- CSV/XLSX : heures normales + HS par tranche + collaborateur + service
- Compatible format S70 (même structure export paie)

---

## Tables à enrichir (pas de nouvelle table si possible)

```
time_settings  — ajouter : daily_threshold_hours, weekly_threshold_hours,
                            ot_rate_25_after, ot_rate_50_after,
                            submission_deadline_days, alert_enabled
time_sheets    — ajouter : overtime_hours, overtime_approved, overtime_approved_by
time_entries   — inchangé — déjà structuré
```

---

## Règles d'or S71

**Code :**
- ✅ Helpers S69 : `canAdmin`, `canValidate` pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Sidebar : `src/components/layout/Sidebar.jsx` UNIQUEMENT

**Livraison (OBLIGATOIRE en fin de session) :**
- ✅ ZIP du dossier `src/` COMPLET → `src_S71.zip`
- ✅ `MEMOIRE_PROJET_S71.md` mis à jour
- ✅ `ROADMAP_S71.md` mis à jour
- ✅ `SESSION_START_S72.md` créé et prêt

---

## Roadmap complète (rappel)

```
S70  ✅ — Congés — Moteur de règles
S71  ← ICI — Temps — Règles heures sup + export paie
S72  Recrutement — Pipeline structuré + scoring
S73  Formation — Budget + obligatoire + évaluation
S74  Compensation — Workflow révision salariale
S75  Onboarding — Parcours progressif automatisé
S76  Performance PULSE — Alertes proactives + calibration
S77  Tâches — Dépendances + récurrence + charge
S78  OKR — Cycle complet + check-ins + lien évaluation
S79  Projets — Connexions + budget + Gantt avancé
S80  Entretiens Annuels — Mi-année + auto-éval + suivi
S81  Feedback 360° — Cycles planifiés + continu
S82  Intelligence RH — Bilan social + turnover
S83  Succession & Talents — Vivier + gap analysis
S84  Référentiel Compétences — Cartographie + gaps
S85  Offboarding — Automatisation + solde auto
S86  Notifications — Moteur de règles + escalade
S87  Communication — Ciblage + accusés lecture
```
