import { z } from "zod";

const REVENUE_EVENT_NAMES = new Set([
  "purchase",
  "subscription_start",
  "donation",
  "refund",
]);

function parseNumericAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export const eventPayloadSchema = z
  .object({
    site_id: z.string().min(1),
    session_id: z.string().min(1).max(200),
    event_name: z.string().min(1).max(128),
    ts: z.union([z.string().min(1), z.number()]),
    properties: z.record(z.unknown()),
    consent_state: z.enum(["granted", "denied", "unknown"]),
    idempotency_key: z.string().min(1).max(200).optional(),
    user: z
      .object({
        anonymous_session_id: z.string().min(1).max(200).optional(),
        stable_user_id: z.string().min(1).max(200).optional(),
        is_authenticated: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!REVENUE_EVENT_NAMES.has(value.event_name)) {
      return;
    }

    const amount = parseNumericAmount(value.properties.amount);
    if (amount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["properties", "amount"],
        message: "Revenue events require a numeric properties.amount",
      });
    }

    const currency = value.properties.currency;
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["properties", "currency"],
        message: "Revenue events require properties.currency as ISO-4217 (e.g. USD)",
      });
    }

    const product = value.properties.product;
    if (product !== undefined && typeof product !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["properties", "product"],
        message: "properties.product must be a string when provided",
      });
    }

    const provider = value.properties.payment_provider;
    if (provider !== undefined && typeof provider !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["properties", "payment_provider"],
        message: "properties.payment_provider must be a string when provided",
      });
    }
  });

export type EventPayloadInput = z.infer<typeof eventPayloadSchema>;
