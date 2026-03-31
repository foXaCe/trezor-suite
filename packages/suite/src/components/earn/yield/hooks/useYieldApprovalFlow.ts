import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { type TranslationKey } from '@suite/intl';
import { type TransactionDto } from '@suite-common/earn-api';

import type { UseYieldApproveResult } from './useYieldApprove';
import type { YieldApproveModalState, YieldFlowFormValues } from '../common/types';
import {
    getYieldRevokeModalParams,
    getYieldSpenderFromTransactions,
} from '../common/yieldFlowUtils';

type UseYieldApprovalFlowProps = {
    approveAmount: string;
    approveModalState: YieldApproveModalState | null;
    clearApproveModalState: () => void;
    currentAmount: string;
    getRevokeModalAmount?: (amount: string) => string;
    goToActionStep: () => void;
    goToApproveStep: () => void;
    handleApproveSuccessTxidBase: (txid: string) => Promise<void>;
    loadRevokeTransactions: () => Promise<TransactionDto[] | null>;
    methods: UseFormReturn<YieldFlowFormValues>;
    openApproveModal: UseYieldApproveResult['openApproveModal'];
    providerId?: string;
    resetApproveState: (amount: string) => void;
    setCurrentAmount: (amount: string) => void;
    setErrorMessage: (message: TranslationKey | undefined) => void;
};

export const useYieldApprovalFlow = ({
    approveAmount,
    approveModalState,
    clearApproveModalState,
    currentAmount,
    getRevokeModalAmount,
    goToActionStep,
    goToApproveStep,
    handleApproveSuccessTxidBase,
    loadRevokeTransactions,
    methods,
    openApproveModal,
    providerId,
    resetApproveState,
    setCurrentAmount,
    setErrorMessage,
}: UseYieldApprovalFlowProps) => {
    const [isModifyMode, setIsModifyMode] = useState(false);
    const [lastApprovedAmount, setLastApprovedAmount] = useState('');
    const [revokeRequired, setRevokeRequired] = useState(false);
    const [shouldRevokeOnApproveCancel, setShouldRevokeOnApproveCancel] = useState(false);
    const [revokeTransactions, setRevokeTransactions] = useState<TransactionDto[] | null>(null);
    const [approvedSpender, setApprovedSpender] = useState<string | null>(null);

    const clearApprovalTransitionState = useCallback(() => {
        setShouldRevokeOnApproveCancel(false);
        setRevokeTransactions(null);
    }, []);

    const resetApprovalFlowState = useCallback(() => {
        setIsModifyMode(false);
        setLastApprovedAmount('');
        setRevokeRequired(false);
        clearApprovalTransitionState();
        setApprovedSpender(null);
    }, [clearApprovalTransitionState]);

    const storeApprovalResponseState = useCallback(
        ({
            approvedSpender,
            revokeTransactions,
        }: {
            approvedSpender: string | null;
            revokeTransactions: TransactionDto[] | null;
        }) => {
            setApprovedSpender(approvedSpender);
            setRevokeTransactions(revokeTransactions);
        },
        [],
    );

    const enterModifyApproval = useCallback(() => {
        setIsModifyMode(true);
        setShouldRevokeOnApproveCancel(true);
        resetApproveState(currentAmount);
        methods.reset({ amountInput: currentAmount });
        goToApproveStep();
    }, [currentAmount, goToApproveStep, methods, resetApproveState]);

    const openRevokeModal = useCallback(
        (transactions: TransactionDto[] | null, fallbackSpender?: string | null) => {
            const revokeModalParams = transactions ? getYieldRevokeModalParams(transactions) : null;
            const spender =
                revokeModalParams?.spender ??
                (transactions ? getYieldSpenderFromTransactions(transactions) : null) ??
                fallbackSpender;

            clearApprovalTransitionState();

            if (!spender) {
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

                return;
            }

            openApproveModal({
                amount: getRevokeModalAmount?.(approveAmount) ?? approveAmount,
                spender,
                transactionId: revokeModalParams?.transactionId,
                providerId,
                txType: revokeModalParams ? 'revoke' : 'revoke-only',
            });
        },
        [
            approveAmount,
            clearApprovalTransitionState,
            getRevokeModalAmount,
            openApproveModal,
            providerId,
            setErrorMessage,
        ],
    );

    const submitRevoke = useCallback(async () => {
        setErrorMessage(undefined);

        try {
            const transactions = await loadRevokeTransactions();
            const spender =
                getYieldRevokeModalParams(transactions ?? [])?.spender ??
                getYieldSpenderFromTransactions(transactions ?? []) ??
                approvedSpender;

            storeApprovalResponseState({
                approvedSpender: spender ?? null,
                revokeTransactions: transactions,
            });
            openRevokeModal(transactions, spender);
        } catch {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');
        }
    }, [
        approvedSpender,
        loadRevokeTransactions,
        openRevokeModal,
        setErrorMessage,
        storeApprovalResponseState,
    ]);

    const handleApproveModalCancel = useCallback(() => {
        const currentApproveModalState = approveModalState;

        clearApproveModalState();

        if (shouldRevokeOnApproveCancel && currentApproveModalState?.txType === 'approve') {
            openRevokeModal(revokeTransactions, currentApproveModalState.spender);

            return;
        }

        clearApprovalTransitionState();
    }, [
        approveModalState,
        clearApprovalTransitionState,
        clearApproveModalState,
        openRevokeModal,
        revokeTransactions,
        shouldRevokeOnApproveCancel,
    ]);

    const handleApproveSuccessTxid = useCallback(
        async (txid: string) => {
            clearApprovalTransitionState();
            await handleApproveSuccessTxidBase(txid);
        },
        [clearApprovalTransitionState, handleApproveSuccessTxidBase],
    );

    const completeApproval = useCallback(
        (amount: string) => {
            clearApprovalTransitionState();
            setIsModifyMode(false);
            setLastApprovedAmount(amount);
            setCurrentAmount(amount);
            goToActionStep();
        },
        [clearApprovalTransitionState, goToActionStep, setCurrentAmount],
    );

    const handleRevokeSuccess = useCallback(() => {
        setIsModifyMode(false);
        setLastApprovedAmount('');
        setRevokeRequired(false);
    }, []);

    return {
        completeApproval,
        enterModifyApproval,
        handleApproveModalCancel,
        handleApproveSuccessTxid,
        handleRevokeSuccess,
        isModifyMode,
        lastApprovedAmount,
        resetApprovalFlowState,
        revokeRequired,
        setApprovalResponseState: storeApprovalResponseState,
        setRevokeRequired,
        submitRevoke,
    };
};
