import fs from "node:fs";
import { getTemplateDefaults } from "./templates.js";
import {
  DeniedBehavior,
  IpStorageMode,
  PolicyTemplateName,
  ResolvedSitePolicy,
} from "../types.js";

interface SitePolicyOverride {
  template?: PolicyTemplateName;
  denied_behavior?: DeniedBehavior;
  retention_days?: number;
  ip_storage_mode?: IpStorageMode;
}

interface PolicyFileData {
  default_template?: PolicyTemplateName;
  sites?: Record<string, SitePolicyOverride>;
}

export interface PolicyStore {
  getPolicy(siteId: string): ResolvedSitePolicy;
  listPolicies(): ResolvedSitePolicy[];
}

function isTemplateName(value: string): value is PolicyTemplateName {
  return ["strict", "balanced", "marketing"].includes(value);
}

export class FilePolicyStore implements PolicyStore {
  private readonly config: PolicyFileData;

  constructor(
    private readonly configPath: string,
    private readonly envDefaultTemplate: PolicyTemplateName,
  ) {
    this.config = this.loadConfig();
  }

  getPolicy(siteId: string): ResolvedSitePolicy {
    const defaultTemplate = this.resolveDefaultTemplate();
    const override = this.config.sites?.[siteId] ?? {};

    const template = override.template ?? defaultTemplate;
    const defaults = getTemplateDefaults(template);

    return {
      siteId,
      template,
      deniedBehavior: override.denied_behavior ?? defaults.deniedBehavior,
      retentionDays: override.retention_days ?? defaults.retentionDays,
      ipStorageMode: override.ip_storage_mode ?? defaults.ipStorageMode,
    };
  }

  listPolicies(): ResolvedSitePolicy[] {
    const siteIds = Object.keys(this.config.sites ?? {});
    return siteIds.map((siteId) => this.getPolicy(siteId));
  }

  private resolveDefaultTemplate(): PolicyTemplateName {
    const template = this.config.default_template;
    return template && isTemplateName(template) ? template : this.envDefaultTemplate;
  }

  private loadConfig(): PolicyFileData {
    if (!fs.existsSync(this.configPath)) {
      return {};
    }

    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      return JSON.parse(raw) as PolicyFileData;
    } catch {
      return {};
    }
  }
}

export class InMemoryPolicyStore implements PolicyStore {
  constructor(
    private readonly policies: Record<string, SitePolicyOverride>,
    private readonly defaultTemplate: PolicyTemplateName = "balanced",
  ) {}

  getPolicy(siteId: string): ResolvedSitePolicy {
    const override = this.policies[siteId] ?? {};
    const template = override.template ?? this.defaultTemplate;
    const defaults = getTemplateDefaults(template);

    return {
      siteId,
      template,
      deniedBehavior: override.denied_behavior ?? defaults.deniedBehavior,
      retentionDays: override.retention_days ?? defaults.retentionDays,
      ipStorageMode: override.ip_storage_mode ?? defaults.ipStorageMode,
    };
  }

  listPolicies(): ResolvedSitePolicy[] {
    return Object.keys(this.policies).map((siteId) => this.getPolicy(siteId));
  }
}
