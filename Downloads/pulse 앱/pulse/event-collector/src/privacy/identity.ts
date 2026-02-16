import { createHash } from "node:crypto";
import { UserKind } from "../types.js";

interface InputUser {
  anonymous_session_id?: string;
  stable_user_id?: string;
  is_authenticated?: boolean;
}

export interface UserIdentity {
  userKind: UserKind;
  userId: string;
  sessionId: string;
  stableIdHash: string | null;
}

function hashWithSalt(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function buildUserIdentity(
  user: InputUser | undefined,
  stableIdSalt: string,
  sessionId: string,
): UserIdentity {
  if (user?.stable_user_id) {
    if (!user.is_authenticated) {
      throw new Error("stable_user_id requires is_authenticated=true");
    }

    if (!stableIdSalt) {
      throw new Error("STABLE_ID_SALT is required to hash stable user IDs");
    }

    const stableIdHash = hashWithSalt(user.stable_user_id, stableIdSalt);

    return {
      userKind: "stable",
      userId: `stable:${stableIdHash}`,
      sessionId,
      stableIdHash,
    };
  }

  return {
    userKind: "anonymous",
    userId: `anon:${sessionId}`,
    sessionId,
    stableIdHash: null,
  };
}
