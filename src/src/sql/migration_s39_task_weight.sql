-- ============================================================
-- APEX RH — Session 39 — Pondération Tâches
-- Ajoute 4 critères de pondération sur les tâches
-- Recalcul PULSE Delivery pondéré
-- ============================================================

-- 1. Colonnes de pondération (4 critères × 1–5)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS weight_complexity integer DEFAULT 1
    CHECK (weight_complexity BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS weight_impact     integer DEFAULT 1
    CHECK (weight_impact BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS weight_urgency    integer DEFAULT 1
    CHECK (weight_urgency BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS weight_strategic  integer DEFAULT 1
    CHECK (weight_strategic BETWEEN 1 AND 5);

-- 2. Vue helper : score de pondération calculé (0–100)
CREATE OR REPLACE VIEW v_task_weight_scores AS
SELECT
  id,
  title,
  status,
  service_id,
  created_by,
  -- Score pondéré normalisé 0–100
  ROUND(
    (
      COALESCE(weight_complexity, 1) +
      COALESCE(weight_impact,     1) +
      COALESCE(weight_urgency,    1) +
      COALESCE(weight_strategic,  1)
    )::numeric / 20.0 * 100
  ) AS weight_score_100,
  -- Score brut 4–20
  (
    COALESCE(weight_complexity, 1) +
    COALESCE(weight_impact,     1) +
    COALESCE(weight_urgency,    1) +
    COALESCE(weight_strategic,  1)
  ) AS weight_score_raw,
  weight_complexity,
  weight_impact,
  weight_urgency,
  weight_strategic,
  created_at
FROM tasks
WHERE is_archived = false;

-- 3. Vue PULSE Delivery pondéré (pour reporting futur)
-- Score Delivery = somme poids tâches terminées / somme poids total tâches actives
CREATE OR REPLACE VIEW v_pulse_weighted_delivery AS
SELECT
  u.id AS user_id,
  u.first_name,
  u.last_name,
  u.service_id,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'terminee') AS tasks_completed,
  COUNT(DISTINCT t.id) AS tasks_total,
  -- Somme des poids des tâches terminées
  COALESCE(SUM(
    CASE WHEN t.status = 'terminee' THEN
      (COALESCE(t.weight_complexity,1)+COALESCE(t.weight_impact,1)+COALESCE(t.weight_urgency,1)+COALESCE(t.weight_strategic,1))
    ELSE 0 END
  ), 0) AS weighted_completed,
  -- Somme totale des poids
  COALESCE(SUM(
    COALESCE(t.weight_complexity,1)+COALESCE(t.weight_impact,1)+COALESCE(t.weight_urgency,1)+COALESCE(t.weight_strategic,1)
  ), 0) AS weighted_total,
  -- Score Delivery pondéré 0–100
  CASE
    WHEN SUM(COALESCE(t.weight_complexity,1)+COALESCE(t.weight_impact,1)+COALESCE(t.weight_urgency,1)+COALESCE(t.weight_strategic,1)) > 0
    THEN ROUND(
      SUM(CASE WHEN t.status = 'terminee' THEN
        (COALESCE(t.weight_complexity,1)+COALESCE(t.weight_impact,1)+COALESCE(t.weight_urgency,1)+COALESCE(t.weight_strategic,1))
        ELSE 0 END
      )::numeric /
      SUM(COALESCE(t.weight_complexity,1)+COALESCE(t.weight_impact,1)+COALESCE(t.weight_urgency,1)+COALESCE(t.weight_strategic,1))::numeric * 100
    )
    ELSE 0
  END AS delivery_score_weighted
FROM users u
LEFT JOIN task_assignees ta ON ta.user_id = u.id
LEFT JOIN tasks t ON t.id = ta.task_id AND t.is_archived = false
GROUP BY u.id, u.first_name, u.last_name, u.service_id;

-- 4. Commentaires des colonnes
COMMENT ON COLUMN tasks.weight_complexity IS 'Complexité de la tâche — 1 (simple) à 5 (très complexe)';
COMMENT ON COLUMN tasks.weight_impact     IS 'Impact business — 1 (faible) à 5 (critique)';
COMMENT ON COLUMN tasks.weight_urgency    IS 'Urgence — 1 (peut attendre) à 5 (immédiat)';
COMMENT ON COLUMN tasks.weight_strategic  IS 'Alignement stratégique — 1 (accessoire) à 5 (priorité DG)';
