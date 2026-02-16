import { describe, expect, it } from "vitest";
import { calculateEqsScore } from "../src/metrics/eqs.js";

const weights = {
  attention: 0.5,
  scroll: 0.3,
  conversion: 0.2,
  attentionNormalizationMs: 30000,
};

describe("calculateEqsScore", () => {
  it("returns 0 when there are no visits", () => {
    const score = calculateEqsScore(
      {
        pageViews: 0,
        activeAttentionMsAvg: 12000,
        scrollReadthroughAvg: 0.8,
        conversionRate: 0.3,
      },
      weights,
    );

    expect(score).toBe(0);
  });

  it("returns 0 when all visits are excluded as bots", () => {
    const score = calculateEqsScore(
      {
        pageViews: 10,
        botPageViews: 10,
        activeAttentionMsAvg: 25000,
        scrollReadthroughAvg: 0.7,
        conversionRate: 0.4,
      },
      weights,
    );

    expect(score).toBe(0);
  });

  it("calculates a weighted EQS in 0~100 range", () => {
    const score = calculateEqsScore(
      {
        pageViews: 20,
        activeAttentionMsAvg: 15000,
        scrollReadthroughAvg: 0.5,
        conversionRate: 0.25,
      },
      weights,
    );

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeCloseTo(45, 1);
  });
});
