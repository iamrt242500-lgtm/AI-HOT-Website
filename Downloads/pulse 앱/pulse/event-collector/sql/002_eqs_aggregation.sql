-- EQS aggregation SQL (ClickHouse)
-- Purpose:
-- 1) Sessionize raw events with 30-min inactivity timeout
-- 2) Compute page-level metrics for EQS
-- 3) (Optional) populate a daily aggregate table via batch INSERT

CREATE TABLE IF NOT EXISTS page_eqs_daily
(
  event_date Date,
  site_id String,
  page_path String,

  page_views UInt64,
  sessions UInt64,
  active_attention_ms_avg Float64,
  scroll_readthrough_avg Float64,
  conversion_rate Float64,
  eqs Float64
)
ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (site_id, event_date, page_path);

-- Batch aggregation query template.
-- Replace {from} / {to} with concrete timestamps and adjust weights if needed.
INSERT INTO page_eqs_daily
WITH
  parseDateTime64BestEffort({from:String}, 3, 'UTC') AS from_ts,
  parseDateTime64BestEffort({to:String}, 3, 'UTC') AS to_ts,
  30 AS session_gap_minutes,
  5000 AS attention_heartbeat_ms,
  30000.0 AS attention_norm_ms,
  0.5 AS w1,
  0.3 AS w2,
  0.2 AS w3,
  '(bot|crawler|spider|headless|slurp|bingpreview|uptime|monitor)' AS bot_ua_pattern,

  filtered AS (
    SELECT
      toDate(event_ts) AS event_date,
      site_id,
      if(empty(JSONExtractString(properties_json, 'path')), '/', JSONExtractString(properties_json, 'path')) AS page_path,
      event_name,
      event_ts,
      user_id,
      user_agent
    FROM events_raw
    WHERE event_ts >= from_ts
      AND event_ts < to_ts
      AND NOT match(lowerUTF8(ifNull(user_agent, '')), bot_ua_pattern)
  ),

  marked AS (
    SELECT
      event_date,
      site_id,
      page_path,
      event_name,
      user_id,
      event_ts,
      if(
        lagInFrame(event_ts) OVER (PARTITION BY site_id, user_id ORDER BY event_ts) IS NULL
          OR dateDiff(
            'minute',
            lagInFrame(event_ts) OVER (PARTITION BY site_id, user_id ORDER BY event_ts),
            event_ts
          ) >= session_gap_minutes,
        1,
        0
      ) AS new_session
    FROM filtered
  ),

  sessionized AS (
    SELECT
      event_date,
      site_id,
      page_path,
      event_name,
      user_id,
      sum(new_session) OVER (
        PARTITION BY site_id, user_id
        ORDER BY event_ts
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS session_seq
    FROM marked
  ),

  rolled AS (
    SELECT
      event_date,
      site_id,
      page_path,
      countIf(event_name = 'page_view') AS page_views,
      countDistinctIf(tuple(site_id, user_id, session_seq), event_name = 'page_view') AS sessions,
      countIf(event_name = 'active_attention_ms') * attention_heartbeat_ms AS active_attention_ms_total,
      countIf(event_name IN ('scroll_depth_75', 'scroll_depth_100')) AS scroll_read_events,
      countIf(event_name = 'page_view') AS scroll_base_events,
      countIf(event_name IN ('form_submit', 'file_download', 'outbound_click')) AS micro_conversions
    FROM sessionized
    GROUP BY event_date, site_id, page_path
  )

SELECT
  event_date,
  site_id,
  page_path,
  page_views,
  sessions,
  if(page_views = 0, 0, active_attention_ms_total / page_views) AS active_attention_ms_avg,
  if(scroll_base_events = 0, 0, scroll_read_events / scroll_base_events) AS scroll_readthrough_avg,
  if(page_views = 0, 0, micro_conversions / page_views) AS conversion_rate,
  (
    (w1 * least(1.0, if(page_views = 0, 0, active_attention_ms_total / page_views) / attention_norm_ms)) +
    (w2 * if(scroll_base_events = 0, 0, scroll_read_events / scroll_base_events)) +
    (w3 * if(page_views = 0, 0, micro_conversions / page_views))
  ) * 100 AS eqs
FROM rolled;
