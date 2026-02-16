import path from "node:path";
import dotenv from "dotenv";
import { EqsWeights, PolicyTemplateName } from "./types.js";

dotenv.config();

const POLICY_TEMPLATE_NAMES: PolicyTemplateName[] = [
  "strict",
  "balanced",
  "marketing",
];

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvNumbers(value: string | undefined): number[] {
  return parseCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function parsePolicyTemplate(value: string | undefined, fallback: PolicyTemplateName): PolicyTemplateName {
  if (!value) return fallback;
  return POLICY_TEMPLATE_NAMES.includes(value as PolicyTemplateName)
    ? (value as PolicyTemplateName)
    : fallback;
}

export interface AppConfig {
  host: string;
  port: number;
  clickhouse: {
    enabled: boolean;
    url: string;
    database: string;
    username: string;
    password: string;
  };
  policy: {
    defaultTemplate: PolicyTemplateName;
    configPath: string;
  };
  privacy: {
    stableIdSalt: string;
    ipHashSalt: string;
  };
  trafficFilter: {
    uaDenyPatterns: string[];
    uaAllowPatterns: string[];
    ipDenylist: string[];
    ipAllowlist: string[];
    asnDenylist: number[];
    asnAllowlist: number[];
    blockInternalTraffic: boolean;
  };
  retention: {
    cron: string;
    jobEnabled: boolean;
    defaultRetentionDays: number;
  };
  metrics: {
    sessionInactivityMinutes: number;
    attentionHeartbeatMs: number;
    botUserAgentPattern: string;
    eqs: EqsWeights;
  };
  cohort: {
    refreshCron: string;
    refreshEnabled: boolean;
    refreshLookbackDays: number;
  };
  paths: {
    defaultTopN: number;
    defaultMaxPathLength: number;
    defaultSampleRate: number;
    defaultEventFetchLimit: number;
  };
}

export function loadConfig(): AppConfig {
  const host = process.env.HOST || "0.0.0.0";
  const port = parseNumber(process.env.PORT, 8081);

  const defaultTemplate = parsePolicyTemplate(process.env.POLICY_DEFAULT_TEMPLATE, "balanced");

  const policyConfigPath = process.env.POLICY_CONFIG_PATH
    ? path.resolve(process.cwd(), process.env.POLICY_CONFIG_PATH)
    : path.resolve(process.cwd(), "config/site-policies.json");

  return {
    host,
    port,
    clickhouse: {
      enabled: parseBool(process.env.CLICKHOUSE_ENABLED, true),
      url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
      database: process.env.CLICKHOUSE_DATABASE || "default",
      username: process.env.CLICKHOUSE_USER || "default",
      password: process.env.CLICKHOUSE_PASSWORD || "",
    },
    policy: {
      defaultTemplate,
      configPath: policyConfigPath,
    },
    privacy: {
      stableIdSalt: process.env.STABLE_ID_SALT || "",
      ipHashSalt: process.env.IP_HASH_SALT || "",
    },
    trafficFilter: {
      uaDenyPatterns: parseCsv(process.env.TRAFFIC_FILTER_UA_DENY),
      uaAllowPatterns: parseCsv(process.env.TRAFFIC_FILTER_UA_ALLOW),
      ipDenylist: parseCsv(process.env.TRAFFIC_FILTER_IP_DENY),
      ipAllowlist: parseCsv(process.env.TRAFFIC_FILTER_IP_ALLOW),
      asnDenylist: parseCsvNumbers(process.env.TRAFFIC_FILTER_ASN_DENY),
      asnAllowlist: parseCsvNumbers(process.env.TRAFFIC_FILTER_ASN_ALLOW),
      blockInternalTraffic: parseBool(process.env.TRAFFIC_FILTER_BLOCK_INTERNAL, true),
    },
    retention: {
      cron: process.env.RETENTION_CRON || "15 3 * * *",
      jobEnabled: parseBool(process.env.RETENTION_JOB_ENABLED, true),
      defaultRetentionDays: parseNumber(process.env.DEFAULT_RETENTION_DAYS, 180),
    },
    metrics: {
      sessionInactivityMinutes: parseNumber(process.env.METRICS_SESSION_INACTIVITY_MINUTES, 30),
      attentionHeartbeatMs: parseNumber(process.env.METRICS_ATTENTION_HEARTBEAT_MS, 5000),
      botUserAgentPattern:
        process.env.METRICS_BOT_UA_PATTERN ||
        "(bot|crawler|spider|headless|slurp|bingpreview|uptime|monitor)",
      eqs: {
        attention: parseNumber(process.env.EQS_WEIGHT_ATTENTION, 0.5),
        scroll: parseNumber(process.env.EQS_WEIGHT_SCROLL, 0.3),
        conversion: parseNumber(process.env.EQS_WEIGHT_CONVERSION, 0.2),
        attentionNormalizationMs: parseNumber(process.env.EQS_ATTENTION_NORMALIZATION_MS, 30000),
      },
    },
    cohort: {
      refreshCron: process.env.COHORT_REFRESH_CRON || "25 3 * * *",
      refreshEnabled: parseBool(process.env.COHORT_REFRESH_ENABLED, true),
      refreshLookbackDays: parseNumber(process.env.COHORT_REFRESH_LOOKBACK_DAYS, 30),
    },
    paths: {
      defaultTopN: parseNumber(process.env.PATHS_DEFAULT_TOP_N, 20),
      defaultMaxPathLength: parseNumber(process.env.PATHS_DEFAULT_MAX_PATH_LENGTH, 8),
      defaultSampleRate: parseNumber(process.env.PATHS_DEFAULT_SAMPLE_RATE, 1),
      defaultEventFetchLimit: parseNumber(process.env.PATHS_DEFAULT_EVENT_FETCH_LIMIT, 300000),
    },
  };
}
