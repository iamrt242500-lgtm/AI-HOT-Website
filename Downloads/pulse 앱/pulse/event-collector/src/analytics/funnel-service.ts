import {
  FunnelDefinitionInput,
  FunnelDefinitionRecord,
  FunnelReport,
  FunnelStepReport,
} from "../types.js";
import { EventRepository } from "../repositories/event-repository.js";

export interface FunnelReportInput {
  funnelId: string;
  siteId?: string;
  from: Date;
  to: Date;
}

export interface FunnelServiceOptions {
  repository: EventRepository;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export class FunnelService {
  constructor(private readonly options: FunnelServiceOptions) {}

  async upsertDefinition(input: FunnelDefinitionInput): Promise<FunnelDefinitionRecord> {
    return this.options.repository.upsertFunnelDefinition(input);
  }

  async listDefinitions(siteId?: string): Promise<FunnelDefinitionRecord[]> {
    return this.options.repository.listFunnelDefinitions(siteId);
  }

  async getReport(input: FunnelReportInput): Promise<FunnelReport> {
    const funnel = await this.options.repository.getFunnelDefinition(input.funnelId, input.siteId);
    if (!funnel) {
      throw new Error("funnel_not_found");
    }

    const aggregate = await this.options.repository.queryFunnelAggregate({
      funnel,
      from: input.from,
      to: input.to,
      siteId: input.siteId,
    });

    const stepReports: FunnelStepReport[] = funnel.steps.map((step, index) => {
      const sessions = aggregate.step_sessions[index] ?? 0;
      const previousSessions = index === 0 ? aggregate.step_sessions[0] ?? 0 : aggregate.step_sessions[index - 1] ?? 0;
      const conversionRate =
        index === 0
          ? 1
          : previousSessions > 0
            ? sessions / previousSessions
            : 0;
      const dropOff = Math.max(0, previousSessions - sessions);

      return {
        step_index: index,
        step,
        sessions,
        conversion_rate: round4(conversionRate),
        drop_off: dropOff,
      };
    });

    return {
      funnel_id: funnel.funnel_id,
      site_id: funnel.site_id,
      name: funnel.name,
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      conversion_window_minutes: funnel.conversion_window_minutes,
      steps: stepReports,
      revenue_total: aggregate.revenue_total,
      revenue_avg: aggregate.revenue_avg,
    };
  }
}
