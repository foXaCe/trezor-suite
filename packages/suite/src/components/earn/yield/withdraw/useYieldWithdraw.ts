import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useForm } from 'react-hook-form';

import { openModal } from '@suite/modal';
import { type EarnParams } from '@suite/router';
import { useExitYieldOpportunity, useSubmitTxHash } from '@suite-common/earn-api';
import { notificationsActions } from '@suite-common/toast-notifications';
import { type Account } from '@suite-common/wallet-types';

import { useDispatch } from 'src/hooks/suite';

import type { YieldWithdrawContextValues } from './useYieldWithdrawContext';
import { useResolvedYieldFlowData } from '../hooks/useResolvedYieldFlowData';
import { useYieldApprove } from '../hooks/useYieldApprove';
import { useYieldPendingTransactionTracking } from '../hooks/useYieldPendingTransactionTracking';
import { useYieldTransactionSend } from '../hooks/useYieldTransactionSend';
import type { YieldFlowFormValues, YieldFlowStepId } from '../types';
import { INITIAL_YIELD_FLOW_STATE, yieldFlowReducer } from '../yieldFlowReducer';
import {
    buildYieldFlowStepsResult,
    getWithdrawRequestAmount,
    getYieldApprovalModalParams,
    getYieldRevokeModalParams,
    getYieldSpenderFromTransactions,
    getYieldWithdrawTransaction,
    isAmountGreaterThan,
} from '../yieldFlowUtils';

type UseYieldWithdrawProps = {
    account: Account;
    routeParams: EarnParams;
};

