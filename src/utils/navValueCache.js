import { useCallback, useState } from 'react';

/**
 * Last-known values for the header / sidebar (pending bills, notifications, wallet balance).
 *
 * Every page mounts its own Header + Sidebar, so these values used to start at 0 and pop in
 * once the API answered. They now start from the last value saved in localStorage and are
 * replaced as soon as the live fetch returns. Keys are scoped per user + branch so a branch
 * switch never shows another branch's numbers.
 */

const PREFIX = 'ooms_nav_cache:';

function scopedKey(name) {
  const user = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
  const branch = localStorage.getItem('branch_id') || '';
  return `${PREFIX}${user}:${branch}:${name}`;
}

export function readNavValue(name, fallback) {
  try {
    const raw = localStorage.getItem(scopedKey(name));
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeNavValue(name, value) {
  try {
    localStorage.setItem(scopedKey(name), JSON.stringify(value));
  } catch {
    // private mode / quota — the live value still renders
  }
}

/** Drop every cached nav value (logout / session expiry). */
export function clearNavValueCache() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/** useState that starts from the cached value and saves every update. */
export function useNavCachedState(name, fallback) {
  const [value, setValue] = useState(() => readNavValue(name, fallback));

  const setAndStore = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeNavValue(name, resolved);
        return resolved;
      });
    },
    [name]
  );

  return [value, setAndStore];
}
