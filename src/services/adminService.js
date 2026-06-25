import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withHeaders = () => {
    const headers = getHeaders();
    if (!headers) throw new Error('Authentication headers are missing. Please sign in again.');
    return headers;
};

export const fetchAdminList = async ({ search = '', page = 1, limit = 20 } = {}) => {
    const headers = withHeaders();
    const params = { page, limit };
    if (String(search || '').trim()) params.search = String(search).trim();
    const response = await axios.get(`${API_BASE_URL}/admin/list`, { headers, params });
    return response.data;
};

export const checkAdminUser = async (email) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/admin/check-user`,
        { email: String(email || '').trim() },
        { headers }
    );
    return response.data;
};

export const createAdminInvitation = async (username) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/admin/create`,
        { username: String(username || '').trim() },
        { headers }
    );
    return response.data;
};

export const deleteAdmin = async (mapId) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/admin/delete`,
        { map_id: mapId },
        { headers }
    );
    return response.data;
};

export const resendAdminInvitation = async (mapId) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/admin/resend-invitation`,
        { map_id: String(mapId || '').trim() },
        { headers }
    );
    return response.data;
};

export const fetchAdminProfile = async (username) => {
    const headers = withHeaders();
    const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
        headers,
        params: { username: String(username || '').trim() },
    });
    return response.data;
};

export const changeAdminStatus = async (username, status) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/admin/change-status`,
        { username: String(username || '').trim(), status },
        { headers }
    );
    return response.data;
};
