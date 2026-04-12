const DEFAULT_TIMEOUT = 15000;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(url, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new ApiError(
        data?.error || `Request failed (${res.status})`,
        res.status,
        data
      );
    }

    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error', 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function apiJson(url, options = {}) {
  const res = await apiFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json();
}

export function isOnline() {
  return navigator.onLine;
}
