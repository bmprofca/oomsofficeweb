import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    PaymentModal,
    ReceiveModal,
    JournalModal,
    ContraModal,
    ExpenseModal,
    DiscountModal,
} from './CreateTransactions';

const PARTY_LABELS = {
    client: 'client',
    ca: 'CA',
    staff: 'staff',
    agent: 'agent',
    capital: 'capital',
};

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
    useEffect(() => {
        if (!isOpen || !editRecord) return;
        if (modalType === 'SALE' || modalType === 'PURCHASE') {
            toast.info('Sale and purchase entry edit is not available yet.');
            onClose();
        }
    }, [isOpen, editRecord, modalType, onClose]);

    if (!editRecord || modalType === 'SALE' || modalType === 'PURCHASE') {
        return null;
    }

    const resolvePartyMeta = (record, direction) => {
        const party = direction === 'from' ? record?.payment_from : record?.payment_to;
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
        editRecord,
        showSummary,
        bankPageClientLookup,
    };

    switch (modalType) {
        case 'PAYMENT': {
            const { partyType, partyLabel } = resolvePartyMeta(editRecord, 'to');
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
            const { partyType, partyLabel } = resolvePartyMeta(editRecord, 'from');
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
            const party = editRecord?.discount_party || editRecord?.payment_from;
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
