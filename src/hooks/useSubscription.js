import { useState, useEffect, useCallback } from 'react';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

// Simple global memory cache to share subscription state across hook instances without multiple network requests
let globalSubscriptionState = null;
let globalSubscriptionListeners = new Set();
let isFetchingStatus = false;

export const useSubscription = () => {
    const [subscription, setSubscription] = useState(() => {
        // Try loading from localStorage cache for instant UI response
        try {
            const cached = localStorage.getItem('ooms_subscription_status');
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) {
            console.error('Failed to parse cached subscription', e);
        }
        return globalSubscriptionState || {
            is_subscribed: 'no',
            subscription_plan: 'None',
            subscription_expires_at: null,
            is_expired: true,
            effective_plan_source: 'self'
        };
    });
    
    const [loading, setLoading] = useState(!globalSubscriptionState);

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

        // Avoid concurrent duplicate fetches
        if (isFetchingStatus && !force) return;

        isFetchingStatus = true;
        if (force) setLoading(true);

        try {
            const headers = getHeaders();
            if (!headers) {
                isFetchingStatus = false;
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/subscription/status`, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    updateState(result.data);
                }
            }
        } catch (err) {
            console.error('Error fetching subscription status:', err);
        } finally {
            isFetchingStatus = false;
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

        const isSub = subscription.is_subscribed === 'yes' && !subscription.is_expired;
        
        if (feature === 'core') {
            return isSub;
        }
        if (feature === 'staff-management') {
            return isSub && (subscription.subscription_plan === 'BusinessPlus' || subscription.subscription_plan === 'BusinessPro');
        }
        if (feature === 'live-chat') {
            return isSub && subscription.subscription_plan === 'BusinessPro';
        }
        return isSub;
    }, [subscription]);

    return {
        subscription,
        loading,
        refetch: () => fetchSubscriptionStatus(true),
        hasAccess,
        isSubscribed: subscription.is_subscribed === 'yes' && !subscription.is_expired,
        plan: subscription.subscription_plan || 'None'
    };
};
