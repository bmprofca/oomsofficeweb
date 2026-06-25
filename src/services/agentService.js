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

export const createAgent = async ({ profile = {}, address = {}, opening_balance } = {}) => {
    const headers = withHeaders();
    const payload = { profile, address };
    if (
        opening_balance &&
        opening_balance.amount !== undefined &&
        opening_balance.amount !== null &&
        opening_balance.amount !== ''
    ) {
        payload.opening_balance = opening_balance;
    }
    const response = await axios.post(`${API_BASE_URL}/agent/create`, payload, { headers });
    return response.data;
};

export const fetchAgentDetailsProfile = async (username) => {
    const headers = withHeaders();
    const response = await axios.get(`${API_BASE_URL}/agent/details/profile`, {
        headers,
        params: { username: String(username || '').trim() },
    });
    return response.data;
};

export const editAgentProfile = async (payload) => {
    const headers = withHeaders();
    const response = await axios.post(`${API_BASE_URL}/agent/details/edit-profile`, payload, { headers });
    return response.data;
};

/** @deprecated Use fetchAgentDetailsProfile */
export const fetchAgentProfile = fetchAgentDetailsProfile;

export const changeAgentStatus = async (username, status) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/agent/change-status`,
        { username: String(username || '').trim(), status },
        { headers }
    );
    return response.data;
};
