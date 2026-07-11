import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` after `delay` ms of no changes.
 */
export default function useDebounce(value, delay = 350) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
