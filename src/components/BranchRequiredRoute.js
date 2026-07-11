import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { applyBranchToSession, fetchOnboardingStatus } from '../services/branchSetupService';

const BRANCH_OPTIONAL_PATHS = ['/branch-setup', '/subscription', '/my-profile'];

const isBranchOptionalPath = (pathname) =>
    BRANCH_OPTIONAL_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

const hasValidBranchInStorage = () => {
    const branchId = localStorage.getItem('branch_id');
    return !!(branchId && branchId !== 'null' && branchId !== 'undefined');
};

const BranchRequiredRoute = ({ children }) => {
    const location = useLocation();
    const [state, setState] = useState(() => ({
        loading: !hasValidBranchInStorage(),
        needsSetup: false,
    }));

    useEffect(() => {
        let cancelled = false;

        const verifyBranchAccess = async () => {
            if (isBranchOptionalPath(location.pathname)) {
                if (!cancelled) {
                    setState({ loading: false, needsSetup: false });
                }
                return;
            }

            try {
                const data = await fetchOnboardingStatus();
                if (cancelled) return;

                if (!data.has_branch) {
                    setState({ loading: false, needsSetup: true });
                    return;
                }

                localStorage.setItem('user_branches', JSON.stringify(data.branches || []));

                const branchId = localStorage.getItem('branch_id');
                const hasValidBranchId = branchId && branchId !== 'null' && branchId !== 'undefined';
                const activeBranch = data.branches?.find((branch) => branch.branch_id === branchId);

                if (!hasValidBranchId || !activeBranch) {
                    applyBranchToSession(data.branches[0]);
                    window.location.replace(location.pathname + location.search);
                    return;
                }

                setState({ loading: false, needsSetup: false });
            } catch (error) {
                console.error('Branch access check failed:', error);
                if (!cancelled) {
                    setState({ loading: false, needsSetup: false });
                }
            }
        };

        verifyBranchAccess();

        return () => {
            cancelled = true;
        };
    }, [location.pathname, location.search]);

    if (state.loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Loading workspace...</p>
            </div>
        );
    }

    if (state.needsSetup) {
        return <Navigate to="/branch-setup" replace />;
    }

    return children;
};

export default BranchRequiredRoute;
