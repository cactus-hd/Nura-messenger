import type { ApiOptions, GenericResponse } from './types.js';

const API = 'api.php';

export async function api<T = GenericResponse>(action: string, options: ApiOptions = {}): Promise<T> {
  const url = new URL(API, window.location.href);
  url.searchParams.set('action', action);

  if (options.qs) {
    for (const [key, value] of Object.entries(options.qs)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options
  });

  let payload: GenericResponse = {};
  try {
    payload = (await response.json()) as GenericResponse;
  } catch {
    payload = {};
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload as T;
}
