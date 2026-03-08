# APEX RH

Plateforme RH interne développée pour **NITA**. Outil de gestion des ressources humaines couvrant l'ensemble du cycle de vie collaborateur : recrutement, onboarding, performance, formation, compensation, congés, temps, et plus.

> **Usage interne uniquement** — pas un SaaS commercialisé.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite |
| Style | TailwindCSS |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hébergement | Vercel |
| IA générative | Claude API via Supabase Edge Functions |

---

## Prérequis

- Node.js 18+
- npm 9+
- Accès au projet Supabase : `ptpxoczdycajphrshdnk`
- Accès au projet Vercel : `apex-rh-h372.vercel.app`

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <repo-url>
cd apex-rh

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

---

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://ptpxoczdycajphrshdnk.supabase.co
VITE_SUPABASE_ANON_KEY=<votre_clé_anon>
```

> Ne jamais committer le fichier `.env`. Il est dans `.gitignore`.

---

## Lancer en développement

```bash
npm run dev
```

L'application tourne sur `http://localhost:5173`

---

## Build de production

```bash
npm run build
```

Le dossier `dist/` est généré. Vercel le déploie automatiquement à chaque `git push`.

---

## Déploiement

Le déploiement est automatique via Vercel sur chaque push sur `main`.

Pour déployer manuellement une session :

```bash
git add -A
git commit -m "feat(SXX): description"
git push
```

URL de production : **https://apex-rh-h372.vercel.app**

---

## Structure du projet

```
apex-rh/
├── src/
│   ├── App.jsx                  # Routes principales
│   ├── Sidebar.jsx              # Navigation latérale (source unique)
│   ├── components/              # Composants réutilisables par module
│   │   ├── pulse/               # PULSE — performance quotidienne
│   │   ├── compensation/        # Révisions salariales
│   │   ├── formation/           # Formations et certifications
│   │   ├── onboarding/          # Parcours d'intégration
│   │   ├── recrutement/         # Pipeline recrutement
│   │   ├── conges/              # Gestion des congés
│   │   ├── temps/               # Gestion des temps et heures sup
│   │   └── ...
│   ├── pages/                   # Pages / modules principaux
│   │   ├── intelligence/        # Hub Intelligence RH (analytics, PULSE, etc.)
│   │   ├── dashboard/           # Tableau de bord
│   │   ├── onboarding/          # Module onboarding
│   │   └── ...
│   ├── hooks/                   # Hooks React Query (1 fichier par domaine)
│   ├── contexts/
│   │   └── AuthContext.jsx      # Auth + helpers de rôles
│   ├── lib/
│   │   ├── supabase.js          # Client Supabase
│   │   ├── roles.js             # Constantes et helpers de rôles
│   │   └── pulseHelpers.js      # Helpers calculs PULSE
│   └── sql/                     # Migrations SQL par session
├── supabase/
│   └── functions/               # Edge Functions (IA, notifications, webhooks)
├── public/
│   └── sw.js                    # Service Worker (PWA)
├── index.html
├── vite.config.js
└── package.json
```

---

## Base de données

Toutes les migrations sont dans `src/sql/`. Elles sont nommées par session :

```
migration_s52_multitenancy.sql
s74_compensation_workflow.sql
s75_onboarding_parcours.sql
s76_pulse_alertes.sql
...
```

Pour appliquer une migration : copier-coller le contenu dans l'éditeur SQL Supabase.

---

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `collaborateur` | Ses propres données uniquement |
| `chef_service` | + Son équipe directe |
| `chef_division` | + Sa division |
| `administrateur` | Accès complet |
| `directeur` | Lecture org-wide + tableaux de bord |

---

## Sessions de développement

Chaque session est documentée dans `src/docs/` :
- `MEMOIRE_PROJET_SXX.md` — état du projet, décisions, tables critiques
- `ROADMAP_SXX.md` — modules livrés et planifiés
- `SESSION_START_SXX.md` — brief de la session suivante

76 sessions réalisées à ce jour (Mars 2026).
