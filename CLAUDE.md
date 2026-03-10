# APEX RH — CLAUDE.md
> Fichier de contexte Claude Code — Mis à jour S136 (2026-03-10)
> Placer à la racine du projet : `C:\Users\DELL\APEX_RH\apex-rh\CLAUDE.md`

---

## 🏗️ IDENTITÉ DU PROJET

| Clé | Valeur |
|-----|--------|
| Nom | APEX RH — Plateforme de Gestion de la Performance |
| URL prod | https://apex-rh-h372.vercel.app |
| Supabase | ptpxoczdycajphrshdnk |
| Stack | React 18 + Vite + TailwindCSS + CSS Variables + Supabase + Vercel |
| Projet local | `C:\Users\DELL\APEX_RH\apex-rh` |
| Sessions complétées | S1 → S135 |
| Session courante | S136 |
| Taille | ~117 000 lignes · 81 pages · 200+ composants · 70+ hooks · 53+ migrations SQL · 15 Edge Functions |

---

## 🚫 RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE

Ces règles s'appliquent à CHAQUE fichier créé ou modifié, sans exception.

### Fichiers
- **Max 400 lignes par fichier** — découpe obligatoire si dépassement
- **Pas de `console.log`** en production — jamais
- **`npm run build`** avant tout `git push` — obligatoire

### Supabase / Base de données
- **`organization_id`** sur TOUTES les requêtes Supabase
- **Table `users`** — jamais `profiles`
- **Enum `user_role`** — valeurs MINUSCULES uniquement :
  `administrateur` · `directeur` · `chef_division` · `chef_service` · `collaborateur`
  ⚠️ `RH` et `MANAGER` n'existent PAS dans l'enum PostgreSQL
- **`SET search_path = public`** dans toutes les nouvelles fonctions SQL — obligatoire
- **RLS activée** sur toutes les nouvelles tables

### RBAC
- **`usePermission()`** pour tous les guards `can()` — jamais de role check direct
- Pattern : `const { can } = usePermission()` puis `if (!can('create', 'tasks')) return null`

### UI / Design
- **`GLASS_STYLE`** depuis `src/utils/constants.js` → `var(--glass-bg)` — auto dark/light
- **`isLight`** déclaré dans CHAQUE composant — jamais au scope module
  ```js
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  ```
- **`GlaceBackground`** — toujours `<GlaceBackground isLight={isLight} />` — `return null` si light
- **Sidebar** — uniquement `src/components/layout/Sidebar.jsx` — toujours dark
- **`useSearchParams`** pour navigation par onglets

---

## 🔧 COMMANDES DE RÉFÉRENCE

```bash
# Build + deploy
npm run build
git add -A
git commit -m "feat(S136): description"
git push

# Déployer une Edge Function Supabase
supabase functions deploy agent-monitor-platform --no-verify-jwt

# Tester une Edge Function manuellement
curl -X POST https://ptpxoczdycajphrshdnk.supabase.co/functions/v1/FUNCTION_NAME \
  -H 'Authorization: Bearer [ANON_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{}'

# Vérifier les jobs pg_cron actifs
# (dans Supabase SQL Editor)
SELECT jobname, schedule, active FROM cron.job;

# Fix search_path universel (si "relation users does not exist")
# Voir section Infrastructure Supabase ci-dessous
```

---

## 🤖 MISSION COURANTE — AGENTS IA (S136→S141)

### Contexte
En S136, on implémente l'infrastructure de base pour les Agents IA dans APEX RH.
Le plan complet est dans : `APEX_RH_S136_Plan_Implementation_Agents_IA.docx`

### Les 8 agents (ordre de déploiement)
| ID | Nom | Niveau | Session |
|----|-----|--------|---------|
| A1 | APEX-Monitor-Platform | N1 — Observateur | S137 |
| A2 | APEX-Audit-RBAC | N1 — Observateur | S137 |
| A3 | APEX-Workflow-Inspector | N1/N2 | S138 |
| A7 | APEX-Notification-Engine | N3 réversible | S138 |
| A4 | APEX-Coach-Performance | N2 — Suggéreur | S139 |
| A5 | APEX-Task-Optimizer | N2 — Suggéreur | S139 |
| A6 | APEX-Recruitment-Screener | N2 — Suggéreur | S141 |
| A8 | APEX-Data-Hygiene | N3 — Soft delete | S141 |

