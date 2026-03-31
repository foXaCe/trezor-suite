import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import { openModal } from '@suite/modal';
import { type EarnParams } from '@suite/router';
import { useExitYieldOpportunity, useSubmitTxHash } from '@suite-common/earn-api';
import { notificationsActions } from '@suite-common/toast-notifications';
import { type Account } from '@suite-common/wallet-types';

import { useDispatch } from 'src/hooks/suite';

import type { YieldWithdrawContextValues } from './useYieldWithdrawContext';
import type { YieldFlowFormValues } from '../common/types';
import {
    getWithdrawRequestAmount,
    getYieldApprovalModalParams,
    getYieldRevokeModalParams,
    getYieldWithdrawTransaction,
    isAmountGreaterThan,
} from '../common/yieldFlowUtils';
import { useResolvedYieldFlowData } from '../hooks/useResolvedYieldFlowData';
import { useYieldApprovalFlow } from '../hooks/useYieldApprovalFlow';
import { useYieldApprove } from '../hooks/useYieldApprove';
import { useYieldFlowReset } from '../hooks/useYieldFlowReset';
import { useYieldFlowState } from '../hooks/useYieldFlowState';
import { useYieldFlowSteps } from '../hooks/useYieldFlowSteps';
import { useYieldPendingTransactionTracking } from '../hooks/useYieldPendingTransactionTracking';
import { useYieldTransactionSend } from '../hooks/useYieldTransactionSend';

type UseYieldWithdrawProps = {
    account: Account;
    routeParams: EarnParams;
};

