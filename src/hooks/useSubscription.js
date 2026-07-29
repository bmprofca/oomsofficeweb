import { useState, useEffect, useCallback, useRef } from 'react';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

// Shared in-memory state so multiple hook instances don't spam the network
let globalSubscriptionState = null;
let globalSubscriptionListeners = new Set();
let subscriptionFetchPromise = null;
/** True after at least one successful network fetch in this page session */
let sessionVerified = false;
let lastFetchedBranchId = null;
/** Timestamp of last successful /subscription/status response */
let lastSuccessfulFetchAt = 0;
/** True while branch switch overlay is active — never treat as "no plan" */
let branchSwitching = false;
let branchSwitchMeta = { branchName: '', branchId: '' };
let branchSwitchListeners = new Set();

/** Single shared focus/visibility refresh (not per hook instance) */
let focusListenersBound = false;
let lastFocusRefetchAt = 0;
const FOCUS_REFETCH_THROTTLE_MS = 30_000;

const EMPTY_SUBSCRIPTION = {
    branch_id: null,
    is_subscribed: 'no',
    subscription_plan: 'None',
    subscription_expires_at: null,
    is_expired: true,
    effective_plan_source: 'branch',
    active_plans: [],
    features: {
        core: false,
        'salary-management': false,
        'live-chat': false,
    },
};

const CACHE_KEY = 'ooms_subscription_status';
const CACHE_BRANCH_KEY = 'ooms_subscription_branch_id';
const CACHE_TS_KEY = 'ooms_subscription_timestamp';

function getCurrentBranchId() {
    return String(localStorage.getItem('branch_id') || '').trim();
}

function readCachedSubscription() {
    try {
        const branchId = getCurrentBranchId();
        const cachedBranch = String(localStorage.getItem(CACHE_BRANCH_KEY) || '').trim();
        if (branchId && cachedBranch && branchId !== cachedBranch) {
            return null;
        }
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        return JSON.parse(cached);
    } catch (e) {
        console.error('Failed to parse cached subscription', e);
        return null;
    }
}

function hasUsableCacheForCurrentBranch() {
    const branchId = getCurrentBranchId();
    if (!branchId) return false;

    if (globalSubscriptionState) {
        const stateBranch = String(globalSubscriptionState.branch_id || '').trim();
        if (stateBranch && stateBranch === branchId) return true;
        if (!stateBranch && lastFetchedBranchId === branchId) return true;
    }

    return !!readCachedSubscription();
}

export function setBranchSwitching(active, meta = {}) {
    branchSwitching = !!active;
    branchSwitchMeta = active
        ? {
            branchName: meta.branchName || '',
            branchId: meta.branchId || '',
        }
        : { branchName: '', branchId: '' };
    branchSwitchListeners.forEach((fn) => fn(branchSwitching));
}

export function isBranchSwitching() {
    return branchSwitching;
}

/**
 * Clear subscription cache without broadcasting EMPTY (avoids Premium gate flash).
 */
export function clearSubscriptionForBranchSwitch() {
    globalSubscriptionState = null;
    subscriptionFetchPromise = null;
    sessionVerified = false;
    lastFetchedBranchId = null;
    lastSuccessfulFetchAt = 0;
    lastFocusRefetchAt = 0;
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_BRANCH_KEY);
        localStorage.removeItem(CACHE_TS_KEY);
    } catch (_) {
        // ignore
    }
}

export function resetSubscriptionCache() {
    clearSubscriptionForBranchSwitch();
    if (!branchSwitching) {
        globalSubscriptionListeners.forEach((listener) => listener(EMPTY_SUBSCRIPTION));
    }
}

function notifyListeners(newState) {
    globalSubscriptionListeners.forEach((listener) => listener(newState));
}

function persistSubscription(newState) {
    globalSubscriptionState = newState;
    sessionVerified = true;
    lastSuccessfulFetchAt = Date.now();
    lastFetchedBranchId = String(newState?.branch_id || getCurrentBranchId() || '').trim() || null;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        if (lastFetchedBranchId) {
            localStorage.setItem(CACHE_BRANCH_KEY, lastFetchedBranchId);
        }
    } catch (_) {
        // ignore quota / private mode
    }
    notifyListeners(newState);
}

