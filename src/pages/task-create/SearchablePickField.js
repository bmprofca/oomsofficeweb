import React from 'react';
import { FiLock, FiX } from 'react-icons/fi';
import SearchableSelect from '../../components/SearchableSelect';

/**
 * SearchableSelect with a selected-value display (clear to search again).
 */
export default function SearchablePickField({
    label,
    icon: Icon,
    selected,
    onClear,
    onSelect,
    listEndpoint,
    endpoint,
    valueKey,
    labelMapping,
    dataExtractor,
    placeholder,
    initialParams = { page: 1, limit: 200 },
    minChars = 1,
    renderSelected,
    locked = false,
    hasError = false,
    fieldRef,
    errorMessage,
}) {
    const errorRing = hasError ? 'ring-2 ring-red-500 border-red-500' : '';

    return (
        <div className="space-y-1.5" ref={fieldRef}>
            {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
            {selected ? (
                <div
                    className={`relative flex items-center w-full border rounded-xl min-h-[42px] ${errorRing} ${
                        locked
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500'
                    }`}
                >
                    {Icon && (
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                    )}
                    <span className="flex-1 pl-9 pr-9 py-2.5 text-sm text-gray-900 truncate">
                        {renderSelected ? renderSelected(selected) : selected.name || selected.label}
                    </span>
                    {locked ? (
                        <FiLock
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0"
                            title="Locked"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={onClear}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Clear"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : locked ? (
                <div className="flex items-center gap-2 w-full bg-gray-50 border border-gray-200 rounded-xl min-h-[42px] px-3 py-2.5 text-sm text-gray-500">
                    <FiLock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Pre-selected</span>
                </div>
            ) : (
                <div
                    className={`relative rounded-xl border bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-visible ${errorRing} ${
                        hasError ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                    {Icon && (
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                    )}
                    <div className={Icon ? '[&_input]:!pl-9' : ''}>
                        <SearchableSelect
                            listEndpoint={listEndpoint}
                            endpoint={endpoint || listEndpoint}
                            initialParams={initialParams}
                            searchParam="search"
                            valueKey={valueKey}
                            labelMapping={labelMapping}
                            dataExtractor={dataExtractor}
                            onSelect={onSelect}
                            placeholder={placeholder}
                            minChars={minChars}
                        />
                    </div>
                </div>
            )}
            {hasError && errorMessage && (
                <p className="text-xs text-red-600" role="alert">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}

export const assignableMemberExtractor = (res) =>
    (Array.isArray(res?.data) ? res.data : []).filter((r) => {
        if (r?.is_accepted != null) return Boolean(r.is_accepted && r.status);
        return Boolean(r?.status);
    });

const formatMemberBalance = (balance) => {
    const n = Number(balance);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

export const memberLabelMapping = {
    primary: (item) => item.name || item.profile?.name || '—',
    secondary: (item) => {
        const mobile = item.mobile || item.profile?.mobile;
        const balance = formatMemberBalance(item.balance ?? item.profile?.balance);
        const parts = [];
        if (mobile) parts.push(mobile);
        if (balance != null) parts.push(`₹${balance}`);
        return parts.join(' · ') || '—';
    },
};

export function formatMemberSelectedLabel(item) {
    if (!item) return '—';
    const name = item.name || item.profile?.name || '—';
    const mobile = item.mobile || item.profile?.mobile;
    const balance = formatMemberBalance(item.balance ?? item.profile?.balance);
    const parts = [name];
    if (mobile) parts.push(mobile);
    if (balance != null) parts.push(`₹${balance}`);
    return parts.join(' · ');
}
