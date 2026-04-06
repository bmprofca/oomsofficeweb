import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/body-scroll-lock';

/**
 * Locks page scroll while `locked` is true (nested-safe with lockBodyScroll counting).
 * Use when a modal does not use a full-viewport `fixed inset-0` backdrop so the observer misses it.
 */
export default function useBodyScrollLock(locked) {
    useEffect(() => {
        if (!locked) return undefined;
        lockBodyScroll();
        return () => {
            unlockBodyScroll();
        };
    }, [locked]);
}
