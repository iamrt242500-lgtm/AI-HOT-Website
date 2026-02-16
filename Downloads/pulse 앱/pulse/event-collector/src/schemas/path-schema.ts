import { z } from "zod";

export const pathQuerySchema = z.object({
  site_id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  start_event: z.string().min(1).max(128),
  end_event: z.string().min(1).max(128),
  top_n: z.number().int().min(1).max(100).default(20),
  max_path_length: z.number().int().min(2).max(20).default(8),
  sample_rate: z.number().min(0.01).max(1).default(1),
  event_fetch_limit: z.number().int().min(1000).max(2_000_000).default(300000),
});
