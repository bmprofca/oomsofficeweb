import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
} from "react-icons/fi";
import axios from "axios";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { filterSoftwareModules } from "../data/softwareModules";

const EMPTY_DATA = {
  clients: [],
  firms: [],
  tasks: [],
  staff: [],
  ca: [],
  agents: [],
};

const TYPE_META = {
  clients: { label: "Clients", icon: FiUsers },
  firms: { label: "Firms", icon: FiBriefcase },
  tasks: { label: "Tasks", icon: FiClipboard },
  staff: { label: "Staff", icon: FiUser },
  ca: { label: "CA", icon: FiUserCheck },
  agents: { label: "Agents", icon: FiUsers },
};

const TYPE_ORDER = ["clients", "firms", "tasks", "staff", "ca", "agents"];

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

function ResultRow({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-indigo-50"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function TypeFilterChips({ types, activeType, totalCount, onChange }) {
  if (!types.length) return null;

  const chipClass = (active) =>
    `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
      active
        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60"
    }`;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5 px-1">
      <button
        type="button"
        className={chipClass(activeType === "all")}
        onClick={() => onChange("all")}
      >
        All
        <span className="text-[10px] text-slate-400">{totalCount}</span>
      </button>
      {types.map((type) => (
        <button
          key={type.key}
          type="button"
          className={chipClass(activeType === type.key)}
          onClick={() => onChange(type.key)}
        >
          {type.label}
          <span className="text-[10px] text-slate-400">
            {type.items.length}
          </span>
        </button>
      ))}
    </div>
  );
}

