import {
  CohortDefinitionInput,
  CohortDefinitionRecord,
  CohortRefreshQuery,
  CohortRefreshResult,
  FunnelAggregateQuery,
  FunnelAggregateResult,
  FunnelDefinitionInput,
  FunnelDefinitionRecord,
  PageMetricsAggregate,
  PageMetricsQuery,
  PathQuery,
  PathReportRow,
  StoredEvent,
} from "../types.js";

export interface RetentionRule {
  siteId: string;
  retentionDays: number;
}

export interface EventRepository {
  isDuplicate(siteId: string, idempotencyKey: string): Promise<boolean>;
  insertEvent(event: StoredEvent): Promise<void>;

  queryPageMetrics(query: PageMetricsQuery): Promise<PageMetricsAggregate[]>;

  upsertFunnelDefinition(input: FunnelDefinitionInput): Promise<FunnelDefinitionRecord>;
  listFunnelDefinitions(siteId?: string): Promise<FunnelDefinitionRecord[]>;
  getFunnelDefinition(funnelId: string, siteId?: string): Promise<FunnelDefinitionRecord | null>;
  queryFunnelAggregate(query: FunnelAggregateQuery): Promise<FunnelAggregateResult>;

  upsertCohortDefinition(input: CohortDefinitionInput): Promise<CohortDefinitionRecord>;
  listCohortDefinitions(siteId?: string): Promise<CohortDefinitionRecord[]>;
  getCohortDefinition(cohortId: string, siteId?: string): Promise<CohortDefinitionRecord | null>;
  refreshCohortSnapshot(query: CohortRefreshQuery): Promise<CohortRefreshResult>;

  queryTopPaths(query: PathQuery): Promise<PathReportRow[]>;

  deleteExpired(rules: RetentionRule[], defaultRetentionDays: number): Promise<number>;
  close?(): Promise<void>;
}
