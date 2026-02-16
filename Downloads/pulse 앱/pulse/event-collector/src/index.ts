import { CohortService } from "./analytics/cohort-service.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { startCohortRefreshJob } from "./jobs/cohort-refresh-job.js";
import { startRetentionJob } from "./jobs/retention-job.js";
import { FilePolicyStore } from "./policies/policy-store.js";
import { ClickHouseEventRepository } from "./repositories/clickhouse-event-repository.js";
import { InMemoryEventRepository } from "./repositories/in-memory-event-repository.js";

async function main() {
  const config = loadConfig();

  const policyStore = new FilePolicyStore(config.policy.configPath, config.policy.defaultTemplate);
  const repository = config.clickhouse.enabled
    ? new ClickHouseEventRepository(config.clickhouse)
    : new InMemoryEventRepository();

  const app = await buildApp({
    config,
    policyStore,
    repository,
  });

  let retentionTask:
    | {
        stop: () => void;
      }
    | undefined;
  let cohortTask:
    | {
        stop: () => void;
      }
    | undefined;

  if (config.retention.jobEnabled) {
    retentionTask = startRetentionJob({
      schedule: config.retention.cron,
      defaultRetentionDays: config.retention.defaultRetentionDays,
      policyStore,
      repository,
      logger: app.log,
    });

    app.log.info(`Retention job enabled with schedule: ${config.retention.cron}`);
  }

  if (config.cohort.refreshEnabled) {
    const cohortService = new CohortService({
      repository,
      metricsConfig: config.metrics,
    });

    cohortTask = startCohortRefreshJob({
      schedule: config.cohort.refreshCron,
      lookbackDays: config.cohort.refreshLookbackDays,
      cohortService,
      logger: app.log,
    });

    app.log.info(`Cohort refresh job enabled with schedule: ${config.cohort.refreshCron}`);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down`);

    retentionTask?.stop();
    cohortTask?.stop();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({
    host: config.host,
    port: config.port,
  });

  app.log.info(`Event collector listening on http://${config.host}:${config.port}`);
}

main().catch((error) => {
  console.error("Fatal startup error", error);
  process.exit(1);
});
