import { useEffect } from 'react';
import type { Dispatch } from 'react';

import {
    fetchAndUpdateAccountThunk,
    selectConvertedNetworkFeeInfo,
    selectTransactionByAccountKeyAndTxid,
} from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { isPending } from '@suite-common/wallet-utils';

import { useDispatch, useSelector } from 'src/hooks/suite';

import type { YieldPendingTransactionState } from '../types';
import type { YieldFlowAction } from '../yieldFlowReducer';

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
    pendingTransaction: YieldPendingTransactionState | null;
    dispatch: Dispatch<YieldFlowAction>;
};

export const useYieldPendingTransactionTracking = ({
    account,
    actionKind,
    pendingTransaction,
    dispatch,
}: UseYieldPendingTransactionTrackingProps) => {
    const reduxDispatch = useDispatch();
    const trackedPendingTransaction = useSelector(state =>
        pendingTransaction
            ? selectTransactionByAccountKeyAndTxid(state, account.key, pendingTransaction.txid)
            : null,
    );
    const feeInfo = useSelector(state => selectConvertedNetworkFeeInfo(state, account.symbol));
    const pollIntervalMs = getPollIntervalMs(feeInfo?.blockTime);

    const isCurrentlyPending =
        !!pendingTransaction &&
        (!trackedPendingTransaction || isPending(trackedPendingTransaction));

    useEffect(() => {
        if (!isCurrentlyPending) {
            return;
        }

        const interval = setInterval(() => {
            reduxDispatch(fetchAndUpdateAccountThunk({ accountKey: account.key }));
        }, pollIntervalMs);

        return () => clearInterval(interval);
    }, [account.key, reduxDispatch, isCurrentlyPending, pollIntervalMs]);

    useEffect(() => {
        if (!pendingTransaction || !trackedPendingTransaction) {
            return;
        }

        if (isPending(trackedPendingTransaction)) {
            return;
        }

        if (trackedPendingTransaction.type === 'failed') {
            dispatch({ type: 'TRANSACTION_FAILED' });

            return;
        }

        if (pendingTransaction.type === 'revoke' || pendingTransaction.type === 'revoke-only') {
            dispatch({ type: 'REVOKE_SUCCESS' });

            return;
        }

        if (pendingTransaction.type === 'approve') {
            dispatch({ type: 'COMPLETE_APPROVAL', amount: pendingTransaction.amount });

            return;
        }

        if (pendingTransaction.type === actionKind) {
            dispatch({ type: 'COMPLETE_ACTION', amount: pendingTransaction.amount });

            return;
        }

        dispatch({ type: 'RESET' });
    }, [actionKind, dispatch, pendingTransaction, trackedPendingTransaction]);
};
