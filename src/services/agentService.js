import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withHeaders = () => {
    const headers = getHeaders();
    if (!headers) throw new Error('Authentication headers are missing. Please sign in again.');
    return headers;
};

export const fetchAgentList = async ({ search = '', page = 1, limit = 20 } = {}) => {
    const headers = withHeaders();
    const params = { page, limit };
    if (String(search || '').trim()) params.search = String(search).trim();
    const response = await axios.get(`${API_BASE_URL}/agent/list`, { headers, params });
    return response.data;
};

export const checkAgentUser = async (email) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/agent/check-user`,
        { email: String(email || '').trim() },
        { headers }
    );
    return response.data;
};

export const createAgentInvitation = async (username) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/agent/create`,
        { username: String(username || '').trim() },
        { headers }
    );
    return response.data;
};

export const deleteAgent = async (mapId) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/agent/delete`,
        { map_id: mapId },
        { headers }
    );
    return response.data;
};

export const resendAgentInvitation = async (mapId) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/agent/resend-invitation`,
        { map_id: String(mapId || '').trim() },
        { headers }
    );
    return response.data;
};

export const fetchAgentProfile = async (username) => {
    const headers = withHeaders();
    const response = await axios.get(`${API_BASE_URL}/agent/profile`, {
        headers,
        params: { username: String(username || '').trim() },
    });
    return response.data;
};

export const changeAgentStatus = async (username, status) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/agent/change-status`,
        { username: String(username || '').trim(), status },
        { headers }
    );
    return response.data;
};
