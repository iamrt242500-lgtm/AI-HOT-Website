import Fastify, { FastifyInstance } from "fastify";
import { z } from "zod";
import { CohortService } from "./analytics/cohort-service.js";
import { FunnelService } from "./analytics/funnel-service.js";
import { PathService } from "./analytics/path-service.js";
import { loadConfig, AppConfig } from "./config.js";
import { TrafficFilter } from "./filters/traffic-filter.js";
import { MetricsService } from "./metrics/service.js";
import { ConsentPolicyEngine } from "./policies/engine.js";
import { FilePolicyStore, PolicyStore } from "./policies/policy-store.js";
import { normalizeIp } from "./privacy/ip.js";
import { ClickHouseEventRepository } from "./repositories/clickhouse-event-repository.js";
import { EventRepository } from "./repositories/event-repository.js";
import { InMemoryEventRepository } from "./repositories/in-memory-event-repository.js";
import { cohortDefinitionSchema, cohortRefreshRequestSchema } from "./schemas/cohort-schema.js";
import { eventPayloadSchema } from "./schemas/event-schema.js";
import { funnelDefinitionSchema, funnelReportRequestSchema } from "./schemas/funnel-schema.js";
import { pageMetricsQuerySchema, parseQueryDate } from "./schemas/metrics-schema.js";
import { pathQuerySchema } from "./schemas/path-schema.js";
import { EventIngestionService } from "./services/event-ingestion-service.js";

export interface BuildAppOptions {
  config?: AppConfig;
  repository?: EventRepository;
  policyStore?: PolicyStore;
}

const siteFilterSchema = z.object({
  site_id: z.string().min(1).optional(),
});

const idParamSchema = z.object({
  funnel_id: z.string().min(1).optional(),
  cohort_id: z.string().min(1).optional(),
});

function parseAsnHeader(rawValue: unknown): number | undefined {
  const headerValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (!headerValue || typeof headerValue !== "string") return undefined;

  const parsed = Number(headerValue);
  if (!Number.isFinite(parsed)) return undefined;

  return parsed;
}

function parseStringHeader(rawValue: unknown): string | undefined {
  const headerValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (!headerValue || typeof headerValue !== "string") return undefined;
  return headerValue;
}

