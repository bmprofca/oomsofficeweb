import { useEffect, useState } from 'react';
import { AI_SETTINGS_EVENT, getAiStatus } from '../../utils/ai-api';

const INITIAL = { enabled: false, configured: false, can_manage: false, loading: true };

/** Branch-level AI availability; refreshes when an admin saves AI settings. */
export default function useAiStatus() {
  const [status, setStatus] = useState(INITIAL);

  useEffect(() => {
    let alive = true;
    const load = (force) =>
      getAiStatus({ force }).then((s) => {
        if (alive) setStatus({ ...s, loading: false });
      });
    load(false);
    const onUpdate = () => load(true);
    window.addEventListener(AI_SETTINGS_EVENT, onUpdate);
    return () => {
      alive = false;
      window.removeEventListener(AI_SETTINGS_EVENT, onUpdate);
    };
  }, []);

  return status;
}