/**
 * Fetch status for an explicit branch (used during switch before reload).
 */
export async function fetchSubscriptionStatusForBranch(branchId) {
    const username = localStorage.getItem('user_username') || localStorage.getItem('username');
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const id = String(branchId || getCurrentBranchId() || '').trim();
    if (!username || !token || !id) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/subscription/status`, {
            method: 'GET',
            headers: {
                username,
                token,
                branch: id,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });
        if (!response.ok) return null;
        const result = await response.json();
        if (result.success && result.data) {
            persistSubscription(result.data);
            return result.data;
        }
    } catch (err) {
        console.error('Error fetching subscription for branch switch:', err);
    }
    return null;
}

/**
 * @param {boolean} force
 * @param {{ silent?: boolean, reason?: string }} options
 */
async function fetchSubscriptionStatus(force = false, options = {}) {
    const { silent = true, reason = 'default' } = options;
    const username = localStorage.getItem('user_username') || localStorage.getItem('username');
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const branchId = getCurrentBranchId();

    if (!username || !token || !branchId) {
        return null;
    }

    if (lastFetchedBranchId && lastFetchedBranchId !== branchId) {
        sessionVerified = false;
        globalSubscriptionState = null;
        lastSuccessfulFetchAt = 0;
    }

    // Always coalesce in-flight requests — never fan out parallel /status calls
    if (subscriptionFetchPromise) {
        return subscriptionFetchPromise;
    }

    // Soft skip: non-force callers reuse session state when already verified for branch
    if (
        !force
        && sessionVerified
        && lastFetchedBranchId === branchId
        && globalSubscriptionState
    ) {
        return globalSubscriptionState;
    }

    // Soft skip for background/focus refreshes when we already have fresh data
    if (
        reason === 'focus'
        && sessionVerified
        && lastFetchedBranchId === branchId
        && lastSuccessfulFetchAt
        && Date.now() - lastSuccessfulFetchAt < FOCUS_REFETCH_THROTTLE_MS
    ) {
        return globalSubscriptionState;
    }

    const showLoading =
        !silent
        && !branchSwitching
        && !hasUsableCacheForCurrentBranch()
        && !sessionVerified;

    if (showLoading) {
        notifyLoadingListeners(true);
    }

    subscriptionFetchPromise = (async () => {
        try {
            const headers = getHeaders();
            if (!headers) return null;

            const response = await fetch(`${API_BASE_URL}/subscription/status`, {
                method: 'GET',
                headers,
                cache: 'no-store',
            });

            if (!response.ok) {
                console.error('Subscription status request failed:', response.status);
                return null;
            }

            const result = await response.json();
            if (result.success && result.data) {
                persistSubscription(result.data);
                return result.data;
            }
            return null;
        } catch (err) {
            console.error('Error fetching subscription status:', err);
            return null;
        } finally {
            subscriptionFetchPromise = null;
            if (showLoading) {
                notifyLoadingListeners(false);
            }
        }
    })();

    return subscriptionFetchPromise;
}

function maybeRefetchOnFocus() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
    }

    const now = Date.now();
    if (now - lastFocusRefetchAt < FOCUS_REFETCH_THROTTLE_MS) {
        return;
    }
    lastFocusRefetchAt = now;
    fetchSubscriptionStatus(true, { silent: true, reason: 'focus' });
}

/**
 * One shared listener for the whole app — multiple useSubscription() mounts
 * must not each attach window focus / visibility handlers.
 */
function ensureFocusRefreshListeners() {
    if (focusListenersBound || typeof window === 'undefined') return;
    focusListenersBound = true;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            maybeRefetchOnFocus();
        }
    });
    window.addEventListener('focus', maybeRefetchOnFocus);
}

let globalLoadingListeners = new Set();
let globalLoading = false;

function notifyLoadingListeners(isLoading) {
    globalLoading = isLoading;
    globalLoadingListeners.forEach((listener) => listener(isLoading));
}

function subscriptionMatchesCurrentBranch(subscription) {
    const branchId = getCurrentBranchId();
    if (!branchId) return false;
    const subBranch = String(subscription?.branch_id || '').trim();
    if (!subBranch) return false;
    return subBranch === branchId;
}

export const useSubscription = () => {
    const [subscription, setSubscription] = useState(() => {
        const cached = readCachedSubscription();
        if (cached) {
            if (!globalSubscriptionState) {
                globalSubscriptionState = cached;
            }
            return cached;
        }
        return globalSubscriptionState || EMPTY_SUBSCRIPTION;
    });

    const [loading, setLoading] = useState(
        () => !hasUsableCacheForCurrentBranch() && !sessionVerified
    );
    const [switching, setSwitching] = useState(() => branchSwitching);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        const onState = (newState) => {
            setSubscription(newState);
        };
        const onLoading = (isLoading) => {
            if (mountedRef.current) setLoading(isLoading);
        };
        const onSwitch = (active) => {
            if (mountedRef.current) setSwitching(active);
        };

        globalSubscriptionListeners.add(onState);
        globalLoadingListeners.add(onLoading);
        branchSwitchListeners.add(onSwitch);

        const hasCache = hasUsableCacheForCurrentBranch();
        const silent = hasCache || sessionVerified;
        if (!silent && !branchSwitching) setLoading(true);

        // Coalesced: N mounts → at most 1 in-flight network call
        fetchSubscriptionStatus(true, {
            silent: silent || branchSwitching,
            reason: 'mount',
        }).finally(() => {
            if (mountedRef.current && !silent && !branchSwitching) setLoading(false);
        });

        ensureFocusRefreshListeners();

        return () => {
            mountedRef.current = false;
            globalSubscriptionListeners.delete(onState);
            globalLoadingListeners.delete(onLoading);
            branchSwitchListeners.delete(onSwitch);
        };
    }, []);

    const branchSynced = subscriptionMatchesCurrentBranch(subscription);
    // Until status is confirmed for the *current* branch, never show Premium gate
    const verifyingBranch =
        switching
        || branchSwitching
        || !branchSynced
        || ((loading || globalLoading) && !sessionVerified);

    const hasAccess = useCallback((feature) => {
        const username = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
        if (username.toLowerCase() === 'admin') return true;

        // Access decisions only apply once status matches the active branch
        if (branchSwitching || switching || !subscriptionMatchesCurrentBranch(subscription)) {
            return false;
        }

        if (subscription.features && typeof subscription.features[feature] === 'boolean') {
            return subscription.features[feature];
        }

        const activePlans = (subscription.active_plans || []).filter((plan) => plan.is_active);
        const activeNames = activePlans.map((plan) => plan.plan_name);
        const isSub = subscription.is_subscribed === 'yes' && !subscription.is_expired;

        if (feature === 'core') {
            return isSub;
        }
        if (feature === 'salary-management') {
            return activeNames.includes('BusinessPlus') || activeNames.includes('BusinessPro');
        }
        if (feature === 'live-chat') {
            return activeNames.includes('BusinessPro');
        }
        return isSub;
    }, [subscription, switching]);

    const refetch = useCallback((opts = {}) => {
        const silent = opts.silent !== false;
        if (!silent && !hasUsableCacheForCurrentBranch()) {
            setLoading(true);
        }
        return fetchSubscriptionStatus(true, { silent, reason: 'manual' }).finally(() => {
            if (!silent && mountedRef.current) setLoading(false);
        });
    }, []);

    return {
        subscription,
        loading: (loading || globalLoading) && !switching,
        verifyingBranch,
        isBranchSwitching: switching,
        branchSwitchMeta,
        refetch,
        hasAccess,
        isSubscribed: subscription.is_subscribed === 'yes' && !subscription.is_expired,
        plan: subscription.subscription_plan || 'None',
    };
};
