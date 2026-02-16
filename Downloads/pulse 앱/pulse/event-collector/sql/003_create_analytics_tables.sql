-- Analytics metadata tables for funnels/cohorts.

CREATE TABLE IF NOT EXISTS funnel_definitions
(
  funnel_id String,
  site_id String,
  name String,
  steps_json String,
  conversion_window_minutes UInt32,
  created_at DateTime64(3, 'UTC'),
  updated_at DateTime64(3, 'UTC')
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (site_id, funnel_id)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS cohort_definitions
(
  cohort_id String,
  site_id String,
  name String,
  dsl_json String,
  created_at DateTime64(3, 'UTC'),
  updated_at DateTime64(3, 'UTC')
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (site_id, cohort_id)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS cohort_snapshots
(
  cohort_id String,
  site_id String,
  snapshot_version UInt32,
  from_ts DateTime64(3, 'UTC'),
  to_ts DateTime64(3, 'UTC'),
  built_at DateTime64(3, 'UTC'),
  member_count UInt64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(built_at)
ORDER BY (site_id, cohort_id, snapshot_version)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS cohort_memberships
(
  cohort_id String,
  site_id String,
  snapshot_version UInt32,
  session_id String,
  built_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(built_at)
ORDER BY (site_id, cohort_id, snapshot_version, session_id)
SETTINGS index_granularity = 8192;

-- Backfill-friendly columns for revenue analytics in events_raw.
ALTER TABLE events_raw
  ADD COLUMN IF NOT EXISTS revenue_amount Nullable(Decimal(18, 2));

ALTER TABLE events_raw
  ADD COLUMN IF NOT EXISTS revenue_currency Nullable(FixedString(3));

ALTER TABLE events_raw
  ADD COLUMN IF NOT EXISTS product Nullable(String);

ALTER TABLE events_raw
  ADD COLUMN IF NOT EXISTS payment_provider Nullable(String);
