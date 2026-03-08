# SESSION_START — S72
> Recrutement — Pipeline structuré + scoring
> Date cible : prochaine session | Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE CHAQUE SESSION

**À la fin de chaque session, Claude DOIT obligatoirement :**

1. Mettre à jour `src/docs/MEMOIRE_PROJET_S72.md` (nouvelle version numérotée)
2. Mettre à jour `src/docs/ROADMAP_S72.md` (session complétée + prochaine marquée)
3. Créer `src/docs/SESSION_START_S73.md` (brief complet de la prochaine session)
4. **Livrer un ZIP du dossier `src` COMPLET** — pas seulement les fichiers modifiés

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S72.zip src/
```

---

## 📋 PROTOCOLE AUTO-REMPLISSAGE SESSION_START (pour Claude)

Au début de chaque nouvelle session, Claude doit :
1. Lire `MEMOIRE_PROJET_S71.md` → récupérer le contexte projet complet
2. Lire `ROADMAP_S71.md` → identifier la prochaine session planifiée
3. Lire `SESSION_START_S72.md` → charger le brief opérationnel
4. Annoncer : "Session S72 chargée — Recrutement — Livrables : [liste]"
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

## Problème à résoudre en S72

Le module Recrutement (S59–S63) existe mais est à **50%** :
- Candidatures reçues mais **pas de pipeline visuel** par offre
- **Pas de scoring candidat** structuré
- **Pas de suivi d'étapes configurables**
- Tableau de bord recrutement incomplet (time-to-hire manquant)
- Pas d'actions rapides depuis le pipeline

---

## Livrables S72

### 1. Pipeline Kanban par offre
- Colonnes configurables par type de poste
- Étapes standards : Candidature → Pré-sélection → Entretien RH → Entretien manager → Offre → Décision
- Drag-and-drop visuel pour déplacer les candidats (ou boutons si D&D complexe)
- Compteur de candidats par colonne

### 2. Scoring candidat automatique
- Score de matching basé sur compétences requises ↔ CV parsé
- Indicateur visuel : faible / moyen / fort / excellent
- Filtrage par score dans le pipeline

### 3. Tableau de bord recrutement enrichi
- Time-to-hire moyen par poste
- Taux de conversion par étape
- Sources des candidatures (job boards, interne, cooptation)
- Délai moyen par étape

### 4. Actions rapides depuis pipeline
- Planifier entretien directement depuis la carte candidat
- Envoyer notification de résultat
- Ajouter note / feedback
- Archiver / refuser avec motif

### 5. Filtres et recherche avancés
- Filtres : source, score, date candidature, statut, poste
- Recherche plein texte sur nom / compétences

---

## Tables existantes à utiliser (S59–S63)

```
job_postings        — offres d'emploi
job_applications    — candidatures (is_internal GENERATED)
interview_schedules — entretiens planifiés
interview_feedback  — overall_score SMALLINT
recruitment_stages  — étapes configurables
```

## Colonnes à ajouter si nécessaire (pas de nouvelle table si possible)

```
job_applications — ajouter : match_score NUMERIC(4,1), stage_order INT, pipeline_notes TEXT
recruitment_stages — ajouter : color TEXT, is_terminal BOOLEAN, auto_notify BOOLEAN
```

---

## Règles d'or S72

**Code :**
- ✅ Helpers S69 : `canAdmin`, `canValidate` pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Sidebar : `src/components/layout/Sidebar.jsx` UNIQUEMENT

**Livraison (OBLIGATOIRE en fin de session) :**
- ✅ ZIP du dossier `src/` COMPLET → `src_S72.zip`
- ✅ `MEMOIRE_PROJET_S72.md` mis à jour
- ✅ `ROADMAP_S72.md` mis à jour
- ✅ `SESSION_START_S73.md` créé et prêt

---

## Roadmap complète (rappel)

```
S70  ✅ — Congés — Moteur de règles
S71  ✅ — Temps — Règles heures sup + export paie
S72  ← ICI — Recrutement — Pipeline structuré + scoring
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
