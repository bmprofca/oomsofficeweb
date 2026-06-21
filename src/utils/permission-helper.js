import { useState, useEffect } from 'react';
import axios from 'axios';
import getHeaders from './get-headers';
import API_BASE_URL from './api-controller';

// Global cache promise to prevent duplicate concurrent network calls
let inFlightPromise = null;
let lastFetchTime = 0;

/**
 * Utility to fetch and cache user permissions.
 * @param {boolean} force - Force cache bypass and fetch from API
 * @returns {Promise<string[]>} List of permission strings
 */
export const fetchUserPermissions = async (force = false) => {
    try {
        const username = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
        const branchId = localStorage.getItem('branch_id') || '';
        const token = localStorage.getItem('user_token') || localStorage.getItem('token') || '';

        if (!username || !branchId || !token) {
            return [];
        }

        const cacheKey = `user_permissions_${username}_${branchId}`;
        const cacheTimeKey = `${cacheKey}_timestamp`;

        // Rate-limit force requests to once every 5 seconds to prevent duplicate duplicate API requests
        const now = Date.now();
        if (force) {
            if (now - lastFetchTime < 5000) {
                force = false;
            } else {
                lastFetchTime = now;
            }
        }

        // Return cached value if available and not forced to refresh
        if (!force) {
            const cached = localStorage.getItem(cacheKey);
            const cachedTime = localStorage.getItem(cacheTimeKey);
            const isExpired = !cachedTime || (now - parseInt(cachedTime, 10)) > 2 * 60 * 1000; // 2-minute TTL

            if (cached && !isExpired) {
                try {
                    return JSON.parse(cached) || [];
                } catch (e) {
                    console.error('Failed to parse cached permissions:', e);
                }
            }
        }

        // Return existing in-flight request if present
        if (inFlightPromise && !force) {
            return inFlightPromise;
        }

        inFlightPromise = (async () => {
            try {
                const headers = getHeaders();
                if (!headers) return [];

                let allowedPermissions = [];
                let resolved = false;

                // Try the batch endpoint first
                try {
                    const res = await axios.get(
                        `${API_BASE_URL}/settings/permissions/user-permissions?username=${encodeURIComponent(username)}`,
                        { headers }
                    );

                    if (res.data?.success) {
                        const responseData = res.data.data || res.data;
                        if (responseData.permissions && Array.isArray(responseData.permissions)) {
                            allowedPermissions = responseData.permissions;
                            resolved = true;
                        } else if (responseData.custom_permissions && Array.isArray(responseData.custom_permissions)) {
                            allowedPermissions = responseData.custom_permissions;
                            resolved = true;
                        }
                    }
                } catch (err) {
                    console.warn('Batch user-permissions endpoint not available, will check individual permissions...', err);
                }

                // Fallback: Check each core UI permission individually using the documented check API
                if (!resolved) {
                    const permissionsToCheck = [
                        'task_create',
                        'task_cancel',
                        'task_complete',
                        'task_fees_view',
                        'client_create',
                        'client_edit',
                        'client_delete',
                        'finance_balance_view',
                        'finance_entry',
                        'finance_entry_edit',
                        'finance_entry_delete',
                        'finance_report',
                        'finance_billing_approve_reject',
                        'broadcast_config_edit',
                        'broadcast_send',
                        'broadcast_livechat',
                        'setting_view_edit',
                        'subscription_manage',
                        'staff_attendance_view_manage',
                        'office_assistance_access',
                        'recurring_task_create',
                        'recurring_task_delete',
                        'recurring_task_complete',
                        'recurring_task_fees_view'
                    ];

                    const checkPromises = permissionsToCheck.map(async (perm) => {
                        try {
                            const res = await axios.get(
                                `${API_BASE_URL}/settings/permissions/check?permission=${encodeURIComponent(perm)}`,
                                { headers }
                            );
                            if (res.data?.success && res.data?.has_permission) {
                                allowedPermissions.push(perm);
                            }
                        } catch (err) {
                            console.error(`Error checking individual permission: ${perm}`, err);
                        }
                    });

                    await Promise.all(checkPromises);
                }

                localStorage.setItem(cacheKey, JSON.stringify(allowedPermissions));
                localStorage.setItem(cacheTimeKey, Date.now().toString());
                return allowedPermissions;
            } catch (err) {
                console.error('Error fetching user permissions:', err);
                return [];
            } finally {
                inFlightPromise = null;
            }
        })();

        return inFlightPromise;
    } catch (e) {
        console.error('Error in fetchUserPermissions:', e);
        return [];
    }
};

