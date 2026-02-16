import { describe, expect, it } from "vitest";
import { initPulseEqs } from "../src/sdk.js";

describe("initPulseEqs", () => {
  it("throws outside browser runtime", () => {
    expect(() =>
      initPulseEqs({
        siteId: "test-site",
        endpoint: "http://localhost:8081/v1/events",
      }),
    ).toThrow(/browser environment/i);
  });
});
