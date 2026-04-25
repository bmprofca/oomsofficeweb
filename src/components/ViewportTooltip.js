import React, { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const GAP = 8;
const VIEW_PAD = 8;
const TOOLTIP_Z = 99999;

/**
 * Hover/focus tooltip portaled to `document.body` with viewport-aware placement.
 * Follows context/tooltip.md: flip order top → bottom → right → left, clamp, z-index 99999,
 * portal, scroll hide, escape, resize + content size recalc, optional arrow by placement.
 */
export function ViewportTooltip({ label, children, disabled = false, fullWidth = false }) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const tipRef = useRef(null);
    const [box, setBox] = useState({ top: 0, left: 0, placement: 'bottom' });

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        const tip = tipRef.current;
        if (!trigger || !tip) return;

        const rect = trigger.getBoundingClientRect();
        const tw = tip.offsetWidth || 1;
        const th = tip.offsetHeight || 1;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const candidates = [
            {
                placement: 'top',
                top: rect.top - th - GAP,
                left: rect.left + rect.width / 2 - tw / 2,
            },
            {
                placement: 'bottom',
                top: rect.bottom + GAP,
                left: rect.left + rect.width / 2 - tw / 2,
            },
            {
                placement: 'right',
                top: rect.top + rect.height / 2 - th / 2,
                left: rect.right + GAP,
            },
            {
                placement: 'left',
                top: rect.top + rect.height / 2 - th / 2,
                left: rect.left - tw - GAP,
            },
        ];

        const fits = (p) =>
            p.top >= VIEW_PAD &&
            p.left >= VIEW_PAD &&
            p.top + th <= vh - VIEW_PAD &&
            p.left + tw <= vw - VIEW_PAD;

        const chosen = candidates.find(fits) || candidates[1];

        const left = Math.min(Math.max(VIEW_PAD, chosen.left), vw - VIEW_PAD - tw);
        const top = Math.min(Math.max(VIEW_PAD, chosen.top), vh - VIEW_PAD - th);

        setBox({ top, left, placement: chosen.placement });
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        const raf = requestAnimationFrame(() => updatePosition());
        const onResize = () => updatePosition();
        /** context/tooltip.md §14: hide on scroll (hover tips in tables / overflow areas). */
        const onScroll = () => setOpen(false);
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [open, label, updatePosition]);

    useLayoutEffect(() => {
        if (!open) return;
        const tip = tipRef.current;
        if (!tip || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => updatePosition());
        ro.observe(tip);
        return () => ro.disconnect();
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    if (disabled || !label) {
        return children;
    }

    const triggerClass = fullWidth ? 'flex w-full min-w-0' : 'inline-flex max-w-full';

    const arrowBase =
        'pointer-events-none absolute z-0 h-2 w-2 rotate-45 bg-slate-900 ring-1 ring-white/15';
    const arrowPosition = (() => {
        switch (box.placement) {
            case 'top':
                return 'bottom-[-3px] left-1/2 -translate-x-1/2';
            case 'bottom':
                return 'left-1/2 top-[-3px] -translate-x-1/2';
            case 'right':
                return 'left-[-3px] top-1/2 -translate-y-1/2';
            case 'left':
                return 'right-[-3px] top-1/2 -translate-y-1/2';
            default:
                return 'left-1/2 top-[-3px] -translate-x-1/2';
        }
    })();

    return (
        <>
            <span
                ref={triggerRef}
                className={triggerClass}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
            >
                {children}
            </span>
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                ref={tipRef}
                                role="tooltip"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.12 }}
                                style={{
                                    position: 'fixed',
                                    top: box.top,
                                    left: box.left,
                                    zIndex: TOOLTIP_Z,
                                    pointerEvents: 'none',
                                }}
                                className="relative max-w-[min(18rem,calc(100vw-24px))] rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-snug text-white shadow-xl ring-1 ring-white/10"
                            >
                                <span className={`${arrowBase} ${arrowPosition}`} aria-hidden />
                                <span className="relative z-[1]">{label}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    );
}
