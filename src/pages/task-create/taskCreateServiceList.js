import axios from 'axios';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { TASK_CREATE_SERVICE_LIST_PARAMS } from './taskCreateConstants';

/**
 * Branch-added general services for task create (fees/gst from branch_services).
 */
export async function fetchTaskCreateServiceList({
    search = '',
    page_no = TASK_CREATE_SERVICE_LIST_PARAMS.page_no,
    limit = TASK_CREATE_SERVICE_LIST_PARAMS.limit,
} = {}) {
    const headers = getHeaders();
    if (!headers) {
        throw new Error('Authentication required. Please sign in again.');
    }

    const base = API_BASE_URL.replace(/\/$/, '');
    const response = await axios.get(`${base}/service/list`, {
        headers,
        params: {
            type: TASK_CREATE_SERVICE_LIST_PARAMS.type,
            is_added: TASK_CREATE_SERVICE_LIST_PARAMS.is_added,
            search: String(search || '').trim(),
            page_no,
            limit: Math.min(100, Math.max(1, Number(limit) || 10)),
        },
    });

    return response.data;
}

export function mapServiceToSelectOption(service) {
    if (!service?.service_id) return null;

    return {
        label: service.name || 'Service',
        value: service.service_id,
        service_id: service.service_id,
        name: service.name,
        fees: service.fees,
        gst_rate: service.gst_rate,
        gst_value: service.gst_value,
        remark: service.remark,
        sac_code: service.sac_code,
        is_added: service.is_added,
    };
}

export function mapServiceListToSelectOptions(services = []) {
    return services.map(mapServiceToSelectOption).filter(Boolean);
}
