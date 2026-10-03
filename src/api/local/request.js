const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const TOKEN_KEY = "meomap_local_token";
const REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_REQUEST_TIMEOUT_MS || 30000,
);

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(value) {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

export function apiBase() {
  return API_BASE;
}

export async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const authToken = getToken();
  if (options.auth !== false && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(options.timeoutMs || REQUEST_TIMEOUT_MS),
  );

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers,
      signal: options.signal || controller.signal,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Yêu cầu hết thời gian chờ.");
      timeoutError.code = "REQUEST_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.error || payload.message || `HTTP ${response.status}`,
    );
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload;
}
