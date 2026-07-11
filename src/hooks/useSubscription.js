import { useState, useEffect, useCallback } from 'react';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

// Simple global memory cache to share subscription state across hook instances without multiple network requests
let globalSubscriptionState = null;
let globalSubscriptionListeners = new Set();
let subscriptionFetchPromise = null;

export function resetSubscriptionCache() {
    globalSubscriptionState = null;
    subscriptionFetchPromise = null;
    localStorage.removeItem('ooms_subscription_status');
    localStorage.removeItem('ooms_subscription_timestamp');
}

const hasCachedSubscription = () => {
    if (globalSubscriptionState) return true;
    try {
        return !!localStorage.getItem('ooms_subscription_status');
    } catch {
        return false;
    }
};

export const useSubscription = () => {
    const [subscription, setSubscription] = useState(() => {
        // Try loading from localStorage cache for instant UI response
        try {
            const cached = localStorage.getItem('ooms_subscription_status');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (!globalSubscriptionState) {
                    globalSubscriptionState = parsed;
                }
                return parsed;
            }
        } catch (e) {
            console.error('Failed to parse cached subscription', e);
        }
        return globalSubscriptionState || {
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
                'attendance-management': false,
                'live-chat': false,
            },
        };
    });
    
    const [loading, setLoading] = useState(() => !hasCachedSubscription());

    const updateState = (newState) => {
        globalSubscriptionState = newState;
        localStorage.setItem('ooms_subscription_status', JSON.stringify(newState));
        globalSubscriptionListeners.forEach(listener => listener(newState));
    };

    const fetchSubscriptionStatus = useCallback(async (force = false) => {
        const username = localStorage.getItem('user_username') || localStorage.getItem('username');
        const token = localStorage.getItem('user_token') || localStorage.getItem('token');

        if (!username || !token) {
            setLoading(false);
            return;
        }

        if (subscriptionFetchPromise && !force) {
            if (!hasCachedSubscription()) {
                setLoading(true);
            }
            try {
                await subscriptionFetchPromise;
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!hasCachedSubscription()) {
            setLoading(true);
        }

        subscriptionFetchPromise = (async () => {
            try {
                const headers = getHeaders();
                if (!headers) return;

                const response = await fetch(`${API_BASE_URL}/subscription/status`, {
                    method: 'GET',
                    headers,
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        updateState(result.data);
                    }
                }
            } catch (err) {
                console.error('Error fetching subscription status:', err);
            }
        })();

        try {
            await subscriptionFetchPromise;
        } finally {
            subscriptionFetchPromise = null;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const listener = (newState) => {
            setSubscription(newState);
        };
        globalSubscriptionListeners.add(listener);

        // Fetch if no state exists yet or if it has been 1 minute since last fetch
        const cachedTime = localStorage.getItem('ooms_subscription_timestamp');
        const now = Date.now();
        const cacheTTL = 60 * 1000; // 1 minute cache TTL

        if (!globalSubscriptionState || !cachedTime || (now - parseInt(cachedTime, 10) > cacheTTL)) {
            fetchSubscriptionStatus();
            localStorage.setItem('ooms_subscription_timestamp', now.toString());
        }

        return () => {
            globalSubscriptionListeners.delete(listener);
        };
    }, [fetchSubscriptionStatus]);

    const hasAccess = useCallback((feature) => {
        const username = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
        if (username.toLowerCase() === 'admin') return true;

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
        if (feature === 'attendance-management') {
            return activeNames.includes('BusinessPlus') || activeNames.includes('BusinessPro');
        }
        if (feature === 'live-chat') {
            return activeNames.includes('BusinessPro');
        }
        return isSub;
    }, [subscription]);

    const refetch = useCallback(() => fetchSubscriptionStatus(true), [fetchSubscriptionStatus]);

    return {
        subscription,
        loading,
        refetch,
        hasAccess,
        isSubscribed: subscription.is_subscribed === 'yes' && !subscription.is_expired,
        plan: subscription.subscription_plan || 'None'
    };
};