### Règles agents IA — non négociables
- **Jamais** de `DELETE` hard par un agent — soft delete (`is_active=false`) uniquement
- **Jamais** de données nominatives envoyées au LLM — anonymisation obligatoire
- **Jamais** de droits admin complets pour le Service Account — RLS dédiée par agent
- **Circuit breaker** : `max_tokens_day` défini dans `agent_ia_configs` avant déploiement
- **Tout** est tracé dans `agent_ia_actions` — aucune exception
- Modèle LLM cible : `claude-sonnet-4-20250514`

### Phase 1 — S136 (EN COURS) — Checklist

- [ ] Migration `054_agent_ia_configs.sql` exécutée + `NOTIFY pgrst`
- [ ] Migration `055_agent_ia_actions.sql` exécutée + `NOTIFY pgrst`
- [ ] Service Account `ia-agent@apex-rh.internal` créé dans Supabase Auth (role: administrateur)
- [ ] JWT Service Account stocké dans Supabase Vault (clé: `ia_agent_service_jwt`)
- [ ] Variable `ANTHROPIC_API_KEY` configurée dans Supabase Edge Functions Secrets
- [ ] `src/hooks/useAgentIA.js` créé (< 150L)
- [ ] `src/pages/admin/AgentIAHub.jsx` skeleton créé (< 180L)
- [ ] Route `/admin/agents-ia` ajoutée dans `App.jsx`
- [ ] Entrée "Agents IA" ajoutée dans `Sidebar.jsx` (rôle: administrateur)
- [ ] `npm run build` sans erreur + `git push`

### Nouvelles tables SQL (Phase 1)

**`agent_ia_configs`** — configuration des agents
```sql
-- Migration : 054_agent_ia_configs.sql
-- SET search_path = public  ← OBLIGATOIRE
CREATE TABLE public.agent_ia_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name       text NOT NULL,        -- 'monitor_platform' | 'audit_rbac' | ...
  is_active        boolean DEFAULT false,
  level            text DEFAULT 'N1',    -- 'N1' | 'N2' | 'N3'
  schedule         text,                 -- ex: '0 * * * *'
  max_tokens_day   integer DEFAULT 5000,
  tokens_used_today integer DEFAULT 0,
  config           jsonb DEFAULT '{}',
  system_prompt    text,
  last_run_at      timestamptz,
  last_error       text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX ON agent_ia_configs(organization_id, agent_name);
ALTER TABLE agent_ia_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_configs_org ON agent_ia_configs
  USING (organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));
```

**`agent_ia_actions`** — journal immuable de toutes les actions
```sql
-- Migration : 055_agent_ia_actions.sql
CREATE TABLE public.agent_ia_actions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name       text NOT NULL,
  action_type      text NOT NULL,  -- 'read' | 'suggest' | 'execute' | 'notify'
  target_table     text,
  target_id        uuid,
  payload          jsonb DEFAULT '{}',
  result           jsonb DEFAULT '{}',
  status           text DEFAULT 'pending',
    -- 'pending'|'approved'|'executed'|'rejected'|'error'|'skipped'
  approved_by      uuid REFERENCES public.users(id),
  approved_at      timestamptz,
  llm_tokens_used  integer DEFAULT 0,
  execution_ms     integer,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX ON agent_ia_actions(organization_id, agent_name, created_at DESC);
CREATE INDEX ON agent_ia_actions(organization_id, status) WHERE status = 'pending';
ALTER TABLE agent_ia_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_actions_org ON agent_ia_actions
  USING (organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));
```

### Nouveau hook — `useAgentIA.js`
```js
// src/hooks/useAgentIA.js  (< 150L)
// Exports attendus :
export function useAgentConfigs()         // liste agents de l'org
export function useAgentActions(filters)  // journal actions
export function useToggleAgent()          // activer/désactiver
export function useApproveAgentAction()   // approuver suggestion N2
export function useRejectAgentAction()    // rejeter suggestion N2
export function useAgentStats()           // tokens, taux succès
```

### Nouveaux composants — Phase 1
```
src/pages/admin/AgentIAHub.jsx          (~180L) — route /admin/agents-ia
  onglets useSearchParams :
    ?tab=overview  → liste agents + statut
    ?tab=actions   → journal agent_ia_actions
    ?tab=config    → (Phase 3+)
```

