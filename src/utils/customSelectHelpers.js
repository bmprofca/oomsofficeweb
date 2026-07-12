import React from 'react';
import API_BASE_URL from './api-controller';
import getHeaders from './get-headers';

const defaultListExtractor = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

export function optionByValue(options, value, valueKey = 'value') {
    if (value == null || value === '') return null;
    return (
        (options || []).find(
            (option) =>
                option?.[valueKey] === value ||
                String(option?.[valueKey]) === String(value)
        ) ?? null
    );
}

export function createFetchLoadOptions({
    endpoint,
    queryParams = {},
    searchParam = 'search',
    dataExtractor = defaultListExtractor,
} = {}) {
    return async (search) => {
        const headers = getHeaders();
        if (!headers) {
            throw new Error('Authentication headers missing');
        }
        const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
        const cleanEndpoint = String(endpoint || '').replace(/^\//, '');
        const url = new URL(cleanEndpoint, base);
        const query = String(search ?? '').trim();
        if (query) {
            url.searchParams.append(searchParam, query);
        }
        Object.entries(queryParams).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                url.searchParams.append(key, val);
            }
        });
        const response = await fetch(url.toString(), { headers });
        const json = await response.json();
        if (!response.ok) {
            throw new Error(json?.message || 'Failed to load options');
        }
        return dataExtractor(json);
    };
}

export const CLIENT_LIST_QUERY_PARAMS = { page: 1, limit: 20 };

export function createClientListLoadOptions(queryParams = CLIENT_LIST_QUERY_PARAMS) {
    return createFetchLoadOptions({
        endpoint: '/client/list',
        queryParams,
        dataExtractor: (response) => response?.data || [],
    });
}

export function getClientOptionLabel(item) {
    return item?.name || item?.label || item?.username || '—';
}

export function getClientOptionValue(item) {
    return item?.username || item?.profile_id || item?.value || '';
}

export function renderClientListOption(item) {
    const name = item?.name || '—';
    const phone = item?.mobile || item?.phone || '';
    const email = item?.email || '';
    return (
        <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="font-medium text-gray-900 truncate">{name}</span>
            {phone ? (
                <>
                    <span className="text-gray-400 shrink-0">•</span>
                    <span className="text-gray-600 truncate">{phone}</span>
                </>
            ) : null}
            {email ? (
                <>
                    <span className="text-gray-400 shrink-0">•</span>
                    <span className="text-gray-500 text-xs truncate">{email}</span>
                </>
            ) : null}
        </div>
    );
}
