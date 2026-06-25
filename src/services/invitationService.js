import axios from 'axios';
import { API_BASE_URL_NO_VERSION } from '../utils/api-controller';

export const fetchInvitationDetails = async (token) => {
    const response = await axios.get(`${API_BASE_URL_NO_VERSION}/public/invitation-details`, {
        params: { token: String(token || '').trim() },
    });
    return response.data;
};

export const acceptInvitation = async (token) => {
    const response = await axios.post(`${API_BASE_URL_NO_VERSION}/public/invitation-accept`, {
        token: String(token || '').trim(),
    });
    return response.data;
};