### Appel Claude API depuis Edge Function (pattern)
```typescript
// supabase/functions/agent-xxx/index.ts
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,          // depuis agent_ia_configs.system_prompt
    messages: [{ role: "user", content: userMessage }],
  }),
});
const data = await response.json();
const text = data.content[0].text;
```

---

## 📦 ÉTAT DU PROJET (S135 — terminé)

### Dernières livraisons S135
- CSS Variables architecture (`index.css` 692L) — 20+ vars dark/light
- `constants.js` → `GLASS_STYLE` adaptatif dark/light
- Passe CSS globale — 47 modules uniformisés sans toucher au JSX
- Sidebar lisibilité +25% — toujours dark
- Header premium gradient
- StatCard theme-aware + value=0 gris muted
- ThemeToggle label = mode actuel
- **Scores** : Dark 10/10 · Light 9.5/10

### Modules et routes principales
| Module | Route | Fichier principal |
|--------|-------|-------------------|
| Dashboard DRH | `/dashboard` | pages/dashboard/Dashboard.jsx |
| Mon Travail | `/mon-travail` | pages/mon-travail/MonTravail.jsx |
| Mon Profil | `/mon-profil` | pages/mon-profil/MonProfil.jsx |
| Tâches | `/travail/taches` | pages/tasks/Tasks.jsx |
| Projets | `/travail/projets` | pages/projects/Projects.jsx |
| OKR | `/travail/objectifs` | pages/objectives/Objectives.jsx |
| Admin | `/admin/*` | pages/admin/* |

---

## 🔌 IMPORTS CRITIQUES

### Theme (dans chaque composant — obligatoire)
```js
import { useTheme } from '../../contexts/ThemeContext'
const { resolvedTheme } = useTheme()
const isLight = resolvedTheme === 'light'
```

### Auth & Permissions
```js
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
const { profile } = useAuth()           // profile.organization_id, profile.role
const { can } = usePermission()          // can('create', 'tasks')
```

### Tâches (barrel)
```js
import {
  useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask, useUpdateTaskStatus,
  useAllUsers, useUpdateAssignees,
  useTaskComments, useTaskActivity,
  useChecklistMutations, useCommentMutations,
  useTaskDependencies, useCreateDependency, useDeleteDependency,
  useTaskRecurrence, useCreateRecurrence, useUpdateRecurrence, useDeleteRecurrence,
  useTimeTracking, useLogTime, useDeleteTimeLog,
  useTeamWorkload, useGanttData, useTaskDashboard,
  useTaskTemplates, useCreateTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate,
  useTaskAutomationRules, useTaskAutomationLogs,
  useTaskActivityAnalytics, useTaskTags, useTaskAttachments,
} from '../../hooks/useTasks'

import {
  TASK_STATUS, TASK_PRIORITY, KANBAN_COLUMNS, STATUS_ORDER,
  SLA_HOURS, getSLAStatus,
  getStatusInfo, getPriorityInfo,
  formatDate, formatDateShort,
  isOverdue, isDueSoon, getChecklistProgress,
  getUserFullName, getUserInitials,
  canEditTask, canDeleteTask, canValidateTask,
  getAllowedStatuses, ACTION_LABELS,
} from '../../lib/taskHelpers'
```

### Design constants
```js
import { GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE } from '../../utils/constants'
// GLASS_STYLE = { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }
```

---

## 🗄️ TABLES SUPABASE PRINCIPALES

| Table | Notes |
|-------|-------|
| `users` | Jamais `profiles` |
| `organizations` | Multitenancy |
| `tasks` | 8 statuts : backlog·a_faire·en_cours·en_attente·en_revue·terminee·bloquee·annule |
| `task_assignees` · `task_time_tracking` | N-N + log temps |
| `task_dependencies` | Cycle guard CTE SQL (S132) |
| `task_automation_rules` · `task_automation_logs` | Automations pg_cron |
| `time_sheets` · `time_entries` | Timesheet |
| `leave_requests` · `leave_balances` | Congés |
| `permission_overrides` | Surcharges RBAC individuelles |
| `notifications` | In-app |
| `agent_ia_configs` | ← NOUVEAU Phase 1 |
| `agent_ia_actions` | ← NOUVEAU Phase 1 |

---

## 🎨 DESIGN SYSTEM — Glacé #7 (S134/S135)

### CSS Variables (index.css)
```css
:root, [data-theme="dark"] {
  --page-bg:          #0F172A;
  --glass-bg:         rgba(255,255,255,0.03);
  --glass-border:     rgba(255,255,255,0.06);
  --text-primary:     rgba(255,255,255,1.0);
  --text-secondary:   rgba(255,255,255,0.72);
  --text-tertiary:    rgba(255,255,255,0.55);
  --text-muted:       rgba(255,255,255,0.40);
}
[data-theme="light"] {
  --page-bg:          #F6F9FC;
  --glass-bg:         #FFFFFF;
  --glass-border:     #E8ECF2;
  --text-primary:     #1A1F36;
  --text-secondary:   rgba(26,31,54,0.65);
}
[data-theme="light"] aside { /* Sidebar TOUJOURS dark */
  --text-primary: rgba(255,255,255,1.0);
}
```

### Pattern composant theme-aware
```jsx
import { useTheme } from '../../contexts/ThemeContext'

