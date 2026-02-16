import cron from "node-cron";
import { CohortService } from "../analytics/cohort-service.js";

interface LoggerLike {
  info: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
}

export interface CohortRefreshJobOptions {
  schedule: string;
  lookbackDays: number;
  cohortService: CohortService;
  logger: LoggerLike;
  siteId?: string;
}

export async function runCohortRefresh(
  cohortService: CohortService,
  lookbackDays: number,
  siteId?: string,
): Promise<number> {
  const now = new Date();
  const from = new Date(now.getTime() - Math.max(1, lookbackDays) * 24 * 60 * 60 * 1000);

  const results = await cohortService.refreshAll({
    from,
    to: now,
    siteId,
  });

  return results.length;
}

export function startCohortRefreshJob(options: CohortRefreshJobOptions) {
  const { schedule, lookbackDays, cohortService, logger, siteId } = options;

  let running = false;

  const task = cron.schedule(schedule, async () => {
    if (running) {
      logger.info("Cohort refresh skipped: previous run still active");
      return;
    }

    running = true;

    try {
      const refreshed = await runCohortRefresh(cohortService, lookbackDays, siteId);
      logger.info("Cohort refresh completed", { refreshed });
    } catch (error) {
      logger.error("Cohort refresh failed", error);
    } finally {
      running = false;
    }
  });

  return task;
}
