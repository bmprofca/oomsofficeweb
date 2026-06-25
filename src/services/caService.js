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

export const createCa = async ({ profile = {}, address = {}, opening_balance } = {}) => {
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
    const response = await axios.post(`${API_BASE_URL}/ca/create`, payload, { headers });
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

export const fetchCaDetailsProfile = async (username) => {
    const headers = withHeaders();
    const response = await axios.get(`${API_BASE_URL}/ca/details/profile`, {
        headers,
        params: { username: String(username || '').trim() },
    });
    return response.data;
};

export const editCaProfile = async (payload) => {
    const headers = withHeaders();
    const response = await axios.post(`${API_BASE_URL}/ca/details/edit-profile`, payload, { headers });
    return response.data;
};

/** @deprecated Use fetchCaDetailsProfile */
export const fetchCaProfile = fetchCaDetailsProfile;

export const changeCaStatus = async (username, status) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/ca/change-status`,
        { username: String(username || '').trim(), status },
        { headers }
    );
    return response.data;
};
