import { useCallback, useState } from 'react';

import { type TranslationKey } from '@suite/intl';
import { useSubmitTxHash } from '@suite-common/earn-api';
import { toTokenCryptoId } from '@suite-common/trading';
import type { Account } from '@suite-common/wallet-types';

import type { YieldApproveModalState, YieldPendingTransactionState } from '../common/types';

type UseYieldApproveParams = {
    account: Account | undefined;
    contractAddress: string | undefined;
    setPendingTransaction: (tx: YieldPendingTransactionState | null) => void;
    setErrorMessage: (message: TranslationKey | undefined) => void;
};

export type UseYieldApproveResult = {
    approveAmount: string;
    setApproveAmount: (amount: string) => void;
    approveModalState: YieldApproveModalState | null;
    isApprovePending: boolean;
    setIsApprovePending: (pending: boolean) => void;
    openApproveModal: (params: {
        amount: string;
        spender: string;
        transactionId?: string;
        providerId?: string;
        txType: Extract<YieldPendingTransactionState['type'], 'approve' | 'revoke' | 'revoke-only'>;
    }) => boolean;
    resetApproveState: (amount: string) => void;
    handleApproveSuccessTxid: (txid: string) => Promise<void>;
    handleApproveCancel: () => void;
};

export const useYieldApprove = ({
    account,
    contractAddress,
    setPendingTransaction,
    setErrorMessage,
}: UseYieldApproveParams): UseYieldApproveResult => {
    const { mutateAsync: submitTxHash } = useSubmitTxHash({});
    const [approveAmount, setApproveAmount] = useState('0');
    const [approveModalState, setApproveModalState] = useState<YieldApproveModalState | null>(null);
    const [submitTxHashTransactionId, setSubmitTxHashTransactionId] = useState<string | null>(null);
    const [isApprovePending, setIsApprovePending] = useState(false);

    const openApproveModal = useCallback(
        ({
            amount,
            spender,
            transactionId,
            providerId,
            txType,
        }: {
            amount: string;
            spender: string;
            transactionId?: string;
            providerId?: string;
            txType: Extract<
                YieldPendingTransactionState['type'],
                'approve' | 'revoke' | 'revoke-only'
            >;
        }): boolean => {
            if (!account) {
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

                return false;
            }

            if (!contractAddress) {
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');

                return false;
            }

            setSubmitTxHashTransactionId(transactionId ?? null);
            setApproveModalState({
                amount,
                cryptoId: toTokenCryptoId(account.symbol, contractAddress),
                spender,
                providerId,
                txType,
            });

            return true;
        },
        [account, contractAddress, setErrorMessage],
    );

    const resetApproveState = useCallback(
        (amount: string) => {
            setApproveAmount(amount);
            setApproveModalState(null);
            setPendingTransaction(null);
            setSubmitTxHashTransactionId(null);
            setErrorMessage(undefined);
        },
        [setPendingTransaction, setErrorMessage],
    );

    const handleApproveSuccessTxid = useCallback(
        async (txid: string) => {
            try {
                if (submitTxHashTransactionId) {
                    await submitTxHash({
                        txId: submitTxHashTransactionId,
                        txHash: txid,
                    });
                }

                setApproveModalState(null);
                setSubmitTxHashTransactionId(null);
                setPendingTransaction({
                    type: approveModalState?.txType ?? 'approve',
                    txid,
                    amount: approveAmount,
                });
            } catch {
                setErrorMessage('TR_EARN_YIELD_ERROR_GENERIC');
            }
        },
        [
            approveAmount,
            approveModalState,
            setPendingTransaction,
            setErrorMessage,
            submitTxHashTransactionId,
            submitTxHash,
        ],
    );

    const handleApproveCancel = useCallback(() => {
        setApproveModalState(null);
        setSubmitTxHashTransactionId(null);
        setErrorMessage(undefined);
    }, [setErrorMessage]);

    return {
        approveAmount,
        setApproveAmount,
        approveModalState,
        isApprovePending,
        setIsApprovePending,
        openApproveModal,
        resetApproveState,
        handleApproveSuccessTxid,
        handleApproveCancel,
    };
};
