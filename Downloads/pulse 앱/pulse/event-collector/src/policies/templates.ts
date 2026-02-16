import { PolicyTemplateName, ResolvedSitePolicy } from "../types.js";

type TemplateDefaults = Omit<ResolvedSitePolicy, "siteId">;

export const POLICY_TEMPLATE_DEFAULTS: Record<PolicyTemplateName, TemplateDefaults> = {
  strict: {
    template: "strict",
    deniedBehavior: "drop",
    retentionDays: 30,
    ipStorageMode: "none",
  },
  balanced: {
    template: "balanced",
    deniedBehavior: "minimal",
    retentionDays: 180,
    ipStorageMode: "none",
  },
  marketing: {
    template: "marketing",
    deniedBehavior: "minimal",
    retentionDays: 365,
    ipStorageMode: "hash",
  },
};

export function getTemplateDefaults(template: PolicyTemplateName): TemplateDefaults {
  return POLICY_TEMPLATE_DEFAULTS[template];
}
