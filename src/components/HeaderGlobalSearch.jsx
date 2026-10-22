import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiSearch,
  FiUsers,
  FiBriefcase,
  FiClipboard,
  FiUserCheck,
  FiUser,
  FiGrid,
  FiLoader,
  FiClock,
  FiCornerDownLeft,
  FiArrowUp,
  FiArrowDown,
  FiX,
} from "react-icons/fi";
import axios from "axios";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { filterSoftwareModules } from "../data/softwareModules";

/**
 * Global search — command palette.
 * Open: ⌘K / Ctrl+K anywhere, "/" when not typing in a field, Ctrl+/ (legacy).
 * Navigate: ↑ ↓ to move, Enter to open, Tab to cycle the type filter, Esc to close.
 */

const EMPTY_DATA = { clients: [], firms: [], tasks: [], staff: [], ca: [] };

const TYPE_META = {
  clients: { label: "Clients", icon: FiUsers, tone: "bg-indigo-50 text-indigo-600" },
  firms: { label: "Firms", icon: FiBriefcase, tone: "bg-sky-50 text-sky-600" },
  tasks: { label: "Tasks", icon: FiClipboard, tone: "bg-amber-50 text-amber-600" },
  staff: { label: "Staff", icon: FiUser, tone: "bg-emerald-50 text-emerald-600" },
  ca: { label: "CA", icon: FiUserCheck, tone: "bg-violet-50 text-violet-600" },
};
const TYPE_ORDER = ["clients", "firms", "tasks", "staff", "ca"];
const MODULE_TONE = "bg-slate-100 text-slate-600";

const RECENT_KEY = "ooms_recent_searches";
const RECENT_MAX = 6;

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
const SHORTCUT_LABEL = isMac ? "⌘K" : "Ctrl K";

function isActiveBranchAdmin() {
  try {
    const branchId = localStorage.getItem('branch_id');
    const branches = JSON.parse(localStorage.getItem('user_branches') || '[]');
    const branch = Array.isArray(branches) && branches.find((item) => String(item.branch_id) === String(branchId));
    return String(branch?.role || (branch?.owned ? 'admin' : localStorage.getItem('branch_role') || '')).toLowerCase() === 'admin';
  } catch (_) { return String(localStorage.getItem('branch_role') || '').toLowerCase() === 'admin'; }
}

function readRecent() {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((s) => typeof s === "string").slice(0, RECENT_MAX) : [];
  } catch (_) {
    return [];
  }
}

function writeRecent(list) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch (_) {
    /* storage unavailable — recent searches simply aren't remembered */
  }
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function Kbd({ children, className = "" }) {
  return (
    <kbd
      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-slate-200 bg-white px-1.5 font-sans text-[10.5px] font-semibold text-slate-500 ${className}`}
    >
      {children}
    </kbd>
  );
}

function ResultItem({ item, active, onSelect, onHover, id }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      onClick={() => onSelect(item)}
      onMouseMove={onHover}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        active ? "bg-indigo-50" : "hover:bg-slate-50"
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13.5px] font-medium ${active ? "text-indigo-700" : "text-slate-800"}`}>
          {item.title}
        </span>
        {item.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-slate-500">{item.subtitle}</span>
        ) : null}
      </span>
      {item.badge ? (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
          {item.badge}
        </span>
      ) : null}
      {active ? <FiCornerDownLeft className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden /> : null}
    </button>
  );
}

