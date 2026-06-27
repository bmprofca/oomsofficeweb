import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withHeaders = () => {
    const headers = getHeaders();
    if (!headers) throw new Error('Authentication headers are missing. Please sign in again.');
    return headers;
};

export const taskGetIn = async (taskId) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/task/details/get-in/${encodeURIComponent(String(taskId || '').trim())}`,
        null,
        { headers }
    );
    return response.data;
};

export const taskGetOut = async (taskId) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/task/details/get-out/${encodeURIComponent(String(taskId || '').trim())}`,
        null,
        { headers }
    );
    return response.data;
};