function SearchResults({
  query,
  loading,
  groupedRecords,
  visibleRecords,
  typeOptions,
  activeType,
  onTypeChange,
  modules,
  onGo,
}) {
  const recordCount = groupedRecords.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  const visibleCount = visibleRecords.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)]">
      <div
        className={`min-h-0 overflow-y-auto border-b border-slate-100 px-3 py-3 md:border-b-0 md:border-r ${SCROLL_HIDE}`}
      >
        <p className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Records
          {loading ? (
            <FiLoader className="h-3 w-3 animate-spin text-indigo-500" />
          ) : null}
        </p>
        {!query.trim() ? (
          <p className="px-1 py-8 text-center text-xs text-slate-400">
            Type to search clients, firms, tasks, staff, CA, and agents
          </p>
        ) : loading && recordCount === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <FiLoader className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : recordCount === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-slate-400">
            No matching records
          </p>
        ) : (
          <>
            <TypeFilterChips
              types={typeOptions}
              activeType={activeType}
              totalCount={recordCount}
              onChange={onTypeChange}
            />
            {visibleCount === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-slate-400">
                No records in this type
              </p>
            ) : (
              <div className="space-y-3">
                {visibleRecords.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.key}>
                      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => (
                          <ResultRow
                            key={`${group.key}-${item.id}`}
                            icon={Icon}
                            title={item.title}
                            subtitle={item.subtitle}
                            onClick={() => onGo(item.path)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <div className={`min-h-0 overflow-y-auto px-3 py-3 ${SCROLL_HIDE}`}>
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Modules
        </p>
        {modules.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-slate-400">
            No matching modules
          </p>
        ) : (
          <div className="space-y-0.5">
            {modules.map((mod) => (
              <ResultRow
                key={mod.path}
                icon={FiGrid}
                title={mod.title}
                subtitle={mod.group}
                onClick={() => onGo(mod.path)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HeaderGlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(EMPTY_DATA);
  const [activeType, setActiveType] = useState("all");
  const [panelStyle, setPanelStyle] = useState({
    top: 64,
    left: 12,
    width: 720,
  });
  const [backdropStyle, setBackdropStyle] = useState({ top: 64, left: 0 });
  const debouncedQuery = useDebouncedValue(query, 180);

  const modules = useMemo(
    () => filterSoftwareModules(query, query.trim() ? 24 : 14),
    [query],
  );

  const groupedRecords = useMemo(
    () =>
      TYPE_ORDER.map((key) => ({
        key,
        ...TYPE_META[key],
        items: Array.isArray(data[key]) ? data[key] : [],
      })).filter((group) => group.items.length > 0),
    [data],
  );

  const visibleRecords = useMemo(
    () =>
      activeType === "all"
        ? groupedRecords
        : groupedRecords.filter((group) => group.key === activeType),
    [activeType, groupedRecords],
  );

  useEffect(() => {
    if (activeType === "all") return;
    if (!groupedRecords.some((group) => group.key === activeType))
      setActiveType("all");
  }, [activeType, groupedRecords]);

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, []);

  const go = useCallback(
    (path) => {
      if (!path) return;
      setQuery("");
      close();
      navigate(path);
    },
    [close, navigate],
  );

  const updatePanelStyle = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const headerEl = document.querySelector("header");
    const sidebarEl = document.querySelector("[data-app-sidebar]");
    const vw = window.innerWidth;
    const width = Math.round(Math.min(vw * 0.76, vw - 24));
    const left = Math.round((vw - width) / 2);
    const headerBottom = Math.round(headerEl?.getBoundingClientRect().bottom ?? 64);
    const sidebarRight =
      vw >= 768 && sidebarEl
        ? Math.round(sidebarEl.getBoundingClientRect().right)
        : 0;
    setPanelStyle({
      top: Math.round((rect?.bottom || headerBottom) + 8),
      left,
      width,
    });
    setBackdropStyle({ top: headerBottom, left: sidebarRight });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePanelStyle();
    const sidebarEl = document.querySelector("[data-app-sidebar]");
    const observer =
      sidebarEl && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updatePanelStyle)
        : null;
    observer?.observe(sidebarEl);
    window.addEventListener("resize", updatePanelStyle);
    window.addEventListener("scroll", updatePanelStyle, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePanelStyle);
      window.removeEventListener("scroll", updatePanelStyle, true);
    };
  }, [open, updatePanelStyle]);

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
        const response = await axios.get(
          `${API_BASE_URL}/utils/global-search`,
          {
            headers,
            params: { q: debouncedQuery.trim() },
          },
        );
        if (cancelled) return;
        const payload = response.data?.data || EMPTY_DATA;
        setData({
          clients: payload.clients || [],
          firms: payload.firms || [],
          tasks: payload.tasks || [],
          staff: payload.staff || [],
          ca: payload.ca || [],
          agents: payload.agents || [],
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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      const isSlash = e.key === "/" || e.code === "Slash" || e.key === "?";
      if (!isSlash || !(e.ctrlKey || e.metaKey) || e.altKey) return;
      e.preventDefault();
      setOpen(true);
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [close]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!open) return;
      if (wrapRef.current?.contains(event.target)) return;
      if (event.target.closest("[data-global-search-panel]")) return;
      close();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  return (
    <div ref={wrapRef} className="relative min-w-0 max-w-md flex-1">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        autoComplete="off"
        placeholder="Search clients, tasks, modules..."
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-8 w-full rounded-lg border border-slate-200/80 bg-white pl-9 pr-[3.25rem] text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1 py-px text-[10px] font-medium text-slate-400 xl:inline-block">
        Ctrl+/
      </kbd>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.button
                key="gs-backdrop"
                type="button"
                aria-label="Close search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed z-[99998] bg-slate-900/45 backdrop-blur-md"
                style={{
                  top: backdropStyle.top,
                  left: backdropStyle.left,
                  right: 0,
                  bottom: 0,
                }}
                onClick={close}
              />
            ) : null}
            {open ? (
              <motion.div
                key="gs-panel"
                data-global-search-panel
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[99999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]"
                style={{
                  top: panelStyle.top,
                  left: panelStyle.left,
                  width: panelStyle.width,
                  maxHeight: "min(70vh, 32rem)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-semibold text-slate-800">
                    Global search
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Esc to close
                  </span>
                </div>
                <SearchResults
                  query={query}
                  loading={loading}
                  groupedRecords={groupedRecords}
                  visibleRecords={visibleRecords}
                  typeOptions={groupedRecords}
                  activeType={activeType}
                  onTypeChange={setActiveType}
                  modules={modules}
                  onGo={go}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
