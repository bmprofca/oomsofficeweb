import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Loader2 } from 'lucide-react';
import { getBranchSwitchState, subscribeBranchSwitch } from '../utils/branchSwitch';

/**
 * Full-screen workspace transition while switching branches.
 * Mount once near the app root (e.g. inside Header or App layout).
 */
export default function BranchSwitchOverlay() {
    const [state, setState] = useState(() => getBranchSwitchState());

    useEffect(() => subscribeBranchSwitch(setState), []);

    if (!state.switching || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Building2 size={26} />
                        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
                            <Loader2 size={14} className="animate-spin text-blue-600" />
                        </span>
                    </div>
                    <h2 className="m-0 text-base font-semibold text-slate-900">
                        Switching workspace
                    </h2>
                    <p className="mt-1.5 mb-0 text-sm text-slate-500">
                        Loading{' '}
                        <span className="font-medium text-slate-700">
                            {state.branchName || 'selected branch'}
                        </span>
                        …
                    </p>
                    <p className="mt-3 mb-0 text-[11px] text-slate-400">
                        Refreshing data for this branch
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
