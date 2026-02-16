import { AppConfig } from "../config.js";
import { EventRepository } from "../repositories/event-repository.js";
import { PageMetricsQuery, PageMetricsResponseRow } from "../types.js";
import { calculateEqsScore } from "./eqs.js";

export interface GetPageMetricsInput {
  from: Date;
  to: Date;
  siteId?: string;
}

export interface MetricsServiceOptions {
  repository: EventRepository;
  metricsConfig: AppConfig["metrics"];
}

export class MetricsService {
  constructor(private readonly options: MetricsServiceOptions) {}

  async getPageMetrics(input: GetPageMetricsInput): Promise<PageMetricsResponseRow[]> {
    const query: PageMetricsQuery = {
      from: input.from,
      to: input.to,
      siteId: input.siteId,
      sessionInactivityMinutes: this.options.metricsConfig.sessionInactivityMinutes,
      attentionHeartbeatMs: this.options.metricsConfig.attentionHeartbeatMs,
      botUserAgentPattern: this.options.metricsConfig.botUserAgentPattern,
    };

    const rows = await this.options.repository.queryPageMetrics(query);

    return rows
      .map((row) => {
        const pageViews = Math.max(0, row.page_views);
        const activeAttentionMsAvg = pageViews > 0 ? row.active_attention_ms_total / pageViews : 0;
        const scrollReadthroughAvg =
          row.scroll_base_events > 0 ? row.scroll_read_events / row.scroll_base_events : 0;
        const conversionRate = pageViews > 0 ? row.micro_conversions / pageViews : 0;

        const eqs = calculateEqsScore(
          {
            pageViews,
            botPageViews: row.bot_page_views,
            activeAttentionMsAvg,
            scrollReadthroughAvg,
            conversionRate,
          },
          this.options.metricsConfig.eqs,
        );

        return {
          page_path: row.page_path,
          eqs,
          active_attention_ms_avg: Math.round(activeAttentionMsAvg),
          scroll_readthrough_avg: Math.round(scrollReadthroughAvg * 10000) / 10000,
          conversion_rate: Math.round(conversionRate * 10000) / 10000,
          page_views: pageViews,
          sessions: Math.max(0, row.sessions),
        };
      })
      .sort((a, b) => b.eqs - a.eqs || b.page_views - a.page_views || a.page_path.localeCompare(b.page_path));
  }
}