/**
 * Custom React hook to check permissions in components.
 */
export const useUserPermissions = () => {
    const [permissions, setPermissions] = useState(() => {
        const username = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
        const branchId = localStorage.getItem('branch_id') || '';
        if (username && branchId) {
            try {
                const cached = localStorage.getItem(`user_permissions_${username}_${branchId}`);
                return cached ? JSON.parse(cached) : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [loading, setLoading] = useState(true);

    const username = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
    const branchId = localStorage.getItem('branch_id') || '';

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const cacheKey = `user_permissions_${username}_${branchId}`;
            const cacheTimeKey = `${cacheKey}_timestamp`;

            // 1. First, load from the cache instantly if it exists
            const cached = localStorage.getItem(cacheKey);
            if (cached && isMounted) {
                try {
                    setPermissions(JSON.parse(cached) || []);
                } catch (e) {
                    console.error('Failed to parse cached permissions on hook mount:', e);
                }
                setLoading(false);
            }

            // 2. Fetch fresh permissions from the server in the background
            const cachedTime = localStorage.getItem(cacheTimeKey);
            const TTL = 2 * 60 * 1000; // 2-minute cache TTL
            const isExpired = !cachedTime || (Date.now() - parseInt(cachedTime, 10)) > TTL;

            if (!cached || isExpired) {
                try {
                    const freshList = await fetchUserPermissions(true);
                    if (isMounted) {
                        setPermissions(freshList || []);
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Background permission refresh failed:', err);
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            } else {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [username, branchId]);

    const check = (keyOrPrefix) => {
        if (!keyOrPrefix) return true; // Default allow if no check specified

        // Branch Owner bypasses all check constraints
        if (localStorage.getItem('branch_owned') === 'true') {
            return true;
        }

        // Admin username bypass
        const currentUsername = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
        if (currentUsername.toLowerCase() === 'admin') {
            return true;
        }

        // Super-admin overrides / bypasses
        if (permissions.includes('all') || permissions.includes('*') || permissions.includes('admin')) {
            return true;
        }

        // Map frontend checked permission key to actual database permission options
        let resolvedKey = keyOrPrefix;

        if (keyOrPrefix === 'task_view') {
            return permissions.some(p => p.startsWith('task_'));
        }
        if (keyOrPrefix === 'client_view') {
            return permissions.some(p => p.startsWith('client_'));
        }
        if (keyOrPrefix === 'client_update') {
            resolvedKey = 'client_edit';
        }
        if (keyOrPrefix === 'task_update') {
            return permissions.some(p => ['task_create', 'task_complete', 'task_cancel'].includes(p));
        }
        if (keyOrPrefix === 'staff_view' || keyOrPrefix === 'staff_report') {
            if (permissions.includes('staff_attendance_view_manage')) {
                return true;
            }
            resolvedKey = 'setting_view_edit';
        }
        if (keyOrPrefix === 'setting_') {
            resolvedKey = 'setting_view_edit';
        }
        if (keyOrPrefix === 'staff_attendance') {
            resolvedKey = 'staff_attendance_view_manage';
        }
        if (keyOrPrefix === 'office_assistance_') {
            if (permissions.includes('staff_attendance_view_manage')) {
                return true;
            }
            resolvedKey = 'office_assistance_access';
        }
        if (keyOrPrefix === 'subscription_') {
            resolvedKey = 'subscription_manage';
        }
        if (keyOrPrefix === 'task_') {
            return permissions.some(p => p.startsWith('task_'));
        }
        if (keyOrPrefix === 'client_') {
            return permissions.some(p => p.startsWith('client_'));
        }
        if (keyOrPrefix === 'finance_') {
            return permissions.some(p => p.startsWith('finance_'));
        }
        if (keyOrPrefix === 'broadcast_') {
            return permissions.some(p => p.startsWith('broadcast_'));
        }
        if (keyOrPrefix === 'staff_') {
            return permissions.some(p => p.startsWith('staff_') || p === 'setting_view_edit' || p === 'office_assistance_access');
        }

        // Prefix match e.g. 'task_' or 'client_'
        if (resolvedKey.endsWith('_')) {
            return permissions.some(p => p.toLowerCase().startsWith(resolvedKey.toLowerCase()));
        }

        return permissions.includes(resolvedKey);
    };

    return { permissions, loading, check };
};

/**
 * Synchronous utility to check permissions outside of React components/hooks context.
 */
export const checkPermissionSync = (keyOrPrefix) => {
    if (!keyOrPrefix) return true;

    // Branch Owner bypasses all check constraints
    if (localStorage.getItem('branch_owned') === 'true') {
        return true;
    }

    // Admin username bypass
    const currentUsername = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
    if (currentUsername.toLowerCase() === 'admin') {
        return true;
    }

    const branchId = localStorage.getItem('branch_id') || '';
    if (!currentUsername || !branchId) {
        return false;
    }

    let permissions = [];
    try {
        const cached = localStorage.getItem(`user_permissions_${currentUsername}_${branchId}`);
        if (cached) {
            permissions = JSON.parse(cached) || [];
        }
    } catch (e) {
        console.error('Failed to parse cached permissions in sync check:', e);
    }

    // Super-admin overrides / bypasses
    if (permissions.includes('all') || permissions.includes('*') || permissions.includes('admin')) {
        return true;
    }

    // Map frontend checked permission key to actual database permission options
    let resolvedKey = keyOrPrefix;

    if (keyOrPrefix === 'task_view') {
        return permissions.some(p => p.startsWith('task_'));
    }
    if (keyOrPrefix === 'client_view') {
        return permissions.some(p => p.startsWith('client_'));
    }
    if (keyOrPrefix === 'client_update') {
        resolvedKey = 'client_edit';
    }
    if (keyOrPrefix === 'task_update') {
        return permissions.some(p => ['task_create', 'task_complete', 'task_cancel'].includes(p));
    }
    if (keyOrPrefix === 'staff_view' || keyOrPrefix === 'staff_report') {
        if (permissions.includes('staff_attendance_view_manage')) {
            return true;
        }
        resolvedKey = 'setting_view_edit';
    }
    if (keyOrPrefix === 'setting_') {
        resolvedKey = 'setting_view_edit';
    }
    if (keyOrPrefix === 'staff_attendance') {
        resolvedKey = 'staff_attendance_view_manage';
    }
    if (keyOrPrefix === 'office_assistance_') {
        if (permissions.includes('staff_attendance_view_manage')) {
            return true;
        }
        resolvedKey = 'office_assistance_access';
    }
    if (keyOrPrefix === 'subscription_') {
        resolvedKey = 'subscription_manage';
    }
    if (keyOrPrefix === 'task_') {
        return permissions.some(p => p.startsWith('task_'));
    }
    if (keyOrPrefix === 'client_') {
        return permissions.some(p => p.startsWith('client_'));
    }
    if (keyOrPrefix === 'finance_') {
        return permissions.some(p => p.startsWith('finance_'));
    }
    if (keyOrPrefix === 'broadcast_') {
        return permissions.some(p => p.startsWith('broadcast_'));
    }
    if (keyOrPrefix === 'staff_') {
        return permissions.some(p => p.startsWith('staff_') || p === 'setting_view_edit' || p === 'office_assistance_access');
    }

    // Prefix match e.g. 'task_' or 'client_'
    if (resolvedKey.endsWith('_')) {
        return permissions.some(p => p.toLowerCase().startsWith(resolvedKey.toLowerCase()));
    }

    return permissions.includes(resolvedKey);
};