export default function MonComposant() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'   // ← DANS le composant, jamais dehors

  return (
    <>
      <GlaceBackground isLight={isLight} />
      <div style={isLight
        ? { background: '#fff', border: '1px solid #E6EBF1' }
        : { ...GLASS_STYLE }
      }>
        ...
      </div>
    </>
  )
}
```

---

## ⚠️ INFRASTRUCTURE SUPABASE — ALERTE S133

Si "relation users does not exist" réapparaît — fix universel :
```sql
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc ILIKE '%FROM users%'
      AND p.prosrc NOT ILIKE '%FROM public.users%'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      r.proname, r.args
    );
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
```

---

## 🔄 PATTERN REACT QUERY (standard projet)

```js
// Hook de lecture
export function useMyData(filters) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my_data', profile?.organization_id, filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('organization_id', profile.organization_id)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
  })
}

// Hook de mutation
export function useUpdateMyData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }) => {
      const { data, error } = await supabase
        .from('my_table').update(fields).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my_data'] }),
  })
}
```

---

## 📋 BACKLOG TECHNIQUE PRIORITAIRE

### Refactoring fichiers > 400L (à ne pas aggraver)
| Fichier | Lignes | Priorité |
|---------|--------|----------|
| `hooks/useTemps.js` | ~1134L | P1 — à découper en 4 hooks |
| `pages/admin/ApiManager.jsx` | ~1104L | P2 |
| `hooks/useRecruitment.js` | ~1077L | P3 |
| `hooks/useCompensation.js` | ~1046L | P4 |

### Automations pg_cron en attente
- Activer `run_task_overdue_automations()` — planification manquante
- Activer `run_task_review_timeout_automations()` — planification manquante

---

## 🧪 TESTS T01→T22 — CAMPAGNE S136 (Mission 2)

À exécuter avec le compte **Amadou Diallo (Administrateur)** sur https://apex-rh-h372.vercel.app

### Priorités
| Priorité | Test | Zone | Risque |
|----------|------|------|--------|
| 1 | T06 | Workflow validation (transitions statuts) | Critique |
| 2 | T21 | RBAC (canEdit/canDelete/canValidate) | Critique |
| 3 | T13 | Dépendances + cycle guard SQL | Critique |
| 4 | T19 | Automations (trigger SQL + pg_cron) | Critique |
| 5 | T15 | SLA (getSLAStatus calculs temporels) | Élevé |

### Format rapport anomalie
```
ID: T06-07
Observé: statut ne passe pas à "terminee" — erreur 422 console
Priorité: P1
Reproduction: tâche ID xxxx, rôle chef_service, statut en_revue
```

---

## 🗺️ SESSIONS À VENIR

| Session | Mission | Livraison |
|---------|---------|-----------|
| **S136** | Infrastructure IA + Tests T01→T22 | Tables SQL · Service Account · Dashboard skeleton |
| **S137** | Agents A1 + A2 (N1) | Edge Functions · pg_cron · Feed actions |
| **S138** | Agents A3 + A7 (N1/N2/N3) | Workflow Inspector · Notification Engine · UI approbation |
| **S139** | Agents A4 + A5 (N2) | Coach Performance · Task Optimizer · Panel manager |
| **S141** | Agents A6 + A8 + Dashboard full | Recrutement · Hygiène · Bilan ROI |

---

*CLAUDE.md généré en session S136 — 10 mars 2026*
*Mettre à jour à chaque fin de session avec les livraisons réalisées*
