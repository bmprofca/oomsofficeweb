import React, { useMemo } from 'react';
import { FiAward, FiUsers } from 'react-icons/fi';
import { FormSection, TransferList } from '../../../components/Modals/WizardModalParts';
import CustomSelect from '../../../components/CustomSelect';
import { formatMemberSelectedLabel } from '../SearchablePickField';

function toMemberOption(member) {
    if (!member?.username) return null;
    return {
        label: formatMemberSelectedLabel(member),
        value: member.username,
        username: member.username,
        name: member.name,
        mobile: member.mobile,
        balance: member.balance,
    };
}

export default function TeamStep({
    form,
    setForm,
    caList = [],
    selectedCa,
    setSelectedCa,
    allEmployees,
    selectedEmployees,
    employeeSearchQuery,
    setEmployeeSearchQuery,
    filteredAvailableEmployees,
    addEmployee,
    removeEmployee,
    addAllEmployees,
    removeAllEmployees,
    staffLoading,
    lockedFields = {},
}) {
    const caLocked = Boolean(lockedFields.ca);

    const caOptions = useMemo(
        () => caList.map((member) => toMemberOption(member)).filter(Boolean),
        [caList]
    );

    const caValue = useMemo(() => {
        if (!selectedCa) return null;
        return (
            caOptions.find((option) => option.value === selectedCa.username) ||
            toMemberOption(selectedCa)
        );
    }, [caOptions, selectedCa]);

    const toItem = (employee) => ({
        key: employee.username,
        title: employee.name || employee.username,
        subtitle: [employee.department || employee.designation, employee.mobile].filter(Boolean).join(' · ') || null,
        employee,
    });

    return (
        <div className="space-y-4">
            <FormSection title="Reviewing CA" description="Optional — the chartered accountant who signs off this work." icon={FiAward} tone="amber">
                <div className="max-w-md">
                    <CustomSelect
                        options={caOptions}
                        value={caValue}
                        onChange={(option) => {
                            if (caLocked) return;
                            if (!option) {
                                setSelectedCa(null);
                                setForm((prev) => ({ ...prev, ca: '' }));
                                return;
                            }
                            setSelectedCa({
                                username: option.username,
                                name: option.name,
                                mobile: option.mobile,
                                balance: option.balance,
                            });
                            setForm((prev) => ({ ...prev, ca: option.username }));
                        }}
                        getOptionLabel={(option) => option.label}
                        getOptionValue={(option) => option.value}
                        placeholder="Search CA by name or mobile..."
                        searchPlaceholder="Search CA..."
                        noOptionsMessage="No CA found"
                        isDisabled={caLocked}
                        isClearable={!caLocked}
                    />
                </div>
            </FormSection>

            <FormSection title="Employees" description="Everyone assigned here can see and update the task." icon={FiUsers} tone="emerald">
                <TransferList
                    availableTitle="Team members"
                    availableCount={allEmployees.length}
                    selectedTitle="Assigned"
                    available={filteredAvailableEmployees.map(toItem)}
                    selected={selectedEmployees.map(toItem)}
                    onAdd={(item) => addEmployee(item.employee)}
                    onRemove={(item) => removeEmployee(item.employee)}
                    onAddAll={addAllEmployees}
                    onRemoveAll={removeAllEmployees}
                    search={{
                        value: employeeSearchQuery,
                        onChange: setEmployeeSearchQuery,
                        placeholder: 'Search by name, mobile, designation…',
                    }}
                    loading={staffLoading}
                    emptyAvailable={employeeSearchQuery.trim() ? 'No matching employees' : 'No employees available'}
                    emptySelected="No one assigned yet"
                    heightClass="h-64 lg:h-[300px]"
                />
            </FormSection>
        </div>
    );
}
