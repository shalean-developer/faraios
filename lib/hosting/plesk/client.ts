import type { PleskCredentials } from "@/lib/hosting/plesk/config";

export type PleskApiResult<T = Record<string, unknown>> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; data?: unknown };

function authHeader(creds: PleskCredentials): string {
  const token = Buffer.from(`${creds.username}:${creds.secret}`).toString("base64");
  return `Basic ${token}`;
}

export async function pleskRequest<T = Record<string, unknown>>(
  creds: PleskCredentials,
  method: string,
  path: string,
  body?: unknown
): Promise<PleskApiResult<T>> {
  const url = `${creds.url}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader(creds),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body != null ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!res.ok) {
      const errMsg =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : `Plesk API error (${res.status})`;
      return { ok: false, error: errMsg, status: res.status, data };
    }

    return { ok: true, data: (data ?? {}) as T, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Plesk request failed",
      status: 0,
    };
  }
}
