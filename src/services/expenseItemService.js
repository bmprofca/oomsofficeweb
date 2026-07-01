import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const withHeaders = () => {
    const headers = getHeaders();
    if (!headers) throw new Error('Authentication headers are missing. Please sign in again.');
    return headers;
};

export const EXPENSE_ITEM_TYPES = [
    { value: 'direct', label: 'Direct Expense' },
    { value: 'indirect', label: 'Indirect Expense' },
    { value: 'reimbursement', label: 'Reimbursement Expense' },
];

export const EXPENSE_ITEM_TYPE_FILTER_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'direct', label: 'Direct' },
    { value: 'indirect', label: 'Indirect' },
    { value: 'reimbursement', label: 'Reimbursement' },
];

export const fetchExpenseItemList = async ({ search = '', type = '', page_no = 1, limit = 20 } = {}) => {
    const headers = withHeaders();
    const params = { page_no, limit };
    if (String(search || '').trim()) params.search = String(search).trim();
    if (String(type || '').trim()) params.type = String(type).trim();
    const response = await axios.get(`${API_BASE_URL}/expense/item/list`, { headers, params });
    return response.data;
};

export const fetchExpenseItemDetails = async (item_id) => {
    const headers = withHeaders();
    const response = await axios.get(`${API_BASE_URL}/expense/item/details`, {
        headers,
        params: { item_id },
    });
    return response.data;
};

export const createExpenseItem = async ({ name, remark = '', type = 'direct' } = {}) => {
    const headers = withHeaders();
    const response = await axios.post(
        `${API_BASE_URL}/expense/item/create`,
        { name, remark, type },
        { headers }
    );
    return response.data;
};

export const updateExpenseItem = async ({ item_id, name, remark, type } = {}) => {
    const headers = withHeaders();
    const response = await axios.put(
        `${API_BASE_URL}/expense/item/edit`,
        { item_id, name, remark, type },
        { headers }
    );
    return response.data;
};

export const deleteExpenseItem = async (item_id) => {
    const headers = withHeaders();
    const response = await axios.delete(`${API_BASE_URL}/expense/item/delete`, {
        headers,
        data: { item_id },
    });
    return response.data;
};

export const formatExpenseItemType = (type) => {
    const match = EXPENSE_ITEM_TYPES.find((t) => t.value === type);
    return match?.label || type || '—';
};

export const getExpenseItemTypeBadgeClass = (type) => {
    switch (type) {
        case 'direct':
            return 'bg-blue-100 text-blue-700';
        case 'indirect':
            return 'bg-purple-100 text-purple-700';
        case 'reimbursement':
            return 'bg-emerald-100 text-emerald-700';
        default:
            return 'bg-slate-100 text-slate-700';
    }
};
