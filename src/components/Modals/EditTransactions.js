import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    PaymentModal,
    ReceiveModal,
    JournalModal,
    ContraModal,
    ExpenseModal,
    DiscountModal,
    SaleModal,
    PurchaseModal,
} from './CreateTransactions';

const PARTY_LABELS = {
    client: 'client',
    ca: 'CA',
    staff: 'staff',
    agent: 'agent',
    capital: 'capital',
};

const isTaskOriginSaleRecord = (record) =>
    Boolean(
        record?.is_task === true ||
        record?.is_task === 1 ||
        String(record?.is_task ?? '').trim() === '1'
    );

/**
 * Edit entry point mirroring CreateTransactions types.
 * Sale/Purchase use the same create form components with `editRecord`.
 */
export const EditTransactionModalManager = ({
    modalType,
    isOpen,
    onClose,
    editRecord,
    onSubmit,
    formatCurrency,
    summary,
    showBank = true,
    showSummary = true,
    bankPageClientLookup = false,
    partyType: partyTypeProp,
    partyLabel: partyLabelProp,
}) => {
    const recordRef = useRef(editRecord);
    const typeRef = useRef(modalType);
    if (editRecord) recordRef.current = editRecord;
    if (modalType) typeRef.current = modalType;
    const record = editRecord || recordRef.current;
    const resolvedType = modalType || typeRef.current;

    useEffect(() => {
        if (!isOpen || !record) return;
        if (resolvedType === 'SALE' && isTaskOriginSaleRecord(record)) {
            toast.error(
                'This sale was created from a task. Open the related task profile to edit it.'
            );
            onClose();
        }
    }, [isOpen, record, resolvedType, onClose]);

    if (!record || (resolvedType === 'SALE' && isTaskOriginSaleRecord(record))) {
        return null;
    }

    const resolvePartyMeta = (entry, direction) => {
        const party = direction === 'from' ? entry?.payment_from : entry?.payment_to;
        const type = party?.type || partyTypeProp || 'client';
        return {
            partyType: type,
            partyLabel: partyLabelProp || PARTY_LABELS[type] || type,
        };
    };

    const commonProps = {
        isOpen,
        onClose,
        onSubmit,
        formatCurrency,
        summary,
        editRecord: record,
        showSummary,
        bankPageClientLookup,
    };

    switch (resolvedType) {
        case 'SALE':
            return <SaleModal {...commonProps} />;
        case 'PURCHASE':
            return <PurchaseModal {...commonProps} />;
        case 'PAYMENT': {
            const { partyType, partyLabel } = resolvePartyMeta(record, 'to');
            return (
                <PaymentModal
                    {...commonProps}
                    showBank={showBank}
                    partyType={partyType}
                    partyLabel={partyLabel}
                />
            );
        }
        case 'RECEIVE': {
            const { partyType, partyLabel } = resolvePartyMeta(record, 'from');
            return (
                <ReceiveModal
                    {...commonProps}
                    showBank={showBank}
                    partyType={partyType}
                    partyLabel={partyLabel}
                />
            );
        }
        case 'JOURNAL':
            return <JournalModal {...commonProps} />;
        case 'CONTRA':
            return <ContraModal {...commonProps} />;
        case 'EXPENSE':
            return <ExpenseModal {...commonProps} showBank={showBank} />;
        case 'DISCOUNT': {
            const party = record?.discount_party || record?.payment_from;
            const type = party?.type || partyTypeProp || 'client';
            return (
                <DiscountModal
                    {...commonProps}
                    partyType={type}
                    partyLabel={partyLabelProp || PARTY_LABELS[type] || type}
                />
            );
        }
        default:
            return null;
    }
};

export default EditTransactionModalManager;
