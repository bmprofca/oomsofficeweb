/**
 * Route keep-alive for list → details → Back/Forward.
 *
 * React Router unmounts the previous page on navigation, which resets
 * filters, pagination, loaded rows, and scroll. This module keeps a small
 * LRU of page trees mounted (hidden) so POP restores the exact UI and
 * skips a fresh API load.
 *
 * PUSH/REPLACE to a path remounts that path (sidebar / link clicks stay fresh).
 * Pages left via PUSH are pinned so a list is not evicted by many details.
 *
 * Socket-heavy routes should pass enabled={false} on KeepAlivePage.
 */

import React, {
  Suspense,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_RouteContext as RouteContext,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import RouteLoadingFallback from './RouteLoadingFallback';

const MAX_ENTRIES = 12;
const MAX_PINNED = 6;

const KEEP_ALIVE_EXCLUDE_PREFIXES = [
  '/login',
  '/register',
  '/invitation',
  '/broadcast/whatsapp/onechatting/live-chat',
  '/broadcast/whatsapp/web/session',
];

/**
 * Exact paths that must never be keep-alive cached.
 * Broadcast hub tabs are channel switchboards (not list→details); parking them
 * in the host + redirect races left a blank outlet until hard refresh.
 */
const KEEP_ALIVE_EXCLUDE_EXACT = new Set([
  '/broadcast',
  '/broadcast/whatsapp',
  '/broadcast/sms',
  '/broadcast/email-channel',
]);

export function isKeepAlivePath(pathname = '') {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (KEEP_ALIVE_EXCLUDE_EXACT.has(path)) return false;
  return !KEEP_ALIVE_EXCLUDE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/**
 * Profile pages use tab segments in the URL but one mounted shell per entity.
 * Without this, each tab path is a separate keep-alive entry → full remount + skeleton.
 */
function normalizeKeepAlivePathname(pathname = '') {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';

  let match = path.match(/^\/task\/profile\/([^/]+)(?:\/[^/]+)?$/);
  if (match) return `/task/profile/${match[1]}`;

  match = path.match(/^\/task\/([^/]+)$/);
  if (match && match[1] !== 'detailed') {
    return `/task/profile/${match[1]}`;
  }

  match = path.match(/^\/client\/profile\/([^/]+)(?:\/[^/]+)?$/);
  if (match) return `/client/profile/${match[1]}`;

  return path;
}

/** Transient query params that must not create a separate keep-alive cache entry. */
const KEEP_ALIVE_IGNORE_SEARCH_PARAMS = new Set(["duplicate"]);

function normalizeKeepAliveSearch(search = "") {
  const raw = String(search || "").trim();
  if (!raw) return "";

  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  KEEP_ALIVE_IGNORE_SEARCH_PARAMS.forEach((key) => params.delete(key));
  const normalized = params.toString();
  return normalized ? `?${normalized}` : "";
}

export function getKeepAliveKey(location) {
  if (!location) return '';
  const path = normalizeKeepAlivePathname(location.pathname);
  return `${path}${normalizeKeepAliveSearch(location.search)}`;
}

let version = 0;
const listeners = new Set();
const entries = new Map();
let order = [];
let pinned = [];
let activeKey = null;
let mountSeq = 0;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribeKeepAlive(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getKeepAliveVersion() {
  return version;
}

function touchOrder(key) {
  order = order.filter((item) => item !== key);
  order.push(key);
}

function pinKey(key) {
  if (!key || !entries.has(key)) return;
  entries.get(key).pinned = true;
  pinned = pinned.filter((item) => item !== key);
  pinned.push(key);
  while (pinned.length > MAX_PINNED) {
    const dropped = pinned.shift();
    const entry = dropped ? entries.get(dropped) : null;
    if (entry) entry.pinned = false;
  }
}

function evictIfNeeded() {
  while (entries.size > MAX_ENTRIES) {
    const victim =
      order.find((key) => key !== activeKey && !entries.get(key)?.pinned) ||
      order.find((key) => key !== activeKey);
    if (!victim) break;
    entries.delete(victim);
    order = order.filter((key) => key !== victim);
    pinned = pinned.filter((key) => key !== victim);
  }
}

/**
 * Mutates the module store during render. Host reads it later in the same commit.
 *
 * POP  → reuse parked entry (browser / hardware Back restores state).
 * PUSH/REPLACE → drop any parked entry for this path so the page remounts fresh
 *                (sidebar / in-app link clicks must not show stale forms).
 */
function ensureKeepAlive(key, node, navigationType, contexts) {
  if (!key || node == null) return;

  const isPop = navigationType === 'POP';
  const previousKey = activeKey;

  // In-app navigation to a previously parked path: discard the parked tree.
  // KeepAliveSlot must also remount (new mountId) — deleting the Map entry alone
  // is not enough because React would reuse the slot by path key and keep state.
  if (!isPop && entries.has(key) && previousKey !== key) {
    entries.delete(key);
    order = order.filter((item) => item !== key);
    pinned = pinned.filter((item) => item !== key);
  }

  if (!entries.has(key)) {
    mountSeq += 1;
    entries.set(key, {
      node,
      pinned: false,
      locationCtx: null,
      routeCtx: null,
      mountId: `${key}::${mountSeq}`,
    });
  }

  const entry = entries.get(key);
  if (contexts) {
    entry.locationCtx = contexts.locationCtx;
    entry.routeCtx = contexts.routeCtx;
  }

  touchOrder(key);

  if (previousKey && previousKey !== key && entries.has(previousKey)) {
    pinKey(previousKey);
  }

  activeKey = key;
  evictIfNeeded();
}

function deactivateKeepAliveHost() {
  activeKey = null;
}

function releaseKeepAlive(key) {
  if (!key || activeKey !== key) return;
  // Do not emit here. Emitting with activeKey=null paints a blank host frame
  // when the next route's KeepAlivePage has not claimed yet (or already claimed
  // during render — in which case this is a no-op above). Location changes and
  // the next page's layout effect emit() will refresh the host.
  activeKey = null;
}

export function clearKeepAliveCache() {
  if (entries.size === 0 && activeKey == null) return;
  entries.clear();
  order = [];
  pinned = [];
  activeKey = null;
  emit();
}

function captureScroll(root) {
  const elements = [];
  if (root) {
    const visit = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (node.scrollTop || node.scrollLeft) {
        elements.push({
          node,
          top: node.scrollTop,
          left: node.scrollLeft,
        });
      }
    };
    visit(root);
    root.querySelectorAll('*').forEach(visit);
  }

  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    elements,
  };
}

function applyScrollToNode(node, top, left) {
  if (!node) return;
  node.style.scrollBehavior = 'auto';
  node.scrollTop = top;
  node.scrollLeft = left;
}

function restoreScroll(snapshot) {
  if (!snapshot) return;
  const html = document.documentElement;
  const body = document.body;
  const prevHtml = html?.style.scrollBehavior;
  const prevBody = body?.style.scrollBehavior;
  if (html) html.style.scrollBehavior = 'auto';
  if (body) body.style.scrollBehavior = 'auto';
  snapshot.elements.forEach(({ node, top, left }) => {
    applyScrollToNode(node, top, left);
  });
  window.scrollTo(snapshot.windowX || 0, snapshot.windowY || 0);
  if (html) html.style.scrollBehavior = prevHtml;
  if (body) body.style.scrollBehavior = prevBody;
}

function disarmDomKeys(root) {
  if (!root) return;
  root.querySelectorAll('[id]').forEach((el) => {
    if (el.hasAttribute('data-ka-id')) return;
    el.setAttribute('data-ka-id', el.id);
    el.removeAttribute('id');
  });
  root.querySelectorAll('[name]').forEach((el) => {
    if (el.hasAttribute('data-ka-name')) return;
    el.setAttribute('data-ka-name', el.getAttribute('name') || '');
    el.removeAttribute('name');
  });
}

function restoreDomKeys(root) {
  if (!root) return;
  root.querySelectorAll('[data-ka-id]').forEach((el) => {
    el.id = el.getAttribute('data-ka-id') || '';
    el.removeAttribute('data-ka-id');
  });
  root.querySelectorAll('[data-ka-name]').forEach((el) => {
    el.setAttribute('name', el.getAttribute('data-ka-name') || '');
    el.removeAttribute('data-ka-name');
  });
}

function dismissOverlays() {
  // Dispatch on <body> (an Element). document as target has no .closest(),
  // and many outside-click handlers call event.target.closest(...).
  const target = document.body;
  if (!target) return;
  try {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    target.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0,
        view: window,
      })
    );
  } catch (_) {
    // Never let overlay cleanup crash route transitions.
  }
}

