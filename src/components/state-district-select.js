import React, { useEffect, useMemo, useState } from 'react';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import CustomSelect from './CustomSelect';

const StateDistrictSelect = ({
    selectedState = '',
    selectedDistrict = '',
    onStateChange,
    onDistrictChange,
    stateLabel = 'State',
    districtLabel = 'District',
    required = true,
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
            const headers = getHeaders();
            if (!headers) {
                throw new Error('Missing authentication headers');
            }

            const response = await fetch(`${API_BASE_URL}/utils/states-and-districts`, {
                method: 'GET',
                headers,
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

    const stateSelectOptions = useMemo(
        () =>
            stateOptions.map((stateItem) => ({
                value: stateItem.name,
                label: stateItem.name,
            })),
        [stateOptions],
    );

    const districtSelectOptions = useMemo(() => {
        const options = districtOptions.map((district) => ({
            value: district,
            label: district,
        }));
        if (
            selectedDistrict &&
            !districtOptions.includes(selectedDistrict)
        ) {
            options.unshift({
                value: selectedDistrict,
                label: selectedDistrict,
            });
        }
        return options;
    }, [districtOptions, selectedDistrict]);

    const stateValue =
        stateSelectOptions.find((opt) => opt.value === selectedState) || null;
    const districtValue =
        districtSelectOptions.find((opt) => opt.value === selectedDistrict) ||
        null;

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <CustomSelect
                label={stateLabel}
                required={required}
                options={stateSelectOptions}
                value={stateValue}
                onChange={(opt) => {
                    onStateChange?.(opt?.value || '');
                    if (!opt?.value || opt.value !== selectedState) {
                        onDistrictChange?.('');
                    }
                }}
                placeholder="Select State"
                searchPlaceholder="Search state..."
                isClearable={!required}
                isSearchable
            />

            <CustomSelect
                label={districtLabel}
                required={required}
                options={districtSelectOptions}
                value={districtValue}
                onChange={(opt) => onDistrictChange?.(opt?.value || '')}
                placeholder={
                    selectedState ? 'Select District' : 'Select state first'
                }
                searchPlaceholder="Search district..."
                isDisabled={!selectedState}
                isClearable={!required}
                isSearchable
            />
        </div>
    );
};

export default StateDistrictSelect;
