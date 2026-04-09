import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../utils/api-controller';

const StateDistrictSelect = ({
    selectedState = '',
    selectedDistrict = '',
    onStateChange,
    onDistrictChange,
    stateLabel = 'State',
    districtLabel = 'District',
    required = true,
    selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none',
}) => {
    const [stateOptions, setStateOptions] = useState([]);
    const [districtOptions, setDistrictOptions] = useState([]);

    useEffect(() => {
        fetchStatesAndDistricts();
    }, []);

    useEffect(() => {
        const selected = stateOptions.find((item) => item.name === selectedState);
        setDistrictOptions(Array.isArray(selected?.districts) ? selected.districts : []);
    }, [selectedState, stateOptions]);

    const fetchStatesAndDistricts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/utils/states-and-districts`, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`States API failed (${response.status})`);
            }

            const json = await response.json();
            const states = Array.isArray(json?.data) ? json.data : [];
            setStateOptions(states);
        } catch (error) {
            console.error('States and districts fetch error:', error);
            setStateOptions([]);
            setDistrictOptions([]);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {stateLabel}
                </label>
                <select
                    value={selectedState}
                    onChange={(e) => onStateChange?.(e.target.value)}
                    className={selectClassName}
                    required={required}
                >
                    <option value="">Select State</option>
                    {stateOptions.map((stateItem) => (
                        <option key={stateItem.name} value={stateItem.name}>
                            {stateItem.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {districtLabel}
                </label>
                <select
                    value={selectedDistrict}
                    onChange={(e) => onDistrictChange?.(e.target.value)}
                    className={selectClassName}
                    disabled={!selectedState}
                    required={required}
                >
                    <option value="">
                        {selectedState ? 'Select District' : 'Select state first'}
                    </option>
                    {districtOptions.map((district) => (
                        <option key={district} value={district}>
                            {district}
                        </option>
                    ))}
                    {selectedDistrict && !districtOptions.includes(selectedDistrict) && (
                        <option value={selectedDistrict}>{selectedDistrict}</option>
                    )}
                </select>
            </div>
        </div>
    );
};

export default StateDistrictSelect;