function KeepAliveSlot({ cacheKey, active, locationCtx, routeCtx, children }) {
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const [revealed, setRevealed] = useState(active);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    if (!active) {
      setRevealed(false);
      dismissOverlays();
      disarmDomKeys(root);
      root.setAttribute('inert', '');
      root.setAttribute('aria-hidden', 'true');
      return undefined;
    }

    restoreDomKeys(root);
    root.removeAttribute('inert');
    root.removeAttribute('aria-hidden');
    restoreScroll(scrollRef.current);
    void root.offsetHeight;
    restoreScroll(scrollRef.current);
    setRevealed(true);

    const save = () => {
      scrollRef.current = captureScroll(root);
    };
    root.addEventListener('scroll', save, true);
    root.addEventListener('click', save, true);
    window.addEventListener('scroll', save, true);

    return () => {
      const next = captureScroll(root);
      const hadScroll = (scrollRef.current?.elements?.length > 0) || scrollRef.current?.windowY;
      const nextHasScroll = next.elements.length > 0 || next.windowY;
      if (nextHasScroll || !hadScroll) {
        scrollRef.current = next;
      }
      root.removeEventListener('scroll', save, true);
      root.removeEventListener('click', save, true);
      window.removeEventListener('scroll', save, true);
    };
  }, [active, cacheKey]);

  const hiddenStyle = {
    position: 'fixed',
    inset: 0,
    visibility: 'hidden',
    pointerEvents: 'none',
    zIndex: -1,
  };

  let content = (
    <div
      ref={rootRef}
      data-keep-alive-key={cacheKey}
      style={
        !active
          ? hiddenStyle
          : revealed
            ? { display: 'block' }
            : { display: 'block', visibility: 'hidden' }
      }
    >
      {children}
    </div>
  );

  if (routeCtx) {
    content = <RouteContext.Provider value={routeCtx}>{content}</RouteContext.Provider>;
  }
  if (locationCtx) {
    content = <LocationContext.Provider value={locationCtx}>{content}</LocationContext.Provider>;
  }

  return content;
}

