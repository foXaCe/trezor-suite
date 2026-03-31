import { useEffect } from 'react';

import { type TranslationKey } from '@suite/intl';
import {
    fetchAndUpdateAccountThunk,
    selectConvertedNetworkFeeInfo,
    selectTransactionByAccountKeyAndTxid,
} from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { isPending } from '@suite-common/wallet-utils';

import { useDispatch, useSelector } from 'src/hooks/suite';

import type { YieldPendingTransactionState } from '../common/types';

const DEFAULT_PENDING_TX_POLL_INTERVAL_MS = 3_000;
const MIN_PENDING_TX_POLL_INTERVAL_MS = 2_000;
const BLOCK_TIME_TO_POLL_INTERVAL_RATIO = 2;

const getPollIntervalMs = (blockTime: number | undefined): number => {
    if (!blockTime) return DEFAULT_PENDING_TX_POLL_INTERVAL_MS;

    return Math.max(
        (blockTime / BLOCK_TIME_TO_POLL_INTERVAL_RATIO) * 60 * 1000,
        MIN_PENDING_TX_POLL_INTERVAL_MS,
    );
};

type UseYieldPendingTransactionTrackingProps = {
    account: Account;
    actionKind: Extract<YieldPendingTransactionState['type'], 'supply' | 'withdraw'>;
    onActionSuccess: (amount: string) => void;
    onApproveSuccess: (amount: string) => void;
    onRevokeSuccess: () => void;
    pendingTransaction: YieldPendingTransactionState | null;
    setErrorMessage: (message: TranslationKey | undefined) => void;
    setIsApprovePending: (pending: boolean) => void;
    setPendingTransaction: (tx: YieldPendingTransactionState | null) => void;
};

export const useYieldPendingTransactionTracking = ({
    account,
    actionKind,
    onActionSuccess,
    onApproveSuccess,
    onRevokeSuccess,
    pendingTransaction,
    setErrorMessage,
    setIsApprovePending,
    setPendingTransaction,
}: UseYieldPendingTransactionTrackingProps) => {
    const dispatch = useDispatch();
    const trackedPendingTransaction = useSelector(state =>
        pendingTransaction
            ? selectTransactionByAccountKeyAndTxid(state, account.key, pendingTransaction.txid)
            : null,
    );
    const feeInfo = useSelector(state => selectConvertedNetworkFeeInfo(state, account.symbol));
    const pollIntervalMs = getPollIntervalMs(feeInfo?.blockTime);

    // Keep polling even before the tx appears in wallet.transactions.
    const isCurrentlyPending =
        !!pendingTransaction &&
        (!trackedPendingTransaction || isPending(trackedPendingTransaction));

    useEffect(() => {
        if (!isCurrentlyPending) {
            return;
        }

        const interval = setInterval(() => {
            dispatch(fetchAndUpdateAccountThunk({ accountKey: account.key, forceUpdate: true }));
        }, pollIntervalMs);

        return () => clearInterval(interval);
    }, [account.key, dispatch, isCurrentlyPending, pollIntervalMs]);

    useEffect(() => {
        if (!pendingTransaction || !trackedPendingTransaction) {
            return;
        }

        if (isPending(trackedPendingTransaction)) {
            return;
        }

        if (trackedPendingTransaction.type === 'failed') {
            setPendingTransaction(null);
            setIsApprovePending(false);
            setErrorMessage('TR_EARN_YIELD_ERROR_TRANSACTION_FAILED');

            return;
        }

        if (pendingTransaction.type === 'revoke' || pendingTransaction.type === 'revoke-only') {
            setPendingTransaction(null);
            setIsApprovePending(false);
            onRevokeSuccess();

            return;
        }

        if (pendingTransaction.type === 'approve') {
            setPendingTransaction(null);
            setIsApprovePending(false);
            onApproveSuccess(pendingTransaction.amount);

            return;
        }

        if (pendingTransaction.type === actionKind) {
            setPendingTransaction(null);
            onActionSuccess(pendingTransaction.amount);

            return;
        }

        setPendingTransaction(null);
    }, [
        actionKind,
        onActionSuccess,
        onApproveSuccess,
        onRevokeSuccess,
        pendingTransaction,
        setErrorMessage,
        setIsApprovePending,
        setPendingTransaction,
        trackedPendingTransaction,
    ]);
};
