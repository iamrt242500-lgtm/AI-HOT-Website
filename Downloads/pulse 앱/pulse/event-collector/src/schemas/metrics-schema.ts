import { z } from "zod";

export const pageMetricsQuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  site_id: z.string().min(1).optional(),
});

export function parseQueryDate(raw: string, fieldName: "from" | "to"): Date {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName} datetime`);
  }
  return parsed;
}
