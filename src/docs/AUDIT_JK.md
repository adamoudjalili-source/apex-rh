# APEX RH — Audit J+K : Taille fichiers & Duplications UI (S112c)

## Résultat global

- 106 849 lignes de code total (pages 25%, components 48%, hooks 25%)
- 135 fichiers dépassent 300 lignes
- 12 fichiers dépassent 700 lignes (monstres)
- 19 StatCard/KpiCard locaux redéfinis dans des fichiers différents
- 99 occurrences du style glass-card inline dans 57 fichiers
- 6 constantes dupliquées entre hooks (3 corrigées, 3 légitimement différentes)

---

## AUDIT J — Top 12 fichiers critiques

| Lignes | Fichier | Action recommandée |
|--------|---------|-------------------|
| 2117 | pages/admin/Settings.jsx | Extraire 6 sections → SettingsProfile, SettingsSecurity, SettingsNotifications, SettingsAppearance, SettingsEntreprise, SettingsModules |
| 1302 | pages/pulse/ReviewCycles.jsx | Extraire SelfEvalForm.jsx, ManagerEvalForm.jsx, CycleCard.jsx, SynthesisModal.jsx |
| 1134 | hooks/useTemps.js | Découper → useTimeSheets.js + useTimeEntries.js + useClocking.js + useTimeStats.js |
| 1104 | pages/admin/ApiManager.jsx | Extraire CreateApiKeyModal.jsx, KeyRevealModal.jsx |
| 1077 | hooks/useRecruitment.js | Découper → useJobPostings.js + useApplications.js + useInterviews.js + useRecruitmentStats.js |
| 1046 | hooks/useCompensation.js | Découper → useSalaryGrades.js + useCompensationReviews.js + useBonuses.js |
| 1039 | hooks/useAnnualReviews.js | Découper → useReviewCampaigns.js + useReviewEvaluations.js |
| 1015 | pages/pulse/EngagementSurveys.jsx | Extraire SurveyCollaborateurView.jsx, SurveyManagerView.jsx, SurveyDashboard.jsx |
|  993 | hooks/useFormations.js | Découper → useTrainingCatalog.js + useEnrollments.js + useCertifications.js + useTrainingPlans.js |
|  972 | pages/employes/EmployesHub.jsx | Extraire AnnuairePanel, FichePanel, OrgchartPanel dans components/employes/ |
|  927 | pages/pulse/Feedback360.jsx | Extraire Feedback360Form.jsx, Feedback360CollaborateurView.jsx, Feedback360ManagerView.jsx |
|  843 | pages/intelligence/AnalyticsPredictifs.jsx | Extraire les 6 sous-composants dans components/analytics/ |

### Règle cible
Tout nouveau fichier : max 400 lignes.
Si un fichier existant dépasse 400 lignes lors d'une session → découpe obligatoire.

---

## AUDIT K — Duplications UI

### K1 — 19 StatCard/KpiCard locaux → 1 composant partagé

Problème : chaque page redéfinit sa propre version avec de légères variantes.
Solution : src/components/ui/StatCard.jsx créé (S112c) avec interface superset.

Interface du composant partagé :
  icon, label, value, sub, color, trend, prevVal, unit, loading, alert, onClick, animate

Fichiers migrés (S112c) :
  pages/objectives/Objectives.jsx      OK
  pages/projects/Projects.jsx          OK

Fichiers à migrer par session (17 restants) :
  components/offboarding/OffboardingStats.jsx
  components/recrutement/RecruitmentDashboard.jsx
  components/formation/TeamFormationDashboard.jsx
  components/okr/OKRDashboard.jsx
  pages/evaluations/EvaluationsHub.jsx
  pages/intelligence/TableauBordDRH.jsx
  pages/pulse/Analytics.jsx
  pages/cycle-rh/CycleRHHub.jsx
  pages/admin/ApiManager.jsx
  ... 8 autres

### K2 — Style glass-card inline (99 occurrences, 57 fichiers)

Avant (dupliqué partout) :
  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}

Recommandation : ajouter GLASS_STYLE dans constants.js, migrer fichier par fichier.

### K3 — Constantes dupliquées corrigées (S112c)

  OVERALL_RATING_LABELS/COLORS  : useAnnualReviews -> importé dans useReviewCycles
  READINESS_CONFIG               : useSuccessionPlanning -> importé dans useSuccessionVivier
  NOTE_TYPE_LABELS               : useCompetencyFramework -> importé dans useTransparency

### K4 — Modals confirm inline (3 fichiers) → composant Modal existant

  components/communication/AnnouncementCard.jsx:262
  components/formation/MyCertifications.jsx:283
  components/pulse/PulseAlertCenter.jsx:513

Utiliser src/components/ui/Modal.jsx (déjà existant).

---

## Plan de refactoring recommandé

Batch immédiat (S113) :
  - Ajouter GLASS_STYLE dans constants.js
  - Migrer les 3 modals confirm -> <Modal>
  - Migrer 5 StatCard simples -> composant partagé

Batch moyen terme (S114-S116) :
  - Découpe Settings.jsx (2117L) -> 6 fichiers
  - Découpe useTemps.js (1134L) -> 4 hooks
  - Extraire panels de EmployesHub.jsx

Batch long terme (S117+) :
  - Découpe hooks useRecruitment, useCompensation, useAnnualReviews
  - Extraire sous-composants Feedback360, EngagementSurveys, AnalyticsPredictifs
