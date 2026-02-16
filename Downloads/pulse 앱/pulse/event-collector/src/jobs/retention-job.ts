import cron from "node-cron";
import { PolicyStore } from "../policies/policy-store.js";
import { EventRepository } from "../repositories/event-repository.js";

interface LoggerLike {
  info: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
}

export interface RetentionJobOptions {
  schedule: string;
  defaultRetentionDays: number;
  policyStore: PolicyStore;
  repository: EventRepository;
  logger: LoggerLike;
}

export async function runRetentionCleanup(
  repository: EventRepository,
  policyStore: PolicyStore,
  defaultRetentionDays: number,
): Promise<number> {
  const rules = policyStore.listPolicies().map((policy) => ({
    siteId: policy.siteId,
    retentionDays: policy.retentionDays,
  }));

  return repository.deleteExpired(rules, defaultRetentionDays);
}

export function startRetentionJob(options: RetentionJobOptions) {
  const { schedule, repository, policyStore, defaultRetentionDays, logger } = options;

  let running = false;

  const task = cron.schedule(schedule, async () => {
    if (running) {
      logger.info("Retention job skipped: previous run still active");
      return;
    }

    running = true;

    try {
      const affected = await runRetentionCleanup(repository, policyStore, defaultRetentionDays);
      logger.info("Retention job completed", { affected });
    } catch (error) {
      logger.error("Retention job failed", error);
    } finally {
      running = false;
    }
  });

  return task;
}
