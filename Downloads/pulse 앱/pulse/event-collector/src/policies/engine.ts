import { ConsentState, ResolvedSitePolicy } from "../types.js";

export interface PolicyDecision {
  action: "store" | "drop";
  minimalPayload: boolean;
  reason?: string;
}

export class ConsentPolicyEngine {
  evaluate(consentState: ConsentState, policy: ResolvedSitePolicy): PolicyDecision {
    if (consentState !== "denied") {
      return {
        action: "store",
        minimalPayload: false,
      };
    }

    if (policy.deniedBehavior === "drop") {
      return {
        action: "drop",
        minimalPayload: false,
        reason: "consent_denied_drop_policy",
      };
    }

    return {
      action: "store",
      minimalPayload: true,
      reason: "consent_denied_minimal_policy",
    };
  }
}
