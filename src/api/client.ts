import { storage } from "@/lib/storage";

// Server URL comes from the mobile app's .env (EXPO_PUBLIC_API_URL).
export const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://nex-attender.vercel.app"
).replace(/\/$/, "");
const SESSION_COOKIE = "oam_session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// In-memory cache of the session token; hydrated from SecureStore on launch.
let token: string | null = null;

export async function loadToken(): Promise<string | null> {
  token = await storage.getToken();
  return token;
}

export function getToken(): string | null {
  return token;
}

async function setToken(value: string): Promise<void> {
  token = value;
  await storage.setToken(value);
}

export async function clearToken(): Promise<void> {
  token = null;
  await storage.clearToken();
}

/** Pull `oam_session=<jwt>` out of a Set-Cookie header value. */
function extractSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const m = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;,\\s]+)`));
  return m ? m[1] : null;
}

// Listeners notified when the server rejects our session (401), so the
// AuthContext can drop the user back to the login screen.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onUnauthorized(fn: UnauthorizedListener): () => void {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Treat the response as text (used for CSV reports). */
  raw?: boolean;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json, text/csv" };

  // The server enforces application/json on bodies it parses (CSRF hardening).
  const hasBody = method !== "GET" && method !== "DELETE";
  if (hasBody) headers["Content-Type"] = "application/json";
  if (token) headers["Cookie"] = `${SESSION_COOKIE}=${token}`;

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: hasBody ? JSON.stringify(opts.body ?? {}) : undefined,
    // React Native's native cookie jar also stores/sends the session as a
    // live backup; we additionally persist the token (below) so the session
    // survives app restarts when the jar is empty.
  });

  // Capture a refreshed session cookie if the server sent one (login flows).
  const newToken = extractSessionCookie(res.headers.get("set-cookie"));
  if (newToken) await setToken(newToken);

  if (opts.raw) {
    const text = await res.text();
    if (!res.ok) throw new ApiError(text || `Request failed (${res.status})`, res.status);
    return text as unknown as T;
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
  }

  if (res.status === 401) {
    await clearToken();
    unauthorizedListeners.forEach((fn) => fn());
    throw new ApiError(json?.error ?? "Session expired. Please sign in again.", 401);
  }

  if (!res.ok || (json && json.ok === false)) {
    const extra = json?.retryAfterSec ? ` (retry in ${json.retryAfterSec}s)` : "";
    throw new ApiError((json?.error ?? `Request failed (${res.status})`) + extra, res.status);
  }

  return (json?.data ?? json) as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: RequestOptions["query"]) =>
    request<T>(path, { method: "GET", query }),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  del: <T = unknown>(path: string, query?: RequestOptions["query"]) =>
    request<T>(path, { method: "DELETE", query }),
  getRaw: (path: string, query?: RequestOptions["query"]) =>
    request<string>(path, { method: "GET", raw: true, query }),
};