export default function HeaderGlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(EMPTY_DATA);
  const [activeType, setActiveType] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState(() => (typeof window !== "undefined" ? readRecent() : []));
  const debouncedQuery = useDebouncedValue(query, 180);
  const trimmed = query.trim();

  // `openRef` mirrors `open` so the single global key handler never reads a stale value.
  const openRef = useRef(false);
  const restoreFocusRef = useRef(null);

  // Keep the portal mounted just long enough for the close animation. The closing layer
  // never takes clicks, and a fallback timeout drops it even if animation frames are paused.
  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => {
    if (open) {
      setPortalMounted(true);
      return undefined;
    }
    const t = window.setTimeout(() => {
      if (!openRef.current) setPortalMounted(false);
    }, 320);
    return () => window.clearTimeout(t);
  }, [open]);

  const openPalette = useCallback(() => {
    if (openRef.current) return;
    const active = document.activeElement;
    restoreFocusRef.current = active && active !== document.body ? active : null;
    openRef.current = true;
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    setQuery("");
    setActiveType("all");
    const target = restoreFocusRef.current;
    restoreFocusRef.current = null;
    // Return focus to where the user was, after the overlay unmounts.
    window.setTimeout(() => {
      if (target && typeof target.focus === "function" && document.contains(target)) {
        target.focus({ preventScroll: true });
      }
    }, 0);
  }, []);

  const toggle = useCallback(() => {
    if (openRef.current) close();
    else openPalette();
  }, [close, openPalette]);

  // Focus the input whenever the palette opens
  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  // One global handler for every shortcut, so behaviour never depends on where focus is.
  //   ⌘K / Ctrl+K and ⌘/ / Ctrl+/  → toggle open/close
  //   "/" (not typing in a field)   → open
  //   Esc (while open, anywhere)    → close
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.isComposing) return;
      const key = e.key;
      const mod = (e.metaKey || e.ctrlKey) && !e.altKey;
      const isK = key === "k" || key === "K" || e.code === "KeyK";
      const isSlash = key === "/" || e.code === "Slash";

      if (mod && (isK || isSlash)) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
        return;
      }
      if (key === "Escape" && openRef.current) {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (!mod && !e.altKey && !e.shiftKey && isSlash && !openRef.current && !isTypingTarget(e.target)) {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [close, openPalette, toggle]);

  // Close if the route changes underneath (e.g. browser back button)
  useEffect(() => {
    const onPop = () => close();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [close]);

  // Fetch records
  useEffect(() => {
    if (!open) return undefined;
    if (!debouncedQuery.trim()) {
      setData(EMPTY_DATA);
      setActiveType("all");
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const headers = await getHeaders();
        if (!headers) return;
        const response = await axios.get(`${API_BASE_URL}/utils/global-search`, {
          headers,
          params: { q: debouncedQuery.trim() },
        });
        if (cancelled) return;
        const payload = response.data?.data || EMPTY_DATA;
        setData({
          clients: payload.clients || [],
          firms: payload.firms || [],
          tasks: payload.tasks || [],
          staff: payload.staff || [],
          ca: payload.ca || [],
        });
      } catch {
        if (!cancelled) setData(EMPTY_DATA);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const modules = useMemo(
    () => filterSoftwareModules(query, trimmed ? 8 : 8).filter((module) => !module.adminOnly || isActiveBranchAdmin()),
    [query, trimmed],
  );

  const recordGroups = useMemo(
    () =>
      TYPE_ORDER.map((key) => ({
        key,
        ...TYPE_META[key],
        items: (Array.isArray(data[key]) ? data[key] : []).map((r) => ({
          id: `${key}-${r.id}`,
          title: r.title,
          subtitle: r.subtitle,
          path: r.path,
          icon: TYPE_META[key].icon,
          tone: TYPE_META[key].tone,
          badge: TYPE_META[key].label,
          kind: "record",
        })),
      })).filter((g) => g.items.length > 0),
    [data],
  );

  useEffect(() => {
    if (activeType !== "all" && !recordGroups.some((g) => g.key === activeType)) {
      setActiveType("all");
    }
  }, [activeType, recordGroups]);

  // Sections shown in the list, in order; keyboard index runs across all of them
  const sections = useMemo(() => {
    const out = [];
    if (!trimmed) {
      if (recent.length) {
        out.push({
          key: "recent",
          label: "Recent searches",
          items: recent.map((q) => ({
            id: `recent-${q}`,
            title: q,
            icon: FiClock,
            tone: MODULE_TONE,
            kind: "recent",
            query: q,
          })),
        });
      }
      out.push({
        key: "modules",
        label: "Jump to",
        items: modules.map((m) => ({
          id: `mod-${m.path}`,
          title: m.title,
          subtitle: m.group,
          path: m.path,
          icon: FiGrid,
          tone: MODULE_TONE,
          kind: "module",
        })),
      });
      return out;
    }
    const groups = activeType === "all" ? recordGroups : recordGroups.filter((g) => g.key === activeType);
    groups.forEach((g) => out.push({ key: g.key, label: g.label, items: g.items }));
    if (activeType === "all" && modules.length) {
      out.push({
        key: "modules",
        label: "Modules",
        items: modules.map((m) => ({
          id: `mod-${m.path}`,
          title: m.title,
          subtitle: m.group,
          path: m.path,
          icon: FiGrid,
          tone: MODULE_TONE,
          kind: "module",
        })),
      });
    }
    return out;
  }, [trimmed, recent, modules, activeType, recordGroups]);

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const recordCount = recordGroups.reduce((sum, g) => sum + g.items.length, 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, activeType, open]);

  // Keep the active row in view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const remember = useCallback((q) => {
    const value = String(q || "").trim();
    if (!value) return;
    setRecent((prev) => {
      const next = [value, ...prev.filter((p) => p.toLowerCase() !== value.toLowerCase())].slice(0, RECENT_MAX);
      writeRecent(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    writeRecent([]);
  }, []);

  const select = useCallback(
    (item) => {
      if (!item) return;
      if (item.kind === "recent") {
        setQuery(item.query);
        inputRef.current?.focus();
        return;
      }
      if (!item.path) return;
      if (trimmed && item.kind === "record") remember(trimmed);
      setQuery("");
      close();
      navigate(item.path);
    },
    [close, navigate, remember, trimmed],
  );

  const typeTabs = useMemo(
    () => [{ key: "all", label: "All", count: recordCount }, ...recordGroups.map((g) => ({ key: g.key, label: g.label, count: g.items.length }))],
    [recordCount, recordGroups],
  );

  const onInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flatItems.length ? (i + 1) % flatItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0));
    } else if (e.key === "Enter") {
      if (e.nativeEvent?.isComposing) return;
      e.preventDefault();
      select(flatItems[activeIndex]);
    } else if (e.key === "Tab" && trimmed && typeTabs.length > 1) {
      e.preventDefault();
      const idx = typeTabs.findIndex((t) => t.key === activeType);
      const next = e.shiftKey ? (idx - 1 + typeTabs.length) % typeTabs.length : (idx + 1) % typeTabs.length;
      setActiveType(typeTabs[next].key);
    }
  };

  let runningIndex = -1;

  return (
    <div className="flex min-w-0 max-w-md flex-1">
      <button
        type="button"
        onClick={openPalette}
        aria-label={`Search (${SHORTCUT_LABEL})`}
        className="group flex h-9 w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-[13px] text-slate-400 transition-colors hover:border-slate-300 hover:bg-white"
      >
        <FiSearch className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-500" />
        <span className="min-w-0 flex-1 truncate">Search clients, firms, tasks, modules…</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>{SHORTCUT_LABEL}</Kbd>
        </span>
      </button>

      {portalMounted && typeof document !== "undefined"
        ? createPortal(
            <div className={open ? undefined : "pointer-events-none"}>
            <AnimatePresence
              onExitComplete={() => {
                if (!openRef.current) setPortalMounted(false);
              }}
            >
            {open ? (
              <div
                key="global-search"
                className="fixed inset-0 z-[99998] flex items-start justify-center px-3 pt-[10vh] sm:px-4"
                onMouseDown={(e) => {
                  // Click anywhere outside the panel closes it
                  if (!e.target.closest("[data-global-search-panel]")) close();
                }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                  aria-hidden="true"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Global search"
                  data-global-search-panel
                  className="relative flex max-h-[min(72vh,600px)] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                >
                  {/* Input */}
                  <div className="flex items-center gap-3 border-b border-slate-200 px-4">
                    {loading ? (
                      <FiLoader className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                    ) : (
                      <FiSearch className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      autoComplete="off"
                      spellCheck={false}
                      role="combobox"
                      aria-expanded="true"
                      aria-controls="gs-listbox"
                      aria-activedescendant={flatItems[activeIndex] ? `gs-opt-${activeIndex}` : undefined}
                      placeholder="Search clients, firms, tasks, staff, CA or a module"
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onInputKeyDown}
                      className="h-14 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          inputRef.current?.focus();
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Clear search"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={close}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Close search"
                      title="Close (Esc)"
                    >
                      Esc
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Type filter */}
                  {trimmed && recordCount > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2 scrollbar-hide" role="tablist" aria-label="Filter by type">
                      {typeTabs.map((t) => {
                        const active = t.key === activeType;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => {
                              setActiveType(t.key);
                              inputRef.current?.focus();
                            }}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                              active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {t.label}
                            <span className={`tabular-nums ${active ? "text-white/80" : "text-slate-400"}`}>{t.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Results */}
                  <div ref={listRef} id="gs-listbox" role="listbox" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                    {trimmed && loading && recordCount === 0 && sections.every((s) => s.key === "modules") ? (
                      <div className="flex items-center gap-2 px-3 pb-1 pt-2 text-xs text-slate-500">
                        <FiLoader className="h-3.5 w-3.5 animate-spin" />
                        Searching records…
                      </div>
                    ) : null}

                    {trimmed && !loading && flatItems.length === 0 ? (
                      <div className="flex flex-col items-center px-6 py-12 text-center">
                        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FiSearch className="h-5 w-5" />
                        </span>
                        <p className="text-sm font-semibold text-slate-800">No results for “{trimmed}”</p>
                        <p className="mt-1 text-xs text-slate-500">Try a name, mobile number, PAN, GSTIN or task ID.</p>
                      </div>
                    ) : null}

                    {sections.map((section) => (
                      <div key={section.key} className="mb-1.5">
                        <div className="flex items-center justify-between px-3 pb-1 pt-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{section.label}</p>
                          {section.key === "recent" ? (
                            <button type="button" onClick={clearRecent} className="text-[11px] font-semibold text-slate-400 hover:text-slate-700">
                              Clear
                            </button>
                          ) : null}
                        </div>
                        {section.items.map((item) => {
                          runningIndex += 1;
                          const idx = runningIndex;
                          return (
                            <div key={item.id} data-index={idx}>
                              <ResultItem
                                id={`gs-opt-${idx}`}
                                item={item}
                                active={idx === activeIndex}
                                onSelect={select}
                                onHover={() => setActiveIndex(idx)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Footer hints */}
                  <div className="hidden items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11.5px] text-slate-500 sm:flex">
                    <span className="inline-flex items-center gap-1.5">
                      <Kbd><FiArrowUp className="h-3 w-3" /></Kbd>
                      <Kbd><FiArrowDown className="h-3 w-3" /></Kbd>
                      to move
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Kbd><FiCornerDownLeft className="h-3 w-3" /></Kbd>
                      to open
                    </span>
                    {trimmed && recordCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Kbd>Tab</Kbd>
                        to filter
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <Kbd>Esc</Kbd>
                      to close
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <Kbd>{SHORTCUT_LABEL}</Kbd>
                      <span className="text-slate-400">or</span>
                      <Kbd>{isMac ? "⌘/" : "Ctrl /"}</Kbd>
                      to toggle
                    </span>
                  </div>
                </motion.div>
              </div>
            ) : null}
            </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
