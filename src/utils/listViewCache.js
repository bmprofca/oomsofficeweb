/**
 * Persist list-page snapshots so browser Back can restore filters/rows
 * if the route keep-alive cache was evicted.
 */

export const loadListViewCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const saveListViewCache = (key, data) => {
  try {
    const prev = loadListViewCache(key) || {};
    sessionStorage.setItem(key, JSON.stringify({ ...prev, ...data, savedAt: Date.now() }));
  } catch {
    // private mode / quota
  }
};

export const isBrowserBackNav = (navigationType) => navigationType === 'POP';

export const getScrollTopById = (elementId) => {
  if (typeof document === 'undefined' || !elementId) return 0;
  return document.getElementById(elementId)?.scrollTop || 0;
};

/** Instantly set scroll — no smooth behavior, no rAF (avoids visible scroll animation). */
export const restoreScrollTopById = (elementId, scrollTop = 0) => {
  if (typeof document === 'undefined' || !elementId) return false;
  const el = document.getElementById(elementId);
  if (!el) return false;

  const target = Number(scrollTop) || 0;
  const prevBehavior = el.style.scrollBehavior;
  el.style.scrollBehavior = 'auto';
  el.scrollTop = target;
  el.style.scrollBehavior = prevBehavior;
  return el.scrollTop === target || Math.abs(el.scrollTop - target) < 1;
};

/** Disable the browser's automatic scroll restoration while a list page is mounted. */
export const enableManualScrollRestoration = () => {
  if (typeof window === 'undefined' || !window.history?.scrollRestoration) return undefined;
  const previous = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';
  return () => {
    window.history.scrollRestoration = previous || 'auto';
  };
};
