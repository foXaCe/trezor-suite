import { useCallback, useState } from 'react';

import { type TranslationKey } from '@suite/intl';

import type { YieldPendingTransactionState } from '../common/types';

export const useYieldFlowState = () => {
    const [completedAmount, setCompletedAmount] = useState('0');
    const [completedReceiptAmount, setCompletedReceiptAmount] = useState('0');
    const [pendingTransaction, setPendingTransaction] =
        useState<YieldPendingTransactionState | null>(null);
    const [errorMessage, setErrorMessage] = useState<TranslationKey>();
    const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);
    const resetFlowState = useCallback(() => {
        setCompletedAmount('0');
        setCompletedReceiptAmount('0');
        setPendingTransaction(null);
        setErrorMessage(undefined);
        setIsSubmittingApprove(false);
        setIsSubmittingAction(false);
    }, []);

    return {
        completedAmount,
        setCompletedAmount,
        completedReceiptAmount,
        setCompletedReceiptAmount,
        pendingTransaction,
        setPendingTransaction,
        errorMessage,
        setErrorMessage,
        isSubmittingApprove,
        setIsSubmittingApprove,
        isSubmittingAction,
        setIsSubmittingAction,
        resetFlowState,
    };
};
