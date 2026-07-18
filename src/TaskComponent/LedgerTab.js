import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import ClientLedger from '../ClientComponents/LedgerTab';

/**
 * Task profile Ledger tab — same UI/behavior as the client profile ledger,
 * scoped to the task's client.
 */
const LedgerTab = ({
    taskId,
    task_id,
    clientId,
    clientName,
}) => {
    const username = clientId;

    if (!username) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
                <FiAlertCircle className="mx-auto mb-2 h-6 w-6 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                    Client not found for this task
                </p>
                <p className="mt-1 text-xs text-amber-700">
                    Unable to load ledger without a linked client.
                </p>
            </div>
        );
    }

    return (
        <ClientLedger
            username={username}
            clientUsername={username}
            clientId={username}
            clientName={clientName}
            taskId={taskId || task_id}
        />
    );
};

export default LedgerTab;
