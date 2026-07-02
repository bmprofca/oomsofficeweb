import React from 'react';
import { FiEye } from 'react-icons/fi';
import {
    CapitalModalShell,
    MODAL_BODY_CLASS,
} from './CapitalModalParts';

const DetailRow = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="min-w-0 text-right text-sm text-slate-800">{children}</span>
    </div>
);

const DetailsSkeleton = () => (
    <div className="animate-pulse space-y-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-6 w-24 rounded bg-slate-200" />
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="flex justify-between gap-4">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="h-4 w-32 rounded bg-slate-200" />
                </div>
                <div className="flex justify-between gap-4">
                    <div className="h-3 w-14 rounded bg-slate-200" />
                    <div className="h-4 w-40 rounded bg-slate-200" />
                </div>
            </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="mb-3 h-3 w-20 rounded bg-slate-200" />
            <div className="space-y-3">
                <div className="flex justify-between gap-4">
                    <div className="h-3 w-16 rounded bg-slate-200" />
                    <div className="h-4 w-28 rounded bg-slate-200" />
                </div>
                <div className="flex justify-between gap-4">
                    <div className="h-3 w-24 rounded bg-slate-200" />
                    <div className="h-4 w-28 rounded bg-slate-200" />
                </div>
            </div>
        </div>
    </div>
);

const CapitalAccountDetailsModal = ({ isOpen, onClose, account, loading = false, formatCurrency }) => {
    if (!isOpen) return null;

    const balance = Number(account?.balance) || 0;
    const isNegativeBalance = balance < 0;
    const displayBalance = Math.abs(balance);

    return (
        <CapitalModalShell
            open={isOpen}
            onClose={onClose}
            maxWidth="max-w-md"
            title={account?.name || 'Capital account'}
            subtitle="Account details"
            icon={FiEye}
            footer={(
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            )}
        >
            <div className={MODAL_BODY_CLASS}>
                {loading || !account ? (
                    <DetailsSkeleton />
                ) : (
                    <>
                        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                        account.status ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {account.status ? 'Active' : 'Inactive'}
                                </span>
                                <span
                                    className={`text-lg font-bold tabular-nums ${
                                        isNegativeBalance ? 'text-red-600' : 'text-emerald-700'
                                    }`}
                                >
                                    {isNegativeBalance ? '-' : ''}₹{formatCurrency(displayBalance)}
                                </span>
                            </div>
                            <DetailRow label="Account name">{account.name || '—'}</DetailRow>
                            <DetailRow label="Remark">
                                <span className="block max-w-[14rem] truncate" title={account.remark || ''}>
                                    {account.remark || '—'}
                                </span>
                            </DetailRow>
                        </div>

                        {(account.create_by?.name || account.modify_by?.name) && (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Audit trail
                                </p>
                                {account.create_by?.name ? (
                                    <DetailRow label="Created by">{account.create_by.name}</DetailRow>
                                ) : null}
                                {account.modify_by?.name ? (
                                    <DetailRow label="Last modified by">{account.modify_by.name}</DetailRow>
                                ) : null}
                            </div>
                        )}
                    </>
                )}
            </div>
        </CapitalModalShell>
    );
};

export default CapitalAccountDetailsModal;
