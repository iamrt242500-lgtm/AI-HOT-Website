import { z } from "zod";

export const funnelDefinitionSchema = z.object({
  funnel_id: z.string().min(1).max(128).optional(),
  site_id: z.string().min(1),
  name: z.string().min(1).max(200),
  steps: z.array(z.string().min(1).max(200)).min(2).max(12),
  conversion_window_minutes: z.number().int().min(1).max(7 * 24 * 60),
});

export const funnelReportRequestSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  site_id: z.string().min(1).optional(),
});
