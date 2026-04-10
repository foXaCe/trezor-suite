import { useCallback } from 'react';
import type { Dispatch } from 'react';

import { useSubmitTxHash } from '@suite-common/earn-api';
import type { Account } from '@suite-common/wallet-types';

import type { YieldPendingTransactionState } from '../types';
import type { YieldFlowAction, YieldFlowState } from '../yieldFlowReducer';

type UseYieldApproveParams = {
    account: Account | undefined;
    contractAddress: string | undefined;
    state: Pick<
        YieldFlowState,
        'approveAmount' | 'approveModalState' | 'submitTxHashTransactionId'
    >;
    dispatch: Dispatch<YieldFlowAction>;
};

export const useYieldApprove = ({
    account,
    contractAddress,
    state,
    dispatch,
}: UseYieldApproveParams) => {
    const { mutateAsync: submitTxHash } = useSubmitTxHash({});

    const openApproveModal = useCallback(
        ({
            amount,
            spender,
            transactionId,
            providerId,
            preapprovedAmount,
            txType,
        }: {
            amount: string;
            spender: string;
            transactionId?: string;
            providerId?: string;
            preapprovedAmount?: string;
            txType: Extract<
                YieldPendingTransactionState['type'],
                'approve' | 'revoke' | 'revoke-only'
            >;
        }): boolean => {
            if (!account) {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return false;
            }

            if (!contractAddress) {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });

                return false;
            }

            dispatch({
                type: 'OPEN_APPROVE_MODAL',
                modalState: {
                    amount,
                    contractAddress,
                    spender,
                    providerId,
                    preapprovedAmount,
                    txType,
                },
                txHashTransactionId: transactionId ?? null,
            });

            return true;
        },
        [account, contractAddress, dispatch],
    );

    const handleApproveSuccessTxid = useCallback(
        async (txid: string) => {
            try {
                if (state.submitTxHashTransactionId) {
                    await submitTxHash({
                        txId: state.submitTxHashTransactionId,
                        txHash: txid,
                    });
                }

                dispatch({
                    type: 'SET_PENDING_TX',
                    tx: {
                        type: state.approveModalState?.txType ?? 'approve',
                        txid,
                        amount: state.approveAmount,
                    },
                });
                dispatch({ type: 'CLOSE_APPROVE_MODAL' });
            } catch {
                dispatch({ type: 'SET_ERROR', error: 'TR_EARN_YIELD_ERROR_GENERIC' });
            }
        },
        [
            state.submitTxHashTransactionId,
            state.approveModalState,
            state.approveAmount,
            dispatch,
            submitTxHash,
        ],
    );

    const handleApproveCancel = useCallback(() => {
        dispatch({ type: 'CLOSE_APPROVE_MODAL' });
    }, [dispatch]);

    return { openApproveModal, handleApproveSuccessTxid, handleApproveCancel };
};
