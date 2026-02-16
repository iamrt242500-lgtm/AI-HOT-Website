-- events_raw: first-party event log with consent metadata.
-- Note: ClickHouse has no strict unique constraints. Idempotency is enforced in API layer
--       using (site_id, idempotency_key) lookup before insert.

CREATE TABLE IF NOT EXISTS events_raw
(
  event_id UUID,
  site_id String,
  event_name LowCardinality(String),
  event_ts DateTime64(3, 'UTC'),
  ingested_at DateTime64(3, 'UTC'),

  consent_state Enum8('granted' = 1, 'denied' = 2, 'unknown' = 3),
  policy_template LowCardinality(String),
  denied_behavior LowCardinality(String),

  user_kind LowCardinality(String),
  user_id String,
  session_id String,
  stable_id_hash Nullable(String),

  revenue_amount Nullable(Decimal(18, 2)),
  revenue_currency Nullable(FixedString(3)),
  product Nullable(String),
  payment_provider Nullable(String),

  properties_json String,
  idempotency_key String,

  user_agent Nullable(String),
  asn Nullable(UInt32),
  ip_masked Nullable(String),
  ip_hash Nullable(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ingested_at)
ORDER BY (site_id, event_name, event_ts, idempotency_key)
TTL ingested_at + INTERVAL 400 DAY DELETE
SETTINGS index_granularity = 8192;

-- Optional skipping index for duplicate checks by idempotency_key
ALTER TABLE events_raw
  ADD INDEX IF NOT EXISTS idx_idempotency_key idempotency_key TYPE bloom_filter GRANULARITY 4;
