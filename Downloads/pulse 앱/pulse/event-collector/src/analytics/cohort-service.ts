import { AppConfig } from "../config.js";
import { EventRepository } from "../repositories/event-repository.js";
import {
  CohortDefinitionInput,
  CohortDefinitionRecord,
  CohortRefreshResult,
} from "../types.js";

export interface CohortServiceOptions {
  repository: EventRepository;
  metricsConfig: AppConfig["metrics"];
}

export interface CohortRefreshInput {
  cohortId: string;
  siteId?: string;
  from: Date;
  to: Date;
}

export interface RefreshAllInput {
  from: Date;
  to: Date;
  siteId?: string;
}

export class CohortService {
  constructor(private readonly options: CohortServiceOptions) {}

  async upsertDefinition(input: CohortDefinitionInput): Promise<CohortDefinitionRecord> {
    return this.options.repository.upsertCohortDefinition(input);
  }

  async listDefinitions(siteId?: string): Promise<CohortDefinitionRecord[]> {
    return this.options.repository.listCohortDefinitions(siteId);
  }

  async refreshOne(input: CohortRefreshInput): Promise<CohortRefreshResult> {
    const cohort = await this.options.repository.getCohortDefinition(input.cohortId, input.siteId);
    if (!cohort) {
      throw new Error("cohort_not_found");
    }

    return this.options.repository.refreshCohortSnapshot({
      cohort,
      from: input.from,
      to: input.to,
      metrics: {
        eqsWeights: this.options.metricsConfig.eqs,
        attentionHeartbeatMs: this.options.metricsConfig.attentionHeartbeatMs,
      },
    });
  }

  async refreshAll(input: RefreshAllInput): Promise<CohortRefreshResult[]> {
    const cohorts = await this.options.repository.listCohortDefinitions(input.siteId);
    const results: CohortRefreshResult[] = [];

    for (const cohort of cohorts) {
      const refreshed = await this.options.repository.refreshCohortSnapshot({
        cohort,
        from: input.from,
        to: input.to,
        metrics: {
          eqsWeights: this.options.metricsConfig.eqs,
          attentionHeartbeatMs: this.options.metricsConfig.attentionHeartbeatMs,
        },
      });

      results.push(refreshed);
    }

    return results;
  }
}
