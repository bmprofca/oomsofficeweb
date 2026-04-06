import { useEffect, useRef } from 'react';
import { elementLooksLikeModalOverlay, setAutoBodyScrollLock } from '../utils/body-scroll-lock';

/**
 * Watches the DOM for full-viewport fixed overlays (typical modal backdrops) and locks
 * document scroll automatically. Works app-wide without changing each modal component.
 */
export default function BodyScrollLockObserver() {
    const rafRef = useRef(0);
    const prevRef = useRef(false);

    useEffect(() => {
        const run = () => {
            const nodes = document.body.querySelectorAll('.fixed');
            let found = false;
            for (let i = 0; i < nodes.length; i++) {
                if (elementLooksLikeModalOverlay(nodes[i])) {
                    found = true;
                    break;
                }
            }
            if (found !== prevRef.current) {
                prevRef.current = found;
                setAutoBodyScrollLock(found);
            }
        };

        const schedule = () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(run);
        };

        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        });
        schedule();

        return () => {
            observer.disconnect();
            cancelAnimationFrame(rafRef.current);
            prevRef.current = false;
            setAutoBodyScrollLock(false);
        };
    }, []);

    return null;
}
