/**
 * Branch workspace switch orchestration.
 * Shows a transition overlay, clears branch-scoped caches, syncs subscription,
 * then reloads so every page refetches for the new branch.
 */

import { applyBranchToSession } from '../services/branchSetupService';
import {
    clearSubscriptionForBranchSwitch,
    fetchSubscriptionStatusForBranch,
    setBranchSwitching,
} from '../hooks/useSubscription';
import { clearUserPermissionCache } from './permission-helper';

const BRANCH_SWITCH_EVENT = 'ooms:branch-switching';
const BRANCH_CHANGED_EVENT = 'ooms:branch-changed';

let switching = false;
let switchingMeta = { branchName: '', branchId: '' };
const listeners = new Set();

function notify() {
    listeners.forEach((fn) => fn({ switching, ...switchingMeta }));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent(BRANCH_SWITCH_EVENT, {
                detail: { switching, ...switchingMeta },
            })
        );
    }
}

export function getBranchSwitchState() {
    return { switching, ...switchingMeta };
}

export function subscribeBranchSwitch(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Clear session list snapshots that are not branch-keyed. */
export function clearBranchScopedClientCaches(previousBranchId, nextBranchId) {
    try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i += 1) {
            const key = sessionStorage.key(i);
            if (!key) continue;
            // List view caches and similar page snapshots
            if (
                key.includes('list')
                || key.includes('task')
                || key.includes('View')
                || key.includes('ooms_')
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch (_) {
        // ignore
    }

    clearUserPermissionCache(null, previousBranchId);
    clearUserPermissionCache(null, nextBranchId);
}

/**
 * Switch active branch with a professional transition (no subscription-gate flash).
 */
export async function performBranchSwitch(branch, { reload = true } = {}) {
    if (!branch?.branch_id) {
        throw new Error('Invalid branch');
    }

    const previousBranchId = String(localStorage.getItem('branch_id') || '').trim();
    const nextBranchId = String(branch.branch_id).trim();
    const branchName = branch.name || branch.branch_name || 'workspace';

    if (previousBranchId && previousBranchId === nextBranchId) {
        return { switched: false, reason: 'same_branch' };
    }

    switching = true;
    switchingMeta = { branchName, branchId: nextBranchId };
    setBranchSwitching(true, switchingMeta);
    notify();

    try {
        // Clear subscription without broadcasting "no plan" (avoids Premium gate flash)
        clearSubscriptionForBranchSwitch();

        applyBranchToSession(branch);
        clearBranchScopedClientCaches(previousBranchId, nextBranchId);

        // Warm subscription for the new branch before reload
        await fetchSubscriptionStatusForBranch(nextBranchId);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent(BRANCH_CHANGED_EVENT, {
                    detail: {
                        previousBranchId,
                        branchId: nextBranchId,
                        branchName,
                    },
                })
            );
        }

        if (reload) {
            // Keep overlay visible through navigation
            window.location.reload();
            return { switched: true, reloading: true };
        }

        return { switched: true, reloading: false };
    } catch (error) {
        switching = false;
        switchingMeta = { branchName: '', branchId: '' };
        setBranchSwitching(false);
        notify();
        throw error;
    }
}

export { BRANCH_SWITCH_EVENT, BRANCH_CHANGED_EVENT };
