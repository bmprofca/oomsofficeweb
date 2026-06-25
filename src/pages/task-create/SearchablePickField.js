import React from 'react';
import { FiX } from 'react-icons/fi';
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
}) {
    return (
        <div className="space-y-2">
            {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
            {selected ? (
                <div className="relative flex items-center w-full bg-white border border-gray-300 rounded-xl min-h-[42px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                    {Icon && (
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                    )}
                    <span className="flex-1 pl-9 pr-9 py-2.5 text-sm text-gray-900 truncate">
                        {renderSelected ? renderSelected(selected) : selected.name || selected.label}
                    </span>
                    <button
                        type="button"
                        onClick={onClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Clear"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-visible">
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
        </div>
    );
}

export const assignableMemberExtractor = (res) =>
    (Array.isArray(res?.data) ? res.data : []).filter((r) => r?.is_accepted && r?.status);

export const memberLabelMapping = {
    primary: (item) => item.profile?.name || item.username,
    secondary: (item) =>
        [item.profile?.mobile, item.profile?.email].filter(Boolean).join(' · '),
};
