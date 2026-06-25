import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withHeaders = () => {
    const headers = getHeaders();
    if (!headers) throw new Error('Authentication headers are missing. Please sign in again.');
    return headers;
};

export const fetchCaList = async ({ search = '', page = 1, limit = 20 } = {}) => {
    const headers = withHeaders();
    const params = { page, limit };
    if (String(search || '').trim()) params.search = String(search).trim();
    const response = await axios.get(`${API_BASE_URL}/ca/list`, { headers, params });
    return response.data;
};

export const checkCaUser = async (email) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/ca/check-user`,
        { email: String(email || '').trim() },
        { headers }
    );
    return response.data;
};

export const createCaInvitation = async (username) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/ca/create`,
        { username: String(username || '').trim() },
        { headers }
    );
    return response.data;
};

export const deleteCa = async (mapId) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/ca/delete`,
        { map_id: mapId },
        { headers }
    );
    return response.data;
};

export const resendCaInvitation = async (mapId) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/ca/resend-invitation`,
        { map_id: String(mapId || '').trim() },
        { headers }
    );
    return response.data;
};

export const fetchCaProfile = async (username) => {
    const headers = withHeaders();
    const response = await axios.get(`${API_BASE_URL}/ca/profile`, {
        headers,
        params: { username: String(username || '').trim() },
    });
    return response.data;
};

export const changeCaStatus = async (username, status) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/ca/change-status`,
        { username: String(username || '').trim(), status },
        { headers }
    );
    return response.data;
};
