import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/*
  SearchableSelect — Single-item searchable select component.

  Props:
  ┌──────────────────┬─────────────┬──────────────────────────────────────────────────┐
  │ Prop             │ Type        │ Description                                      │
  ├──────────────────┼─────────────┼──────────────────────────────────────────────────┤
  │ options          │ Array       │ [{ value, label }] list of items                 │
  │ value            │ any | null  │ Controlled selected value                        │
  │ onChange         │ Function    │ Called with selected value (or null on clear)    │
  │ placeholder      │ string      │ Trigger placeholder when nothing selected        │
  │ searchPlaceholder│ string      │ Placeholder inside the search input              │
  │ label            │ string      │ Label shown above the trigger                    │
  │ hint             │ string      │ Helper text below the trigger                    │
  │ error            │ string      │ Error message — applies error styling            │
  │ disabled         │ boolean     │ Disables the whole component                     │
  │ clearable        │ boolean     │ Show ✕ button when a value is selected           │
  │ noOptionsText    │ string      │ Text shown when search returns no results        │
  │ className        │ string      │ Extra className on the root wrapper              │
  │ style            │ object      │ Inline styles on the root wrapper                │
  └──────────────────┴─────────────┴──────────────────────────────────────────────────┘

  Usage:
  ──────
  const options = [
    { value: "in", label: "India" },
    { value: "us", label: "United States" },
    { value: "gb", label: "United Kingdom" },
  ];

  <SelectInput
    options={options}
    value={val}
    onChange={setVal}
    placeholder="Select a country"
    label="Country"
    clearable
  />
*/

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap');

  /* Variables on :root so the portaled dropdown (rendered in body) can inherit them */
  :root {
    --ssx-font:               'Geist', system-ui, sans-serif;
    --ssx-radius:             8px;
    --ssx-radius-opt:         5px;
    --ssx-bg:                 #ffffff;
    --ssx-border:             #d9dde8;
    --ssx-border-hover:       #b0b8cc;
    --ssx-border-focus:       #4361ee;
    --ssx-ring:               rgba(67,97,238,0.13);
    --ssx-text:               #111827;
    --ssx-muted:              #6b7280;
    --ssx-placeholder:        #b0b8c8;
    --ssx-accent:             #4361ee;
    --ssx-opt-hover-bg:       #f4f5fb;
    --ssx-opt-sel-bg:         #eef0fd;
    --ssx-opt-sel-text:       #3451d1;
    --ssx-shadow:             0 4px 10px rgba(0,0,0,0.06), 0 16px 32px rgba(67,97,238,0.09);
    --ssx-divider:            #eff1f7;
    --ssx-error:              #dc2626;
    --ssx-error-ring:         rgba(220,38,38,0.12);
  }

  .ssx {
    font-family: var(--ssx-font);
    position: relative;
    width: 100%;
    box-sizing: border-box;
  }

  .ssx *, .ssx *::before, .ssx *::after { box-sizing: border-box; }

  /* Label */
  .ssx-label {
    display: block;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ssx-muted);
    margin-bottom: 5px;
    letter-spacing: 0.01em;
    transition: color 0.15s;
  }
  .ssx:focus-within .ssx-label { color: var(--ssx-accent); }

  /* Trigger */
  .ssx-trigger {
    width: 100%;
    height: 40px;
    background: var(--ssx-bg);
    border: 1.5px solid var(--ssx-border);
    border-radius: var(--ssx-radius);
    padding: 0 6px 0 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    user-select: none;
  }
  .ssx-trigger:hover:not(.ssx-trigger--disabled) {
    border-color: var(--ssx-border-hover);
  }
  .ssx-trigger--open, .ssx-trigger:focus:not(.ssx-trigger--disabled) {
    border-color: var(--ssx-border-focus);
    box-shadow: 0 0 0 3px var(--ssx-ring);
  }
  .ssx-trigger--error {
    border-color: var(--ssx-error) !important;
    box-shadow: 0 0 0 3px var(--ssx-error-ring) !important;
  }
  .ssx-trigger--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f9fafb;
  }

  /* Trigger text */
  .ssx-text {
    flex: 1;
    font-size: 13.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    text-align: left;
  }
  .ssx-text--empty  { color: var(--ssx-placeholder); font-weight: 400; }
  .ssx-text--filled { color: var(--ssx-text);        font-weight: 500; }

  /* Icon buttons */
  .ssx-icon-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: var(--ssx-muted);
    transition: color 0.12s, background 0.12s;
  }
  .ssx-icon-btn--clear:hover { color: var(--ssx-error); background: rgba(220,38,38,0.07); }
  .ssx-icon-btn--chevron { pointer-events: none; }
  .ssx-icon-btn--chevron svg { transition: transform 0.2s cubic-bezier(0.4,0,0.2,1); }
  .ssx-trigger--open .ssx-icon-btn--chevron svg { transform: rotate(180deg); }

  /* Dropdown — rendered via portal, coords set via inline style */
  .ssx-dropdown {
    position: fixed;
    background: var(--ssx-bg);
    border: 1.5px solid var(--ssx-border);
    border-radius: var(--ssx-radius);
    box-shadow: var(--ssx-shadow);
    z-index: 99999;
    overflow: hidden;
    animation: ssx-pop 0.15s cubic-bezier(0.4,0,0.2,1);
    transform-origin: top center;
  }
  .ssx-dropdown--flip {
    transform-origin: bottom center;
    animation: ssx-pop-up 0.15s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes ssx-pop {
    from { opacity: 0; transform: scaleY(0.93) translateY(-5px); }
    to   { opacity: 1; transform: scaleY(1)    translateY(0); }
  }
  @keyframes ssx-pop-up {
    from { opacity: 0; transform: scaleY(0.93) translateY(5px); }
    to   { opacity: 1; transform: scaleY(1)    translateY(0); }
  }

  /* Search row */
  .ssx-search {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--ssx-divider);
  }
  .ssx-search-ico { flex-shrink: 0; color: var(--ssx-muted); display: flex; }
  .ssx-search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    font-family: var(--ssx-font);
    color: var(--ssx-text);
    min-width: 0;
  }
  .ssx-search-input::placeholder { color: var(--ssx-placeholder); }

  /* Options list */
  .ssx-list {
    max-height: 210px;
    overflow-y: auto;
    padding: 4px;
    scrollbar-width: none;
    scrollbar-gutter: stable;
  }
  .ssx-list::-webkit-scrollbar { display: none; }

  /* Option */
  .ssx-option {
    padding: 8px 10px;
    border-radius: var(--ssx-radius-opt);
    font-size: 13.5px;
    color: var(--ssx-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    transition: background 0.1s;
    user-select: none;
  }
  .ssx-option:hover, .ssx-option--focused { background: var(--ssx-opt-hover-bg); }
  .ssx-option--selected {
    background: var(--ssx-opt-sel-bg);
    color: var(--ssx-opt-sel-text);
    font-weight: 500;
  }
  .ssx-option-check { flex-shrink: 0; color: var(--ssx-accent); display: flex; }

  /* Empty */
  .ssx-empty {
    padding: 20px 12px;
    text-align: center;
    font-size: 13px;
    color: var(--ssx-muted);
  }

  /* Hint / Error */
  .ssx-hint {
    margin-top: 5px;
    font-size: 12px;
    color: var(--ssx-muted);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ssx-hint--error { color: var(--ssx-error); }
`;

/* ── Tiny SVG icons ── */
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="5.5" cy="5.5" r="3.75" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8.75 8.75L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconClose = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const IconChevron = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M3 5L6.5 8.5L10 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 6.5L5 9.5L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ══════════════════════════════════════════
   SelectInput
═══════════════════════════════════════════ */
export default function SelectInput({
  options = [],
  value = null,
  onChange,
  placeholder = "Select an option…",
  searchPlaceholder = "Search…",
  label,
  hint,
  error,
  disabled = false,
  clearable = true,
  noOptionsText = "No options found",
  className = "",
  style = {},
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocused] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, flipUp: false });

  const rootRef     = useRef(null);
  const triggerRef  = useRef(null);
  const searchRef   = useRef(null);
  const listRef     = useRef(null);
  const dropdownRef = useRef(null);

  /* Recalculate fixed portal position from the trigger's bounding rect.
     For below: anchor via `top`. For above (flip): anchor via `bottom` so the
     dropdown grows upward from the trigger — actual height drives the placement,
     no hard-coded maxH needed. */
  const updatePos = useCallback(() => {
    if (!rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const flipUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    if (flipUp) {
      setDropdownPos({
        bottom: window.innerHeight - r.top + 5,
        left: r.left,
        width: r.width,
        flipUp: true,
      });
    } else {
      setDropdownPos({
        top: r.bottom + 5,
        left: r.left,
        width: r.width,
        flipUp: false,
      });
    }
  }, []);

  /* Keep position in sync when the page scrolls or the window resizes */
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  const selectedOpt = options.find((o) => o.value === value) ?? null;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((o) => {
    if (!normalizedQuery) return true;
    const candidate = String(o.searchText ?? o.label ?? "").toLowerCase();
    return candidate.includes(normalizedQuery);
  });

  /* Open */
  const openDropdown = useCallback(() => {
    if (disabled) return;
    updatePos(); // compute position before the render so there is no (0,0) flash
    setOpen(true);
    setQuery("");
    setFocused(-1);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [disabled, updatePos]);

  /* Close */
  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    setFocused(-1);
  }, []);

  /* Click outside — check both the trigger root and the portaled dropdown */
  useEffect(() => {
    const fn = (e) => {
      const inRoot     = rootRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inRoot && !inDropdown) closeDropdown();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [closeDropdown]);

  /* Scroll focused option into view */
  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    listRef.current.querySelectorAll(".ssx-option")[focusedIdx]?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

  /* Select */
  const select = (opt) => {
    if (opt.value !== value) onChange?.(opt.value);
    closeDropdown();
    triggerRef.current?.focus();
  };

  /* Clear */
  const clear = (e) => {
    e.stopPropagation();
    onChange?.(null);
  };

  /* Keyboard — trigger */
  const onTriggerKey = (e) => {
    if (disabled) return;
    if (["Enter", " ", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      openDropdown();
    }
  };

  /* Keyboard — search input */
  const onSearchKey = (e) => {
    if (e.key === "Escape") { closeDropdown(); triggerRef.current?.focus(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocused((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && focusedIdx >= 0 && filtered[focusedIdx]) {
      e.preventDefault();
      select(filtered[focusedIdx]);
    }
  };

  const triggerCls = [
    "ssx-trigger",
    open ? "ssx-trigger--open" : "",
    error ? "ssx-trigger--error" : "",
    disabled ? "ssx-trigger--disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <style>{CSS}</style>
      <div
        ref={rootRef}
        className={`ssx${className ? ` ${className}` : ""}`}
        style={style}
      >
        {label && <label className="ssx-label">{label}</label>}

        {/* ── Trigger ── */}
        <div
          ref={triggerRef}
          className={triggerCls}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => (open ? closeDropdown() : openDropdown())}
          onKeyDown={onTriggerKey}
        >
          <span className={`ssx-text ${selectedOpt ? "ssx-text--filled" : "ssx-text--empty"}`}>
            {selectedOpt ? selectedOpt.label : placeholder}
          </span>

          {clearable && selectedOpt && !disabled && (
            <button
              className="ssx-icon-btn ssx-icon-btn--clear"
              onMouseDown={clear}
              tabIndex={-1}
              aria-label="Clear selection"
            >
              <IconClose />
            </button>
          )}

          <span className="ssx-icon-btn ssx-icon-btn--chevron" aria-hidden>
            <IconChevron />
          </span>
        </div>

        {/* ── Dropdown — rendered into body via portal so overflow:hidden parents can't clip it ── */}
        {open && createPortal(
          <div
            ref={dropdownRef}
            className={`ssx-dropdown${dropdownPos.flipUp ? " ssx-dropdown--flip" : ""}`}
            style={dropdownPos.flipUp
              ? { bottom: dropdownPos.bottom, left: dropdownPos.left, width: dropdownPos.width }
              : { top: dropdownPos.top,    left: dropdownPos.left, width: dropdownPos.width }
            }
            role="listbox"
          >

            {/* Search */}
            <div className="ssx-search">
              <span className="ssx-search-ico"><IconSearch /></span>
              <input
                ref={searchRef}
                className="ssx-search-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setFocused(0); }}
                onKeyDown={onSearchKey}
                autoComplete="off"
                spellCheck={false}
                aria-label="Search options"
              />
              {query && (
                <button
                  className="ssx-icon-btn ssx-icon-btn--clear"
                  onMouseDown={(e) => { e.preventDefault(); setQuery(""); setFocused(-1); searchRef.current?.focus(); }}
                  tabIndex={-1}
                  aria-label="Clear search"
                >
                  <IconClose />
                </button>
              )}
            </div>

            {/* Options */}
            <div ref={listRef} className="ssx-list">
              {filtered.length === 0 ? (
                <div className="ssx-empty">{noOptionsText}</div>
              ) : (
                filtered.map((opt, i) => (
                  <div
                    key={opt.value}
                    className={[
                      "ssx-option",
                      opt.value === value ? "ssx-option--selected" : "",
                      focusedIdx === i ? "ssx-option--focused" : "",
                    ].filter(Boolean).join(" ")}
                    role="option"
                    aria-selected={opt.value === value}
                    onMouseDown={(e) => { e.preventDefault(); select(opt); }}
                    onMouseEnter={() => setFocused(i)}
                  >
                    {opt.label}
                    {opt.value === value && (
                      <span className="ssx-option-check"><IconCheck /></span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Hint / Error */}
        {(error || hint) && (
          <p className={`ssx-hint${error ? " ssx-hint--error" : ""}`}>
            {error ? `⚠ ${error}` : hint}
          </p>
        )}
      </div>
    </>
  );
}
