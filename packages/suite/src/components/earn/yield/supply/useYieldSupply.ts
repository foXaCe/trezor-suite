import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import { openModal } from '@suite/modal';
import { type EarnParams } from '@suite/router';
import { useEnterYieldOpportunity, useSubmitTxHash } from '@suite-common/earn-api';
import { notificationsActions } from '@suite-common/toast-notifications';
import { type Account } from '@suite-common/wallet-types';

import { useDispatch } from 'src/hooks/suite';

import type { YieldSupplyContextValues } from './useYieldSupplyContext';
import type { YieldFlowFormValues } from '../common/types';
import {
    getWithdrawRequestAmount,
    getYieldApprovalModalParams,
    getYieldRevokeModalParams,
    getYieldSupplyTransaction,
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

type UseYieldSupplyProps = {
    account: Account;
    routeParams: EarnParams;
};

export const useYieldSupply = ({
    account,
    routeParams,
}: UseYieldSupplyProps): YieldSupplyContextValues | null => {
    const dispatch = useDispatch();
    const flow = useYieldFlowSteps();
    const { goToStep } = flow;
    const methods = useForm<YieldFlowFormValues>({
        defaultValues: {
            amountInput: '0',
        },
    });
    const { mutateAsync: enterYield } = useEnterYieldOpportunity();
    const { mutateAsync: submitTxHash } = useSubmitTxHash({});
    const sendYieldTransaction = useYieldTransactionSend();
    const { vault, token, receiptToken, apy, flowKey } = useResolvedYieldFlowData({
        account,
        routeParams,
    });

    const [supplyAmount, setSupplyAmount] = useState('');
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
        isSubmittingAction: isSubmittingSupply,
        setIsSubmittingAction: setIsSubmittingSupply,
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
        contractAddress: token?.contractAddress ?? undefined,
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
        currentAmount: supplyAmount,
        goToActionStep,
        goToApproveStep,
        handleApproveSuccessTxidBase,
        loadRevokeTransactions: async () => {
            if (!account || !token || !vault) {
                return null;
            }

            const { response, verification } = await enterYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: '0',
                decimals: token.decimals,
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
        setCurrentAmount: setSupplyAmount,
        setErrorMessage,
    });

    const resetSupplyFlow = useCallback(() => {
        setSupplyAmount('');
        resetFlowState();
        resetApprovalFlowState();
    }, [resetApprovalFlowState, resetFlowState]);

    useYieldFlowReset({
        flowKey,
        goToApproveStep,
        methods,
        onReset: resetSupplyFlow,
        resetApproveState,
    });

    useYieldPendingTransactionTracking({
        account,
        actionKind: 'supply',
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

    const submitApprove = useCallback(async () => {
        if (!account || !token || !vault) {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

            return;
        }

        setIsSubmittingApprove(true);
        setErrorMessage(undefined);

        try {
            const { response, verification } = await enterYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: approveAmount,
                decimals: token.decimals,
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
                amount: approveAmount,
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
        enterYield,
        openApproveModal,
        setApprovalResponseState,
        setErrorMessage,
        setIsSubmittingApprove,
        setRevokeRequired,
        token,
        vault,
    ]);

    const submitSupply = useCallback(async () => {
        if (!account || !token || !receiptToken || !vault) {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

            return;
        }

        setIsSubmittingSupply(true);
        setErrorMessage(undefined);

        try {
            const { response, verification } = await enterYield({
                yieldId: vault.id,
                address: account.descriptor,
                amount: supplyAmount,
                decimals: token.decimals,
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
                    amount: supplyAmount,
                    spender: approvalModalParams.spender,
                    transactionId: approvalModalParams.transactionId,
                    providerId: vault.providerId,
                    txType: 'approve',
                });

                return;
            }

            const supplyTransaction = getYieldSupplyTransaction(transactions);

            if (!supplyTransaction?.id) {
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

                return;
            }

            const result = await sendYieldTransaction({
                account,
                transaction: supplyTransaction,
            });

            await submitTxHash({
                txId: supplyTransaction.id,
                txHash: result.txid,
            });

            dispatch(
                notificationsActions.addToast({
                    type: 'tx-yield-supply',
                    formattedAmount: `${supplyAmount} ${token.symbol}`,
                    descriptor: account.descriptor,
                    symbol: account.symbol,
                    txid: result.txid,
                }),
            );

            const receiptAmount = getWithdrawRequestAmount({
                networkSymbol: account.symbol,
                amount: supplyAmount,
                token,
                receiptToken,
                pricePerShare: vault?.state?.pricePerShareState?.price,
            });
            setCompletedReceiptAmount(receiptAmount ?? supplyAmount);
            setCompletedAmount(supplyAmount);
            setPendingTransaction({
                type: 'supply',
                txid: result.txid,
                amount: supplyAmount,
            });
        } catch {
            setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');
        } finally {
            setIsSubmittingSupply(false);
        }
    }, [
        account,
        dispatch,
        enterModifyApproval,
        enterYield,
        openApproveModal,
        receiptToken,
        sendYieldTransaction,
        setApprovalResponseState,
        setCompletedAmount,
        setCompletedReceiptAmount,
        setErrorMessage,
        setIsSubmittingSupply,
        setPendingTransaction,
        submitTxHash,
        supplyAmount,
        token,
        vault,
    ]);

    if (!token || !receiptToken || !vault) {
        return null;
    }

    const maxAmount = token.balance;
    const isApproveAmountTooHigh = isAmountGreaterThan({
        amount: approveAmount,
        threshold: maxAmount,
    });
    const isSupplyAmountTooHigh = isAmountGreaterThan({
        amount: supplyAmount,
        threshold: maxAmount,
    });
    const isApprovalInsufficient =
        !isModifyMode &&
        isAmountGreaterThan({
            amount: supplyAmount,
            threshold: approveAmount,
        });

    return {
        account,
        token,
        receiptToken,
        apy,
        approveAmount,
        supplyAmount,
        completedAmount,
        completedReceiptAmount,
        maxAmount,
        errorMessage,
        approveModalState,
        pendingTransaction,
        isModifyMode,
        lastApprovedAmount,
        revokeRequired,
        isApproveAmountTooHigh,
        isSupplyAmountTooHigh,
        isApprovalInsufficient,
        isSubmittingApprove: isSubmittingApprove || isApprovePending,
        isSubmittingSupply,
        setApproveAmount,
        setSupplyAmount,
        setApproveMaxAmount: () => setApproveAmount(maxAmount),
        setSupplyMaxAmount: () => setSupplyAmount(maxAmount),
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
