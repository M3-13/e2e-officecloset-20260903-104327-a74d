const DEFAULT_API_BASE = "http://localhost:8000";
const TOKEN_KEY = "auth_token";

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? DEFAULT_API_BASE;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    throw new ApiError(401, "Nicht angemeldet");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let detail = `Anfrage fehlgeschlagen (${response.status})`;
    if (data && typeof data === "object" && "detail" in (data as object)) {
      const raw = (data as { detail: unknown }).detail;
      if (typeof raw === "string") {
        detail = raw;
      }
    }
    throw new ApiError(response.status, detail);
  }

  return data as T;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let finalBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      finalBody = body;
    } else {
      finalHeaders["Content-Type"] = "application/json";
      finalBody = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  return handleResponse<T>(response);
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
