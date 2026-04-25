import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withAuthHeaders = () => {
    const headers = getHeaders();
    if (!headers) throw new Error('Missing authentication headers');
    return headers;
};

/**
 * Client profile password list only. Create / edit / delete use
 * `passwordGroupService` (same endpoints as office-assistance PasswordGroupFirms).
 *
 * Branch-scoped password groups for dropdowns (GET …/password/group-list).
 */
export const clientPasswordService = {
    async list(clientUsername, { search = '', page = 1, limit = 20 } = {}) {
        const headers = withAuthHeaders();
        const params = new URLSearchParams();
        params.set('username', String(clientUsername || '').trim());
        params.set('page', String(Math.max(1, Number(page) || 1)));
        params.set('limit', String(Math.min(100, Math.max(1, Number(limit) || 20))));
        if (String(search || '').trim()) params.set('search', String(search).trim());
        return axios.get(`${API_BASE_URL}/client/details/password/list?${params.toString()}`, { headers });
    },

    /** Active password groups for the current branch (`group_id`, `group_name`). */
    async groupList() {
        const headers = withAuthHeaders();
        return axios.get(`${API_BASE_URL}/client/details/password/group-list`, { headers });
    },
};
