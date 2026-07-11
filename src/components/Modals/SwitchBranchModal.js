import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    FiCheck,
    FiChevronRight,
    FiHome,
    FiPlus,
    FiRefreshCw,
    FiShield,
    FiUsers,
    FiX,
} from 'react-icons/fi';
import { fetchOnboardingStatus } from '../../services/branchSetupService';

const normalizeBranch = (branch) => ({
    branch_id: branch.branch_id,
    name: branch.name || branch.branch_name || 'Unnamed branch',
    owned: !!branch.owned,
    role: branch.role || (branch.owned ? 'admin' : 'staff'),
});

const loadBranchesFromStorage = () => {
    try {
        const branchesJson = localStorage.getItem('user_branches');
        if (!branchesJson) return [];
        const parsed = JSON.parse(branchesJson);
        return Array.isArray(parsed) ? parsed.map(normalizeBranch) : [];
    } catch (error) {
        console.error('Failed to parse user_branches:', error);
        return [];
    }
};

const saveBranchesToStorage = (branches) => {
    try {
        localStorage.setItem('user_branches', JSON.stringify(branches));
    } catch (error) {
        console.error('Failed to update user_branches:', error);
    }
};

const getRoleMeta = (branch) => {
    if (branch.owned || branch.role === 'admin') {
        return {
            label: 'Owner',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: FiShield,
            accent: 'from-emerald-500 to-teal-500',
            cardHover: 'hover:border-emerald-200 hover:bg-emerald-50/40',
        };
    }
    return {
        label: branch.role === 'staff' ? 'Staff' : 'Member',
        className: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: FiUsers,
        accent: 'from-indigo-500 to-violet-500',
        cardHover: 'hover:border-indigo-200 hover:bg-indigo-50/40',
    };
};

const SwitchBranchModal = ({ isOpen, onClose, onSelectCompany, onOpenBranchSetup }) => {
    const [companies, setCompanies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const activeBranchId = localStorage.getItem('branch_id');

    const refreshBranches = useCallback(async ({ showSpinner = true } = {}) => {
        if (showSpinner) setIsRefreshing(true);
        setFetchError('');

        try {
            const data = await fetchOnboardingStatus();
            const freshBranches = (data?.branches || []).map(normalizeBranch);
            setCompanies(freshBranches);
            saveBranchesToStorage(freshBranches);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
            setFetchError(error.message || 'Could not refresh branches. Showing saved list.');
        } finally {
            if (showSpinner) setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        setSearchTerm('');
        setFetchError('');
        setCompanies(loadBranchesFromStorage());
        refreshBranches();

        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose, refreshBranches]);

    const filteredCompanies = companies.filter(
        (company) =>
            company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(company.branch_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="switch-branch-modal-title"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-[1] pointer-events-auto w-full max-w-3xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="shrink-0 px-5 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
                                    <FiHome size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h2 id="switch-branch-modal-title" className="text-sm font-semibold text-white truncate">
                                        Switch Branch
                                    </h2>
                                    <p className="text-indigo-100 text-xs truncate">
                                        Select a workspace to continue
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => refreshBranches()}
                                    disabled={isRefreshing}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition-colors disabled:opacity-60"
                                    title="Refresh branches"
                                >
                                    <FiRefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition-colors"
                                    title="Close"
                                    aria-label="Close"
                                >
                                    <FiX size={16} />
                                </button>
                            </div>
                        </div>

                    <div className="shrink-0 px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                        <input
                            type="text"
                            placeholder="Search by branch name or ID..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {fetchError && (
                            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                {fetchError}
                            </p>
                        )}
                    </div>

                    <div
                        className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {isRefreshing && companies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                <FiRefreshCw size={28} className="animate-spin text-indigo-500 mb-3" />
                                <p className="text-sm font-medium">Loading your branches...</p>
                            </div>
                        ) : filteredCompanies.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredCompanies.map((branch) => {
                                    const isActive = branch.branch_id === activeBranchId;
                                    const roleMeta = getRoleMeta(branch);
                                    const RoleIcon = roleMeta.icon;

                                    return (
                                        <button
                                            key={branch.branch_id}
                                            type="button"
                                            onClick={() => {
                                                onSelectCompany(branch);
                                                onClose();
                                            }}
                                            className={`group relative flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                                                isActive
                                                    ? 'border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-sm'
                                                    : `border-slate-200 bg-white ${roleMeta.cardHover}`
                                            }`}
                                        >
                                            {isActive && (
                                                <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                                                    <FiCheck size={13} />
                                                </span>
                                            )}

                                            <div className="flex min-w-0 items-center gap-3 pr-8">
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${roleMeta.accent} text-white shadow-md`}
                                                >
                                                    <FiHome size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-800 truncate">{branch.name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                        ID: {branch.branch_id}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleMeta.className}`}
                                                        >
                                                            <RoleIcon size={10} />
                                                            {roleMeta.label}
                                                        </span>
                                                        {isActive && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <FiChevronRight
                                                size={18}
                                                className="shrink-0 text-slate-300 group-hover:text-indigo-500 transition-colors"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                                    <FiHome size={28} />
                                </div>
                                <p className="text-base font-semibold text-slate-700">No branches found</p>
                                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                                    {searchTerm
                                        ? 'Try a different search term or clear the filter.'
                                        : 'Create a new branch or accept an invitation to get started.'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-xs text-slate-500 sm:max-w-[55%]">
                            Switching branch reloads the app with that workspace context.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onOpenBranchSetup}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 transition-colors"
                            >
                                <FiPlus size={16} />
                                Add Branch
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SwitchBranchModal;