export const useYieldWithdraw = ({
    account,
    routeParams,
}: UseYieldWithdrawProps): YieldWithdrawContextValues | null => {
    const dispatch = useDispatch();
    const flow = useYieldFlowSteps();
    const { goToStep } = flow;
    const methods = useForm<YieldFlowFormValues>({
        defaultValues: {
            amountInput: '0',
        },
    });
    const { mutateAsync: exitYield } = useExitYieldOpportunity();
    const { mutateAsync: submitTxHash } = useSubmitTxHash({});
    const sendYieldTransaction = useYieldTransactionSend();
    const { vault, token, receiptToken, suppliedAmount, flowKey } = useResolvedYieldFlowData({
        account,
        routeParams,
    });

    const [withdrawAmount, setWithdrawAmount] = useState('');
    const {
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
        isSubmittingAction: isSubmittingWithdraw,
        setIsSubmittingAction: setIsSubmittingWithdraw,
        resetFlowState,
    } = useYieldFlowState();

    const {
        approveAmount,
        setApproveAmount,
        approveModalState,
        isApprovePending,
        setIsApprovePending,
        openApproveModal,
        resetApproveState,
        handleApproveSuccessTxid: handleApproveSuccessTxidBase,
        handleApproveCancel: clearApproveModalState,
    } = useYieldApprove({
        account,
        contractAddress: receiptToken?.contractAddress ?? undefined,
        setPendingTransaction,
        setErrorMessage,
    });
    const goToApproveStep = useCallback(() => {
        goToStep('approve');
    }, [goToStep]);
    const goToActionStep = useCallback(() => {
        goToStep('action');
    }, [goToStep]);
    const goToCompleteStep = useCallback(() => {
        goToStep('complete');
    }, [goToStep]);

    const openPendingTransaction = useCallback(
        (txid: string) => {
            if (!account) {
                return;
            }

            dispatch(
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
        [account, dispatch],
    );

    const getRequestAmount = useCallback(
        (amount: string) => {
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
        [account, receiptToken, token, vault?.state?.pricePerShareState?.price],
    );
    const {
        completeApproval,
        enterModifyApproval,
        handleApproveModalCancel,
        handleApproveSuccessTxid,
        handleRevokeSuccess,
        isModifyMode,
        lastApprovedAmount,
        resetApprovalFlowState,
        revokeRequired,
        setApprovalResponseState,
        setRevokeRequired,
        submitRevoke,
    } = useYieldApprovalFlow({
        approveAmount,
        approveModalState,
        clearApproveModalState,
        currentAmount: withdrawAmount,
        getRevokeModalAmount: amount => getRequestAmount(amount) ?? amount,
        goToActionStep,
        goToApproveStep,
        handleApproveSuccessTxidBase,
        loadRevokeTransactions: async () => {
            if (!account || !vault) {
                return null;
            }

            const { response, verification } = await exitYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: '0',
            });

            if (verification === 'failure') {
                throw new Error('Yield revoke verification failed.');
            }

            return response.data.transactions;
        },
        methods,
        openApproveModal,
        providerId: vault?.providerId,
        resetApproveState,
        setCurrentAmount: setWithdrawAmount,
        setErrorMessage,
    });

    const resetWithdrawFlow = useCallback(() => {
        setWithdrawAmount('');
        resetFlowState();
        resetApprovalFlowState();
    }, [resetApprovalFlowState, resetFlowState]);

    useYieldFlowReset({
        flowKey,
        goToApproveStep,
        methods,
        onReset: resetWithdrawFlow,
        resetApproveState,
    });

    useYieldPendingTransactionTracking({
        account,
        actionKind: 'withdraw',
        onActionSuccess: amount => {
            setCompletedAmount(amount);
            goToCompleteStep();
        },
        onApproveSuccess: completeApproval,
        onRevokeSuccess: handleRevokeSuccess,
        pendingTransaction,
        setErrorMessage,
        setIsApprovePending,
        setPendingTransaction,
    });

    const submitApprove = useCallback(async () => {
        if (!account || !vault) {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

            return;
        }

        const requestAmount = getRequestAmount(approveAmount);

        if (!requestAmount) {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

            return;
        }

        setIsSubmittingApprove(true);
        setErrorMessage(undefined);

        try {
            const { response, verification } = await exitYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: requestAmount,
            });

            if (verification === 'failure') {
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

                return;
            }

            const { transactions } = response.data;
            const approvalModalParams = getYieldApprovalModalParams(transactions);
            const revokeModalParams = getYieldRevokeModalParams(transactions);
            const spender = approvalModalParams?.spender ?? revokeModalParams?.spender ?? null;

            setApprovalResponseState({
                approvedSpender: spender,
                revokeTransactions: transactions,
            });

            if (revokeModalParams) {
                setRevokeRequired(true);
            }

            if (!approvalModalParams) {
                completeApproval(approveAmount);

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
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');
        } finally {
            setIsSubmittingApprove(false);
        }
    }, [
        account,
        approveAmount,
        completeApproval,
        exitYield,
        getRequestAmount,
        openApproveModal,
        setApprovalResponseState,
        setErrorMessage,
        setIsSubmittingApprove,
        setRevokeRequired,
        vault,
    ]);

    const submitWithdraw = useCallback(async () => {
        if (!account || !vault) {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

            return;
        }

        const requestAmount = getRequestAmount(withdrawAmount);

        if (!requestAmount) {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

            return;
        }

        setIsSubmittingWithdraw(true);
        setErrorMessage(undefined);

        try {
            const { response, verification } = await exitYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: requestAmount,
            });

            if (verification === 'failure') {
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

                return;
            }

            const { transactions } = response.data;
            const approvalModalParams = getYieldApprovalModalParams(transactions);

            if (approvalModalParams) {
                setApprovalResponseState({
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
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

                return;
            }

            const result = await sendYieldTransaction({
                account,
                transaction: withdrawTransaction,
            });

            await submitTxHash({
                txId: withdrawTransaction.id,
                txHash: result.txid,
            });

            dispatch(
                notificationsActions.addToast({
                    type: 'tx-yield-withdraw',
                    formattedAmount: `${withdrawAmount} ${token?.symbol}`,
                    descriptor: account.descriptor,
                    symbol: account.symbol,
                    txid: result.txid,
                }),
            );

            setCompletedReceiptAmount(requestAmount ?? withdrawAmount);
            setCompletedAmount(withdrawAmount);
            setPendingTransaction({
                type: 'withdraw',
                txid: result.txid,
                amount: withdrawAmount,
            });
        } catch {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');
        } finally {
            setIsSubmittingWithdraw(false);
        }
    }, [
        account,
        dispatch,
        enterModifyApproval,
        exitYield,
        getRequestAmount,
        openApproveModal,
        sendYieldTransaction,
        setApprovalResponseState,
        setCompletedAmount,
        setCompletedReceiptAmount,
        setErrorMessage,
        setIsSubmittingWithdraw,
        setPendingTransaction,
        submitTxHash,
        token,
        vault,
        withdrawAmount,
    ]);

    if (!token || !receiptToken || !vault) {
        return null;
    }

    const maxAmount = suppliedAmount;
    const isApproveAmountTooHigh = isAmountGreaterThan({
        amount: approveAmount,
        threshold: maxAmount,
    });
    const isWithdrawAmountTooHigh = isAmountGreaterThan({
        amount: withdrawAmount,
        threshold: maxAmount,
    });
    const isApprovalInsufficient =
        !isModifyMode &&
        isAmountGreaterThan({
            amount: withdrawAmount,
            threshold: approveAmount,
        });

    return {
        account,
        token,
        receiptToken,
        maxAmount,
        approveAmount,
        withdrawAmount,
        completedAmount,
        completedReceiptAmount,
        errorMessage,
        approveModalState,
        pendingTransaction,
        isModifyMode,
        lastApprovedAmount,
        revokeRequired,
        isApproveAmountTooHigh,
        isWithdrawAmountTooHigh,
        isApprovalInsufficient,
        isSubmittingApprove: isSubmittingApprove || isApprovePending,
        isSubmittingWithdraw,
        setApproveAmount,
        setWithdrawAmount,
        setApproveMaxAmount: () => setApproveAmount(maxAmount),
        setWithdrawMaxAmount: () => setWithdrawAmount(maxAmount),
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
