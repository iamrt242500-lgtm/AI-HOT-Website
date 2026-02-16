/**
 * API Client Utility
 * Handles all API requests with authentication and normalized errors.
 */

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ACCESS_TOKEN_KEY = "access_token";
const API_URL_KEY = "pulse_api_url";

function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function getStoredApiUrl(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(API_URL_KEY);
  if (!stored) return null;
  return normalizeApiUrl(stored);
}

function inferApiUrlFromHost(): string | null {
  if (typeof window === "undefined") return null;

  const { protocol, hostname } = window.location;
  const isHttp = protocol === "http:" || protocol === "https:";

  if (!isHttp || !hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  return `${protocol}//${hostname}:8000`;
}

export function getApiBaseUrl(): string {
  return (
    getStoredApiUrl() ??
    inferApiUrlFromHost() ??
    normalizeApiUrl(DEFAULT_API_URL)
  );
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeApiUrl(url);
  if (!normalized) {
    localStorage.removeItem(API_URL_KEY);
    return;
  }
  localStorage.setItem(API_URL_KEY, normalized);
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export interface ApiListMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiListMeta;
}

export interface AuthUserSummary {
  id: number;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUserSummary;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorPayload = {
  error?: { code?: string; message?: string; details?: unknown };
  detail?: string | { code?: string; message?: string; details?: unknown };
};

function extractError(payload: ErrorPayload): {
  message: string;
  code?: string;
  details?: unknown;
} {
  if (payload?.error) {
    return {
      message: payload.error.message || "Request failed",
      code: payload.error.code,
      details: payload.error.details,
    };
  }

  if (typeof payload?.detail === "string") {
    return { message: payload.detail };
  }

  if (payload?.detail && typeof payload.detail === "object") {
    return {
      message: payload.detail.message || "Request failed",
      code: payload.detail.code,
      details: payload.detail.details,
    };
  }

  return { message: "Request failed" };
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const { token, ...fetchOptions } = options;
  const requestHeaders = new Headers(fetchOptions.headers);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...Object.fromEntries(requestHeaders.entries()),
  };

  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedToken && !token) {
      headers["Authorization"] = `Bearer ${storedToken}`;
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach API server (${apiBaseUrl}). Check backend status and API URL.`
    );
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");

  if (!response.ok) {
    const payload = isJson
      ? ((await response.json().catch(() => ({}))) as ErrorPayload)
      : {};
    const parsed = extractError(payload);
    throw new ApiError(response.status, parsed.message, parsed.code, parsed.details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  signup: (email: string, password: string) =>
    request<AuthResponse>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getCurrentUser: (token: string) =>
    request<{ id: number; email: string; created_at: string }>("/api/v1/auth/me", {
      token,
    }),

  health: () =>
    request<{ status: string; timestamp: string; service: string; version: string }>(
      "/api/v1/health"
    ),
};

export { ACCESS_TOKEN_KEY };
