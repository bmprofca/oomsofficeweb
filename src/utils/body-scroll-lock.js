/**
 * Prevents background page scroll while modals/overlays are open.
 * - Reference counting for nested manual locks (useBodyScrollLock).
 * - Optional auto-detection via BodyScrollLockObserver for full-viewport fixed overlays.
 * - Global wheel/touchmove capture so scrolling a modal panel does not scroll the page behind it.
 */

let manualLockCount = 0;
let autoLockActive = false;
let applied = false;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

function getScrollbarWidth() {
    if (typeof window === 'undefined') return 0;
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function isScrollLockEngaged() {
    return manualLockCount > 0 || autoLockActive;
}

function applyLockState() {
    const locked = isScrollLockEngaged();
    if (locked && !applied) {
        applied = true;
        savedHtmlOverflow = document.documentElement.style.overflow;
        savedBodyOverflow = document.body.style.overflow;
        savedBodyPaddingRight = document.body.style.paddingRight;
        const sbw = getScrollbarWidth();
        document.documentElement.classList.add('modal-scroll-lock');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        if (sbw > 0) {
            document.body.style.paddingRight = `${sbw}px`;
        }
    } else if (!locked && applied) {
        applied = false;
        document.documentElement.classList.remove('modal-scroll-lock');
        document.documentElement.style.overflow = savedHtmlOverflow;
        document.body.style.overflow = savedBodyOverflow;
        document.body.style.paddingRight = savedBodyPaddingRight;
    }
}

/** Call when opening a modal (supports nesting). */
export function lockBodyScroll() {
    manualLockCount += 1;
    applyLockState();
}

/** Call when closing a modal (pair with lockBodyScroll). */
export function unlockBodyScroll() {
    if (manualLockCount > 0) {
        manualLockCount -= 1;
    }
    applyLockState();
}

/** Used by BodyScrollLockObserver only — toggles auto lock without affecting manual count. */
export function setAutoBodyScrollLock(active) {
    if (autoLockActive === active) return;
    autoLockActive = active;
    applyLockState();
}

export function isBodyScrollLocked() {
    return isScrollLockEngaged();
}

function isScrollableEl(el) {
    if (!(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const canY =
        (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
    const canX =
        (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1;
    return canY || canX;
}

function findScrollableAncestor(node) {
    let el = node instanceof Element ? node : node?.parentElement;
    while (el && el !== document.documentElement) {
        if (isScrollableEl(el)) return el;
        el = el.parentElement;
    }
    return null;
}

function onWheelCapture(e) {
    if (!applied) return;
    if (findScrollableAncestor(e.target)) return;
    e.preventDefault();
}

function onTouchMoveCapture(e) {
    if (!applied) return;
    if (findScrollableAncestor(e.target)) return;
    e.preventDefault();
}

let listenersAttached = false;

function attachGlobalListeners() {
    if (listenersAttached || typeof document === 'undefined') return;
    listenersAttached = true;
    document.addEventListener('wheel', onWheelCapture, { passive: false, capture: true });
    document.addEventListener('touchmove', onTouchMoveCapture, { passive: false, capture: true });
}

attachGlobalListeners();

/** Full-viewport fixed layer (typical modal backdrop). */
export function elementLooksLikeModalOverlay(el) {
    if (!(el instanceof HTMLElement)) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (parseFloat(s.opacity) < 0.01) return false;
    if (s.position !== 'fixed') return false;

    const top = parseFloat(s.top);
    const left = parseFloat(s.left);
    const right = parseFloat(s.right);
    const bottom = parseFloat(s.bottom);
    const edges = [top, left, right, bottom].map((v) => (Number.isFinite(v) ? v : NaN));
    if (edges.some((v) => !Number.isFinite(v))) return false;
    const fullViewport = edges.every((v) => Math.abs(v) < 2);

    if (!fullViewport) return false;

    const z = parseInt(s.zIndex, 10);
    if (!Number.isFinite(z) || z < 15) return false;

    return true;
}