function toBooleanHeader(rawValue: unknown): boolean {
  const headerValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (!headerValue || typeof headerValue !== "string") return false;

  return ["1", "true", "yes", "on"].includes(headerValue.toLowerCase());
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();

  const repository: EventRepository =
    options.repository ??
    (config.clickhouse.enabled
      ? new ClickHouseEventRepository(config.clickhouse)
      : new InMemoryEventRepository());

  const policyStore =
    options.policyStore ??
    new FilePolicyStore(config.policy.configPath, config.policy.defaultTemplate);

  const policyEngine = new ConsentPolicyEngine();
  const trafficFilter = new TrafficFilter(config.trafficFilter);
  const metricsService = new MetricsService({
    repository,
    metricsConfig: config.metrics,
  });
  const funnelService = new FunnelService({ repository });
  const cohortService = new CohortService({
    repository,
    metricsConfig: config.metrics,
  });
  const pathService = new PathService({ repository });

  const ingestionService = new EventIngestionService({
    repository,
    policyStore,
    policyEngine,
    stableIdSalt: config.privacy.stableIdSalt,
    ipHashSalt: config.privacy.ipHashSalt,
  });

  const app = Fastify({ logger: true, trustProxy: true });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/v1/metrics/pages", async (request, reply) => {
    const parsedQuery = pageMetricsQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "Query validation failed",
          details: parsedQuery.error.flatten(),
        },
      });
    }

    let from: Date;
    let to: Date;

    try {
      from = parseQueryDate(parsedQuery.data.from, "from");
      to = parseQueryDate(parsedQuery.data.to, "to");
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: error instanceof Error ? error.message : "Invalid from/to date",
        },
      });
    }

    if (from >= to) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "`from` must be earlier than `to`",
        },
      });
    }

    try {
      const rows = await metricsService.getPageMetrics({
        from,
        to,
        siteId: parsedQuery.data.site_id,
      });

      return reply.status(200).send({
        from: from.toISOString(),
        to: to.toISOString(),
        rows,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "metrics_query_failed",
          message: "Failed to query metrics",
        },
      });
    }
  });

  app.post("/v1/funnels", async (request, reply) => {
    const parsed = funnelDefinitionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_payload",
          message: "Funnel payload validation failed",
          details: parsed.error.flatten(),
        },
      });
    }

    try {
      const saved = await funnelService.upsertDefinition(parsed.data);
      return reply.status(200).send(saved);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "funnel_save_failed",
          message: "Failed to save funnel definition",
        },
      });
    }
  });

  app.get("/v1/funnels", async (request, reply) => {
    const parsed = siteFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "Query validation failed",
          details: parsed.error.flatten(),
        },
      });
    }

    const rows = await funnelService.listDefinitions(parsed.data.site_id);
    return reply.status(200).send({ rows });
  });

  app.post("/v1/funnels/:funnel_id/report", async (request, reply) => {
    const parsedParams = idParamSchema.safeParse(request.params);
    const parsedBody = funnelReportRequestSchema.safeParse(request.body);

    if (!parsedParams.success || !parsedBody.success || !parsedParams.data.funnel_id) {
      return reply.status(400).send({
        error: {
          code: "invalid_payload",
          message: "Funnel report request validation failed",
          details: {
            params: parsedParams.success ? undefined : parsedParams.error.flatten(),
            body: parsedBody.success ? undefined : parsedBody.error.flatten(),
          },
        },
      });
    }

    let from: Date;
    let to: Date;

    try {
      from = parseQueryDate(parsedBody.data.from, "from");
      to = parseQueryDate(parsedBody.data.to, "to");
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: error instanceof Error ? error.message : "Invalid from/to date",
        },
      });
    }

    if (from >= to) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "`from` must be earlier than `to`",
        },
      });
    }

    try {
      const report = await funnelService.getReport({
        funnelId: parsedParams.data.funnel_id,
        siteId: parsedBody.data.site_id,
        from,
        to,
      });

      return reply.status(200).send(report);
    } catch (error) {
      if (error instanceof Error && error.message === "funnel_not_found") {
        return reply.status(404).send({
          error: {
            code: "funnel_not_found",
            message: "Funnel definition was not found",
          },
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "funnel_report_failed",
          message: "Failed to build funnel report",
        },
      });
    }
  });

  app.post("/v1/cohorts", async (request, reply) => {
    const parsed = cohortDefinitionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_payload",
          message: "Cohort payload validation failed",
          details: parsed.error.flatten(),
        },
      });
    }

    try {
      const saved = await cohortService.upsertDefinition(parsed.data);
      return reply.status(200).send(saved);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "cohort_save_failed",
          message: "Failed to save cohort definition",
        },
      });
    }
  });

  app.get("/v1/cohorts", async (request, reply) => {
    const parsed = siteFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "Query validation failed",
          details: parsed.error.flatten(),
        },
      });
    }

    const rows = await cohortService.listDefinitions(parsed.data.site_id);
    return reply.status(200).send({ rows });
  });

  app.post("/v1/cohorts/:cohort_id/refresh", async (request, reply) => {
    const parsedParams = idParamSchema.safeParse(request.params);
    const parsedBody = cohortRefreshRequestSchema.safeParse(request.body);

    if (!parsedParams.success || !parsedBody.success || !parsedParams.data.cohort_id) {
      return reply.status(400).send({
        error: {
          code: "invalid_payload",
          message: "Cohort refresh request validation failed",
          details: {
            params: parsedParams.success ? undefined : parsedParams.error.flatten(),
            body: parsedBody.success ? undefined : parsedBody.error.flatten(),
          },
        },
      });
    }

    let from: Date;
    let to: Date;

    try {
      from = parseQueryDate(parsedBody.data.from, "from");
      to = parseQueryDate(parsedBody.data.to, "to");
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: error instanceof Error ? error.message : "Invalid from/to date",
        },
      });
    }

    if (from >= to) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "`from` must be earlier than `to`",
        },
      });
    }

    try {
      const refreshed = await cohortService.refreshOne({
        cohortId: parsedParams.data.cohort_id,
        siteId: parsedBody.data.site_id,
        from,
        to,
      });

      return reply.status(200).send(refreshed);
    } catch (error) {
      if (error instanceof Error && error.message === "cohort_not_found") {
        return reply.status(404).send({
          error: {
            code: "cohort_not_found",
            message: "Cohort definition was not found",
          },
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "cohort_refresh_failed",
          message: "Failed to refresh cohort",
        },
      });
    }
  });

  app.post("/v1/cohorts/refresh", async (request, reply) => {
    const parsedBody = cohortRefreshRequestSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_payload",
          message: "Cohort refresh request validation failed",
          details: parsedBody.error.flatten(),
        },
      });
    }

    let from: Date;
    let to: Date;

    try {
      from = parseQueryDate(parsedBody.data.from, "from");
      to = parseQueryDate(parsedBody.data.to, "to");
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: error instanceof Error ? error.message : "Invalid from/to date",
        },
      });
    }

    if (from >= to) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "`from` must be earlier than `to`",
        },
      });
    }

    try {
      const refreshed = await cohortService.refreshAll({
        from,
        to,
        siteId: parsedBody.data.site_id,
      });

      return reply.status(200).send({ rows: refreshed });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "cohort_refresh_failed",
          message: "Failed to refresh cohorts",
        },
      });
    }
  });

  app.post("/v1/paths/query", async (request, reply) => {
    const parsedBody = pathQuerySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_payload",
          message: "Path query payload validation failed",
          details: parsedBody.error.flatten(),
        },
      });
    }

    let from: Date;
    let to: Date;

    try {
      from = parseQueryDate(parsedBody.data.from, "from");
      to = parseQueryDate(parsedBody.data.to, "to");
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: error instanceof Error ? error.message : "Invalid from/to date",
        },
      });
    }

    if (from >= to) {
      return reply.status(400).send({
        error: {
          code: "invalid_query",
          message: "`from` must be earlier than `to`",
        },
      });
    }

    try {
      const rows = await pathService.queryTopPaths({
        site_id: parsedBody.data.site_id,
        from,
        to,
        start_event: parsedBody.data.start_event,
        end_event: parsedBody.data.end_event,
        top_n: parsedBody.data.top_n ?? config.paths.defaultTopN,
        max_path_length: parsedBody.data.max_path_length ?? config.paths.defaultMaxPathLength,
        sample_rate: parsedBody.data.sample_rate ?? config.paths.defaultSampleRate,
        event_fetch_limit: parsedBody.data.event_fetch_limit ?? config.paths.defaultEventFetchLimit,
      });

      return reply.status(200).send({
        from: from.toISOString(),
        to: to.toISOString(),
        rows,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "paths_query_failed",
          message: "Failed to query top paths",
        },
      });
    }
  });

  app.post("/v1/events", async (request, reply) => {
    const parsedPayload = eventPayloadSchema.safeParse(request.body);

    if (!parsedPayload.success) {
      return reply.status(400).send({
        error: {
          code: "invalid_payload",
          message: "Payload validation failed",
          details: parsedPayload.error.flatten(),
        },
      });
    }

    const xForwardedFor = request.headers["x-forwarded-for"];
    const headerIp = parseStringHeader(xForwardedFor);
    const userAgent = parseStringHeader(request.headers["user-agent"]);

    const normalizedIp = normalizeIp(headerIp || request.ip);
    const asn = parseAsnHeader(request.headers["x-asn"]);
    const isInternal = toBooleanHeader(request.headers["x-internal-traffic"]);

    const trafficDecision = trafficFilter.evaluate({
      ip: normalizedIp ?? undefined,
      userAgent,
      asn,
      isInternal,
    });

    if (!trafficDecision.allowed) {
      return reply.status(202).send({
        status: "dropped",
        reason: trafficDecision.reason,
      });
    }

    try {
      const outcome = await ingestionService.ingest(parsedPayload.data, {
        clientIp: normalizedIp ?? undefined,
        userAgent,
        asn,
        isInternal,
      });

      return reply.status(202).send(outcome);
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          error: {
            code: "ingestion_error",
            message: error.message,
          },
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: "internal_error",
          message: "Unexpected error while ingesting event",
        },
      });
    }
  });

  app.addHook("onClose", async () => {
    if (repository.close) {
      await repository.close();
    }
  });

  return app;
}
