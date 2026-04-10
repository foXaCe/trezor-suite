import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useForm } from 'react-hook-form';

import { openModal } from '@suite/modal';
import { type EarnParams } from '@suite/router';
import { useEnterYieldOpportunity, useSubmitTxHash } from '@suite-common/earn-api';
import { notificationsActions } from '@suite-common/toast-notifications';
import { type Account } from '@suite-common/wallet-types';

import { useDispatch } from 'src/hooks/suite';

import type { YieldSupplyContextValues } from './useYieldSupplyContext';
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
    getYieldSupplyTransaction,
    isAmountGreaterThan,
} from '../yieldFlowUtils';

type UseYieldSupplyProps = {
    account: Account;
    routeParams: EarnParams;
};

export const useYieldSupply = ({
    account,
    routeParams,
}: UseYieldSupplyProps): YieldSupplyContextValues | null => {
    const reduxDispatch = useDispatch();
    const [state, dispatch] = useReducer(yieldFlowReducer, INITIAL_YIELD_FLOW_STATE);
    const methods = useForm<YieldFlowFormValues>({
        defaultValues: {
            amountInput: '',
        },
    });
    const { mutateAsync: enterYield } = useEnterYieldOpportunity();
    const { mutateAsync: submitTxHash } = useSubmitTxHash({});
    const sendYieldTransaction = useYieldTransactionSend();
    const { vault, token, receiptToken, apy, flowKey } = useResolvedYieldFlowData({
        account,
        routeParams,
    });

    const {
        openApproveModal,
        handleApproveSuccessTxid: handleApproveSuccessTxidBase,
        handleApproveCancel,
    } = useYieldApprove({
        account,
        contractAddress: token?.contractAddress ?? undefined,
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
        actionKind: 'supply',
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
                amount: state.approveAmount,
                spender,
                transactionId: revokeModalParams?.transactionId,
                providerId: vault?.providerId,
                preapprovedAmount: state.lastApprovedAmount || undefined,
                txType: revokeModalParams ? 'revoke' : 'revoke-only',
            });
        },
        [state.approveAmount, state.lastApprovedAmount, openApproveModal, vault?.providerId],
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
            if (!account || !token || !vault) {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return;
            }

            const { response, verification } = await enterYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: '0',
                decimals: token.decimals,
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
    }, [account, token, vault, enterYield, state.approvedSpender, openRevokeModal]);

    const submitApprove = useCallback(async () => {
        if (!account || !token || !vault) {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

            return;
        }

        dispatch({ type: 'START_SUBMITTING_APPROVE' });

        try {
            const { response, verification } = await enterYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: state.approveAmount,
                decimals: token.decimals,
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
                amount: state.approveAmount,
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
    }, [account, token, vault, state.approveAmount, enterYield, openApproveModal]);

    const submitSupply = useCallback(async () => {
        if (!account || !token || !receiptToken || !vault) {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

            return;
        }

        dispatch({ type: 'START_SUBMITTING_ACTION' });

        try {
            const { response, verification } = await enterYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: state.actionAmount,
                decimals: token.decimals,
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
                    amount: state.actionAmount,
                    spender: approvalModalParams.spender,
                    transactionId: approvalModalParams.transactionId,
                    providerId: vault.providerId,
                    txType: 'approve',
                });

                return;
            }

            const supplyTransaction = getYieldSupplyTransaction(transactions);

            if (!supplyTransaction?.id) {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return;
            }

            const result = await sendYieldTransaction({ account, transaction: supplyTransaction });

            await submitTxHash({ txId: supplyTransaction.id, txHash: result.txid });

            reduxDispatch(
                notificationsActions.addToast({
                    type: 'tx-yield-supply',
                    formattedAmount: `${state.actionAmount} ${token.symbol}`,
                    descriptor: account.descriptor,
                    symbol: account.symbol,
                    txid: result.txid,
                }),
            );

            const receiptAmount = getWithdrawRequestAmount({
                networkSymbol: account.symbol,
                amount: state.actionAmount,
                token,
                receiptToken,
                pricePerShare: vault?.state?.pricePerShareState?.price,
            });

            dispatch({
                type: 'SET_PENDING_TX',
                tx: { type: 'supply', txid: result.txid, amount: state.actionAmount },
                receiptAmount: receiptAmount ?? state.actionAmount,
            });
        } catch {
            dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });
        } finally {
            dispatch({ type: 'FINISH_SUBMITTING_ACTION' });
        }
    }, [
        account,
        receiptToken,
        token,
        vault,
        state.actionAmount,
        enterYield,
        enterModifyApproval,
        openApproveModal,
        sendYieldTransaction,
        submitTxHash,
        reduxDispatch,
    ]);

    if (!token || !receiptToken || !vault) {
        return null;
    }

    const maxAmount = token.balance;
    const isApproveAmountTooHigh = isAmountGreaterThan({
        amount: state.approveAmount,
        threshold: maxAmount,
    });
    const isSupplyAmountTooHigh = isAmountGreaterThan({
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
        apy,
        approveAmount: state.approveAmount,
        supplyAmount: state.actionAmount,
        completedAmount: state.completedAmount,
        completedReceiptAmount: state.completedReceiptAmount,
        maxAmount,
        errorMessage: state.error ?? undefined,
        approveModalState: state.approveModalState,
        pendingTransaction: state.pendingTransaction,
        isModifyMode: state.isModifyMode,
        lastApprovedAmount: state.lastApprovedAmount,
        revokeRequired: state.revokeRequired,
        isApproveAmountTooHigh,
        isSupplyAmountTooHigh,
        isApprovalInsufficient,
        isSubmittingApprove:
            state.isSubmittingApprove || state.isApprovePending || state.approveModalState !== null,
        isSubmittingSupply: state.isSubmittingAction,
        setApproveAmount: amount => dispatch({ type: 'SET_APPROVE_AMOUNT', amount }),
        setSupplyAmount: amount => dispatch({ type: 'SET_ACTION_AMOUNT', amount }),
        submitApprove,
        submitSupply,
        submitRevoke,
        enterModifyApproval,
        handleApproveModalCancel,
        handleApproveSuccessTxid,
        openPendingTransaction,
        methods,
        flow,
    };
};
