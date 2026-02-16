-- Funnel query template: unique sessions + step conversion + final-step revenue
-- Replace placeholders:
-- {site_id}, {from}, {to}, {window_minutes}, {step_0}..{step_n}

WITH
  filtered AS (
    SELECT
      session_id,
      event_ts,
      event_name,
      if(empty(JSONExtractString(properties_json, 'path')), '/', JSONExtractString(properties_json, 'path')) AS page_path,
      ifNull(
        toFloat64(revenue_amount),
        if(
          event_name = 'refund',
          -abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
          if(
            event_name IN ('purchase', 'subscription_start', 'donation'),
            abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
            0.0
          )
        )
      ) AS revenue_delta
    FROM events_raw
    WHERE site_id = {site_id:String}
      AND event_ts >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
      AND event_ts < parseDateTime64BestEffort({to:String}, 3, 'UTC')
  ),
  step_0 AS (
    SELECT session_id, min(event_ts) AS s0_ts
    FROM filtered
    WHERE event_name = {step_0:String}
    GROUP BY session_id
  )
-- Add step_1..step_n CTEs as needed (same pattern as repository implementation).
SELECT * FROM step_0;

-- Paths query template: sampled top-N paths from start_event to end_event
SELECT
  session_id,
  event_ts,
  event_name,
  properties_json,
  ifNull(
    toFloat64(revenue_amount),
    if(
      event_name = 'refund',
      -abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
      if(
        event_name IN ('purchase', 'subscription_start', 'donation'),
        abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
        0.0
      )
    )
  ) AS revenue_delta
FROM events_raw
WHERE site_id = {site_id:String}
  AND event_ts >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
  AND event_ts < parseDateTime64BestEffort({to:String}, 3, 'UTC')
  AND cityHash64(session_id) % 1000000 < {sample_threshold:UInt64}
ORDER BY session_id ASC, event_ts ASC
LIMIT {event_fetch_limit:UInt32};
