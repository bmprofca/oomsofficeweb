import React from 'react';
import { FiEdit, FiPlus } from 'react-icons/fi';
import { DatePickerField } from '../PortalDatePicker';
import {
    CapitalModalShell,
    CapitalModalFooterActions,
    MODAL_BODY_CLASS,
    INPUT_CLASS,
    LABEL_CLASS,
} from './CapitalModalParts';

const toOpeningDateValue = (date) => {
    if (!date) return '';
    if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return String(date).slice(0, 10);
};

const CapitalAccountFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onChange,
    onDateChange,
    loading = false,
    mode = 'add',
    title,
}) => {
    const formId = `${mode}-capital-account-form`;
    const isEdit = mode === 'edit';

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit?.(e);
    };

    return (
        <CapitalModalShell
            open={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            title={title || (isEdit ? 'Edit Capital Account' : 'Add Capital Account')}
            subtitle={isEdit ? 'Update account details and opening balance' : 'Create a new capital ledger account'}
            icon={isEdit ? FiEdit : FiPlus}
            closeDisabled={loading}
            footer={(
                <CapitalModalFooterActions
                    onCancel={onClose}
                    cancelLabel="Cancel"
                    confirmLabel={isEdit ? 'Update Account' : 'Create Account'}
                    confirmType="submit"
                    formId={formId}
                    loading={loading}
                />
            )}
        >
            <form
                id={formId}
                onSubmit={handleFormSubmit}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
                <div className={`${MODAL_BODY_CLASS} space-y-4`}>
                    <div>
                        <label className={LABEL_CLASS}>
                            Account name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={onChange}
                            placeholder="e.g. Business Capital, Reserve Fund"
                            className={INPUT_CLASS}
                            required
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Remark</label>
                        <textarea
                            name="remark"
                            value={formData.remark || ''}
                            onChange={onChange}
                            placeholder="Optional description"
                            rows={2}
                            className={`${INPUT_CLASS} resize-none`}
                        />
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Opening balance
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={LABEL_CLASS}>
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="opening_balance_amount"
                                    value={formData.opening_balance?.amount ?? ''}
                                    onChange={onChange}
                                    placeholder="0.00"
                                    className={INPUT_CLASS}
                                    required
                                    step="0.01"
                                    min="0"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>
                                    Balance type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="opening_balance_type"
                                    value={formData.opening_balance?.type || 'credit'}
                                    onChange={onChange}
                                    className={INPUT_CLASS}
                                    required
                                >
                                    <option value="credit">Credit (positive)</option>
                                    <option value="debit">Debit (negative)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>
                                Opening date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerField
                                value={toOpeningDateValue(formData.opening_balance?.date)}
                                onChange={(value) => onDateChange?.(value || '')}
                                placeholder="Select opening date"
                                mode="single"
                                hideTabs={true}
                                showResetButton={false}
                                maxSelectableDate={new Date().toISOString().split('T')[0]}
                                wrapperClassName="w-full block"
                                buttonClassName={INPUT_CLASS}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </CapitalModalShell>
    );
};

export default CapitalAccountFormModal;
