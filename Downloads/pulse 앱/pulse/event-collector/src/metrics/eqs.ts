import { EqsWeights } from "../types.js";

export interface EqsInput {
  pageViews: number;
  botPageViews?: number;
  activeAttentionMsAvg: number;
  scrollReadthroughAvg: number;
  conversionRate: number;
}

export interface EqsDerivedMetrics {
  humanPageViews: number;
  activeAttentionMsAvg: number;
  scrollReadthroughAvg: number;
  conversionRate: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeWeights(weights: EqsWeights): EqsWeights {
  const safeAttention = Math.max(0, weights.attention);
  const safeScroll = Math.max(0, weights.scroll);
  const safeConversion = Math.max(0, weights.conversion);
  const sum = safeAttention + safeScroll + safeConversion;

  if (sum === 0) {
    return {
      attention: 1 / 3,
      scroll: 1 / 3,
      conversion: 1 / 3,
      attentionNormalizationMs: Math.max(1, weights.attentionNormalizationMs),
    };
  }

  return {
    attention: safeAttention / sum,
    scroll: safeScroll / sum,
    conversion: safeConversion / sum,
    attentionNormalizationMs: Math.max(1, weights.attentionNormalizationMs),
  };
}

export function deriveEqsMetrics(input: EqsInput): EqsDerivedMetrics {
  const pageViews = Math.max(0, Math.floor(input.pageViews));
  const botPageViews = Math.max(0, Math.floor(input.botPageViews ?? 0));
  const humanPageViews = Math.max(0, pageViews - botPageViews);

  return {
    humanPageViews,
    activeAttentionMsAvg: clamp(input.activeAttentionMsAvg, 0, Number.MAX_SAFE_INTEGER),
    scrollReadthroughAvg: clamp(input.scrollReadthroughAvg, 0, 1),
    conversionRate: clamp(input.conversionRate, 0, 1),
  };
}

export function calculateEqsScore(input: EqsInput, weights: EqsWeights): number {
  const derived = deriveEqsMetrics(input);
  if (derived.humanPageViews === 0) return 0;

  const normalized = normalizeWeights(weights);
  const normalizedAttention = clamp(
    derived.activeAttentionMsAvg / normalized.attentionNormalizationMs,
    0,
    1,
  );

  const score01 =
    normalized.attention * normalizedAttention +
    normalized.scroll * derived.scrollReadthroughAvg +
    normalized.conversion * derived.conversionRate;

  return Math.round(clamp(score01, 0, 1) * 10000) / 100;
}
