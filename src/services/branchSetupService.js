import API_BASE_URL from '../utils/api-controller';
import { clearUserPermissionCache } from '../utils/permission-helper';

export function getAuthHeaders({ skipBranch = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const username = localStorage.getItem('user_username') || localStorage.getItem('username');
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const branchId = localStorage.getItem('branch_id');

    if (username) headers.username = username;
    if (token) headers.token = token;
    if (branchId && !skipBranch) headers.branch = branchId;

    return headers;
}

export function resolveBranchRole(branch) {
    if (!branch) return 'staff';
    if (branch.role) return branch.role;
    return branch.owned ? 'admin' : 'staff';
}

export function formatBranchRoleLabel(branchOrRole) {
    const role = typeof branchOrRole === 'string'
        ? branchOrRole
        : resolveBranchRole(branchOrRole);
    const owned = typeof branchOrRole === 'object' && branchOrRole
        ? !!branchOrRole.owned
        : role === 'admin';

    if (owned || role === 'admin') return 'Owner';
    if (role === 'staff') return 'Staff';
    return 'Member';
}

export function syncBranchRoleToStorage(branch) {
    const role = resolveBranchRole(branch);
    localStorage.setItem('branch_role', role);
    return role;
}

export function getStoredBranchRoleLabel() {
    const branchId = localStorage.getItem('branch_id');
    if (!branchId) return 'Member';

    try {
        const branchesJson = localStorage.getItem('user_branches');
        const branches = branchesJson ? JSON.parse(branchesJson) : [];
        const activeBranch = Array.isArray(branches)
            ? branches.find((branch) => String(branch.branch_id) === String(branchId))
            : null;

        if (activeBranch) {
            syncBranchRoleToStorage(activeBranch);
            return formatBranchRoleLabel(activeBranch);
        }
    } catch (error) {
        console.error('Failed to resolve branch role from storage:', error);
    }

    const storedRole = localStorage.getItem('branch_role');
    if (storedRole) {
        return formatBranchRoleLabel(storedRole);
    }

    const owned = localStorage.getItem('branch_owned') === 'true';
    const fallbackRole = owned ? 'admin' : 'staff';
    localStorage.setItem('branch_role', fallbackRole);
    return formatBranchRoleLabel(fallbackRole);
}

export function applyBranchToSession(branch) {
    if (!branch?.branch_id) return;

    const previousBranchId = localStorage.getItem('branch_id') || '';
    const name = branch.name || branch.branch_name;
    const role = syncBranchRoleToStorage(branch);
    localStorage.setItem('branch_id', branch.branch_id);
    localStorage.setItem('branch_name', name || '');
    localStorage.setItem('branch_code', branch.branch_id);
    localStorage.setItem('branch_owned', branch.owned ? 'true' : 'false');

    if (String(previousBranchId) !== String(branch.branch_id)) {
        clearUserPermissionCache(null, previousBranchId);
        clearUserPermissionCache(null, branch.branch_id);
    }

    try {
        const branchesJson = localStorage.getItem('user_branches');
        const branches = branchesJson ? JSON.parse(branchesJson) : [];
        const entry = {
            branch_id: branch.branch_id,
            name,
            owned: !!branch.owned,
            role,
        };
        const existingIndex = branches.findIndex((item) => item.branch_id === entry.branch_id);
        if (existingIndex >= 0) {
            branches[existingIndex] = { ...branches[existingIndex], ...entry };
        } else {
            branches.push(entry);
        }
        localStorage.setItem('user_branches', JSON.stringify(branches));
    } catch (error) {
        console.error('Failed to update user_branches:', error);
    }
}

export async function fetchOnboardingStatus() {
    const response = await fetch(`${API_BASE_URL}/branch/onboarding`, {
        method: 'GET',
        headers: getAuthHeaders({ skipBranch: true }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load branch status');
    }
    return result.data;
}

export async function fetchMyInvitations() {
    const response = await fetch(`${API_BASE_URL}/branch/invitations/my-invitations`, {
        method: 'GET',
        headers: getAuthHeaders({ skipBranch: true }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load invitations');
    }
    return result.data?.invitations || [];
}

export async function acceptBranchInvitation(token) {
    const username = localStorage.getItem('user_username') || localStorage.getItem('username');
    const response = await fetch(`${API_BASE_URL}/branch/invitations/accept/${token}`, {
        method: 'POST',
        headers: getAuthHeaders({ skipBranch: true }),
        body: JSON.stringify({ username }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to accept invitation');
    }
    return result.data;
}

export async function createBranch(branchData) {
    const response = await fetch(`${API_BASE_URL}/branch/create`, {
        method: 'POST',
        headers: getAuthHeaders({ skipBranch: true }),
        body: JSON.stringify(branchData),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create branch');
    }

    const payload = result.data || {};
    return {
        branch_id: payload.branch_id || payload.branch?.branch_id,
        branch_name: payload.branch_name || payload.name || payload.branch?.branch_name,
        name: payload.name || payload.branch_name || payload.branch?.branch_name,
        owned: payload.owned ?? true,
    };
}

export function normalizeCreatedBranch(data) {
    return {
        branch_id: data?.branch_id || data?.branch?.branch_id,
        branch_name: data?.branch_name || data?.branch?.branch_name,
        owned: data?.owned ?? true,
    };
}
