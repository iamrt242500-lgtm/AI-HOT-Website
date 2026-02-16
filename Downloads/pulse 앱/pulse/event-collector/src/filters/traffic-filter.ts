import { TrafficFilterDecision } from "../types.js";

interface TrafficFilterConfig {
  uaDenyPatterns: string[];
  uaAllowPatterns: string[];
  ipDenylist: string[];
  ipAllowlist: string[];
  asnDenylist: number[];
  asnAllowlist: number[];
  blockInternalTraffic: boolean;
}

export interface TrafficContext {
  ip?: string;
  userAgent?: string;
  asn?: number;
  isInternal?: boolean;
}

function buildRegex(pattern: string): RegExp {
  try {
    return new RegExp(pattern, "i");
  } catch {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, "i");
  }
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  const nums = parts.map((part) => Number(part));
  if (nums.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) {
    return null;
  }

  return (((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3]) >>> 0;
}

function matchCidr(ip: string, cidr: string): boolean {
  const [range, prefixRaw] = cidr.split("/");
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  if (ipInt === null || rangeInt === null) return false;

  if (prefix === 0) return true;

  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function matchIpRule(ip: string, rule: string): boolean {
  if (rule.includes("/")) {
    return matchCidr(ip, rule);
  }
  return ip === rule;
}

export class TrafficFilter {
  private readonly uaDenyRegexes: RegExp[];
  private readonly uaAllowRegexes: RegExp[];

  constructor(private readonly config: TrafficFilterConfig) {
    this.uaDenyRegexes = config.uaDenyPatterns.map(buildRegex);
    this.uaAllowRegexes = config.uaAllowPatterns.map(buildRegex);
  }

  evaluate(context: TrafficContext): TrafficFilterDecision {
    if (context.isInternal && this.config.blockInternalTraffic) {
      return { allowed: false, reason: "internal_traffic_blocked" };
    }

    const userAgent = context.userAgent ?? "";
    const uaAllowed = this.uaAllowRegexes.some((regex) => regex.test(userAgent));
    const uaDenied = this.uaDenyRegexes.some((regex) => regex.test(userAgent));

    if (!uaAllowed && uaDenied) {
      return { allowed: false, reason: "ua_blocked" };
    }

    if (context.asn !== undefined) {
      if (this.config.asnAllowlist.length > 0 && !this.config.asnAllowlist.includes(context.asn)) {
        return { allowed: false, reason: "asn_not_allowlisted" };
      }

      if (this.config.asnDenylist.includes(context.asn) && !this.config.asnAllowlist.includes(context.asn)) {
        return { allowed: false, reason: "asn_blocked" };
      }
    }

    if (context.ip) {
      if (
        this.config.ipAllowlist.length > 0 &&
        !this.config.ipAllowlist.some((rule) => matchIpRule(context.ip!, rule))
      ) {
        return { allowed: false, reason: "ip_not_allowlisted" };
      }

      if (
        this.config.ipDenylist.some((rule) => matchIpRule(context.ip!, rule)) &&
        !this.config.ipAllowlist.some((rule) => matchIpRule(context.ip!, rule))
      ) {
        return { allowed: false, reason: "ip_blocked" };
      }
    }

    return { allowed: true };
  }
}
