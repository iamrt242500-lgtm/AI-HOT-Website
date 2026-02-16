import { z } from "zod";

export const cohortConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("visit_count_gte"),
    value: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("has_event"),
    event_name: z.string().min(1).max(128),
  }),
  z.object({
    type: z.literal("eqs_gte"),
    value: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("utm_source_in"),
    values: z.array(z.string().min(1).max(100)).min(1).max(20),
  }),
]);

export const cohortDslSchema = z.object({
  all: z.array(cohortConditionSchema).min(1).max(20),
});

export const cohortDefinitionSchema = z.object({
  cohort_id: z.string().min(1).max(128).optional(),
  site_id: z.string().min(1),
  name: z.string().min(1).max(200),
  dsl: cohortDslSchema,
});

export const cohortRefreshRequestSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  site_id: z.string().min(1).optional(),
});
