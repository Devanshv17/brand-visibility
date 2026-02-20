-- ============================================================
-- Additional Views for Brand Visibility Hub Dashboard
-- Run this AFTER schema.sql has been applied.
-- ============================================================

-- 1. Prompt-level view: questions with latest snapshot results
CREATE OR REPLACE VIEW v_prompts AS
SELECT
  q.id,
  q.text,
  q.commerce_stage_primary AS journey_stage,
  q.priority,
  q.monthly_volume,
  q.metadata,
  p.name AS persona_name,
  cat.name AS category_name,
  conv.topic AS topic_name,
  -- Latest run snapshot data
  rts.answer_text,
  rts.answer_metadata,
  r.run_date AS last_tested,
  r.run_number
FROM questions q
LEFT JOIN question_persona_map qpm ON qpm.question_id = q.id
LEFT JOIN personas p ON p.id = qpm.persona_id
LEFT JOIN question_category_map qcm ON qcm.question_id = q.id
LEFT JOIN categories cat ON cat.id = qcm.category_id
LEFT JOIN conversation_turns ct ON ct.question_id = q.id
LEFT JOIN conversations conv ON conv.id = ct.conversation_id
LEFT JOIN run_turn_snapshots rts ON rts.conversation_turn_id = ct.id
LEFT JOIN runs r ON r.id = rts.run_id;

-- 2. Topics view: aggregate by conversation topic
CREATE OR REPLACE VIEW v_topics AS
SELECT
  conv.topic AS name,
  COUNT(DISTINCT q.id) AS prompt_count,
  COALESCE(AVG(q.monthly_volume), 0) AS avg_monthly_volume,
  array_agg(DISTINCT q.id) AS question_ids
FROM conversations conv
JOIN conversation_turns ct ON ct.conversation_id = conv.id
JOIN questions q ON q.id = ct.question_id
WHERE conv.topic IS NOT NULL
GROUP BY conv.topic;

-- 3. Competitors view: products mentioned (excluding our own brand)
CREATE OR REPLACE VIEW v_competitors AS
SELECT
  pr.brand AS name,
  COUNT(*) AS mentions,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS percentage
FROM snapshot_products sp
JOIN products pr ON pr.id = sp.product_id
JOIN run_turn_snapshots rts ON rts.id = sp.snapshot_id
JOIN runs r ON r.id = rts.run_id
JOIN audits a ON a.id = r.audit_id
JOIN companies c ON c.id = a.company_id
WHERE pr.brand IS NOT NULL
  AND pr.brand != c.name  -- exclude own brand
GROUP BY pr.brand
ORDER BY mentions DESC
LIMIT 10;

-- 4. Citation sources: count by surface type from snapshot metadata
CREATE OR REPLACE VIEW v_citation_sources AS
SELECT
  source_type AS name,
  COUNT(*) AS mentions,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS percentage
FROM (
  SELECT
    CASE
      WHEN rts.answer_metadata->>'source_type' IS NOT NULL
        THEN rts.answer_metadata->>'source_type'
      ELSE 'Unknown'
    END AS source_type
  FROM run_turn_snapshots rts
) sources
GROUP BY source_type
ORDER BY mentions DESC;

-- 5. Personas list (simple table query, no view needed)
-- Frontend will query `personas` table directly.

-- 6. Dashboard rollup: overall metrics
CREATE OR REPLACE VIEW v_dashboard_rollup AS
SELECT
  (SELECT COUNT(*) FROM questions) AS total_prompts,
  (SELECT COUNT(DISTINCT conv.topic) FROM conversations conv WHERE conv.topic IS NOT NULL) AS total_topics,
  (SELECT COUNT(*) FROM personas) AS total_personas,
  (SELECT COUNT(DISTINCT r.id) FROM runs r) AS total_runs;
