import { createHash } from "node:crypto";
import { IpStorageMode } from "../types.js";

export interface ProcessedIp {
  ipMasked: string | null;
  ipHashed: string | null;
}

function hashWithSalt(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function normalizeIp(rawIp: string | undefined): string | null {
  if (!rawIp) return null;

  const firstIp = rawIp.split(",")[0]?.trim() ?? "";
  if (!firstIp) return null;

  if (firstIp.startsWith("::ffff:")) {
    return firstIp.replace("::ffff:", "");
  }

  return firstIp;
}

export function maskIpv4To24(ip: string): string | null {
  const chunks = ip.split(".");
  if (chunks.length !== 4) return null;

  const nums = chunks.map((chunk) => Number(chunk));
  if (nums.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) {
    return null;
  }

  return `${nums[0]}.${nums[1]}.${nums[2]}.0/24`;
}

export function processIp(ip: string | undefined, mode: IpStorageMode, hashSalt: string): ProcessedIp {
  const normalizedIp = normalizeIp(ip);

  if (!normalizedIp || mode === "none") {
    return { ipMasked: null, ipHashed: null };
  }

  if (mode === "mask24") {
    return {
      ipMasked: maskIpv4To24(normalizedIp),
      ipHashed: null,
    };
  }

  return {
    ipMasked: null,
    ipHashed: hashWithSalt(normalizedIp, hashSalt || "default-ip-salt"),
  };
}