function KeepAliveHost() {
  const location = useLocation();
  const versionTick = useSyncExternalStore(
    subscribeKeepAlive,
    getKeepAliveVersion,
    getKeepAliveVersion
  );
  const slots = Array.from(entries.entries());
  const locationKey = getKeepAliveKey(location);
  const showKey = isKeepAlivePath(location.pathname) ? locationKey : null;
  const claimed = Boolean(showKey) && activeKey === showKey && entries.has(showKey);
  // KeepAlivePage returns null while content lives here — never leave that gap blank.
  const showOutletFallback = Boolean(showKey) && !claimed;

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !window.history?.scrollRestoration) return undefined;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous || 'auto';
    };
  }, []);

  return (
    <div data-keep-alive-host="" data-keep-alive-version={versionTick}>
      {showOutletFallback ? <RouteLoadingFallback /> : null}
      {slots.map(([key, entry]) => (
        <KeepAliveSlot
          key={entry.mountId || key}
          cacheKey={key}
          active={claimed && key === showKey}
          locationCtx={entry.locationCtx}
          routeCtx={entry.routeCtx}
        >
          {entry.node}
        </KeepAliveSlot>
      ))}
    </div>
  );
}

export function KeepAliveProvider({ children }) {
  return (
    <>
      {children}
      <Suspense fallback={<RouteLoadingFallback />}>
        <KeepAliveHost />
      </Suspense>
    </>
  );
}

export function KeepAlivePage({ children, enabled = true }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const locationCtx = useContext(LocationContext);
  const routeCtx = useContext(RouteContext);
  const key = getKeepAliveKey(location);
  const allow = enabled && isKeepAlivePath(location.pathname);

  if (allow) {
    ensureKeepAlive(key, children, navigationType, { locationCtx, routeCtx });
  } else {
    deactivateKeepAliveHost();
  }

  useLayoutEffect(() => {
    emit();
    if (!allow) return undefined;
    return () => releaseKeepAlive(key);
  }, [allow, key]);

  if (!allow) return children;
  return null;
}
