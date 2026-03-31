import { createContext, useContext } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { type TranslationKey } from '@suite/intl';
import type { Account } from '@suite-common/wallet-types';

import type {
    YieldApproveModalState,
    YieldFlowDisplayToken,
    YieldFlowFormValues,
    YieldPendingTransactionState,
} from '../common/types';
import type { UseYieldFlowStepsResult } from '../hooks/useYieldFlowSteps';

export type YieldWithdrawContextValues = {
    account: Account;
    token: YieldFlowDisplayToken;
    receiptToken: YieldFlowDisplayToken;
    maxAmount: string;
    approveAmount: string;
    withdrawAmount: string;
    completedAmount: string;
    completedReceiptAmount: string;
    errorMessage?: TranslationKey;
    approveModalState: YieldApproveModalState | null;
    pendingTransaction: YieldPendingTransactionState | null;
    isModifyMode: boolean;
    lastApprovedAmount: string;
    revokeRequired: boolean;
    isApproveAmountTooHigh: boolean;
    isWithdrawAmountTooHigh: boolean;
    isApprovalInsufficient: boolean;
    isSubmittingApprove: boolean;
    isSubmittingWithdraw: boolean;
    setApproveAmount: (amount: string) => void;
    setWithdrawAmount: (amount: string) => void;
    setApproveMaxAmount: () => void;
    setWithdrawMaxAmount: () => void;
    submitApprove: () => Promise<void>;
    submitWithdraw: () => Promise<void>;
    submitRevoke: () => Promise<void>;
    enterModifyApproval: () => void;
    handleApproveModalCancel: () => void;
    handleApproveSuccessTxid: (txid: string) => Promise<void>;
    openPendingTransaction: (txid: string) => void;
    methods: UseFormReturn<YieldFlowFormValues>;
    flow: UseYieldFlowStepsResult;
};

export const YieldWithdrawContext = createContext<YieldWithdrawContextValues | null>(null);
YieldWithdrawContext.displayName = 'YieldWithdrawContext';

export const useYieldWithdrawContext = () => {
    const context = useContext(YieldWithdrawContext);

    if (context === null) {
        throw Error('YieldWithdrawContext used without Context');
    }

    return context;
};
