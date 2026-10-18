// Every backend call goes through the same-origin proxy configured in
// next.config.ts — never a direct cross-origin call to the NestJS server.
export const API_BASE = "/api/backend";

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  // `data` is `T | null` because a 2xx response with an empty or non-JSON
  // body parses to `null` (see `apiFetch`). Callers must handle the null
  // case rather than assuming `data` is always present.
  data: T | null;
}

export interface ApiFailure {
  ok: false;
  status: number;
  message: string;
  body: unknown;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

// Thin, typed wrapper around the hand-rolled `fetch(`${API_BASE}...`,
// {credentials:'include'})` + `res.json()` + `!res.ok` pattern that used to
// be independently reimplemented at every one of ~70 call sites across the
// app. `credentials: 'include'` is the default (matching the vast majority
// of real usage — session-bearing endpoints) and callers pass
// `credentials: 'omit'` for the few genuinely public endpoints (a public
// pay-link lookup, the testnet faucet). A JSON body is stringified and
// given the right content-type automatically; a non-JSON response body
// (none exist today, but `res.json()` throwing shouldn't crash the caller)
// degrades to `body: null` rather than throwing.
//
// NOTE: on a 2xx response, `data` is typed `T | null` — an empty or
// non-JSON body parses to `null` (via `.catch(() => null)`), so callers must
// not assume `data` is non-null. Treat a null `data` on a 2xx response as a
// failed/empty result (e.g. guard with `if (!result.data) ...`) before
// accessing nested fields; TypeScript will flag unchecked `.data.<field>`
// access on an `ApiResult`.
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const { body, headers, credentials, ...rest } = init;
  const isJsonBody = typeof body === "string" || (body !== undefined && !(body instanceof FormData));
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: credentials ?? "include",
    headers: isJsonBody ? { "Content-Type": "application/json", ...headers } : headers,
    body,
    ...rest,
  });
  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof (parsed as { message?: unknown } | null)?.message === "string"
      ? (parsed as { message: string }).message
      : `request failed (${res.status})`;
    return { ok: false, status: res.status, message, body: parsed };
  }
  return { ok: true, status: res.status, data: parsed as T };
}

export function apiPost<T = unknown>(path: string, json?: unknown, init: RequestInit = {}): Promise<ApiResult<T>> {
  return apiFetch<T>(path, { ...init, method: "POST", body: json !== undefined ? JSON.stringify(json) : undefined });
}

export function apiPatch<T = unknown>(path: string, json?: unknown, init: RequestInit = {}): Promise<ApiResult<T>> {
  return apiFetch<T>(path, { ...init, method: "PATCH", body: json !== undefined ? JSON.stringify(json) : undefined });
}

export function apiDelete<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  return apiFetch<T>(path, { ...init, method: "DELETE" });
}
