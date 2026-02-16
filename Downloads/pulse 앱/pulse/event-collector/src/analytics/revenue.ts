import { RevenueEventName, StoredEvent } from "../types.js";

const POSITIVE_REVENUE_EVENTS: RevenueEventName[] = [
  "purchase",
  "subscription_start",
  "donation",
];

const POSITIVE_REVENUE_EVENT_SET = new Set<string>(POSITIVE_REVENUE_EVENTS);

function parseAmount(value: unknown): number | null {
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

export interface ParsedRevenueFields {
  revenue_amount: number | null;
  revenue_currency: string | null;
  product: string | null;
  payment_provider: string | null;
}

export function isRevenueLikeEventName(eventName: string): boolean {
  return POSITIVE_REVENUE_EVENT_SET.has(eventName) || eventName === "refund";
}

export function parseRevenueFields(
  eventName: string,
  properties: Record<string, unknown>,
): ParsedRevenueFields {
  if (!isRevenueLikeEventName(eventName)) {
    return {
      revenue_amount: null,
      revenue_currency: null,
      product: null,
      payment_provider: null,
    };
  }

  const amount = parseAmount(properties.amount);
  const signedAmount =
    amount === null
      ? null
      : eventName === "refund"
        ? -Math.abs(amount)
        : Math.abs(amount);

  const currency =
    typeof properties.currency === "string" && /^[A-Z]{3}$/.test(properties.currency)
      ? properties.currency
      : null;

  return {
    revenue_amount: signedAmount,
    revenue_currency: currency,
    product: typeof properties.product === "string" ? properties.product : null,
    payment_provider:
      typeof properties.payment_provider === "string" ? properties.payment_provider : null,
  };
}

export function revenueDeltaFromStoredEvent(event: StoredEvent): number {
  return event.revenue_amount ?? 0;
}