export const useYieldWithdraw = ({
    account,
    routeParams,
}: UseYieldWithdrawProps): YieldWithdrawContextValues | null => {
    const reduxDispatch = useDispatch();
    const [state, dispatch] = useReducer(yieldFlowReducer, INITIAL_YIELD_FLOW_STATE);
    const methods = useForm<YieldFlowFormValues>({
        defaultValues: {
            amountInput: '',
        },
    });
    const { mutateAsync: exitYield } = useExitYieldOpportunity();
    const { mutateAsync: submitTxHash } = useSubmitTxHash({});
    const sendYieldTransaction = useYieldTransactionSend();
    const { vault, token, receiptToken, suppliedAmount, flowKey } = useResolvedYieldFlowData({
        account,
        routeParams,
    });

    const {
        openApproveModal,
        handleApproveSuccessTxid: handleApproveSuccessTxidBase,
        handleApproveCancel,
    } = useYieldApprove({
        account,
        contractAddress: receiptToken?.contractAddress ?? undefined,
        state,
        dispatch,
    });

    // Reset flow when navigating to a different vault
    useEffect(() => {
        if (!flowKey) {
            return;
        }

        dispatch({ type: 'RESET' });
        methods.reset({ amountInput: '' });
    }, [flowKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useYieldPendingTransactionTracking({
        account,
        actionKind: 'withdraw',
        pendingTransaction: state.pendingTransaction,
        dispatch,
    });

    const goToStep = useCallback((step: YieldFlowStepId) => {
        dispatch({ type: 'GO_TO_STEP', step });
    }, []);

    const flow = useMemo(
        () => buildYieldFlowStepsResult(state.step, goToStep),
        [state.step, goToStep],
    );

    const openPendingTransaction = useCallback(
        (txid: string) => {
            reduxDispatch(
                openModal({
                    type: 'transaction-detail',
                    txid,
                    descriptor: account.descriptor,
                    symbol: account.symbol,
                    deviceState: account.deviceState,
                    flow: 'detail',
                }),
            );
        },
        [account, reduxDispatch],
    );

    // Converts withdraw amount (input token) to receipt token amount for the revoke modal
    const getRevokeModalAmount = useCallback(
        (amount: string): string => {
            if (!account || !token || !receiptToken) {
                return amount;
            }

            return (
                getWithdrawRequestAmount({
                    networkSymbol: account.symbol,
                    amount,
                    token,
                    receiptToken,
                    pricePerShare: vault?.state?.pricePerShareState?.price,
                }) ?? amount
            );
        },
        [account, token, receiptToken, vault?.state?.pricePerShareState?.price],
    );

    const getRequestAmount = useCallback(
        (amount: string): string | null => {
            if (!account || !token || !receiptToken) {
                return null;
            }

            return getWithdrawRequestAmount({
                networkSymbol: account.symbol,
                amount,
                token,
                receiptToken,
                pricePerShare: vault?.state?.pricePerShareState?.price,
            });
        },
        [account, token, receiptToken, vault?.state?.pricePerShareState?.price],
    );

    const openRevokeModal = useCallback(
        (
            transactions: Parameters<typeof getYieldRevokeModalParams>[0] | null,
            fallbackSpender?: string | null,
        ) => {
            const revokeModalParams = transactions ? getYieldRevokeModalParams(transactions) : null;
            const spender =
                revokeModalParams?.spender ??
                (transactions ? getYieldSpenderFromTransactions(transactions) : null) ??
                fallbackSpender;

            dispatch({ type: 'CLEAR_APPROVAL_TRANSITION' });

            if (!spender) {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return;
            }

            openApproveModal({
                amount: getRevokeModalAmount(state.approveAmount),
                spender,
                transactionId: revokeModalParams?.transactionId,
                providerId: vault?.providerId,
                preapprovedAmount: state.lastApprovedAmount || undefined,
                txType: revokeModalParams ? 'revoke' : 'revoke-only',
            });
        },
        [
            state.approveAmount,
            state.lastApprovedAmount,
            getRevokeModalAmount,
            openApproveModal,
            vault?.providerId,
        ],
    );

    const enterModifyApproval = useCallback(() => {
        dispatch({ type: 'ENTER_MODIFY_MODE', amount: state.actionAmount });
        methods.reset({ amountInput: state.actionAmount });
    }, [state.actionAmount, methods]);

    const handleApproveModalCancel = useCallback(() => {
        const currentModalState = state.approveModalState;

        handleApproveCancel();

        if (state.shouldRevokeOnApproveCancel && currentModalState?.txType === 'approve') {
            openRevokeModal(state.revokeTransactions, currentModalState.spender);

            return;
        }

        dispatch({ type: 'CLEAR_APPROVAL_TRANSITION' });
    }, [
        state.approveModalState,
        state.shouldRevokeOnApproveCancel,
        state.revokeTransactions,
        handleApproveCancel,
        openRevokeModal,
    ]);

    const handleApproveSuccessTxid = useCallback(
        async (txid: string) => {
            dispatch({ type: 'CLEAR_APPROVAL_TRANSITION' });
            await handleApproveSuccessTxidBase(txid);
        },
        [handleApproveSuccessTxidBase],
    );

    const submitRevoke = useCallback(async () => {
        dispatch({ type: 'CLEAR_ERROR' });

        try {
            if (!account || !vault) {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return;
            }

            const { response, verification } = await exitYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: '0',
            });

            if (verification === 'failure') {
                throw new Error();
            }

            const { transactions } = response.data;
            const spender =
                getYieldRevokeModalParams(transactions)?.spender ??
                getYieldSpenderFromTransactions(transactions) ??
                state.approvedSpender;

            dispatch({
                type: 'SET_APPROVAL_RESPONSE',
                approvedSpender: spender ?? null,
                revokeTransactions: transactions,
            });
            openRevokeModal(transactions, spender);
        } catch {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });
        }
    }, [account, vault, exitYield, state.approvedSpender, openRevokeModal]);

    const submitApprove = useCallback(async () => {
        if (!account || !vault) {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

            return;
        }

        const requestAmount = getRequestAmount(state.approveAmount);

        if (!requestAmount) {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

            return;
        }

        dispatch({ type: 'START_SUBMITTING_APPROVE' });

        try {
            const { response, verification } = await exitYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: requestAmount,
            });

            if (verification === 'failure') {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return;
            }

            const { transactions } = response.data;
            const approvalModalParams = getYieldApprovalModalParams(transactions);
            const revokeModalParams = getYieldRevokeModalParams(transactions);
            const spender = approvalModalParams?.spender ?? revokeModalParams?.spender ?? null;

            dispatch({
                type: 'SET_APPROVAL_RESPONSE',
                approvedSpender: spender,
                revokeTransactions: transactions,
            });

            if (revokeModalParams) {
                dispatch({ type: 'SET_REVOKE_REQUIRED' });
            }

            if (!approvalModalParams) {
                dispatch({ type: 'COMPLETE_APPROVAL', amount: state.approveAmount });

                return;
            }

            openApproveModal({
                amount: requestAmount,
                spender: approvalModalParams.spender,
                transactionId: approvalModalParams.transactionId,
                providerId: vault.providerId,
                txType: 'approve',
            });
        } catch {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });
        } finally {
            dispatch({ type: 'FINISH_SUBMITTING_APPROVE' });
        }
    }, [account, vault, state.approveAmount, exitYield, getRequestAmount, openApproveModal]);

    const submitWithdraw = useCallback(async () => {
        if (!account || !vault) {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

            return;
        }

        const requestAmount = getRequestAmount(state.actionAmount);

        if (!requestAmount) {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

            return;
        }

        dispatch({ type: 'START_SUBMITTING_ACTION' });

        try {
            const { response, verification } = await exitYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: requestAmount,
            });

            if (verification === 'failure') {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return;
            }

            const { transactions } = response.data;
            const approvalModalParams = getYieldApprovalModalParams(transactions);

            if (approvalModalParams) {
                dispatch({
                    type: 'SET_APPROVAL_RESPONSE',
                    approvedSpender: approvalModalParams.spender,
                    revokeTransactions: transactions,
                });
                enterModifyApproval();
                openApproveModal({
                    amount: requestAmount,
                    spender: approvalModalParams.spender,
                    transactionId: approvalModalParams.transactionId,
                    providerId: vault.providerId,
                    txType: 'approve',
                });

                return;
            }

            const withdrawTransaction = getYieldWithdrawTransaction(transactions);

            if (!withdrawTransaction?.id) {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return;
            }

            const result = await sendYieldTransaction({
                account,
                transaction: withdrawTransaction,
            });

            await submitTxHash({ txId: withdrawTransaction.id, txHash: result.txid });

            reduxDispatch(
                notificationsActions.addToast({
                    type: 'tx-yield-withdraw',
                    formattedAmount: `${state.actionAmount} ${token?.symbol}`,
                    descriptor: account.descriptor,
                    symbol: account.symbol,
                    txid: result.txid,
                }),
            );

            dispatch({
                type: 'SET_PENDING_TX',
                tx: { type: 'withdraw', txid: result.txid, amount: state.actionAmount },
                receiptAmount: requestAmount,
            });
        } catch {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });
        } finally {
            dispatch({ type: 'FINISH_SUBMITTING_ACTION' });
        }
    }, [
        account,
        token,
        vault,
        state.actionAmount,
        exitYield,
        enterModifyApproval,
        openApproveModal,
        getRequestAmount,
        sendYieldTransaction,
        submitTxHash,
        reduxDispatch,
    ]);

    if (!token || !receiptToken || !vault) {
        return null;
    }

    const maxAmount = suppliedAmount;
    const isApproveAmountTooHigh = isAmountGreaterThan({
        amount: state.approveAmount,
        threshold: maxAmount,
    });
    const isWithdrawAmountTooHigh = isAmountGreaterThan({
        amount: state.actionAmount,
        threshold: maxAmount,
    });
    const isApprovalInsufficient =
        !state.isModifyMode &&
        isAmountGreaterThan({
            amount: state.actionAmount,
            threshold: state.approveAmount,
        });

    return {
        account,
        token,
        receiptToken,
        maxAmount,
        approveAmount: state.approveAmount,
        withdrawAmount: state.actionAmount,
        completedAmount: state.completedAmount,
        completedReceiptAmount: state.completedReceiptAmount,
        errorMessage: state.error ?? undefined,
        approveModalState: state.approveModalState,
        pendingTransaction: state.pendingTransaction,
        isModifyMode: state.isModifyMode,
        lastApprovedAmount: state.lastApprovedAmount,
        revokeRequired: state.revokeRequired,
        isApproveAmountTooHigh,
        isWithdrawAmountTooHigh,
        isApprovalInsufficient,
        isSubmittingApprove:
            state.isSubmittingApprove || state.isApprovePending || state.approveModalState !== null,
        isSubmittingWithdraw: state.isSubmittingAction,
        setApproveAmount: amount => dispatch({ type: 'SET_APPROVE_AMOUNT', amount }),
        setWithdrawAmount: amount => dispatch({ type: 'SET_ACTION_AMOUNT', amount }),
        submitApprove,
        submitWithdraw,
        submitRevoke,
        enterModifyApproval,
        handleApproveModalCancel,
        handleApproveSuccessTxid,
        openPendingTransaction,
        methods,
        flow,
    };
};
