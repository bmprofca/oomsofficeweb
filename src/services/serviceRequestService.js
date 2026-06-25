import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withHeaders = () => {
    const headers = getHeaders();
    if (!headers) throw new Error('Authentication headers are missing. Please sign in again.');
    return headers;
};

/**
 * GET /api/v1/service/service-request/list
 */
const SERVICE_REQUEST_STATUSES = new Set(['pending', 'approved', 'rejected']);

export const fetchServiceRequestList = async ({
    page_no = 1,
    limit = 20,
    search = '',
    status = null,
    firm_id = '',
    service_id = '',
} = {}) => {
    const headers = withHeaders();
    const params = { page_no, limit };
    if (String(search || '').trim()) params.search = String(search).trim();
    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (SERVICE_REQUEST_STATUSES.has(normalizedStatus)) {
        params.status = normalizedStatus;
    } else {
        params.status = null;
    }
    if (String(firm_id || '').trim()) params.firm_id = String(firm_id).trim();
    if (String(service_id || '').trim()) params.service_id = String(service_id).trim();
    const response = await axios.get(`${API_BASE_URL}/service/service-request/list`, {
        headers,
        params,
    });
    return response.data;
};

/**
 * PUT /api/v1/service/service-request/reject/:request_id
 */
export const rejectServiceRequest = async (requestId, { office_remark = '' } = {}) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/service/service-request/reject/${encodeURIComponent(requestId)}`,
        { office_remark: String(office_remark || '').trim() },
        { headers }
    );
    return response.data;
};

/**
 * PUT /api/v1/service/service-request/approve/:request_id
 */
export const approveServiceRequest = async (requestId, payload) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/service/service-request/approve/${encodeURIComponent(requestId)}`,
        payload,
        { headers }
    );
    return response.data;
};
