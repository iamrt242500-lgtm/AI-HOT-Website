-- Cohort snapshot query skeleton.
-- In production, cohort DSL is evaluated in service code after loading session-level metrics.

WITH session_metrics AS (
  SELECT
    site_id,
    session_id,
    countIf(event_name = 'page_view') AS visit_count,
    countIf(event_name = 'active_attention_ms') * 5000 AS active_attention_ms,
    countIf(event_name IN ('scroll_depth_75', 'scroll_depth_100')) AS scroll_read_events,
    countIf(event_name = 'page_view') AS scroll_base_events,
    countIf(event_name IN ('form_submit', 'file_download', 'outbound_click', 'purchase', 'subscription_start', 'donation')) AS conversions,
    groupUniqArray(event_name) AS events,
    groupUniqArrayIf(JSONExtractString(properties_json, 'utm_source'), JSONExtractString(properties_json, 'utm_source') != '') AS utm_sources
  FROM events_raw
  WHERE site_id = {site_id:String}
    AND event_ts >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
    AND event_ts < parseDateTime64BestEffort({to:String}, 3, 'UTC')
  GROUP BY site_id, session_id
)
SELECT *
FROM session_metrics
LIMIT 1000;
