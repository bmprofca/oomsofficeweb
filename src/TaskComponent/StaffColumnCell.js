import React from 'react';

const CA_APPROVAL_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    sent: 'bg-blue-50 text-blue-700 border border-blue-200',
    complete: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export const formatCaApprovalLabel = (status) => {
    const key = String(status || 'pending').toLowerCase().trim();
    if (key === 'sent') return 'Sent';
    if (key === 'complete') return 'Complete';
    return 'Pending';
};

export const getCaApprovalStyle = (status) => {
    const key = String(status || 'pending').toLowerCase().trim();
    return CA_APPROVAL_STYLES[key] || CA_APPROVAL_STYLES.pending;
};

/** Small CA approval status pill (pending / sent / complete). */
export function CaApprovalBadge({ status, className = '' }) {
    const key = String(status || 'pending').toLowerCase().trim();
    const label = formatCaApprovalLabel(key);
    return (
        <span
            className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${getCaApprovalStyle(key)} ${className}`.trim()}
            title={`CA approval: ${label}`}
        >
            {label}
        </span>
    );
}

/** CA name chip + approval status — reusable where staff column is absent (e.g. staff profile). */
export function AssignedCaBlock({
    task,
    showCa = true,
    className = '',
}) {
    if (!showCa || !task?.has_ca || !task?.ca) return null;

    const caName = String(task.ca.name || task.ca.username || '').trim();
    if (!caName) return null;

    const approval = task.ca_approval;
    const showApproval = approval != null && String(approval).trim() !== '';

    return (
        <div className={`flex flex-col items-start gap-0.5 min-w-0 max-w-full ${className}`.trim()}>
            <span
                className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded truncate max-w-full"
                title={`CA: ${caName}`}
            >
                CA: {caName}
            </span>
            {showApproval ? <CaApprovalBadge status={approval} /> : null}
        </div>
    );
}

const safeStaffName = (staff) => {
    if (!staff) return 'S';
    const name = staff.name || staff.profile?.name || staff.username || 'S';
    return typeof name === 'string' ? name : 'S';
};

/**
 * Shared Staff column cell: staff avatar badges, assigned CA (+ approval).
 * Used by task list, profile task tabs, and OD/D7 detailed.
 */
export default function StaffColumnCell({
    task,
    onOpenUsers,
    showCa = true,
    emptyFallback = <span className="text-gray-400 text-sm">-</span>,
}) {
    const staffs = Array.isArray(task?.staffs) ? task.staffs : [];
    const caName =
        showCa && task?.has_ca && task?.ca
            ? String(task.ca.name || task.ca.username || '').trim() || null
            : null;
    const serviceName = task?.service?.name || '';

    const openUsers = () => {
        if (typeof onOpenUsers === 'function') {
            onOpenUsers(staffs, serviceName);
        }
    };

    const renderStaffAvatars = () => {
        if (staffs.length === 1) {
            const staffName = safeStaffName(staffs[0]);
            return (
                <button
                    type="button"
                    onClick={openUsers}
                    className="flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity"
                    title={`Click to view ${staffName}'s details`}
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                        {staffName.charAt(0)}
                    </div>
                </button>
            );
        }

        if (staffs.length === 2) {
            return (
                <div className="flex -space-x-2">
                    {staffs.map((staff, staffIndex) => {
                        const staffName = safeStaffName(staff);
                        return (
                            <button
                                type="button"
                                key={staff.assign_id || staff.username || staffIndex}
                                onClick={openUsers}
                                className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                title={`Click to view ${staffName}'s details`}
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                    {staffName.charAt(0)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            );
        }

        if (staffs.length > 2) {
            const showMoreCount = staffs.length - 2;
            return (
                <div className="flex -space-x-2">
                    {staffs.slice(0, 2).map((staff, staffIndex) => {
                        const staffName = safeStaffName(staff);
                        return (
                            <button
                                type="button"
                                key={staff.assign_id || staff.username || staffIndex}
                                onClick={openUsers}
                                className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm hover:opacity-80 transition-opacity"
                                title={`Click to view all ${staffs.length} staff members`}
                            >
                                {staffName.charAt(0)}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={openUsers}
                        className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
                        title={`Click to view all ${staffs.length} staff members`}
                    >
                        +{showMoreCount}
                    </button>
                </div>
            );
        }

        return null;
    };

    if (staffs.length === 0 && !caName) {
        return emptyFallback;
    }

    return (
        <div className="flex flex-col items-start gap-1.5 min-w-0 max-w-full">
            {renderStaffAvatars()}
            {caName ? (
                <div className="flex flex-col items-start gap-0.5 min-w-0 max-w-full">
                    <span
                        className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded truncate max-w-full"
                        title={`CA: ${caName}`}
                    >
                        CA: {caName}
                    </span>
                    {task.ca_approval != null && String(task.ca_approval).trim() !== '' ? (
                        <CaApprovalBadge status={task.ca_approval} />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
