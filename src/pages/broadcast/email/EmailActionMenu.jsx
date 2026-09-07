import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiMoreVertical } from "react-icons/fi";

const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

/** Portal + viewport-flip row action menu. See CLIENT/context/action-button.md */
export default function EmailActionMenu({ items = [], buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const visibleItems = items.filter(Boolean);

  const calcPos = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const mH = menu?.offsetHeight || Math.max(44, visibleItems.length * 36 + 8);
    const mW = menu?.offsetWidth || 176;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const candidates = [
      { top: r.top - mH - MENU_GAP, left: r.right - mW },
      { top: r.bottom + MENU_GAP, left: r.right - mW },
      { top: r.top, left: r.right + MENU_GAP },
      { top: r.top, left: r.left - mW - MENU_GAP },
    ];

    const fits = (p) =>
      p.top >= MENU_PAD &&
      p.left >= MENU_PAD &&
      p.top + mH <= vh - MENU_PAD &&
      p.left + mW <= vw - MENU_PAD;

    const chosen = candidates.find(fits) || candidates[1];
    setPos({
      top: Math.min(Math.max(MENU_PAD, chosen.top), Math.max(MENU_PAD, vh - MENU_PAD - mH)),
      left: Math.min(Math.max(MENU_PAD, chosen.left), Math.max(MENU_PAD, vw - MENU_PAD - mW)),
    });
  }, [visibleItems.length]);

  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => calcPos());
    return () => cancelAnimationFrame(raf);
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onClose = () => setOpen(false);
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", calcPos);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", calcPos);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, calcPos]);

  if (!visibleItems.length) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
          className={
          buttonClassName ||
          "inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        }
        aria-label="Actions"
      >
        <FiMoreVertical className="h-4 w-4" />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  top: pos.top,
                  left: pos.left,
                  zIndex: MENU_Z,
                  height: "auto",
                }}
                className="min-w-[11rem] w-max max-w-[16rem] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
              >
                {visibleItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.disabled) return;
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : item.warning
                          ? "text-amber-700 hover:bg-amber-50"
                          : "text-gray-700 hover:bg-gray-50"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {item.icon ? <item.icon className="h-3.5 w-3.5 shrink-0" /> : null}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
