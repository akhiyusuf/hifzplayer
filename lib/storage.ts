export function getStore<T = unknown>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function cachedGet<T = unknown>(key: string, maxAgeMs: number): T | null {
  const hit = getStore<{ t: number; d: T }>(key);
  if (hit && hit.t && Date.now() - hit.t < maxAgeMs) return hit.d;
  return null;
}

export function cachedSet(key: string, data: unknown) {
  setStore(key, { t: Date.now(), d: data });
}
